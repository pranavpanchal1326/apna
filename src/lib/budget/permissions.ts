// src/lib/budget/permissions.ts

export function canEditBudget(params: {
  uid: string | null | undefined
  createdBy?: string | null
  adminIds?: string[] | null
}): boolean {
  const { uid, createdBy, adminIds } = params
  if (!uid) return false
  if (uid === createdBy) return true
  if (adminIds && adminIds.includes(uid)) return true
  return false
}
