export function isSilentHours(hour: number): boolean {
  return hour >= 23 || hour < 8
}

export function shouldSendNotification(params: {
  type: string
  hour: number
  recentCount: number
}): boolean {
  if (params.type === 'sos') return true
  if (isSilentHours(params.hour)) return false
  if (params.recentCount >= 3) return false
  return true
}

export function batchNotifications(notifications: Array<{ type: string; groupId: string; payload: any }>): any[] {
  const seenGroupIds = new Set<string>()
  return notifications.filter(notif => {
    if (notif.type === 'memory') {
      if (seenGroupIds.has(notif.groupId)) return false
      seenGroupIds.add(notif.groupId)
      return true
    }
    return true
  })
}
