import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
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
import { CurrencyInput } from '@/components/shared/CurrencyInput'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { usePipelines } from './usePipelines'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  customerId: z.string().min(1, 'Pick a customer'),
  businessUnit: z.enum(['wifi', 'services', 'refreshment']),
  stageId: z.string().min(1),
  value: z.number().nullable(),
  currency: z.enum(['SSP', 'USD']),
  expectedClose: z.string().optional(),
  source: z.string().optional(),
  ownerId: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

interface DealFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetCustomer?: { id: string; display_name: string | null; phone_primary: string; customer_code: string | null }
  defaultBusinessUnit?: Database['public']['Enums']['business_unit']
  onSaved?: () => void
}

export function DealFormDialog({ open, onOpenChange, presetCustomer, defaultBusinessUnit, onSaved }: DealFormDialogProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: pipelines } = usePipelines()
  const { data: profiles } = useProfiles()

  const { control, register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      customerId: presetCustomer?.id ?? '',
      businessUnit: defaultBusinessUnit ?? profile?.business_units[0] ?? 'wifi',
      stageId: '',
      value: null,
      currency: 'SSP',
      expectedClose: '',
      source: '',
      ownerId: profile?.id ?? null,
    },
  })

  const businessUnit = watch('businessUnit')
  const pipeline = useMemo(
    () => pipelines?.find((p) => p.business_unit === businessUnit && p.is_default),
    [pipelines, businessUnit],
  )

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        customerId: presetCustomer?.id ?? '',
        businessUnit: defaultBusinessUnit ?? profile?.business_units[0] ?? 'wifi',
        stageId: '',
        value: null,
        currency: 'SSP',
        expectedClose: '',
        source: '',
        ownerId: profile?.id ?? null,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(values: FormValues) {
    const stageId = values.stageId || pipeline?.pipeline_stages[0]?.id
    if (!pipeline || !stageId) {
      toast.error('No pipeline is configured for that business unit yet.')
      return
    }
    const { error } = await supabase.from('deals').insert({
      title: values.title.trim(),
      customer_id: values.customerId,
      pipeline_id: pipeline.id,
      stage_id: stageId,
      business_unit: values.businessUnit,
      value: values.value ?? 0,
      currency: values.currency,
      expected_close: values.expectedClose || null,
      source: values.source?.trim() || null,
      owner_id: values.ownerId,
      created_by: profile?.id,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['deals'] })
    toast.success('Deal created')
    onOpenChange(false)
    onSaved?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          {!presetCustomer && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <CustomerPicker
                    value={field.value ? { id: field.value, display_name: '', phone_primary: '', customer_code: null } : null}
                    onChange={(c) => field.onChange(c?.id ?? '')}
                  />
                )}
              />
              {errors.customerId && <p className="text-xs text-danger">{errors.customerId.message}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Business unit</Label>
            <Controller
              control={control}
              name="businessUnit"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wifi">WiFi</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="refreshment">Refreshment</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Stage</Label>
            <Controller
              control={control}
              name="stageId"
              render={({ field }) => (
                <Select value={field.value || pipeline?.pipeline_stages[0]?.id} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pipeline?.pipeline_stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Value</Label>
            <Controller
              control={control}
              name="value"
              render={({ field }) => (
                <CurrencyInput
                  amount={field.value}
                  onAmountChange={field.onChange}
                  currency={watch('currency') as Database['public']['Enums']['currency_code']}
                  onCurrencyChange={(c) => setValue('currency', c)}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedClose">Expected close</Label>
              <Input id="expectedClose" type="date" {...register('expectedClose')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="source">Source</Label>
              <Input id="source" placeholder="e.g. Referral" {...register('source')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Owner</Label>
            <Controller
              control={control}
              name="ownerId"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !pipeline}>
              {isSubmitting ? 'Creating…' : 'Create deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
