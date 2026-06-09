// src/components/budget/BudgetEmptyState.tsx
import { Text } from 'react-native'
import { EmptyState } from '../ui/EmptyState'

interface BudgetEmptyStateProps {
  mode: 'no_expenses' | 'no_budget'
  onCta?: () => void
}

export function BudgetEmptyState({ mode, onCta }: BudgetEmptyStateProps) {
  if (mode === 'no_expenses') {
    return (
      <EmptyState
        icon={<Text style={{ fontSize: 48 }}>💸</Text>}
        title="No expenses yet"
        description="Once your group adds spending, it'll show up here."
        ctaLabel={onCta ? "Add Expense" : undefined}
        onCta={onCta}
      />
    )
  }

  return (
    <EmptyState
      icon={<Text style={{ fontSize: 48 }}>🎯</Text>}
      title="No trip budget yet"
      description="You can still track spend now and add a budget later."
      ctaLabel={onCta ? "Add Budget" : undefined}
      onCta={onCta}
    />
  )
}
