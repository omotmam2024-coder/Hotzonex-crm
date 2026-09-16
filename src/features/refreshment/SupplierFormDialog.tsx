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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import { SUPPLIER_CATEGORIES } from './useSuppliers'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  paymentTerms: z.string(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  name: '',
  category: 'beverages',
  phone: '',
  email: '',
  address: '',
  paymentTerms: '',
  notes: '',
}

interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId?: string
}

export function SupplierFormDialog({ open, onOpenChange, supplierId }: SupplierFormDialogProps) {
  const isEdit = !!supplierId
  const queryClient = useQueryClient()
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  useEffect(() => {
    if (!open) return
    if (!isEdit) {
      reset(DEFAULTS)
      return
    }
    void supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single()
      .then(({ data }) => {
        if (!data) return
        reset({
          name: data.name,
          category: data.category,
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
          paymentTerms: data.payment_terms ?? '',
          notes: data.notes ?? '',
        })
      })
  }, [open, isEdit, supplierId, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      name: values.name.trim(),
      category: values.category,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      address: values.address.trim() || null,
      payment_terms: values.paymentTerms.trim() || null,
      notes: values.notes.trim() || null,
    }
    const { error } = isEdit
      ? await supabase.from('suppliers').update(payload).eq('id', supplierId!)
      : await supabase.from('suppliers').insert(payload)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(isEdit ? 'Supplier updated' : 'Supplier created')
    await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit supplier' : 'New supplier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...register('address')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paymentTerms">Payment terms</Label>
            <Input id="paymentTerms" placeholder="e.g. Net 30" {...register('paymentTerms')} />
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
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
