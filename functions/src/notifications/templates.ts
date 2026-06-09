// functions/src/notifications/templates.ts

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return String(amount)
  // Simple format for Indian Rupees
  return num.toLocaleString('en-IN')
}

export function buildExpenseAddedMessage(args: {
  groupId: string
  groupName: string
  actorName: string
  actorUid: string
  expenseId: string
  title: string
  amount: number
}) {
  return {
    title: args.groupName,
    body: `${args.actorName} added "${args.title}" · ₹${formatCurrency(args.amount)}`,
    data: {
      type: 'expense_added',
      groupId: args.groupId,
      groupName: args.groupName,
      expenseId: args.expenseId,
      actorUid: args.actorUid,
      title: args.title,
      amount: String(args.amount),
    },
  }
}

export function buildExpenseUpdatedMessage(args: {
  groupId: string
  groupName: string
  actorName: string
  actorUid: string
  expenseId: string
  title: string
  amount: number
}) {
  return {
    title: args.groupName,
    body: `${args.actorName} updated "${args.title}" · ₹${formatCurrency(args.amount)}`,
    data: {
      type: 'expense_updated',
      groupId: args.groupId,
      groupName: args.groupName,
      expenseId: args.expenseId,
      actorUid: args.actorUid,
      title: args.title,
      amount: String(args.amount),
    },
  }
}

export function buildSettlementMessage(args: {
  groupId: string
  groupName: string
  actorName: string
  actorUid: string
  settlementId: string
  amount: number
  withName: string
  withUid: string
}) {
  return {
    title: args.groupName,
    body: `${args.actorName} settled with ${args.withName} · ₹${formatCurrency(args.amount)}`,
    data: {
      type: 'settlement_recorded',
      groupId: args.groupId,
      groupName: args.groupName,
      settlementId: args.settlementId,
      actorUid: args.actorUid,
      amount: String(args.amount),
      withUid: args.withUid,
    },
  }
}

export function buildMemberJoinedMessage(args: {
  groupId: string
  groupName: string
  actorName: string
  actorUid: string
}) {
  return {
    title: args.groupName,
    body: `${args.actorName} joined ${args.groupName} 👋`,
    data: {
      type: 'member_joined',
      groupId: args.groupId,
      groupName: args.groupName,
      actorUid: args.actorUid,
    },
  }
}

export function buildGroupCompletedMessage(args: {
  groupId: string
  groupName: string
  actorName: string
  actorUid: string
}) {
  return {
    title: args.groupName,
    body: `Trip completed! "${args.groupName}" is wrapped up 🎒`,
    data: {
      type: 'group_completed',
      groupId: args.groupId,
      groupName: args.groupName,
      actorUid: args.actorUid,
    },
  }
}

export function buildInviteRegeneratedMessage(args: {
  groupId: string
  groupName: string
  actorName: string
  actorUid: string
}) {
  return {
    title: args.groupName,
    body: `Invite code updated for ${args.groupName} by admin`,
    data: {
      type: 'group_invite_regenerated',
      groupId: args.groupId,
      groupName: args.groupName,
      actorUid: args.actorUid,
    },
  }
}

export function buildAdminTransferredMessage(args: {
  groupId: string
  groupName: string
  actorName: string
  actorUid: string
  targetName: string
  targetUid: string
}) {
  return {
    title: args.groupName,
    body: `${args.targetName} is now admin of ${args.groupName} 👑`,
    data: {
      type: 'admin_transferred',
      groupId: args.groupId,
      groupName: args.groupName,
      actorUid: args.actorUid,
      targetUid: args.targetUid,
    },
  }
}

export function buildMemberRemovedMessage(args: {
  groupId: string
  groupName: string
  actorName: string
  actorUid: string
  targetName: string
  targetUid: string
}) {
  return {
    title: args.groupName,
    body: `${args.targetName} was removed from ${args.groupName}`,
    data: {
      type: 'member_removed',
      groupId: args.groupId,
      groupName: args.groupName,
      actorUid: args.actorUid,
      targetUid: args.targetUid,
    },
  }
}
