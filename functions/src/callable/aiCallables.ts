// functions/src/callable/aiCallables.ts
// Phase 7 AI endpoints — all traffic goes through the zero-cost gateway
// (Gemini free tier → Groq → rule-based/graceful fallback). Keys never
// leave the server; per-user daily quota and caching live in the gateway.

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import {
  runAiPrompt,
  stripCodeFences,
  GEMINI_API_KEY,
  GROQ_API_KEY,
} from '../ai/gateway'
import {
  categorizeByRules,
  normalizeAiCategory,
  buildCategorizePrompt,
} from '../ai/categorize'
import { buildItineraryPrompt, parseItineraryJson } from '../ai/itinerary'

const AI_OPTS = {
  region: 'asia-south1',
  secrets: [GEMINI_API_KEY, GROQ_API_KEY],
}

async function assertGroupMember(groupId: string, uid: string): Promise<FirebaseFirestore.DocumentData> {
  const snap = await admin.firestore().collection('groups').doc(groupId).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Group not found')
  const data = snap.data()!
  if (!((data.memberIds ?? []) as string[]).includes(uid)) {
    throw new HttpsError('permission-denied', 'Not a member of this group')
  }
  return data
}

// ── 7.2 Smart expense categorization ─────────────────────────────────────────
// Rules first (free, instant); AI only for the ambiguous tail.

export const categorizeExpense = onCall(AI_OPTS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required')

  const { description } = (request.data ?? {}) as { description?: string }
  if (!description || typeof description !== 'string' || description.trim().length < 2) {
    throw new HttpsError('invalid-argument', 'description is required')
  }
  const trimmed = description.trim().slice(0, 100)

  const ruleMatch = categorizeByRules(trimmed)
  if (ruleMatch) {
    return { category: ruleMatch, source: 'rules' }
  }

  const result = await runAiPrompt(request.auth.uid, {
    prompt: buildCategorizePrompt(trimmed),
    maxTokens: 8,
    temperature: 0,
    cacheKey: `categorize:${trimmed.toLowerCase()}`,
  })
  if (!result) {
    return { category: 'misc', source: 'fallback' }
  }
  return { category: normalizeAiCategory(result.text), source: result.provider }
})

// ── 7.4 AI itinerary generator ───────────────────────────────────────────────
// Returns a validated draft — the client writes items only after user review.

export const generateAiItinerary = onCall(
  { ...AI_OPTS, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required')

    const { groupId, destination, days, interests } = (request.data ?? {}) as {
      groupId?: string
      destination?: string
      days?: number
      interests?: string[]
    }
    if (!groupId) throw new HttpsError('invalid-argument', 'groupId is required')
    if (!destination || typeof destination !== 'string') {
      throw new HttpsError('invalid-argument', 'destination is required')
    }
    if (typeof days !== 'number' || days < 1 || days > 14) {
      throw new HttpsError('invalid-argument', 'days must be 1-14')
    }
    await assertGroupMember(groupId, request.auth.uid)

    const cleanInterests = Array.isArray(interests)
      ? interests.filter((i): i is string => typeof i === 'string').slice(0, 5)
      : undefined

    const result = await runAiPrompt(request.auth.uid, {
      prompt: buildItineraryPrompt(destination.trim().slice(0, 60), days, cleanInterests),
      maxTokens: 2048,
      temperature: 0.6,
      cacheKey: `itinerary:${destination.trim().toLowerCase()}:${days}:${(cleanInterests ?? []).join(',').toLowerCase()}`,
    })
    if (!result) {
      return { success: false, message: 'ai_unavailable' }
    }

    const plans = parseItineraryJson(stripCodeFences(result.text), days)
    if (!plans) {
      return { success: false, message: 'parse_failed' }
    }
    return { success: true, plans, provider: result.provider }
  },
)

// ── 7.5 Dietary restaurant suggestions + Trip Wrap captions ─────────────────

export const getDietarySuggestions = onCall(AI_OPTS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required')

  const { groupId, destination, dietary } = (request.data ?? {}) as {
    groupId?: string
    destination?: string
    dietary?: string
  }
  if (!groupId) throw new HttpsError('invalid-argument', 'groupId is required')
  if (!destination || typeof destination !== 'string') {
    throw new HttpsError('invalid-argument', 'destination is required')
  }
  const validDietary = ['vegetarian', 'vegan', 'jain', 'halal', 'gluten-free', 'no-onion-garlic']
  if (!dietary || !validDietary.includes(dietary)) {
    throw new HttpsError('invalid-argument', `dietary must be one of: ${validDietary.join(', ')}`)
  }
  await assertGroupMember(groupId, request.auth.uid)

  const dest = destination.trim().slice(0, 60)
  const result = await runAiPrompt(request.auth.uid, {
    prompt:
      `Suggest 5 well-known ${dietary}-friendly restaurants or food spots in ${dest}.\n` +
      `Respond with ONLY valid JSON (no markdown): ` +
      `[{"name":"...","area":"neighbourhood","why":"under 80 chars"}]`,
    maxTokens: 512,
    temperature: 0.5,
    cacheKey: `dietary:${dest.toLowerCase()}:${dietary}`,
  })
  if (!result) {
    return { success: false, message: 'ai_unavailable' }
  }

  try {
    const parsed = JSON.parse(stripCodeFences(result.text)) as Array<Record<string, unknown>>
    if (!Array.isArray(parsed)) return { success: false, message: 'parse_failed' }
    const suggestions = parsed
      .filter((s) => typeof s.name === 'string' && s.name.trim())
      .slice(0, 5)
      .map((s) => ({
        name: (s.name as string).trim().slice(0, 60),
        area: typeof s.area === 'string' ? s.area.trim().slice(0, 40) : '',
        why: typeof s.why === 'string' ? s.why.trim().slice(0, 80) : '',
      }))
    if (suggestions.length === 0) return { success: false, message: 'parse_failed' }
    return { success: true, suggestions, provider: result.provider }
  } catch {
    return { success: false, message: 'parse_failed' }
  }
})

export const generateWrapCaption = onCall(AI_OPTS, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required')

  const { groupId } = (request.data ?? {}) as { groupId?: string }
  if (!groupId) throw new HttpsError('invalid-argument', 'groupId is required')
  const group = await assertGroupMember(groupId, request.auth.uid)

  const destination = (group.destination as string | undefined)?.slice(0, 60)
  const name = ((group.name as string) ?? 'our trip').slice(0, 60)

  const result = await runAiPrompt(request.auth.uid, {
    prompt:
      `Write one short, warm, shareable caption (under 100 chars, 1-2 emoji) for a ` +
      `trip-recap card about "${name}"${destination ? ` in ${destination}` : ''} with friends. ` +
      `Respond with only the caption text.`,
    maxTokens: 60,
    temperature: 0.9,
    // No cacheKey — captions should feel fresh on each generation
  })
  if (!result) {
    // Rule-based fallback keeps the feature alive with keys unset / quota hit
    const fallbacks = [
      `Miles, memories and ${name} ✨`,
      `The ${name} chapter — done right 🧡`,
      `Good friends, better stories — ${name} 🌍`,
    ]
    return {
      success: true,
      caption: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      provider: 'fallback',
    }
  }
  return { success: true, caption: result.text.slice(0, 120), provider: result.provider }
})
