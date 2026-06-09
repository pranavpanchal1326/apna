// src/lib/firebase/budget.ts
import { getDoc, getDocs, onSnapshot } from 'firebase/firestore'
import { groupDoc, expensesCol } from './collections'

export interface BudgetExpenseInput {
  id: string
  amount: number
  category?: string
  title?: string
  createdAt?: unknown
  status?: string
}

export interface BudgetGroupInput {
  id: string
  name: string
  totalBudget?: number | null
  currency?: string
  startDate?: string
  endDate?: string
}

export async function fetchBudgetGroup(groupId: string): Promise<BudgetGroupInput | null> {
  try {
    const snap = await getDoc(groupDoc(groupId))
    if (!snap.exists()) return null
    const data = snap.data()
    return {
      id: snap.id,
      name: data.name,
      totalBudget: data.totalBudget ?? null,
      currency: data.currency ?? 'INR',
      startDate: data.startDate,
      endDate: data.endDate,
    }
  } catch (err) {
    console.error(`[Firebase] Error fetching group in budget: ${groupId}`, err)
    throw err
  }
}

export async function fetchBudgetExpenses(groupId: string): Promise<BudgetExpenseInput[]> {
  try {
    const snap = await getDocs(expensesCol(groupId))
    return snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        amount: data.amount,
        category: data.category,
        title: data.description, // Mapped from description
        createdAt: data.createdAt,
        status: (data as any).status || 'active',
      }
    })
  } catch (err) {
    console.error(`[Firebase] Error fetching expenses in budget: ${groupId}`, err)
    throw err
  }
}

export function subscribeToBudgetExpenses(
  groupId: string,
  callback: (expenses: BudgetExpenseInput[]) => void,
  onError?: (error: Error) => void
): () => void {
  return onSnapshot(
    expensesCol(groupId),
    (snap) => {
      const expenses = snap.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          amount: data.amount,
          category: data.category,
          title: data.description,
          createdAt: data.createdAt,
          status: (data as any).status || 'active',
        }
      })
      callback(expenses)
    },
    onError
  )
}
