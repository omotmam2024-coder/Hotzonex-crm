import { formatDate, formatMoney } from '@/lib/format'
import type { InvoiceItemRow } from './useInvoices'

type CurrencyCode = 'SSP' | 'USD'

interface PrintableInvoiceProps {
  companyName: string
  invoice: {
    invoice_number: string | null
    issue_date: string
    due_date: string
    currency: CurrencyCode
    subtotal: number
    discount: number
    tax: number
    total: number
    amount_paid: number
    notes: string | null
    terms: string | null
    customers: { display_name: string | null; phone_primary: string } | null
  }
  items: InvoiceItemRow[]
}

/** Full-page itemized invoice, shown only in print (see .invoice-print in styles/index.css). */
export function PrintableInvoice({ companyName, invoice, items }: PrintableInvoiceProps) {
  const balance = invoice.total - invoice.amount_paid

  return (
    <div className="invoice-print mx-auto w-full max-w-2xl">
      <div className="flex items-start justify-between border-b border-black/20 pb-4">
        <div>
          <h1 className="text-lg font-bold">{companyName}</h1>
          <p className="text-sm">Invoice {invoice.invoice_number}</p>
        </div>
        <div className="text-right text-sm">
          <p>Issue date: {formatDate(invoice.issue_date)}</p>
          <p>Due date: {formatDate(invoice.due_date)}</p>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <p className="font-semibold">Bill to</p>
        <p>{invoice.customers?.display_name ?? 'Unknown customer'}</p>
        <p>{invoice.customers?.phone_primary}</p>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b border-black/20 text-left">
            <th className="py-1 font-semibold">Description</th>
            <th className="py-1 text-right font-semibold">Qty</th>
            <th className="py-1 text-right font-semibold">Unit price</th>
            <th className="py-1 text-right font-semibold">Discount</th>
            <th className="py-1 text-right font-semibold">Line total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-black/10">
              <td className="py-1">{it.description}</td>
              <td className="py-1 text-right">{it.quantity}</td>
              <td className="py-1 text-right">{formatMoney(it.unit_price, invoice.currency)}</td>
              <td className="py-1 text-right">{formatMoney(it.discount, invoice.currency)}</td>
              <td className="py-1 text-right">{formatMoney(it.line_total, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="flex w-56 flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatMoney(invoice.discount, invoice.currency)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatMoney(invoice.tax, invoice.currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-black/20 pt-1 font-semibold">
            <span>Total</span>
            <span>{formatMoney(invoice.total, invoice.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid</span>
            <span>{formatMoney(invoice.amount_paid, invoice.currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Balance due</span>
            <span>{formatMoney(balance, invoice.currency)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <p className="mt-4 text-sm">
          <span className="font-semibold">Notes: </span>
          {invoice.notes}
        </p>
      )}
      {invoice.terms && (
        <p className="mt-2 text-sm">
          <span className="font-semibold">Terms: </span>
          {invoice.terms}
        </p>
      )}
    </div>
  )
}
