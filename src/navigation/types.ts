// src/navigation/types.ts
// React Navigation v7 typed param lists.
// Every navigator in the app must have its params defined here.
// Never use untyped navigation — all screen props extend typed navigator props.

import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { BottomTabScreenProps }   from '@react-navigation/bottom-tabs'
import type { CompositeScreenProps }   from '@react-navigation/native'

// ── Root Navigator ───────────────────────────────────────────────
// Switches between Auth stack and Main tab navigator
export type RootStackParamList = {
  Auth:         undefined
  Main:         undefined
  Splash:       undefined
  PublicRecap:  { slug: string }
}

// ── Auth Navigator ───────────────────────────────────────────────
export type AuthStackParamList = {
  ValueFraming: undefined
  PhoneInput:   undefined
  OTP:          { phone: string }
  ProfileSetup: undefined
}

// ── Home Stack (inside Home tab) ──────────────────────────────────
export type HomeStackParamList = {
  HomeList:           { skipped?: boolean } | undefined  // Groups list + FAB
  ChoosePath:         { inviteCode?: string }
  CreateGroup:        undefined                        // Multi-step create
  JoinGroup:          undefined                        // Invite code entry
  GroupHome:          { groupId: string; groupName: string }  // Group detail shell
  AddExpense:         { groupId: string }
  ExpenseDetail:      { groupId: string; expenseId: string }
  BalanceSummary:     { groupId: string; withUid?: string }
  GroupSettings:      { groupId: string }
  GroupMembersManage: { groupId: string }
  AddMembers:         { groupId: string }
  SettleUp:           { groupId: string; withUid?: string }
  NotificationDebug:  undefined
  TripWrap:           { groupId: string }
  PrivacySettings:    { groupId?: string }
}

// ── Itinerary Stack (inside Trip tab) ─────────────────────────────
export type ItineraryStackParamList = {
  ItineraryHome:  { groupId?: string }
  ItineraryMap:   undefined
}

// ── Lists Stack ───────────────────────────────────────────────────
export type ListsStackParamList = {
  ListsHome:   undefined
  ListDetail:  { listId: string; listTitle: string }
}

// ── Hangouts Stack ──────────────────────────────────────────────
export type HangoutsStackParamList = {
  HangoutsHome:  undefined
  HangoutDetail: { hangoutId: string; title: string }
}

// ── Memories Stack ──────────────────────────────────────────────
export type MemoriesStackParamList = {
  MemoriesHome:  { groupId?: string }
  MemoryDetail:  { memoryId: string; groupId: string }
  OnThisDay:     { groupId: string }
}

// ── Main Tab Navigator ───────────────────────────────────────────
export type MainTabParamList = {
  HomeTab:  undefined
  Budget:   { groupId?: string }
  Trip:     { groupId?: string }
  Lists:    undefined
  Hangouts: undefined
  Memories: { groupId?: string }
  Profile:  undefined
}

// ── Screen prop types ────────────────────────────────────────────
// Use these as prop types in screen components instead of raw NavigationProp

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>

export type ItineraryStackScreenProps<T extends keyof ItineraryStackParamList> =
  NativeStackScreenProps<ItineraryStackParamList, T>

export type ListsStackScreenProps<T extends keyof ListsStackParamList> =
  NativeStackScreenProps<ListsStackParamList, T>

export type HangoutsStackScreenProps<T extends keyof HangoutsStackParamList> =
  NativeStackScreenProps<HangoutsStackParamList, T>

export type MemoriesStackScreenProps<T extends keyof MemoriesStackParamList> =
  NativeStackScreenProps<MemoriesStackParamList, T>

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >

// ── Global navigation type augmentation ─────────────────────────
// Allows useNavigation() to be fully typed without casting
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
export type GroupStackParamList = {
  BudgetTab: { groupId: string; groupName: string; totalBudget?: number }
  SettleUp: {
    groupId: string
    fromUid: string
    toUid: string
    fromName: string
    toName: string
    amountPaise: number
  }
}
