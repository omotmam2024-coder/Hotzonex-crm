import { useQueryClient } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, PrinterIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useSettingValue } from '@/hooks/useSettingValue'
import { APP_NAME } from '@/lib/appName'
import { can } from '@/lib/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { InvoiceFormDialog } from './InvoiceFormDialog'
import { PrintableInvoice } from './PrintableInvoice'
import { useInvoiceDetail, useInvoiceItems } from './useInvoices'

interface InvoiceDrawerProps {
  invoiceId: string | null
  onClose: () => void
}

const EDITABLE_STATUSES = ['draft', 'sent']

function printInvoice() {
  // The shared print stylesheet's @page rule is sized for 58mm thermal
  // receipts; injecting a scoped override just for this print call lets a
  // full itemized invoice print at normal page size without changing that
  // shared rule (which would break receipt printing elsewhere). window.print()
  // doesn't reliably block until the print dialog closes across browsers, so
  // the override is removed on the 'afterprint' event rather than right after
  // the call — removing it too early can let pagination read the old rule.
  const style = document.createElement('style')
  style.textContent = '@page { size: auto; margin: 14mm; }'
  document.head.appendChild(style)
  function cleanup() {
    style.remove()
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

export function InvoiceDrawer({ invoiceId, onClose }: InvoiceDrawerProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: invoice, refetch } = useInvoiceDetail(invoiceId)
  const { data: items, refetch: refetchItems } = useInvoiceItems(invoiceId)
  const { data: company } = useSettingValue('company', { name: APP_NAME } as { name: string })
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [newLine, setNewLine] = useState({ description: '', quantity: '1', unitPrice: '0', discount: '0' })
  const [addingLine, setAddingLine] = useState(false)

  const canWrite = can(profile, 'create')
  const canDelete = can(profile, 'delete')
  const editable = !!invoice && EDITABLE_STATUSES.includes(invoice.status)

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      refetch(),
      refetchItems(),
    ])
  }

  async function updateLine(id: string, patch: { quantity?: number; unit_price?: number; discount?: number; description?: string }) {
    const { error } = await supabase.from('invoice_items').update(patch).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function removeLine(id: string) {
    const { error } = await supabase.from('invoice_items').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function addLine() {
    if (!invoiceId || !newLine.description.trim()) return
    setAddingLine(true)
    const { error } = await supabase.from('invoice_items').insert({
      invoice_id: invoiceId,
      description: newLine.description.trim(),
      quantity: Number(newLine.quantity) || 1,
      unit_price: Number(newLine.unitPrice) || 0,
      discount: Number(newLine.discount) || 0,
      sort_order: items?.length ?? 0,
    })
    setAddingLine(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setNewLine({ description: '', quantity: '1', unitPrice: '0', discount: '0' })
    await invalidateAll()
  }

  async function updateHeader(patch: { due_date?: string; notes?: string | null; terms?: string | null }) {
    if (!invoiceId) return
    const { error } = await supabase.from('invoices').update(patch).eq('id', invoiceId)
    if (error) {
      toast.error(error.message)
      return
    }
    await invalidateAll()
  }

  async function deleteInvoice() {
    if (!invoiceId) return
    setDeleting(true)
    const { error } = await supabase.from('invoices').update({ deleted_at: new Date().toISOString() }).eq('id', invoiceId)
    setDeleting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Invoice deleted')
    setDeleteOpen(false)
    await queryClient.invalidateQueries({ queryKey: ['invoices'] })
    onClose()
  }

  return (
    <Sheet open={!!invoiceId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg">
        {invoice && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle>{invoice.invoice_number}</SheetTitle>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-xs text-text-muted">
                {invoice.customers?.display_name} · {invoice.customers?.phone_primary}
              </p>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-surface-2 p-3 text-sm">
              <div>
                <p className="text-text-muted">Issue date</p>
                <p className="text-text">{formatDate(invoice.issue_date)}</p>
              </div>
              <div>
                <p className="text-text-muted">Due date</p>
                {editable ? (
                  <Input
                    type="date"
                    defaultValue={invoice.due_date}
                    className="h-8"
                    onBlur={(e) => e.target.value !== invoice.due_date && void updateHeader({ due_date: e.target.value })}
                  />
                ) : (
                  <p className="text-text">{formatDate(invoice.due_date)}</p>
                )}
              </div>
              <div>
                <p className="text-text-muted">Subtotal</p>
                <p className="text-text">{formatMoney(invoice.subtotal, invoice.currency)}</p>
              </div>
              <div>
                <p className="text-text-muted">Total</p>
                <p className="font-semibold text-text">{formatMoney(invoice.total, invoice.currency)}</p>
              </div>
              <div>
                <p className="text-text-muted">Paid</p>
                <p className="text-success">{formatMoney(invoice.amount_paid, invoice.currency)}</p>
              </div>
              <div>
                <p className="text-text-muted">Balance due</p>
                <p className="font-semibold text-danger">{formatMoney(invoice.total - invoice.amount_paid, invoice.currency)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Label>Line items</Label>
              {items?.map((it) => (
                <div key={it.id} className="flex flex-col gap-1.5 rounded-lg border border-border p-2.5">
                  {editable ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          defaultValue={it.description}
                          className="flex-1"
                          onBlur={(e) => e.target.value !== it.description && void updateLine(it.id, { description: e.target.value })}
                        />
                        <Button variant="ghost" size="icon" className="text-danger" onClick={() => void removeLine(it.id)}>
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={it.quantity}
                          onBlur={(e) => Number(e.target.value) !== it.quantity && void updateLine(it.id, { quantity: Number(e.target.value) || 0 })}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={it.unit_price}
                          onBlur={(e) => Number(e.target.value) !== it.unit_price && void updateLine(it.id, { unit_price: Number(e.target.value) || 0 })}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={it.discount}
                          onBlur={(e) => Number(e.target.value) !== it.discount && void updateLine(it.id, { discount: Number(e.target.value) || 0 })}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text">
                        {it.description} × {it.quantity}
                      </span>
                      <span className="text-text">{formatMoney(it.line_total, invoice.currency)}</span>
                    </div>
                  )}
                </div>
              ))}

              {editable && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border p-2.5">
                  <Input
                    placeholder="New line description"
                    value={newLine.description}
                    onChange={(e) => setNewLine((n) => ({ ...n, description: e.target.value }))}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      value={newLine.quantity}
                      onChange={(e) => setNewLine((n) => ({ ...n, quantity: e.target.value }))}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unit price"
                      value={newLine.unitPrice}
                      onChange={(e) => setNewLine((n) => ({ ...n, unitPrice: e.target.value }))}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Discount"
                      value={newLine.discount}
                      onChange={(e) => setNewLine((n) => ({ ...n, discount: e.target.value }))}
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" disabled={addingLine || !newLine.description.trim()} onClick={() => void addLine()}>
                    <PlusIcon className="size-4" /> Add line
                  </Button>
                </div>
              )}
            </div>

            {editable && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invoice-notes">Notes</Label>
                <Textarea
                  id="invoice-notes"
                  rows={2}
                  defaultValue={invoice.notes ?? ''}
                  onBlur={(e) => e.target.value !== (invoice.notes ?? '') && void updateHeader({ notes: e.target.value || null })}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border pt-3 no-print">
              <Button variant="outline" onClick={printInvoice}>
                <PrinterIcon className="size-4" /> Print
              </Button>
              {canWrite && editable && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <PencilIcon className="size-4" /> Edit
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2Icon className="size-4" /> Delete
                </Button>
              )}
            </div>

            {items && <PrintableInvoice companyName={company?.name || APP_NAME} invoice={invoice} items={items} />}

            <ConfirmDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title="Delete this invoice?"
              description={`${invoice.invoice_number} will be removed from every list and report. Payments already recorded against it are kept.`}
              requireTypedConfirmation={invoice.invoice_number ?? undefined}
              confirmLabel="Delete invoice"
              variant="destructive"
              loading={deleting}
              onConfirm={deleteInvoice}
            />

            <InvoiceFormDialog open={editOpen} onOpenChange={setEditOpen} invoiceId={invoiceId ?? undefined} />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
