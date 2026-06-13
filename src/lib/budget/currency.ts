export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'AED', 'THB']

export function convertToBaseCurrency(amount: number, currency: string, rate: number): number {
  if (currency === 'INR') return amount
  return amount * rate
}

export function formatCurrency(amount: number, currency: string): string {
  if (currency === 'INR') {
    return '₹' + amount.toLocaleString('en-IN')
  }
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    AED: 'dh',
    THB: '฿',
  }
  const symbol = symbols[currency] || currency
  return symbol + amount.toLocaleString()
}
