import {
  AlertTriangleIcon,
  CalendarClockIcon,
  FileSignatureIcon,
  HeadsetIcon,
  ListTodoIcon,
  PackageIcon,
  ReceiptTextIcon,
  TicketPercentIcon,
  UserPlusIcon,
  UsersIcon,
  WifiOffIcon,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatTile } from '@/components/shared/StatTile'
import { useActivityModal } from '@/features/activities/ActivityModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { canSeeUnit } from '@/lib/permissions'
import { formatDateTime, formatMoneyTotals } from '@/lib/format'
import {
  useBookingsThisWeek,
  useContractsRenewing,
  useLowVoucherStock,
  useMyTasksSummary,
  useNewCustomersThisWeek,
  useOverdueInvoices,
  useRevenueThisWeek,
  useSubscriptionsExpiring,
  useTicketsAttention,
} from './useDashboardData'

// Both dialogs pull in react-hook-form/zod validation plus their own
// pickers (CustomerPicker, PhoneField, TagPicker) — sizeable weight that
// every single session would otherwise pay for immediately, since the
// dashboard is the first page everyone lands on after signing in. Load
// them only once someone actually opens one.
const CustomerFormDialog = lazy(() =>
  import('@/features/customers/CustomerFormDialog').then((m) => ({ default: m.CustomerFormDialog })),
)
const TicketFormDialog = lazy(() => import('@/features/tickets/TicketFormDialog').then((m) => ({ default: m.TicketFormDialog })))

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
  technician: 'Technician',
  viewer: 'Viewer',
}

const UNIT_LABEL: Record<string, string> = { wifi: 'WiFi', services: 'Services', refreshment: 'Refreshment' }

function SectionLabel({ children }: { children: string }) {
  return <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wide">{children}</h2>
}

export function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { openLogActivity } = useActivityModal()
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [newTicketOpen, setNewTicketOpen] = useState(false)

  const showWifi = canSeeUnit(profile, 'wifi')
  const showServices = canSeeUnit(profile, 'services')
  const showRefreshment = canSeeUnit(profile, 'refreshment')

  const myTasks = useMyTasksSummary(profile?.id)
  const ticketsAttention = useTicketsAttention()
  const overdueInvoices = useOverdueInvoices()
  const lowStock = useLowVoucherStock(showWifi)
  const expiringSubs = useSubscriptionsExpiring(showWifi)
  const renewingContracts = useContractsRenewing(showServices)
  const upcomingBookings = useBookingsThisWeek(showRefreshment)
  const revenueWeek = useRevenueThisWeek()
  const newCustomersWeek = useNewCustomersThisWeek()

  if (!profile) return null

  const displayName = (profile.full_name || profile.email || 'there').split(' ')[0]
  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Welcome back, {displayName}</h1>
        <p className="text-sm text-text-muted">{todayLabel}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setNewCustomerOpen(true)}>
          <UserPlusIcon /> New customer
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/sell">
            <TicketPercentIcon /> Sell voucher
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => setNewTicketOpen(true)}>
          <HeadsetIcon /> New ticket
        </Button>
        <Button size="sm" variant="outline" onClick={() => openLogActivity()}>
          <ListTodoIcon /> Log activity
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>My day</SectionLabel>
        <Link
          to="/my-day"
          className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 hover:bg-surface-2"
        >
          <div className="min-w-0">
            {myTasks.isLoading ? (
              <p className="text-sm text-text-muted">Loading…</p>
            ) : myTasks.data && (myTasks.data.overdueCount > 0 || myTasks.data.dueTodayCount > 0) ? (
              <>
                <p className="text-sm font-medium text-text">
                  {myTasks.data.overdueCount > 0 && (
                    <span className="text-danger">{myTasks.data.overdueCount} overdue</span>
                  )}
                  {myTasks.data.overdueCount > 0 && myTasks.data.dueTodayCount > 0 && ' · '}
                  {myTasks.data.dueTodayCount > 0 && `${myTasks.data.dueTodayCount} due today`}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {myTasks.data.items
                    .slice(0, 3)
                    .map((t) => t.title)
                    .join(' · ')}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-muted">Nothing due — you&apos;re clear for today.</p>
            )}
          </div>
          <ListTodoIcon className="size-5 shrink-0 text-text-muted" />
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Needs attention</SectionLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <StatTile
            icon={HeadsetIcon}
            label="Tickets breached/urgent"
            value={ticketsAttention.data ? (ticketsAttention.data.capped ? `${ticketsAttention.data.count}+` : ticketsAttention.data.count) : '—'}
            loading={ticketsAttention.isLoading}
            tone={ticketsAttention.data && ticketsAttention.data.count > 0 ? 'danger' : 'default'}
            href="/tickets"
          />
          <StatTile
            icon={ReceiptTextIcon}
            label="Overdue invoices"
            value={overdueInvoices.data ? (overdueInvoices.data.capped ? `${overdueInvoices.data.count}+` : overdueInvoices.data.count) : '—'}
            sublabel={overdueInvoices.data && overdueInvoices.data.count > 0 ? formatMoneyTotals(overdueInvoices.data.totals) : undefined}
            loading={overdueInvoices.isLoading}
            tone={overdueInvoices.data && overdueInvoices.data.count > 0 ? 'danger' : 'default'}
            href="/billing"
          />
          {showWifi && (
            <StatTile
              icon={PackageIcon}
              label="Low voucher stock"
              value={lowStock.data?.count ?? '—'}
              loading={lowStock.isLoading}
              tone={lowStock.data && lowStock.data.count > 0 ? 'warning' : 'default'}
              href="/wifi"
            />
          )}
          {showWifi && (
            <StatTile
              icon={WifiOffIcon}
              label="Subscriptions expiring"
              value={expiringSubs.data ? (expiringSubs.data.capped ? `${expiringSubs.data.count}+` : expiringSubs.data.count) : '—'}
              loading={expiringSubs.isLoading}
              tone={expiringSubs.data && expiringSubs.data.count > 0 ? 'warning' : 'default'}
              href="/wifi"
            />
          )}
          {showServices && (
            <StatTile
              icon={FileSignatureIcon}
              label="Contracts renewing"
              value={renewingContracts.data ? (renewingContracts.data.capped ? `${renewingContracts.data.count}+` : renewingContracts.data.count) : '—'}
              loading={renewingContracts.isLoading}
              tone={renewingContracts.data && renewingContracts.data.count > 0 ? 'warning' : 'default'}
              href="/services"
            />
          )}
          {showRefreshment && (
            <StatTile
              icon={CalendarClockIcon}
              label="Bookings this week"
              value={upcomingBookings.data ? (upcomingBookings.data.capped ? `${upcomingBookings.data.count}+` : upcomingBookings.data.count) : '—'}
              loading={upcomingBookings.isLoading}
              href="/refreshment"
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SectionLabel>Last 7 days</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={ReceiptTextIcon}
            label="Revenue collected"
            value={revenueWeek.data ? formatMoneyTotals(revenueWeek.data) : '—'}
            loading={revenueWeek.isLoading}
            tone="success"
          />
          <StatTile icon={UsersIcon} label="New customers" value={newCustomersWeek.data ?? '—'} loading={newCustomersWeek.isLoading} href="/customers" />
        </div>
      </div>

      {ticketsAttention.data && ticketsAttention.data.items.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Tickets to look at</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {ticketsAttention.data.items.map((t) => (
              <Link
                key={t.id}
                to={`/tickets?ticket=${t.id}`}
                className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-2.5 text-sm hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-text">{t.subject}</p>
                  <p className="text-xs text-text-muted">
                    {t.ticket_number} · {t.priority}
                  </p>
                </div>
                {t.sla_resolve_due && (
                  <span className="shrink-0 text-xs text-danger">
                    <AlertTriangleIcon className="mr-1 inline size-3" />
                    {formatDateTime(t.sla_resolve_due)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-text-muted">
        Signed in as <span className="font-medium text-text">{ROLE_LABEL[profile.role] ?? profile.role}</span>
        {profile.business_units.length > 0 && (
          <> · {profile.business_units.map((u) => UNIT_LABEL[u] ?? u).join(', ')}</>
        )}
      </p>

      {newCustomerOpen && (
        <Suspense fallback={null}>
          <CustomerFormDialog
            open={newCustomerOpen}
            onOpenChange={setNewCustomerOpen}
            onSaved={(id) => navigate(`/customers/${id}`)}
          />
        </Suspense>
      )}
      {newTicketOpen && (
        <Suspense fallback={null}>
          <TicketFormDialog open={newTicketOpen} onOpenChange={setNewTicketOpen} />
        </Suspense>
      )}
    </div>
  )
}
