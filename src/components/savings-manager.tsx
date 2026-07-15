'use client'

import React, { useState } from 'react'
import { logSavingsContribution, createSavingsGoal } from '@/app/actions/savings'
import { Plus, PiggyBank, Target, Calendar, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface Goal {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  monthly_target_contribution: number
  priority: number
  on_track_status: string
}

interface SavingsManagerProps {
  initialGoals: Goal[]
}

export function SavingsManager({ initialGoals }: SavingsManagerProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeFundGoalId, setActiveFundGoalId] = useState<string | null>(null)
  const [fundAmount, setFundAmount] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  // Form states for new goal
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const [newGoalCurrent, setNewGoalCurrent] = useState('')
  const [newGoalDate, setNewGoalDate] = useState('')
  const [newGoalContrib, setNewGoalContrib] = useState('')
  const [newGoalPriority, setNewGoalPriority] = useState('2')

  const handleAddFunds = async (goalId: string) => {
    const amt = parseFloat(fundAmount)
    if (isNaN(amt) || amt <= 0) return

    setLoading(goalId)
    const result = await logSavingsContribution(goalId, amt)
    setLoading(null)

    if (result && 'success' in result) {
      // Optimistic locally updated state
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id === goalId) {
            const current = Number(g.current_amount) + amt
            return {
              ...g,
              current_amount: current,
              on_track_status: current >= Number(g.target_amount) ? 'completed' : g.on_track_status,
            }
          }
          return g
        })
      )
      setActiveFundGoalId(null)
      setFundAmount('')
    } else if (result && 'error' in result) {
      alert(result.error)
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseFloat(newGoalTarget)
    const current = parseFloat(newGoalCurrent || '0')
    const contrib = parseFloat(newGoalContrib || '0')
    const priority = parseInt(newGoalPriority)

    if (!newGoalName || isNaN(target) || target <= 0) {
      alert('Please fill out name and target amount correctly.')
      return
    }

    setLoading('create')
    const result = await createSavingsGoal({
      name: newGoalName,
      targetAmount: target,
      currentAmount: current,
      targetDate: newGoalDate,
      monthlyContribution: contrib,
      priority,
    })
    setLoading(null)

    if (result && 'success' in result) {
      // Reload page to fetch updated list
      window.location.reload()
    } else if (result && 'error' in result) {
      alert(result.error)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Columns: Savings Goals Cards Grid */}
      <div className="lg:col-span-2 space-y-4">
        {goals.length === 0 ? (
          <div className="glass-panel p-10 rounded-2xl text-center space-y-3">
            <PiggyBank className="h-10 w-10 text-gray-600 mx-auto" />
            <p className="text-xs text-gray-500">No active savings goals found.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 inline-flex items-center"
            >
              Create Goal <Plus className="h-3 w-3 ml-1" />
            </button>
          </div>
        ) : (
          goals.map((goal) => {
            const pct = Math.min(100, Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100))
            const isFunding = activeFundGoalId === goal.id

            return (
              <div key={goal.id} className="glass-panel p-5 rounded-2xl space-y-4 relative">
                
                {/* Upper Details */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-100">{goal.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                      <span className="flex items-center"><Target className="h-3 w-3 mr-0.5" /> Priority {goal.priority}</span>
                      {goal.target_date && (
                        <span className="flex items-center"><Calendar className="h-3 w-3 mr-0.5" /> Target {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>

                  <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${
                    goal.on_track_status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : goal.on_track_status === 'behind'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  }`}>
                    {goal.on_track_status === 'completed' ? (
                      <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Completed</>
                    ) : (
                      <><AlertCircle className="h-3 w-3 mr-0.5" /> On Track</>
                    )}
                  </span>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-200">
                      ${Number(goal.current_amount).toLocaleString()} <span className="text-gray-500 font-normal">of ${Number(goal.target_amount).toLocaleString()}</span>
                    </span>
                    <span className="font-bold text-emerald-400">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-800/40">
                    <div
                      className="bg-emerald-500 h-2 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)] transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Extra metrics & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-800/30">
                  <p className="text-[10px] text-gray-500">
                    Contribution Target:{' '}
                    <span className="font-bold text-gray-300">${Number(goal.monthly_target_contribution).toFixed(2)}/mo</span>
                  </p>

                  {goal.on_track_status !== 'completed' && (
                    <div className="flex items-center space-x-2">
                      {isFunding ? (
                        <div className="flex items-center space-x-1.5 animate-fadeIn">
                          <input
                            type="number"
                            placeholder="Amount ($)"
                            value={fundAmount}
                            onChange={(e) => setFundAmount(e.target.value)}
                            className="bg-slate-900 border border-gray-800/80 rounded px-2.5 py-1 text-[10px] text-gray-200 w-24 focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            onClick={() => handleAddFunds(goal.id)}
                            disabled={loading === goal.id}
                            className="text-[9px] px-2 py-1 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-50 inline-flex items-center"
                          >
                            {loading === goal.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                          </button>
                          <button
                            onClick={() => {
                              setActiveFundGoalId(null)
                              setFundAmount('')
                            }}
                            className="text-[9px] px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveFundGoalId(goal.id)}
                          className="text-[10px] text-emerald-400 font-bold hover:text-emerald-300 flex items-center transition-colors"
                        >
                          Add Funds <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )
          })
        )}
      </div>

      {/* Right Column: Goal Creator Form */}
      <div>
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-100">Establish Target Goal</h2>
            <PiggyBank className="h-5 w-5 text-emerald-400" />
          </div>

          <form onSubmit={handleCreateGoal} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Goal Name</label>
              <input
                type="text"
                placeholder="e.g. Hawaii Vacation 2027"
                required
                value={newGoalName}
                onChange={(e) => setNewGoalName(e.target.value)}
                className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  required
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Starting ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 200"
                  value={newGoalCurrent}
                  onChange={(e) => setNewGoalCurrent(e.target.value)}
                  className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Target Date (Optional)</label>
              <input
                type="date"
                value={newGoalDate}
                onChange={(e) => setNewGoalDate(e.target.value)}
                className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Monthly Target ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={newGoalContrib}
                  onChange={(e) => setNewGoalContrib(e.target.value)}
                  className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Priority (1-5)</label>
                <select
                  value={newGoalPriority}
                  onChange={(e) => setNewGoalPriority(e.target.value)}
                  className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2.5 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="1">1 - Critical</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - Low</option>
                  <option value="5">5 - Nice to have</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading === 'create'}
              className="w-full text-xs py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all mt-2 flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              {loading === 'create' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Establish Goal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

    </div>
  )
}
