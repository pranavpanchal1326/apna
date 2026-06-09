// src/lib/budget/permissions.ts

export interface CanEditBudgetParams {
  group: {
    createdBy?: string
    adminIds?: string[]
  } | null
  uid: string | null
}

export function canEditBudget(params: CanEditBudgetParams): boolean {
  const { group, uid } = params
  if (!uid || !group) return false
  if (group.createdBy === uid) return true
  if (group.adminIds?.includes(uid)) return true
  return false
}
