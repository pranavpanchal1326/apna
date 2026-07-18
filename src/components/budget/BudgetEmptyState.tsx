// src/components/budget/BudgetEmptyState.tsx
import { Receipt } from 'phosphor-react-native'
import { useTheme } from '@theme'
import { EmptyState } from '../ui/EmptyState'
import { Potli } from '../icons'

interface BudgetEmptyStateProps {
  mode: 'no_expenses' | 'no_budget'
  onCta?: () => void
}

export function BudgetEmptyState({ mode, onCta }: BudgetEmptyStateProps) {
  const { colors } = useTheme()

  if (mode === 'no_expenses') {
    return (
      <EmptyState
        icon={<Receipt size={48} color={colors.textSecondary} weight="regular" />}
        title="No expenses yet"
        description="Once your group adds spending, it'll show up here."
        ctaLabel={onCta ? 'Add Expense' : undefined}
        onCta={onCta}
      />
    )
  }

  return (
    <EmptyState
      icon={<Potli size={48} color={colors.textSecondary} />}
      title="No trip budget yet"
      description="You can still track spend now and add a budget later."
      ctaLabel={onCta ? 'Add Budget' : undefined}
      onCta={onCta}
    />
  )
}
