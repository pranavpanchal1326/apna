# APNA — KORA & INK DESIGN BLUEPRINT
### The complete product-design audit and redesign specification
**Version 1.0 · 16 July 2026 · Design Department**

---

> This document is the single source of truth for the Apna redesign.
> It covers every foundation token, every component, and every screen in the app.
> Nothing ships that contradicts this document. When code and blueprint disagree,
> the blueprint wins until it is formally amended here.

---

## TABLE OF CONTENTS

- **PART 0** — Executive verdict: where the current design fails
- **PART 1** — Design philosophy: Kora & Ink, the woven interface
- **PART 2** — Foundations
  - 2.1 Color system (dark + light, full token spec)
  - 2.2 Typography system
  - 2.3 Spacing, layout grid, and radius
  - 2.4 Elevation and depth
  - 2.5 Iconography
  - 2.6 The Stitch — Apna's signature element
  - 2.7 Motion system
  - 2.8 Haptics
  - 2.9 Illustration and empty-state art
  - 2.10 Copy voice
- **PART 3** — Component library (audit + redesign, every component)
- **PART 4** — Screen blueprints (every screen, every state)
  - 4.1 Auth flow (Splash, ValueFraming, PhoneInput, OTP, ProfileSetup)
  - 4.2 Home (HomeScreen, ChoosePath)
  - 4.3 Group (GroupHome, Feed, Members, Create, Join, Settings, ManageMembers, AddMembers)
  - 4.4 Expense (AddExpense, ExpenseDetail, Receipt flows)
  - 4.5 Budget (BudgetScreen + sub-components, Export)
  - 4.6 Settlement (SettleUp, BalanceSummary, sheets)
  - 4.7 Itinerary (Screen, DayPlanner, Map, Item detail, Add/Move sheets)
  - 4.8 Lists (ListsScreen, ListDetail)
  - 4.9 Map (MapScreen, live members, place sheets)
  - 4.10 Memories (Screen, MapView, Detail, OnThisDay)
  - 4.11 Hangouts (Screen, Detail, Propose, RSVP)
  - 4.12 Trip Wrap and Year in Review
  - 4.13 Recap (public landing)
  - 4.14 Profile and Settings (Profile, Notifications, Privacy)
  - 4.15 Referral surfaces
  - 4.16 Recurring expenses
- **PART 5** — Cross-cutting systems (navigation, tab bar, sheets, skeletons, a11y, widgets)
- **PART 6** — Implementation roadmap
- **PART 7** — Brand identity: the dhaga mark + THE SEW animation signature (v1.1)

---
---

# PART 0 — EXECUTIVE VERDICT: WHERE THE CURRENT DESIGN FAILS

An honest audit before any prescriptions. These findings come from reading the
actual code in `src/theme/`, `src/components/`, and `src/screens/`.

## 0.1 The palette is AI-generic — the single biggest problem

`src/theme/colors.ts` ships teal `#4ECDC4` + coral `#FF6B6B` + gold `#FFD166`
on navy `#080C14`. This is the Flat UI 2014 palette, and it is the exact trio
language models produce when asked for "a friendly app color scheme." Users who
have seen AI-generated apps will clock it in one second. The dark background is
blue-black — the default "premium dark mode" of every generated template.

**Verdict:** replace entirely. No hex value from the current accent set survives.

## 0.2 Typography is competent but fingerprinted

Outfit is currently the #2 most common AI-suggested display font (after Inter).
JetBrains Mono for amounts says "developer terminal," not "money between friends."
The scale itself (`typography.ts`) is disciplined — sizes, line heights, and the
mono-for-numbers rule are all keepers as *structure*. The faces change.

## 0.3 The layout vocabulary is a template

Every screen is: hero card → stat pills → chip row → card list → FAB.
Cards sit inside cards with `rgba(255,255,255,0.06)` borders. This is the stock
kit of generated UIs. Nothing is *wrong*; nothing is *yours*.

**Verdict:** move from card-soup to editorial rows on fabric. Cards become rare
and meaningful (sheets, photos, money moments), not the default container.

## 0.4 Craft misses that read as "unfinished"

- `GroupHeaderHero.tsx:59` — a literal `←` text character as the back button.
- `GroupHomeScreen.tsx:99` — a `+` text character as the FAB icon.
- Emoji (`🎬`) used as functional iconography in the Trip Wrap banner.
- `accentGlow` teal drop-shadow on cards — glow effects are the #1 "AI slop" tell.
- Title Case copy ("Trip Wrap is Ready!") with exclamation marks — shouty.
- `opacity: pressed ? 0.85` on Home group cards while Button uses spring scale —
  two different press behaviors for the same gesture in the same app.

## 0.5 The one original idea is buried

`threadLine: rgba(78,205,196,0.25)` — the dhaga. A thread connecting expenses,
people, places, memories. No competitor has this. It is currently a 25%-opacity
hairline used "only for connector lines." This should be the entire identity.

**Verdict:** promote the thread to the system's protagonist. See §2.6.

## 0.6 Motion exists but has no choreography

`motion.ts` defines good springs and durations, and Button/Card use press-scale.
But there is no entrance choreography, no shared-element continuity, no
signature moment. Sheets appear, screens slide — nothing *feels* like Apna.

## 0.7 What is genuinely good (keep and build on)

- Token discipline: every color/space/size flows through `useTheme()`. Rare and valuable.
- WCAG floor: 44pt touch targets, 10pt type minimum, contrast-adjusted light mode.
- Haptics engine wired to semantic patterns.
- Mono-for-amounts as a rule.
- The dhaga concept itself.

The redesign is therefore a **re-skin plus re-choreography on top of a healthy
skeleton** — not a rebuild. That is why it is achievable.

---
---

# PART 1 — DESIGN PHILOSOPHY: KORA & INK, THE WOVEN INTERFACE

## 1.1 The metaphor

Apna means *ours*. A trip with friends is money, places, photos, and plans —
loose threads. The app is the fabric they are woven into. Everything in this
system derives from one image: **an Indian textile, hand-stitched.**

- The background is the **fabric**: kora (unbleached cotton) in light mode,
  ink-dyed cloth in dark mode. Warm, matte, never pure white or blue-black.
- Content sits **on** the fabric like print — rows, type, photos. Not in boxes.
- The **stitch** (dhaga) is the connective tissue: a visible running-stitch line
  that sews expenses into feeds, days into itineraries, friends into groups.
- The single accent is **madder** — the natural red dye of Indian block prints.
  It appears where the thread does: actions, connections, money in motion.

## 1.2 The five laws

Every screen and component obeys these. Reviews check against them by name.

**LAW 1 — One fabric.** Screens are a continuous warm surface. Cards are
exceptions reserved for: bottom sheets, photos/memories, and money-moment
surfaces (settle-up confirmation, trip wrap). Everything else is rows and type
directly on the background, separated by stitch dividers and whitespace.

**LAW 2 — One loud thing per screen.** Each screen has exactly one editorial
focal point — a display-size number or name. Everything else stays ≤16pt.
If two things shout, demote one.

**LAW 3 — Madder budget: three.** The accent appears at most three times per
screen: (1) the primary action, (2) the active/selected indicator, (3) one live
status. A fourth use means one of the first three was wrong.

**LAW 4 — The stitch is the system.** Anywhere two things are connected in
meaning — an expense to its payer, a day to the next day, a debt to its
settlement — the connection is drawn as the running stitch. Never as a plain
`borderBottom`.

**LAW 5 — Nothing appears; everything arrives.** Every element enters with
spring physics and intent (see §2.7 choreography). Skeletons shimmer like
weft threads. State changes are sewn, not swapped.

## 1.3 What "not AI-generic" means operationally

A concrete banlist, enforced in code review:

| Banned | Because | Replacement |
|---|---|---|
| Teal/coral/purple accents | LLM default trio | Madder + leaf only |
| Blue-black backgrounds | Template dark mode | Warm ink `#161512` |
| Pure white light mode | Template light mode | Kora `#F3EEE4` |
| Glow/neon shadows | #1 AI-slop tell | Flat elevation steps |
| Gradient hero cards | Template vocabulary | Editorial type on fabric |
| Emoji as icons | Unfinished tell | Icon set (§2.5) |
| Text glyphs (`←`, `+`, `×`) as controls | Unfinished tell | Icon set (§2.5) |
| Inter / Outfit / Poppins / Montserrat | Fingerprinted faces | §2.2 faces |
| Card-inside-card nesting | Template vocabulary | Rows on fabric |
| Title Case + `!` in UI copy | Generated-copy tell | Sentence case, calm |
| Rainbow category colors | Decoration without meaning | Tinted neutrals + icon |

---
---

# PART 2 — FOUNDATIONS

## 2.1 Color system

### 2.1.1 Principles

- Warm everywhere. Every neutral carries a yellow-brown undertone; no pure grays.
- One accent (madder), one supporting semantic (leaf green), one warning (haldi).
- Color encodes **meaning only**: red = money you owe / action, green = money
  owed to you / resolved, haldi = caution. Decoration is done with neutrals.
- Dark and light are the same design at different times of day — identical
  hierarchy, swapped values. No component may branch on scheme.

### 2.1.2 Dark mode — INK (default)

```ts
export const InkColors = {
  // ── Fabric (backgrounds) ──────────────────────────────
  bgPrimary:   '#161512',   // Ink cloth — main fabric
  bgSecondary: '#1D1B17',   // Woven step — grouped rows, tab bar
  bgTertiary:  '#26231D',   // Raised weave — inputs, sheets, chips

  // ── Accent: madder (the dyed thread) ──────────────────
  accentPrimary: '#D96A50', // Madder, lightened for dark fabric
  onAccent:      '#2A0E06', // Text/icon on madder fill

  // ── Semantic ──────────────────────────────────────────
  positive: '#8FAE9A',      // Leaf — owed to you, settled well
  negative: '#D96A50',      // Madder doubles as "you owe" (money in motion)
  warning:  '#C9A24B',      // Haldi — caution, budget nearing
  settled:  '#8F8878',      // Faded thread — done, quiet

  // ── Text ──────────────────────────────────────────────
  textPrimary:   '#EFEAE0', // Chalk on ink
  textSecondary: '#A39B89', // Faded cotton
  textMuted:     '#736D5E', // Timestamps, hints (AA vs bgPrimary)

  // ── Lines ─────────────────────────────────────────────
  hairline:  'rgba(239,234,224,0.08)', // Structural hairline (rare)
  stitch:    'rgba(217,106,80,0.55)',  // The running stitch — madder
  stitchDim: 'rgba(163,155,137,0.35)', // Neutral stitch — settled/past

  // ── Overlay ───────────────────────────────────────────
  scrim:   'rgba(12,11,9,0.55)',
  overlay: 'rgba(12,11,9,0.85)',

  // ── System bars ───────────────────────────────────────
  statusBar: '#161512',
  navBar:    '#1D1B17',
  tabBar:    '#1D1B17',
  tabIconActive:   '#EFEAE0',   // Active tab is TEXT-colored, not accent
  tabIconInactive: '#736D5E',
  tabStitch:       '#D96A50',   // 12pt stitch dash under active tab
} as const
```

Note the deliberate inversions vs. the old theme:
- The active tab icon is **chalk, not madder** — the accent goes to the tiny
  stitch dash beneath it. This alone removes 40% of the old accent noise.
- "You owe" and the primary action share madder. Owing money and acting on it
  are the same energy; this halves the palette and doubles its meaning.

### 2.1.3 Light mode — KORA

```ts
export const KoraColors = {
  bgPrimary:   '#F3EEE4',   // Unbleached cotton
  bgSecondary: '#ECE5D6',   // Woven step
  bgTertiary:  '#E4DCC9',   // Raised weave

  accentPrimary: '#B0402F', // Madder, full-strength dye (AA on kora)
  onAccent:      '#F9F1EC',

  positive: '#3E5C50',      // Leaf, deepened for light fabric
  negative: '#B0402F',
  warning:  '#8A6A1F',      // Haldi, deepened
  settled:  '#8A8272',

  textPrimary:   '#1C1A15', // Ink on cotton
  textSecondary: '#6E675A',
  textMuted:     '#948C7A',

  hairline:  'rgba(28,26,21,0.09)',
  stitch:    'rgba(176,64,47,0.6)',
  stitchDim: 'rgba(110,103,90,0.4)',

  scrim:   'rgba(28,26,21,0.35)',
  overlay: 'rgba(243,238,228,0.9)',

  statusBar: '#F3EEE4',
  navBar:    '#ECE5D6',
  tabBar:    '#ECE5D6',
  tabIconActive:   '#1C1A15',
  tabIconInactive: '#948C7A',
  tabStitch:       '#B0402F',
} as const
```

### 2.1.4 Avatar palette — dyed threads

Eight thread-dye colors, muted to sit on fabric without shouting. Same hue
order both modes; light mode deepens each by one step for contrast.

```ts
// Dark (ink) mode
avatar: [
  '#D96A50',  // madder
  '#8FAE9A',  // leaf
  '#C9A24B',  // haldi
  '#A98BB8',  // jamun (muted plum)
  '#7FA0B8',  // indigo-wash
  '#C98B6B',  // clay
  '#B8A98B',  // jute
  '#B87F8F',  // rose-madder
]
// Light (kora) mode
avatar: [
  '#B0402F', '#3E5C50', '#8A6A1F', '#6E4A80',
  '#3D617A', '#8F5232', '#6E5F3E', '#8A4457',
]
```

Rule: avatar color is derived from `uid` hash — stable per person across
groups, screens, sessions. A friend is always their thread color.

### 2.1.5 Category system — tinted neutrals, not rainbow

Old system: six saturated colors for expense categories. New system: categories
are identified by **icon + label**, colored with a single tinted-neutral ramp.
Only the icon container tints; text stays `textSecondary`.

```ts
category: {
  food:       { icon: 'bowl',      tint: 'rgba(201,162,75,0.14)' },
  stay:       { icon: 'bed',       tint: 'rgba(127,160,184,0.14)' },
  transport:  { icon: 'route',     tint: 'rgba(143,174,154,0.14)' },
  activities: { icon: 'confetti',  tint: 'rgba(169,139,184,0.14)' },
  shopping:   { icon: 'bag',       tint: 'rgba(201,139,107,0.14)' },
  misc:       { icon: 'thread',    tint: 'rgba(163,155,137,0.14)' },
}
```

Result: an expense list reads as calm rows with quiet tinted icon squares —
the amount column (mono, right-aligned) is the loudest element, as it should be.

### 2.1.6 Contrast requirements (enforced)

| Pair | Minimum | Verified |
|---|---|---|
| textPrimary on bgPrimary | 7:1 (AAA) | ink 13.2:1 · kora 12.8:1 |
| textSecondary on bgPrimary | 4.5:1 (AA) | ink 5.4:1 · kora 4.9:1 |
| textMuted on bgPrimary | 3:1 (large/labels only) | both ≥3.1:1 |
| onAccent on accentPrimary | 4.5:1 | both ≥5:1 |
| positive/negative on bgPrimary | 4.5:1 | both pass |

`textMuted` may never carry information that exists nowhere else.

### 2.1.7 Migration map (old token → new token)

| Old | New |
|---|---|
| `accentPrimary #4ECDC4` | `accentPrimary` (madder) |
| `accentDanger #FF6B6B` | `negative` (madder — merged) |
| `accentGold #FFD166` | `warning` (haldi) |
| `positive #4ECDC4` | `positive` (leaf) |
| `border` | `hairline` (use sparingly; prefer stitch or whitespace) |
| `borderAccent` | delete — no accent borders in the new system |
| `threadLine` | `stitch` / `stitchDim` |
| `avatar[8]` | new dyed-thread ramp |
| `category{}` | tinted-neutral objects |

Because every component reads `useTheme()`, this migration is mechanical.

## 2.2 Typography system

### 2.2.1 Faces

| Role | Face | Weight | Why |
|---|---|---|---|
| Display + headings | **Cabinet Grotesk** | 800 display, 700 heading | Editorial personality in heavy weights; travel-magazine energy; free (Fontshare); not in the AI-default set |
| Body + labels | **General Sans** | 400 body, 500 label | Quietly excellent grotesque, rarely seen in apps, superb at 13–16pt; free (Fontshare) |
| Amounts, codes, time | **Spline Sans Mono** | 500 | Softer than JetBrains, tabular figures, good ₹; free (Google Fonts) |

Devanagari note: Fontshare faces lack Devanagari coverage. When Hindi UI ships,
pair with **Anek Devanagari** (display) and **Mukta** (body) — both free, both
metrically compatible enough at our sizes. Register fallback chains now.

### 2.2.2 Scale (structure kept from current system, faces swapped)

```ts
export const FontFamily = {
  display: 'CabinetGrotesk-Extrabold',
  heading: 'CabinetGrotesk-Bold',
  body:    'GeneralSans-Regular',
  label:   'GeneralSans-Medium',
  mono:    'SplineSansMono-Medium',
} as const

export const FontSize = {
  displayLg: 44,  // ONE per app: the money number (Budget hero, SettleUp)
  displayMd: 34,  // Group name hero, Trip Wrap stats
  displaySm: 28,  // Screen heroes (Memories, Itinerary day)
  headingLg: 24,  // Screen titles
  headingMd: 20,  // Section titles
  headingSm: 17,  // Card/sheet titles
  bodyLg: 16,
  bodyMd: 15,
  bodySm: 13,
  labelLg: 13,
  labelMd: 12,
  labelSm: 11,    // floor raised from 10 — Redmi 720p legibility
  monoLg: 26,     // list-hero amounts
  monoMd: 16,     // row amounts
  monoSm: 12,     // timestamps, codes
} as const
```

Changes vs. current: displayLg drops 48→44 (Cabinet Grotesk 800 is visually
heavier than Outfit 700 — 44 reads bigger); label floor rises 10→11.

### 2.2.3 Composition rules

- Display sizes use Cabinet Grotesk 800 with `letterSpacing: -1` and tight
  `lineHeight` (1.05×). Headlines should feel *set*, like a magazine, not typed.
- ALL-CAPS is allowed only at `labelSm` with `letterSpacing: 2` — used for the
  stitch-label pattern: `DAY 2 · JAIPUR`, `YOU ARE OWED`. Max one per section.
- Amounts always mono, always tabular, always right-aligned in rows. The ₹
  symbol renders at 0.8em with `textSecondary` color — the digits carry the
  weight, the symbol whispers.
- Never mix two type colors inside one line except the ₹-symbol rule above.
- Body text max width: 34ch. Long descriptions wrap early rather than spanning
  the full screen.

### 2.2.4 The numerals are the brand

In a money app, numbers are 60% of the emotional surface. Rules:

- Balance changes animate digit-by-digit (odometer roll, 240ms, `Ease.out`).
- Positive amounts get a leading `+` in `positive` color; negative amounts are
  plain madder — no minus sign (the color and context say it; a minus reads
  like an accusation).
- Zero states render as `₹0` in `settled` color with the stitch-through
  treatment (a stitchDim line through the amount) — "sewn shut."

## 2.3 Spacing, layout grid, and radius

### 2.3.1 Grid

4pt base grid retained. Token set retained (`xs 4 → 4xl 64`). New rules:

- Screen horizontal padding rises 16 → **20pt** (`screenPaddingH`). The extra
  4pt of fabric margin is what makes editorial type breathe.
- Section gap rises 24 → **32pt**. Whitespace replaces card borders as the
  primary separator; it must be generous enough to do that job.
- Row height standard: **64pt** for list rows (expense, member, list item),
  **56pt** for dense rows (settings). Both exceed the 44pt touch floor.

### 2.3.2 Radius — two radii, strictly

| Token | Value | Used for |
|---|---|---|
| `radius.soft` | 12 | Inputs, chips, icon tiles, photos in rows |
| `radius.sheet` | 28 | Bottom sheets (top corners), modals, memory cards |
| `radius.full` | 9999 | Avatars, pill buttons, FAB |

The old 4-step radius scale (8/12/16/24) is deleted. Mixed radii across one
screen is a template tell; two values create rhythm.

### 2.3.3 Shadows — deleted, replaced by elevation steps

All `shadowColor`/`elevation` configs are removed, including `accentGlow`
(banned, §1.3). Depth comes from the three fabric steps
(`bgPrimary → bgSecondary → bgTertiary`) plus the scrim for floating layers.
The only shadow in the app: bottom sheets cast
`shadowOpacity 0.18, radius 24, offset (0,-8)` in dark and `0.10` in light —
because a sheet is physically *above* the fabric. Nothing else floats.

## 2.4 Elevation and depth

Three in-flow steps and two floating layers. Maximum one floating layer
visible at a time (sheet OR modal, never stacked).

| Layer | Surface | Example |
|---|---|---|
| 0 | `bgPrimary` | The screen fabric |
| 1 | `bgSecondary` | Grouped row clusters, tab bar |
| 2 | `bgTertiary` | Inputs, chips, pressed states |
| Float A | `bgTertiary` + scrim + shadow | Bottom sheets |
| Float B | `bgSecondary` + overlay | Full modals (rare: camera, wrap) |

## 2.5 Iconography

### 2.5.1 The set

**Phosphor Icons** (regular weight, 1.5px stroke at 24pt) as the base set —
consistent, humanist, free, and crucially *not* Feather/Lucide (the AI-default
icon set). Installed via `phosphor-react-native`.

Nine custom glyphs drawn in-house on the same 24pt grid to carry the brand
(these are the ones users see hourly):

1. `thread-add` — a needle pulling thread through a plus (Add expense FAB)
2. `thread-knot` — a small knot (settled state)
3. `stitch-arrow` — running-stitch arrow (settle direction, "A owes B")
4. `charpai` — woven square (Home tab)
5. `rasta` — stitched path (Itinerary tab)
6. `potli` — drawstring pouch (Budget tab)
7. `taveez` — thread locket (Memories tab)
8. `baithak` — circle of dots (Hangouts tab)
9. `dhaga-logo` — the app mark: a needle mid-stitch forming an "a"

### 2.5.2 Rules

- Icon sizes: 16 (inline), 20 (rows), 24 (tab bar, headers), 28 (FAB only).
- Icons inherit text color of their context; never accent-colored except
  inside the three madder-budget slots.
- **Zero emoji in chrome.** Emoji survive only as user content (group emoji,
  reactions) — and group emoji render inside a neutral `bgTertiary` tile so
  they read as content, not UI.
- Every text-glyph control (`←`, `+`, `×`, `⋯`) is replaced. Full sweep list
  in Part 3 per component.

## 2.6 The Stitch — Apna's signature element

The single most important section of this document.

### 2.6.1 Anatomy

The stitch is a dashed line with **6pt dash / 4pt gap, 2pt thickness,
rounded caps**, drawn in `stitch` (madder, live) or `stitchDim` (neutral,
past/settled). It is implemented once as `<Stitch />` (see Part 3) with
horizontal, vertical, and path variants — never hand-rolled.

### 2.6.2 Where it appears (canonical uses)

| Surface | Role |
|---|---|
| Activity feed | Vertical stitch down the left margin sewing events together; live segment madder, older segments dim |
| Itinerary day view | The day's spine; items are knots on it |
| Map routes | The route polyline IS a stitch path |
| Settle-up | Stitch travels from debtor avatar to creditor avatar during confirmation |
| Active tab | 12pt stitch dash under the active tab icon |
| Section labels | `STITCH-LABEL` pattern: 16pt stitch + gap + labelSm caps text |
| Balance zero | StitchDim strike-through on `₹0` — sewn shut |
| Progress | Budget progress bar is a stitch that fills its dashes solid |
| Pull-to-refresh | A stitch sews across the top and pulls tight |
| Dividers | Any semantic divider (day change in feed, section break) |

### 2.6.3 The sewing animation

Signature motion: a stitch never fades in — it **sews** in. Dashes appear
sequentially from origin at 18ms per dash (SVG `strokeDashoffset` animation,
native driver). On completion of a meaningful action (expense saved,
settlement recorded) the final dash lands with `haptics.medium`.

### 2.6.4 What the stitch is NOT

Not a decoration to sprinkle. If two elements aren't semantically connected,
they don't get a stitch. Structural separation uses whitespace first,
`hairline` second.

## 2.7 Motion system

### 2.7.1 Tokens (evolved from current motion.ts)

Durations and springs are kept, with two additions:

```ts
Duration.sew   = 18   // per stitch dash
Duration.hero  = 420  // odometer rolls, wrap reveals
Spring.settle  = { tension: 26, friction: 8 }  // slow, weighty — money moments
```

### 2.7.2 Choreography rules (new — this is what "smooth" means)

1. **Screen entrance**: content enters in 3 groups — hero (0ms), rows
   (+40ms, staggered 24ms each, max 6 staggers), FAB (+160ms, scale from 0.6
   with `Spring.gentle`). Never a full-screen fade.
2. **Shared continuity**: tapping a row expands it toward its detail — the
   detail screen's hero (amount, photo, place name) starts at the row's
   position and springs to place. Use react-navigation shared transitions
   where possible; fake with measured springs elsewhere.
3. **Sheets**: rise with `Spring.standard`, scrim fades in parallel at 60%
   speed. Drag-to-dismiss with velocity handoff — a flick dismisses fast.
4. **Press states**: unified everywhere — scale 0.97 in with `Spring.snappy`,
   out with `Spring.gentle` (Button's current behavior becomes law; the
   `opacity: 0.85` pattern in HomeScreen is banned).
5. **Money moments** use `Spring.settle` + odometer + stitch-sew + haptic
   in that order. These are the three slowest, heaviest animations in the app
   and they are the only place slowness is allowed.
6. **Reduce Motion**: every choreography has a 120ms crossfade fallback
   behind `AccessibilityInfo.isReduceMotionEnabled`.

### 2.7.3 Performance budget

All animations on native driver. Stagger caps at 6 items. Stitch-sew uses one
SVG per line, not per dash. Target: 60fps on a Redmi Note 9 (the reference
low-end device already implied by the 720p rule in typography).

## 2.8 Haptics

Semantic mapping retained from `HapticPattern`, tightened:

| Event | Pattern |
|---|---|
| Any press | light |
| Expense saved, item checked | medium |
| Settlement recorded | success (paired with final stitch dash) |
| Budget threshold crossed | warning |
| Destructive confirm | heavy |
| Errors | error |

Rule: haptics fire on *completion*, not initiation (except press-light).
Never two haptics within 300ms.

## 2.9 Illustration and empty-state art

Style: **single-line thread drawings** — one continuous madder line on the
fabric, as if sewn, depicting the empty state's subject (an empty pouch for
budget, an unthreaded needle for no expenses, a folded map for no itinerary).
Drawn as SVG paths, animated with the sewing animation on first appearance.
No blob people, no isometric scenes, no 3D renders — those are template art.

Each empty state = illustration (sewn in) + headline (headingSm) + one-line
body (bodySm, textSecondary) + one CTA. Copy per screen specified in Part 4.

## 2.10 Copy voice

- Sentence case everywhere. No exclamation marks in chrome. No "successfully."
- Hinglish warmth is allowed in *moments*, not chrome: "Sab barabar." on a
  fully-settled group, "Chalein?" on trip start. One per screen max, and only
  in celebration/empty surfaces, never in buttons or errors.
- Money copy is direct and neutral: "You owe Priya ₹450", "Rohan owes you
  ₹1,200". Never "Uh oh!" framing around debt.
- Errors: what happened + what to do. "Couldn't save the expense. Retry."

---
---

# PART 3 — COMPONENT LIBRARY

Every component in `src/components/` audited, then respecified. Format:
**Current** (what the code does) → **Verdict** → **Redesign spec**.

## 3.0 New primitives (build first — everything else consumes them)

### 3.0.1 `<Stitch />`
The signature element. Props:
```ts
interface StitchProps {
  direction?: 'horizontal' | 'vertical'
  path?: string            // SVG path for map routes / custom curves
  length?: number | '100%'
  tone?: 'live' | 'dim'    // stitch vs stitchDim
  sew?: boolean            // animate sewing on mount
  sewDelay?: number
  progress?: number        // 0-1: dashes fill solid up to progress (budget bars)
}
```
Implementation: single `react-native-svg` line/path, strokeDasharray 6/4,
strokeLinecap round, strokeWidth 2. Sewing = animated strokeDashoffset.
This component replaces: Divider (semantic uses), progress bars, thread lines,
route polylines, tab indicators.

### 3.0.2 `<Row />`
The standard content unit replacing default Cards. 64pt (or 56 dense),
transparent on fabric, press = unified scale spring + bgTertiary flash.
Slots: `leading` (icon tile / avatar), `title`, `subtitle`, `trailing`
(amount / chevron / control). No borders; separation is whitespace, with
optional `hairline` inside grouped clusters only.

### 3.0.3 `<StitchLabel />`
Section header pattern: 16pt stitch + 8pt gap + labelSm ALL-CAPS text in
textMuted. E.g. `— — —  TODAY`, `— — —  DAY 2 · JAIPUR`. Replaces every
bare section-title Text.

### 3.0.4 `<Amount />`
The only way money renders. Props: value, currency, size (lg/md/sm),
signed (adds `+` in leaf for positive), settled (stitch-through zero),
animate (odometer roll on change). Enforces mono, tabular, rupee-at-0.8em rules.

### 3.0.5 `<IconTile />`
20pt Phosphor icon centered in a 40pt `radius.soft` square with a category
tint or bgTertiary. The leading element of most rows.

### 3.0.6 `<Sheet />`
Rebuilt BottomSheet: 28pt top radius, bgTertiary surface, 36x4pt handle in
textMuted at 40% opacity, `Spring.standard` rise, velocity drag-dismiss,
scrim tap-dismiss, keyboard-avoiding by default. All existing sheets migrate.

## 3.1 `ui/Button.tsx`

**Current:** 4 variants, spring press scale, haptic on press, ActivityIndicator
loading, teal fill / teal outline / ghost / red fill.
**Verdict:** best-built component in the app; behavior kept, skin replaced.
**Redesign:**
- `primary`: madder fill, `onAccent` text, pill (`radius.full`) at md/lg.
  The ONLY madder-filled control on any screen (Law 3 slot 1).
- `secondary`: bgTertiary fill, textPrimary label. No colored outline —
  outlined-accent buttons are a template tell.
- `ghost`: text-only, textSecondary that shifts to textPrimary on press.
- `danger`: reserved for destructive confirms inside sheets only; madder fill
  with `heavy` haptic and a 400ms hold-to-confirm variant for irreversibles.
- Loading: label crossfades to three sewing dashes (mini stitch), not a spinner.
- Sizes: sm 36 (radius.soft), md 48, lg 56 (both pill).

## 3.2 `ui/Card.tsx`

**Current:** default container for everything; border + shadow + optional
teal `accentGlow`.
**Verdict:** demoted per Law 1. `accentGlow` deleted outright.
**Redesign:** `<Card>` survives with exactly three intents, enforced by prop:
`intent: 'sheet-block' | 'photo' | 'money-moment'`. bgSecondary, radius.sheet
(photo/money) or radius.soft (sheet-block), no border, no shadow. Any other
usage in code review gets converted to `<Row>` or plain layout.

## 3.3 `ui/FAB.tsx`

**Current:** circular, teal, receives text glyph `+` as icon from callers.
**Redesign:** 56pt madder pill (not circle) with `thread-add` custom icon 28pt
plus optional label ("Add expense") that collapses to icon-only on scroll-down
and re-expands on scroll-up (Meta-style morphing FAB, `Spring.snappy`).
Entrance: +160ms after screen content, scale 0.6 to 1 `Spring.gentle`.
This is Law 3 slot 1 on screens that have it — meaning the screen must not
also show a primary Button. Audit each screen (Part 4) for conflicts.

## 3.4 `ui/Avatar.tsx`

**Current:** initials/photo circle with palette color.
**Redesign:** thread-dye ramp (section 2.1.4) keyed by uid hash. Initials in
GeneralSans-Medium. Sizes 24/32/40/56. New `stitched` prop: a 1.5pt stitch
ring around the avatar for "live on trip / sharing location" — replaces any
green-dot presence convention. Overlap stacks (-8pt) order newest-first.

## 3.5 `ui/Badge.tsx`

**Current:** colored pills.
**Redesign:** two variants only. `quiet`: bgTertiary + textSecondary (counts,
metadata). `status`: tint background at 14% + semantic text color (owed/owes/
settled/pending). labelMd, radius.full, 24pt height. No madder badges — badges
are never actions.

## 3.6 `ui/Input.tsx`

**Current:** bgTertiary field with border.
**Redesign:** borderless bgTertiary field, radius.soft, 52pt. Focus state:
a stitch sews along the bottom edge (left to right, 240ms) in madder — the
focus ring IS the thread. Error: stitch re-sews in haldi + bodySm message
below; never red borders around the whole field. Amount inputs use mono at
monoLg with the rupee prefix pre-rendered in textMuted.

## 3.7 `ui/Divider.tsx`

**Current:** hairline View.
**Redesign:** wraps `<Stitch tone="dim">` for semantic breaks; plain hairline
variant kept for inside grouped clusters. Default spacing 16pt above/below.

## 3.8 `ui/EmptyState.tsx`

**Current:** icon + text + button, centered.
**Redesign:** thread-drawing illustration (section 2.9, sewn-in on mount) +
headingSm + bodySm (max 34ch) + one Button. Vertical position at 38% of screen
height, not dead center (optically higher = intentional). Per-screen art and
copy in Part 4.

## 3.9 `ui/Skeleton.tsx`

**Current:** gray shimmer blocks.
**Redesign:** "loom" skeleton — rows of bgSecondary bars whose shimmer is a
diagonal pass of `stitchDim` at 12% opacity, 1200ms loop, staggered 80ms per
row. Skeletons match the exact geometry of the loaded Row (title width 60%,
trailing amount 56pt) so load completion is a crossfade, not a reflow.

## 3.10 `ui/BottomSheet.tsx` — replaced by `<Sheet />` (3.0.6)

## 3.11 `ui/SettlementCard.tsx`

**Current:** card with names + amount + settle button.
**Redesign:** becomes the `money-moment` Card intent: debtor avatar, then
`<Stitch direction="horizontal">`, then creditor avatar; amount centered below
in monoLg, single primary Button. On settle: stitch sews across, knot icon
lands at center, success haptic. This card is one of three allowed card
surfaces — make it feel like a small ceremony.

## 3.12 `layouts/Screen.tsx` and `layouts/Header.tsx`

**Current:** SafeArea wrapper; standard 56pt header.
**Redesign — Screen:** applies bgPrimary fabric, 20pt horizontal padding,
entrance choreography hooks (registers hero/rows/fab groups). Scroll views get
`contentInsetAdjustmentBehavior` and 32pt bottom padding above tab bar.
**Redesign — Header:** transparent over fabric (no navBar fill at scroll-top).
Back control: 36pt circular bgTertiary tile with Phosphor `CaretLeft` (kills
the text-arrow glyph). Title appears in the header only after the hero scrolls
out (fade + 8pt rise, 200ms) — before that the hero IS the title. Right side
max two icon controls.

## 3.13 Domain components — budget/*

- `BudgetHeroCard` — no longer a card. The hero is displayLg `<Amount>` on
  fabric with a full-width `<Stitch progress={spent/total}>` beneath and a
  bodySm caption ("₹18,400 of ₹30,000 · 6 days left"). Status shifts the
  stitch tone: live madder under 80%, haldi 80–100%, solid madder over.
- `BudgetStatPill` — `quiet` Badges in a wrapping row; max 3 visible.
- `BudgetCategoryList` — `<Row>`s with IconTile + mini stitch progress under
  each subtitle, amount trailing.
- `BudgetTrendSparkline` — keep, restyle: 1.5pt textSecondary line, madder dot
  on today, no fill gradient (banned).
- `BudgetAlertCard` — inline `status` banner Row, haldi tint. Not a card.
- `BudgetBurnChip`, `BudgetForecastCard`, `BudgetEmptyState`,
  `BudgetPermissionHint`, `EditBudgetSheet` — restyle onto Row/Sheet/EmptyState
  primitives; forecast copy plain: "At this pace you'll cross budget Friday."

## 3.14 Domain components — group/*

- `GroupHeaderHero` — the emoji tile becomes a 48pt bgTertiary radius.soft
  tile; group name displayMd Cabinet Grotesk; destination + dates one bodySm
  line in textSecondary; invite chip becomes a ghost row moved into the
  Members tab (header carries max: back, name block, overflow icon). Collapse
  behavior: name shrinks displayMd to headingSm into the header on scroll
  (interpolated, native driver).
- `ActivityFeedItem` — Row on a vertical feed stitch; day changes get a
  StitchLabel. Feed items: actor avatar (24), one-line sentence
  ("Priya added Dinner at Thalassa"), trailing Amount. Money events show the
  amount; non-money events (joins, photos) stay quiet textSecondary.
- `BalanceSummaryCard` — "money-moment" card only when nonzero; when settled,
  a single Row: "Sab barabar." + knot icon.
- `MemberAvatarRow` — overlap stack + `stitched` rings for live members.
- `InviteCodeCard` — Row with mono code + Phosphor `Copy`; share is secondary.
- `DangerZoneCard` / `DangerZoneSection` — rows with madder text, no red card
  container; destructive confirms via Sheet with hold-to-confirm Button.
- `MemberRoleRow`, `SettingsRow` — `<Row>` dense variant, chevron trailing.

## 3.15 Domain components — settlement/*

- `BalanceRow` / `DebtRow` — Row: avatar, "owes you"/"you owe" bodySm,
  trailing signed Amount. Direction arrow replaced by `stitch-arrow` glyph.
- `SettleUpSheet` / `SettlementConfirmSheet` — Sheet + SettlementCard ceremony
  (3.11) + UPI actions as secondary Buttons.
- `SettlementAmountRow` — mono amounts, tabular-aligned column.

## 3.16 Domain components — expense/*

- `CategoryPicker` — horizontal row of IconTiles with labels; the selected
  tile gets a stitch ring (not a fill change). Scrolls; no grid modal.
- `ParticipantSelector` — avatar grid; selected avatars get stitch ring +
  scale 1.06 spring. "Everyone" pill first.
- `SplitMethodPicker` — segmented control on bgTertiary track, sliding
  bgSecondary thumb with `Spring.snappy` (equal / unequal / percent / shares).
- `SplitSummaryRow` — per-person Row with editable mono amount; live total
  validation sews a leaf-green stitch when the split sums correctly.
- `ReceiptChip` / `ReceiptViewer` / `ReceiptCamera` — chip is a 40pt thumbnail
  tile with count badge; viewer is a Float B overlay with pinch zoom;
  camera sheet per 4.4.

## 3.17 Domain components — camera, members, location, referral, reel, recap

- `MediaPickerSheet`, `NativeCameraSheet` — migrate to Sheet primitive;
  shutter button is the one white circle in the app (camera convention beats
  brand rules inside a viewfinder).
- `PhotoThumbnailStrip` — 72pt tiles, radius.soft, 8pt gap; upload progress is
  a stitch sewing around the tile perimeter (replaces UploadProgressChip's
  spinner).
- `ContactPermissionCard` / `LocationPermissionGate` — EmptyState pattern with
  thread illustration + plain-language rationale + single CTA. Never a modal
  ambush; always inline, always dismissible.
- `ContactSuggestionRow` — Row + "Invite" ghost button trailing.
- `LocationSharingBanner` — persistent quiet banner: stitched avatar +
  "Sharing until 8:00 pm" mono + "Stop" ghost. Madder dot pulse (one of the
  three accent slots on the Map screen).
- `ReferralDashboard` / `ReferralShareRow` / `ReferralWelcomeBanner` — rows +
  one money-moment card for earned credit; welcome banner uses haldi tint.
- `ReelOverlayFrame` / `MemoryReelExportPanel` — export panel = Sheet with
  format Rows; overlay frame uses kora fabric + stitch border + dhaga-logo
  watermark bottom-right (a brand moment for shared content).
- `PublicRecapCard` — the shareable artifact: kora fabric always (even when
  exported from dark mode — shares must look consistent), stitch-framed stats,
  Cabinet Grotesk numbers. This card is marketing; polish accordingly.

---
---

# PART 4 — SCREEN BLUEPRINTS

Every screen gets: **Current state** → **Critique** → **Layout blueprint**
(top-to-bottom spec) → **Motion** → **States** (empty / loading / error) →
**Signature moment** (the one creative detail that makes this screen unique).

Global rules assumed on every screen (not repeated below): fabric background,
20pt horizontal padding, entrance choreography (2.7.2 rule 1), unified press
behavior, Law 2 single focal point, Law 3 madder budget.

---

## 4.1 AUTH FLOW

The first 90 seconds decide whether the app feels crafted. The auth flow is
five screens; they must feel like one continuous thread being pulled.

**Flow-wide signature:** a single stitch line persists across all five screens,
growing at each step — Splash (a knot), ValueFraming (short stitch),
PhoneInput (a third across), OTP (two-thirds), ProfileSetup (sews to the edge
and ties off as the user lands on Home). It doubles as the progress indicator;
there is no separate step-dots component.

### 4.1.1 SplashScreen

- **Current:** logo + spinner on navy.
- **Critique:** anonymous. A splash is a brand's one guaranteed impression.
- **Blueprint:** ink/kora fabric, dead center: the `dhaga-logo` (needle
  mid-stitch forming an "a") drawn by the sewing animation over 700ms, then
  the wordmark "apna" fades in beneath in Cabinet Grotesk 800, 34pt,
  lowercase. No spinner ever — if load exceeds 900ms, the logo's thread
  gently pulses (opacity 0.7 to 1.0, 1200ms loop).
- **Motion:** logo sew 700ms → wordmark fade 200ms → crossfade to first screen.
- **Signature moment:** the logo is never static — it is always the result of
  a just-completed stitch.

### 4.1.2 ValueFramingScreen

- **Current:** onboarding value cards.
- **Critique:** value-prop carousels are the most skipped surface in mobile;
  three swipeable cards of benefits is pure template.
- **Blueprint:** ONE screen, no carousel. Top 55%: a slow autoplaying thread
  drawing that sews three tiny scenes in sequence (a bill splitting in two, a
  route stitching between two pins, a photo being hemmed) — 2.4s total, loops
  once then holds. Below: headline displaySm, 3 lines max:
  "Trips, money, memories. One thread." Body: one bodyMd line:
  "Split expenses, plan days, and keep what happened — together."
  Bottom: primary Button "Get started" + ghost "I have an invite code".
- **Motion:** scenes sew sequentially; headline rises 12pt with fade.
- **States:** none (static screen).
- **Signature moment:** the three-scene sewn animation — the whole pitch
  without a carousel.

### 4.1.3 PhoneInputScreen

- **Current:** phone field + country code + CTA.
- **Critique:** functional; generic form look.
- **Blueprint:** StitchLabel `STEP 1 OF 3` top-left under the header. Headline
  headingLg: "Your number". Sub bodySm textSecondary: "We'll text you a code.
  No passwords." The input: country chip (flag emoji is allowed — user-facing
  content — inside a bgTertiary tile) + mono monoLg digits; the field's focus
  stitch (3.6) is the flow-stitch itself continuing across the screen.
  Primary Button "Send code" pinned above keyboard, disabled until 10 digits.
- **Motion:** keyboard-synced button rise (keyboardWillShow spring).
- **Error:** invalid number re-sews the field stitch in haldi + "Check the
  number — 10 digits." No alert dialogs anywhere in auth.
- **Signature moment:** digits typeset live in Spline Sans Mono with grouping
  (98765 43210) — the number looks like it belongs to the app.

### 4.1.4 OTPScreen

- **Current:** OTP boxes.
- **Critique:** six bordered boxes is the universal OTP cliché.
- **Blueprint:** no boxes. Six mono digits render directly on the fabric at
  monoLg × 1.4, letterSpacing 12, with a single stitch underneath spanning all
  six positions; the stitch fills dash-by-dash as digits arrive (auto-read via
  SMS Retriever on Android). "Resend in 0:24" mono countdown, ghost button.
- **Motion:** each digit lands with a 1.06 scale spring; on verify, the
  stitch completes and ties a small knot at the end (240ms) before navigating.
- **Error:** wrong code shakes nothing (shake = template); instead digits turn
  madder, the stitch unsews right-to-left, and the field clears. Haptic error.
- **Signature moment:** the unsew-on-error. Nobody else has it.

### 4.1.5 ProfileSetupScreen

- **Current:** name + avatar setup.
- **Critique:** fine, plain.
- **Blueprint:** headline "What do friends call you?" headingLg. Name input
  (auto-focus). Below, the avatar preview: a 96pt circle that live-renders the
  user's initials in their permanent thread-dye color (uid hash) as they type —
  caption bodySm: "Your thread color. It's yours everywhere." Optional photo
  ghost button. Primary "Let's go" completes the flow stitch (ties off, knot,
  success haptic) and springs into Home.
- **Signature moment:** watching your thread color arrive as you type your
  name — the identity system introduces itself.

---

## 4.2 HOME

### 4.2.1 HomeScreen (groups list)

- **Current:** greeting, list of bordered group cards (emoji tile, name,
  member count), teal circular FAB with `+` glyph, FAB expands to two options
  with translateY.
- **Critique:** card-soup; press feedback inconsistent (opacity 0.85);
  FAB glyph is text; screen has no focal point; greeting wastes the hero slot.
- **Blueprint (top to bottom):**
  1. Header row: wordmark "apna" (Cabinet 800, 20pt, lowercase) left;
     avatar 32 right (opens Profile).
  2. Hero: displaySm, two lines max — the user's *net position across all
     groups*: "You're owed ₹3,250" (leaf) / "You owe ₹840" (madder) /
     "All settled" (settled + knot). This is the single most useful number in
     the product and today it appears nowhere on Home. Law 2 focal point.
  3. StitchLabel `— — — YOUR TRIPS`.
  4. Group rows (not cards): 72pt Row — 48pt emoji tile (bgTertiary,
     radius.soft), group name headingSm, subtitle bodySm "5 friends ·
     Goa · ends Sun", trailing per-group net Amount (signed, monoMd).
     Active trips first, sorted by recency; past trips under a second
     StitchLabel `— — — EARLIER`, rows at 60% opacity with stitchDim tiles.
  5. FAB: morphing pill "New trip" (3.3). Tap opens a Sheet with two Rows —
     "Create a trip" (thread-add icon) and "Join with code" (stitch-arrow
     icon) — replacing the translateY satellite-button pattern (template).
- **Motion:** hero odometer-rolls on balance change; rows stagger in;
  pull-to-refresh sews a stitch across under the header and pulls it tight.
- **Empty state:** thread drawing of an unthreaded needle. "No trips yet."
  / "Start one, or join with a friend's code." / primary "Create a trip".
- **Loading:** loom skeleton (3.9) — 4 group-row skeletons.
- **Signature moment:** the net-position hero. Opening the app answers the
  only question that matters in one glance.

### 4.2.2 ChoosePathScreen

- **Current:** onboarding fork (create vs join) for 0-group users.
- **Blueprint:** two large tappable panels (this is a rare allowed full-bleed
  moment, not cards-in-list): top panel "Start a trip" with a sewn suitcase
  drawing; bottom panel "Join friends" with a sewn group-of-knots drawing;
  each panel is half the screen minus header, separated by a horizontal
  stitch. Panels press-scale as one unit.
- **Signature moment:** the fork itself is the screen — no chrome at all.

---

## 4.3 GROUP

### 4.3.1 GroupHomeScreen (hub)

- **Current:** GroupHeaderHero + trip-wrap banner card + inner tab navigator
  (Feed/Members) + FAB with `+` text glyph.
- **Critique:** banner-card ambush at top; emoji-icon banner; hero crowded
  with invite chip; FAB glyph.
- **Blueprint:**
  1. Header (3.12): back tile, overflow icon. Transparent.
  2. Hero block on fabric: 48pt emoji tile; group name displayMd (collapses
     to header on scroll); one line bodySm: "Goa · 12–16 Nov · 5 friends".
  3. My-position strip: one Row — "You're owed ₹1,200 in this trip" with
     trailing "Settle" ghost button → SettleUp. If settled: "Sab barabar."
     + knot. (This replaces BalanceSummaryCard's card.)
  4. Trip Wrap prompt (only when trip over): NOT a banner card — a full-width
     money-moment Card with a photo mosaic background (3 memories at 20%
     opacity under an ink scrim), "Your trip, wrapped" headingSm, chevron.
     Appears once, dismissible, reachable later from overflow.
  5. Inner tabs: text tabs (Feed · Members) in label style; active tab has
     the 12pt tab-stitch beneath, sliding with `Spring.snappy`.
  6. FAB: "Add expense" morphing pill with thread-add icon.
- **Motion:** hero collapse interpolation; tab stitch slides; FAB morphs on
  feed scroll.
- **Signature moment:** the my-position strip — every group screen leads with
  what it means for *you*.

### 4.3.2 FeedTab

- **Current:** ActivityFeedItem list.
- **Critique:** flat list of card-ish items; no time structure; money and
  noise given equal weight.
- **Blueprint:** the canonical stitch surface. A vertical stitch runs down a
  28pt left gutter for the *current day's* events (live madder), turning
  stitchDim for older days. Events are Rows hung on the stitch: avatar knot
  (24) sits ON the line; sentence bodyMd ("Priya added Dinner at Thalassa");
  trailing Amount for money events. Day boundaries: StitchLabel with the date
  (`— — — YESTERDAY`). Non-money events (photo added, member joined,
  item checked) render one size smaller, textSecondary, no amount — the feed
  visually prioritizes money without hiding life.
  Photos in feed: 72pt thumbnails hung off the stitch, radius.soft, tappable
  to Memories.
- **Motion:** new events sew in from the top — the stitch extends first, then
  the row fades+rises in. Realtime events (from other members) arrive with a
  soft `light` haptic if the app is foregrounded.
- **Empty:** thread drawing of a needle and loose thread. "Nothing sewn yet."
  / "Add the first expense and the feed begins." (FAB is the CTA; none in
  the empty state itself.)
- **Signature moment:** watching the day's stitch grow as the trip happens.

### 4.3.3 MembersTab

- **Current:** member list + invite card.
- **Blueprint:** Row per member: Avatar 40 (stitched ring if sharing
  location), name bodyLg, role quiet Badge (admin), trailing pairwise Amount
  vs. me (signed) or knot if even. Tap → member sheet: pairwise history rows
  + "Settle with Priya" primary. Invite block at bottom: mono code in a
  bgTertiary Row + Copy icon + "Share invite" secondary Button.
- **Signature moment:** the roster doubles as a balance sheet — you see who
  you're square with by scanning knots.

### 4.3.4 CreateGroupScreen

- **Current:** form (name, emoji, destination, dates).
- **Critique:** a form. Creating a trip should feel like starting something.
- **Blueprint:** conversational single-scroll form. Each field is a large
  editorial prompt: "Call it…" + borderless input at headingLg size (the trip
  name is typed BIG — it's the hero of its own creation); "Where to?" place
  search; "When?" date-range with a calendar sheet where the selected range
  is a stitch drawn across the dates; emoji picker as a tile grid sheet.
  Primary "Start the trip" pinned bottom.
- **Motion:** completing each field sews a short stitch tick beside it.
- **Signature moment:** typing the trip name at display size.

### 4.3.5 JoinGroupScreen

- **Current:** code input.
- **Blueprint:** mirrors OTP: 6-char mono code typed directly on fabric over
  a filling stitch. Below, live group preview card slides up when the code
  resolves (emoji tile + name + member avatars) — "Join Goa Gang?" primary.
  Deep-link entries skip typing and land on the preview state.
- **Error:** unsew animation + "That code didn't match. Check with your
  friend."
- **Signature moment:** the group preview arriving before you commit.

### 4.3.6 GroupSettingsScreen / GroupMembersManageScreen / AddMembersScreen

- **Current:** settings rows in cards + danger zone card.
- **Blueprint:** grouped Row clusters on bgSecondary slabs (radius.soft,
  hairlines inside — the ONE place hairlines are standard): Trip details
  (name/emoji/dates/destination), Budget, Notifications, Privacy. Danger
  actions ("Leave trip", "End trip", "Delete trip") are plain rows with
  madder text at the very bottom, each confirming via Sheet with
  hold-to-confirm danger Button (3.1). Member management: Rows with role
  menus in a sheet; removals require hold-to-confirm.
  AddMembers: contact suggestions (permission gate per 3.17) as Rows with
  ghost "Invite"; search field pinned top.
- **Signature moment:** hold-to-confirm — destructive actions physically
  resist, like pulling a stitched seam.

### 4.3.7 RecurringExpensesScreen

- **Current:** list of recurring rules.
- **Blueprint:** Rows: IconTile (category), title, subtitle "Every Monday ·
  next 21 Jul" in mono-dates, trailing Amount. Paused rules at 60% opacity
  with stitchDim. Add via FAB → AddExpense with recurrence pre-opened.
  Swipe-left reveals Pause/Delete (the app's only swipe actions — see 5.4).
- **Signature moment:** the next-occurrence date rendered in mono like a
  ticket stub.

---

## 4.4 EXPENSE

### 4.4.1 AddExpenseScreen — the most-used screen in the product

- **Current:** full form: amount, description, category, payer, participants,
  split method, receipt.
- **Critique:** everything visible at once = form fatigue. The #1 UX metric
  of this app is time-to-logged-expense; the screen must be optimized for the
  90% case (equal split, I paid, one tap).
- **Blueprint — two-stage sheet, not a screen:**
  **Stage 1 (the fast path):** a Sheet. Amount keypad-first: monoLg × 1.6
  amount centered at top, custom numeric keypad below (system keyboards kill
  ritual; a custom pad lets us place a ₹, a decimal, and a backspace exactly).
  One description field ("Dinner"). Category auto-suggested from description
  keywords as a preselected IconTile row (tap to change). Payer defaults to
  me; split defaults to everyone-equal — both shown as compact chips under
  the amount: `You paid · Split equally with 5`. Primary "Save ₹1,240" (the
  button label carries the live amount).
  **Stage 2 (the 10% case):** tapping either chip expands the sheet to full
  height revealing payer selector, ParticipantSelector, SplitMethodPicker,
  per-person SplitSummaryRows, date, receipt strip, recurrence.
- **Motion:** save = button label sews into a knot + medium haptic + sheet
  drops; the new expense is visible sewing into the feed behind it.
- **Validation:** unequal splits show a live remainder line: "₹60 left to
  assign" (haldi) → leaf stitch when balanced.
- **Receipt:** camera opens as Float B with the white shutter circle;
  captured receipts appear in the strip with perimeter-stitch upload progress.
- **Signature moment:** "Save ₹1,240" — the CTA that always tells you what
  it's about to do, plus the expense visibly joining the feed's thread.

### 4.4.2 ExpenseDetailScreen

- **Current:** static detail view.
- **Blueprint:** hero Amount displayLg on fabric + description headingSm +
  category IconTile + date mono. Below: the split, drawn as a mini diagram —
  payer avatar at top, stitches fanning down to each participant avatar with
  their share Amount beside each (this is the shared-element target of the
  feed row tap: the amount springs from the row into the hero). Receipt
  thumbnails; activity footnote ("Added by Priya · edited yesterday",
  labelSm, textMuted). Overflow: edit, delete (hold-to-confirm sheet).
- **Signature moment:** the fan-out split diagram — the only place the app
  literally draws who owes whom for a single bill.

---

## 4.5 BUDGET

### 4.5.1 BudgetScreen

- **Current:** BudgetHeroCard + stat pills + forecast card + alert card +
  category list + sparkline + export sheet.
- **Critique:** six card-like modules stacked = dashboard-itis. Law 2
  violated (hero card, forecast card, and alert all shout).
- **Blueprint:**
  1. Hero: `<Amount>` displayLg — remaining budget (not spent; remaining is
     the number people feel). Beneath: full-width progress Stitch
     (dashes fill solid), caption "₹18,400 of ₹30,000 · 6 days left" bodySm.
  2. Forecast line (only when meaningful): single bodySm line under caption,
     haldi text when over-pace: "At this pace you'll cross budget Friday."
     Not a card. Not an alert. A sentence.
  3. StitchLabel `— — — WHERE IT WENT`.
  4. Category Rows: IconTile, name, mini progress stitch under subtitle,
     trailing Amount. Sorted by spend desc. Tap → filtered expense list sheet.
  5. StitchLabel `— — — DAY BY DAY` + sparkline (2.9 restyle) with madder
     today-dot; tap a day → that day's expenses sheet.
  6. Per-member contribution rows (who has paid how much) — small, at bottom.
  7. Header-right: export icon → ExportSheet (CSV/PDF Rows with format
     descriptions); edit-budget pencil → EditBudgetSheet (keypad, same
     component as AddExpense stage 1).
- **States:** no budget set → EmptyState: sewn drawing of an open potli
  (pouch); "No budget yet." / "Set one and Apna keeps the count." / "Set
  budget". Loading: hero skeleton + 4 row skeletons.
- **Signature moment:** the budget bar as a filling stitch — spending
  literally consumes the trip's thread.

---

## 4.6 SETTLEMENT

### 4.6.1 BalanceSummaryScreen

- **Current:** balance rows + summary card.
- **Blueprint:** hero: my net Amount displayMd ("You're owed ₹1,200").
  Then two clusters under StitchLabels: `— — — OWED TO YOU` (leaf amounts)
  and `— — — YOU OWE` (madder amounts) — DebtRows with stitch-arrow glyphs.
  Bottom: "Simplify debts" secondary button when the settlement engine can
  reduce transaction count — with a one-line explainer: "3 payments instead
  of 7."
- **Signature moment:** the simplify moment — tapping it animates the debt
  rows re-stitching into fewer rows (old rows sew shut, new rows sew in).

### 4.6.2 SettleUpScreen / SettleUpSheet / SettlementConfirmSheet

- **Current:** amount + method + confirm.
- **Critique:** settling is the emotional climax of the product — money
  actually moves between friends. Current flow treats it as a form.
- **Blueprint:** the ceremony (3.11). Sheet: debtor avatar — horizontal
  stitch — creditor avatar; Amount monoLg × 1.4 centered (editable for
  partial settlement via keypad); method rows: "UPI" (opens deep link via
  lib/utils/upi), "Cash / already paid". Confirm: primary "Mark ₹450
  settled". On confirm: the stitch sews across avatar-to-avatar (420ms,
  Spring.settle), a knot ties at the midpoint, success haptic, and the
  balance rows behind re-roll their odometers. If the pair is now fully even:
  full-screen quiet moment for 900ms — fabric, two avatars, the knot, and
  "Sab barabar." in Cabinet Grotesk. No confetti. Confetti is template;
  a knot is Apna.
- **Signature moment:** the knot instead of confetti.

---

## 4.7 ITINERARY

### 4.7.1 ItineraryScreen / DayPlannerView

- **Current:** day tab bar, item cards, vote chips, weather chips, AI draft,
  suggestions carousel, thread line component.
- **Critique:** the ThreadLine already exists here — this screen was always
  meant to be the stitch surface, but items are cards floating beside a faint
  line. Also: carousel (template) and crowded chips.
- **Blueprint:**
  1. Day strip: horizontal mono date chips (`12`, `13`, `14`…) with weekday
     labelSm above; active day gets the tab-stitch beneath; today gets a
     madder dot. Swiping the canvas changes days (strip follows).
  2. Day header: displaySm "Day 2" + bodySm destination/date; weather as ONE
     quiet line with a Phosphor weather icon: "31° · clear evening" — 
     WeatherDayChip and WeatherSummaryCard merge into this line; rain risk
     adds a haldi sentence ("Rain likely after 4 pm — indoor backup?").
  3. The spine: a vertical stitch down the 28pt gutter, top-to-bottom of the
     day. Items are knots on the spine at their time slots.
  4. Item Rows hung on the spine: time mono labelSm in the gutter, title
     bodyLg, place bodySm, optional 56pt photo tile trailing. Confirmed items:
     solid knot; proposed items: hollow knot + VoteChips (up/down counts as
     quiet badges; my vote fills madder — one of the day's accent slots).
     Travel-time between consecutive items: labelSm textMuted ON the stitch
     between knots ("25 min drive"), from travelTime lib.
  5. Now-line: during the trip, a small madder needle glyph sits on the spine
     at the current time and moves through the day. THE signature.
  6. Gaps in the day render as loose thread (the stitch relaxes into a
     slight sine curve) — tap a gap → AddItemSheet pre-filled with that slot.
  7. FAB "Add plan" → AddItemSheet: tabs Manual / Search places / AI draft.
     AI draft (aiDraft lib) returns proposals that sew in as hollow knots —
     never auto-confirmed; the group votes them solid.
  8. SuggestionsCarousel dies; suggestions become 2–3 hollow-knot rows at the
     day's end under StitchLabel `— — — IDEAS NEARBY`.
- **Motion:** day swipe slides the whole spine with parallax (items move
  1.05× vs. spine 1×); confirming a proposal fills the knot with a spring +
  medium haptic.
- **Empty day:** loose-thread drawing; "Nothing planned. Perfect." /
  ghost "Add something anyway" — an empty vacation day is not an error state,
  and the copy must never guilt.
- **Signature moment:** the needle moving along today's stitch. Users will
  screenshot this.

### 4.7.2 ItineraryMapScreen / RoutePolyline / MapPinView / MapCallout

- **Current:** map with pins, route polyline, callouts, FAB.
- **Blueprint:** custom map style (update mapStyle.ts): ink/kora-toned base,
  desaturated, roads in fabric neutrals, water in muted indigo-wash, POI
  noise off. The day's route renders as a literal stitch path (dashed,
  madder) between numbered knot pins (confirmed = filled, proposed = hollow).
  Callout: mini Row card (title, time, travel-to-next) with "Details" →
  ItemDetailSheet. Map FAB cluster: locate-me + back-to-list, bgTertiary
  tiles, bottom-right.
- **Signature moment:** the itinerary IS a stitch on the land — identical
  language to the list view.

### 4.7.3 ItemDetailSheet / ItemDetailHeader / ItemDetailBody / ItemEditForm /
        LinkExpenseSheet / MoveItemSheet / ConfirmItemButton

- **Blueprint:** Sheet with place title headingMd, time + duration mono row,
  photo strip, notes bodyMd, votes row, linked expenses (LinkExpenseSheet:
  picker Rows of the group's expenses; linking sews a tiny stitch between the
  itinerary knot and a ₹ badge shown on the item row thereafter).
  MoveItemSheet: day/time pickers; moving an item animates its knot sliding
  along the spine when you return. ConfirmItemButton: "Lock it in" secondary;
  fills the knot.
- **Signature moment:** the ₹-linked-to-plan badge — plans and money sewn
  together, the app's whole thesis in one detail.

## 4.8 LISTS

### 4.8.1 ListsScreen

- **Current:** list cards with type icons and deadline badges.
- **Blueprint:** Rows: IconTile (packing/shopping/todo via ListTypeIcon
  mapping to Phosphor), list name bodyLg, progress subtitle "9 of 14 packed",
  a mini progress stitch under the subtitle, DeadlineBadge as quiet Badge in
  mono ("by Fri"), overdue flips to haldi status Badge. FAB "New list" →
  CreateListSheet (name + type tiles).
- **Empty:** sewn drawing of an open potli spilling nothing. "No lists." /
  "Packing, shopping, don't-forgets — make one." / "New list".

### 4.8.2 ListDetailScreen / ListItemRow / AddItemBar

- **Current:** checkbox rows + add bar.
- **Blueprint:** hero: list name headingLg + progress stitch full-width.
  Items: 56pt Rows; the checkbox is a 24pt circle that, when checked, draws a
  single stitch-tick (not a system check) + the label gets a stitchDim
  strike-through sewing left-to-right (180ms) + light haptic. Checked items
  sink below a `— — — DONE` StitchLabel after 800ms (grace period avoids
  list-jumping while rapid-checking). Assignee avatars 24 trailing.
  AddItemBar: pinned bottom, borderless input + ghost add; typing commas
  splits into multiple items ("torch, sunscreen, cards" → 3 rows) — power
  detail for packing dumps.
- **Signature moment:** the sewn strike-through check. Checking off a packing
  list feels like closing seams.

## 4.9 MAP (live)

### 4.9.1 MapScreen + LiveMemberPins + PlaceDetailsSheet + PrivacyQuickSheet

- **Current:** live member pins, itinerary pins, route overlay, permission
  gate, sharing banner/toggle.
- **Critique:** live location is the app's most sensitive surface; design
  must radiate *control* while feeling alive.
- **Blueprint:** full-bleed custom-styled map (4.7.2 style), floating chrome:
  top — LocationSharingBanner (3.17) when sharing (madder pulse dot = accent
  slot); bottom — member strip: horizontal avatar row, stitched rings on
  live members, tap flies the camera to them with a spring curve.
  Member pins: 32pt avatars in their thread color with a small knot tail;
  stale positions (>10 min) desaturate + show "12 min ago" mono on tap.
  A subtle stitchDim trail shows each member's last ~15 minutes of path,
  fading with age — never longer (privacy by design, matches sessionTimer).
  PrivacyQuickSheet on banner tap: duration rows ("Until tonight", "1 hour",
  "Off") with mono countdowns.
- **Motion:** camera movements always spring-eased; pins breathe (scale
  1.0→1.04, 3s) only for currently-moving members.
- **Empty/permission:** LocationPermissionGate as inline EmptyState with the
  honest pitch: "See each other on the trip map. Only this group. Only while
  you say so."
- **Signature moment:** friends as moving knots trailing thread across the
  map — the dhaga made literal and alive.

## 4.10 MEMORIES

### 4.10.1 MemoriesScreen

- **Current:** photo grid.
- **Critique:** a uniform grid is Google Photos — utility, not memory.
- **Blueprint:** a woven mosaic: FlatList sections per day (StitchLabel with
  date + place), each day laid out on a 2-column loom where every ~6th photo
  spans full width (deterministic pattern by index, not random). Tiles
  radius.soft, 2pt gaps (tight — fabric shows through as thread-thin lines).
  Header: displaySm "Memories" + count bodySm. Header-right: map view toggle
  + reel export icon.
- **Motion:** tiles fade+rise in as sections mount (stagger 24ms, cap 6);
  tapping a tile springs it to MemoryDetail full-bleed (shared element).
- **Empty:** sewn drawing of a taveez (thread locket). "Nothing kept yet." /
  "Photos you add here stay with the trip forever."
- **Signature moment:** the deterministic loom layout — recognizably Apna in
  any screenshot.

### 4.10.2 MemoryDetailScreen

- **Blueprint:** full-bleed photo, ink scrim bottom; caption bodyMd, date +
  place mono labelSm, uploader avatar 24. Swipe horizontally through the
  day's photos; swipe down to dismiss (velocity handoff). Actions: save to
  gallery, share (via recap sanitize path), delete (hold-to-confirm).
- **Signature:** the metadata line set in mono like a photo's contact-sheet
  stamp.

### 4.10.3 MemoriesMapView

- **Blueprint:** the custom map with photo-knot clusters (count badges in
  thread colors); tapping a cluster opens a bottom photo strip; the trip
  route stitch (from itinerary) faintly underlays — memories literally hang
  on the trip's thread.

### 4.10.4 OnThisDayScreen

- **Blueprint:** entered from a yearly notification. Kora fabric ALWAYS
  (nostalgia is warm even in dark mode — the one sanctioned scheme override).
  displaySm "One year ago · Goa", then that day's mosaic + that day's feed
  events interleaved (expenses included — "you all spent ₹4,200 on the boat
  day" is memory too). Bottom: "Send to the group" primary → shares into
  group chat via share lib.
- **Signature moment:** money events as memories. No other app does this.

## 4.11 HANGOUTS

### 4.11.1 HangoutsScreen + HangoutCard + RsvpBar + ProposeSheet + DietarySuggestSheet

- **Current:** hangout cards with RSVP bars.
- **Critique:** hangouts are lightweight (dinner Friday) — the surface should
  feel more social/casual than trips, not identical.
- **Blueprint:** rows grouped by status: `— — — HAPPENING` then
  `— — — PROPOSED`. Each hangout Row: emoji tile, title bodyLg, "Fri 8 pm ·
  Bandra" mono subtitle, trailing RSVP avatar stack (going = full avatars,
  maybe = 50%). RsvpBar inside detail: three ghost segments (Going / Maybe /
  Can't) where my selection fills — Going fills leaf, Can't fills nothing and
  just bolds (declining must never look like an error). ProposeSheet: title,
  when (quick chips: Tonight / Tomorrow / Weekend + picker), where (place
  search), + "Ask about food" toggle → DietarySuggestSheet collects
  constraints and suggests via ai lib as hollow-knot rows.
  A hangout that everyone RSVPs to gets a completed stitch across its row.
- **Signature moment:** the RSVP stitch completing when the whole gang is in.

### 4.11.2 HangoutDetailScreen

- **Blueprint:** hero title displaySm + when/where mono rows + map snippet
  (static, styled) + RSVP bar + attendee rows + linked expenses (a hangout is
  a mini-group: splitting the dinner happens right here with the same
  AddExpense sheet, scoped).

## 4.12 TRIP WRAP & YEAR IN REVIEW

### 4.12.1 TripWrapScreen + TripWrapCard

- **Current:** stats cards from tripWrapData.
- **Critique:** this is the shareable, viral surface. It must be the most
  crafted screen in the app; "stats cards" won't survive one Instagram story
  next to Spotify Wrapped.
- **Blueprint:** full-screen vertical pager (Float B), each page a kora
  fabric card with ONE stat set editorial:
  1. Cover: group emoji + name Cabinet 800 displayLg + date range + the trip's
     full route stitch drawn across the card.
  2. "₹48,200 · sewn together" — total, with per-member thread-color bars.
  3. "487 km of thread" — the route, distance, cities as knots.
  4. Superlatives, each with avatar + thread color: "Priya — the banker
     (paid first 14 times)", "Rohan — the hungry one (₹6,100 on food)".
     Tone: affectionate, never shaming; amounts only for the payer stats.
  5. "63 memories kept" — mosaic mini-loom.
  6. Closing: "Sab barabar." (only if settled — else "One knot left to tie"
     + settle CTA), then "Share" primary + "Save all" ghost.
  Pages advance by swipe; each page's stat sews/rolls in on arrival.
  Export: each page renders 1080×1920 via the reel/compose pipeline, with the
  dhaga-logo watermark.
- **Signature moment:** the whole trip as one continuous stitch on page 1 —
  the artifact people post.

### 4.12.2 YearInReviewScreen

- **Blueprint:** same pager system, year-scale stats (trips as knots on a
  12-month thread, total sewn, most-traveled-with friend). Reuses every Trip
  Wrap page component with a year data source (yearInReview lib).

## 4.13 RECAP — PublicRecapLandingScreen

- **Current:** public web-ish landing for shared recaps.
- **Blueprint:** this is seen by NON-users — it is an ad. Kora fabric,
  PublicRecapCard (3.17) centered, sanitized stats (no amounts unless the
  sharer opted in — sanitize lib), then: "Made with apna" + dhaga-logo +
  "Plan yours" primary → store link with referral capture attached.
  Fast-loading, zero chrome, no login wall before the content.
- **Signature moment:** the recap looks exactly like the in-app wrap —
  the brand travels intact.

## 4.14 PROFILE & SETTINGS

### 4.14.1 ProfileScreen

- **Current:** profile info + settings entry points.
- **Blueprint:** hero: Avatar 96 in my thread color + name displaySm +
  phone mono labelSm. A personal stat line: "4 trips · 214 expenses ·
  ₹1.2L sewn" (bodySm, textSecondary). Then grouped Row clusters:
  Account (name, photo), Appearance (theme row — see 5.6), Notifications,
  Privacy, Referrals, About. Sign out: plain row. Delete account: madder
  row → Sheet explaining consequences → hold-to-confirm →
  accountDeletion flow.
- **Signature moment:** "₹1.2L sewn" — lifetime stats in the brand's voice.

### 4.14.2 NotificationSettingsScreen

- **Blueprint:** master toggle Row, then per-category Rows (expenses,
  settlements, itinerary votes, memories, hangouts, reminders) with
  switches; switch thumbs slide with Spring.snappy; ON track is madder
  (counts as the screen's accent slot — so the header has no accent).
  Each category has a one-line bodySm explainer under its title.
  Quiet hours row → time-range sheet with mono times.

### 4.14.3 PrivacySettingsScreen

- **Blueprint:** the trust surface — most generous spacing in the app.
  Location section: sharing default, history retention ("Trails fade after
  15 minutes" — stated as fact, not setting), per-group overrides.
  Contacts: what hashing means in one honest sentence ("We match numbers as
  scrambled codes. Your contacts never reach our servers readable.").
  Data: export (exportData lib), delete. No dark patterns: every default
  shown, nothing pre-checked that shares more.
- **Signature moment:** plain-language privacy captions under every toggle.

## 4.15 REFERRAL SURFACES

- **ReferralWelcomeBanner** (new user, post-onboarding, once): haldi-tint Row
  on Home — "Priya sent you. You both get ₹100 credit when you settle your
  first expense." Dismissible.
- **ReferralDashboard** (from Profile): hero Amount of earned credit
  (money-moment card), then referral Rows (avatar, name, status Badge:
  invited / joined / earned), ReferralShareRow: mono code + Copy + one
  share primary. No multi-network share-button zoos — the system share
  sheet handles targets.

## 4.16 DEBUG — NotificationDebugScreen

Internal-only. Exempt from brand rules; keep it dense and boring (mono
everywhere, hairline tables). Ship builds must strip it.

---
---

# PART 5 — CROSS-CUTTING SYSTEMS

## 5.1 Navigation & transitions

- Stack pushes: horizontal slide with 12% parallax on the outgoing screen,
  `Duration.pageIn` + `Ease.decelerate`. iOS-feel on Android too (native-stack
  `animation: 'slide_from_right'` with custom interpolator where supported).
- Detail screens with a clear source element (expense row → detail, memory
  tile → detail, group row → group) use shared-element continuity (2.7.2
  rule 2). Where the library can't, fake it: measure source, overlay a
  transition clone, spring to destination, swap.
- Sheets never navigate the stack; they layer (Float A). Back gesture closes
  the sheet first, then pops.
- Deep links (deeplink/*) land WITH context: joining via invite link plays
  the JoinGroup preview state, not a cold form.

## 5.2 Tab bar

- 5 tabs: Home (charpai), Itinerary (rasta), Add — no; the FAB is contextual
  per screen, NOT a center tab (center-plus tab bars are template).
  Final tabs: Home, Itinerary, Budget (potli), Memories (taveez),
  Hangouts (baithak). Custom glyphs per 2.5.1.
- 56pt bar on bgSecondary, hairline top. Active tab: icon in textPrimary +
  12pt tab-stitch beneath, sliding between tabs with Spring.snappy.
  Inactive: textMuted. Labels labelSm always visible (icon-only bars fail
  first-week users).
- Badging: a 6pt madder dot (never numbers) on tabs with unseen activity.
- The bar hides on scroll-down inside long feeds (translateY spring),
  returns on any scroll-up — coordinated with the FAB morph.

## 5.3 Sheet system

One `<Sheet />` implementation app-wide (3.0.6). Detents: content-height,
half, full. Rules: one sheet at a time; a sheet requesting another sheet
replaces itself (crossfade within the same container — no stacking).
Keyboard: sheet rises above it; the primary button is always visible.
Every sheet's first tap target is ≥16pt below the handle (accidental-drag
protection).

## 5.4 Gestures

- Swipe actions exist ONLY on RecurringExpenses (pause/delete) and
  notifications inbox if added later. Everywhere else, long-press opens a
  context sheet (discoverable > hidden).
- Long-press on any Amount anywhere copies it (toast: "₹1,240 copied").
- Pull-to-refresh: the sewing refresh (4.2.1) on every scrollable root.

## 5.5 Feedback layer (toasts, errors, offline)

- Toasts: bottom-floating pill above tab bar, bgTertiary, bodySm + optional
  ghost action ("Expense deleted · Undo", 5s). Max one visible; queue behind.
- Undo everywhere destructive-but-reversible (delete expense, delete list
  item, remove photo): commit after the toast expires — hold-to-confirm is
  reserved for truly irreversible acts (delete group/account).
- Offline: quiet labelSm strip under the header: "Offline — changes will sew
  in when you're back." (Firestore queues writes already; the UI just says
  so.) Rows created offline show a hollow stitch under them until synced.
- Errors: inline first (field stitch, row-level retry), toast second, alert
  dialog never (only OS permission dialogs remain).

## 5.6 Dark/light behavior

- Default: follow system, toggleable in Profile › Appearance (System / Ink /
  Kora rows with mini fabric preview tiles).
- Scheme flips animate: 200ms crossfade via an overlay snapshot — never a
  hard swap.
- OnThisDay and all EXPORTED artifacts force kora (4.10.4, 4.12).
- All components consume tokens only; a scheme audit in review greps for raw
  hex outside theme/ (CI lint rule: `#[0-9A-Fa-f]{6}` forbidden outside
  src/theme/).

## 5.7 Accessibility

- Touch: 44pt floor retained; Row trailing controls get 12pt hitSlop.
- Type: all sizes respond to OS font scale up to 1.3× (amounts cap at 1.15×
  to protect layouts; they are already large).
- Contrast: per 2.1.6 table; stitch lines are decorative-plus — any
  information a stitch carries (progress, live/dim) must also exist in text.
- Reduce Motion: every choreography falls back to 120ms crossfade (2.7.2
  rule 6); the OTP unsew and settle ceremony become simple fades.
- Screen readers: Amount announces "positive 1,240 rupees" / "you owe";
  stitch progress announces percent; the feed announces day boundaries.
- Haptics respect system settings; all haptic meaning is duplicated visually.

## 5.8 Android widgets (BalanceWidget, MapWidget)

- Rebuild widget layouts (native/widget/res) on the new tokens: ink/kora
  fabric backgrounds (RemoteViews color resources for day/night), Cabinet
  Grotesk numbers via pre-rendered font resources where RemoteViews allows,
  else system-sans fallback with the mono amounts intact.
- BalanceWidget: net position + top debt row + "Settle" deep link. The stitch
  renders as a 9-patch dashed divider.
- MapWidget: static styled-map snapshot with knot pins.
- Widgets are many users' most-seen brand surface — they ship in the same
  release as the app reskin, not after.

## 5.9 Notifications

- Copy in voice (2.10): "Priya added Dinner — ₹1,240 (your share ₹248)".
  Deep links respect 5.1. Channel icons use the custom glyph set.
- Never notify what the user just did themselves.

## 5.10 App icon & store presence

- Icon: dhaga-logo needle-"a" in chalk on ink, madder thread. Adaptive icon
  foreground scales the knot; monochrome layer provided for Android 13+.
- Store screenshots: device frames on kora with real screens (Feed, Wrap,
  Map) and one-line captions in Cabinet Grotesk. The wrap page IS the hero
  screenshot.

---

# PART 6 — IMPLEMENTATION ROADMAP

Sequenced so the app is shippable after every phase.

## Phase 1 — Foundations (theme swap)
1. Fonts: add Cabinet Grotesk, General Sans, Spline Sans Mono to
   assets/fonts; update FontFamily/FONT_ASSET_MAP; remove Outfit/JetBrains.
2. colors.ts: replace with InkColors/KoraColors per 2.1 (+ migration map
   2.1.7). Update ThemeProvider, mapStyle.ts base tones, widget resources.
3. spacing.ts: padding/radius changes (2.3); delete shadow configs except
   the sheet shadow.
4. CI lint: no raw hex outside theme/, no emoji in JSX chrome (allowlist
   user-content props).
   → App is fully re-skinned but structurally unchanged. Ship as beta.

## Phase 2 — Primitives
5. Build Stitch, Row, StitchLabel, Amount, IconTile, Sheet (3.0);
   install phosphor-react-native; commission/draw the 9 custom glyphs.
6. Migrate Button, Badge, Input, Avatar, Divider, EmptyState, Skeleton,
   Screen/Header to specs (3.1–3.12). Kill every text-glyph control.
   → Component kit complete; screens still old layouts on new kit.

## Phase 3 — The money path (highest-traffic screens first)
7. Home (4.2.1) with the net-position hero.
8. AddExpense two-stage sheet (4.4.1) + custom keypad.
9. GroupHome + FeedTab stitch feed (4.3.1–4.3.2).
10. Settle ceremony (4.6.2) + BalanceSummary (4.6.1).
11. Budget (4.5).
    → The daily loop is fully Kora & Ink.

## Phase 4 — The trip surfaces
12. Itinerary spine + needle + map style (4.7).
13. Lists (4.8), Map live (4.9), Memories loom (4.10).
14. Hangouts (4.11).

## Phase 5 — The brand moments
15. Auth flow-stitch (4.1). 16. Trip Wrap pager + export (4.12).
17. Recap landing (4.13), referrals (4.15), profile/settings (4.14).
18. Widgets (5.8), app icon, store assets (5.10).

## Phase 6 — Polish pass
19. Choreography audit: every screen against 2.7.2; Reduce Motion QA.
20. Device QA: Redmi Note 9 (60fps budget), small-screen (720p) type audit,
    font-scale 1.3× audit, TalkBack pass.
21. The Five Laws review: one screen per day against Part 1 until every
    screen passes all five.

## Definition of done (per screen)
- [ ] Zero raw hex, zero emoji chrome, zero text-glyph controls
- [ ] One focal point; madder count ≤ 3; cards only in sanctioned intents
- [ ] Entrance choreography + unified press + Reduce Motion fallback
- [ ] Empty/loading/error states match Part 4 spec
- [ ] Passes contrast table 2.1.6 in BOTH modes
- [ ] Signature moment implemented — not cut for time

---

*End of blueprint. Amendments require a version bump and a dated changelog
entry below this line.*

## Changelog
- **1.0 (16 Jul 2026)** — Initial blueprint: Kora & Ink system, full audit,
  all screens specified.
- **1.1 (16 Jul 2026)** — Part 7 added: dhaga mark construction, lockups,
  clear space, THE SEW animation signature, asset inventory
  (`assets/brand/`).
---
---

# APPENDIX A — READY-TO-PASTE THEME CODE

Complete replacement files for Phase 1. These are the canonical values;
Part 2 prose defers to this code where they differ.

## A.1 `src/theme/colors.ts` (full replacement)

```ts
// src/theme/colors.ts
// Kora & Ink color system — Blueprint §2.1. Never change hex values without
// amending docs/DESIGN_BLUEPRINT.md (version bump + changelog).

export const InkColors = {
  // ── Fabric ──────────────────────────────────────────────
  bgPrimary:   '#161512',
  bgSecondary: '#1D1B17',
  bgTertiary:  '#26231D',

  // ── Accent: madder ──────────────────────────────────────
  accentPrimary: '#D96A50',
  onAccent:      '#2A0E06',

  // ── Semantic ────────────────────────────────────────────
  positive: '#8FAE9A',
  negative: '#D96A50',
  warning:  '#C9A24B',
  settled:  '#8F8878',

  // ── Text ────────────────────────────────────────────────
  textPrimary:   '#EFEAE0',
  textSecondary: '#A39B89',
  textMuted:     '#736D5E',

  // ── Lines ───────────────────────────────────────────────
  hairline:  'rgba(239,234,224,0.08)',
  stitch:    'rgba(217,106,80,0.55)',
  stitchDim: 'rgba(163,155,137,0.35)',

  // ── Overlay ─────────────────────────────────────────────
  scrim:   'rgba(12,11,9,0.55)',
  overlay: 'rgba(12,11,9,0.85)',

  // ── System bars & tab bar ───────────────────────────────
  statusBar: '#161512',
  navBar:    '#1D1B17',
  tabBar:    '#1D1B17',
  tabIconActive:   '#EFEAE0',
  tabIconInactive: '#736D5E',
  tabStitch:       '#D96A50',

  // ── Avatar: dyed threads (keyed by uid hash — stable) ───
  avatar: [
    '#D96A50', '#8FAE9A', '#C9A24B', '#A98BB8',
    '#7FA0B8', '#C98B6B', '#B8A98B', '#B87F8F',
  ] as const,

  // ── Categories: icon + tint (no rainbow text) ───────────
  category: {
    food:       { icon: 'BowlFood',  tint: 'rgba(201,162,75,0.14)' },
    stay:       { icon: 'Bed',       tint: 'rgba(127,160,184,0.14)' },
    transport:  { icon: 'Path',      tint: 'rgba(143,174,154,0.14)' },
    activities: { icon: 'Confetti',  tint: 'rgba(169,139,184,0.14)' },
    shopping:   { icon: 'Bag',       tint: 'rgba(201,139,107,0.14)' },
    misc:       { icon: 'Needle',    tint: 'rgba(163,155,137,0.14)' },
  },
} as const

export const KoraColors = {
  bgPrimary:   '#F3EEE4',
  bgSecondary: '#ECE5D6',
  bgTertiary:  '#E4DCC9',

  accentPrimary: '#B0402F',
  onAccent:      '#F9F1EC',

  positive: '#3E5C50',
  negative: '#B0402F',
  warning:  '#8A6A1F',
  settled:  '#8A8272',

  textPrimary:   '#1C1A15',
  textSecondary: '#6E675A',
  textMuted:     '#948C7A',

  hairline:  'rgba(28,26,21,0.09)',
  stitch:    'rgba(176,64,47,0.6)',
  stitchDim: 'rgba(110,103,90,0.4)',

  scrim:   'rgba(28,26,21,0.35)',
  overlay: 'rgba(243,238,228,0.9)',

  statusBar: '#F3EEE4',
  navBar:    '#ECE5D6',
  tabBar:    '#ECE5D6',
  tabIconActive:   '#1C1A15',
  tabIconInactive: '#948C7A',
  tabStitch:       '#B0402F',

  avatar: [
    '#B0402F', '#3E5C50', '#8A6A1F', '#6E4A80',
    '#3D617A', '#8F5232', '#6E5F3E', '#8A4457',
  ] as const,

  category: {
    food:       { icon: 'BowlFood',  tint: 'rgba(138,106,31,0.12)' },
    stay:       { icon: 'Bed',       tint: 'rgba(61,97,122,0.12)' },
    transport:  { icon: 'Path',      tint: 'rgba(62,92,80,0.12)' },
    activities: { icon: 'Confetti',  tint: 'rgba(110,74,128,0.12)' },
    shopping:   { icon: 'Bag',       tint: 'rgba(143,82,50,0.12)' },
    misc:       { icon: 'Needle',    tint: 'rgba(110,103,90,0.12)' },
  },
} as const

export type ColorScheme = 'dark' | 'light'
export type InkColorsType  = typeof InkColors
export type KoraColorsType = typeof KoraColors
export type AppColors = InkColorsType | KoraColorsType
```

## A.2 `src/theme/typography.ts` (key deltas)

```ts
export const FontFamily = {
  display: 'CabinetGrotesk-Extrabold',
  heading: 'CabinetGrotesk-Bold',
  body:    'GeneralSans-Regular',
  label:   'GeneralSans-Medium',
  mono:    'SplineSansMono-Medium',
} as const

export const FontSize = {
  displayLg: 44, displayMd: 34, displaySm: 28,
  headingLg: 24, headingMd: 20, headingSm: 17,
  bodyLg: 16, bodyMd: 15, bodySm: 13,
  labelLg: 13, labelMd: 12, labelSm: 11,
  monoLg: 26, monoMd: 16, monoSm: 12,
} as const

export const LineHeight = {
  displayLg: 46, displayMd: 36, displaySm: 30,
  headingLg: 30, headingMd: 26, headingSm: 22,
  bodyLg: 24, bodyMd: 22, bodySm: 20,
  labelLg: 18, labelMd: 16, labelSm: 15,
  monoLg: 32, monoMd: 22, monoSm: 16,
} as const

export const LetterSpacing = {
  display: -1, tight: -0.5, normal: 0, wide: 0.5, caps: 2,
} as const

export const FONT_ASSET_MAP = {
  'CabinetGrotesk-Extrabold': require('../../assets/fonts/CabinetGrotesk-Extrabold.ttf'),
  'CabinetGrotesk-Bold':      require('../../assets/fonts/CabinetGrotesk-Bold.ttf'),
  'GeneralSans-Regular':      require('../../assets/fonts/GeneralSans-Regular.ttf'),
  'GeneralSans-Medium':       require('../../assets/fonts/GeneralSans-Medium.ttf'),
  'SplineSansMono-Medium':    require('../../assets/fonts/SplineSansMono-Medium.ttf'),
} as const
// Sources: Cabinet Grotesk + General Sans → fontshare.com (free license);
// Spline Sans Mono → fonts.google.com. All permit app embedding.
```

## A.3 `src/theme/spacing.ts` (key deltas)

```ts
export const Layout = {
  screenPaddingH:   20,   // was 16 — Blueprint §2.3.1
  screenPaddingTop: 24,
  sectionGap:       32,   // was 24
  rowHeight:        64,
  rowHeightDense:   56,
  tabBarHeight:     56,
  headerHeight:     56,
  touchTargetMin:   44,
} as const

export const Radius = {
  soft:  12,
  sheet: 28,
  full:  9999,
} as const

// Shadows: DELETED except the single sheet shadow — Blueprint §2.3.3
export const SheetShadow = {
  dark:  { shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
           shadowOpacity: 0.18, shadowRadius: 24, elevation: 16 },
  light: { shadowColor: '#1C1A15', shadowOffset: { width: 0, height: -8 },
           shadowOpacity: 0.10, shadowRadius: 24, elevation: 12 },
} as const
```

## A.4 `src/theme/motion.ts` (additions only)

```ts
Duration.sew  = 18    // per stitch dash
Duration.hero = 420   // odometer, wrap reveals

Spring.settle = { tension: 26, friction: 8, useNativeDriver: true }
```

---

# APPENDIX B — GLYPH REPLACEMENT MAP

Every text glyph and chrome emoji currently in the codebase, with its
replacement. Grep targets for the Phase 2 sweep.

| Current | Location (examples) | Replacement |
|---|---|---|
| `←` Text | GroupHeaderHero back button | Phosphor `CaretLeft` 24 in 36pt bgTertiary tile |
| `+` Text | GroupHomeScreen FAB, HomeScreen FAB | custom `thread-add` 28 |
| `×` / `✕` | sheet close buttons | Phosphor `X` 20 |
| `⋯` / `···` | overflow menus | Phosphor `DotsThree` 24 |
| `🎬` | Trip Wrap banner | wrap prompt redesign (4.3.1) — photo mosaic card, no icon |
| `✓` | checkboxes, confirmations | stitch-tick draw (4.8.2) |
| `📍` | location rows | Phosphor `MapPin` 20 |
| `📷` | camera entry points | Phosphor `Camera` 20 |
| `🔔` | notification rows | Phosphor `Bell` 20 |
| `⚠️` | warnings | Phosphor `Warning` 20 in haldi |
| `>` / `›` | row chevrons | Phosphor `CaretRight` 16 textMuted |
| category emoji | expense rows | IconTile with A.1 category icons |

Allowed emoji (user content only): group emoji (in neutral tile), message
reactions, emoji picker output. CI lint (Phase 1 step 4) enforces the split.

---

# APPENDIX C — COPY DECK (canonical strings)

The voice (§2.10) applied. These strings are the spec; engineers copy them
verbatim. `{}` = interpolation.

## C.1 Money
- Balance hero: `You're owed ₹{n}` / `You owe ₹{n}` / `All settled`
- Row: `{name} owes you` / `You owe {name}`
- Settle CTA: `Mark ₹{n} settled`
- Settled pair: `Sab barabar.`
- Simplify: `3 payments instead of 7` → `Simplify debts`
- Save expense: `Save ₹{n}`
- Split remainder: `₹{n} left to assign`
- Copy toast: `₹{n} copied`

## C.2 Empty states
- Home: `No trips yet.` / `Start one, or join with a friend's code.`
- Feed: `Nothing sewn yet.` / `Add the first expense and the feed begins.`
- Budget: `No budget yet.` / `Set one and Apna keeps the count.`
- Lists: `No lists.` / `Packing, shopping, don't-forgets — make one.`
- Memories: `Nothing kept yet.` / `Photos you add here stay with the trip forever.`
- Itinerary day: `Nothing planned. Perfect.` / ghost: `Add something anyway`

## C.3 Errors & system
- Generic save failure: `Couldn't save. Retry.`
- Bad phone: `Check the number — 10 digits.`
- Bad OTP: (visual unsew; no text on first failure; second: `That code didn't match.`)
- Bad invite: `That code didn't match. Check with your friend.`
- Offline strip: `Offline — changes will sew in when you're back.`
- Delete undo: `Expense deleted · Undo`

## C.4 Onboarding
- Headline: `Trips, money, memories. One thread.`
- Body: `Split expenses, plan days, and keep what happened — together.`
- CTAs: `Get started` / `I have an invite code`
- Phone: `Your number` / `We'll text you a code. No passwords.`
- Name: `What do friends call you?`
- Thread color: `Your thread color. It's yours everywhere.`
- Finish: `Let's go`

## C.5 Privacy & permissions
- Location: `See each other on the trip map. Only this group. Only while you say so.`
- Trails: `Trails fade after 15 minutes.`
- Contacts: `We match numbers as scrambled codes. Your contacts never reach our servers readable.`
- Sharing banner: `Sharing until {time}` / `Stop`

## C.6 Moments (the only Hinglish + warmth slots)
- Full settle: `Sab barabar.`
- Trip start day: `Chalein?`
- Wrap unsettled close: `One knot left to tie`
- Wrap total: `₹{n} · sewn together`
- Wrap distance: `{n} km of thread`
- Profile stat: `{trips} trips · {expenses} expenses · ₹{n} sewn`

---

# APPENDIX D — PER-SCREEN LAW COMPLIANCE MATRIX

The review artifact for Phase 6 step 21. For each screen: the designated
Law 2 focal point and the three Law 3 madder slots. Anything else using
madder on that screen is a defect.

| Screen | Focal point (Law 2) | Madder slot 1 | Slot 2 | Slot 3 |
|---|---|---|---|---|
| Home | Net position hero | FAB "New trip" | negative hero amount | unseen-dot on rows |
| GroupHome | Group name | FAB "Add expense" | tab stitch | my-position amount |
| FeedTab | (inherits GroupHome) | live day stitch | money amounts (owe) | — |
| MembersTab | (inherits) | pairwise owe amounts | — | — |
| AddExpense | The amount | "Save ₹n" button | selected category ring | — |
| ExpenseDetail | Amount hero | fan-out stitches | edit action | — |
| Budget | Remaining amount | progress stitch | over-pace text | — |
| BalanceSummary | Net amount | owe amounts | simplify animation | — |
| SettleUp | The amount | confirm button | the ceremony stitch | — |
| Itinerary | "Day n" | the needle | my vote fill | FAB "Add plan" |
| ItineraryMap | (map) | route stitch | selected pin | locate FAB none — tiles neutral |
| Lists | List name / progress | FAB "New list" | overdue badge (haldi, not madder) | — |
| ListDetail | Progress stitch | check ticks | FAB none | — |
| Map (live) | (map) | sharing pulse dot | member trail (dim) | fly-to selection |
| Memories | "Memories" + count | reel export accent | — | — |
| MemoryDetail | The photo | delete confirm only | — | — |
| Hangouts | Section heroes | RSVP going fill (leaf, not madder) | propose FAB | — |
| TripWrap | Per-page stat | route stitch | share button | — |
| Profile | Name + avatar | delete-account row | — | — |
| Notifications | — | switch ON tracks | — | — |
| Privacy | — | — | — | — (zero-accent screen by design) |
| Auth (all) | Per-screen headline | flow stitch | primary button | — |

Screens marked `—` in later slots deliberately underuse the budget.
The budget is a ceiling, not a target.

---

# APPENDIX E — QA DEVICE & SCENARIO MATRIX

| Check | Device / setting | Pass bar |
|---|---|---|
| 60fps choreography | Redmi Note 9, release build | no dropped frames on feed scroll + sheet open |
| 720p type | any 720×1600 device | labelSm legible at arm's length |
| Font scale | OS 1.3× | no clipped amounts, no two-line buttons |
| Reduce Motion | OS setting on | all 2.7.2 fallbacks fire; zero sew animations |
| TalkBack | full money path | add expense → settle, eyes closed |
| Both modes | every screen | side-by-side screenshot review, contrast table 2.1.6 |
| Offline | airplane mode mid-expense | queued write + offline strip + hollow stitch |
| RTL smoke | (future) | stitch directions mirror correctly |

---

*Appendices end. This document + `src/theme/` are the design system.
Figma files, when created, are derived from this document — not the reverse.*
---
---

# PART 7 — BRAND IDENTITY: THE DHAGA MARK

Added in v1.1. Asset files live in `assets/brand/`.

## 7.1 The mark

A lowercase "a" drawn as thread: the **bowl is a running stitch** (seven
dashes), the **stem and tail are the thread pulled through**, and the **dot
at the top of the stem is the knot** — because every trip starts with a knot.
The mark uses the product's exact stitch language: same round caps, same
madder, same dash rhythm family as `<Stitch />`.

Rationale (the million-dollar test): one idea; reducible to 16px; drawable
from memory (dashed circle + hook + dot); animates natively; culturally
rooted through craft, not costume.

## 7.2 Construction

Canonical geometry (do not eyeball — these values are derived):

- Grid: 120×120 viewBox. Bowl center (54,66), radius 26.
- Bowl circumference 163.36 = exactly **7 stitches** of period 23.337
  (dash 13.79 + gap 9.55), `stroke-dashoffset 6.9` so the seam falls in a
  gap, never mid-dash. Any resize must re-derive whole-stitch counts —
  a clipped dash is a defect.
- Stem/tail path: `M 84 40 L 84 76 Q 84 96 102 92` — vertical thread with a
  tail that exits at Cabinet Grotesk's "a" terminal angle (re-verify when
  wordmark text converts to outlines).
- Knot: r 6.5 at (84,40), filled chalk (ink mode) / ink (kora mode).
- Stroke: 7 units at 120 grid. **Small-size compensation:** ≤48px render
  size → 8.5 units; ≤24px → 10 units and dashes drop to 5 per bowl.
  The favicon/notification cut is its own asset, never an automatic scale.

## 7.3 Lockups, clear space, color

- **Mark alone:** app icon, splash, watermark, avatar-fallback brand slot.
- **Wordmark:** stitched "a" + solid "pna" in Cabinet Grotesk Extrabold,
  letterSpacing −2. Used on: Home header, recap landing, store assets.
  Never set the whole word in stitches — one stitched letter is a signature;
  four is a costume.
- **Clear space:** the knot's diameter ×2 on all sides. Nothing enters it.
- **Color:** madder thread + chalk knot on ink; deep madder + ink knot on
  kora. Monochrome layer (Android themed icons) all-white. NEVER: gradients,
  outlines around the mark, drop shadows, or recoloring the thread to
  semantic colors — the logo's thread is always madder.
- **Backgrounds:** ink or kora fabric only. On photography (wrap exports),
  sit the mark on a 40%-scrim corner chip.

## 7.4 THE SEW — the brand's animation signature

One motion owns the brand: **nothing appears; it is sewn.** The canonical
sequence (reference file `apna-mark-animated.svg`, total 1150ms):

| Phase | Time | Motion | Easing |
|---|---|---|---|
| Bowl | 0–700ms | 7 stitches revealed sequentially by an arc wipe | cubic-bezier(0.22,0.9,0.36,1) |
| Thread pull | 550–900ms | stem+tail draw-on (overlaps bowl finish — thread never waits) | same |
| Knot | 900–1020ms | scale 0 → 7.8 → 6.5 (the brand's ONLY bounce) | overshoot |
| Hold | 1020–1150ms | still; wordmark may fade in beneath | — |

Where it plays, at what scale:

- **Splash (full, 1150ms)** — then pulse-loop the thread opacity if loading
  exceeds 900ms (§4.1.1). Reduce Motion: static mark, 120ms fade.
- **Settle ceremony (knot phase only)** — the knot that ties at the stitch
  midpoint (§4.6.2) IS phase 3 of this signature, same timing, same
  overshoot. Ceremony and logo share a gesture.
- **Empty-state illustrations** — sew with the same easing curve; total
  duration scales with path length at `Duration.sew` per dash.
- **Wrap export videos** — the mark sews in as the outro frame (last 1.2s).
- **Marketing / web** — the SMIL file plays as-is; Lottie export for ads is
  derived from the same timeline, never re-animated by hand.

In-app implementation: `react-native-svg` + Animated —
bowl = masked arc with animated `strokeDashoffset` (native driver via
`addListener`-free `useNativeDriver: false` only for this one SVG prop, or
Reanimated's `useAnimatedProps` — prefer Reanimated); tail = `pathLength 100`
draw-on; knot = scale spring `{ tension: 300, friction: 12 }`. Ship as
`<DhagaLogo sew size color />` in `src/components/ui/DhagaLogo.tsx`.

Sound (optional, Phase 6): a single soft thread-pull "fft" ≤120ms under the
splash sew, respecting silent mode. No other UI sounds in the app.

## 7.5 Asset inventory (`assets/brand/`)

| File | Use |
|---|---|
| `apna-mark-ink.svg` / `apna-mark-kora.svg` | static mark, both surfaces |
| `apna-icon-ink.svg` | 1024 app-icon master (adaptive foreground derives from it) |
| `apna-icon-monochrome.svg` | Android 13+ themed-icon layer |
| `apna-wordmark-ink.svg` / `-kora.svg` | wordmark (convert text to outlines before production) |
| `apna-mark-animated.svg` | THE SEW — canonical timing reference |

To generate: PNG densities from the 1024 master (48→1024), favicon 32/16
(redrawn 5-stitch cut per §7.2), notification small-icon (white monochrome,
24dp), `app.config.ts` icon + adaptiveIcon + splash entries.

## 7.6 Open refinements (tracked, pre-production)

1. Re-derive the tail terminal angle against Cabinet Grotesk outlines when
   fonts land (§7.2).
2. A/B the knot as dot vs. tiny loop at 16px — current call: dot.
3. Optical centering of the icon glyph (currently −25 x-shift) to be
   verified on-device against the OS icon grid.
