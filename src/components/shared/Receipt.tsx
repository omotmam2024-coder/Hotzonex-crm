import { forwardRef } from 'react'

interface ReceiptLine {
  label: string
  value: string
}

interface ReceiptProps {
  companyName: string
  title: string
  number: string
  date: string
  lines: ReceiptLine[]
  amountLabel: string
  amountValue: string
  footer?: string
}

/** 58mm thermal receipt layout — only visible on screen inside a preview; the print stylesheet isolates it on paper. */
export const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(function Receipt(
  { companyName, title, number, date, lines, amountLabel, amountValue, footer },
  ref,
) {
  return (
    <div ref={ref} className="receipt mx-auto w-[58mm] bg-white p-2 text-[10px] leading-snug text-black">
      <p className="text-center text-xs font-bold">{companyName}</p>
      <p className="text-center">{title}</p>
      <div className="my-1 border-t border-dashed border-black" />
      <p>No: {number}</p>
      <p>Date: {date}</p>
      <div className="my-1 border-t border-dashed border-black" />
      {lines.map((l) => (
        <div key={l.label} className="flex justify-between gap-2">
          <span>{l.label}</span>
          <span>{l.value}</span>
        </div>
      ))}
      <div className="my-1 border-t border-dashed border-black" />
      <div className="flex justify-between gap-2 font-bold">
        <span>{amountLabel}</span>
        <span>{amountValue}</span>
      </div>
      {footer && <p className="mt-2 text-center">{footer}</p>}
    </div>
  )
})
