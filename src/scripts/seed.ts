// src/scripts/seed.ts
// Seed script for Firebase Emulator Suite.
// Run: npx ts-node src/scripts/seed.ts
//
// Creates:
//   - 4 test users (Arjun, Riya, Pranav, Kavya)
//   - 2 groups (Goa Trip, Manali Weekend)
//   - 6 expenses across both groups
//   - 2 itinerary items
//   - 1 invite code
//
// Requires emulator to be running: firebase emulators:start

import admin from 'firebase-admin'

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'

admin.initializeApp({
  projectId: 'demo-apna',
})

const db = admin.firestore()
const auth = admin.auth()

// ── Test users ────────────────────────────────────────────────────
const USERS = [
  { uid: 'uid_arjun',  name: 'Arjun Sharma',  phone: '+919876543210', avatarColor: '#4ECDC4' },
  { uid: 'uid_riya',   name: 'Riya Patel',    phone: '+919876543211', avatarColor: '#FF6B6B' },
  { uid: 'uid_pranav', name: 'Pranav Mehta',  phone: '+919876543212', avatarColor: '#FFD166' },
  { uid: 'uid_kavya',  name: 'Kavya Nair',    phone: '+919876543213', avatarColor: '#A8E6CF' },
]

const GROUP_IDS = {
  goa:    'group_goa_2026',
  manali: 'group_manali_2026',
}

async function seed() {
  console.log('🌱 Seeding Firebase Emulator...\n')

  // ── Write Auth Users first ──────────────────────────────────
  console.log('Creating auth users...')
  for (const user of USERS) {
    try {
      // Try to create the user in Firebase Auth Emulator so they exist
      await auth.createUser({
        uid: user.uid,
        displayName: user.name,
        phoneNumber: user.phone,
      })
      console.log(`  ✅ Auth: ${user.name}`)
    } catch (err: any) {
      if (err.code === 'auth/uid-already-exists' || err.code === 'auth/phone-number-already-exists') {
        console.log(`  ℹ️ Auth: ${user.name} already exists`)
      } else {
        throw err;
      }
    }
  }

  // ── Write users ──────────────────────────────────────────────
  console.log('\nWriting Firestore users...')
  for (const user of USERS) {
    await db.doc(`users/${user.uid}`).set({
      phone:       user.phone,
      name:        user.name,
      avatarColor: user.avatarColor,
      createdAt:   admin.firestore.Timestamp.now(),
      groups:      Object.values(GROUP_IDS),
    })
    console.log(`  ✅ Firestore: ${user.name}`)
  }

  // ── Write groups ─────────────────────────────────────────────
  console.log('\nWriting groups...')

  await db.doc(`groups/${GROUP_IDS.goa}`).set({
    name:        'Goa Trip 2026',
    destination: 'Goa',
    coverEmoji:  '🏖️',
    startDate:   '2026-08-15',
    endDate:     '2026-08-20',
    memberIds:   USERS.map((u) => u.uid),
    adminIds:    ['uid_arjun'],
    createdBy:   'uid_arjun',
    createdAt:   admin.firestore.Timestamp.now(),
    inviteCode:  'GOA26A',
    status:      'active',
    currency:    'INR',
    totalBudget: 25000,
  })
  console.log('  ✅ Goa Trip 2026')

  await db.doc(`groups/${GROUP_IDS.manali}`).set({
    name:        'Manali Weekend',
    destination: 'Manali',
    coverEmoji:  '🏔️',
    startDate:   '2026-07-04',
    endDate:     '2026-07-06',
    memberIds:   ['uid_arjun', 'uid_pranav', 'uid_kavya'],
    adminIds:    ['uid_arjun'],
    createdBy:   'uid_arjun',
    createdAt:   admin.firestore.Timestamp.now(),
    inviteCode:  'MNL26B',
    status:      'active',
    currency:    'INR',
  })
  console.log('  ✅ Manali Weekend')

  // ── Write expenses ────────────────────────────────────────────
  console.log('\nWriting expenses...')

  const goaExpenses = [
    {
      description: 'Flight tickets (IndiGo)',
      amount:      14800,
      category:    'transport',
      paidBy:      'uid_arjun',
      splits:      { uid_arjun: 3700, uid_riya: 3700, uid_pranav: 3700, uid_kavya: 3700 },
      date:        '2026-08-15',
    },
    {
      description: 'Hotel Casa de Goa (3 nights)',
      amount:      9600,
      category:    'stay',
      paidBy:      'uid_riya',
      splits:      { uid_arjun: 2400, uid_riya: 2400, uid_pranav: 2400, uid_kavya: 2400 },
      date:        '2026-08-15',
    },
    {
      description: 'Beach shack dinner',
      amount:      2840,
      category:    'food',
      paidBy:      'uid_pranav',
      splits:      { uid_arjun: 710, uid_riya: 710, uid_pranav: 710, uid_kavya: 710 },
      date:        '2026-08-16',
    },
    {
      description: 'Water sports package',
      amount:      4400,
      category:    'activities',
      paidBy:      'uid_kavya',
      splits:      { uid_arjun: 1100, uid_riya: 1100, uid_pranav: 1100, uid_kavya: 1100 },
      date:        '2026-08-17',
    },
  ]

  for (const expense of goaExpenses) {
    await db.collection(`groups/${GROUP_IDS.goa}/expenses`).add({
      ...expense,
      splitType: 'equal',
      groupId:   GROUP_IDS.goa,
      currency:  'INR',
      createdBy: expense.paidBy,
      createdAt: admin.firestore.Timestamp.now(),
      isSettled: false,
    })
    console.log(`  ✅ ${expense.description} — ₹${expense.amount}`)
  }

  // ── Write invite codes ────────────────────────────────────────
  console.log('\nWriting invite codes...')

  await db.doc(`invites/GOA26A`).set({
    groupId:   GROUP_IDS.goa,
    createdBy: 'uid_arjun',
    createdAt: admin.firestore.Timestamp.now(),
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)),
    maxUses:   20,
    useCount:  3,
  })
  console.log('  ✅ Invite code GOA26A')

  // ── Write one itinerary item ──────────────────────────────────
  console.log('\nWriting itinerary...')

  await db.collection(`groups/${GROUP_IDS.goa}/itinerary`).add({
    groupId:   GROUP_IDS.goa,
    date:      '2026-08-16',
    startTime: '09:00',
    endTime:   '17:00',
    title:     'Baga Beach + Water Sports',
    type:      'activity',
    location:  { name: 'Baga Beach, Goa', lat: 15.5565, lng: 73.7516 },
    cost:      4400,
    currency:  'INR',
    order:     0,
    createdBy: 'uid_arjun',
    createdAt: admin.firestore.Timestamp.now(),
  })
  console.log('  ✅ Itinerary: Baga Beach')

  console.log('\n✅ Seed complete!')
  console.log('   Firestore UI: http://localhost:4000/firestore')
  console.log('   Auth UI:      http://localhost:4000/auth')

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
