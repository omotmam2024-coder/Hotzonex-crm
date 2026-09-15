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
import { Textarea } from '@/components/ui/textarea'
import { PhoneField } from '@/components/shared/PhoneField'
import { useLocations } from '@/hooks/useLocations'
import { toE164 } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Enter a phone number'),
  locationId: z.string().nullable(),
  commissionRate: z.number().min(0).max(100),
  isActive: z.boolean(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = { name: '', phone: '', locationId: null, commissionRate: 10, isActive: true, notes: '' }

interface ResellerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resellerId?: string
}

export function ResellerFormDialog({ open, onOpenChange, resellerId }: ResellerFormDialogProps) {
  const isEdit = !!resellerId
  const queryClient = useQueryClient()
  const { data: locations } = useLocations()
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
      .from('resellers')
      .select('*')
      .eq('id', resellerId)
      .single()
      .then(({ data }) => {
        if (!data) return
        reset({
          name: data.name,
          phone: data.phone,
          locationId: data.location_id,
          commissionRate: data.commission_rate,
          isActive: data.is_active,
          notes: data.notes ?? '',
        })
      })
  }, [open, isEdit, resellerId, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name.trim(),
      phone: toE164(values.phone),
      location_id: values.locationId,
      commission_rate: values.commissionRate,
      is_active: values.isActive,
      notes: values.notes?.trim() || null,
    }
    const { error } = isEdit
      ? await supabase.from('resellers').update(payload).eq('id', resellerId!)
      : await supabase.from('resellers').insert(payload)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(isEdit ? 'Reseller updated' : 'Reseller added')
    await queryClient.invalidateQueries({ queryKey: ['resellers'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit reseller' : 'New reseller'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Controller control={control} name="phone" render={({ field }) => <PhoneField id="phone" {...field} />} />
            {errors.phone && <p className="text-xs text-danger">{errors.phone.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commissionRate">Commission %</Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                {...register('commissionRate', { setValueAs: (v: string) => (v === '' ? 0 : Number(v)) })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
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
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add reseller'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
