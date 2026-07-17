// src/components/settlement/BalanceRow.tsx
// Kora & Ink member balance row — a Row: avatar, name + "gets back / owes"
// subtitle, trailing signed Amount (leaf = owed to them, madder = they owe,
// sewn-shut zero = settled). No borders, no ✓ glyph.

import { memo } from 'react'
import { Row } from '@components/ui/Row'
import { Avatar } from '@components/ui/Avatar'
import { Amount } from '@components/ui/Amount'
import type { MemberBalance } from '@lib/engine/balanceEngine'
import type { UserInput } from '@lib/schemas'

interface Props {
  balance: MemberBalance
  user: UserInput | undefined
  isMe?: boolean
}

export const BalanceRow = memo(function BalanceRow({ balance, user, isMe }: Props) {
  const rupees = balance.netPaise / 100

  if (!user) return null

  const label = balance.isSettled
    ? 'All settled'
    : balance.isPayer
      ? 'gets back'
      : 'owes'

  return (
    <Row
      dense
      title={isMe ? 'You' : user.name.split(' ')[0]}
      subtitle={label}
      leading={<Avatar name={user.name} color={user.avatarColor} imageUrl={user.photoUrl} size="sm" />}
      // netPaise positive = they are owed (leaf); negative = they owe (madder)
      trailing={<Amount value={rupees} size="md" signed settled={balance.isSettled} />}
    />
  )
})
