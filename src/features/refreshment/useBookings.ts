import { useQuery } from '@tanstack/react-query'
import { endOfMonth, format, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export interface BookingRow {
  id: string
  booking_code: string | null
  customer_id: string
  event_date: string
  start_time: string | null
  end_time: string | null
  event_type: string
  guests_count: number
  package: string | null
  total: number
  deposit: number
  currency: Database['public']['Enums']['currency_code']
  status: Database['public']['Enums']['booking_status']
  host_id: string | null
  requirements: string | null
  customers: { display_name: string | null; phone_primary: string } | null
}

export function useBookingsMonth(monthDate: Date) {
  const from = format(startOfMonth(monthDate), 'yyyy-MM-dd')
  const to = format(endOfMonth(monthDate), 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['bookings', 'month', from],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, booking_code, customer_id, event_date, start_time, end_time, event_type, guests_count, package, total, deposit, currency, status, host_id, requirements, customers(display_name, phone_primary)',
        )
        .gte('event_date', from)
        .lte('event_date', to)
        .order('event_date')
        .order('start_time')
      if (error) throw error
      return data as unknown as BookingRow[]
    },
    staleTime: 15_000,
  })
}
