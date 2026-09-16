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
import { useProfiles } from '@/hooks/useProfiles'
import { supabase } from '@/lib/supabase'

const PROJECT_TYPES = ['website', 'web_app', 'network_setup', 'it_support', 'maintenance', 'other']

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  projectType: z.string(),
  startDate: z.string(),
  dueDate: z.string(),
  budget: z.number().min(0),
  currency: z.enum(['SSP', 'USD']),
  ownerId: z.string().nullable(),
  description: z.string(),
})

type FormValues = z.infer<typeof schema>

const asRequiredNumber = (v: string) => (v === '' ? 0 : Number(v))

interface CustomerOption {
  id: string
  display_name: string | null
  phone_primary: string
  customer_code: string | null
}

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetCustomer?: CustomerOption
  projectId?: string
  onCreated?: (projectId: string) => void
}

const DEFAULTS: FormValues = {
  name: '',
  projectType: 'website',
  startDate: '',
  dueDate: '',
  budget: 0,
  currency: 'SSP',
  ownerId: null,
  description: '',
}

export function ProjectFormDialog({ open, onOpenChange, presetCustomer, projectId, onCreated }: ProjectFormDialogProps) {
  const isEdit = !!projectId
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: profiles } = useProfiles()
  const [customer, setCustomer] = useState<CustomerOption | null>(presetCustomer ?? null)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { ...DEFAULTS, ownerId: profile?.id ?? null } })

  useEffect(() => {
    if (!open) return
    if (!isEdit) {
      reset({ ...DEFAULTS, ownerId: profile?.id ?? null })
      setCustomer(presetCustomer ?? null)
      return
    }
    void supabase
      .from('projects')
      .select('*, customers(id, display_name, phone_primary, customer_code)')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (!data) return
        reset({
          name: data.name,
          projectType: data.project_type,
          startDate: data.start_date ?? '',
          dueDate: data.due_date ?? '',
          budget: data.budget,
          currency: data.currency,
          ownerId: data.owner_id,
          description: data.description ?? '',
        })
        setCustomer(data.customers)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, projectId])

  async function onSubmit(values: FormValues) {
    if (!customer) {
      toast.error('Pick a customer')
      return
    }
    const payload = {
      customer_id: customer.id,
      name: values.name.trim(),
      project_type: values.projectType,
      start_date: values.startDate || null,
      due_date: values.dueDate || null,
      budget: values.budget,
      currency: values.currency,
      owner_id: values.ownerId,
      description: values.description.trim() || null,
    }
    const { data, error } = isEdit
      ? await supabase.from('projects').update(payload).eq('id', projectId!).select('id').single()
      : await supabase.from('projects').insert({ ...payload, created_by: profile?.id }).select('id').single()
    if (error || !data) {
      toast.error(error?.message ?? `Could not ${isEdit ? 'update' : 'create'} project`)
      return
    }
    toast.success(isEdit ? 'Project updated' : 'Project created')
    await queryClient.invalidateQueries({ queryKey: ['projects'] })
    onOpenChange(false)
    onCreated?.(data.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit project' : 'New project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
          {!presetCustomer && (
            <div className="flex flex-col gap-1.5">
              <Label>Customer</Label>
              <CustomerPicker value={customer} onChange={setCustomer} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Controller
              control={control}
              name="projectType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget">Budget</Label>
              <Input id="budget" type="number" step="0.01" min="0" {...register('budget', { setValueAs: asRequiredNumber })} />
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
            <Label>Owner</Label>
            <Controller
              control={control}
              name="ownerId"
              render={({ field }) => (
                <Select value={field.value ?? '__none'} onValueChange={(v) => field.onChange(v === '__none' ? null : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Unassigned</SelectItem>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
