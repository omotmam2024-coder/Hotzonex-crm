import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useEffect } from 'react'
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
import { useAuth } from '@/hooks/useAuth'
import { formatMoney } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useSuppliers } from './useSuppliers'

const itemSchema = z.object({
  name: z.string().min(1, 'Required'),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
})

const schema = z.object({
  supplierId: z.string().min(1, 'Pick a supplier'),
  orderDate: z.string().min(1),
  expectedDate: z.string(),
  currency: z.enum(['SSP', 'USD']),
  notes: z.string(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
})

type FormValues = z.infer<typeof schema>

const asRequiredNumber = (v: string) => (v === '' ? 0 : Number(v))

function today() {
  return new Date().toISOString().slice(0, 10)
}

const DEFAULTS: FormValues = {
  supplierId: '',
  orderDate: today(),
  expectedDate: '',
  currency: 'SSP',
  notes: '',
  items: [{ name: '', quantity: 1, unitPrice: 0 }],
}

interface SupplierOrderFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SupplierOrderFormDialog({ open, onOpenChange }: SupplierOrderFormDialogProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: suppliers } = useSuppliers(true)

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = watch('items')
  const currency = watch('currency')

  useEffect(() => {
    if (open) reset(DEFAULTS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const total = items?.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0) ?? 0

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.from('supplier_orders').insert({
      supplier_id: values.supplierId,
      order_date: values.orderDate,
      expected_date: values.expectedDate || null,
      currency: values.currency,
      total,
      items: values.items.map((it) => ({ name: it.name.trim(), quantity: it.quantity, unit_price: it.unitPrice })),
      notes: values.notes.trim() || null,
      created_by: profile?.id,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Order created')
    await queryClient.invalidateQueries({ queryKey: ['supplier_orders'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New supplier order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label>Supplier</Label>
            <Controller
              control={control}
              name="supplierId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a supplier…" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.supplierId && <p className="text-xs text-danger">{errors.supplierId.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="orderDate">Order date</Label>
              <Input id="orderDate" type="date" {...register('orderDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedDate">Expected</Label>
              <Input id="expectedDate" type="date" {...register('expectedDate')} />
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

          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', quantity: 1, unitPrice: 0 })}>
                <PlusIcon className="size-4" /> Add item
              </Button>
            </div>
            {errors.items?.message && <p className="text-xs text-danger">{errors.items.message}</p>}
            {fields.map((field, i) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input placeholder="Item name" {...register(`items.${i}.name`)} className="flex-1" />
                <Input type="number" step="0.01" min="0" placeholder="Qty" className="w-20" {...register(`items.${i}.quantity`, { setValueAs: asRequiredNumber })} />
                <Input type="number" step="0.01" min="0" placeholder="Price" className="w-24" {...register(`items.${i}.unitPrice`, { setValueAs: asRequiredNumber })} />
                <Button type="button" variant="ghost" size="icon" className="text-danger" disabled={fields.length === 1} onClick={() => remove(i)}>
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            ))}
            <p className="text-right text-sm font-semibold text-text">Total: {formatMoney(total, currency)}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
