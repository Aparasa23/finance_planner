'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { confirmOccurrencePayment, confirmRecurringStream, dismissRecurringStream } from '@/app/actions/obligation'
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  Percent,
  CheckCircle2,
  Clock,
  HelpCircle,
  Sparkles,
  Info,
  ChevronRight,
  Home,
  PhoneCall,
  Tv,
  Coins,
  MessageSquare,
  X
} from 'lucide-react'

interface DashboardContentProps {
  currentCash: number
  creditBalance: number
  netWorth: number
  healthStatus: string
  healthColor: string
  healthDesc: string
  connectionsNeedAttention: boolean
  upcomingBills: any[]
  reviewBills: any[]
  paidBills: any[]
  cardsWithStatement: any[]
  installmentPlans: any[]
  transactions: any[]
  unconfirmedStreams: any[]
}

export function DashboardContent({
  currentCash,
  creditBalance,
  netWorth,
  healthStatus,
  healthColor,
  healthDesc,
  connectionsNeedAttention,
  upcomingBills,
  reviewBills,
  paidBills,
  cardsWithStatement,
  installmentPlans,
  transactions,
  unconfirmedStreams,
}: DashboardContentProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isConfirming, startConfirmTransition] = useTransition()

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleConfirm = async (occurrenceId: string, name: string) => {
    if (window.confirm(`Mark "${name}" payment as completed?`)) {
      startConfirmTransition(async () => {
        const res = await confirmOccurrencePayment(occurrenceId)
        if (res && 'error' in res) {
          alert(res.error)
        }
      })
    }
  }

  const handleConfirmStream = async (streamId: string, name: string) => {
    if (window.confirm(`Add "${name}" as a tracked recurring bill/subscription?`)) {
      startConfirmTransition(async () => {
        const res = await confirmRecurringStream(streamId)
        if (res && 'error' in res) {
          alert(res.error)
        } else {
          alert(`"${name}" successfully added to your bills checklist!`)
        }
      })
    }
  }

  const handleDismissStream = async (streamId: string) => {
    if (window.confirm(`Dismiss this recurring payment notification?`)) {
      startConfirmTransition(async () => {
        const res = await dismissRecurringStream(streamId)
        if (res && 'error' in res) {
          alert(res.error)
        }
      })
    }
  }

  // Aggregate outstanding loan balance (excluding 401k loan from total since principal is 0 review)
  const totalLoanBalance = installmentPlans.reduce(
    (acc: number, curr: any) => acc + Number(curr.remaining_principal),
    0
  )

  // Re-adjust net worth to include loans principal
  const trueNetWorth = currentCash - creditBalance - totalLoanBalance

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    )
  }

  // Merge all occurrences
  const allOccurrences = [...upcomingBills, ...reviewBills, ...paidBills]

  // Group Home, Utilities & Communications (merged per user request)
  const homeUtilitiesAndComms = allOccurrences.filter(
    (occ: any) => 
      occ.bill?.category === 'Utilities' || 
      occ.bill?.category === 'Home Security' || 
      occ.bill?.category === 'Phone' || 
      occ.bill?.category === 'Home & Utilities' || 
      occ.bill?.category === 'Phone & Communications' || 
      occ.bill?.category === 'Housing'
  )
  const homeConfirmed = homeUtilitiesAndComms.filter((occ: any) => occ.status !== 'needs_review')
  const homeReview = homeUtilitiesAndComms.filter((occ: any) => occ.status === 'needs_review')

  // Group Subscriptions & Memberships
  const subscriptions = allOccurrences.filter(
    (occ: any) => 
      occ.bill?.category === 'Subscriptions' || 
      occ.bill?.category === 'Membership' || 
      occ.bill?.category === 'Subscriptions & Memberships'
  )
  const subsConfirmed = subscriptions.filter((occ: any) => occ.status !== 'needs_review')
  const subsReview = subscriptions.filter((occ: any) => occ.status === 'needs_review')

  // Helper to determine payment frequency label
  const getFrequencyLabel = (name: string, freq: string) => {
    const lower = name.toLowerCase()
    if (lower.includes('costco') || lower.includes('gopro')) return 'Annual'
    if (lower.includes('amazon')) return 'Annual / Monthly'
    if (lower.includes('progressive')) return '6-Month'
    if (lower.includes('annual fee') || lower.includes('membership fee')) return 'Annual'
    return freq || 'Monthly'
  }

  return (
    <div className="space-y-4 text-gray-200 relative pb-16">
      
      {/* 1. Global KPI Health Standing Banner */}
      <div className="glass-panel p-3.5 rounded-2xl border border-gray-800 bg-gradient-to-r from-gray-950/40 to-slate-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider">Household Financial Status</span>
            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-gray-900 border border-gray-800 ${healthColor}`}>
              {healthStatus}
            </span>
          </div>
          <p className="text-gray-300 font-semibold leading-relaxed text-[11px]">{healthDesc}</p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <div className="text-right">
            <p className="text-[9px] text-gray-500 uppercase font-bold">Plaid Link</p>
            <p className="text-[10px] font-bold text-gray-300">2 Accounts Synchronized</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* 1b. Gemini Detected Recurring Payments Notification Banner */}
      {unconfirmedStreams.map((stream: any) => (
        <div
          key={stream.id}
          className="relative overflow-hidden glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-slate-900/30 to-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Gemini Intelligence</span>
                <span className="text-[8px] font-semibold bg-emerald-500/15 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/20 uppercase">
                  New {stream.category} Detected
                </span>
              </div>
              <p className="text-gray-200 font-semibold text-[11px]">
                We detected a recurring charge to <span className="font-extrabold text-white">"{stream.display_name || stream.merchant_name}"</span> for <span className="text-emerald-400 font-extrabold">${Number(stream.typical_amount).toFixed(2)}</span> ({stream.frequency}).
              </p>
              <p className="text-[10px] text-gray-500">
                Plaid Merchant ID: <span className="font-mono text-gray-450">{stream.merchant_name}</span> (Confidence: {Math.round(stream.confidence_score * 100)}%)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:self-center shrink-0">
            <button
              onClick={() => handleConfirmStream(stream.id, stream.display_name || stream.merchant_name)}
              className="text-[10px] px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-500/10"
            >
              Add Bill
            </button>
            <button
              onClick={() => handleDismissStream(stream.id)}
              className="text-[10px] px-3 py-2 border border-gray-800 text-gray-450 hover:text-gray-250 hover:bg-gray-900 rounded-lg transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}

      {/* 2. Main Financial Totals Row (4 columns) */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Cash */}
        <div className="glass-panel p-3.5 rounded-2xl flex flex-col justify-between space-y-2 bg-slate-950/10 border-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Cash Reserves</span>
            <Wallet className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-emerald-400">
              ${currentCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[8px] text-gray-550">Checking: Chase & BofA</p>
          </div>
        </div>

        {/* Card Liabilities */}
        <div className="glass-panel p-3.5 rounded-2xl flex flex-col justify-between space-y-2 bg-slate-950/10 border-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Card Balances</span>
            <CreditCard className="h-4.5 w-4.5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-rose-400">
              ${creditBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[8px] text-gray-550">Apple, Venture X, Amex, Discover</p>
          </div>
        </div>

        {/* Loan Liabilities */}
        <div className="glass-panel p-3.5 rounded-2xl flex flex-col justify-between space-y-2 bg-slate-950/10 border-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mortgages & Loans</span>
            <Percent className="h-4.5 w-4.5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-orange-400">
              ${totalLoanBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[8px] text-gray-550">Valon Mortgage, TD, RC Willey</p>
          </div>
        </div>

        {/* Net Worth */}
        <div className="glass-panel p-3.5 rounded-2xl flex flex-col justify-between space-y-2 bg-slate-950/10 border-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Liquid Net Worth</span>
            <TrendingUp className="h-4.5 w-4.5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-blue-400">
              ${trueNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[8px] text-gray-550">Cash minus Card & Loan debts</p>
          </div>
        </div>
      </section>

      {/* 3. Three-Column Segregated Layout (Zero Scrolling Dashboard Console) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* ================= COLUMN 1: HOME & UTILITIES & PHONE (MERGED) ================= */}
        <div className="space-y-4">
          
          {/* Home, Utilities & Phone */}
          <div className="glass-panel p-4 rounded-2xl space-y-3 bg-slate-950/10 flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-900 pb-2">
              <div className="flex items-center space-x-1.5">
                <Home className="h-4.5 w-4.5 text-emerald-400" />
                <h2 className="text-xs font-bold text-gray-100 uppercase tracking-wider">Home, Utilities & Phone</h2>
              </div>
              <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase">
                Utility & Comms
              </span>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto custom-scrollbar text-[11px] pr-1">
              
              {/* Confirmed list */}
              <div className="space-y-1.5">
                <p className="text-[8px] font-extrabold uppercase text-emerald-400 tracking-wider">Confirmed Payments</p>
                {homeConfirmed.map((occ: any) => {
                  const isPaid = occ.status === 'paid'
                  const isOverdue = !isPaid && new Date(occ.due_date + 'T23:59:59') < new Date()
                  
                  let statusBadge = <span className="text-[7px] text-emerald-400 font-bold uppercase tracking-wider">🟢 Paid (Good Standing)</span>
                  if (isOverdue) {
                    statusBadge = <span className="text-[7px] text-rose-450 font-extrabold uppercase tracking-wider animate-pulse">⚠️ Overdue (Delayed)</span>
                  } else if (!isPaid) {
                    statusBadge = <span className="text-[7px] text-yellow-400 font-bold uppercase tracking-wider">⏳ Due Soon (Good Standing)</span>
                  }

                  return (
                    <div key={occ.id} className={`flex justify-between items-center bg-gray-950/20 border p-1.5 rounded-lg ${isOverdue ? 'border-rose-500/30 bg-rose-500/2' : 'border-gray-900'}`}>
                      <div>
                        <p className={`font-semibold ${isPaid ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
                          {occ.bill?.name}
                        </p>
                        <p className="text-[8px] text-gray-500">
                          Due: {new Date(occ.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {occ.bill?.autopay ? 'AutoDraft' : 'Manual'}
                        </p>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <div>
                          <p className={`font-bold ${isPaid ? 'text-gray-500' : 'text-gray-200'}`}>
                            ${Number(occ.expected_amount).toFixed(2)}
                          </p>
                          <div className="mt-0.5">{statusBadge}</div>
                        </div>
                        {!isPaid && (
                          <button
                            onClick={() => handleConfirm(occ.id, occ.bill?.name)}
                            disabled={isConfirming}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-[8px] font-bold uppercase transition-all flex items-center space-x-1 shrink-0 h-7"
                            title="Confirm Payment Match"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Confirm</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Review Checklist */}
              <div className="space-y-1.5 pt-1.5">
                <p className="text-[8px] font-extrabold uppercase text-yellow-500 tracking-wider">Requires Confirmation / Audit</p>
                {homeReview.map((occ: any) => {
                  const isMobileCarrier = occ.bill?.name?.includes('Mobile Phone')
                  const carrierNote = isMobileCarrier 
                    ? 'Zelle to Friend (Verizon Network)'
                    : 'Verify in Mortgage Escrow / Statements'
                  
                  return (
                    <div key={occ.id} className="flex justify-between items-center bg-yellow-500/2 border border-yellow-500/10 p-1.5 rounded-lg border-l-2 border-l-yellow-500">
                      <div>
                        <p className="font-semibold text-gray-200 leading-tight">{occ.bill?.name}</p>
                        <p className="text-[8px] text-yellow-500/70">{carrierNote}</p>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <div>
                          <p className="font-bold text-gray-200">
                            {occ.expected_amount > 0 ? `$${Number(occ.expected_amount).toFixed(2)}` : 'Audit'}
                          </p>
                          <span className="text-[7px] text-gray-500 uppercase font-semibold block">
                            {getFrequencyLabel(occ.bill?.name, occ.bill?.frequency)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleConfirm(occ.id, occ.bill?.name)}
                          disabled={isConfirming}
                          className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-[8px] font-bold uppercase transition-all flex items-center space-x-1 shrink-0 h-7"
                          title="Approve / Confirm Match"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>

          {/* Subscriptions & Recurring Services */}
          <div className="glass-panel p-4 rounded-2xl space-y-3 bg-slate-950/10 flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-900 pb-2">
              <div className="flex items-center space-x-1.5">
                <Tv className="h-4.5 w-4.5 text-emerald-400" />
                <h2 className="text-xs font-bold text-gray-100 uppercase tracking-wider">Subscriptions & Memberships</h2>
              </div>
              <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase">
                Recurring
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar text-[11px] pr-1">
              
              {/* Confirmed Subscriptions */}
              <div className="space-y-1.5">
                <p className="text-[8px] font-extrabold uppercase text-emerald-400 tracking-wider">Confirmed Subscriptions</p>
                {subsConfirmed.map((occ: any) => {
                  const isPaid = occ.status === 'paid'
                  const isOverdue = !isPaid && new Date(occ.due_date + 'T23:59:59') < new Date()
                  const freq = getFrequencyLabel(occ.bill?.name, occ.bill?.frequency)

                  let statusBadge = <span className="text-[7px] text-emerald-400 font-bold uppercase tracking-wider">🟢 Paid</span>
                  if (isOverdue) {
                    statusBadge = <span className="text-[7px] text-rose-450 font-extrabold uppercase tracking-wider animate-pulse">⚠️ Overdue</span>
                  } else if (!isPaid) {
                    statusBadge = <span className="text-[7px] text-yellow-400 font-bold uppercase tracking-wider">⏳ Due Soon</span>
                  }

                  return (
                    <div key={occ.id} className={`flex justify-between items-center bg-gray-950/20 border p-1.5 rounded-lg ${isOverdue ? 'border-rose-500/30 bg-rose-500/2' : 'border-gray-900'}`}>
                      <div>
                        <p className={`font-semibold ${isPaid ? 'text-gray-400 line-through' : 'text-gray-200'}`}>
                          {occ.bill?.name}
                        </p>
                        <p className="text-[8px] text-gray-500">
                          Due: {new Date(occ.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <div>
                          <p className={`font-bold ${isPaid ? 'text-gray-500' : 'text-gray-200'}`}>
                            ${Number(occ.expected_amount).toFixed(2)}
                          </p>
                          <div className="flex items-center space-x-1 justify-end mt-0.5">
                            <span className="text-[7px] bg-slate-900 border border-gray-800 text-gray-400 px-1 py-0.1 rounded uppercase font-semibold">
                              {freq}
                            </span>
                            {statusBadge}
                          </div>
                        </div>
                        {!isPaid && (
                          <button
                            onClick={() => handleConfirm(occ.id, occ.bill?.name)}
                            disabled={isConfirming}
                            className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-[8px] font-bold uppercase transition-all flex items-center space-x-1 shrink-0 h-7"
                            title="Confirm Payment Match"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Confirm</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Requires Confirmation Subscriptions */}
              <div className="space-y-1.5 pt-1.5">
                <p className="text-[8px] font-extrabold uppercase text-yellow-500 tracking-wider">Requires Classification / Audit</p>
                {subsReview.map((occ: any) => {
                  const freq = getFrequencyLabel(occ.bill?.name, occ.bill?.frequency)
                  return (
                    <div key={occ.id} className="flex justify-between items-center bg-yellow-500/2 border border-yellow-500/10 p-1.5 rounded-lg border-l-2 border-l-yellow-500">
                      <div>
                        <p className="font-semibold text-gray-200 leading-tight">{occ.bill?.name}</p>
                        <p className="text-[8px] text-yellow-500/70">Verify amount / renewal usage</p>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <div>
                          <p className="font-bold text-gray-200">
                            {occ.expected_amount > 0 ? `$${Number(occ.expected_amount).toFixed(2)}` : 'Audit'}
                          </p>
                          <span className="text-[7px] text-gray-550 uppercase font-semibold block">{freq}</span>
                        </div>
                        <button
                          onClick={() => handleConfirm(occ.id, occ.bill?.name)}
                          disabled={isConfirming}
                          className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-[8px] font-bold uppercase transition-all flex items-center space-x-1 shrink-0 h-7"
                          title="Approve / Confirm Match"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

            </div>
          </div>

        </div>

        {/* ================= COLUMN 2: LOANS & MORTGAGES (AT THE TOP) & SUBSCRIPTIONS ================= */}
        <div className="space-y-4">
          
          {/* Amortizing Loans & Mortgages (Relocated to the Top!) */}
          <div className="glass-panel p-4 rounded-2xl space-y-3 bg-slate-950/10 border border-emerald-500/20">
            <div className="flex items-center justify-between border-b border-gray-900 pb-2">
              <div className="flex items-center space-x-1.5">
                <Percent className="h-4.5 w-4.5 text-emerald-400" />
                <h2 className="text-xs font-bold text-gray-100 uppercase tracking-wider">Loans & Mortgages Ledger</h2>
              </div>
              <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase">
                Liability
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {installmentPlans.map((plan: any) => {
                const start = plan.start_date ? new Date(plan.start_date + 'T12:00:00') : null
                const today = new Date()
                
                let completed = Number(plan.payments_completed)
                let remaining = Number(plan.payments_remaining)
                let remainingPrincipal = Number(plan.remaining_principal)

                if (start) {
                  let monthsPassed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth())
                  if (today.getDate() < start.getDate()) {
                    monthsPassed = Math.max(0, monthsPassed - 1)
                  }
                  completed = Math.min(plan.total_scheduled_payments, Math.max(0, monthsPassed))
                  remaining = plan.total_scheduled_payments - completed

                  // Calculate remaining principal after completed months
                  const rate = Number(plan.interest_rate)
                  const monthlyPayment = Number(plan.regular_payment_amount)
                  let bal = Number(plan.original_purchase_amount || plan.financed_principal)
                  
                  for (let i = 0; i < completed; i++) {
                    const interest = bal * (rate / 12)
                    const principal = monthlyPayment - interest
                    bal = Math.max(0, bal - principal)
                  }
                  remainingPrincipal = bal
                }

                const pct = Math.round((completed / plan.total_scheduled_payments) * 100)
                const is401k = plan.name.includes('401(k)')
                const isMortgage = plan.name.toLowerCase().includes('mortgage')
                
                let paidFrom = 'Chase Checking'
                let rate = '0% APR'

                if (isMortgage) {
                  paidFrom = 'Chase Checking'
                  rate = plan.interest_rate > 0 ? `${Number(plan.interest_rate * 100).toFixed(1)}% Fixed` : '5.5% (Escrow)'
                } else if (plan.name.toLowerCase().includes('auto') || plan.name.toLowerCase().includes('car')) {
                  paidFrom = 'Chase Checking'
                  rate = plan.interest_rate > 0 ? `${Number(plan.interest_rate * 100).toFixed(1)}% APR` : 'Auto Term'
                } else if (is401k) {
                  paidFrom = 'Payroll Deduction'
                } else if (plan.interest_rate > 0) {
                  rate = `${Number(plan.interest_rate * 100).toFixed(1)}% APR`
                }

                return (
                  <div
                    key={plan.id}
                    className={`p-3 bg-gray-950/40 border border-gray-900/60 rounded-xl space-y-1.5 hover:border-gray-800 transition-colors ${
                      is401k ? 'border-yellow-500/10 bg-yellow-500/2' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-200 leading-tight">{plan.name}</h3>
                        <p className="text-[8px] text-gray-555 capitalize">
                          {plan.provider} • {rate}
                          {plan.next_due_date && (
                            <span className="text-emerald-400 font-semibold ml-1.5 border-l border-gray-800/80 pl-1.5">
                              Due {new Date(plan.next_due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-200">
                          {is401k ? 'Payroll' : `$${Number(plan.regular_payment_amount).toFixed(2)}`}
                        </p>
                        <span className="text-[7px] text-gray-500 block uppercase font-semibold">Monthly</span>
                      </div>
                    </div>

                    {/* Progress details */}
                    <div className="grid grid-cols-2 gap-1 text-[9px] text-gray-400 border-t border-gray-900/40 pt-1.5">
                      <div>
                        <span className="text-gray-500">Remaining Balance:</span>
                        <p className="font-bold text-gray-300">
                          {is401k ? 'Needs Review' : `$${Number(remainingPrincipal).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-550">Payments:</span>
                        <p className="font-bold text-gray-300">{completed}/{plan.total_scheduled_payments} mos</p>
                      </div>
                    </div>

                    {/* Progress Bar indicator */}
                    <div className="space-y-1">
                      <div className="w-full bg-gray-850 rounded-full h-1 overflow-hidden">
                        <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-550">
                        <span>{pct}% paid off</span>
                        <span>Paid From: {paidFrom}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>



        </div>

        {/* ================= COLUMN 3: CREDIT CARD STATEMENTS ================= */}
        <div className="space-y-4">
          
          <div className="glass-panel p-4 rounded-2xl space-y-3 bg-slate-950/10 h-full flex flex-col">
            <div className="flex items-center space-x-1.5">
              <CreditCard className="h-4.5 w-4.5 text-emerald-400" />
              <h2 className="text-xs font-bold text-gray-100 uppercase tracking-wider">Credit Card Statement Payments</h2>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-gray-800/80 text-[9px] text-gray-500 uppercase font-bold">
                    <th className="py-2 pr-1">Card</th>
                    <th className="py-2 px-1 text-right">Balance</th>
                    <th className="py-2 px-1 text-right">Min Due</th>
                    <th className="py-2 px-1 text-center">Due Date</th>
                    <th className="py-2 pl-1 text-right">Util</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/60 text-gray-300">
                  {cardsWithStatement.map((card: any) => {
                    const isHighUtil = card.utilization > 50
                    const isDueSoon = card.due_date.includes('18') // Capital One due July 18
                    
                    return (
                      <tr
                        key={card.id}
                        className={`hover:bg-gray-900/30 transition-colors ${
                          isHighUtil ? 'bg-red-500/2 border-l border-red-500/30' : ''
                        }`}
                      >
                        <td className="py-2.5 pr-1">
                          <p className="font-semibold text-gray-200 leading-tight">{card.name}</p>
                          <div className="flex items-center space-x-1 text-[7px] text-gray-500 font-semibold uppercase tracking-wider">
                            <span>Monthly</span>
                            {card.autopay_status !== 'Unknown' && (
                              <span className="text-emerald-400/90">• Autopay</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-1 text-right font-semibold text-gray-200">
                          ${Number(card.current_balance).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-1 text-right text-gray-400">
                          ${Number(card.minimum_payment).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          {isDueSoon ? (
                            <span className="text-yellow-400 font-bold bg-yellow-500/10 px-1 py-0.5 rounded text-[8px] border border-yellow-500/10 animate-pulse">
                              Due Soon
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {card.due_date.includes('-')
                                ? new Date(card.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : card.due_date}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pl-1 text-right">
                          <span className={`font-bold ${isHighUtil ? 'text-red-400' : 'text-emerald-400'}`}>
                            {card.utilization}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Annual fee warnings for credit cards */}
            <div className="pt-2 border-t border-gray-900 text-[9px] text-yellow-500/80 flex items-start space-x-1 mt-2">
              <Info className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
              <div className="space-y-0.5">
                <p>Venture X: $395.00 Annual fee expected on July statement.</p>
                <p>Amex BCP: $95.00 Annual fee scheduled in statements.</p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
