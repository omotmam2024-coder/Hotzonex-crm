import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type EquipmentType = Database['public']['Enums']['equipment_type']
export type EquipmentStatus = Database['public']['Enums']['equipment_status']
type BusinessUnit = Database['public']['Enums']['business_unit']

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  router: 'Router',
  switch: 'Switch',
  access_point: 'Access point',
  ont: 'ONT',
  antenna: 'Antenna',
  modem: 'Modem',
  cable: 'Cable',
  other: 'Other',
}

export const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatus, string> = {
  in_stock: 'In stock',
  deployed: 'Deployed',
  faulty: 'Faulty',
  retired: 'Retired',
}

export interface EquipmentFilters {
  search: string
  status: EquipmentStatus | 'all'
  equipmentType: EquipmentType | 'all'
  businessUnit: BusinessUnit | 'all'
}

export interface EquipmentRow {
  id: string
  equipment_code: string | null
  label: string
  equipment_type: EquipmentType
  business_unit: BusinessUnit
  status: EquipmentStatus
  brand: string | null
  model: string | null
  serial_number: string | null
  ip_address: string | null
  created_at: string
  customers: { display_name: string | null } | null
  locations: { name: string } | null
}

const LIST_COLUMNS =
  'id, equipment_code, label, equipment_type, business_unit, status, brand, model, serial_number, ip_address, created_at, customers(display_name), locations(name)'

export function useEquipmentList(filters: EquipmentFilters) {
  return useQuery({
    queryKey: ['equipment', 'list', filters],
    queryFn: async () => {
      let query = supabase.from('equipment').select(LIST_COLUMNS).order('created_at', { ascending: false })

      if (filters.search.trim()) {
        const term = filters.search.trim()
        query = query.or(
          `label.ilike.%${term}%,equipment_code.ilike.%${term}%,serial_number.ilike.%${term}%,mac_address.ilike.%${term}%,ip_address.ilike.%${term}%`,
        )
      }
      if (filters.status !== 'all') query = query.eq('status', filters.status)
      if (filters.equipmentType !== 'all') query = query.eq('equipment_type', filters.equipmentType)
      if (filters.businessUnit !== 'all') query = query.eq('business_unit', filters.businessUnit)

      const { data, error } = await query
      if (error) throw error
      return data as unknown as EquipmentRow[]
    },
    staleTime: 15_000,
  })
}

export function useEquipmentDetail(id: string | null) {
  return useQuery({
    queryKey: ['equipment', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*, customers(id, display_name, phone_primary, customer_code), locations(name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}
