export function canAddMember(members: Record<string, any>): boolean {
  return Object.keys(members).length < 30
}

export function canCreateGroup(userGroupCount: number): boolean {
  return userGroupCount < 10
}

export function validateGroupLimits(params: { memberCount: number; userGroupCount: number }): string | null {
  if (params.memberCount >= 30) {
    return 'Group is full (30/30)'
  }
  if (params.userGroupCount >= 10) {
    return 'You have reached the limit of 10 active groups'
  }
  return null
}
