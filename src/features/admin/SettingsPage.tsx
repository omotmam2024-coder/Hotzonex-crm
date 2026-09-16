import { useQueryClient } from '@tanstack/react-query'
import { SettingsIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/shared/EmptyState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { useAuth } from '@/hooks/useAuth'
import { useSettingValue } from '@/hooks/useSettingValue'
import { DEFAULT_UNIT_LABELS, type BusinessUnit } from '@/hooks/useUnitLabels'
import { APP_NAME } from '@/lib/appName'
import { can } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'

interface CompanySettings {
  name: string
  city: string
  country: string
  email: string
  phone: string
}

const EMPTY: CompanySettings = { name: '', city: '', country: '', email: '', phone: '' }

type UnitLabels = Record<BusinessUnit, string>

export function SettingsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: company, isLoading } = useSettingValue<CompanySettings>('company', { ...EMPTY, name: APP_NAME })
  const [form, setForm] = useState<CompanySettings>(EMPTY)
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: unitLabels, isLoading: unitLabelsLoading } = useSettingValue<Partial<UnitLabels>>('business_unit_labels', {})
  const [unitForm, setUnitForm] = useState<UnitLabels>(DEFAULT_UNIT_LABELS)
  const [unitInitialized, setUnitInitialized] = useState(false)
  const [savingUnits, setSavingUnits] = useState(false)

  // Only sync from the fetched value once. Syncing on every change would
  // also fire after this page's own save (which invalidates the query),
  // overwriting any edit the admin made in the moment between clicking
  // Save and that refetch resolving.
  useEffect(() => {
    if (company && !initialized) {
      setForm({ ...EMPTY, ...company })
      setInitialized(true)
    }
  }, [company, initialized])

  useEffect(() => {
    if (unitLabels && !unitInitialized) {
      setUnitForm({ ...DEFAULT_UNIT_LABELS, ...unitLabels })
      setUnitInitialized(true)
    }
  }, [unitLabels, unitInitialized])

  if (!can(profile, 'manage_settings')) {
    return (
      <EmptyState
        icon={SettingsIcon}
        title="Admins only"
        description="Ask an owner or admin if you need to change company settings."
      />
    )
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error('Company name is required')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('settings').upsert(
      {
        key: 'company',
        value: { ...form, name: form.name.trim() },
        updated_at: new Date().toISOString(),
        updated_by: profile?.id,
      },
      { onConflict: 'key' },
    )
    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Settings saved')
    await queryClient.invalidateQueries({ queryKey: ['settings', 'company'] })
  }

  async function saveUnitLabels() {
    for (const unit of Object.keys(unitForm) as BusinessUnit[]) {
      if (!unitForm[unit].trim()) {
        toast.error('Every business unit needs a name')
        return
      }
    }
    setSavingUnits(true)
    const value: UnitLabels = {
      wifi: unitForm.wifi.trim(),
      services: unitForm.services.trim(),
      refreshment: unitForm.refreshment.trim(),
    }
    const { error } = await supabase.from('settings').upsert(
      { key: 'business_unit_labels', value, updated_at: new Date().toISOString(), updated_by: profile?.id },
      { onConflict: 'key' },
    )
    setSavingUnits(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Settings saved')
    await queryClient.invalidateQueries({ queryKey: ['settings', 'business_unit_labels'] })
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Company</h1>
        <p className="text-sm text-text-muted">
          This name and contact info appear across the app — on receipts, invoices, and the sidebar.
        </p>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : (
        <Card className="max-w-lg">
          <CardContent className="flex flex-col gap-3 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-name">Company name</Label>
              <Input id="company-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company-city">City</Label>
                <Input id="company-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company-country">Country</Label>
                <Input id="company-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-email">Email</Label>
              <Input id="company-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-phone">Phone</Label>
              <Input id="company-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <Button onClick={() => void save()} disabled={saving} className="self-start">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-3">
        <h2 className="text-lg font-semibold text-text">Business units</h2>
        <p className="text-sm text-text-muted">
          Rename the three business units to match how your company describes them — the underlying features
          (vouchers/subscriptions, projects/contracts, suppliers/bookings) stay the same, only the names change.
        </p>
      </div>

      {unitLabelsLoading ? (
        <SkeletonRows />
      ) : (
        <Card className="max-w-lg">
          <CardContent className="flex flex-col gap-3 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit-wifi">WiFi unit</Label>
              <Input id="unit-wifi" value={unitForm.wifi} onChange={(e) => setUnitForm((f) => ({ ...f, wifi: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit-services">Services unit</Label>
              <Input
                id="unit-services"
                value={unitForm.services}
                onChange={(e) => setUnitForm((f) => ({ ...f, services: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unit-refreshment">Refreshment unit</Label>
              <Input
                id="unit-refreshment"
                value={unitForm.refreshment}
                onChange={(e) => setUnitForm((f) => ({ ...f, refreshment: e.target.value }))}
              />
            </div>
            <Button onClick={() => void saveUnitLabels()} disabled={savingUnits} className="self-start">
              {savingUnits ? 'Saving…' : 'Save'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
