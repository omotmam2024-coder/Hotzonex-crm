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
import { useLocations } from '@/hooks/useLocations'
import { useProfiles } from '@/hooks/useProfiles'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useTicketCategories } from './useTickets'

type BusinessUnit = Database['public']['Enums']['business_unit']

const schema = z.object({
  businessUnit: z.enum(['wifi', 'services', 'refreshment']),
  categoryId: z.string().nullable(),
  channel: z.enum(['walk_in', 'call', 'whatsapp', 'sms', 'field', 'email']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string(),
  assignedTo: z.string().nullable(),
  locationId: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

interface TicketFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetCustomer?: CustomerOption
  defaultBusinessUnit?: BusinessUnit
}

export function TicketFormDialog({ open, onOpenChange, presetCustomer, defaultBusinessUnit }: TicketFormDialogProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const UNIT_LABEL = useUnitLabels()
  const { data: categories } = useTicketCategories()
  const { data: profiles } = useProfiles()
  const { data: locations } = useLocations()
  const [customer, setCustomer] = useState<CustomerOption | null>(presetCustomer ?? null)

  const defaults: FormValues = {
    businessUnit: defaultBusinessUnit ?? (profile?.business_units[0] as BusinessUnit) ?? 'wifi',
    categoryId: null,
    channel: 'call',
    priority: 'normal',
    subject: '',
    description: '',
    assignedTo: null,
    locationId: null,
  }

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })

  useEffect(() => {
    if (open) {
      reset(defaults)
      setCustomer(presetCustomer ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const businessUnit = watch('businessUnit')
  const filteredCategories = categories?.filter((c) => c.business_unit === businessUnit)

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.from('tickets').insert({
      customer_id: customer?.id ?? null,
      business_unit: values.businessUnit,
      category_id: values.categoryId,
      channel: values.channel,
      priority: values.priority,
      subject: values.subject.trim(),
      description: values.description.trim() || null,
      assigned_to: values.assignedTo,
      location_id: values.locationId,
      created_by: profile?.id,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Ticket created')
    await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          {!presetCustomer && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer (optional)</Label>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </div>
          )}

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
                      <SelectItem value="wifi">{UNIT_LABEL.wifi}</SelectItem>
                      <SelectItem value="services">{UNIT_LABEL.services}</SelectItem>
                      <SelectItem value="refreshment">{UNIT_LABEL.refreshment}</SelectItem>
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
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="field">Field</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none'}
                    onValueChange={(v) => {
                      field.onChange(v === '__none' ? null : v)
                      const cat = filteredCategories?.find((c) => c.id === v)
                      if (cat) setValue('priority', cat.default_priority)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Uncategorised</SelectItem>
                      {filteredCategories?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" aria-invalid={!!errors.subject} {...register('subject')} />
            {errors.subject && <p className="text-xs text-danger">{errors.subject.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Assign to</Label>
              <Controller
                control={control}
                name="assignedTo"
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
                      <SelectItem value="__none">Unspecified</SelectItem>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
