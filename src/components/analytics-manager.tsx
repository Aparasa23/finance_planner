'use client'

import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts'
import { Wallet, TrendingUp, TrendingDown, Percent } from 'lucide-react'

interface CategoryItem {
  name: string
  value: number
}

interface AnalyticsManagerProps {
  income: number
  expenses: number
  categories: CategoryItem[]
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#374151']

export function AnalyticsManager({ income, expenses, categories }: AnalyticsManagerProps) {
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch on server render
  useEffect(() => {
    setMounted(true)
  }, [])

  const netCashFlow = income - expenses
  const savingsRate = income > 0 ? Math.max(0, Math.round((netCashFlow / income) * 100)) : 0

  return (
    <div className="space-y-6">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Income card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Monthly Inflow</p>
            <p className="text-lg font-bold text-gray-100 mt-0.5">${income.toLocaleString()}</p>
          </div>
        </div>

        {/* Expenses card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Monthly Outflow</p>
            <p className="text-lg font-bold text-gray-100 mt-0.5">${expenses.toLocaleString()}</p>
          </div>
        </div>

        {/* Savings Rate card */}
        <div className="glass-panel p-5 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Savings Rate</p>
            <p className="text-lg font-bold text-gray-100 mt-0.5">{savingsRate}%</p>
          </div>
        </div>

      </div>

      {/* Main breakdown section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Category Lists */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-gray-100">Category Breakdown</h2>

          {categories.length === 0 ? (
            <p className="text-xs text-gray-500 py-6 text-center">No categorized expenses recorded this month.</p>
          ) : (
            <div className="space-y-4">
              {categories.map((cat, index) => {
                const percentage = expenses > 0 ? Math.round((cat.value / expenses) * 100) : 0
                const colorIndex = index % COLORS.length

                return (
                  <div key={cat.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-300 flex items-center">
                        <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: COLORS[colorIndex] }} />
                        {cat.name}
                      </span>
                      <span className="font-bold text-gray-200">
                        ${cat.value.toFixed(2)}{' '}
                        <span className="text-[10px] text-gray-500 font-normal">({percentage}%)</span>
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-900 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS[colorIndex],
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right: Pie Chart */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between items-stretch">
          <h2 className="text-sm font-bold text-gray-100 mb-4">Outlay Distribution</h2>

          {mounted && categories.length > 0 ? (
            <div className="h-60 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Spend']}
                    contentStyle={{
                      backgroundColor: 'rgba(3, 7, 18, 0.9)',
                      borderColor: 'rgba(31, 41, 55, 0.8)',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Inner overlay balance */}
              <div className="absolute text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Spent</p>
                <p className="text-base font-bold text-gray-100 mt-0.5">${expenses.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="h-60 w-full flex items-center justify-center text-xs text-gray-500">
              No chart data available.
            </div>
          )}

          <div className="text-[10px] text-gray-500 flex items-center space-x-1 mt-4">
            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Updates dynamically when transactions sync.</span>
          </div>
        </div>

      </div>

    </div>
  )
}
