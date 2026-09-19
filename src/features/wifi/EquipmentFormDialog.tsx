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
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

const TYPE_OPTIONS: { value: Database['public']['Enums']['equipment_type']; label: string }[] = [
  { value: 'router', label: 'Router' },
  { value: 'switch', label: 'Switch' },
  { value: 'access_point', label: 'Access point' },
  { value: 'ont', label: 'ONT' },
  { value: 'antenna', label: 'Antenna' },
  { value: 'modem', label: 'Modem' },
  { value: 'cable', label: 'Cable' },
  { value: 'other', label: 'Other' },
]

const schema = z.object({
  label: z.string().min(1, 'Required'),
  equipmentType: z.enum(['router', 'switch', 'access_point', 'ont', 'antenna', 'modem', 'cable', 'other']),
  businessUnit: z.enum(['wifi', 'services', 'refreshment']),
  status: z.enum(['in_stock', 'deployed', 'faulty', 'retired']),
  brand: z.string(),
  model: z.string(),
  serialNumber: z.string(),
  macAddress: z.string(),
  ipAddress: z.string(),
  locationId: z.string().nullable(),
  purchaseDate: z.string(),
  purchasePrice: z.number().min(0),
  currency: z.enum(['SSP', 'USD']),
  vendor: z.string(),
  warrantyExpiry: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

const asOptionalNumber = (v: string) => (v === '' ? 0 : Number(v))

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

const DEFAULTS: FormValues = {
  label: '',
  equipmentType: 'router',
  businessUnit: 'wifi',
  status: 'in_stock',
  brand: '',
  model: '',
  serialNumber: '',
  macAddress: '',
  ipAddress: '',
  locationId: null,
  purchaseDate: '',
  purchasePrice: 0,
  currency: 'SSP',
  vendor: '',
  warrantyExpiry: '',
  notes: '',
}

interface EquipmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipmentId?: string
  presetCustomer?: CustomerOption
}

export function EquipmentFormDialog({ open, onOpenChange, equipmentId, presetCustomer }: EquipmentFormDialogProps) {
  const isEdit = !!equipmentId
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: locations } = useLocations()
  const UNIT_LABEL = useUnitLabels()
  const [customer, setCustomer] = useState<CustomerOption | null>(presetCustomer ?? null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  useEffect(() => {
    if (!open) return
    if (!equipmentId) {
      reset(DEFAULTS)
      setCustomer(presetCustomer ?? null)
      return
    }
    // Guards against a stale response landing after the dialog has moved on
    // to a different record (closed and reopened before this fetch resolved).
    let cancelled = false
    void supabase
      .from('equipment')
      .select('*, customers(id, display_name, phone_primary, customer_code)')
      .eq('id', equipmentId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return
        reset({
          label: data.label,
          equipmentType: data.equipment_type,
          businessUnit: data.business_unit,
          status: data.status,
          brand: data.brand ?? '',
          model: data.model ?? '',
          serialNumber: data.serial_number ?? '',
          macAddress: data.mac_address ?? '',
          ipAddress: data.ip_address ?? '',
          locationId: data.location_id,
          purchaseDate: data.purchase_date ?? '',
          purchasePrice: data.purchase_price ?? 0,
          currency: data.currency ?? 'SSP',
          vendor: data.vendor ?? '',
          warrantyExpiry: data.warranty_expiry ?? '',
          notes: data.notes ?? '',
        })
        setCustomer(data.customers)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, equipmentId])

  async function onSubmit(values: FormValues) {
    const payload = {
      label: values.label.trim(),
      equipment_type: values.equipmentType,
      business_unit: values.businessUnit,
      status: values.status,
      brand: values.brand.trim() || null,
      model: values.model.trim() || null,
      serial_number: values.serialNumber.trim() || null,
      mac_address: values.macAddress.trim() || null,
      ip_address: values.ipAddress.trim() || null,
      customer_id: customer?.id ?? null,
      location_id: values.locationId,
      purchase_date: values.purchaseDate || null,
      purchase_price: values.purchasePrice || null,
      currency: values.purchasePrice ? values.currency : null,
      vendor: values.vendor.trim() || null,
      warranty_expiry: values.warrantyExpiry || null,
      notes: values.notes.trim() || null,
    }
    const { error } = isEdit
      ? await supabase.from('equipment').update(payload).eq('id', equipmentId!)
      : await supabase.from('equipment').insert({ ...payload, created_by: profile?.id })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(isEdit ? 'Equipment updated' : 'Equipment added')
    await queryClient.invalidateQueries({ queryKey: ['equipment'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit equipment' : 'New equipment'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" placeholder="e.g. Office router #3" aria-invalid={!!errors.label} {...register('label')} />
            {errors.label && <p className="text-xs text-danger">{errors.label.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="equipmentType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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
                      <SelectItem value="in_stock">In stock</SelectItem>
                      <SelectItem value="deployed">Deployed</SelectItem>
                      <SelectItem value="faulty">Faulty</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" {...register('brand')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="model">Model</Label>
              <Input id="model" {...register('model')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serialNumber">Serial number</Label>
              <Input id="serialNumber" {...register('serialNumber')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="macAddress">MAC address</Label>
              <Input id="macAddress" placeholder="AA:BB:CC:DD:EE:FF" {...register('macAddress')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ipAddress">Configured IP address</Label>
            <Input id="ipAddress" placeholder="192.168.1.1" {...register('ipAddress')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Customer (optional)</Label>
            <CustomerPicker value={customer} onChange={setCustomer} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Location (optional)</Label>
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
            <Label className="text-xs text-text-muted uppercase tracking-wide">Purchase & warranty</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="purchaseDate">Purchase date</Label>
                <Input id="purchaseDate" type="date" {...register('purchaseDate')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="warrantyExpiry">Warranty expiry</Label>
                <Input id="warrantyExpiry" type="date" {...register('warrantyExpiry')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="purchasePrice">Purchase price</Label>
                <Input id="purchasePrice" type="number" step="0.01" min="0" {...register('purchasePrice', { setValueAs: asOptionalNumber })} />
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
              <Label htmlFor="vendor">Vendor / supplier</Label>
              <Input id="vendor" {...register('vendor')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Configuration notes</Label>
            <Textarea id="notes" rows={3} placeholder="Admin login, SSID, firmware version, anything worth documenting…" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add equipment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
