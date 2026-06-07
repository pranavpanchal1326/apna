// src/lib/utils/date.ts
// Date formatting helpers — used across feed, memories, itinerary, budget.
// Uses date-fns (already installed in Prompt 0.1).
// All display strings are Hinglish-friendly — English month names, no translations needed.

import {
  format,
  isToday,
  isYesterday,
  isSameWeek,
  isSameYear,
  differenceInDays,
  parseISO,
} from 'date-fns'
import type { Timestamp } from 'firebase/firestore'

/**
 * Convert Firestore Timestamp OR JS Date OR ISO string to JS Date.
 * Handles all three input types safely.
 */
export function toDate(value: Timestamp | Date | string): Date {
  if (typeof value === 'string') return parseISO(value)
  if (value instanceof Date) return value
  // Firestore Timestamp — has .toDate() method
  return value.toDate()
}

/**
 * Activity feed timestamp — short, contextual.
 * "Just now" / "5 min ago" / "Yesterday" / "14 Jul" / "14 Jul 2025"
 */
export function feedTimestamp(value: Timestamp | Date | string): string {
  const date = toDate(value)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return 'Yesterday'
  if (isSameWeek(date, now)) return format(date, 'EEEE')         // "Monday"
  if (isSameYear(date, now)) return format(date, 'd MMM')        // "14 Jul"
  return format(date, 'd MMM yyyy')                              // "14 Jul 2024"
}

/**
 * Trip day header — "Day 1 · Jaipur · 14 Jul"
 * Used in memory timeline and itinerary headers.
 */
export function tripDayHeader(
  date: string,              // YYYY-MM-DD
  destination?: string,
  dayNumber?: number
): string {
  const d = parseISO(date)
  const dayStr = dayNumber ? `Day ${dayNumber}` : ''
  const dateStr = format(d, 'd MMM')
  const parts = [dayStr, destination, dateStr].filter(Boolean)
  return parts.join(' · ')
}

/**
 * Countdown string — "in 12 days" / "Today!" / "Trip started"
 * Used in trip countdown banner on Home screen.
 */
export function tripCountdown(startDate: string): string {
  const start = parseISO(startDate)
  const today = new Date()
  const diff = differenceInDays(start, today)

  if (diff < 0) return 'Trip started!'
  if (diff === 0) return 'Today! 🎉'
  if (diff === 1) return 'Tomorrow!'
  return `in ${diff} days`
}

/**
 * Expense date display — "Today" / "Yesterday" / "14 Jul"
 * Used in expense list items.
 */
export function expenseDate(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'd MMM')
}

/**
 * Full date — "Sunday, 14 July 2026"
 * Used in itinerary day headers.
 */
export function fullDate(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE, d MMMM yyyy')
}

/**
 * Short time — "3:45 PM"
 * Used for itinerary time blocks.
 */
export function shortTime(timeStr: string): string {
  // timeStr is HH:MM e.g. "15:45"
  const [hours, minutes] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(hours, minutes)
  return format(d, 'h:mm a')
}

/**
 * Duration string — "1h 30m" / "45m" / "2h"
 */
export function durationString(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Format INR amount — "₹1,250" / "₹84,500"
 * Mono font should be applied by the calling component.
 * This returns the display string only.
 */
export function formatAmount(
  amount: number,
  currency: string = 'INR'
): string {
  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}
