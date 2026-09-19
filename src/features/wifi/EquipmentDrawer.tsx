import { useQueryClient } from '@tanstack/react-query'
import { FileIcon, PencilIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useUnitLabels } from '@/hooks/useUnitLabels'
import { formatDate, formatMoney } from '@/lib/format'
import { can } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { EquipmentFormDialog } from './EquipmentFormDialog'
import { EQUIPMENT_STATUS_LABEL, EQUIPMENT_TYPE_LABEL, useEquipmentDetail } from './useEquipment'

interface EquipmentDrawerProps {
  equipmentId: string | null
  onClose: () => void
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-text-muted">{label}</p>
      <p className="text-text">{value}</p>
    </div>
  )
}

export function EquipmentDrawer({ equipmentId, onClose }: EquipmentDrawerProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const UNIT_LABEL = useUnitLabels()
  const { data: equipment, refetch } = useEquipmentDetail(equipmentId)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const canWrite = can(profile, 'create')
  const canDelete = can(profile, 'delete')

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0 || !equipmentId) return
    setUploading(true)
    const newPaths: string[] = []
    for (const file of Array.from(files)) {
      const path = `${equipmentId}/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('equipment-files').upload(path, file)
      if (error) {
        toast.error(error.message)
        continue
      }
      newPaths.push(path)
    }
    if (newPaths.length > 0 && equipment) {
      const { error } = await supabase
        .from('equipment')
        .update({ photo_paths: [...equipment.photo_paths, ...newPaths] })
        .eq('id', equipmentId)
      if (error) toast.error(error.message)
    }
    setUploading(false)
    await refetch()
  }

  async function openPhoto(path: string) {
    const { data, error } = await supabase.storage.from('equipment-files').createSignedUrl(path, 60)
    if (error) {
      toast.error(error.message)
      return
    }
    window.open(data.signedUrl, '_blank', 'noreferrer')
  }

  async function removePhoto(path: string) {
    if (!equipment || !equipmentId) return
    // Update the row first: if this fails, the photo stays listed and
    // nothing is lost. Deleting storage first risks the opposite — a
    // dangling reference to a file that no longer exists if the row
    // update then fails.
    const { error } = await supabase
      .from('equipment')
      .update({ photo_paths: equipment.photo_paths.filter((p) => p !== path) })
      .eq('id', equipmentId)
    if (error) {
      toast.error(error.message)
      return
    }
    await refetch()
    const { error: storageError } = await supabase.storage.from('equipment-files').remove([path])
    if (storageError) toast.error(storageError.message)
  }

  async function deleteEquipment() {
    if (!equipmentId) return
    setDeleting(true)
    const { error } = await supabase.from('equipment').update({ deleted_at: new Date().toISOString() }).eq('id', equipmentId)
    setDeleting(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Equipment deleted')
    setDeleteOpen(false)
    await queryClient.invalidateQueries({ queryKey: ['equipment'] })
    onClose()
  }

  return (
    <Sheet open={!!equipmentId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-lg">
        {equipment && (
          <>
            <SheetHeader>
              <SheetTitle>{equipment.label}</SheetTitle>
              <p className="text-xs text-text-muted">
                {equipment.equipment_code} · {EQUIPMENT_TYPE_LABEL[equipment.equipment_type]} · {EQUIPMENT_STATUS_LABEL[equipment.status]} ·{' '}
                {UNIT_LABEL[equipment.business_unit]}
              </p>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-surface-2 p-3 text-sm">
              <Field label="Brand" value={equipment.brand} />
              <Field label="Model" value={equipment.model} />
              <Field label="Serial number" value={equipment.serial_number} />
              <Field label="MAC address" value={equipment.mac_address} />
              <Field label="IP address" value={equipment.ip_address} />
              <Field label="Customer" value={equipment.customers?.display_name} />
              <Field label="Location" value={equipment.locations?.name} />
              <Field label="Added" value={formatDate(equipment.created_at)} />
            </div>

            {(equipment.purchase_date || equipment.purchase_price || equipment.vendor || equipment.warranty_expiry) && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <Label>Purchase & warranty</Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Purchase date" value={formatDate(equipment.purchase_date)} />
                  <Field
                    label="Price"
                    value={equipment.purchase_price ? formatMoney(equipment.purchase_price, equipment.currency ?? 'SSP') : null}
                  />
                  <Field label="Vendor" value={equipment.vendor} />
                  <Field label="Warranty expiry" value={formatDate(equipment.warranty_expiry)} />
                </div>
              </div>
            )}

            {equipment.notes && (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <Label>Configuration notes</Label>
                <p className="text-sm whitespace-pre-wrap text-text">{equipment.notes}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <Label>Photos</Label>
              {equipment.photo_paths.length === 0 ? (
                <EmptyState icon={FileIcon} title="No photos yet" />
              ) : (
                <div className="flex flex-col gap-1.5">
                  {equipment.photo_paths.map((path) => (
                    <div key={path} className="flex items-center justify-between gap-2 rounded-card border border-border bg-surface p-2.5">
                      <button onClick={() => void openPhoto(path)} className="min-w-0 flex-1 truncate text-left text-sm text-text">
                        {path.split('/').slice(1).join('/')}
                      </button>
                      {canWrite && (
                        <button onClick={() => void removePhoto(path)} aria-label="Delete photo">
                          <Trash2Icon className="size-4 text-text-muted hover:text-danger" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canWrite && (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface p-3 text-sm text-text-muted hover:border-accent hover:text-accent">
                  <UploadIcon className="size-4" />
                  {uploading ? 'Uploading…' : 'Add photos'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => void uploadPhotos(e.target.files)}
                  />
                </label>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              {canWrite && (
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <PencilIcon className="size-4" /> Edit
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2Icon className="size-4" /> Delete
                </Button>
              )}
            </div>

            <ConfirmDialog
              open={deleteOpen}
              onOpenChange={setDeleteOpen}
              title="Delete this equipment record?"
              description={`${equipment.label} will be removed from the inventory list.`}
              requireTypedConfirmation={equipment.equipment_code ?? equipment.label}
              confirmLabel="Delete equipment"
              variant="destructive"
              loading={deleting}
              onConfirm={deleteEquipment}
            />

            <EquipmentFormDialog open={editOpen} onOpenChange={setEditOpen} equipmentId={equipmentId ?? undefined} />
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
