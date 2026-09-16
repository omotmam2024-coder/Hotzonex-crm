import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
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
import { formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useServicePlans } from '@/features/wifi/useServicePlans'

type BusinessUnit = Database['public']['Enums']['business_unit']

const lineSchema = z.object({
  planId: z.string().nullable(),
  description: z.string().min(1, 'Required'),
  quantity: z.number().min(0.01, 'Must be greater than 0'),
  unitPrice: z.number().min(0),
  discount: z.number().min(0),
})

const schema = z.object({
  businessUnit: z.enum(['wifi', 'services', 'refreshment']),
  locationId: z.string().nullable(),
  currency: z.enum(['SSP', 'USD']),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  notes: z.string(),
  terms: z.string(),
  items: z.array(lineSchema).min(1, 'Add at least one line item'),
})

type FormValues = z.infer<typeof schema>

const asRequiredNumber = (v: string) => (v === '' ? 0 : Number(v))

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetCustomer?: CustomerOption
  defaultBusinessUnit?: BusinessUnit
}

function today() {
  return format(new Date(), 'yyyy-MM-dd')
}
function in14Days() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return format(d, 'yyyy-MM-dd')
}

export function InvoiceFormDialog({ open, onOpenChange, presetCustomer, defaultBusinessUnit }: InvoiceFormDialogProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: locations } = useLocations()
  const { data: plans } = useServicePlans(true)
  const [customer, setCustomer] = useState<CustomerOption | null>(presetCustomer ?? null)

  const defaults: FormValues = {
    businessUnit: defaultBusinessUnit ?? (profile?.business_units[0] as BusinessUnit) ?? 'wifi',
    locationId: null,
    currency: 'SSP',
    issueDate: today(),
    dueDate: in14Days(),
    notes: '',
    terms: '',
    items: [{ planId: null, description: '', quantity: 1, unitPrice: 0, discount: 0 }],
  }

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')

  useEffect(() => {
    if (open) {
      reset(defaults)
      setCustomer(presetCustomer ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const total = items?.reduce((sum, it) => sum + Math.max(it.quantity * it.unitPrice - it.discount, 0), 0) ?? 0

  async function onSubmit(values: FormValues) {
    if (!customer) {
      toast.error('Pick a customer')
      return
    }
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        customer_id: customer.id,
        business_unit: values.businessUnit,
        location_id: values.locationId,
        currency: values.currency,
        issue_date: values.issueDate,
        due_date: values.dueDate,
        status: 'draft',
        notes: values.notes.trim() || null,
        terms: values.terms.trim() || null,
        created_by: profile?.id,
      })
      .select('id')
      .single()
    if (error || !invoice) {
      toast.error(error?.message ?? 'Could not create invoice')
      return
    }

    const { error: itemsError } = await supabase.from('invoice_items').insert(
      values.items.map((it, i) => ({
        invoice_id: invoice.id,
        plan_id: it.planId,
        description: it.description.trim(),
        quantity: it.quantity,
        unit_price: it.unitPrice,
        discount: it.discount,
        sort_order: i,
      })),
    )
    if (itemsError) {
      toast.error(itemsError.message)
      await supabase.from('invoices').delete().eq('id', invoice.id)
      return
    }

    toast.success('Invoice created')
    await queryClient.invalidateQueries({ queryKey: ['invoices'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          {!presetCustomer && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
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
                      <SelectItem value="wifi">WiFi</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="refreshment">Refreshment</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issueDate">Issue date</Label>
              <Input id="issueDate" type="date" {...register('issueDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>
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

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ planId: null, description: '', quantity: 1, unitPrice: 0, discount: 0 })}
              >
                <PlusIcon className="size-4" /> Add line
              </Button>
            </div>
            {errors.items?.message && <p className="text-xs text-danger">{errors.items.message}</p>}
            {fields.map((field, i) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
                <div className="flex items-start gap-2">
                  <Controller
                    control={control}
                    name={`items.${i}.planId`}
                    render={({ field: planField }) => (
                      <Select
                        value={planField.value ?? '__custom'}
                        onValueChange={(v) => {
                          planField.onChange(v === '__custom' ? null : v)
                          const plan = plans?.find((p) => p.id === v)
                          if (plan) {
                            setValue(`items.${i}.description`, plan.name)
                            setValue(`items.${i}.unitPrice`, plan.price_ssp)
                          }
                        }}
                      >
                        <SelectTrigger className="w-36 shrink-0">
                          <SelectValue placeholder="From plan…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom">Free text</SelectItem>
                          {plans?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Input placeholder="Description" {...register(`items.${i}.description`)} className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-danger"
                    disabled={fields.length === 1}
                    onClick={() => remove(i)}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-text-muted">Qty</Label>
                    <Input type="number" step="0.01" min="0" {...register(`items.${i}.quantity`, { setValueAs: asRequiredNumber })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-text-muted">Unit price</Label>
                    <Input type="number" step="0.01" min="0" {...register(`items.${i}.unitPrice`, { setValueAs: asRequiredNumber })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-text-muted">Discount</Label>
                    <Input type="number" step="0.01" min="0" {...register(`items.${i}.discount`, { setValueAs: asRequiredNumber })} />
                  </div>
                </div>
              </div>
            ))}
            <p className="text-right text-sm font-semibold text-text">
              Total: {formatMoney(total, watch('currency'))}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="terms">Terms</Label>
            <Textarea id="terms" rows={2} {...register('terms')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
