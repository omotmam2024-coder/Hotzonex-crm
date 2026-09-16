import * as XLSX from 'xlsx'
import { exportToXlsx } from '@/lib/export'
import { toE164 } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024
export const MAX_IMPORT_ROWS = 500
const IMPORT_CHUNK_SIZE = 25

type CustomerInsert = Database['public']['Tables']['customers']['Insert']

const TYPE_VALUES = ['individual', 'business', 'ngo', 'government', 'reseller'] as const
const STATUS_VALUES = ['lead', 'prospect', 'active', 'dormant', 'churned', 'blacklisted'] as const
const UNIT_VALUES = ['wifi', 'services', 'refreshment'] as const

type Level = 'ready' | 'warning' | 'duplicate' | 'error'
const SEVERITY: Record<Level, number> = { ready: 0, warning: 1, duplicate: 2, error: 3 }
function bump(current: Level, next: Level): Level {
  return SEVERITY[next] > SEVERITY[current] ? next : current
}

function normalizeEnum<T extends string>(raw: string, values: readonly T[]): T | null {
  const v = raw.trim().toLowerCase()
  return (values as readonly string[]).includes(v) ? (v as T) : null
}

export interface ImportRowResult {
  rowNumber: number
  displayName: string
  phone: string
  messages: string[]
  level: Level
  payload: CustomerInsert | null
}

export function downloadCustomerImportTemplate() {
  exportToXlsx(
    [
      {
        full_name: 'Jane Doe',
        business_name: '',
        type: 'individual',
        phone_primary: '0921234567',
        whatsapp: '',
        email: 'jane@example.com',
        business_units: 'wifi',
        status: 'lead',
        location: 'HQ',
        owner_email: '',
        tags: 'vip,referral',
        notes: '',
        opted_out: 'no',
      },
    ],
    'hotzonex-customers-import-template.xlsx',
  )
}

export async function parseImportFile(file: File): Promise<{ rows: Record<string, string>[]; truncated: boolean }> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error(`File is too large (max ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)}MB).`)
  }
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined
  if (!sheet) throw new Error('The file has no readable sheet.')

  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false })
  const truncated = json.length > MAX_IMPORT_ROWS
  return { rows: json.slice(0, MAX_IMPORT_ROWS), truncated }
}

export function buildImportRows(
  raw: Record<string, string>[],
  opts: {
    locationsByName: Map<string, string>
    profilesByEmail: Map<string, string>
    existingPhones: Set<string>
  },
): ImportRowResult[] {
  const seenPhones = new Set<string>()

  return raw.map((r, i) => {
    const rowNumber = i + 2 // header is row 1
    const messages: string[] = []
    let level: Level = 'ready'
    const get = (key: string) => (r[key] ?? '').toString().trim()

    const typeRaw = get('type')
    const type = typeRaw ? normalizeEnum(typeRaw, TYPE_VALUES) : 'individual'
    if (typeRaw && !type) {
      messages.push(`Unknown type "${typeRaw}" — defaulted to individual.`)
      level = bump(level, 'warning')
    }
    const resolvedType = type ?? 'individual'

    const fullName = get('full_name')
    const businessName = get('business_name')
    if (resolvedType === 'individual' && !fullName) {
      messages.push('full_name is required for an individual customer.')
      level = bump(level, 'error')
    }
    if (resolvedType !== 'individual' && !businessName) {
      messages.push('business_name is required for this customer type.')
      level = bump(level, 'error')
    }

    const phoneRaw = get('phone_primary')
    let phone = ''
    if (!phoneRaw) {
      messages.push('phone_primary is required.')
      level = bump(level, 'error')
    } else {
      phone = toE164(phoneRaw)
      if (phone.replace(/\D/g, '').length < 8) {
        messages.push(`"${phoneRaw}" doesn't look like a valid phone number.`)
        level = bump(level, 'error')
      } else if (seenPhones.has(phone)) {
        messages.push('Duplicate phone number within this file — skipped.')
        level = bump(level, 'duplicate')
      } else if (opts.existingPhones.has(phone)) {
        messages.push('A customer with this phone already exists — skipped.')
        level = bump(level, 'duplicate')
      }
      seenPhones.add(phone)
    }

    const emailRaw = get('email')
    let email: string | null = null
    if (emailRaw) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
        messages.push(`"${emailRaw}" doesn't look like a valid email.`)
        level = bump(level, 'error')
      } else {
        email = emailRaw
      }
    }

    const whatsappRaw = get('whatsapp')
    const whatsapp = whatsappRaw ? toE164(whatsappRaw) : null

    const unitsRaw = get('business_units')
    let units: (typeof UNIT_VALUES)[number][] = ['wifi']
    if (unitsRaw) {
      const tokens = unitsRaw
        .split(/[,;|]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
      const valid = tokens.filter((t): t is (typeof UNIT_VALUES)[number] => (UNIT_VALUES as readonly string[]).includes(t))
      const invalid = tokens.filter((t) => !(UNIT_VALUES as readonly string[]).includes(t))
      if (invalid.length > 0) {
        messages.push(`Unknown business unit(s): ${invalid.join(', ')} — ignored.`)
        level = bump(level, 'warning')
      }
      if (valid.length > 0) units = [...new Set(valid)]
    }

    const statusRaw = get('status')
    const status = statusRaw ? normalizeEnum(statusRaw, STATUS_VALUES) : 'lead'
    if (statusRaw && !status) {
      messages.push(`Unknown status "${statusRaw}" — defaulted to lead.`)
      level = bump(level, 'warning')
    }
    const resolvedStatus = status ?? 'lead'

    const locationRaw = get('location')
    let locationId: string | null = null
    if (locationRaw) {
      const match = opts.locationsByName.get(locationRaw.toLowerCase())
      if (match) locationId = match
      else {
        messages.push(`Location "${locationRaw}" not found — left unassigned.`)
        level = bump(level, 'warning')
      }
    }

    const ownerEmailRaw = get('owner_email')
    let ownerId: string | null = null
    if (ownerEmailRaw) {
      const match = opts.profilesByEmail.get(ownerEmailRaw.toLowerCase())
      if (match) ownerId = match
      else {
        messages.push(`No staff account with email "${ownerEmailRaw}" — left unassigned.`)
        level = bump(level, 'warning')
      }
    }

    const tags = get('tags')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const notes = get('notes') || null
    const optedOut = ['yes', 'true', '1', 'y'].includes(get('opted_out').toLowerCase())

    const displayName = (resolvedType === 'individual' ? fullName : businessName) || phone || phoneRaw || `Row ${rowNumber}`

    if (level === 'error' || level === 'duplicate') {
      return { rowNumber, displayName, phone: phone || phoneRaw, messages, level, payload: null }
    }

    const payload: CustomerInsert = {
      type: resolvedType,
      full_name: resolvedType === 'individual' ? fullName : fullName || null,
      business_name: resolvedType !== 'individual' ? businessName : businessName || null,
      phone_primary: phone,
      whatsapp,
      email,
      location_id: locationId,
      business_units: units,
      status: resolvedStatus,
      owner_id: ownerId,
      tags,
      notes,
      opted_out: optedOut,
      source: 'import',
    }

    return { rowNumber, displayName, phone, messages, level, payload }
  })
}

export async function fetchExistingPhones(phones: string[]): Promise<Set<string>> {
  const existing = new Set<string>()
  const uniquePhones = [...new Set(phones)]
  for (let i = 0; i < uniquePhones.length; i += 150) {
    const chunk = uniquePhones.slice(i, i + 150)
    const { data, error } = await supabase.from('customers').select('phone_primary').in('phone_primary', chunk)
    if (error) throw error
    for (const row of data) existing.add(row.phone_primary)
  }
  return existing
}

export interface ImportOutcome {
  imported: number
  failed: { rowNumber: number; displayName: string; message: string }[]
}

export async function insertImportRows(
  rows: { rowNumber: number; displayName: string; payload: CustomerInsert }[],
): Promise<ImportOutcome> {
  const outcome: ImportOutcome = { imported: 0, failed: [] }

  for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + IMPORT_CHUNK_SIZE)
    const { error } = await supabase.from('customers').insert(chunk.map((r) => r.payload))
    if (!error) {
      outcome.imported += chunk.length
      continue
    }

    // Something in this chunk failed (e.g. a phone number registered by
    // someone else since the preview ran) — a bulk insert is one statement,
    // so one bad row sinks the whole chunk; retry one at a time to salvage
    // the rest and report exactly which row(s) failed and why.
    for (const row of chunk) {
      const { error: rowError } = await supabase.from('customers').insert(row.payload)
      if (rowError) {
        outcome.failed.push({
          rowNumber: row.rowNumber,
          displayName: row.displayName,
          message: rowError.code === '23505' ? 'Phone number already exists.' : rowError.message,
        })
      } else {
        outcome.imported += 1
      }
    }
  }

  return outcome
}
