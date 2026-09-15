import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
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
import { useLocations } from '@/hooks/useLocations'
import { supabase } from '@/lib/supabase'
import { useResellers } from './useResellers'
import { useServicePlans } from './useServicePlans'

const schema = z.object({
  planId: z.string().min(1, 'Pick a plan'),
  locationId: z.string().min(1, 'Pick a location'),
  quantity: z.number().min(1, 'At least 1').max(5000, 'Max 5000 at a time'),
  resellerId: z.string().nullable(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface GenerateBatchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated?: (batchId: string) => void
}

export function GenerateBatchDialog({ open, onOpenChange, onGenerated }: GenerateBatchDialogProps) {
  const queryClient = useQueryClient()
  const { data: plans } = useServicePlans(true)
  const { data: locations } = useLocations()
  const { data: resellers } = useResellers(true)

  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { planId: '', locationId: '', quantity: 50, resellerId: null, notes: '' },
  })

  async function onSubmit(values: FormValues) {
    const { data, error } = await supabase.rpc('fn_generate_voucher_batch', {
      p_plan_id: values.planId,
      p_location_id: values.locationId,
      p_quantity: values.quantity,
      p_reseller_id: values.resellerId ?? undefined,
      p_notes: values.notes?.trim() || undefined,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Generated ${values.quantity} vouchers`)
    await queryClient.invalidateQueries({ queryKey: ['voucher_batches'] })
    reset()
    onOpenChange(false)
    if (data) onGenerated?.(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate voucher batch</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Plan</Label>
            <Controller
              control={control}
              name="planId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.planId && <p className="text-xs text-danger">{errors.planId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <Controller
              control={control}
              name="locationId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.locationId && <p className="text-xs text-danger">{errors.locationId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" min="1" max="5000" {...register('quantity', { valueAsNumber: true })} />
            {errors.quantity && <p className="text-xs text-danger">{errors.quantity.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Allocate to reseller (optional)</Label>
            <Controller
              control={control}
              name="resellerId"
              render={({ field }) => (
                <Select value={field.value ?? '__none'} onValueChange={(v) => field.onChange(v === '__none' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None — keep in-house</SelectItem>
                    {resellers?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
              {isSubmitting ? 'Generating…' : 'Generate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
