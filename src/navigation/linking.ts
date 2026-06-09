// src/navigation/linking.ts
// Deep link config — apna:// URL scheme.
// Enables: apna://group/abc123, apna://invite/xyz789
// Phase 2 will add group invite deep links — structure defined here now.

import type { LinkingOptions } from '@react-navigation/native'
import type { RootStackParamList } from './types'

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['apna://', 'https://apna.app'],

  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: {
            path: 'home',
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
          Memories: 'memories/:groupId?',
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
