import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangleIcon, CheckCircle2Icon, DownloadIcon, UploadIcon, XCircleIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toE164 } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import {
  buildImportRows,
  downloadCustomerImportTemplate,
  fetchExistingPhones,
  insertImportRows,
  MAX_IMPORT_ROWS,
  parseImportFile,
  type ImportOutcome,
  type ImportRowResult,
} from './customerImport'

interface ImportCustomersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LEVEL_BADGE = {
  ready: { variant: 'success' as const, label: 'Ready' },
  warning: { variant: 'warning' as const, label: 'Ready (check)' },
  duplicate: { variant: 'muted' as const, label: 'Skipped' },
  error: { variant: 'danger' as const, label: 'Error' },
}

export function ImportCustomersDialog({ open, onOpenChange }: ImportCustomersDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportRowResult[] | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)

  function reset() {
    setFileName(null)
    setRows(null)
    setTruncated(false)
    setOutcome(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFile(file: File) {
    setParsing(true)
    setOutcome(null)
    setFileName(file.name)
    try {
      const { rows: raw, truncated: wasTruncated } = await parseImportFile(file)
      setTruncated(wasTruncated)

      const [{ data: locations }, { data: profiles }] = await Promise.all([
        supabase.from('locations').select('id, name'),
        supabase.from('profiles').select('id, email').not('email', 'is', null),
      ])

      const locationsByName = new Map((locations ?? []).map((l) => [l.name.toLowerCase(), l.id]))
      const profilesByEmail = new Map((profiles ?? []).filter((p) => p.email).map((p) => [p.email!.toLowerCase(), p.id]))

      // Normalize to E.164 before the lookup — the DB stores phone_primary
      // that way, and raw file values (e.g. "0921234567") wouldn't match it.
      const candidatePhones = raw
        .map((r) => (r.phone_primary ?? '').toString().trim())
        .filter(Boolean)
        .map((p) => toE164(p))
      const existingPhones = await fetchExistingPhones(candidatePhones)

      setRows(buildImportRows(raw, { locationsByName, profilesByEmail, existingPhones }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file')
      reset()
    } finally {
      setParsing(false)
    }
  }

  const importable = (rows ?? []).filter((r) => r.payload)
  const skipped = (rows ?? []).filter((r) => !r.payload)

  async function runImport() {
    if (importable.length === 0) return
    setImporting(true)
    try {
      const result = await insertImportRows(
        importable.map((r) => ({ rowNumber: r.rowNumber, displayName: r.displayName, payload: r.payload! })),
      )
      setOutcome(result)
      if (result.imported > 0) {
        await queryClient.invalidateQueries({ queryKey: ['customers'] })
        toast.success(`Imported ${result.imported} customer${result.imported === 1 ? '' : 's'}`)
      }
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} row(s) failed to import`)
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import customers</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!rows && (
            <>
              <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4 text-center">
                <UploadIcon className="mx-auto size-6 text-text-muted" />
                <p className="text-sm text-text-muted">
                  Upload a CSV or Excel file — up to {MAX_IMPORT_ROWS} rows, 5MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="mx-auto text-sm"
                  disabled={parsing}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleFile(file)
                  }}
                />
                {parsing && <p className="text-xs text-text-muted">Reading {fileName}…</p>}
              </div>
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={downloadCustomerImportTemplate}>
                <DownloadIcon /> Download template
              </Button>
              <p className="text-xs text-text-muted">
                Only <code>full_name</code> (or <code>business_name</code>) and <code>phone_primary</code> are required —
                everything else is optional and defaults sensibly. Rows with a phone that already exists are skipped
                automatically, never overwritten.
              </p>
            </>
          )}

          {rows && rows.length === 0 && !outcome && (
            <>
              <p className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-muted">
                No rows found in that file — check it has a header row and at least one data row.
              </p>
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={reset}>
                Choose a different file
              </Button>
            </>
          )}

          {rows && rows.length > 0 && !outcome && (
            <>
              {truncated && (
                <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                  This file has more than {MAX_IMPORT_ROWS} rows — only the first {MAX_IMPORT_ROWS} were read.
                </p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="success">{importable.length} ready to import</Badge>
                {skipped.length > 0 && <Badge variant="muted">{skipped.length} skipped</Badge>}
              </div>
              <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-2 text-text-muted">
                    <tr>
                      <th className="px-2 py-1.5">Row</th>
                      <th className="px-2 py-1.5">Name</th>
                      <th className="px-2 py-1.5">Phone</th>
                      <th className="px-2 py-1.5">Status</th>
                      <th className="px-2 py-1.5">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr key={r.rowNumber}>
                        <td className="px-2 py-1.5 text-text-muted">{r.rowNumber}</td>
                        <td className="px-2 py-1.5 text-text">{r.displayName}</td>
                        <td className="px-2 py-1.5 text-text-muted">{r.phone || '—'}</td>
                        <td className="px-2 py-1.5">
                          <Badge variant={LEVEL_BADGE[r.level].variant} className="text-[10px]">
                            {LEVEL_BADGE[r.level].label}
                          </Badge>
                        </td>
                        <td className="px-2 py-1.5 text-text-muted">{r.messages.join(' ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="ghost" size="sm" className="self-start" onClick={reset} disabled={importing}>
                Choose a different file
              </Button>
            </>
          )}

          {outcome && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2Icon className="size-4 shrink-0" />
                Imported {outcome.imported} customer{outcome.imported === 1 ? '' : 's'}.
              </div>
              {outcome.failed.length > 0 && (
                <div className="flex flex-col gap-1 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  <div className="flex items-center gap-2 font-medium">
                    <XCircleIcon className="size-4 shrink-0" /> {outcome.failed.length} row(s) failed
                  </div>
                  {outcome.failed.map((f) => (
                    <p key={f.rowNumber}>
                      Row {f.rowNumber} ({f.displayName}): {f.message}
                    </p>
                  ))}
                </div>
              )}
              {skipped.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-muted">
                  <AlertTriangleIcon className="size-4 shrink-0" /> {skipped.length} row(s) were skipped (duplicates or
                  errors) — see the preview above for details.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            {outcome ? 'Close' : 'Cancel'}
          </Button>
          {rows && rows.length > 0 && !outcome && (
            <Button type="button" onClick={() => void runImport()} disabled={importing || importable.length === 0}>
              {importing ? 'Importing…' : `Import ${importable.length} customer${importable.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
