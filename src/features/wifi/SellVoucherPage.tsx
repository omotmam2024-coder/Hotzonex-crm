import { useQueryClient } from '@tanstack/react-query'
import { PrinterIcon, SearchIcon, TicketIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { Receipt } from '@/components/shared/Receipt'
import { useAuth } from '@/hooks/useAuth'
import { useSettingValue } from '@/hooks/useSettingValue'
import { formatDateTime, formatMoney, whatsappLink } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type PaymentMethod = Database['public']['Enums']['payment_method']

interface VoucherLookup {
  id: string
  code: string
  status: Database['public']['Enums']['voucher_status']
  plan_id: string
  location_id: string | null
  service_plans: { name: string; price_ssp: number; price_usd: number | null } | null
}

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

interface SoldReceipt {
  voucherCode: string
  planName: string
  price: number
  currency: 'SSP'
  paymentNumber: string
  customerName: string | null
  customerPhone: string | null
  soldAt: string
}

export function SellVoucherPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: company } = useSettingValue('company', { name: 'Hotzonex' } as { name: string })
  const [codeInput, setCodeInput] = useState('')
  const [voucher, setVoucher] = useState<VoucherLookup | null>(null)
  const [looking, setLooking] = useState(false)
  const [price, setPrice] = useState<string>('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const [selling, setSelling] = useState(false)
  const [receipt, setReceipt] = useState<SoldReceipt | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)

  async function lookupCode() {
    const code = codeInput.trim().toUpperCase()
    if (!code) return
    setLooking(true)
    setVoucher(null)
    setReceipt(null)
    const { data, error } = await supabase
      .from('vouchers')
      .select('id, code, status, plan_id, location_id, service_plans(name, price_ssp, price_usd)')
      .eq('code', code)
      .maybeSingle()
    setLooking(false)
    if (error) {
      toast.error(error.message)
      return
    }
    if (!data) {
      toast.error('Voucher code not found')
      return
    }
    if (data.status !== 'available' && data.status !== 'allocated') {
      toast.error(`This voucher is already ${data.status}`)
      return
    }
    setVoucher(data as unknown as VoucherLookup)
    setPrice(String(data.service_plans?.price_ssp ?? 0))
  }

  async function sell() {
    if (!voucher) return
    const priceNum = Number(price)
    if (!priceNum || priceNum <= 0) {
      toast.error('Enter a valid price')
      return
    }
    setSelling(true)
    const { data, error } = await supabase.rpc('fn_sell_voucher', {
      p_code: voucher.code,
      p_price: priceNum,
      p_customer_id: customer?.id ?? undefined,
      p_method: method,
      p_location_id: voucher.location_id ?? undefined,
    })
    setSelling(false)
    if (error) {
      toast.error(error.message)
      return
    }
    const result = data as { payment_number: string }
    setReceipt({
      voucherCode: voucher.code,
      planName: voucher.service_plans?.name ?? '',
      price: priceNum,
      currency: 'SSP',
      paymentNumber: result.payment_number,
      customerName: customer?.display_name ?? null,
      customerPhone: customer?.phone_primary ?? null,
      soldAt: new Date().toISOString(),
    })
    toast.success('Voucher sold')
    await queryClient.invalidateQueries({ queryKey: ['vouchers'] })
    setVoucher(null)
    setCodeInput('')
    setCustomer(null)
    setPrice('')
  }

  function printReceipt() {
    window.print()
  }

  function sendWhatsapp() {
    if (!receipt?.customerPhone) return
    const message = `Thank you! Receipt ${receipt.paymentNumber}\nVoucher: ${receipt.voucherCode}\nPlan: ${receipt.planName}\nAmount: ${formatMoney(receipt.price, 'SSP')}\n— ${company?.name ?? 'Hotzonex'}`
    window.open(whatsappLink(receipt.customerPhone, message), '_blank', 'noreferrer')
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold text-text">Sell a voucher</h1>

      <Card className="no-print">
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="voucherCode">Voucher code</Label>
            <div className="flex gap-2">
              <Input
                id="voucherCode"
                autoFocus
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="Scan or type code"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void lookupCode()
                  }
                }}
              />
              <Button onClick={() => void lookupCode()} disabled={looking || !codeInput.trim()}>
                <SearchIcon className="size-4" />
              </Button>
            </div>
          </div>

          {voucher && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-text">{voucher.service_plans?.name}</p>
                  <p className="text-xs text-text-muted">{voucher.code}</p>
                </div>
                <Badge variant="info">{voucher.status}</Badge>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="price">Price (SSP)</Label>
                <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
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
                    <SelectItem value="credit">Credit (on account)</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Customer (optional but encouraged)</Label>
                <CustomerPicker value={customer} onChange={setCustomer} />
              </div>

              <Button onClick={() => void sell()} disabled={selling}>
                {selling ? 'Selling…' : `Sell for ${formatMoney(Number(price) || 0, 'SSP')}`}
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
              title="Voucher Receipt"
              number={receipt.paymentNumber}
              date={formatDateTime(receipt.soldAt)}
              lines={[
                { label: 'Voucher', value: receipt.voucherCode },
                { label: 'Plan', value: receipt.planName },
                { label: 'Customer', value: receipt.customerName ?? 'Walk-in' },
                { label: 'Sold by', value: profile?.full_name ?? '' },
              ]}
              amountLabel="Total"
              amountValue={formatMoney(receipt.price, receipt.currency)}
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

      {!voucher && !receipt && (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-text-muted">
          <TicketIcon className="size-8" />
          <p className="text-sm">Scan or type a voucher code to begin.</p>
        </div>
      )}
    </div>
  )
}
