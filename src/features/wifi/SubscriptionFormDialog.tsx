import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { useLocations } from '@/hooks/useLocations'
import { supabase } from '@/lib/supabase'
import { useServicePlans } from './useServicePlans'

const schema = z.object({
  customerId: z.string().min(1, 'Pick a customer'),
  customerLabel: z.string(),
  planId: z.string().min(1, 'Pick a plan'),
  locationId: z.string().nullable(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  monthlyFee: z.number().min(0),
  autoRenew: z.boolean(),
  routerUsername: z.string().optional(),
  macAddress: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
function plusDaysIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const DEFAULTS: FormValues = {
  customerId: '',
  customerLabel: '',
  planId: '',
  locationId: null,
  startDate: todayIso(),
  endDate: plusDaysIso(30),
  monthlyFee: 0,
  autoRenew: true,
  routerUsername: '',
  macAddress: '',
}

interface SubscriptionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetCustomer?: { id: string; display_name: string | null }
}

export function SubscriptionFormDialog({ open, onOpenChange, presetCustomer }: SubscriptionFormDialogProps) {
  const queryClient = useQueryClient()
  const { data: plans } = useServicePlans(true)
  const { data: locations } = useLocations()

  const { control, register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
      defaultValues: { ...DEFAULTS, customerId: presetCustomer?.id ?? '', customerLabel: presetCustomer?.display_name ?? '' },
    })

  useEffect(() => {
    if (open) {
      reset({ ...DEFAULTS, customerId: presetCustomer?.id ?? '', customerLabel: presetCustomer?.display_name ?? '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const planId = watch('planId')

  function applyPlanDuration(id: string) {
    const plan = plans?.find((p) => p.id === id)
    if (plan?.duration_days) setValue('endDate', plusDaysIso(plan.duration_days))
    if (plan) setValue('monthlyFee', plan.price_ssp)
  }

  async function onSubmit(values: FormValues) {
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('subscriptions').insert({
      customer_id: values.customerId,
      plan_id: values.planId,
      location_id: values.locationId,
      start_date: values.startDate,
      end_date: values.endDate,
      monthly_fee: values.monthlyFee,
      auto_renew: values.autoRenew,
      router_username: values.routerUsername?.trim() || null,
      mac_address: values.macAddress?.trim() || null,
      status: 'active',
      created_by: userData.user?.id,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Subscription created')
    await queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New subscription</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!presetCustomer && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <CustomerPicker
                    value={field.value ? { id: field.value, display_name: watch('customerLabel'), phone_primary: '', customer_code: null } : null}
                    onChange={(c) => field.onChange(c?.id ?? '')}
                  />
                )}
              />
              {errors.customerId && <p className="text-xs text-danger">{errors.customerId.message}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Plan</Label>
            <Controller
              control={control}
              name="planId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    applyPlanDuration(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans
                      ?.filter((p) => p.duration_days)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.planId && <p className="text-xs text-danger">{errors.planId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthlyFee">Monthly fee (SSP)</Label>
              <Input
                id="monthlyFee"
                type="number"
                min="0"
                step="0.01"
                {...register('monthlyFee', { setValueAs: (v: string) => (v === '' ? 0 : Number(v)) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Location</Label>
              <Controller
                control={control}
                name="locationId"
                render={({ field }) => (
                  <Select value={field.value ?? '__none'} onValueChange={(v) => field.onChange(v === '__none' ? null : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">None</SelectItem>
                      {locations?.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="routerUsername">Router username</Label>
              <Input id="routerUsername" {...register('routerUsername')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="macAddress">MAC address</Label>
              <Input id="macAddress" {...register('macAddress')} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="autoRenew">Auto-renew</Label>
            <Controller
              control={control}
              name="autoRenew"
              render={({ field }) => <Switch id="autoRenew" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !planId}>
              {isSubmitting ? 'Creating…' : 'Create subscription'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
