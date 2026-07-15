'use client'

import React from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts'

interface ChartDataPoint {
  date: string
  balance: number
  inflow: number
  outflow: number
  overdraftAlert: boolean
}

interface ForecastChartProps {
  data: ChartDataPoint[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ChartDataPoint
    const dateFormatted = new Date(data.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })

    return (
      <div className="glass-panel p-3 rounded-xl border border-gray-800/80 shadow-2xl text-xs space-y-1">
        <p className="font-bold text-gray-400">{dateFormatted}</p>
        <p className="text-gray-100 font-semibold">
          Projected Balance:{' '}
          <span className={data.balance < 100 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
            ${data.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </p>
        {data.inflow > 0 && <p className="text-emerald-400">Inflow: +${data.inflow.toFixed(2)}</p>}
        {data.outflow > 0 && <p className="text-rose-400">Outflow: -${data.outflow.toFixed(2)}</p>}
      </div>
    )
  }

  return null
}

export function ForecastChart({ data }: ForecastChartProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Format dates for X-Axis tick display (e.g., Jul 15)
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return tickItem
    }
  }

  if (!mounted) {
    return (
      <div className="h-72 w-full bg-gray-900/20 rounded-2xl animate-pulse flex items-center justify-center text-xs text-gray-500">
        Loading forecast chart...
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />

        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          stroke="#4b5563"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          dy={10}
        />

        <YAxis
          stroke="#4b5563"
          fontSize={10}
          tickLine={false}
          axisLine={false}
          tickFormatter={(val) => `$${val}`}
        />

        <Tooltip content={<CustomTooltip />} />

        {/* Highlight safety threshold line ($100 buffer) */}
        <ReferenceLine
          y={100}
          stroke="#ef4444"
          strokeDasharray="4 4"
          label={{
            value: 'Safety Buffer ($100)',
            fill: '#ef4444',
            fontSize: 9,
            position: 'top',
          }}
        />

        <Area
          type="monotone"
          dataKey="balance"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#balanceGlow)"
          dot={(props: any) => {
            // Draw a red dot on overdraft risk dates!
            const { cx, cy, payload } = props
            if (payload.overdraftAlert) {
              return (
                <circle cx={cx} cy={cy} r={3.5} fill="#ef4444" stroke="#ffffff" strokeWidth={1} key={props.key} />
              )
            }
            return <React.Fragment key={props.key} />
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
