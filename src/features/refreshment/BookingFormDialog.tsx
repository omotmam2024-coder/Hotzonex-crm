import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { supabase } from '@/lib/supabase'

const EVENT_TYPES = ['private', 'corporate', 'wedding', 'birthday', 'conference', 'other']

const schema = z.object({
  eventDate: z.string().min(1, 'Event date is required'),
  startTime: z.string(),
  endTime: z.string(),
  eventType: z.string(),
  guestsCount: z.number().min(0),
  packageName: z.string(),
  total: z.number().min(0),
  deposit: z.number().min(0),
  currency: z.enum(['SSP', 'USD']),
  hostId: z.string().nullable(),
  requirements: z.string(),
})

type FormValues = z.infer<typeof schema>

const asRequiredNumber = (v: string) => (v === '' ? 0 : Number(v))

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

interface BookingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
}

function defaults(defaultDate?: string): FormValues {
  return {
    eventDate: defaultDate ?? '',
    startTime: '',
    endTime: '',
    eventType: 'private',
    guestsCount: 0,
    packageName: '',
    total: 0,
    deposit: 0,
    currency: 'SSP',
    hostId: null,
    requirements: '',
  }
}

export function BookingFormDialog({ open, onOpenChange, defaultDate }: BookingFormDialogProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: profiles } = useProfiles()
  const [customer, setCustomer] = useState<CustomerOption | null>(null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(defaultDate) })

  useEffect(() => {
    if (open) {
      reset(defaults(defaultDate))
      setCustomer(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultDate])

  async function onSubmit(values: FormValues) {
    if (!customer) {
      toast.error('Pick a customer')
      return
    }
    const { error } = await supabase.from('bookings').insert({
      customer_id: customer.id,
      event_date: values.eventDate,
      start_time: values.startTime || null,
      end_time: values.endTime || null,
      event_type: values.eventType,
      guests_count: values.guestsCount,
      package: values.packageName.trim() || null,
      total: values.total,
      deposit: values.deposit,
      currency: values.currency,
      host_id: values.hostId,
      requirements: values.requirements.trim() || null,
      created_by: profile?.id,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Booking created')
    await queryClient.invalidateQueries({ queryKey: ['bookings'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label>Customer</Label>
            <CustomerPicker value={customer} onChange={setCustomer} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eventDate">Event date</Label>
              <Input id="eventDate" type="date" aria-invalid={!!errors.eventDate} {...register('eventDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startTime">Start</Label>
              <Input id="startTime" type="time" {...register('startTime')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endTime">End</Label>
              <Input id="endTime" type="time" {...register('endTime')} />
            </div>
          </div>
          {errors.eventDate && <p className="text-xs text-danger">{errors.eventDate.message}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Event type</Label>
              <Controller
                control={control}
                name="eventType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guestsCount">Guests</Label>
              <Input id="guestsCount" type="number" min="0" {...register('guestsCount', { setValueAs: asRequiredNumber })} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="packageName">Package</Label>
            <Input id="packageName" {...register('packageName')} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="total">Total</Label>
              <Input id="total" type="number" step="0.01" min="0" {...register('total', { setValueAs: asRequiredNumber })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deposit">Deposit</Label>
              <Input id="deposit" type="number" step="0.01" min="0" {...register('deposit', { setValueAs: asRequiredNumber })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Currency</Label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SSP">SSP</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Host</Label>
            <Controller
              control={control}
              name="hostId"
              render={({ field }) => (
                <Select value={field.value ?? '__none'} onValueChange={(v) => field.onChange(v === '__none' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requirements">Special requirements</Label>
            <Textarea id="requirements" rows={2} {...register('requirements')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
