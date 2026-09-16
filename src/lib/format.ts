import { format, formatDistanceToNow, isToday, isValid } from 'date-fns'

type CurrencyCode = 'SSP' | 'USD'

const CURRENCY_LOCALE: Record<CurrencyCode, string> = {
  SSP: 'en-SS',
  USD: 'en-US',
}

/** Money always renders with its currency — never a naked number. */
export function formatMoney(amount: number | string | null | undefined, currency: CurrencyCode = 'SSP') {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  if (value === null || value === undefined || Number.isNaN(value)) return `${currency} —`

  if (currency === 'USD') {
    return new Intl.NumberFormat(CURRENCY_LOCALE.USD, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE.SSP, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `SSP ${formatted}`
}

/**
 * Formats a sum kept separate per currency (SSP and USD amounts can never
 * just be added together) as one short string — e.g. a dashboard tile
 * showing "SSP 45,000.00" normally, or "SSP 45,000.00 + $120.00" on the
 * rare day both currencies are in play. Defaults to "SSP 0.00" when empty.
 */
export function formatMoneyTotals(totals: Partial<Record<CurrencyCode, number>>) {
  const entries = (Object.entries(totals) as [CurrencyCode, number][]).filter(([, amount]) => amount !== 0)
  if (entries.length === 0) return formatMoney(0, 'SSP')
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ')
}

/** Absolute date display format locked to `15 Sep 2026`. */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (!isValid(date)) return '—'
  return format(date, 'dd MMM yyyy')
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (!isValid(date)) return '—'
  return format(date, 'dd MMM yyyy, HH:mm')
}

/** Relative for recent values, e.g. "2 hours ago"; the absolute date belongs in a tooltip. */
export function formatRelative(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (!isValid(date)) return '—'
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true })
  return formatDate(date)
}

/** Normalizes a South Sudanese-style local number to E.164 (+211...). Falls through untouched for other formats. */
export function toE164(input: string, defaultCountryCode = '211') {
  const digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+${defaultCountryCode}${digits.slice(1)}`
  if (digits.startsWith(defaultCountryCode)) return `+${digits}`
  return `+${defaultCountryCode}${digits}`
}

/** Displays an E.164 number in a locally readable grouped format, e.g. +211 92 123 4567. */
export function formatPhoneLocal(e164: string | null | undefined) {
  if (!e164) return '—'
  const match = /^\+(\d{1,4})(\d{2})(\d{3})(\d{4})$/.exec(e164.replace(/\s+/g, ''))
  if (!match) return e164
  const [, country, a, b, c] = match
  return `+${country} ${a} ${b} ${c}`
}

export function whatsappLink(e164: string, message?: string) {
  const number = e164.replace(/[^\d]/g, '')
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${number}${text}`
}

export function telLink(e164: string) {
  return `tel:${e164}`
}
