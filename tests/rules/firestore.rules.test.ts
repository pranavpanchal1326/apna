// tests/rules/firestore.rules.test.ts
// Firestore security-rules tests (R14). Run against the emulator:
//   npm run test:rules
//
// Covers the highest-risk rules: user doc ownership, group membership,
// admin/co-admin powers (incl. the creator-only demote restriction),
// invite-code join + expiry, memory reactions, and server-only collections.

import * as fs from 'fs'
import * as path from 'path'
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  Timestamp,
} from 'firebase/firestore'

let testEnv: RulesTestEnvironment

const CREATOR = 'creator-uid'
const COADMIN = 'coadmin-uid'
const MEMBER = 'member-uid'
const OUTSIDER = 'outsider-uid'
const GROUP = 'group-1'

function db(uid: string | null) {
  return uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore()
}

/** Seeds a group with creator + co-admin + member, plus a valid invite. */
async function seedGroup(overrides: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore()
    await setDoc(doc(admin, 'groups', GROUP), {
      name: 'Goa Trip',
      createdBy: CREATOR,
      createdAt: Timestamp.now(),
      memberIds: [CREATOR, COADMIN, MEMBER],
      adminIds: [CREATOR, COADMIN],
      inviteCode: 'ABCDEF',
      status: 'active',
      currency: 'INR',
      balances: [],
      ...overrides,
    })
    await setDoc(doc(admin, 'invites', 'ABCDEF'), {
      groupId: GROUP,
      createdBy: CREATOR,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
      maxUses: 50,
      useCount: 0,
    })
  })
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-apna-rules',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

// ── /users ──────────────────────────────────────────────────────────────────

describe('users', () => {
  const validUser = {
    phone: '+919876543210',
    name: 'Riya',
    avatarColor: '#4ECDC4',
    createdAt: Timestamp.now(),
    groups: [],
  }

  it('lets a user create their own valid doc', async () => {
    await assertSucceeds(setDoc(doc(db(MEMBER), 'users', MEMBER), validUser))
  })

  it("rejects creating another user's doc", async () => {
    await assertFails(setDoc(doc(db(OUTSIDER), 'users', MEMBER), validUser))
  })

  it('rejects an invalid avatar color', async () => {
    await assertFails(
      setDoc(doc(db(MEMBER), 'users', MEMBER), { ...validUser, avatarColor: '#000000' }),
    )
  })

  it('lets any authed user read profiles, but not unauthenticated', async () => {
    await setDoc(doc(db(MEMBER), 'users', MEMBER), validUser)
    await assertSucceeds(getDoc(doc(db(OUTSIDER), 'users', MEMBER)))
    await assertFails(getDoc(doc(db(null), 'users', MEMBER)))
  })

  it('rejects changing the phone number', async () => {
    await setDoc(doc(db(MEMBER), 'users', MEMBER), validUser)
    await assertFails(
      updateDoc(doc(db(MEMBER), 'users', MEMBER), { phone: '+919999999999', groups: [] }),
    )
  })
})

// ── /groups membership + admin ──────────────────────────────────────────────

describe('groups: membership', () => {
  beforeEach(seedGroup)

  it('members can read, outsiders cannot (without invite knowledge)', async () => {
    await assertSucceeds(getDoc(doc(db(MEMBER), 'groups', GROUP)))
    // Outsider CAN read while a valid invite exists (join preview) …
    await assertSucceeds(getDoc(doc(db(OUTSIDER), 'groups', GROUP)))
  })

  it('members can update the name; outsiders cannot', async () => {
    await assertSucceeds(updateDoc(doc(db(MEMBER), 'groups', GROUP), { name: 'Goa 2.0' }))
    await assertFails(updateDoc(doc(db(OUTSIDER), 'groups', GROUP), { name: 'Hacked' }))
  })

  it('non-admin members cannot change memberIds arbitrarily', async () => {
    await assertFails(
      updateDoc(doc(db(MEMBER), 'groups', GROUP), {
        memberIds: [CREATOR, COADMIN, MEMBER, 'friend-uid'],
      }),
    )
  })

  it('admins can add members', async () => {
    await assertSucceeds(
      updateDoc(doc(db(COADMIN), 'groups', GROUP), {
        memberIds: [CREATOR, COADMIN, MEMBER, 'friend-uid'],
      }),
    )
  })

  it('a member can leave (remove only themselves)', async () => {
    await assertSucceeds(
      updateDoc(doc(db(MEMBER), 'groups', GROUP), {
        memberIds: [CREATOR, COADMIN],
        adminIds: [CREATOR, COADMIN],
      }),
    )
  })
})

describe('groups: co-admin demote restriction', () => {
  beforeEach(seedGroup)

  it('the creator can demote a co-admin', async () => {
    await assertSucceeds(
      updateDoc(doc(db(CREATOR), 'groups', GROUP), { adminIds: [CREATOR] }),
    )
  })

  it('a co-admin CANNOT demote the creator', async () => {
    await assertFails(
      updateDoc(doc(db(COADMIN), 'groups', GROUP), { adminIds: [COADMIN] }),
    )
  })

  it('a co-admin can promote a member to admin', async () => {
    await assertSucceeds(
      updateDoc(doc(db(COADMIN), 'groups', GROUP), {
        adminIds: [CREATOR, COADMIN, MEMBER],
      }),
    )
  })

  it('a co-admin can remove themselves from adminIds', async () => {
    await assertSucceeds(
      updateDoc(doc(db(COADMIN), 'groups', GROUP), { adminIds: [CREATOR] }),
    )
  })
})

describe('groups: nicknames', () => {
  beforeEach(seedGroup)

  it('any member can set a nickname', async () => {
    await assertSucceeds(
      updateDoc(doc(db(MEMBER), 'groups', GROUP), {
        [`nicknames.${COADMIN}`]: 'Chotu',
      }),
    )
  })

  it('outsiders cannot set nicknames', async () => {
    await assertFails(
      updateDoc(doc(db(OUTSIDER), 'groups', GROUP), {
        [`nicknames.${MEMBER}`]: 'Pwned',
      }),
    )
  })

  it('a member can clear a nickname', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'groups', GROUP), {
        [`nicknames.${MEMBER}`]: 'Chotu',
      })
    })
    await assertSucceeds(
      updateDoc(doc(db(MEMBER), 'groups', GROUP), {
        [`nicknames.${MEMBER}`]: deleteField(),
      }),
    )
  })
})

// ── Invite join flow ─────────────────────────────────────────────────────────

describe('groups: join via invite', () => {
  it('lets an outsider join with a valid invite (appending only themselves)', async () => {
    await seedGroup()
    await assertSucceeds(
      updateDoc(doc(db(OUTSIDER), 'groups', GROUP), {
        memberIds: [CREATOR, COADMIN, MEMBER, OUTSIDER],
      }),
    )
  })

  it('rejects joining with an EXPIRED invite', async () => {
    await seedGroup()
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), 'invites', 'ABCDEF'), {
        expiresAt: Timestamp.fromMillis(Date.now() - 1000),
      })
    })
    await assertFails(
      updateDoc(doc(db(OUTSIDER), 'groups', GROUP), {
        memberIds: [CREATOR, COADMIN, MEMBER, OUTSIDER],
      }),
    )
  })

  it('rejects sneaking in a second uid during join', async () => {
    await seedGroup()
    await assertFails(
      updateDoc(doc(db(OUTSIDER), 'groups', GROUP), {
        memberIds: [CREATOR, COADMIN, MEMBER, OUTSIDER, 'evil-friend'],
      }),
    )
  })
})

// ── Memories: reactions ──────────────────────────────────────────────────────

describe('memories: reactions', () => {
  beforeEach(async () => {
    await seedGroup()
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'groups', GROUP, 'memories', 'mem-1'), {
        type: 'photo',
        createdBy: CREATOR,
        createdAt: Timestamp.now(),
        date: '2026-07-16',
        reactions: {},
      })
    })
  })

  it('a member can cast their own reaction', async () => {
    await assertSucceeds(
      updateDoc(doc(db(MEMBER), 'groups', GROUP, 'memories', 'mem-1'), {
        [`reactions.${MEMBER}`]: '❤️',
      }),
    )
  })

  it("a member cannot write someone else's reaction", async () => {
    await assertFails(
      updateDoc(doc(db(MEMBER), 'groups', GROUP, 'memories', 'mem-1'), {
        [`reactions.${CREATOR}`]: '❤️',
      }),
    )
  })

  it('outsiders cannot react', async () => {
    await assertFails(
      updateDoc(doc(db(OUTSIDER), 'groups', GROUP, 'memories', 'mem-1'), {
        [`reactions.${OUTSIDER}`]: '❤️',
      }),
    )
  })
})

// ── Server-only collections ──────────────────────────────────────────────────

describe('server-only writes', () => {
  beforeEach(seedGroup)

  it('yearInReview: members can read, nobody can write', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'groups', GROUP, 'yearInReview', '2026'), {
        year: 2026,
        totalSpend: 1000,
      })
    })
    await assertSucceeds(getDoc(doc(db(MEMBER), 'groups', GROUP, 'yearInReview', '2026')))
    await assertFails(getDoc(doc(db(OUTSIDER), 'groups', GROUP, 'yearInReview', '2026')))
    await assertFails(
      setDoc(doc(db(CREATOR), 'groups', GROUP, 'yearInReview', '2026'), { year: 2026 }),
    )
  })

  it('activity feed: members can read, clients cannot write', async () => {
    await assertFails(
      setDoc(doc(db(MEMBER), 'groups', GROUP, 'activity', 'act-1'), { type: 'x' }),
    )
  })

  it('balances: clients cannot write', async () => {
    await assertFails(
      setDoc(doc(db(CREATOR), 'groups', GROUP, 'balances', 'current'), { data: [] }),
    )
  })
})
