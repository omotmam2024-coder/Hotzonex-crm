import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BriefcaseIcon,
  ClockIcon,
  CupSodaIcon,
  FileIcon,
  FileTextIcon,
  HeadsetIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  StickyNoteIcon,
  Trash2Icon,
  UploadIcon,
  WifiIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PhoneActions } from '@/components/shared/PhoneActions'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TagPicker } from '@/components/shared/TagPicker'
import { LogActivityModal } from '@/features/activities/LogActivityModal'
import { DealFormDialog } from '@/features/deals/DealFormDialog'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { formatDate, formatMoney, formatRelative } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { CustomerFormDialog } from './CustomerFormDialog'

const UNIT_LABEL: Record<string, string> = { wifi: 'WiFi', services: 'Services', refreshment: 'Refreshment' }

function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select(
          'id, customer_code, display_name, full_name, business_name, type, phone_primary, whatsapp, email, status, business_units, location_id, owner_id, tags, notes, opted_out, created_at, last_contact_at',
        )
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })
}

function useNextTask(customerId: string) {
  return useQuery({
    queryKey: ['tasks', 'next', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, due_at')
        .eq('customer_id', customerId)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: profiles } = useProfiles()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [dealOpen, setDealOpen] = useState(false)

  const { data: customer, isLoading, isError, refetch } = useCustomer(id!)
  const { data: nextTask } = useNextTask(id!)

  const ownerName = profiles?.find((p) => p.id === customer?.owner_id)?.full_name

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="mb-4 h-24 w-full rounded-card" />
        <SkeletonRows count={4} />
      </div>
    )
  }
  if (isError || !customer) {
    return <ErrorState message="Couldn't load this customer." onRetry={() => void refetch()} />
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-text">{customer.display_name}</h1>
            <StatusBadge status={customer.status} />
            {customer.opted_out && <Badge variant="danger">Opted out</Badge>}
          </div>
          <p className="text-xs text-text-muted">{customer.customer_code}</p>
          <div className="mt-2">
            <PhoneActions phone={customer.phone_primary} />
          </div>
          {customer.email && <p className="mt-1 text-sm text-text-muted">{customer.email}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {customer.business_units.map((u) => (
              <Badge key={u} variant="muted">
                {UNIT_LABEL[u] ?? u}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setLogOpen(true)}>
            Log activity
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <PencilIcon /> Edit
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          {customer.business_units.includes('wifi') && <TabsTrigger value="services">Services</TabsTrigger>}
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          {customer.business_units.includes('services') && <TabsTrigger value="projects">Projects</TabsTrigger>}
          {customer.business_units.includes('refreshment') && <TabsTrigger value="bookings">Bookings</TabsTrigger>}
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-2 pt-4">
                <Row label="Owner" value={ownerName ?? 'Unassigned'} />
                <Row label="Type" value={customer.type} />
                <Row label="First seen" value={formatDate(customer.created_at)} />
                <Row label="Last contact" value={customer.last_contact_at ? formatRelative(customer.last_contact_at) : '—'} />
                <Row
                  label="Next action"
                  value={nextTask ? `${nextTask.title}${nextTask.due_at ? ` · ${formatDate(nextTask.due_at)}` : ''}` : 'None scheduled'}
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-2 pt-4">
                <span className="text-xs font-medium text-text-muted">Tags</span>
                <TagPicker
                  value={customer.tags}
                  onChange={async (tags) => {
                    const { error } = await supabase.from('customers').update({ tags }).eq('id', customer.id)
                    if (error) toast.error(error.message)
                    else await queryClient.invalidateQueries({ queryKey: ['customers', 'detail', customer.id] })
                  }}
                />
                {customer.notes && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-text-muted">Notes</span>
                    <p className="mt-1 text-sm text-text whitespace-pre-wrap">{customer.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          {tab === 'timeline' && <TimelineTab customerId={customer.id} onLogActivity={() => setLogOpen(true)} />}
        </TabsContent>

        {customer.business_units.includes('wifi') && (
          <TabsContent value="services">
            {tab === 'services' && <ServicesTab customerId={customer.id} />}
          </TabsContent>
        )}

        <TabsContent value="deals">
          {tab === 'deals' && (
            <DealsTab
              customerId={customer.id}
              onNewDeal={() => setDealOpen(true)}
              onOpenDeal={(dealId) => navigate(`/pipeline?deal=${dealId}`)}
            />
          )}
        </TabsContent>

        <TabsContent value="billing">
          {tab === 'billing' && <BillingTab customerId={customer.id} onOpenInvoice={(id) => navigate(`/billing?invoice=${id}`)} />}
        </TabsContent>

        <TabsContent value="tickets">
          {tab === 'tickets' && <TicketsTab customerId={customer.id} onOpenTicket={(id) => navigate(`/tickets?ticket=${id}`)} />}
        </TabsContent>

        <TabsContent value="projects">
          {tab === 'projects' && <ProjectsTab customerId={customer.id} onOpenProject={(id) => navigate(`/services?project=${id}`)} />}
        </TabsContent>

        <TabsContent value="bookings">
          {tab === 'bookings' && <BookingsTab customerId={customer.id} />}
        </TabsContent>

        <TabsContent value="notes">
          {tab === 'notes' && <NotesTab customerId={customer.id} currentUserId={profile?.id} />}
        </TabsContent>

        <TabsContent value="files">
          {tab === 'files' && <FilesTab customerId={customer.id} />}
        </TabsContent>
      </Tabs>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customerId={customer.id} />
      <LogActivityModal
        open={logOpen}
        onOpenChange={setLogOpen}
        customerId={customer.id}
        customerLabel={customer.display_name ?? ''}
      />
      <DealFormDialog
        open={dealOpen}
        onOpenChange={setDealOpen}
        presetCustomer={{ id: customer.id, display_name: customer.display_name, phone_primary: customer.phone_primary, customer_code: customer.customer_code }}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  )
}

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  call: 'Call',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
  visit: 'Visit',
  meeting: 'Meeting',
  note: 'Note',
  system: 'System',
}

function TimelineTab({ customerId, onLogActivity }: { customerId: string; onLogActivity: () => void }) {
  const { data: activities, isLoading, isError, refetch } = useQuery({
    queryKey: ['activities', 'timeline', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('id, type, direction, subject, body, outcome, duration_minutes, occurred_at, user_id')
        .eq('customer_id', customerId)
        .order('occurred_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })

  // Every campaign/manual message attempt appears on the customer timeline
  // alongside logged activities (§5.10).
  const { data: messages } = useQuery({
    queryKey: ['message_log', 'timeline', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_log')
        .select('id, channel, body, status, sent_at, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  const timeline = [
    ...(activities ?? []).map((a) => ({ kind: 'activity' as const, at: a.occurred_at, item: a })),
    ...(messages ?? []).map((m) => ({ kind: 'message' as const, at: m.sent_at ?? m.created_at, item: m })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  if (timeline.length === 0) {
    return (
      <EmptyState
        icon={ClockIcon}
        title="No activity yet"
        description="Calls, WhatsApp messages, visits and notes will show up here."
        action={<Button onClick={onLogActivity}><PlusIcon /> Log activity</Button>}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {timeline.map((entry) =>
        entry.kind === 'activity' ? (
          <div key={`a-${entry.item.id}`} className="flex gap-3 rounded-card border border-border bg-surface p-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {ACTIVITY_TYPE_LABEL[entry.item.type]?.slice(0, 2) ?? '•'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-sm font-medium text-text">
                  {ACTIVITY_TYPE_LABEL[entry.item.type] ?? entry.item.type} · {entry.item.direction}
                </span>
                <span className="text-xs text-text-muted" title={formatDate(entry.item.occurred_at)}>
                  {formatRelative(entry.item.occurred_at)}
                </span>
              </div>
              {entry.item.subject && <p className="text-sm text-text">{entry.item.subject}</p>}
              {entry.item.body && <p className="mt-0.5 text-sm whitespace-pre-wrap text-text-muted">{entry.item.body}</p>}
              {entry.item.duration_minutes != null && <p className="mt-0.5 text-xs text-text-muted">{entry.item.duration_minutes} min</p>}
            </div>
          </div>
        ) : (
          <div key={`m-${entry.item.id}`} className="flex gap-3 rounded-card border border-border bg-surface p-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-info/15 text-xs font-semibold text-info">
              {entry.item.channel.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-sm font-medium text-text">
                  {entry.item.channel} message · {entry.item.status}
                </span>
                <span className="text-xs text-text-muted" title={formatDate(entry.at)}>
                  {formatRelative(entry.at)}
                </span>
              </div>
              <p className="mt-0.5 text-sm whitespace-pre-wrap text-text-muted">{entry.item.body}</p>
            </div>
          </div>
        ),
      )}
    </div>
  )
}

function DealsTab({
  customerId,
  onNewDeal,
  onOpenDeal,
}: {
  customerId: string
  onNewDeal: () => void
  onOpenDeal: (id: string) => void
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['deals', 'byCustomer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('id, title, value, currency, status, expected_close, pipeline_stages(name)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <SkeletonRows />
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={BriefcaseIcon}
        title="No deals yet"
        description="Open a deal to track this customer through your pipeline."
        action={<Button onClick={onNewDeal}><PlusIcon /> New deal</Button>}
      />
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button size="sm" onClick={onNewDeal}>
          <PlusIcon /> New deal
        </Button>
      </div>
      {data.map((d) => (
        <button
          key={d.id}
          onClick={() => onOpenDeal(d.id)}
          className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
        >
          <div>
            <p className="text-sm font-medium text-text">{d.title}</p>
            <p className="text-xs text-text-muted">
              {d.pipeline_stages?.name} {d.expected_close && `· ${formatDate(d.expected_close)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text">{formatMoney(d.value, d.currency)}</span>
            <StatusBadge status={d.status} />
          </div>
        </button>
      ))}
    </div>
  )
}

function ServicesTab({ customerId }: { customerId: string }) {
  const { data: subscriptions, isLoading: subsLoading, isError: subsError, refetch: refetchSubs } = useQuery({
    queryKey: ['subscriptions', 'byCustomer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id, subscription_code, status, end_date, monthly_fee, currency, service_plans(name)')
        .eq('customer_id', customerId)
        .order('end_date', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const { data: vouchers } = useQuery({
    queryKey: ['vouchers', 'byCustomer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vouchers')
        .select('id, code, status, price_sold, currency, sold_at, service_plans(name)')
        .eq('customer_id', customerId)
        .order('sold_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })

  const { data: installations } = useQuery({
    queryKey: ['installations', 'byCustomer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installations')
        .select('id, job_code, job_type, status, scheduled_at')
        .eq('customer_id', customerId)
        .order('scheduled_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  if (subsLoading) return <SkeletonRows count={3} />
  if (subsError) return <ErrorState onRetry={() => void refetchSubs()} />

  const nothing = (subscriptions?.length ?? 0) === 0 && (vouchers?.length ?? 0) === 0 && (installations?.length ?? 0) === 0
  if (nothing) {
    return <EmptyState icon={WifiIcon} title="No WiFi services yet" description="Subscriptions, vouchers and installations will show up here." />
  }

  return (
    <div className="flex flex-col gap-4">
      {subscriptions && subscriptions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text">Subscriptions</h3>
          <div className="flex flex-col gap-2">
            {subscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-card border border-border bg-surface p-3 text-sm">
                <span className="text-text">{s.service_plans?.name} · {formatMoney(s.monthly_fee, s.currency)}/mo</span>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Ends {formatDate(s.end_date)}</span>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {vouchers && vouchers.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text">Vouchers</h3>
          <div className="flex flex-col gap-2">
            {vouchers.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-card border border-border bg-surface p-3 text-sm">
                <span className="font-mono text-text">{v.code}</span>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">{v.service_plans?.name}</span>
                  <StatusBadge status={v.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {installations && installations.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text">Installations</h3>
          <div className="flex flex-col gap-2">
            {installations.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-card border border-border bg-surface p-3 text-sm">
                <span className="text-text">{i.job_type} · {i.job_code}</span>
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">{i.scheduled_at ? formatDate(i.scheduled_at) : '—'}</span>
                  <StatusBadge status={i.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BillingTab({ customerId, onOpenInvoice }: { customerId: string; onOpenInvoice: (id: string) => void }) {
  const { data: balance } = useQuery({
    queryKey: ['v_customer_balances', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_customer_balances')
        .select('invoiced, paid, balance_due')
        .eq('customer_id', customerId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const { data: invoices, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', 'byCustomer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total, amount_paid, currency, due_date')
        .eq('customer_id', customerId)
        .order('issue_date', { ascending: false })
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <SkeletonRows count={3} />
  if (isError) return <ErrorState onRetry={() => void refetch()} />

  return (
    <div className="flex flex-col gap-3">
      {balance && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-card border border-border bg-surface p-3">
            <p className="text-xs text-text-muted">Invoiced</p>
            <p className="text-sm font-semibold text-text">{formatMoney(balance.invoiced, 'SSP')}</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-3">
            <p className="text-xs text-text-muted">Paid</p>
            <p className="text-sm font-semibold text-success">{formatMoney(balance.paid, 'SSP')}</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-3">
            <p className="text-xs text-text-muted">Balance due</p>
            <p className="text-sm font-semibold text-danger">{formatMoney(balance.balance_due, 'SSP')}</p>
          </div>
        </div>
      )}

      {!invoices || invoices.length === 0 ? (
        <EmptyState icon={FileTextIcon} title="No invoices yet" description="Invoices raised for this customer will show up here." />
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map((inv) => (
            <button
              key={inv.id}
              onClick={() => onOpenInvoice(inv.id)}
              className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
            >
              <div>
                <p className="text-sm font-medium text-text">{inv.invoice_number}</p>
                <p className="text-xs text-text-muted">Due {formatDate(inv.due_date)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text">{formatMoney(inv.total, inv.currency)}</span>
                <StatusBadge status={inv.status} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TicketsTab({ customerId, onOpenTicket }: { customerId: string; onOpenTicket: (id: string) => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tickets', 'byCustomer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, ticket_number, subject, status, priority, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <SkeletonRows count={3} />
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!data || data.length === 0) {
    return <EmptyState icon={HeadsetIcon} title="No tickets yet" description="Support tickets raised for this customer will show up here." />
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((t) => (
        <button
          key={t.id}
          onClick={() => onOpenTicket(t.id)}
          className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
        >
          <div>
            <p className="text-sm font-medium text-text">{t.subject}</p>
            <p className="text-xs text-text-muted">{t.ticket_number} · {formatRelative(t.created_at)}</p>
          </div>
          <StatusBadge status={t.status} />
        </button>
      ))}
    </div>
  )
}

function ProjectsTab({ customerId, onOpenProject }: { customerId: string; onOpenProject: (id: string) => void }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects', 'byCustomer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, project_code, name, status, budget, currency, due_date')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <SkeletonRows count={3} />
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!data || data.length === 0) {
    return <EmptyState icon={BriefcaseIcon} title="No projects yet" description="Web/IT projects for this customer will show up here." />
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((p) => (
        <button
          key={p.id}
          onClick={() => onOpenProject(p.id)}
          className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-3 text-left hover:bg-surface-2"
        >
          <div>
            <p className="text-sm font-medium text-text">{p.name}</p>
            <p className="text-xs text-text-muted">{p.project_code}{p.due_date ? ` · Due ${formatDate(p.due_date)}` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text">{formatMoney(p.budget, p.currency)}</span>
            <StatusBadge status={p.status} />
          </div>
        </button>
      ))}
    </div>
  )
}

function BookingsTab({ customerId }: { customerId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bookings', 'byCustomer', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_code, event_date, event_type, guests_count, total, currency, status')
        .eq('customer_id', customerId)
        .order('event_date', { ascending: false })
      if (error) throw error
      return data
    },
  })

  if (isLoading) return <SkeletonRows count={3} />
  if (isError) return <ErrorState onRetry={() => void refetch()} />
  if (!data || data.length === 0) {
    return <EmptyState icon={CupSodaIcon} title="No bookings yet" description="Event bookings for this customer will show up here." />
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-3">
          <div>
            <p className="text-sm font-medium text-text">{b.event_type} · {b.guests_count} guests</p>
            <p className="text-xs text-text-muted">{b.booking_code} · {formatDate(b.event_date)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text">{formatMoney(b.total, b.currency)}</span>
            <StatusBadge status={b.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

function NotesTab({ customerId, currentUserId }: { customerId: string; currentUserId?: string }) {
  const queryClient = useQueryClient()
  const { data: profiles } = useProfiles()
  const [body, setBody] = useState('')
  const [mentioned, setMentioned] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer_notes', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_notes')
        .select('id, body, pinned, mentioned_user_ids, created_by, created_at')
        .eq('customer_id', customerId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  async function submit() {
    if (!body.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('customer_notes').insert({
      customer_id: customerId,
      body: body.trim(),
      mentioned_user_ids: mentioned,
      created_by: currentUserId,
    })
    setSubmitting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setBody('')
    setMentioned([])
    await queryClient.invalidateQueries({ queryKey: ['customer_notes', customerId] })
  }

  async function togglePin(noteId: string, pinned: boolean) {
    const { error } = await supabase.from('customer_notes').update({ pinned: !pinned }).eq('id', noteId)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['customer_notes', customerId] })
  }

  async function remove(noteId: string) {
    const { error } = await supabase.from('customer_notes').delete().eq('id', noteId)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['customer_notes', customerId] })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card border border-border bg-surface p-3">
        <Textarea
          placeholder="Write a note…"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {profiles
              ?.filter((p) => p.id !== currentUserId)
              .slice(0, 6)
              .map((p) => {
                const active = mentioned.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setMentioned((prev) => (active ? prev.filter((id) => id !== p.id) : [...prev, p.id]))
                    }
                    className={`rounded-full border px-2 py-0.5 text-xs ${active ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-muted'}`}
                  >
                    @{p.full_name || p.email}
                  </button>
                )
              })}
          </div>
          <Button size="sm" onClick={() => void submit()} disabled={submitting || !body.trim()}>
            {submitting ? 'Posting…' : 'Post note'}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonRows count={3} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={StickyNoteIcon} title="No notes yet" description="Pin important context here for the whole team." />
      ) : (
        data.map((n) => (
          <div key={n.id} className="flex gap-2 rounded-card border border-border bg-surface p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-muted">{formatRelative(n.created_at)}</span>
                <div className="flex gap-1">
                  <button onClick={() => void togglePin(n.id, n.pinned)} aria-label={n.pinned ? 'Unpin' : 'Pin'}>
                    <PinIcon className={`size-3.5 ${n.pinned ? 'fill-accent text-accent' : 'text-text-muted'}`} />
                  </button>
                  <button onClick={() => void remove(n.id)} aria-label="Delete note">
                    <Trash2Icon className="size-3.5 text-text-muted hover:text-danger" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap text-text">{n.body}</p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function FilesTab({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer_files', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_files')
        .select('id, file_name, storage_path, size_bytes, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const path = `${customerId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('customer-files').upload(path, file)
      if (uploadError) {
        toast.error(uploadError.message)
        continue
      }
      const { data: userData } = await supabase.auth.getUser()
      const { error: rowError } = await supabase.from('customer_files').insert({
        customer_id: customerId,
        storage_path: path,
        file_name: file.name,
        size_bytes: file.size,
        uploaded_by: userData.user?.id,
      })
      if (rowError) toast.error(rowError.message)
    }
    setUploading(false)
    await queryClient.invalidateQueries({ queryKey: ['customer_files', customerId] })
  }

  async function openFile(storagePath: string) {
    const { data, error } = await supabase.storage.from('customer-files').createSignedUrl(storagePath, 60)
    if (error) {
      toast.error(error.message)
      return
    }
    window.open(data.signedUrl, '_blank', 'noreferrer')
  }

  async function removeFile(id: string, storagePath: string) {
    const { error: storageError } = await supabase.storage.from('customer-files').remove([storagePath])
    if (storageError) {
      toast.error(storageError.message)
      return
    }
    const { error } = await supabase.from('customer_files').delete().eq('id', id)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['customer_files', customerId] })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface p-6 text-sm text-text-muted hover:border-accent hover:text-accent">
        <UploadIcon className="size-4" />
        {uploading ? 'Uploading…' : 'Tap to upload contracts, IDs, photos or signed forms'}
        <input
          type="file"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => void handleUpload(e.target.files)}
        />
      </label>

      {isLoading ? (
        <SkeletonRows count={3} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={FileIcon} title="No files yet" />
      ) : (
        data.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-3">
            <button onClick={() => void openFile(f.storage_path)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm text-text">{f.file_name}</p>
              <p className="text-xs text-text-muted">
                {f.size_bytes ? `${Math.round(f.size_bytes / 1024)} KB` : ''} · {formatDate(f.created_at)}
              </p>
            </button>
            <button onClick={() => void removeFile(f.id, f.storage_path)} aria-label="Delete file">
              <Trash2Icon className="size-4 text-text-muted hover:text-danger" />
            </button>
          </div>
        ))
      )}
    </div>
  )
}
