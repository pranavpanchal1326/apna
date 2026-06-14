// src/navigation/deeplink/notificationRouter.ts

export interface NotificationPayload {
  type: string
  groupId?: string
  expenseId?: string
  memoryId?: string
  [key: string]: any
}

/**
 * Maps an incoming Firebase Cloud Messaging notification payload
 * to a structured deep link URL. Appends source=notification to preserve context.
 */
export function notificationToDeepLink(payload: NotificationPayload): string {
  if (!payload || !payload.type || !payload.groupId) {
    return 'apna://'
  }

  const { type, groupId } = payload
  let url = ''

  switch (type) {
    case 'expense_added':
    case 'expense_updated':
      if (!payload.expenseId) {
        url = `apna://group/${groupId}`
      } else {
        url = `apna://group/${groupId}/expense/${payload.expenseId}`
      }
      break

    case 'settlement_recorded':
      url = `apna://group/${groupId}`
      break

    case 'admin_transferred':
      url = `apna://group/${groupId}/settings`
      break

    case 'member_removed':
      url = `apna://group/${groupId}/members`
      break

    case 'on_this_day':
      url = `apna://memories/${groupId}/on-this-day`
      break

    case 'memory_reaction':
      if (!payload.memoryId) {
        url = `apna://group/${groupId}`
      } else {
        url = `apna://memories/${groupId}/detail/${payload.memoryId}`
      }
      break

    default:
      url = `apna://group/${groupId}`
  }

  const delimiter = url.includes('?') ? '&' : '?'
  return `${url}${delimiter}source=notification`
}
