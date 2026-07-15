'use client'

import React, { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Clock, Calendar } from 'lucide-react'

interface CalendarGridProps {
  year: number
  month: number // 0-indexed
  occurrences: any[]
  incomeStreams: any[]
}

export function CalendarGrid({ year, month, occurrences, incomeStreams }: CalendarGridProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Selected date defaults to first day of selected month
  const [selectedDay, setSelectedDay] = useState<number | null>(1)

  // Calculations for dates grid
  const totalDays = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = new Date(year, month, 1).getDay() // Day of week for 1st day (0 = Sun, 6 = Sat)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const handlePrevMonth = () => {
    const prevDate = new Date(year, month - 1, 1)
    const mStr = String(prevDate.getMonth() + 1).padStart(2, '0')
    router.push(`${pathname}?month=${prevDate.getFullYear()}-${mStr}`)
  }

  const handleNextMonth = () => {
    const nextDate = new Date(year, month + 1, 1)
    const mStr = String(nextDate.getMonth() + 1).padStart(2, '0')
    router.push(`${pathname}?month=${nextDate.getFullYear()}-${mStr}`)
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // 1. Get bills due on this date
    const bills = occurrences.filter((occ) => occ.due_date === dateStr)

    // 2. Check if this date has any projected income payday
    const paydays: any[] = []
    const targetDate = new Date(year, month, day)

    for (const stream of incomeStreams) {
      const lastPaydate = new Date(stream.last_date)
      const frequency = stream.frequency
      let checkDate = new Date(lastPaydate.getTime())

      // Simple payday projection check
      let matches = false
      let iterations = 0 // prevent infinite loops
      
      while (checkDate.getTime() <= targetDate.getTime() && iterations < 30) {
        if (checkDate.toDateString() === targetDate.toDateString()) {
          matches = true
          break
        }

        if (frequency === 'weekly') {
          checkDate = new Date(checkDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        } else if (frequency === 'biweekly') {
          checkDate = new Date(checkDate.getTime() + 14 * 24 * 60 * 60 * 1000)
        } else if (frequency === 'monthly') {
          checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, checkDate.getDate())
        } else if (frequency === 'semimonthly') {
          checkDate = new Date(checkDate.getTime() + 15 * 24 * 60 * 60 * 1000)
        } else {
          break
        }
        iterations++
      }

      if (matches) {
        paydays.push({
          name: stream.name,
          amount: Number(stream.typical_amount),
        })
      }
    }

    return { bills, paydays }
  }

  // Generate date grid cells
  const gridCells: React.ReactNode[] = []

  // Add blank padding cells for first week alignment
  for (let i = 0; i < firstDayIndex; i++) {
    gridCells.push(
      <div key={`empty-${i}`} className="min-h-[70px] bg-gray-900/5 border border-gray-900/10 opacity-30" />
    )
  }

  // Add active day cells
  for (let d = 1; d <= totalDays; d++) {
    const isSelected = selectedDay === d
    const { bills, paydays } = getEventsForDay(d)
    const hasUnpaid = bills.some((b) => b.status === 'upcoming' || b.status === 'due_soon' || b.status === 'overdue')
    const hasPaid = bills.some((b) => b.status === 'paid')
    const hasIncome = paydays.length > 0

    gridCells.push(
      <button
        key={`day-${d}`}
        onClick={() => setSelectedDay(d)}
        className={`min-h-[70px] p-2 flex flex-col justify-between items-start border border-gray-800/40 relative transition-all text-left ${
          isSelected
            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[inset_0_0_8px_rgba(16,185,129,0.15)] z-10'
            : 'bg-gray-950/20 hover:bg-gray-900/30'
        }`}
      >
        <span className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-gray-400'}`}>
          {d}
        </span>

        {/* Small Event dots container */}
        <div className="flex flex-wrap gap-1 mt-1">
          {hasUnpaid && (
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
          )}
          {hasPaid && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
          )}
          {hasIncome && (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(96,165,250,0.5)]" />
          )}
        </div>
      </button>
    )
  }

  // Display details for the currently selected day
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : { bills: [], paydays: [] }
  const selectedDateStr = selectedDay
    ? new Date(year, month, selectedDay).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div className="space-y-6">
      {/* Month Navigation Control Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800/60">
        <button onClick={handlePrevMonth} className="p-2 rounded-lg bg-gray-900/60 border border-gray-800/50 hover:bg-gray-800/50 text-gray-400 transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">
          {monthNames[month]} {year}
        </h2>
        <button onClick={handleNextMonth} className="p-2 rounded-lg bg-gray-900/60 border border-gray-800/50 hover:bg-gray-800/50 text-gray-400 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week Labels Row */}
      <div className="grid grid-cols-7 gap-px text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      {/* Main Dates Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-800/20 rounded-xl overflow-hidden border border-gray-800/40">
        {gridCells}
      </div>

      {/* Selected Day Agenda Drawer Details */}
      {selectedDay && (
        <div className="bg-gray-900/30 border border-gray-800/50 p-5 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 text-xs text-gray-400 font-semibold">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span>Agenda for {selectedDateStr}</span>
          </div>

          {selectedEvents.bills.length === 0 && selectedEvents.paydays.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No scheduled transactions on this date.</p>
          ) : (
            <div className="space-y-3">
              {/* Paydays */}
              {selectedEvents.paydays.map((pay: any, idx: number) => (
                <div key={`pay-${idx}`} className="flex items-center justify-between p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-200">{pay.name}</p>
                    <span className="text-[10px] text-blue-400 font-medium">Estimated Payroll Inflow</span>
                  </div>
                  <p className="text-xs font-bold text-blue-400">+${pay.amount.toFixed(2)}</p>
                </div>
              ))}

              {/* Bills */}
              {selectedEvents.bills.map((occ: any) => (
                <div key={occ.id} className="flex items-center justify-between p-3.5 bg-gray-950/30 border border-gray-800/40 rounded-xl">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-200">{occ.bill?.name}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                      <span>{occ.bill?.autopay ? 'AutoPay' : 'Manual Pay'}</span>
                      <span>•</span>
                      <span className="flex items-center uppercase text-[9px] font-bold">
                        {occ.status === 'paid' && (
                          <span className="text-emerald-400 flex items-center"><CheckCircle2 className="h-3 w-3 mr-0.5" /> Paid</span>
                        )}
                        {occ.status === 'overdue' && (
                          <span className="text-rose-400 flex items-center"><AlertCircle className="h-3 w-3 mr-0.5" /> Overdue</span>
                        )}
                        {(occ.status === 'upcoming' || occ.status === 'due_soon') && (
                          <span className="text-yellow-500 flex items-center"><Clock className="h-3 w-3 mr-0.5" /> Pending</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-200">
                      ${Number(occ.status === 'paid' ? occ.actual_amount : occ.expected_amount).toFixed(2)}
                    </p>
                    <span className="text-[9px] text-gray-500">Expected Outflow</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
