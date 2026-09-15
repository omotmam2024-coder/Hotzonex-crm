import { useQuery } from '@tanstack/react-query'
import { DownloadIcon, LayersIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonRows } from '@/components/shared/SkeletonRows'
import { formatDate } from '@/lib/format'
import { exportToCsv, exportToPdf } from '@/lib/export'
import { supabase } from '@/lib/supabase'
import { GenerateBatchDialog } from './GenerateBatchDialog'

interface BatchRow {
  id: string
  batch_code: string | null
  quantity: number
  created_at: string
  service_plans: { name: string; code: string } | null
  locations: { name: string } | null
  resellers: { name: string } | null
}

function useVoucherBatches() {
  return useQuery({
    queryKey: ['voucher_batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('voucher_batches')
        .select('id, batch_code, quantity, created_at, service_plans(name, code), locations(name), resellers(name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as unknown as BatchRow[]
    },
  })
}

async function fetchBatchVouchers(batchId: string) {
  const { data, error } = await supabase
    .from('vouchers')
    .select('code, status, price_sold, currency, created_at')
    .eq('batch_id', batchId)
    .order('code')
  if (error) throw error
  return data
}

export function VoucherBatchesPage() {
  const { data: batches, isLoading, isError, refetch } = useVoucherBatches()
  const [generateOpen, setGenerateOpen] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)

  async function handleExport(batch: BatchRow, format: 'csv' | 'pdf') {
    setExportingId(batch.id)
    try {
      const vouchers = await fetchBatchVouchers(batch.id)
      if (format === 'csv') {
        exportToCsv(
          vouchers.map((v) => ({ code: v.code, status: v.status })),
          `${batch.batch_code ?? 'voucher-batch'}.csv`,
        )
      } else {
        exportToPdf(
          `${batch.service_plans?.name ?? 'Vouchers'} — ${batch.batch_code}`,
          ['Code', 'Status'],
          vouchers.map((v) => [v.code, v.status]),
          `${batch.batch_code ?? 'voucher-batch'}.pdf`,
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExportingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Voucher batches</h2>
        <Button size="sm" onClick={() => setGenerateOpen(true)}>
          <PlusIcon /> Generate batch
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !batches || batches.length === 0 ? (
        <EmptyState
          icon={LayersIcon}
          title="No voucher batches yet"
          description="Generate a batch to start selling hotspot vouchers."
          action={
            <Button onClick={() => setGenerateOpen(true)}>
              <PlusIcon /> Generate batch
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {batches.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-text">
                  {b.batch_code} — {b.service_plans?.name}
                </p>
                <p className="text-xs text-text-muted">
                  {b.quantity} codes · {b.locations?.name ?? 'No location'}
                  {b.resellers?.name ? ` · ${b.resellers.name}` : ''} · {formatDate(b.created_at)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={exportingId === b.id}>
                    <DownloadIcon className="size-4" /> Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => void handleExport(b, 'csv')}>Export CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void handleExport(b, 'pdf')}>Export PDF (print)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <GenerateBatchDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  )
}
