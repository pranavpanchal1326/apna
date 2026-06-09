// src/hooks/useItinerary.ts
// Group itinerary hook — bridge between store and screen components.
// Manages subscription lifecycle: subscribe on mount, unsubscribe on unmount.

import { useEffect, useMemo } from 'react'
import { useItineraryStore } from '../stores/itinerary.store'
import { useGroupStore }     from '../stores/group.store'
import { useAuth }           from './useAuth'

export function useItinerary(groupId: string | null) {
  const store      = useItineraryStore()
  const { user }   = useAuth()
  const activeGroup = useGroupStore(s => s.activeGroup)

  // Subscribe to day plans when group is available
  useEffect(() => {
    if (!groupId) return
    store.subscribeToGroup(groupId)
    return () => { /* Keep subscription alive — cleaned up on group change */ }
  }, [groupId])

  // Subscribe to active day's items when activeDayId changes
  useEffect(() => {
    if (!groupId || !store.activeDayId) return
    store.subscribeToDay(groupId, store.activeDayId)
  }, [groupId, store.activeDayId])

  // Trip date range from group — used to generate day headers
  const tripDateRange = useMemo(() => {
    if (!activeGroup?.startDate || !activeGroup?.endDate) return []
    const dates: string[] = []
    const start = new Date(activeGroup.startDate)
    const end   = new Date(activeGroup.endDate)
    const curr  = new Date(start)
    while (curr <= end && dates.length < 30) {
      dates.push(curr.toISOString().split('T')[0])
      curr.setDate(curr.getDate() + 1)
    }
    return dates
  }, [activeGroup?.startDate, activeGroup?.endDate])

  // Active day items sorted by sortOrder (already sorted from subscription)
  const activeDayItems = store.activeDayId
    ? (store.itemsByDay[store.activeDayId] ?? [])
    : []

  return {
    dayPlans:        store.dayPlans,
    itemsByDay:      store.itemsByDay,
    activeDayId:     store.activeDayId,
    activeDayItems,
    tripDateRange,
    isLoading:       store.isLoading,
    isMutating:      store.isMutating,
    error:           store.error,
    myUid:           user?.uid ?? null,

    // Actions
    createDay:    store.createDay,
    setActiveDay: store.setActiveDay,
    addItem:      store.addItem,
    updateItem:   store.updateItem,
    deleteItem:   store.deleteItem,
    reorderDay:   store.reorderDay,
    moveItem:     store.moveItem,
    vote:         store.vote,
  }
}
