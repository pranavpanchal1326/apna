# Apna — Design Completion PRD (Kora & Ink)

> **UPDATE 2026-07-18 — Milestones A–C COMPLETE.** Design lint **258 → 0**,
> `tsc` clean, **430/430** tests green, every screen migrated. Enforcement wired
> (`npm run verify` + CI). Milestone D infrastructure done at the primitive
> level; the on-device 60fps/TalkBack/font-scale pass is the sole remaining gate
> and is **blocked on the owner's secret Mapbox `sk.` token**. See
> `docs/DESIGN_QA_AUDIT.md`.

**Status:** A–C done; D device-pass blocked (owner) · **Owner:** Pranav · **Date:** 2026-07-18
**Source of truth for spec:** `docs/DESIGN_BLUEPRINT.md` (v1.1)
**This doc:** scope, acceptance, and sequencing for finishing the migration.

---

## 1. Problem & Goal

The feature set is complete and shipping-ready, but the UI is only partially
migrated to the **Kora & Ink** design system. `npm run lint:design` reports
**258 violations across 76 files** — each is a screen still carrying legacy
tokens (raw hex, emoji-as-chrome, text-glyph controls, deprecated color
aliases, old shadows).

**Goal:** every user-facing surface passes the Blueprint's per-screen
Definition of Done, `lint:design` reaches **0**, and each screen ships its
designated signature moment. No feature scope changes.

**Non-goals:** new features, backend changes, data-model changes, the
user-only deploy tasks (EAS build, Play Store, secrets, IAM).

---

## 2. Success Metrics (Definition of Done, per §"Definition of done")

A screen is done only when ALL hold:
- [ ] Zero raw hex, zero emoji chrome, zero text-glyph controls
- [ ] One focal point; madder (accent) count ≤ 3; cards only in sanctioned intents
- [ ] Entrance choreography + unified press + Reduce Motion fallback
- [ ] Empty / loading / error states match the Part 4 spec
- [ ] Passes contrast table §2.1.6 in BOTH Ink (dark) and Kora (light)
- [ ] Signature moment implemented — not cut for time

**Program-level exit:** `npm run lint:design` = 0 · `npx tsc --noEmit` clean ·
full jest suite green · Phase 6 device QA passed on Redmi Note 9.

---

## 3. Scope & Sequencing

Ordered by user traffic (money path → trip → brand → polish), matching
Blueprint Part 6.

### Milestone A — Finish the money path (Phase 3 tail)
| Screen | Spec | Signature moment |
|---|---|---|
| Budget | §4.5 | Filling-stitch progress bar + remaining Amount hero |
| ExpenseDetail + receipts | §4.4.2 | Expense fan-out reveal |
| Group settings cluster (Create/Join/Settings/Recurring/Members) | §4.3.4–7 | — |

### Milestone B — Trip surfaces (Phase 4)
Itinerary spine+needle (§4.7) · Lists (§4.8) · Map live (§4.9) ·
Memories loom (§4.10) · Hangouts (§4.11).

### Milestone C — Brand moments (Phase 5)
Trip Wrap pager + export (§4.12) · YearInReview (§4.12.2) ·
Recap landing (§4.13) · referrals (§4.15) · profile/settings (§4.14) ·
camera components (§3.17) · widgets + store assets (§5.8, §5.10).

### Milestone D — Polish pass (Phase 6)
Choreography audit vs §2.7.2 · Reduce Motion QA · device QA (Redmi Note 9
60fps, 720p type, 1.3× font-scale, TalkBack) · Five Laws review, one
screen/day vs Part 1.

---

## 4. Dependencies / Risks
- **Live-device QA (Milestone D) is blocked**: APK rebuild fails at Mapbox
  Maven 401 — needs a secret `sk.` token (`MAPBOX_DOWNLOADS_TOKEN`,
  DOWNLOADS:READ). Verification until then is tsc + jest + lint + SVG
  sandboxes only.
- Emulator requires the JDK-21 temp-path fix (already baked into scripts).
- Signature-moment animations must ship Reduce-Motion snap fallbacks.

## 5. Working method (established pattern)
Pure logic → helper in `src/lib/utils/*` + unit test; view stays thin.
Verify each screen with tsc + jest + `npm run lint:design` before moving on.

## 6. Tracking
Migration progress lives in memory `kora-ink-redesign-progress`. Lint count is
the burndown metric (currently 258 → target 0).
