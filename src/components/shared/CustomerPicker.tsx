import { useQuery } from '@tanstack/react-query'
import { CheckIcon, ChevronsUpDownIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDebounced } from '@/hooks/useDebounced'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

interface CustomerPickerProps {
  value: CustomerOption | null
  onChange: (customer: CustomerOption | null) => void
  placeholder?: string
  disabled?: boolean
}

export function CustomerPicker({ value, onChange, placeholder = 'Search customers…', disabled }: CustomerPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounced(query, 350)

  const { data: options, isFetching } = useQuery({
    queryKey: ['customers', 'picker', debouncedQuery],
    queryFn: async () => {
      let q = supabase
        .from('customers')
        .select('id, display_name, phone_primary, customer_code')
        .order('created_at', { ascending: false })
        .limit(20)
      if (debouncedQuery.trim()) {
        q = q.or(
          `display_name.ilike.%${debouncedQuery}%,phone_primary.ilike.%${debouncedQuery}%,customer_code.ilike.%${debouncedQuery}%`,
        )
      }
      const { data, error } = await q
      if (error) throw error
      return data as CustomerOption[]
    },
    enabled: open,
    staleTime: 30_000,
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
          aria-expanded={open}
        >
          <span className={cn('truncate', !value && 'text-text-muted')}>
            {value ? `${value.display_name} · ${value.phone_primary}` : placeholder}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            placeholder="Name, phone or code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-text-muted">
              <Loader2Icon className="size-4 animate-spin" /> Searching…
            </div>
          ) : options && options.length > 0 ? (
            options.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-surface-2"
              >
                <span className="truncate">
                  <span className="text-text">{c.display_name}</span>{' '}
                  <span className="text-text-muted">{c.phone_primary}</span>
                </span>
                {value?.id === c.id && <CheckIcon className="size-4 shrink-0 text-accent" />}
              </button>
            ))
          ) : (
            <p className="px-2 py-6 text-center text-sm text-text-muted">No customers found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
