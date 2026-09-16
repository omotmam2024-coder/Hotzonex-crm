import { useMemo } from 'react'
import { useSettingValue } from './useSettingValue'

export type BusinessUnit = 'wifi' | 'services' | 'refreshment'

export const DEFAULT_UNIT_LABELS: Record<BusinessUnit, string> = {
  wifi: 'WiFi',
  services: 'Services',
  refreshment: 'Refreshment',
}

/**
 * The three business units are a fixed set (each backs its own feature
 * module — vouchers/subscriptions, projects/contracts, suppliers/bookings —
 * and a fixed database enum), but a deployment can rename them to fit its
 * own business via Admin > Settings, e.g. "WiFi" -> "Internet".
 *
 * Memoized so callers that put this in a dependency array (e.g. a
 * useMemo'd table column list) don't get a new object identity — and so a
 * new memo — on every render.
 */
export function useUnitLabels(): Record<BusinessUnit, string> {
  const { data } = useSettingValue<Partial<Record<BusinessUnit, string>>>('business_unit_labels', {})
  const wifi = data?.wifi?.trim() || DEFAULT_UNIT_LABELS.wifi
  const services = data?.services?.trim() || DEFAULT_UNIT_LABELS.services
  const refreshment = data?.refreshment?.trim() || DEFAULT_UNIT_LABELS.refreshment
  return useMemo(() => ({ wifi, services, refreshment }), [wifi, services, refreshment])
}
