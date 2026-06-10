// src/lib/utils/exportCsv.ts
// Generates a raw CSV file structure from aggregated expense export rows.
// Escapes and quotes fields in compliance with RFC 4180.

import type { ExportExpenseRow } from './exportData'

/**
 * Converts a list of export expense rows into a raw CSV string.
 */
export function generateExpensesCsv(rows: ExportExpenseRow[]): string {
  const headers = [
    'Date',
    'Description',
    'Category',
    'Amount (INR)',
    'Paid By',
    'Split Type',
    'Split Summary',
    'Notes',
    'Created By',
  ]

  // Escape special characters: quotes, commas, and line breaks
  const escapeField = (value: string | number | undefined | null): string => {
    if (value === null || value === undefined) return ''
    const stringValue = String(value).trim()
    
    // Double quotes are escaped by doubling them
    const escaped = stringValue.replace(/"/g, '""')
    
    // If field contains comma, double-quote, or newline, it must be enclosed in quotes
    if (/[",\n\r]/.test(stringValue)) {
      return `"${escaped}"`
    }
    
    return stringValue
  }

  const csvLines = [headers.map(escapeField).join(',')]

  rows.forEach((row) => {
    const line = [
      row.date,
      row.description,
      row.category,
      row.amount,
      row.paidByName,
      row.splitType,
      row.splitSummary,
      row.notes,
      row.createdBy,
    ]
    csvLines.push(line.map(escapeField).join(','))
  })

  return csvLines.join('\r\n') // standard network line break
}
