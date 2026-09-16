import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PhoneField } from '@/components/shared/PhoneField'
import { TagPicker } from '@/components/shared/TagPicker'
import { useDebounced } from '@/hooks/useDebounced'
import { useFormDraft } from '@/hooks/useFormDraft'
import { useProfiles } from '@/hooks/useProfiles'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { toE164 } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'
import { CUSTOMER_FORM_DEFAULTS, customerFormSchema, type CustomerFormValues } from './customerSchema'

const BUSINESS_UNITS: Database['public']['Enums']['business_unit'][] = ['wifi', 'services', 'refreshment']

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string
  onSaved?: (customerId: string) => void
}

export function CustomerFormDialog({ open, onOpenChange, customerId, onSaved }: CustomerFormDialogProps) {
  const isEdit = !!customerId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const UNIT_LABEL = useUnitLabels()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('locations').select('id, name').eq('is_active', true).order('name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
  const { data: profiles } = useProfiles()

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: CUSTOMER_FORM_DEFAULTS,
  })
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = form

  const { clear: clearDraft } = useFormDraft(isEdit ? `customer-edit-${customerId}` : 'customer-new', form)

  const { data: existing } = useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', customerId!).single()
      if (error) throw error
      return data
    },
    enabled: isEdit && open,
  })

  useEffect(() => {
    if (!open) return
    if (isEdit && existing) {
      reset({
        type: existing.type,
        fullName: existing.full_name ?? '',
        businessName: existing.business_name ?? '',
        phonePrimary: existing.phone_primary,
        whatsapp: existing.whatsapp ?? '',
        email: existing.email ?? '',
        locationId: existing.location_id,
        businessUnits: existing.business_units,
        status: existing.status,
        ownerId: existing.owner_id,
        tags: existing.tags,
        notes: existing.notes ?? '',
        optedOut: existing.opted_out,
      })
    } else if (!isEdit) {
      reset(CUSTOMER_FORM_DEFAULTS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, existing])

  const phoneValue = watch('phonePrimary')
  const debouncedPhone = useDebounced(phoneValue, 350)

  const { data: duplicateMatch } = useQuery({
    queryKey: ['customers', 'duplicate-check', debouncedPhone, customerId],
    queryFn: async () => {
      const normalized = toE164(debouncedPhone)
      let q = supabase
        .from('customers')
        .select('id, display_name, customer_code')
        .eq('phone_primary', normalized)
        .limit(1)
      if (customerId) q = q.neq('id', customerId)
      const { data, error } = await q
      if (error) throw error
      return data?.[0] ?? null
    },
    enabled: open && debouncedPhone.trim().length >= 7,
  })

  async function onSubmit(values: CustomerFormValues) {
    setSubmitError(null)
    const payload = {
      type: values.type,
      full_name: values.type === 'individual' ? values.fullName?.trim() : (values.fullName?.trim() || null),
      business_name: values.type !== 'individual' ? values.businessName?.trim() : (values.businessName?.trim() || null),
      phone_primary: toE164(values.phonePrimary),
      whatsapp: values.whatsapp?.trim() ? toE164(values.whatsapp) : null,
      email: values.email?.trim() || null,
      location_id: values.locationId,
      business_units: values.businessUnits,
      status: values.status,
      owner_id: values.ownerId,
      tags: values.tags,
      notes: values.notes?.trim() || null,
      opted_out: values.optedOut,
    }

    const { data, error } = isEdit
      ? await supabase.from('customers').update(payload).eq('id', customerId!).select('id').single()
      : await supabase.from('customers').insert(payload).select('id').single()

    if (error) {
      if (error.code === '23505') {
        setSubmitError('A customer with this phone number already exists.')
      } else {
        setSubmitError(error.message)
      }
      return
    }

    clearDraft()
    await queryClient.invalidateQueries({ queryKey: ['customers'] })
    toast.success(isEdit ? 'Customer updated' : 'Customer created')
    onOpenChange(false)
    onSaved?.(data.id)
  }

  const customerType = watch('type')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit customer' : 'New customer'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {submitError && (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Customer type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="ngo">NGO</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="reseller">Reseller</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {customerType === 'individual' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" aria-invalid={!!errors.fullName} {...register('fullName')} />
              {errors.fullName && <p className="text-xs text-danger">{errors.fullName.message}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessName">Business / organisation name</Label>
              <Input id="businessName" aria-invalid={!!errors.businessName} {...register('businessName')} />
              {errors.businessName && <p className="text-xs text-danger">{errors.businessName.message}</p>}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phonePrimary">Phone number</Label>
            <Controller
              control={control}
              name="phonePrimary"
              render={({ field }) => (
                <PhoneField id="phonePrimary" aria-invalid={!!errors.phonePrimary} {...field} />
              )}
            />
            {errors.phonePrimary && <p className="text-xs text-danger">{errors.phonePrimary.message}</p>}
            {duplicateMatch && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                <span>
                  Already a customer: <strong>{duplicateMatch.display_name}</strong> ({duplicateMatch.customer_code})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 shrink-0 px-2 text-xs"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(`/customers/${duplicateMatch.id}`)
                  }}
                >
                  Open existing
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Business units</Label>
            <Controller
              control={control}
              name="businessUnits"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_UNITS.map((unit) => {
                    const checked = field.value.includes(unit)
                    return (
                      <button
                        type="button"
                        key={unit}
                        onClick={() =>
                          field.onChange(
                            checked ? field.value.filter((u) => u !== unit) : [...field.value, unit],
                          )
                        }
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm transition-colors',
                          checked ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-muted',
                        )}
                      >
                        {UNIT_LABEL[unit]}
                      </button>
                    )
                  })}
                </div>
              )}
            />
            {errors.businessUnits && <p className="text-xs text-danger">{errors.businessUnits.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="dormant">Dormant</SelectItem>
                      <SelectItem value="churned">Churned</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
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
                      <SelectItem value="__none">None</SelectItem>
                      {locations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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

          <div className="flex flex-col gap-1.5">
            <Label>Tags</Label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => <TagPicker value={field.value} onChange={field.onChange} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register('notes')} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="optedOut">Opted out of campaigns</Label>
              <p className="text-xs text-text-muted">Excluded from every campaign audience automatically.</p>
            </div>
            <Controller
              control={control}
              name="optedOut"
              render={({ field }) => (
                <Switch id="optedOut" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
