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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  customerId: z.string().min(1, 'Pick a customer'),
  customerLabel: z.string(),
  type: z.enum(['call', 'whatsapp', 'sms', 'email', 'visit', 'meeting', 'note']),
  direction: z.enum(['inbound', 'outbound', 'internal']),
  subject: z.string().optional(),
  body: z.string().optional(),
  outcome: z.string().optional(),
  durationMinutes: z.string().optional(),
  scheduleNext: z.boolean(),
  nextTitle: z.string().optional(),
  nextDueAt: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface LogActivityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string
  customerLabel?: string
  onLogged?: () => void
}

export function LogActivityModal({
  open,
  onOpenChange,
  customerId,
  customerLabel,
  onLogged,
}: LogActivityModalProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: customerId ?? '',
      customerLabel: customerLabel ?? '',
      type: 'call',
      direction: 'outbound',
      subject: '',
      body: '',
      outcome: '',
      durationMinutes: '',
      scheduleNext: false,
      nextTitle: '',
      nextDueAt: '',
    },
  })

  // Re-seed the form whenever the modal opens for a (possibly different) customer.
  if (open && customerId && watch('customerId') !== customerId && !watch('customerId')) {
    reset({
      customerId,
      customerLabel: customerLabel ?? '',
      type: 'call',
      direction: 'outbound',
      subject: '',
      body: '',
      outcome: '',
      durationMinutes: '',
      scheduleNext: false,
      nextTitle: '',
      nextDueAt: '',
    })
  }

  async function onSubmit(values: FormValues) {
    const { error: activityError } = await supabase.from('activities').insert({
      customer_id: values.customerId,
      type: values.type,
      direction: values.direction,
      subject: values.subject?.trim() || null,
      body: values.body?.trim() || null,
      outcome: values.outcome?.trim() || null,
      duration_minutes: values.durationMinutes ? Number(values.durationMinutes) : null,
      user_id: profile?.id,
    })
    if (activityError) {
      toast.error(activityError.message)
      return
    }

    if (values.scheduleNext && values.nextTitle?.trim()) {
      const { error: taskError } = await supabase.from('tasks').insert({
        title: values.nextTitle.trim(),
        due_at: values.nextDueAt || null,
        customer_id: values.customerId,
        assigned_to: profile?.id,
        created_by: profile?.id,
      })
      if (taskError) toast.error(`Activity logged, but the follow-up task failed: ${taskError.message}`)
    }

    await queryClient.invalidateQueries({ queryKey: ['activities'] })
    await queryClient.invalidateQueries({ queryKey: ['tasks'] })
    toast.success('Activity logged')
    reset()
    onOpenChange(false)
    onLogged?.()
  }

  const scheduleNext = watch('scheduleNext')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {!customerId && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <CustomerPicker
                    value={field.value ? { id: field.value, display_name: watch('customerLabel'), phone_primary: '', customer_code: null } : null}
                    onChange={(c) => {
                      field.onChange(c?.id ?? '')
                    }}
                  />
                )}
              />
              {errors.customerId && <p className="text-xs text-danger">{errors.customerId.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="visit">Visit</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Direction</Label>
              <Controller
                control={control}
                name="direction"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...register('subject')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Notes</Label>
            <Textarea id="body" rows={3} {...register('body')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="durationMinutes">Duration (minutes)</Label>
            <Input id="durationMinutes" type="number" min="0" {...register('durationMinutes')} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="scheduleNext">Schedule next action</Label>
            <Controller
              control={control}
              name="scheduleNext"
              render={({ field }) => (
                <Switch id="scheduleNext" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {scheduleNext && (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nextTitle">Task</Label>
                <Input id="nextTitle" placeholder="e.g. Follow up on quote" {...register('nextTitle')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nextDueAt">Due</Label>
                <Input id="nextDueAt" type="datetime-local" {...register('nextDueAt')} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging…' : 'Log activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
