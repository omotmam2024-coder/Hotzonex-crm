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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/useAuth'
import { useLocations } from '@/hooks/useLocations'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import type { BusinessUnit, UserRole } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const ROLES: { value: Exclude<UserRole, 'owner'>; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'agent', label: 'Agent' },
  { value: 'technician', label: 'Technician' },
  { value: 'viewer', label: 'Viewer' },
]

const schema = z.object({
  email: z.string(),
  fullName: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'manager', 'agent', 'technician', 'viewer']),
  businessUnits: z.array(z.enum(['wifi', 'services', 'refreshment'])),
  locationIds: z.array(z.string()),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  email: '',
  fullName: '',
  role: 'viewer',
  businessUnits: ['wifi', 'services', 'refreshment'],
  locationIds: [],
  isActive: true,
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
}

export function UserFormDialog({ open, onOpenChange, userId }: UserFormDialogProps) {
  const isEdit = !!userId
  const { profile: currentProfile } = useAuth()
  const isSelf = isEdit && userId === currentProfile?.id
  const queryClient = useQueryClient()
  const { data: locations } = useLocations(false)
  const unitLabels = useUnitLabels()
  const UNITS: { value: BusinessUnit; label: string }[] = [
    { value: 'wifi', label: unitLabels.wifi },
    { value: 'services', label: unitLabels.services },
    { value: 'refreshment', label: unitLabels.refreshment },
  ]
  const [isOwner, setIsOwner] = useState(false)
  const [existingEmail, setExistingEmail] = useState('')
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  useEffect(() => {
    if (!open) return
    setIsOwner(false)
    setExistingEmail('')
    if (!isEdit) {
      reset(DEFAULTS)
      return
    }
    void supabase
      .from('profiles')
      .select('full_name, email, role, business_units, location_ids, is_active')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setIsOwner(data.role === 'owner')
        setExistingEmail(data.email ?? '—')
        reset({
          email: data.email ?? '',
          fullName: data.full_name,
          role: data.role === 'owner' ? 'admin' : data.role,
          businessUnits: data.business_units,
          locationIds: data.location_ids,
          isActive: data.is_active,
        })
      })
  }, [open, isEdit, userId, reset])

  async function onSubmit(values: FormValues) {
    if (isEdit) {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.fullName.trim(),
          ...(isOwner ? {} : { role: values.role }),
          business_units: values.businessUnits,
          location_ids: values.locationIds,
          is_active: values.isActive,
        })
        .eq('id', userId!)
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('User updated')
      await queryClient.invalidateQueries({ queryKey: ['profiles', 'admin-users'] })
      onOpenChange(false)
      return
    }

    const email = values.email.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email')
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      toast.error('Your session expired — sign in again and retry.')
      return
    }

    const { data, error } = await supabase.functions.invoke<{ user_id?: string; error?: string }>('admin-invite-user', {
      body: {
        email,
        full_name: values.fullName.trim(),
        role: values.role,
        business_units: values.businessUnits,
        location_ids: values.locationIds,
      },
    })
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Could not send invite')
      return
    }
    toast.success(`Invite sent to ${email}`)
    await queryClient.invalidateQueries({ queryKey: ['profiles', 'admin-users'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit user' : 'Invite staff'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {isEdit ? (
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input value={existingEmail} disabled readOnly />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="off" {...register('email')} />
              <p className="text-xs text-text-muted">An invite link to set a password is sent to this address.</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" aria-invalid={!!errors.fullName} {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-danger">{errors.fullName.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            {isOwner ? (
              <p className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text-muted">
                Owner — assigned automatically to the first account, can't be changed here.
              </p>
            ) : (
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Business units</Label>
            <Controller
              control={control}
              name="businessUnits"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {UNITS.map((unit) => {
                    const checked = field.value.includes(unit.value)
                    return (
                      <button
                        type="button"
                        key={unit.value}
                        onClick={() =>
                          field.onChange(
                            checked ? field.value.filter((u) => u !== unit.value) : [...field.value, unit.value],
                          )
                        }
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm transition-colors',
                          checked ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-muted',
                        )}
                      >
                        {unit.label}
                      </button>
                    )
                  })}
                </div>
              )}
            />
            <p className="text-xs text-text-muted">Which business units this person can see and work in.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Locations</Label>
            <Controller
              control={control}
              name="locationIds"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {(locations ?? []).map((loc) => {
                    const checked = field.value.includes(loc.id)
                    return (
                      <button
                        type="button"
                        key={loc.id}
                        onClick={() =>
                          field.onChange(checked ? field.value.filter((id) => id !== loc.id) : [...field.value, loc.id])
                        }
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-sm transition-colors',
                          checked ? 'border-accent bg-accent/15 text-accent' : 'border-border text-text-muted',
                        )}
                      >
                        {loc.name}
                      </button>
                    )
                  })}
                </div>
              )}
            />
            <p className="text-xs text-text-muted">Leave empty for managers/agents/viewers to see every location.</p>
          </div>

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="isActive">Active</Label>
                {isSelf && <p className="text-xs text-text-muted">You can't deactivate your own account.</p>}
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch id="isActive" checked={field.value} disabled={isSelf} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
