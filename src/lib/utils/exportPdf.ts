// src/lib/utils/exportPdf.ts
// Generates a polished PDF report using expo-print HTML-to-PDF compiler.
// Applies styling that matches the Dhaga design system palette and layout constraints.

import * as Print from 'expo-print'
import type { ExpenseExportBundle } from './exportData'

/**
 * Compiles the aggregated export bundle into a PDF file on the device.
 * Returns the local file URI of the generated PDF.
 */
export async function generateExpensesPdf(bundle: ExpenseExportBundle): Promise<string> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${bundle.groupName} - Expense Report</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1A202C;
            background-color: #FFFFFF;
            line-height: 1.5;
            padding: 40px;
          }
          .header-block {
            border-bottom: 2px solid #E2E8F0;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }
          .title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 32px;
            font-weight: 700;
            color: #0F172A;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
          }
          .subtitle {
            font-size: 14px;
            color: #64748B;
            font-weight: 500;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }
          .card {
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 16px;
          }
          .card-label {
            font-size: 11px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          .card-val {
            font-size: 24px;
            font-weight: 700;
            color: #0F172A;
          }
          .card-mono {
            font-family: 'JetBrains Mono', monospace;
          }
          .section-title {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 16px;
            border-left: 4px solid #4ECDC4;
            padding-left: 8px;
          }
          .flex-columns {
            display: flex;
            gap: 24px;
            margin-bottom: 32px;
          }
          .column-half {
            flex: 1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background-color: #F1F5F9;
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 12px;
            border-bottom: 1px solid #CBD5E1;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #E2E8F0;
            font-size: 13px;
            color: #334155;
          }
          tr:nth-child(even) td {
            background-color: #F8FAFC;
          }
          .progress-bar-bg {
            background-color: #E2E8F0;
            border-radius: 4px;
            height: 6px;
            width: 80px;
            display: inline-block;
            vertical-align: middle;
            margin-right: 8px;
          }
          .progress-bar-fill {
            background-color: #4ECDC4;
            border-radius: 4px;
            height: 6px;
          }
          .settlement-card {
            display: flex;
            align-items: center;
            background-color: #F0FDF4;
            border: 1px dashed #BBF7D0;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
            font-size: 13px;
            color: #166534;
          }
          .settlement-card span {
            font-weight: 600;
          }
          .settlement-card .arrow {
            margin: 0 8px;
            color: #15803d;
          }
          .settlement-amount {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            margin-left: auto;
          }
          .empty-state {
            color: #64748B;
            font-style: italic;
            font-size: 13px;
          }
          .page-break {
            page-break-before: always;
          }
          .footer {
            margin-top: 48px;
            text-align: center;
            font-size: 11px;
            color: #94A3B8;
            border-top: 1px solid #E2E8F0;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header-block">
          <div class="title">${bundle.groupName}</div>
          <div class="subtitle">Expense Report &bull; ${bundle.dateRange}</div>
        </div>

        <!-- Stats Grid -->
        <div class="grid">
          <div class="card">
            <div class="card-label">Total Spent</div>
            <div class="card-val card-mono">₹${bundle.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="card">
            <div class="card-label">Top Spender</div>
            <div class="card-val" style="font-size: 16px; margin-top: 6px;">${bundle.highestSpender}</div>
          </div>
          <div class="card">
            <div class="card-label">Trip Stats</div>
            <div class="card-val" style="font-size: 18px; margin-top: 4px;">
              ${bundle.expenseCount} Expenses &bull; ${bundle.memberCount} Members
            </div>
          </div>
        </div>

        <div class="flex-columns">
          <!-- Spent by Category -->
          <div class="column-half">
            <div class="section-title">Spent by Category</div>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                ${bundle.categories.map((c) => `
                  <tr>
                    <td>${c.category.toUpperCase()}</td>
                    <td style="font-family: 'JetBrains Mono';">₹${c.amount.toLocaleString('en-IN')}</td>
                    <td>
                      <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${c.percentage}%;"></div>
                      </div>
                      ${c.percentage}%
                    </td>
                  </tr>
                `).join('')}
                ${bundle.categories.length === 0 ? '<tr><td colspan="3" class="empty-state">No categories logged.</td></tr>' : ''}
              </tbody>
            </table>
          </div>

          <!-- Settlements -->
          <div class="column-half">
            <div class="section-title">Settlement Instructions</div>
            <div style="margin-bottom: 24px;">
              ${bundle.settlements.map((s) => `
                <div class="settlement-card">
                  <span>${s.fromName}</span>
                  <span class="arrow">&rarr;</span>
                  <span>${s.toName}</span>
                  <span class="settlement-amount">₹${s.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              `).join('')}
              ${bundle.settlements.length === 0 ? '<div class="empty-state">All debts are settled up! 🎉</div>' : ''}
            </div>
          </div>
        </div>

        <!-- Member Balances -->
        <div>
          <div class="section-title">Member Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Total Paid</th>
                <th>Total Owed</th>
                <th>Net Balance</th>
              </tr>
            </thead>
            <tbody>
              ${bundle.memberBalances.map((mb) => {
                const balanceStyle = mb.netBalance > 0
                  ? 'color: #16A34A; font-weight: 600;'
                  : mb.netBalance < 0
                  ? 'color: #DC2626; font-weight: 600;'
                  : 'color: #475569;'
                const balancePrefix = mb.netBalance > 0 ? '+' : ''
                
                return `
                  <tr>
                    <td style="font-weight: 500;">${mb.name}</td>
                    <td style="font-family: 'JetBrains Mono';">₹${mb.paidAmount.toLocaleString('en-IN')}</td>
                    <td style="font-family: 'JetBrains Mono';">₹${mb.owedAmount.toLocaleString('en-IN')}</td>
                    <td style="font-family: 'JetBrains Mono'; ${balanceStyle}">
                      ${balancePrefix}₹${mb.netBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                `
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Page break for detailed log -->
        <div class="page-break"></div>

        <div class="header-block" style="margin-top: 20px;">
          <div class="title" style="font-size: 24px;">Detailed Expense Log</div>
          <div class="subtitle">Complete transaction listing for ${bundle.groupName}</div>
        </div>

        <!-- Detailed expense table -->
        <table style="margin-top: 16px;">
          <thead>
            <tr>
              <th style="width: 15%;">Date</th>
              <th style="width: 35%;">Description</th>
              <th style="width: 15%;">Paid By</th>
              <th style="width: 20%;">Split Details</th>
              <th style="width: 15%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${bundle.expenses.map((e) => `
              <tr>
                <td>${e.date}</td>
                <td>
                  <div style="font-weight: 500;">${e.description}</div>
                  <div style="font-size: 10px; color: #64748B; text-transform: uppercase; margin-top: 2px;">
                    ${e.category} ${e.notes ? `&bull; ${e.notes}` : ''}
                  </div>
                </td>
                <td>${e.paidByName}</td>
                <td style="font-size: 11px; color: #475569;">${e.splitSummary}</td>
                <td style="font-family: 'JetBrains Mono'; text-align: right; font-weight: 600;">
                  ₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            `).join('')}
            ${bundle.expenses.length === 0 ? '<tr><td colspan="5" class="empty-state" style="text-align: center; padding: 24px;">No expenses logged.</td></tr>' : ''}
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          Generated automatically by <strong>apna</strong> &bull; India's Premium Group Travel Expense Tracker
        </div>
      </body>
    </html>
  `

  const { uri } = await Print.printToFileAsync({ html: htmlContent })
  return uri
}
