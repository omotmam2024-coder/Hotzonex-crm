import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { useLocations } from '@/hooks/useLocations'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  customerId: z.string().min(1, 'Pick a customer'),
  jobType: z.enum(['home', 'office', 'hotspot', 'relocation', 'upgrade']),
  scheduledAt: z.string().min(1, 'Pick a date/time'),
  technicianId: z.string().nullable(),
  locationId: z.string().nullable(),
  installFee: z.number().min(0),
  routerModel: z.string().optional(),
  antenna: z.string().optional(),
  cableMetres: z.string().optional(),
  mounts: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  customerId: '',
  jobType: 'home',
  scheduledAt: '',
  technicianId: null,
  locationId: null,
  installFee: 0,
  routerModel: '',
  antenna: '',
  cableMetres: '',
  mounts: '',
}

interface InstallationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstallationFormDialog({ open, onOpenChange }: InstallationFormDialogProps) {
  const queryClient = useQueryClient()
  const { data: locations } = useLocations()
  const { data: technicians } = useQuery({
    queryKey: ['profiles', 'technicians'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name').eq('role', 'technician').eq('is_active', true)
      if (error) throw error
      return data
    },
  })

  const { control, register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })

  async function onSubmit(values: FormValues) {
    const { data: userData } = await supabase.auth.getUser()
    const equipment = {
      router_model: values.routerModel || null,
      antenna: values.antenna || null,
      cable_metres: values.cableMetres || null,
      mounts: values.mounts || null,
    }
    const { error } = await supabase.from('installations').insert({
      customer_id: values.customerId,
      job_type: values.jobType,
      scheduled_at: values.scheduledAt,
      technician_id: values.technicianId,
      location_id: values.locationId,
      install_fee: values.installFee,
      equipment,
      created_by: userData.user?.id,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Installation scheduled')
    await queryClient.invalidateQueries({ queryKey: ['installations'] })
    reset(DEFAULTS)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule installation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Customer</Label>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <CustomerPicker
                  value={field.value ? { id: field.value, display_name: '', phone_primary: '', customer_code: null } : null}
                  onChange={(c) => field.onChange(c?.id ?? '')}
                />
              )}
            />
            {errors.customerId && <p className="text-xs text-danger">{errors.customerId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Job type</Label>
              <Controller
                control={control}
                name="jobType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="hotspot">Hotspot</SelectItem>
                      <SelectItem value="relocation">Relocation</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduledAt">Date/time</Label>
              <Input id="scheduledAt" type="datetime-local" {...register('scheduledAt')} />
              {errors.scheduledAt && <p className="text-xs text-danger">{errors.scheduledAt.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Technician</Label>
              <Controller
                control={control}
                name="technicianId"
                render={({ field }) => (
                  <Select value={field.value ?? '__none'} onValueChange={(v) => field.onChange(v === '__none' ? null : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Unassigned</SelectItem>
                      {technicians?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name}
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
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="installFee">Quoted install fee (SSP)</Label>
            <Input
              id="installFee"
              type="number"
              min="0"
              step="0.01"
              {...register('installFee', { setValueAs: (v: string) => (v === '' ? 0 : Number(v)) })}
            />
          </div>

          <p className="text-xs text-text-muted">Equipment (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Router model" {...register('routerModel')} />
            <Input placeholder="Antenna" {...register('antenna')} />
            <Input placeholder="Cable (metres)" {...register('cableMetres')} />
            <Input placeholder="Mounts" {...register('mounts')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Scheduling…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
