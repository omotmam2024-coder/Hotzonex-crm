import { Skeleton } from '@/components/ui/skeleton'

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-card" />
      ))}
    </div>
  )
}
