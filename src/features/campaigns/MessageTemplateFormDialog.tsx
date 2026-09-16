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
import { renderTemplate, SAMPLE_TEMPLATE_VALUES } from '@/lib/messageTemplate'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  channel: z.enum(['whatsapp', 'sms', 'email']),
  body: z.string().min(1, 'Body is required'),
})

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = { name: '', channel: 'whatsapp', body: '' }

interface MessageTemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId?: string
}

export function MessageTemplateFormDialog({ open, onOpenChange, templateId }: MessageTemplateFormDialogProps) {
  const isEdit = !!templateId
  const queryClient = useQueryClient()
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS })

  useEffect(() => {
    if (!open) return
    if (!isEdit) {
      reset(DEFAULTS)
      return
    }
    void supabase
      .from('message_templates')
      .select('name, channel, body')
      .eq('id', templateId)
      .single()
      .then(({ data }) => {
        if (data) reset(data)
      })
  }, [open, isEdit, templateId, reset])

  const body = watch('body')

  async function onSubmit(values: FormValues) {
    const payload = { name: values.name.trim(), channel: values.channel, body: values.body.trim() }
    const { error } = isEdit
      ? await supabase.from('message_templates').update(payload).eq('id', templateId!)
      : await supabase.from('message_templates').insert(payload)
    if (error) {
      toast.error(error.code === '23505' ? 'A template with that name already exists.' : error.message)
      return
    }
    toast.success(isEdit ? 'Template updated' : 'Template created')
    await queryClient.invalidateQueries({ queryKey: ['message_templates'] })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit template' : 'New template'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Channel</Label>
            <Controller
              control={control}
              name="channel"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              rows={4}
              placeholder="Hello {{customer_name}}, your {{plan}} expires on {{expiry_date}}…"
              aria-invalid={!!errors.body}
              {...register('body')}
            />
            {errors.body && <p className="text-xs text-danger">{errors.body.message}</p>}
            <p className="text-xs text-text-muted">
              Placeholders: <code>{'{{customer_name}}'}</code> <code>{'{{plan}}'}</code> <code>{'{{expiry_date}}'}</code>{' '}
              <code>{'{{amount_due}}'}</code> <code>{'{{voucher_code}}'}</code>
            </p>
          </div>

          {body && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-text-muted">Preview (sample customer)</Label>
              <div className="rounded-lg border border-border bg-surface-2 p-3 text-sm whitespace-pre-wrap text-text">
                {renderTemplate(body, SAMPLE_TEMPLATE_VALUES)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
