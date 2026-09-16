import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ReportBarChartProps {
  data: { label: string; value: number }[]
  valueFormatter?: (value: number) => string
  color?: string
}

/** One shared bar chart look for every report — the app's own teal accent, dark grid, no legend clutter. */
export function ReportBarChart({ data, valueFormatter, color = '#14B8A6' }: ReportBarChartProps) {
  if (data.length === 0) {
    return <div className="flex h-48 items-center justify-center text-sm text-text-muted">No data for this range.</div>
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#22334F" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#94A6C0', fontSize: 11 }} axisLine={{ stroke: '#22334F' }} tickLine={false} />
          <YAxis tick={{ fill: '#94A6C0', fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            contentStyle={{ background: '#111C30', border: '1px solid #22334F', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#E8EEF7' }}
            itemStyle={{ color: '#E8EEF7' }}
            formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : String(value))}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
