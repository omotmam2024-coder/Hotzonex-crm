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
import { useAuth } from '@/hooks/useAuth'
import { useLocations } from '@/hooks/useLocations'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useAudiencePreview } from './useAudience'
import { useMessageTemplates } from './useMessageTemplates'

type BusinessUnit = Database['public']['Enums']['business_unit']

const NONE = '__none'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  businessUnit: z.enum(['wifi', 'services', 'refreshment']),
  channel: z.enum(['whatsapp', 'sms', 'email']),
  templateId: z.string().nullable(),
  budget: z.number().min(0),
  currency: z.enum(['SSP', 'USD']),
  customerStatus: z.string().nullable(),
  locationId: z.string().nullable(),
  subscriptionStatus: z.string().nullable(),
  tag: z.string(),
})

type FormValues = z.infer<typeof schema>

const asRequiredNumber = (v: string) => (v === '' ? 0 : Number(v))

interface CampaignFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function defaults(businessUnit: BusinessUnit): FormValues {
  return {
    name: '',
    businessUnit,
    channel: 'whatsapp',
    templateId: null,
    budget: 0,
    currency: 'SSP',
    customerStatus: null,
    locationId: null,
    subscriptionStatus: null,
    tag: '',
  }
}

export function CampaignFormDialog({ open, onOpenChange }: CampaignFormDialogProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: templates } = useMessageTemplates(true)
  const { data: locations } = useLocations()
  const [audiencePreviewFilter, setAudiencePreviewFilter] = useState<Parameters<typeof useAudiencePreview>[0]>({})

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults((profile?.business_units[0] as BusinessUnit) ?? 'wifi'),
  })

  const values = watch()

  useEffect(() => {
    if (open) reset(defaults((profile?.business_units[0] as BusinessUnit) ?? 'wifi'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    setAudiencePreviewFilter({
      businessUnit: values.businessUnit,
      customerStatus: (values.customerStatus as never) || null,
      locationId: values.locationId || null,
      subscriptionStatus: (values.subscriptionStatus as never) || null,
      tag: values.tag.trim() || null,
    })
  }, [values.businessUnit, values.customerStatus, values.locationId, values.subscriptionStatus, values.tag])

  const { data: audienceCount, isFetching: countLoading } = useAudiencePreview(audiencePreviewFilter)

  async function onSubmit(values: FormValues) {
    const audienceFilter = {
      businessUnit: values.businessUnit,
      customerStatus: values.customerStatus || null,
      locationId: values.locationId || null,
      subscriptionStatus: values.subscriptionStatus || null,
      tag: values.tag.trim() || null,
    }
    const { error } = await supabase.from('campaigns').insert({
      name: values.name.trim(),
      business_unit: values.businessUnit,
      channel: values.channel,
      template_id: values.templateId,
      audience_filter: audienceFilter,
      budget: values.budget,
      currency: values.currency,
      created_by: profile?.id,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Campaign created')
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Campaign name</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Business unit</Label>
              <Controller
                control={control}
                name="businessUnit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
              <Label>Channel</Label>
              <Controller
                control={control}
                name="channel"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Template</Label>
            <Controller
              control={control}
              name="templateId"
              render={({ field }) => (
                <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No template</SelectItem>
                    {templates?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <p className="text-xs font-medium text-text-muted">Audience filter</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Customer status</Label>
                <Controller
                  control={control}
                  name="customerStatus"
                  render={({ field }) => (
                    <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Any</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="prospect">Prospect</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="dormant">Dormant</SelectItem>
                        <SelectItem value="churned">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Location</Label>
                <Controller
                  control={control}
                  name="locationId"
                  render={({ field }) => (
                    <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Any</SelectItem>
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
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Subscription status</Label>
                <Controller
                  control={control}
                  name="subscriptionStatus"
                  render={({ field }) => (
                    <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Any</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expiring_soon">Expiring soon</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Tag</Label>
                <Input className="h-9" placeholder="e.g. regular" {...register('tag')} />
              </div>
            </div>
            <p className="text-sm text-text">
              {countLoading ? 'Counting…' : `${audienceCount ?? 0} recipient(s)`}
              <span className="text-text-muted"> — opted-out customers are always excluded.</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Input id="budget" type="number" step="0.01" min="0" {...register('budget', { setValueAs: asRequiredNumber })} />
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create campaign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
