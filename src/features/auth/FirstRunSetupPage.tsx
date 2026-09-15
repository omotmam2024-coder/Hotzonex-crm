import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { AuthLayout } from './AuthLayout'

const schema = z
  .object({
    fullName: z.string().min(1, 'Your name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })

type FormValues = z.infer<typeof schema>

export function FirstRunSetupPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    let active = true
    supabase.rpc('is_first_run').then(({ data }) => {
      if (!active) return
      if (data !== true) {
        navigate('/login', { replace: true })
        return
      }
      setChecking(false)
    })
    return () => {
      active = false
    }
  }, [navigate])

  async function onSubmit(values: FormValues) {
    setFormError(null)
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName } },
    })
    if (error) {
      setFormError(error.message)
      return
    }
    if (data.session) {
      navigate('/', { replace: true })
    } else {
      setAwaitingConfirmation(true)
    }
  }

  if (checking) {
    return (
      <AuthLayout>
        <div className="h-40 animate-pulse rounded-card bg-surface" />
      </AuthLayout>
    )
  }

  if (awaitingConfirmation) {
    return (
      <AuthLayout>
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 text-center">
          <h2 className="text-base font-semibold text-text">Confirm your email</h2>
          <p className="text-sm text-text-muted">
            We&apos;ve sent a confirmation link to finish creating your owner account. Open it, then sign in.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
        <div>
          <h2 className="text-base font-semibold text-text">Create the owner account</h2>
          <p className="text-sm text-text-muted">
            No one has set up Hotzonex CRM yet. This first account gets the <span className="text-text">owner</span> role and
            can invite the rest of the team afterwards.
          </p>
        </div>

        {formError && (
          <div role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
          {errors.fullName && <p className="text-xs text-danger">{errors.fullName.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="you@hotzonex.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register('confirm')}
          />
          {errors.confirm && <p className="text-xs text-danger">{errors.confirm.message}</p>}
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Creating…' : 'Create owner account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
