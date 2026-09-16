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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  monthlyAmount: z.number().min(0),
  currency: z.enum(['SSP', 'USD']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string(),
  renewalDate: z.string(),
  autoRenew: z.boolean(),
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
  notes: '',
}

interface ContractFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetCustomer?: CustomerOption
}

export function ContractFormDialog({ open, onOpenChange, presetCustomer }: ContractFormDialogProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [customer, setCustomer] = useState<CustomerOption | null>(presetCustomer ?? null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  useEffect(() => {
    if (open) {
      reset(DEFAULTS)
      setCustomer(presetCustomer ?? null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(values: FormValues) {
    if (!customer) {
      toast.error('Pick a customer')
      return
    }
    const { error } = await supabase.from('contracts').insert({
      customer_id: customer.id,
      business_unit: 'services',
      title: values.title.trim(),
      monthly_amount: values.monthlyAmount,
      currency: values.currency,
      start_date: values.startDate,
      end_date: values.endDate || null,
      renewal_date: values.renewalDate || null,
      auto_renew: values.autoRenew,
      notes: values.notes.trim() || null,
      created_by: profile?.id,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Contract created')
    await queryClient.invalidateQueries({ queryKey: ['contracts'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
