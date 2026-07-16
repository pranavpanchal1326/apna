// functions/src/ai/gateway.ts
// Phase 7.1 — Zero-cost AI Gateway.
//
// Provider chain: Gemini 2.0 Flash (free tier) → Groq (free tier) → null
// (callers fall back to rule-based logic when both fail or keys are absent).
//
// Guardrails, all server-side:
//   • API keys via Cloud Functions secrets — never shipped to clients.
//     Set with: firebase functions:secrets:set GEMINI_API_KEY (and GROQ_API_KEY)
//   • Per-user daily quota in Firestore (aiUsage/{uid}_{date}) — protects the
//     free tiers from a single hot user.
//   • Response cache in Firestore (aiCache/{hash}) — identical prompts within
//     the TTL never hit a provider.
//
// Callables using this module must declare: secrets: [GEMINI_API_KEY, GROQ_API_KEY]

import * as crypto from 'crypto'
import * as admin from 'firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'

export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
export const GROQ_API_KEY = defineSecret('GROQ_API_KEY')

const GEMINI_MODEL = 'gemini-2.0-flash'
const GROQ_MODEL = 'llama-3.1-8b-instant'

export const DAILY_AI_QUOTA = 50 // per user per IST day, across all AI features
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export interface AiRequest {
  system?: string
  prompt: string
  maxTokens?: number
  temperature?: number
  /** Stable key for caching. Omit to skip the cache (e.g. personalized output). */
  cacheKey?: string
}

export interface AiResult {
  text: string
  provider: 'gemini' | 'groq' | 'cache'
}

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/** Deterministic Firestore-safe doc id for a cache key. */
export function hashCacheKey(cacheKey: string): string {
  return crypto.createHash('sha256').update(cacheKey).digest('hex').slice(0, 40)
}

/** Current date string in IST — quota days roll over at midnight IST. */
export function istDateKey(now: number = Date.now()): string {
  return new Date(now + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

/** Extracts the text from a Gemini generateContent response, or null. */
export function parseGeminiResponse(body: unknown): string | null {
  const candidates = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates
  const text = candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim()
  return text || null
}

/** Extracts the text from an OpenAI-compatible (Groq) response, or null. */
export function parseGroqResponse(body: unknown): string | null {
  const choices = (body as { choices?: Array<{ message?: { content?: string } }> })?.choices
  const text = choices?.[0]?.message?.content?.trim()
  return text || null
}

/**
 * Strips markdown code fences so JSON-mode prompts can be JSON.parse'd
 * even when the model wraps its output in ```json … ```.
 */
export function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed)
  return match ? match[1].trim() : trimmed
}

/**
 * Extracts the JSON payload from model output that may wrap it in fences
 * AND/OR prose ("Here is your itinerary: [...] Enjoy!"). Smaller models
 * (Groq 8B) do this constantly. Returns the substring from the first
 * opening bracket to its matching last closing bracket, or the cleaned
 * text unchanged when no brackets are found.
 */
export function extractJsonPayload(text: string): string {
  const cleaned = stripCodeFences(text)
  // Also handle fences embedded mid-prose (stripCodeFences only handles
  // fence-wrapped-whole-output)
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(cleaned)
  const source = fenced ? fenced[1] : cleaned
  const firstArray = source.indexOf('[')
  const firstObject = source.indexOf('{')
  const start =
    firstArray === -1 ? firstObject
    : firstObject === -1 ? firstArray
    : Math.min(firstArray, firstObject)
  if (start === -1) return source.trim()
  const closer = source[start] === '[' ? ']' : '}'
  const end = source.lastIndexOf(closer)
  if (end <= start) return source.trim()
  return source.slice(start, end + 1).trim()
}

// ── Quota ────────────────────────────────────────────────────────────────────

/**
 * Atomically consumes one unit of the user's daily AI quota.
 * Returns false when the user is over quota (caller should use its fallback).
 */
export async function consumeQuota(
  uid: string,
  limit: number = DAILY_AI_QUOTA,
): Promise<boolean> {
  const db = admin.firestore()
  const ref = db.collection('aiUsage').doc(`${uid}_${istDateKey()}`)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const count = (snap.data()?.count as number) ?? 0
    if (count >= limit) return false
    tx.set(
      ref,
      { count: count + 1, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
    return true
  })
}

// ── Cache ────────────────────────────────────────────────────────────────────

async function readCache(cacheKey: string): Promise<string | null> {
  const snap = await admin.firestore().collection('aiCache').doc(hashCacheKey(cacheKey)).get()
  if (!snap.exists) return null
  const data = snap.data() as { text?: string; expiresAt?: Timestamp }
  if (!data.text || !data.expiresAt || data.expiresAt.toMillis() < Date.now()) return null
  return data.text
}

async function writeCache(cacheKey: string, text: string): Promise<void> {
  await admin.firestore().collection('aiCache').doc(hashCacheKey(cacheKey)).set({
    text,
    expiresAt: Timestamp.fromMillis(Date.now() + CACHE_TTL_MS),
    createdAt: FieldValue.serverTimestamp(),
  })
}

// ── Providers ────────────────────────────────────────────────────────────────

async function callGemini(req: AiRequest, apiKey: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...(req.system
          ? { systemInstruction: { parts: [{ text: req.system }] } }
          : {}),
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: {
          maxOutputTokens: req.maxTokens ?? 512,
          temperature: req.temperature ?? 0.4,
        },
      }),
    })
    if (!response.ok) {
      console.warn(`[apna] AI gateway: Gemini HTTP ${response.status}`)
      return null
    }
    return parseGeminiResponse(await response.json())
  } catch (err) {
    console.warn('[apna] AI gateway: Gemini call failed:', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function callGroq(req: AiRequest, apiKey: string): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: req.maxTokens ?? 512,
        temperature: req.temperature ?? 0.4,
        messages: [
          ...(req.system ? [{ role: 'system', content: req.system }] : []),
          { role: 'user', content: req.prompt },
        ],
      }),
    })
    if (!response.ok) {
      console.warn(`[apna] AI gateway: Groq HTTP ${response.status}`)
      return null
    }
    return parseGroqResponse(await response.json())
  } catch (err) {
    console.warn('[apna] AI gateway: Groq call failed:', err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Runs a prompt through cache → quota → Gemini → Groq.
 * Returns null when over quota, both providers fail, or no keys are set —
 * callers must degrade gracefully to their rule-based fallback.
 */
export async function runAiPrompt(uid: string, req: AiRequest): Promise<AiResult | null> {
  if (req.cacheKey) {
    const cached = await readCache(req.cacheKey)
    if (cached) return { text: cached, provider: 'cache' }
  }

  if (!(await consumeQuota(uid))) {
    console.info(`[apna] AI gateway: uid=${uid} over daily quota`)
    return null
  }

  const geminiKey = GEMINI_API_KEY.value()
  if (geminiKey) {
    const text = await callGemini(req, geminiKey)
    if (text) {
      if (req.cacheKey) await writeCache(req.cacheKey, text)
      return { text, provider: 'gemini' }
    }
  }

  const groqKey = GROQ_API_KEY.value()
  if (groqKey) {
    const text = await callGroq(req, groqKey)
    if (text) {
      if (req.cacheKey) await writeCache(req.cacheKey, text)
      return { text, provider: 'groq' }
    }
  }

  return null
}
