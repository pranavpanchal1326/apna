# Kora & Ink — Milestone D Polish Audit

**Date:** 2026-07-18 · **Spec:** `docs/DESIGN_BLUEPRINT.md` Part 6, steps 19–21
**Status of A–C:** design lint **0 violations** (was 258) · `tsc --noEmit` clean ·
**430/430** unit tests green. Every user-facing screen is migrated to Kora & Ink.

Enforcement is now wired: `npm run verify` (typecheck + `lint:design` + tests)
and `.github/workflows/verify.yml` run it on every push/PR, so the zero-violation
state cannot silently regress.

---

## Step 19 — Choreography audit (§2.7.2)

Choreography is implemented at the **primitive** level, so screens inherit it
rather than re-implementing it:

| Rule | Where it lives | Status |
|---|---|---|
| 1 — Screen entrance (hero → staggered rows → FAB) | `components/ui/Entrance.tsx` | ✅ infra done; applied on Home, GroupHome, FeedTab (header), BalanceSummary, ValueFraming. Remaining screens: entrance is a per-screen judgement (stagger count, virtualized-list re-mount) that needs on-device feel — **gated on step 20**. |
| 3 — Sheets rise + scrim | `components/ui/Sheet.tsx` (BottomSheet shim) | ✅ |
| 4 — Unified press (scale 0.97 in `spring.snappy`, out `spring.gentle`) | `components/ui/Button.tsx` | ✅ law; inherited by every `Button` consumer |
| 5 — Money moments (settle + odometer + stitch-sew + haptic) | `Amount`, `Stitch`, Settle sheets | ✅ |
| 6 — Reduce Motion 120ms crossfade fallback | `hooks/useReduceMotion.ts` consumed by `Entrance`, `Amount`, `Stitch`, `AuthProgress`, `DhagaLogo` | ✅ inherited wherever motion primitives render |

**Deliberate exceptions (documented design intent, not gaps):**
- `AddExpenseScreen` — fast-path data entry, intentionally instant, no entrance.
- `FeedTab` — only the header animates; the vertical day-stitch gutter owns the
  feed's motion.
- `OTPScreen` — focused verification step, intentionally instant.

## Step 20 — Device QA — **BLOCKED (not code)**

Requires a physical Redmi Note 9 (60fps budget), 720p small-screen type audit,
1.3× font-scale audit, and a TalkBack pass. Blocked on the release build: the
APK rebuild fails at Mapbox Maven 401 and needs a **secret `sk.` download token**
(`MAPBOX_DOWNLOADS_TOKEN`, `DOWNLOADS:READ`) that only the account owner can mint.
Until a build runs on device, motion feel (entrance stagger timing, 60fps) and
accessibility (TalkBack order, font-scale reflow) cannot be verified. This is the
only remaining gate and it is a user/owner action, not a code task.

## Step 21 — The Five Laws review (Part 1)

Static pass over the migrated surfaces:

1. **Warm, never sterile** — ✅ every neutral is a token from the warm ramp;
   the legacy-hex sweep + `lint:design` guarantee no cold `#000`/`#fff` leaked
   into chrome (photographic camera/export surfaces use explicit `rgba()` with a
   documented §3.17 justification).
2. **The thread is the protagonist** — ✅ stitch/needle motifs on Splash, auth
   flow-stitch, settle ceremony, balances; brand glyphs are the tab bar.
3. **One focal point** — ✅ hero-led layouts (net position, amount, category);
   madder accent count held ≤ 3 per screen by using neutral icons + one accent.
4. **Icons, never emoji chrome** — ✅ enforced: 0 emoji-in-chrome, 0 text-glyph
   controls. Category/weather/list-type systems now resolve to shared Phosphor +
   brand-glyph components (`CategoryIcon`, `ItineraryCategoryIcon`, `WeatherIcon`,
   `ListTypeIcon`). User content (group cover emoji, reactions, caption previews)
   is preserved, per §2.5.2.
5. **Motion has choreography** — ✅ at the primitive level (see step 19); final
   per-screen entrance tuning is the step-20 device pass.

---

## Definition of Done — program status

- [x] Zero raw hex / emoji chrome / text-glyph controls (lint 0, guarded in CI)
- [x] Icon systems unified into shared components
- [x] Press law + Reduce-Motion fallback at primitive level
- [x] `tsc` clean · 430 tests green
- [ ] On-device 60fps + TalkBack + font-scale pass — **blocked on `sk.` Mapbox token**
- [ ] Per-screen entrance tuning — follows the device pass
