import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { generateCashFlowForecast } from '@/lib/forecast/engine'
import { AlertTriangle, TrendingUp, Info } from 'lucide-react'
import { ForecastChart } from '@/components/forecast-chart'

export default async function ForecastPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile for household context
  const { data: profile } = await supabase
    .from('profiles')
    .select('household_id')
    .eq('id', user.id)
    .single()

  if (!profile?.household_id) {
    redirect('/register')
  }

  const { forecast, hasOverdraftRisk, firstOverdraftDate } = await generateCashFlowForecast(profile.household_id)

  const startingBalance = forecast[0]?.balance || 0
  const endingBalance = forecast[forecast.length - 1]?.balance || 0
  const netChange = endingBalance - startingBalance

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-100">Cash Flow Projection</h1>
        <p className="text-xs text-gray-400">Intelligent 30-day forecast based on scheduled bills and income paydays.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Starting Liquid Cash</p>
          <p className="text-xl font-bold text-gray-100 mt-1">${startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] text-gray-500">Checking + Savings balances</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Projected Cash (30 days)</p>
          <p className="text-xl font-bold text-gray-100 mt-1">${endingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          <span className={`text-[10px] flex items-center mt-1 font-semibold ${netChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <TrendingUp className={`h-3 w-3 mr-0.5 ${netChange < 0 ? 'rotate-180' : ''}`} />
            ${Math.abs(netChange).toFixed(2)} ({netChange >= 0 ? '+' : '-'} {((netChange / (startingBalance || 1)) * 100).toFixed(1)}%)
          </span>
        </div>

        <div className={`glass-panel p-5 rounded-2xl border ${hasOverdraftRisk ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Overdraft Risk Assessment</p>
            {hasOverdraftRisk ? <AlertTriangle className="h-4 w-4 text-rose-400" /> : <TrendingUp className="h-4 w-4 text-emerald-400" />}
          </div>
          {hasOverdraftRisk ? (
            <div className="mt-1">
              <p className="text-sm font-bold text-rose-400">Overdraft Risk Detected</p>
              <p className="text-[10px] text-rose-500/80 mt-0.5">
                Balance projects below $100 starting {new Date(firstOverdraftDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.
              </p>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-sm font-bold text-emerald-400">Safe Cash Trajectory</p>
              <p className="text-[10px] text-emerald-500/80 mt-0.5">Liquidity projects above safety buffers all month.</p>
            </div>
          )}
        </div>
      </div>

      {/* Forecast Line Chart Card */}
      <div className="glass-panel p-5 rounded-2xl">
        <h2 className="text-sm font-bold text-gray-100 mb-4">Cash Trajectory Ledger</h2>
        <div className="h-72 w-full">
          <ForecastChart data={forecast} />
        </div>
      </div>

      {/* Inflow/Outflow Day-by-Day Event Ledger */}
      <div className="glass-panel p-5 rounded-2xl space-y-4">
        <h2 className="text-sm font-bold text-gray-100">Calendar Agenda (Forecast Period)</h2>
        <div className="divide-y divide-gray-800/50 max-h-96 overflow-y-auto pr-1">
          {forecast
            .filter((day) => day.events.length > 0)
            .map((day) => (
              <div key={day.date} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-300">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {day.events.map((ev, index) => (
                      <span
                        key={index}
                        className={`text-[9px] px-2 py-0.5 rounded-full border ${
                          ev.type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {ev.name} (${Math.abs(ev.amount).toFixed(2)})
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-200">${day.balance.toFixed(2)}</p>
                  <p className="text-[9px] text-gray-500">Day Ending Balance</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
