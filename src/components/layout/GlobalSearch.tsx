import { useQuery } from '@tanstack/react-query'
import { BriefcaseIcon, SearchIcon, UsersIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useDebounced } from '@/hooks/useDebounced'
import { formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 350)
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const { data } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: async () => {
      const term = debounced.trim()
      if (!term) return { customers: [], deals: [] }
      const [customersRes, dealsRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, display_name, phone_primary, customer_code')
          .or(`display_name.ilike.%${term}%,phone_primary.ilike.%${term}%,customer_code.ilike.%${term}%`)
          .limit(8),
        supabase
          .from('deals')
          .select('id, title, value, currency, deal_code')
          .ilike('title', `%${term}%`)
          .limit(8),
      ])
      return { customers: customersRes.data ?? [], deals: dealsRes.data ?? [] }
    },
    enabled: open && debounced.trim().length >= 2,
  })

  function go(path: string) {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 md:w-56 md:justify-start md:gap-2 md:px-3"
        aria-label="Search"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="hidden text-sm md:inline">Search customers, deals…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted md:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Global search">
        <CommandInput placeholder="Search customers, deals…" value={query} onValueChange={setQuery} />
        <CommandList>
          {debounced.trim().length < 2 ? (
            <CommandEmpty>Type at least 2 characters…</CommandEmpty>
          ) : !data || (data.customers.length === 0 && data.deals.length === 0) ? (
            <CommandEmpty>No results.</CommandEmpty>
          ) : (
            <>
              {data.customers.length > 0 && (
                <CommandGroup heading="Customers">
                  {data.customers.map((c) => (
                    <CommandItem key={c.id} value={`customer-${c.id}`} onSelect={() => go(`/customers/${c.id}`)}>
                      <UsersIcon className="size-4 text-text-muted" />
                      <span className="flex-1 truncate">{c.display_name}</span>
                      <span className="text-xs text-text-muted">{c.phone_primary}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {data.deals.length > 0 && (
                <CommandGroup heading="Deals">
                  {data.deals.map((d) => (
                    <CommandItem key={d.id} value={`deal-${d.id}`} onSelect={() => go(`/pipeline?deal=${d.id}`)}>
                      <BriefcaseIcon className="size-4 text-text-muted" />
                      <span className="flex-1 truncate">{d.title}</span>
                      <span className="text-xs text-text-muted">{formatMoney(d.value, d.currency)}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
