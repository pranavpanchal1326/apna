<div align="center">

<br />

```
 ██████╗ ██████╗ ███╗   ██╗ █████╗
██╔══██╗██╔══██╗████╗  ██║██╔══██╗
███████║██████╔╝██╔██╗ ██║███████║
██╔══██║██╔═══╝ ██║╚██╗██║██╔══██║
██║  ██║██║     ██║ ╚████║██║  ██║
╚═╝  ╚═╝╚═╝     ╚═╝  ╚═══╝╚═╝  ╚═╝
```

**_yeh sirf ek app nahi hai. yeh apna hai._**

<br />

[![Platform](https://img.shields.io/badge/platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://play.google.com/store)
[![React Native](https://img.shields.io/badge/React_Native-Expo-0ea5e9?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/license-Proprietary-FF6B6B?style=for-the-badge)](LICENSE)

<br />

> **WhatsApp has the chat. Splitwise has the money. Google Photos has the memories.**
> **Nobody has stitched them together for a friend group. apna does.**

<br />

</div>

---

## What is apna?

**apna** is the group life app built from scratch for Indian Gen Z and millennials — the squad that goes on trips together, splits bills daily, shares moments, and asks "kahan hai tu?" more than any other question.

It is not a trip planner. It is not an expense tracker. It is not a photo album. It is all three, permanently connected, with live location on top, designed for the way Indian friend groups actually live — not the way Western product teams imagine they do.

The core insight: your squad already has WhatsApp, Splitwise, Google Maps, and a shared album. They switch between five apps on every trip. apna replaces all five with one that knows the context every other app ignores. The ₹840 dinner connects to the photo from that rooftop. The itinerary stop appears as a pin on the map. The settlement clears with one UPI tap.

**Five apps. Zero connection. Total context loss. That ends here.**

---

## Table of Contents

- [The Problem We Solve](#the-problem-we-solve)
- [Features](#features)
- [Design System — Dhaga](#design-system--dhaga)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Data Models](#data-models)
- [Security & Privacy](#security--privacy)
- [Getting Started](#getting-started)
- [Environment Setup](#environment-setup)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Firebase Setup](#firebase-setup)
- [Cloud Functions](#cloud-functions)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem We Solve

A typical Indian friend group on a trip uses:

| App | What they use it for | The pain |
|-----|---------------------|----------|
| WhatsApp | Everything — coordination, plans, "who paid for lunch?" | Context buried in thousands of messages |
| Splitwise | Expense tracking | Cold and transactional — no context, no memories |
| Google Maps | Navigation | No friend layer — "kahan hai tu?" still sent via WhatsApp |
| Google Photos | Shared album | Disconnected from everything else — who even has those photos? |
| Notes app | Itinerary | Private, not shared, never updated |

**Five apps. Zero connection. Total context loss.**

apna collapses all five into one — with every layer knowing about every other layer.

---

## Features

### 💰 Budget & Finance Engine

The smartest expense splitting engine built for Indian friend groups.

- **All split types** — Equal, Equal subset, Custom amounts, Percentage, By item (line-by-line restaurant bills)
- **Shortest-path settlement** — Minimises transactions mathematically. 4 people, N expenses → minimum transactions, guaranteed
- **Multi-currency** — INR default, supports USD, EUR, AED, THB (common Indian travel destinations). Exchange rate locked at entry time, never retroactively recalculated
- **Receipt photos** — Attach a photo of the bill to any expense. Compressed to ≤2MB, stored in Firebase Storage, accessible only to group members
- **UPI deep links** — Settle up opens GPay/PhonePe/Paytm with pre-filled amount. One tap to actually pay
- **Export** — PDF formatted expense report or CSV raw data. Category breakdown, per-person summary, settlement instructions
- **Recurring expenses** — Roommate mode. Monthly rent, Netflix split, gym membership auto-created on schedule
- **Real-time balance updates** — Every expense triggers a Cloud Function that recalculates all balances and pushes to every member instantly

```
Settlement Algorithm — Shortest Path:

4 members: Pranav +₹1,375 | Riya -₹125 | Arjun -₹3,125 | Sneha +₹1,875

Naive approach: 6 transactions
apna:           3 transactions

Arjun → Sneha:  ₹1,875
Arjun → Pranav: ₹1,250
Riya  → Pranav: ₹125

Every person pays exactly their fair share.
Nobody is penalised for who they paid.
```

---

### 📍 Live Location

Real-time friend location with privacy built in from day one.

- **Live map** — Custom Mapbox dark/light style. Friend pins with avatar initials and color. Solid ring = live (<30s), dimmed ring = recent (30s–5min), no ring = offline (>5min)
- **Background location** — Expo TaskManager keeps sharing even when app is backgrounded. Auto-expires after exactly 4 hours
- **Ghost mode** — See everyone else's location, hide your own. Background task keeps running (for SOS), pin just disappears
- **SOS** — Hold 2 seconds to activate. Triple haptic feedback. Instant push notification to every group member with a maps deeplink to your last known location. Bypasses all notification rules — always delivers immediately
- **Check-in** — Tap your location on the map, search via Mapbox Places, check in. Appears in activity feed and pins to the memories map view
- **Trip route overlay** — Every itinerary stop appears as a pin on the live map. Dashed polyline connects them in order. "On the way to [Next Stop]" card appears near departure time
- **Privacy first** — Location sharing is OFF by default. No location stored in Firestore — only in Firebase Realtime Database. Auto-deleted after 4 hours. No background tracking without explicit permission

---

### 📸 Memories

Not a photo dump. A contextual timeline that knows where you were, when, and what you spent.

- **Add from camera or gallery** — Native camera with live viewfinder, burst mode, flash toggle. Gallery multi-select up to 10 photos
- **Client-side compression** — Every photo compressed to ≤2MB before upload. Three-pass algorithm: 82% → 65% → 50% quality floor
- **Three views** — Timeline (grouped by day with day headers), Grid (3-column masonry), Map (photos pinned to GPS coordinates, clustered)
- **Full-screen viewer** — Swipe left/right within day, swipe up for reactions and "who was there", linked expense chip if a related expense exists
- **Reactions** — ❤️ 😂 🔥 😮 👏 — tap to react, tap again to remove
- **Offline queuing** — Photos captured offline queued in MMKV, shown in timeline immediately with "uploading" indicator, synced when connectivity returns
- **On This Day** — Push notification on trip anniversary: "1 year ago in Jaipur 🏰". Resurfaces the memory reel for that day

---

### 🗓 Trip Itinerary & Smart Day Planning

A real trip planner, not a notes app with dates.

- **Mapbox Places search** — Search any venue, auto-fills name, address, coordinates
- **Drag-to-reorder** — Reorder items within a day. Order synced to Firestore for all members instantly
- **Activity voting** — Any member proposes an activity. Vote ✅ Yes / 🤔 Maybe / ❌ No. Majority auto-confirms and adds to itinerary
- **Weather per day** — OpenWeatherMap 7-day forecast. Rain alert overlaid on outdoor activities
- **Buffer time warnings** — Mapbox Directions API checks travel time between consecutive stops. "⚠️ Only 20 min between Amber Fort and Jal Mahal — Mapbox says 35 min drive"
- **Bird's-eye map** — Full-screen Mapbox map showing all stops across the trip, connected by dashed polyline, filterable by day. Camera auto-fits to visible pins
- **Mark complete** — Completed items struck through, moved to bottom. Group sees progress in real time

---

### 🏁 Trip Wrap

Auto-generated at trip end. No effort required.

- **By the numbers** — Total group spend, days, members, memories added, places visited, distance traveled
- **Top memories** — Auto-selected 6 photos (most reacted + 1 per day minimum)
- **Expense breakdown** — Pie chart by category with Dhaga palette colors
- **Per-person summary** — Who paid most, who gets back most
- **Settlement instructions** — Final minimum transactions to close all debts
- **Memory reel** — Auto-generated 30–60 second MP4 slideshow. Exportable, shareable to Instagram Stories and WhatsApp Status
- **Shareable recap card** — Single image: trip name, dates, top 4 photos, spend total. "Made with apna" watermark. Screenshot-optimised

---

### 📋 Shared Lists & Hangout Planner

Daily utility beyond the trip.

- **Shared lists** — Packing, Grocery, Task. Anyone adds items, anyone claims them. Only claimer or admin can uncheck. Completed items collapse to bottom
- **Task assignments** — Assign any list item to a member with an optional deadline. Push reminder 1 day before. Completion visible in activity feed
- **Hangout planner** — "Anyone free Friday?" with proposed venue, time range, budget estimate. RSVP Yes/Maybe/No. Auto-confirm when quorum reached. Reminder 2 hours before

---

### 🔔 Activity Feed & Notifications

The pulse of the group. Every action, surfaced in real time.

| Action | Feed item |
|--------|-----------|
| Expense added | "Pranav added ₹840 for Dinner · Jaipur" |
| Memory posted | "Riya posted 4 photos · Amber Fort" |
| Member joined | "Arjun joined apna 👋" |
| Check-in | "Sneha checked in at Jal Mahal" |
| Settlement | "Arjun settled ₹3,125 with Pranav" |
| Itinerary added | "Pranav added Amber Fort to Day 1" |
| List item claimed | "Riya claimed: Book train tickets" |
| Hangout confirmed | "Friday dinner is confirmed — 6 going" |

**Notification rules that respect your sleep:**
- Max 3 per group per hour — excess is batched
- Silent hours 11pm–8am — configurable per user
- SOS bypasses every rule — always immediate, always delivers

---

### 📲 Home Screen Widgets (Android)

Glance at your home screen. Know your balance and who is live — without opening the app.

- **Balance widget** — Group name, your net balance in teal (owed) or red (owes), last updated time. Tap to open Budget
- **Map widget** — Group name, up to 3 live member chips with teal rings, "N live now". Tap to open Map
- Updates within 5 seconds of app foreground and on every background location write
- Built with Jetpack Compose Glance API — native Android, zero React inside

---

### 👥 Contact Sync

Find friends already on apna without giving away your contact list.

- Reads contacts with name + phone only — no email, no addresses, no photos
- SHA-256 hashes every phone number client-side — raw numbers never leave your device
- Only truncated 16-character hashes sent to the server for matching
- Results show masked numbers (+91XXXXX12345) — never full numbers
- Matched contacts appear as one-tap suggestions in the invite flow
- Cache valid for 5 minutes — clears on logout

---

### 📷 QR Invite System

Joining a group looks like scanning a festival pass.

- Full-bleed screen with group accent color
- Large, high-contrast QR code
- Group name in Outfit 700
- Member avatar stack below QR
- Invite code displayed: `APNA·26` format
- Copy link or Share natively
- Case-insensitive code entry
- 30-day expiry, regeneratable by admin

---

## Design System — Dhaga

*Dhaga* — Hindi for thread. The visual metaphor is a single thread connecting people, money, places, and moments.

### Color Palette

#### Dark Mode (Default)

| Token | Hex | Usage |
|-------|-----|-------|
| `bgPrimary` | `#080C14` | Main background — deep ocean |
| `bgSecondary` | `#0D1220` | Card backgrounds |
| `bgTertiary` | `#141A2C` | Elevated surfaces, inputs |
| `accentPrimary` | `#4ECDC4` | CTA, positive balances, active states |
| `accentDanger` | `#FF6B6B` | Debt, danger, SOS |
| `accentGold` | `#FFD166` | Highlights, warmth, memories |
| `textPrimary` | `#F0F4FF` | Primary text |
| `textSecondary` | `#8A94B0` | Labels, metadata |
| `textMuted` | `#4A5468` | Timestamps, hints |
| `border` | `rgba(255,255,255,0.06)` | Subtle card borders |

#### Light Mode

| Token | Hex | Usage |
|-------|-----|-------|
| `bgPrimary` | `#F8FAFF` | Main background |
| `bgSecondary` | `#FFFFFF` | Card backgrounds |
| `accentPrimary` | `#1A9E96` | CTA (darkened for contrast) |
| `accentDanger` | `#D94F4F` | Debt, danger |
| `textPrimary` | `#0A0E1A` | Primary text |

### Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display | Outfit | 700 | 32–48px |
| Heading | Outfit | 600 | 20–28px |
| Body | Outfit | 400 | 14–16px |
| Label | Outfit | 500 | 10–12px |
| **Mono** | **JetBrains Mono** | **500** | **13–16px** |

Every monetary amount, invite code, and timestamp uses JetBrains Mono. Numbers feel precise and financial, not decorative.

### Motion

```
Transitions:    200–280ms ease-out
Expense spring: cubic-bezier(0.34, 1.56, 0.64, 1)
Minimum:        12ms — nothing is instant
Haptics:        expense added · settle up · SOS · QR scan
```

### Map Style

Custom Mapbox dark style:

```
Roads:    #1A2236
Water:    #0D1824
Land:     #0F1520
Labels:   #4A5468 — Outfit 10px
Parks:    #141E14
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native (Expo)                         │
│              Android First · iOS Phase 6                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    Firebase Auth        Firestore DB        Realtime DB
    (Phone OTP)        (Primary data)    (Location — WebSocket)
    JWT · 1hr TTL      Offline-first      /groups/{id}/locations
    Token revocation   Security rules     Auto-deleted 4h
           │                   │                   │
           └───────────────────┼───────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
             Cloud         Firebase    Firebase
             Functions     Storage     Cloud
             (asia-south1) (Photos)    Messaging
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    Mapbox      OpenWeather   PostHog
    (Maps,      (Forecast)    (Analytics)
    Places,
    Directions)
```

### Real-Time Data Flow

```
User adds expense
       │
       ▼
Firestore write → expenses/{expenseId}
       │
       ▼
Cloud Function: onExpenseCreate
       ├── Recalculate all balances (shortest-path algorithm)
       ├── Write to balances/{groupId} (atomic batch)
       ├── Create activity feed item
       └── Send FCM push to all members (their individual share)
```

```
User shares location
       │
       ▼
expo-location watchPositionAsync / TaskManager (background)
       │ every 15 seconds
       ▼
Firebase Realtime DB write
path: /groups/{groupId}/locations/{userId}
{ lat, lng, accuracy, timestamp, sharing: true }
       │
       ▼
All group members via onValue() listener → re-render pins
       │
       ▼
Auto-deleted by cleanupExpiredLocations (every 5min scheduled function)
when timestamp > 4 hours old
```

### Offline Strategy

```
Firestore:  Offline persistence enabled — reads from cache, writes queued
Photos:     MMKV upload queue — shown immediately, synced on reconnect
Location:   Suspended when offline — resumes automatically on reconnect
Functions:  Idempotent — safe to retry on reconnect
```

---

## Tech Stack

### Core

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | React Native + Expo Managed | Fastest path to production-quality native Android |
| Language | TypeScript (strict mode) | Zero `any` — every type is explicit |
| State | Zustand | Lightweight, no boilerplate, MMKV persistence |
| Navigation | React Navigation v6 | Industry standard, deep link support |
| Local storage | **MMKV** | 10× faster than AsyncStorage for real-time data |

### Firebase (all asia-south1)

| Service | Usage |
|---------|-------|
| Firebase Auth | Phone OTP authentication. No passwords. No email. |
| Cloud Firestore | Primary database — groups, expenses, memories, itinerary |
| Firebase Realtime Database | Live location only — WebSocket, low latency, ephemeral |
| Firebase Storage | Photos, receipts, group covers — CDN-backed |
| Cloud Functions | Settlement engine, trip wrap, notifications, scheduled tasks |
| Firebase Cloud Messaging | Push notifications — all types including SOS |

### Maps & Location

| Service | Usage |
|---------|-------|
| Mapbox Maps SDK | Custom dark/light map style, friend pins, trip route |
| Mapbox Places API | Venue search for itinerary and check-in |
| Mapbox Directions API | Travel time for buffer warnings, ETA |
| expo-location | Foreground + background location (Expo TaskManager) |

### Native Modules

| Module | Usage |
|--------|-------|
| expo-camera | Native camera with live viewfinder, burst mode |
| expo-haptics | Physical feedback on 4 PRD-mandated triggers |
| expo-task-manager | Background location task with 4-hour auto-expire |
| expo-contacts | Contact sync for member suggestions |
| expo-crypto | SHA-256 hashing for contact matching |
| Jetpack Compose Glance | Android home screen widgets (native Kotlin) |

### Observability

| Tool | Usage |
|------|-------|
| Sentry | Real-time error tracking, background task breadcrumbs, crash reports |
| PostHog | Product analytics, session recording, funnel analysis |

---

## Data Models

```typescript
interface User {
  uid: string
  phone: string           // +91XXXXXXXXXX (E.164)
  phoneHash: string       // truncated SHA-256 for contact matching
  name: string
  avatarColor: string     // hex from Dhaga 8-color palette
  createdAt: Timestamp
  groups: string[]        // group IDs
}

interface Group {
  id: string
  name: string
  coverPhotoUrl?: string
  members: {
    [userId: string]: {
      role: 'admin' | 'co-admin' | 'member'
      joinedAt: Timestamp
    }
  }
  inviteCode: string      // 6-char alphanumeric
  inviteCodeExpiry: Timestamp
  tripMode: {
    active: boolean
    startDate?: string    // YYYY-MM-DD
    endDate?: string
    destination?: string
  }
  baseCurrency: string    // 'INR'
  createdAt: Timestamp
  createdBy: string
}

interface Expense {
  id: string
  groupId: string
  description: string
  amount: number
  currency: string
  exchangeRateToBase: number    // locked at entry — never recalculated
  category: 'food' | 'stay' | 'transport' | 'activities' | 'shopping' | 'misc'
  paidBy: string
  splitType: 'equal' | 'equal_subset' | 'custom' | 'percentage' | 'by_item'
  splits: { [userId: string]: number }
  receiptUrl?: string
  date: string            // YYYY-MM-DD
  createdAt: Timestamp
  createdBy: string
}

interface GroupBalances {
  groupId: string
  lastCalculated: Timestamp
  netBalances: { [userId: string]: number }   // positive = owed, negative = owes
  settlements: Array<{
    from: string          // userId who owes
    to: string            // userId who is owed
    amount: number
  }>
}

interface Memory {
  id: string
  groupId: string
  photos: Array<{
    url: string
    thumbnail: string
    width: number
    height: number
  }>
  caption?: string        // max 200 chars
  location?: { lat: number; lng: number; placeName: string }
  tripDay?: number        // 1-indexed
  reactions: { [userId: string]: string }
  addedBy: string
  createdAt: Timestamp
}

interface ItineraryItem {
  id: string
  groupId: string
  day: number             // 1-indexed
  date: string            // YYYY-MM-DD
  title: string
  placeName?: string
  location?: { lat: number; lng: number; placeId: string }
  startTime: string       // HH:MM
  durationMinutes: number
  category: 'food' | 'stay' | 'activity' | 'transport' | 'other'
  votes: { [userId: string]: 'yes' | 'maybe' | 'no' }
  completed: boolean
  order: number
}

// Realtime DB only — ephemeral, auto-deleted at 4h
// Path: /groups/{groupId}/locations/{userId}
interface LocationUpdate {
  lat: number
  lng: number
  accuracy: number
  timestamp: number       // Unix ms
  sharing: boolean
}
```

---

## Security & Privacy

### Authentication

- Phone OTP only — no passwords to steal, no email to phish
- Firebase Auth JWT tokens — 1-hour expiry with silent refresh
- Token revocation on logout across all devices simultaneously
- No session persisted beyond explicit login

### Firestore Security Rules

```javascript
// Core principle: no user can read data from groups they are not in
// Activity feed and balances: write-blocked client-side — Cloud Functions only

match /groups/{groupId}/activity/{activityId} {
  allow read: if isGroupMember(groupId);
  allow write: if false;   // server-side only
}

match /groups/{groupId}/balances/{doc} {
  allow read: if isGroupMember(groupId);
  allow write: if false;   // server-side only
}
```

### Location Privacy

- **OFF by default** — users explicitly opt in to every share session
- **No Firestore storage** — location exists only in Realtime DB (ephemeral)
- **Auto-deleted** after 4 hours by scheduled Cloud Function
- **Ghost mode** — see others, hide yourself; background task continues for SOS
- **SOS one-time share** — sends location even when sharing is off; never stored

### Contact Matching

- Phone numbers hashed client-side with SHA-256 before any network call
- Only truncated 16-character hashes sent to Cloud Function
- Raw phone numbers never transmitted to any server
- Results return only masked numbers: `+91XXXXX12345`

### Photo Storage

- Firebase Storage with member-only security rules
- No public read access on any path
- Signed URLs with 24-hour expiry for external sharing
- Client-side compression before upload (≤2MB enforced)

### Data Deletion

Account deletion triggers a Cloud Function that:
- Removes user from all group members maps
- Keeps expense records (balance integrity) but marks as "Deleted User"
- Deletes all uploaded photos from Firebase Storage
- Deletes user profile document
- Revokes FCM tokens on all devices
- Clears all MMKV on device

---

## Getting Started

### Prerequisites

```
Node.js          >= 18.0.0
npm              >= 9.0.0
Expo CLI         >= 6.0.0
Android Studio   (for emulator) or physical Android device
Java JDK         >= 17 (for Gradle build)
```

### Clone and Install

```bash
git clone https://github.com/your-org/apna.git
cd apna
npm install
```

---

## Environment Setup

Create a `.env` file in the project root. **Never commit this file.**

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.asia-southeast1.firebasedatabase.app

# Mapbox
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token

# OpenWeatherMap
EXPO_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key

# PostHog Analytics
EXPO_PUBLIC_POSTHOG_KEY=phc_your_posthog_key
EXPO_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# Sentry
EXPO_PUBLIC_SENTRY_DSN=https://your_key@sentry.io/your_project

# Environment
EXPO_PUBLIC_ENV=development
```

> **Android emulator note:** Firebase emulators are accessible at `10.0.2.2`, not `localhost`. The app handles this automatically in development mode.

### Firebase Emulators (Development)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Start all emulators
firebase emulators:start

# Emulator ports:
# Auth:      localhost:9099
# Firestore: localhost:8080
# Storage:   localhost:9199
# Functions: localhost:5001
# RTDB:      localhost:9000
```

---

## Running the App

### Development Build (Recommended)

```bash
# First time — builds native code (~10 minutes)
npx expo run:android

# Subsequent runs — hot reload only (seconds)
npx expo start --android
```

### On Physical Device

```bash
# Enable USB debugging on your Android phone:
# Settings → About Phone → tap Build Number 7 times
# Settings → Developer Options → USB Debugging ON

# Connect via USB, then:
npx expo run:android
```

### TypeScript Check

```bash
npx tsc --noEmit
```

**Target: zero errors.** The codebase runs TypeScript strict mode with zero `any` permitted.

---

## Project Structure

```
apna/
├── src/
│   ├── components/              # Shared UI components
│   │   ├── budget/              # Expense, settlement, balance components
│   │   ├── camera/              # NativeCameraSheet, MediaPicker, PhotoThumbnailStrip
│   │   ├── location/            # LocationSharingToggle, SOS, Banner
│   │   ├── members/             # ContactSuggestions, MemberRow, AvatarStack
│   │   └── ui/                  # Button, Input, BottomSheet, Avatar, Card, FAB
│   │
│   ├── screens/                 # Screen components
│   │   ├── auth/                # Splash, PhoneEntry, OTP, NameAvatar
│   │   ├── budget/              # Budget, AddExpense, SettleUp, Export
│   │   ├── groups/              # GroupHome, QR, Settings, AddMembers
│   │   ├── itinerary/           # ItineraryScreen, Map, ItemDetail, AddItem
│   │   ├── map/                 # MapScreen, CheckIn
│   │   ├── memories/            # Timeline, Grid, MapView, FullScreen, AddMemory
│   │   └── profile/             # Profile, NotificationSettings, ThemeSettings
│   │
│   ├── navigation/              # React Navigation setup
│   │   ├── RootNavigator.tsx    # Auth gate + main navigator
│   │   ├── MainNavigator.tsx    # Bottom tab navigator
│   │   └── deeplink/            # Deep link resolver and handler
│   │
│   ├── lib/
│   │   ├── firebase/            # Firebase SDK wrappers (v10 modular only)
│   │   │   ├── config.ts        # Firebase initialization
│   │   │   ├── auth.ts          # Auth helpers
│   │   │   ├── firestore.ts     # Typed collection refs
│   │   │   ├── storage.ts       # Upload pipeline + signed URLs
│   │   │   └── location.ts      # RTDB location write/read
│   │   ├── budget/              # Settlement engine, calculators, currency
│   │   ├── camera/              # Compression, permissions, upload queue
│   │   ├── contacts/            # Reader, hasher, matcher, cache
│   │   ├── haptics/             # Engine + named patterns
│   │   ├── location/            # Background task, permissions, session timer
│   │   ├── navigation/          # Deep link builder
│   │   ├── notifications/       # Rules, batching, FCM token management
│   │   └── widget/              # Data writer, refresh trigger, types
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useBackgroundLocation.ts
│   │   ├── useBudgetForecast.ts
│   │   ├── useCameraPermissions.ts
│   │   ├── useContactSuggestions.ts
│   │   ├── usePhotoUpload.ts
│   │   ├── useWidgetSync.ts
│   │   └── ...
│   │
│   ├── store/                   # Zustand stores (MMKV-persisted)
│   │   ├── authStore.ts
│   │   ├── groupStore.ts
│   │   ├── balanceStore.ts
│   │   ├── locationStore.ts
│   │   └── ...
│   │
│   ├── tasks/
│   │   └── backgroundLocation.task.ts   # Expo TaskManager — must be root import
│   │
│   ├── theme/                   # Dhaga design system
│   │   ├── colors.ts            # Full token set dark + light
│   │   ├── typography.ts        # Outfit + JetBrains Mono scale
│   │   ├── spacing.ts           # Space and radius tokens
│   │   └── motion.ts            # Animation constants
│   │
│   └── tests/                   # Unit + integration tests
│       ├── settlement.test.ts
│       ├── phoneNormaliser.test.ts
│       ├── budgetCalculator.test.ts
│       ├── hapticEngine.test.ts
│       ├── widgetDataBuilder.test.ts
│       ├── compressionPipeline.test.ts
│       ├── contactHasher.test.ts
│       ├── sessionTimer.test.ts
│       ├── notificationRules.test.ts
│       ├── deepLinking.test.ts
│       ├── multiCurrency.test.ts
│       └── groupLimits.test.ts
│
├── functions/                   # Firebase Cloud Functions
│   └── src/
│       ├── triggers/            # Firestore + RTDB event triggers
│       │   ├── onExpenseCreate.ts
│       │   ├── onExpenseDelete.ts
│       │   ├── onMemberJoin.ts
│       │   └── onGroupBudgetUpdated.ts
│       ├── callable/            # HTTPS callable functions
│       │   ├── onSOSTriggered.ts
│       │   ├── generateTripWrap.ts
│       │   └── matchContactsByHash.ts
│       └── scheduled/           # Cron-style functions
│           ├── cleanupExpiredLocations.ts    # every 5 minutes
│           ├── sendItineraryReminders.ts     # every hour
│           └── sendOnThisDay.ts              # daily 8am IST
│
├── plugins/
│   └── withApnaWidgets.ts       # Expo config plugin — Android Glance widgets
│
├── android/                     # Generated by expo prebuild
│   └── app/src/main/java/com/apna/widget/
│       ├── BalanceWidget.kt
│       ├── MapWidget.kt
│       └── WidgetDataReader.kt
│
├── app.config.ts                # Expo config with all plugins
├── firestore.rules              # Firestore security rules
├── storage.rules                # Firebase Storage security rules
├── database.rules.json          # Realtime DB security rules
├── firestore.indexes.json       # Composite index definitions
└── firebase.json                # Firebase project config
```

---

## Firebase Setup

### 1. Create Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create new project — name it `apna-prod`
3. **Set region: `asia-south1` (Mumbai)** — every service, never us-central1

### 2. Enable Services

```
Authentication → Sign-in method → Phone
Firestore Database → Create database → Production mode → asia-south1
Realtime Database → Create database → asia-south1
Storage → Get started → asia-south1
Functions → Get started → Node.js 20
```

### 3. Deploy Security Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only database
```

### 4. Deploy Functions

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### 5. Required Indexes

```bash
firebase deploy --only firestore:indexes
```

Key indexes in `firestore.indexes.json`:
- `users` → `phoneHash` (single field — contact matching)
- `groups/{id}/expenses` → `date DESC, createdAt DESC`
- `groups/{id}/memories` → `tripDay ASC, createdAt DESC`
- `groups/{id}/itinerary` → `day ASC, order ASC`

---

## Cloud Functions

All functions deployed to **asia-south1**. All authenticated. All typed.

| Function | Trigger | What it does |
|----------|---------|--------------|
| `onExpenseCreate` | Firestore onCreate | Recalculates all balances, creates activity item, sends FCM push |
| `onExpenseDelete` | Firestore onDelete | Recalculates balances, creates activity item |
| `onExpenseUpdate` | Firestore onUpdate | Recalculates if amount changed |
| `onMemberJoin` | Firestore onUpdate | Welcome activity item, push to all existing members |
| `onMemberLeave` | Firestore onUpdate | Activity item, balance adjustment |
| `onSOSTriggered` | HTTPS callable | High-priority push to all members with maps deeplink |
| `generateTripWrap` | HTTPS callable | Aggregates trip stats, selects top memories, generates recap |
| `matchContactsByHash` | HTTPS callable | Receives hashes, returns matched user profiles (masked) |
| `cleanupExpiredLocations` | Scheduled (5 min) | Removes RTDB location data older than 4 hours |
| `sendItineraryReminders` | Scheduled (hourly) | Checks upcoming items, sends "1 hour away" reminders |
| `sendOnThisDay` | Scheduled (8am IST) | Trip anniversary notifications |

---

## Testing

```bash
# Run all tests
npx jest

# Run with coverage
npx jest --coverage

# Run specific test file
npx jest src/tests/settlement.test.ts

# Type check
npx tsc --noEmit

# Lint
npx eslint src/ functions/src/ --ext .ts,.tsx
```

### Test Coverage Targets

| Module | Target |
|--------|--------|
| Settlement engine | 100% |
| Budget calculators | 95% |
| Phone normaliser | 100% |
| Contact hasher | 100% |
| Session timer | 100% |
| Widget data builder | 90% |
| Notification rules | 90% |
| Deep link parser | 90% |

---

## Build & Deployment

### Development Build

```bash
npx expo run:android
```

### Production Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure (first time)
eas build:configure

# Build for Play Store (AAB)
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

### EAS Build Profiles (`eas.json`)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### OTA Updates

```bash
# Push JavaScript update without full build
eas update --branch production --message "Fix: settlement rounding"
```

---

## Roadmap

```
Phase 0 — Foundation        ✅ Complete
Phase 1 — Core MVP          ✅ Complete
Phase 2 — Itinerary         ✅ Complete
Phase 3 — Full Feature Set  ✅ Complete
Phase 4 — Growth & Polish   ✅ Complete
Phase 5 — Native Android    ✅ Complete

Phase 6 — iOS & Scale       🔄 Next
  6.1 — iOS build config + safe area + platform fixes
  6.2 — App Store submission
  6.3 — Backend scaling audit
  6.4 — Recurring expenses (roommate mode)
  6.5 — Freemium gate (₹99/month Pro tier)

Phase 7 — AI Expansion      📋 Planned
  7.1 — Smart expense categorisation
  7.2 — Best split suggestions
  7.3 — Restaurant suggestions by group dietary preferences
  7.4 — Auto-generate itinerary from destination + duration
  7.5 — Discover mode + travel buddy matching
```

### North Star Metric

**Weekly Active Groups** — groups that had at least one expense, memory, or location share in the last 7 days. This is the only metric that tells us if apna is actually part of people's lives.

### Phase 5 KPIs (Current Target)

| Metric | Target |
|--------|--------|
| Total active groups | 500+ |
| Total active users | 2,000+ |
| Play Store rating | > 4.3 |
| Organic installs (word of mouth) | > 60% |

---

## Monetization

### v1 — Free, no monetization

Build the user base first. Every monetization decision made before product-market fit kills growth.

### v2 — Freemium (Phase 6+)

**Free tier (always free, forever):**
- 1 active group
- Unlimited expenses, memories, location
- Basic trip wrap

**apna Pro — ₹99/month or ₹799/year:**
- Unlimited groups
- Receipt photo attachments
- Trip Wrap memory reel (MP4 export)
- PDF/CSV export
- Priority support
- Custom group themes
- Multi-currency

> ₹99/month is the price of one chai per day. Not a budget decision for the target audience.

### What we will never do

- Sell user data
- Serve banner ads
- Inject sponsored content into the activity feed
- Charge per expense or memory

---

## Contributing

apna is a private product under active development. If you have been given access to this repository:

### Code Standards

```bash
# Before every commit:
npx tsc --noEmit          # must be zero errors
npx eslint src/ --fix     # must be zero warnings
npx jest                  # must be zero failures
```

### Non-negotiables

- **MMKV only** — AsyncStorage is permanently banned
- **Firebase JS SDK v10 modular** — compat SDK is permanently banned
- **asia-south1** for all Firebase — never us-central1
- **TypeScript strict** — zero `any` permitted anywhere
- **`[lng, lat]` for Mapbox** — never `[lat, lng]` — this is the most common bug

### Commit Format

```
feat: add buffer time warnings to itinerary
fix: settlement rounding for ₹1 split among 3 people
chore: update expo-camera to use CameraView API
test: add phone normaliser edge cases
```

---

## License

**Proprietary — All Rights Reserved**

Copyright © 2026 apna. Built in India, for India.

This software and its source code are the exclusive property of the apna team. Unauthorised copying, distribution, or use of this software, in whole or in part, is strictly prohibited.

---

<div align="center">

<br />

**apna** — *yeh sirf ek app nahi hai. yeh apna hai.*

<br />

Built with ❤️ in Pune, India

<br />

[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![Mapbox](https://img.shields.io/badge/Mapbox-000000?style=flat-square&logo=mapbox&logoColor=white)](https://mapbox.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)

<br />

</div>
