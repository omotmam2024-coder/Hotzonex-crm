import { useQueryClient } from '@tanstack/react-query'
import { MessageSquareIcon, PencilIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { useAuth } from '@/hooks/useAuth'
import { can } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { MessageTemplateFormDialog } from './MessageTemplateFormDialog'
import { useMessageTemplates } from './useMessageTemplates'

export function MessageTemplatesPage() {
  const { profile } = useAuth()
  const { data: templates, isLoading, isError, refetch } = useMessageTemplates()
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)
  const canManage = can(profile, 'manage_settings')

  async function toggleActive(id: string, isActive: boolean) {
    const { error } = await supabase.from('message_templates').update({ is_active: !isActive }).eq('id', id)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['message_templates'] })
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Message templates</h2>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setEditId(undefined)
              setFormOpen(true)
            }}
          >
            <PlusIcon /> New template
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !templates || templates.length === 0 ? (
        <EmptyState icon={MessageSquareIcon} title="No templates yet" description="Add WhatsApp/SMS templates to use in campaigns and receipts." />
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded-card border border-border bg-surface p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-text">{t.name}</p>
                  <Badge variant="muted">{t.channel}</Badge>
                  {!t.is_active && <Badge variant="danger">Inactive</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-text-muted">{t.body}</p>
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-2">
                  <Switch checked={t.is_active} onCheckedChange={() => void toggleActive(t.id, t.is_active)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit template"
                    onClick={() => {
                      setEditId(t.id)
                      setFormOpen(true)
                    }}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <MessageTemplateFormDialog open={formOpen} onOpenChange={setFormOpen} templateId={editId} />
    </div>
  )
}
