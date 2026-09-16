import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const RESOLUTION_CATEGORIES = [
  'Fixed remotely',
  'Fixed on-site',
  'Customer error',
  'Equipment replaced',
  'Duplicate ticket',
  'Not a fault',
  'Other',
]

interface ResolveTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  loading?: boolean
  onConfirm: (category: string, note: string) => void | Promise<void>
}

/** Resolution requires a category and a free-text note, per the support-desk spec. */
export function ResolveTicketDialog({ open, onOpenChange, loading, onConfirm }: ResolveTicketDialogProps) {
  const [category, setCategory] = useState(RESOLUTION_CATEGORIES[0]!)
  const [note, setNote] = useState('')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote('')
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve ticket</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label>Resolution category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="resolution-note">Resolution note</Label>
          <Textarea
            id="resolution-note"
            rows={3}
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What fixed it?"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            disabled={!note.trim() || loading}
            onClick={async () => {
              await onConfirm(category, note.trim())
              setNote('')
            }}
          >
            {loading ? 'Resolving…' : 'Resolve ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
