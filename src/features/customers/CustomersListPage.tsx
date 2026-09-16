import type { ColumnDef } from '@tanstack/react-table'
import { PlusIcon, SearchIcon, UploadIcon, UsersIcon } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { PhoneActions } from '@/components/shared/PhoneActions'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useDebounced } from '@/hooks/useDebounced'
import { useProfiles } from '@/hooks/useProfiles'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { CustomerFormDialog } from './CustomerFormDialog'
import { type CustomersFilters, useCustomersList } from './useCustomersList'

// The xlsx parsing library this dialog needs is sizeable — lazy-load it so
// the Customers list (a primary nav page most staff hit constantly) never
// pays for it unless someone actually opens Import, same as the export
// tooling elsewhere in the app.
const ImportCustomersDialog = lazy(() =>
  import('./ImportCustomersDialog').then((m) => ({ default: m.ImportCustomersDialog })),
)

interface CustomerRow {
  id: string
  customer_code: string | null
  display_name: string | null
  phone_primary: string
  type: string
  status: string
  business_units: string[]
  tags: string[]
  created_at: string
}

export function CustomersListPage() {
  const UNIT_LABEL = useUnitLabels()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canWrite = can(profile, 'create')
  const [searchInput, setSearchInput] = useState('')
  const [businessUnit, setBusinessUnit] = useState<CustomersFilters['businessUnit']>('all')
  const [status, setStatus] = useState<CustomersFilters['status']>('all')
  const [ownerId, setOwnerId] = useState<CustomersFilters['ownerId']>('all')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const debouncedSearch = useDebounced(searchInput, 350)
  const { data: profiles } = useProfiles()

  const filters = useMemo<CustomersFilters>(
    () => ({ search: debouncedSearch, businessUnit, status, ownerId, locationId: 'all', tag: 'all' }),
    [debouncedSearch, businessUnit, status, ownerId],
  )

  const { data, isLoading, isError, refetch, isFetching } = useCustomersList(filters, page)

  const columns: ColumnDef<CustomerRow, unknown>[] = useMemo(
    () => [
      {
        header: 'Customer',
        accessorKey: 'display_name',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-text">{row.original.display_name}</span>
            <span className="text-xs text-text-muted">{row.original.customer_code}</span>
          </div>
        ),
      },
      {
        header: 'Phone',
        accessorKey: 'phone_primary',
        cell: ({ row }) => <PhoneActions phone={row.original.phone_primary} />,
      },
      {
        header: 'Units',
        accessorKey: 'business_units',
        cell: ({ row }) => (
          <div className="flex gap-1">
            {row.original.business_units.map((u) => (
              <Badge key={u} variant="muted">
                {UNIT_LABEL[u as keyof typeof UNIT_LABEL] ?? u}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        header: 'Added',
        accessorKey: 'created_at',
        cell: ({ row }) => <span className="text-text-muted">{formatDate(row.original.created_at)}</span>,
      },
    ],
    [UNIT_LABEL],
  )

  return (
    <div className="flex flex-col">
      <div className="sticky top-14 z-20 flex flex-col gap-3 border-b border-border bg-bg p-4 no-print">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text">Customers</h1>
          <div className="flex items-center gap-2">
            {canWrite && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <UploadIcon /> Import
              </Button>
            )}
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon /> New customer
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              placeholder="Search name, phone, code or email…"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={businessUnit}
            onValueChange={(v) => {
              setBusinessUnit(v as typeof businessUnit)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-36">
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
            value={status}
            onValueChange={(v) => {
              setStatus(v as typeof status)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="dormant">Dormant</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
              <SelectItem value="blacklisted">Blacklisted</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={ownerId}
            onValueChange={(v) => {
              setOwnerId(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All owners</SelectItem>
              {profiles?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={debouncedSearch || businessUnit !== 'all' || status !== 'all' || ownerId !== 'all' ? 'No customers match' : 'No customers yet'}
          description={
            debouncedSearch || businessUnit !== 'all' || status !== 'all' || ownerId !== 'all'
              ? 'Try a different search or clear your filters.'
              : 'Add your first customer to start tracking conversations, deals and billing.'
          }
          action={
            !(debouncedSearch || businessUnit !== 'all' || status !== 'all' || ownerId !== 'all') && (
              <Button onClick={() => setCreateOpen(true)}>
                <PlusIcon /> New customer
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data.rows as CustomerRow[]}
            getRowId={(row) => row.id}
            onRowClick={(row) => navigate(`/customers/${row.id}`)}
            renderCard={(row) => (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text">{row.display_name}</p>
                    <p className="text-xs text-text-muted">{row.customer_code}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>
                <PhoneActions phone={row.phone_primary} />
                <div className="flex flex-wrap gap-1">
                  {row.business_units.map((u) => (
                    <Badge key={u} variant="muted">
                      {UNIT_LABEL[u as keyof typeof UNIT_LABEL] ?? u}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          />
          <Pagination page={page} pageSize={25} total={data.total} onPageChange={setPage} />
          {isFetching && <p className="px-4 pb-2 text-xs text-text-muted">Refreshing…</p>}
        </>
      )}

      <CustomerFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(id) => navigate(`/customers/${id}`)}
      />
      {importOpen && (
        <Suspense fallback={null}>
          <ImportCustomersDialog open={importOpen} onOpenChange={setImportOpen} />
        </Suspense>
      )}
    </div>
  )
}
