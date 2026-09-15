import { useQueryClient } from '@tanstack/react-query'
import { CameraIcon, MapPinIcon, PenLineIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SignaturePad } from '@/components/shared/SignaturePad'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDateTime } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type InstallStatus = Database['public']['Enums']['installation_status']

const NEXT_STATUS: Partial<Record<InstallStatus, InstallStatus>> = {
  scheduled: 'en_route',
  en_route: 'in_progress',
  in_progress: 'completed',
}

interface JobRow {
  id: string
  job_code: string | null
  job_type: string
  status: InstallStatus
  scheduled_at: string | null
  install_fee: number
  customers: { display_name: string | null; phone_primary: string; address_text: string | null } | null
}

export function TechnicianJobCard({ job }: { job: JobRow }) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [showSignature, setShowSignature] = useState(false)

  async function advance() {
    const next = NEXT_STATUS[job.status]
    if (!next) return
    setBusy(true)

    let gpsLat: number | undefined
    let gpsLng: number | undefined
    if (next === 'in_progress' && navigator.geolocation) {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            gpsLat = pos.coords.latitude
            gpsLng = pos.coords.longitude
            resolve()
          },
          () => resolve(),
          { timeout: 5000 },
        )
      })
    }

    const { error } = await supabase.rpc('fn_update_installation_status', {
      p_installation_id: job.id,
      p_status: next,
      p_gps_lat: gpsLat,
      p_gps_lng: gpsLng,
      // Collects the quoted install fee the moment a job is marked done —
      // matches how a voucher sale or subscription renewal takes payment.
      p_record_payment: next === 'completed' && job.install_fee > 0,
    })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Marked ${next.replace('_', ' ')}`)
    await queryClient.invalidateQueries({ queryKey: ['installations'] })
    if (next === 'completed') setShowSignature(true)
  }

  async function markFailed() {
    setBusy(true)
    const { error } = await supabase.rpc('fn_update_installation_status', {
      p_installation_id: job.id,
      p_status: 'failed',
    })
    setBusy(false)
    if (error) toast.error(error.message)
    else await queryClient.invalidateQueries({ queryKey: ['installations'] })
  }

  async function uploadPhoto(file: File) {
    setBusy(true)
    const path = `${job.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('installation-files').upload(path, file)
    if (uploadError) {
      toast.error(uploadError.message)
      setBusy(false)
      return
    }
    const { error } = await supabase.rpc('fn_update_installation_status', {
      p_installation_id: job.id,
      p_status: job.status,
      p_photo_paths: [path],
    })
    setBusy(false)
    if (error) toast.error(error.message)
    else {
      toast.success('Photo uploaded')
      await queryClient.invalidateQueries({ queryKey: ['installations'] })
    }
  }

  async function saveSignature(blob: Blob) {
    setBusy(true)
    const path = `${job.id}/signature-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage.from('installation-files').upload(path, blob)
    if (uploadError) {
      toast.error(uploadError.message)
      setBusy(false)
      return
    }
    const { error } = await supabase.rpc('fn_update_installation_status', {
      p_installation_id: job.id,
      p_status: 'completed',
      p_signature_path: path,
    })
    setBusy(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Signature saved')
    setShowSignature(false)
    await queryClient.invalidateQueries({ queryKey: ['installations'] })
  }

  const nextLabel = NEXT_STATUS[job.status]

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-text">{job.customers?.display_name}</p>
          <p className="text-xs text-text-muted">
            {job.job_type} · {job.scheduled_at ? formatDateTime(job.scheduled_at) : 'Unscheduled'}
          </p>
          {job.customers?.address_text && <p className="text-xs text-text-muted">{job.customers.address_text}</p>}
        </div>
        <StatusBadge status={job.status} />
      </div>

      {showSignature ? (
        <SignaturePad onSave={saveSignature} saving={busy} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {nextLabel && (
            <Button size="sm" disabled={busy} onClick={() => void advance()}>
              <MapPinIcon className="size-4" /> Mark {nextLabel.replace('_', ' ')}
            </Button>
          )}
          {job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled' && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void markFailed()}>
              Mark failed
            </Button>
          )}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-text hover:bg-surface-2">
            <CameraIcon className="size-4" /> Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadPhoto(file)
              }}
            />
          </label>
          {job.status === 'completed' && (
            <Button size="sm" variant="outline" onClick={() => setShowSignature(true)}>
              <PenLineIcon className="size-4" /> Signature
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
