import { useQueryClient } from '@tanstack/react-query'
import { PrinterIcon, ReceiptIcon } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { Receipt } from '@/components/shared/Receipt'
import { useAuth } from '@/hooks/useAuth'
import { useSettingValue } from '@/hooks/useSettingValue'
import { formatDate, formatDateTime, formatMoney, whatsappLink } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useCustomerOpenInvoices } from './useInvoices'

type PaymentMethod = Database['public']['Enums']['payment_method']

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

interface PaidReceipt {
  paymentNumber: string
  amount: number
  currency: 'SSP' | 'USD'
  customerName: string | null
  customerPhone: string | null
  paidAt: string
  invoiceNumbers: string[]
}

export function RecordPaymentPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: company } = useSettingValue('company', { name: 'Hotzonex' } as { name: string })
  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [allocations, setAllocations] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [receipt, setReceipt] = useState<PaidReceipt | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  const { data: openInvoices } = useCustomerOpenInvoices(customer?.id ?? null)

  const allocatedTotal = useMemo(
    () => Object.values(allocations).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [allocations],
  )

  function toggleInvoice(invoiceId: string, balance: number, checked: boolean) {
    setAllocations((prev) => {
      const next = { ...prev }
      if (checked) next[invoiceId] = balance.toFixed(2)
      else delete next[invoiceId]
      return next
    })
  }

  async function submit() {
    if (!customer) {
      toast.error('Pick a customer')
      return
    }
    const amountNum = Number(amount)
    if (!amountNum || amountNum <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (allocatedTotal > amountNum) {
      toast.error('Allocated amount exceeds the payment amount')
      return
    }
    const allocationsPayload = Object.entries(allocations)
      .filter(([, v]) => Number(v) > 0)
      .map(([invoice_id, v]) => ({ invoice_id, amount: Number(v) }))

    setSaving(true)
    const { data, error } = await supabase.rpc('fn_record_payment', {
      p_customer_id: customer.id,
      p_amount: amountNum,
      p_method: method,
      p_allocations: allocationsPayload,
      p_reference: reference.trim() || undefined,
      p_notes: notes.trim() || undefined,
    })
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }

    const { data: payment } = await supabase.from('payments').select('payment_number').eq('id', data as string).single()

    setReceipt({
      paymentNumber: payment?.payment_number ?? '—',
      amount: amountNum,
      currency: 'SSP',
      customerName: customer.display_name,
      customerPhone: customer.phone_primary,
      paidAt: new Date().toISOString(),
      invoiceNumbers: openInvoices?.filter((i) => allocations[i.id]).map((i) => i.invoice_number ?? '') ?? [],
    })
    toast.success('Payment recorded')
    await queryClient.invalidateQueries({ queryKey: ['invoices'] })
    setCustomer(null)
    setAmount('')
    setReference('')
    setNotes('')
    setAllocations({})
  }

  function printReceipt() {
    window.print()
  }

  function sendWhatsapp() {
    if (!receipt?.customerPhone) return
    const message = `Thank you! Receipt ${receipt.paymentNumber}\nAmount: ${formatMoney(receipt.amount, receipt.currency)}${receipt.invoiceNumbers.length ? `\nInvoices: ${receipt.invoiceNumbers.join(', ')}` : ''}\n— ${company?.name ?? 'Hotzonex'}`
    window.open(whatsappLink(receipt.customerPhone, message), '_blank', 'noreferrer')
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 md:p-6">
      <h2 className="text-lg font-semibold text-text">Record a payment</h2>

      <Card className="no-print">
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label>Customer</Label>
            <CustomerPicker value={customer} onChange={setCustomer} />
          </div>

          {customer && (
            <>
              {openInvoices && openInvoices.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label>Apply to invoices (optional)</Label>
                  {openInvoices.map((inv) => {
                    const balance = inv.total - inv.amount_paid
                    const checked = inv.id in allocations
                    return (
                      <div key={inv.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                        <Checkbox checked={checked} onCheckedChange={(v) => toggleInvoice(inv.id, balance, !!v)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text">{inv.invoice_number}</p>
                          <p className="text-xs text-text-muted">
                            Due {formatDate(inv.due_date)} · Balance {formatMoney(balance, inv.currency)}
                          </p>
                        </div>
                        {checked && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-24"
                            value={allocations[inv.id]}
                            onChange={(e) => setAllocations((prev) => ({ ...prev, [inv.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount">Amount received (SSP)</Label>
                <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {allocatedTotal > 0 && (
                  <p className="text-xs text-text-muted">
                    Allocated {formatMoney(allocatedTotal, 'SSP')}
                    {Number(amount) > allocatedTotal ? ` · ${formatMoney(Number(amount) - allocatedTotal, 'SSP')} unapplied credit` : ''}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Payment method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="agent_code">Agent Code</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reference">Reference (optional)</Label>
                <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? 'Recording…' : `Record ${formatMoney(Number(amount) || 0, 'SSP')}`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {receipt && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-4">
            <Receipt
              ref={receiptRef}
              companyName={company?.name ?? 'Hotzonex'}
              title="Payment Receipt"
              number={receipt.paymentNumber}
              date={formatDateTime(receipt.paidAt)}
              lines={[
                { label: 'Customer', value: receipt.customerName ?? 'Walk-in' },
                ...(receipt.invoiceNumbers.length ? [{ label: 'Invoices', value: receipt.invoiceNumbers.join(', ') }] : []),
                { label: 'Received by', value: profile?.full_name ?? '' },
              ]}
              amountLabel="Amount"
              amountValue={formatMoney(receipt.amount, receipt.currency)}
              footer="Thank you for choosing Hotzonex"
            />
            <div className="flex gap-2 no-print">
              <Button variant="outline" onClick={printReceipt}>
                <PrinterIcon className="size-4" /> Print
              </Button>
              {receipt.customerPhone && (
                <Button variant="outline" onClick={sendWhatsapp}>
                  WhatsApp receipt
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!customer && !receipt && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-text-muted">
          <ReceiptIcon className="size-8" />
          <p className="text-sm">Pick a customer to record a payment.</p>
        </div>
      )}
    </div>
  )
}
