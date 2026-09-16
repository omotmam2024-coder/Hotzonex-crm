import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2Icon } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/format'
import { can } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  monthlyAmount: z.number().min(0),
  currency: z.enum(['SSP', 'USD']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string(),
  renewalDate: z.string(),
  autoRenew: z.boolean(),
  isActive: z.boolean(),
  notes: z.string(),
})

type FormValues = z.infer<typeof schema>

const asRequiredNumber = (v: string) => (v === '' ? 0 : Number(v))

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

const DEFAULTS: FormValues = {
  title: '',
  monthlyAmount: 0,
  currency: 'SSP',
  startDate: '',
  endDate: '',
  renewalDate: '',
  autoRenew: true,
  isActive: true,
  notes: '',
}

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetCustomer?: CustomerOption
  contractId?: string
}

export function ContractFormDialog({ open, onOpenChange, presetCustomer, contractId }: ContractFormDialogProps) {
  const isEdit = !!contractId
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [customer, setCustomer] = useState<CustomerOption | null>(presetCustomer ?? null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const canDelete = can(profile, 'delete')

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  useEffect(() => {
    if (!open) return
    setCreatedAt(null)
    if (!isEdit) {
      reset(DEFAULTS)
      setCustomer(presetCustomer ?? null)
      return
    }
    void supabase
      .from('contracts')
      .select('*, customers(id, display_name, phone_primary, customer_code)')
      .eq('id', contractId)
      .single()
      .then(({ data }) => {
        if (!data) return
        reset({
          title: data.title,
          monthlyAmount: data.monthly_amount,
          currency: data.currency,
          startDate: data.start_date,
          endDate: data.end_date ?? '',
          renewalDate: data.renewal_date ?? '',
          autoRenew: data.auto_renew,
          isActive: data.is_active,
          notes: data.notes ?? '',
        })
        setCustomer(data.customers)
        setCreatedAt(data.created_at)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, contractId])

  async function onSubmit(values: FormValues) {
    if (!customer) {
      toast.error('Pick a customer')
      return
    }
    const payload = {
      customer_id: customer.id,
      business_unit: 'services' as const,
      title: values.title.trim(),
      monthly_amount: values.monthlyAmount,
      currency: values.currency,
      start_date: values.startDate,
      end_date: values.endDate || null,
      renewal_date: values.renewalDate || null,
      auto_renew: values.autoRenew,
      is_active: values.isActive,
      notes: values.notes.trim() || null,
    }
    const { error } = isEdit
      ? await supabase.from('contracts').update(payload).eq('id', contractId!)
      : await supabase.from('contracts').insert({ ...payload, created_by: profile?.id })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(isEdit ? 'Contract updated' : 'Contract created')
    await queryClient.invalidateQueries({ queryKey: ['contracts'] })
    onOpenChange(false)
  }

  async function deleteContract() {
    if (!contractId) return
    setDeleting(true)
    const { error } = await supabase.from('contracts').delete().eq('id', contractId)
    setDeleting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Contract deleted')
    setDeleteOpen(false)
    await queryClient.invalidateQueries({ queryKey: ['contracts'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit contract' : 'New contract'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          {isEdit && createdAt && <p className="text-xs text-text-muted">Created {formatDate(createdAt)}</p>}
          {!presetCustomer && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="e.g. Monthly IT support retainer" aria-invalid={!!errors.title} {...register('title')} />
            {errors.title && <p className="text-xs text-danger">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthlyAmount">Monthly amount</Label>
              <Input id="monthlyAmount" type="number" step="0.01" min="0" {...register('monthlyAmount', { setValueAs: asRequiredNumber })} />
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

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start</Label>
              <Input id="startDate" type="date" aria-invalid={!!errors.startDate} {...register('startDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">End (optional)</Label>
              <Input id="endDate" type="date" {...register('endDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="renewalDate">Renewal date</Label>
              <Input id="renewalDate" type="date" {...register('renewalDate')} />
            </div>
          </div>
          {errors.startDate && <p className="text-xs text-danger">{errors.startDate.message}</p>}

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="autoRenew">Auto-renew</Label>
            <Controller
              control={control}
              name="autoRenew"
              render={({ field }) => <Switch id="autoRenew" checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <Label htmlFor="isActive">Active</Label>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter className={isEdit && canDelete ? 'sm:justify-between' : undefined}>
            {isEdit && canDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-danger hover:text-danger"
                onClick={() => setDeleteOpen(true)}
                disabled={isSubmitting}
              >
                <Trash2Icon className="size-4" /> Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create contract'}
              </Button>
            </div>
          </DialogFooter>
        </form>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this contract?"
          description="This permanently removes the contract record. It won't affect invoices already raised."
          confirmLabel="Delete contract"
          variant="destructive"
          loading={deleting}
          onConfirm={deleteContract}
        />
      </DialogContent>
    </Dialog>
  )
}
