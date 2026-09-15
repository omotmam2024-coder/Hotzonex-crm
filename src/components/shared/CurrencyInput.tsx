import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Database } from '@/types/database'

type CurrencyCode = Database['public']['Enums']['currency_code']

interface CurrencyInputProps {
  amount: number | null;
  onAmountChange: (value: number | null) => void
  currency: CurrencyCode
  onCurrencyChange: (value: CurrencyCode) => void
  disabled?: boolean
  id?: string
}

/** Amount + currency together — every monetary field carries an explicit currency (never a naked number). */
export function CurrencyInput({
  amount,
  onAmountChange,
  currency,
  onCurrencyChange,
  disabled,
  id,
}: CurrencyInputProps) {
  return (
    <div className="flex gap-2">
      <Select value={currency} onValueChange={(v) => onCurrencyChange(v as CurrencyCode)} disabled={disabled}>
        <SelectTrigger className="w-24 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="SSP">SSP</SelectItem>
          <SelectItem value="USD">USD</SelectItem>
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        disabled={disabled}
        value={amount ?? ''}
        onChange={(e) => onAmountChange(e.target.value === '' ? null : Number(e.target.value))}
        className="flex-1"
      />
    </div>
  )
}
