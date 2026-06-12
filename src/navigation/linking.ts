// src/navigation/linking.ts
// Deep link config — apna:// URL scheme + https://apna.app universal links.
// All link types supported:
//   apna://join?code=GOA26A          → JoinGroup (invite)
//   apna://group/:groupId            → GroupHome
//   apna://group/:groupId/expense/:id → ExpenseDetail
//   apna://group/:groupId/settings   → GroupSettings
//   apna://group/:groupId/members    → GroupMembersManage
//   apna://memories/:groupId/detail/:memoryId → MemoryDetail
//   apna://memories/:groupId/on-this-day      → OnThisDay
//   apna://recap/:slug               → PublicRecap (public, no auth)
//   apna://r/:code                   → captured by initReferralCapture, lands on Home
//
// NOTE: /join is handled by the deep link handler (parseDeepLink) rather than
// React Navigation's config because it uses a query param (?code=) for the invite
// code, which is more robust across chat apps and QR codes.

import type { LinkingOptions } from '@react-navigation/native'
import type { RootStackParamList } from './types'

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['apna://', 'https://apna.app'],

  config: {
    screens: {
      PublicRecap: 'recap/:slug',
      Main: {
        screens: {
          HomeTab: {
            screens: {
              HomeList: '',
              CreateGroup: 'create',
              JoinGroup: 'join',
              GroupHome: 'group/:groupId',
              GroupSettings: 'group/:groupId/settings',
              GroupMembersManage: 'group/:groupId/members',
              ExpenseDetail: 'group/:groupId/expense/:expenseId',
              SettleUp: 'group/:groupId/settle/:withUid?',
              NotificationDebug: 'debug/notifications',
            },
          },
          Budget:   'budget/:groupId?',
          Trip:     'trip/:groupId?',
          Memories: {
            path: 'memories/:groupId?',
            screens: {
              MemoriesHome: '',
              MemoryDetail: 'detail/:memoryId',
              OnThisDay:    'on-this-day',
            },
          },
          Profile:  'profile',
        },
      },
      Auth: {
        screens: {
          PhoneInput:   'login',
          OTP:          'otp',
          ProfileSetup: 'setup',
        },
      },
    },
  },
}
