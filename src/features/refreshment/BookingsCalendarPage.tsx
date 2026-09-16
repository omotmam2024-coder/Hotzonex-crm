import { useQueryClient } from '@tanstack/react-query'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { AlertTriangleIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useAuth } from '@/hooks/useAuth'
import { useSettingValue } from '@/hooks/useSettingValue'
import { can } from '@/lib/permissions'
import { formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'
import { BookingFormDialog } from './BookingFormDialog'
import { RecordDepositDialog } from './RecordDepositDialog'
import { useBookingsMonth, type BookingRow } from './useBookings'

type BookingStatus = Database['public']['Enums']['booking_status']
type PaymentMethod = Database['public']['Enums']['payment_method']

const STATUS_FLOW: BookingStatus[] = ['enquiry', 'tentative', 'confirmed', 'completed', 'cancelled']

export function BookingsCalendarPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [newOpen, setNewOpen] = useState(false)
  const [depositTarget, setDepositTarget] = useState<BookingRow | null>(null)
  const [recordingDeposit, setRecordingDeposit] = useState(false)

  const { data: bookings, isLoading, isError, refetch } = useBookingsMonth(month)
  const { data: venueCapacity } = useSettingValue('venue_capacity', 50)
  const canWrite = can(profile, 'create')

  const byDate = useMemo(() => {
    const map = new Map<string, BookingRow[]>()
    for (const b of bookings ?? []) {
      const list = map.get(b.event_date) ?? []
      list.push(b)
      map.set(b.event_date, list)
    }
    return map
  }, [bookings])

  const conflictDates = useMemo(() => {
    const set = new Set<string>();
    for (const [date, list] of byDate.entries()) {
      const confirmedGuests = list.filter((b) => b.status === 'confirmed').reduce((sum, b) => sum + b.guests_count, 0)
      if (confirmedGuests > (venueCapacity ?? 50)) set.add(date)
    }
    return set
  }, [byDate, venueCapacity])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month))
    const end = endOfWeek(endOfMonth(month))
    return eachDayOfInterval({ start, end })
  }, [month])

  const dayBookings = byDate.get(selectedDate) ?? []

  async function updateStatus(id: string, status: BookingStatus) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  async function recordDeposit(amount: number, method: PaymentMethod) {
    if (!depositTarget) return
    setRecordingDeposit(true)
    const { error } = await supabase.rpc('fn_record_booking_deposit', {
      p_booking_id: depositTarget.id,
      p_amount: amount,
      p_method: method,
    })
    setRecordingDeposit(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Deposit recorded')
    setDepositTarget(null)
    await queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month">
            <ChevronLeftIcon className="size-4" />
          </Button>
          <h2 className="min-w-36 text-center text-lg font-semibold text-text">{format(month, 'MMMM yyyy')}</h2>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
        {canWrite && (
          <Button onClick={() => setNewOpen(true)}>
            <PlusIcon /> New booking
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const list = byDate.get(key) ?? []
              const hasConflict = conflictDates.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    'flex min-h-16 flex-col gap-1 rounded-lg border p-1.5 text-left',
                    isSameMonth(day, month) ? 'bg-surface' : 'bg-bg text-text-muted',
                    key === selectedDate ? 'border-accent ring-1 ring-accent' : 'border-border',
                    isToday(day) && 'font-semibold',
                  )}
                >
                  <span className="text-xs">{format(day, 'd')}</span>
                  {list.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={hasConflict ? 'danger' : 'muted'} className="px-1.5 py-0 text-[10px]">
                        {list.length}
                      </Badge>
                      {hasConflict && <AlertTriangleIcon className="size-3 text-danger" />}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">{format(new Date(selectedDate), 'EEEE, d MMMM')}</h3>
              {conflictDates.has(selectedDate) && (
                <span className="flex items-center gap-1 text-xs text-danger">
                  <AlertTriangleIcon className="size-3.5" /> Over capacity ({venueCapacity ?? 50})
                </span>
              )}
            </div>

            {dayBookings.length === 0 ? (
              <EmptyState icon={CalendarIcon} title="No bookings this day" />
            ) : (
              dayBookings.map((b) => (
                <div key={b.id} className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {b.customers?.display_name ?? 'Unknown'} · {b.event_type}
                      </p>
                      <p className="text-xs text-text-muted">
                        {b.start_time ?? '—'}
                        {b.end_time ? `–${b.end_time}` : ''} · {b.guests_count} guests
                        {b.package ? ` · ${b.package}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    Total {formatMoney(b.total, b.currency)} · Deposit {formatMoney(b.deposit, b.currency)}
                  </p>
                  {canWrite && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={b.status} onValueChange={(v) => void updateStatus(b.id, v as BookingStatus)}>
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_FLOW.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {b.deposit > 0 && (
                        <Button size="sm" variant="outline" onClick={() => setDepositTarget(b)}>
                          Record deposit
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      <BookingFormDialog open={newOpen} onOpenChange={setNewOpen} defaultDate={selectedDate} />
      <RecordDepositDialog
        open={!!depositTarget}
        onOpenChange={(open) => !open && setDepositTarget(null)}
        defaultAmount={depositTarget?.deposit ?? 0}
        loading={recordingDeposit}
        onConfirm={recordDeposit}
      />
    </div>
  )
}
