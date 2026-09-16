import { FileTextIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useDebounced } from '@/hooks/useDebounced'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { can } from '@/lib/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { InvoiceDrawer } from './InvoiceDrawer'
import { InvoiceFormDialog } from './InvoiceFormDialog'
import { INVOICES_PAGE_SIZE, useInvoices, type InvoicesFilters } from './useInvoices'

const DEFAULT_FILTERS: InvoicesFilters = { search: '', status: 'all', businessUnit: 'all' }

export function InvoicesPage() {
  const { profile } = useAuth()
  const UNIT_LABEL = useUnitLabels()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<InvoicesFilters>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounced(searchInput, 350)
  const [page, setPage] = useState(1)
  const [newOpen, setNewOpen] = useState(false)

  const openInvoice = searchParams.get('invoice')
  const activeFilters: InvoicesFilters = { ...filters, search: debouncedSearch }
  const { data, isLoading, isError, refetch } = useInvoices(activeFilters, page)
  const canWrite = can(profile, 'create')

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b border-border bg-bg p-4 no-print">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text">Invoices</h1>
          {canWrite && (
            <Button onClick={() => setNewOpen(true)}>
              <PlusIcon /> New invoice
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.businessUnit}
            onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, businessUnit: v as InvoicesFilters['businessUnit'] })) }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All units</SelectItem>
              <SelectItem value="wifi">{UNIT_LABEL.wifi}</SelectItem>
              <SelectItem value="services">{UNIT_LABEL.services}</SelectItem>
              <SelectItem value="refreshment">{UNIT_LABEL.refreshment}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(v) => { setPage(1); setFilters((f) => ({ ...f, status: v as InvoicesFilters['status'] })) }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search invoice number…"
              value={searchInput}
              onChange={(e) => { setPage(1); setSearchInput(e.target.value) }}
              className="w-56 pl-9"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon={FileTextIcon} title="No invoices found" description="Try adjusting the filters." />
      ) : (
        <div className="flex flex-col">
          <div className="flex flex-col gap-2 p-3">
            {data.rows.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSearchParams({ invoice: inv.id })}
                className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-medium text-text">{inv.invoice_number}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {inv.customers?.display_name ?? 'Unknown customer'} · Due {formatDate(inv.due_date)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-text">{formatMoney(inv.total, inv.currency)}</p>
                  {inv.status !== 'paid' && inv.status !== 'void' && inv.total > inv.amount_paid && (
                    <p className="text-xs text-danger">{formatMoney(inv.total - inv.amount_paid, inv.currency)} due</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <Pagination page={page} pageSize={INVOICES_PAGE_SIZE} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <InvoiceDrawer invoiceId={openInvoice} onClose={() => setSearchParams({})} />
      <InvoiceFormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultBusinessUnit={filters.businessUnit === 'all' ? undefined : filters.businessUnit}
      />
    </div>
  )
}
