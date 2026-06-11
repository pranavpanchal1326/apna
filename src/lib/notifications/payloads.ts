// src/lib/notifications/payloads.ts

export type NotificationType =
  | 'expense_added'
  | 'expense_updated'
  | 'settlement_recorded'
  | 'member_joined'
  | 'group_completed'
  | 'group_invite_regenerated'
  | 'admin_transferred'
  | 'member_removed'
  | 'on_this_day'
  | 'memory_reaction'

export interface BaseNotificationData {
  type: NotificationType
  groupId: string
  groupName: string
}

export interface ExpenseNotificationData extends BaseNotificationData {
  type: 'expense_added' | 'expense_updated'
  expenseId: string
  actorUid: string
  title: string
  amount: string
}

export interface SettlementNotificationData extends BaseNotificationData {
  type: 'settlement_recorded'
  settlementId: string
  actorUid: string
  amount: string
  withUid: string
}

export interface MemberJoinedNotificationData extends BaseNotificationData {
  type: 'member_joined'
  actorUid: string
}

export interface GroupAdminNotificationData extends BaseNotificationData {
  type:
    | 'group_completed'
    | 'group_invite_regenerated'
    | 'admin_transferred'
    | 'member_removed'
  actorUid: string
  targetUid?: string
}

export interface OnThisDayNotificationData extends BaseNotificationData {
  type: 'on_this_day'
  date: string
}

export interface MemoryReactionNotificationData extends BaseNotificationData {
  type: 'memory_reaction'
  memoryId: string
}

export type AppNotificationData =
  | ExpenseNotificationData
  | SettlementNotificationData
  | MemberJoinedNotificationData
  | GroupAdminNotificationData
  | OnThisDayNotificationData
  | MemoryReactionNotificationData

export function buildDeepLink(data: AppNotificationData): string {
  const { type, groupId } = data
  switch (type) {
    case 'expense_added':
    case 'expense_updated': {
      const expenseId = (data as ExpenseNotificationData).expenseId
      return `apna://group/${groupId}/expense/${expenseId}`
    }
    case 'settlement_recorded':
      return `apna://group/${groupId}`
    case 'member_joined':
      return `apna://group/${groupId}`
    case 'group_completed':
    case 'group_invite_regenerated':
      return `apna://group/${groupId}/settings`
    case 'admin_transferred':
    case 'member_removed':
      return `apna://group/${groupId}/members`
    case 'on_this_day':
      return `apna://memories/${groupId}/on-this-day`
    case 'memory_reaction': {
      const memoryId = (data as MemoryReactionNotificationData).memoryId
      return `apna://memories/${groupId}/detail/${memoryId}`
    }
    default:
      return `apna://group/${groupId}`
  }
}
