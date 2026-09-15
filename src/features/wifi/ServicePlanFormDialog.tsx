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
import { supabase } from '@/lib/supabase'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  priceSsp: z.number().min(0, 'Must be 0 or more'),
  priceUsd: z.number().nullable(),
  durationHours: z.number().nullable(),
  durationDays: z.number().nullable(),
  dataCapMb: z.number().nullable(),
  speedMbps: z.number().nullable(),
  deviceLimit: z.number().min(1, 'At least 1'),
  reorderLevel: z.number().min(0),
  isActive: z.boolean(),
})

/** Empty input -> null instead of NaN, for optional numeric fields. */
const asNullableNumber = (v: string) => (v === '' ? null : Number(v))
/** Empty input -> 0 rather than NaN, for required numeric fields with a sane floor. */
const asRequiredNumber = (v: string) => (v === '' ? 0 : Number(v))

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  name: '',
  code: '',
  priceSsp: 0,
  priceUsd: null,
  durationHours: null,
  durationDays: null,
  dataCapMb: null,
  speedMbps: null,
  deviceLimit: 1,
  reorderLevel: 50,
  isActive: true,
}

interface ServicePlanFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId?: string
}

export function ServicePlanFormDialog({ open, onOpenChange, planId }: ServicePlanFormDialogProps) {
  const isEdit = !!planId
  const queryClient = useQueryClient()
  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (!open) return
    if (!isEdit) {
      reset(DEFAULTS)
      return
    }
    void supabase
      .from('service_plans')
      .select('*')
      .eq('id', planId)
      .single()
      .then(({ data }) => {
        if (!data) return
        reset({
          name: data.name,
          code: data.code,
          priceSsp: data.price_ssp,
          priceUsd: data.price_usd,
          durationHours: data.duration_hours,
          durationDays: data.duration_days,
          dataCapMb: data.data_cap_mb,
          speedMbps: data.speed_mbps,
          deviceLimit: data.device_limit,
          reorderLevel: data.reorder_level,
          isActive: data.is_active,
        })
      })
  }, [open, isEdit, planId, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      price_ssp: values.priceSsp,
      price_usd: values.priceUsd,
      duration_hours: values.durationHours,
      duration_days: values.durationDays,
      data_cap_mb: values.dataCapMb,
      speed_mbps: values.speedMbps,
      device_limit: values.deviceLimit,
      reorder_level: values.reorderLevel,
      is_active: values.isActive,
    }
    const { error } = isEdit
      ? await supabase.from('service_plans').update(payload).eq('id', planId!)
      : await supabase.from('service_plans').insert(payload)
    if (error) {
      toast.error(error.code === '23505' ? 'That plan code is already in use.' : error.message)
      return
    }
    toast.success(isEdit ? 'Plan updated' : 'Plan created')
    await queryClient.invalidateQueries({ queryKey: ['service_plans'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit service plan' : 'New service plan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="HS-1H" aria-invalid={!!errors.code} {...register('code')} />
              {errors.code && <p className="text-xs text-danger">{errors.code.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priceSsp">Price (SSP)</Label>
              <Input id="priceSsp" type="number" step="0.01" min="0" {...register('priceSsp', { setValueAs: asRequiredNumber })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priceUsd">Price (USD, optional)</Label>
              <Input id="priceUsd" type="number" step="0.01" min="0" {...register('priceUsd', { setValueAs: asNullableNumber })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="durationHours">Duration (hours)</Label>
              <Input id="durationHours" type="number" min="0" {...register('durationHours', { setValueAs: asNullableNumber })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input id="durationDays" type="number" min="0" {...register('durationDays', { setValueAs: asNullableNumber })} />
            </div>
          </div>
          <p className="text-xs text-text-muted">Use either hours (hotspot) or days (home/office), not both.</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="speedMbps">Speed (Mbps)</Label>
              <Input id="speedMbps" type="number" step="0.1" min="0" {...register('speedMbps', { setValueAs: asNullableNumber })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataCapMb">Data cap (MB)</Label>
              <Input id="dataCapMb" type="number" min="0" {...register('dataCapMb', { setValueAs: asNullableNumber })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deviceLimit">Device limit</Label>
              <Input id="deviceLimit" type="number" min="1" {...register('deviceLimit', { setValueAs: asRequiredNumber })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reorderLevel">Reorder level</Label>
              <Input id="reorderLevel" type="number" min="0" {...register('reorderLevel', { setValueAs: asRequiredNumber })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="isActive">Active</Label>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
