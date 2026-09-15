import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { supabase } from '@/lib/supabase'

interface TagPickerProps {
  value: string[]
  onChange: (tags: string[]) => void
  disabled?: boolean
}

export function TagPicker({ value, onChange, disabled }: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [newTag, setNewTag] = useState('')
  const queryClient = useQueryClient()

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tags').select('id, name, color').order('name')
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })

  function toggle(name: string) {
    onChange(value.includes(name) ? value.filter((t) => t !== name) : [...value, name])
  }

  async function createAndAdd() {
    const name = newTag.trim()
    if (!name) return
    const { error } = await supabase.from('tags').insert({ name }).select().single()
    if (!error) {
      await queryClient.invalidateQueries({ queryKey: ['tags'] })
      onChange([...value, name])
    }
    setNewTag('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((tag) => (
        <Badge key={tag} variant="default" className="gap-1">
          {tag}
          {!disabled && (
            <button type="button" onClick={() => toggle(tag)} aria-label={`Remove tag ${tag}`}>
              <XIcon className="size-3" />
            </button>
          )}
        </Badge>
      ))}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
              <PlusIcon className="size-3" /> Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
              {allTags?.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.name)}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                >
                  {t.name}
                  {value.includes(t.name) && <span className="text-accent">✓</span>}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1 border-t border-border pt-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void createAndAdd()
                  }
                }}
              />
              <Button type="button" size="sm" className="h-8" onClick={() => void createAndAdd()}>
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
