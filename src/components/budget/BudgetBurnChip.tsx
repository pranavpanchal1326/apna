// src/components/budget/BudgetBurnChip.tsx
import { Badge, type BadgeVariant } from '../ui/Badge'

interface BudgetBurnChipProps {
  pace: 'slow' | 'steady' | 'fast' | 'critical'
}

export function BudgetBurnChip({ pace }: BudgetBurnChipProps) {
  let variant: BadgeVariant = 'muted'
  let label = 'Steady'

  if (pace === 'slow') {
    variant = 'primary'
    label = 'Slow burn'
  } else if (pace === 'steady') {
    variant = 'muted'
    label = 'Steady burn'
  } else if (pace === 'fast') {
    variant = 'gold'
    label = 'Fast burn'
  } else if (pace === 'critical') {
    variant = 'danger'
    label = 'Critical burn'
  }

  return (
    <Badge
      label={label}
      variant={variant}
      size="sm"
    />
  )
}
