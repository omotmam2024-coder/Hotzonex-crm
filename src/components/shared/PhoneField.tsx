import * as React from 'react'
import { Input } from '@/components/ui/input'
import { toE164 } from '@/lib/format'

/** A phone input that normalizes to E.164 (+211...) on blur, matching how numbers are stored. */
const PhoneField = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ onBlur, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="tel"
        placeholder="+211 9XX XXX XXX"
        onBlur={(e) => {
          const normalized = e.target.value.trim() ? toE164(e.target.value) : ''
          if (normalized !== e.target.value) {
            e.target.value = normalized
            e.target.dispatchEvent(new Event('input', { bubbles: true }))
          }
          onBlur?.(e)
        }}
        {...props}
      />
    )
  },
)
PhoneField.displayName = 'PhoneField'

export { PhoneField }
