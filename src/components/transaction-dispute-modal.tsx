'use client'

import React, { useState } from 'react'
import {
  Sparkles,
  X,
  Copy,
  Check,
  Phone,
  Mail,
  ShieldAlert,
  FileText,
  DollarSign,
  Zap,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'

interface TransactionDisputeModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: {
    id?: string
    merchantName: string
    amount: number
    date: string
    category?: string
  } | null
}

const DISPUTE_REASONS = [
  {
    id: 'unused_refund',
    icon: '🎟️',
    title: 'Claim Unused Service Refund',
    desc: "I haven't used this subscription/service for a long time. Get me a 100% refund.",
  },
  {
    id: 'lower_rate',
    icon: '📉',
    title: 'Lower Bill & Loyalty Discount',
    desc: 'The bill increased or is too high. Negotiate a lower promotional rate.',
  },
  {
    id: 'incorrect_charge',
    icon: '🛑',
    title: 'Dispute Overcharge / Error',
    desc: 'Charged the wrong amount or charged twice. Request instant credit.',
  },
  {
    id: 'cancel_waive_fee',
    icon: '❌',
    title: 'Cancel & Waive Penalty Fees',
    desc: 'Cancel contract without early termination or maintenance fees.',
  },
]

export function TransactionDisputeModal({
  isOpen,
  onClose,
  transaction,
}: TransactionDisputeModalProps) {
  const [selectedReason, setSelectedReason] = useState('unused_refund')
  const [userNotes, setUserNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [disputePackage, setDisputePackage] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'phone' | 'email' | 'leverage' | 'bank'>('phone')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  if (!isOpen || !transaction) return null

  const handleGenerateStrategy = async () => {
    setLoading(true)
    setDisputePackage(null)

    try {
      const reasonObj = DISPUTE_REASONS.find((r) => r.id === selectedReason)
      const res = await fetch('/api/transactions/dispute-advocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantName: transaction.merchantName,
          amount: transaction.amount,
          date: transaction.date,
          category: transaction.category || 'General',
          disputeReason: reasonObj ? `${reasonObj.title}: ${reasonObj.desc}` : selectedReason,
          userNotes,
        }),
      })

      const data = await res.json()
      if (data.success && data.disputePackage) {
        setDisputePackage(data.disputePackage)
      } else {
        alert(data.error || 'Failed to generate dispute strategy.')
      }
    } catch (err: any) {
      alert('Network error generating AI dispute package: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel bg-slate-950/95 border border-emerald-500/30 rounded-3xl p-6 text-gray-200 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
                  Canvora AI Deal & Refund Advocate
                </span>
              </div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Dispute {transaction.merchantName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Transaction Summary Tile */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-gray-800/80">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-gray-450 uppercase">Target Transaction</span>
            <p className="text-sm font-bold text-white">{transaction.merchantName}</p>
            <span className="text-xs text-gray-400">{transaction.date} • {transaction.category || 'Subscription'}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400 block">Amount</span>
            <span className="text-xl font-black text-emerald-400">
              ${Number(transaction.amount).toFixed(2)}
            </span>
          </div>
        </div>

        {!disputePackage ? (
          /* Step 1: Select Dispute Goal & Enter Context */
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Select Your Goal / Dispute Objective
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DISPUTE_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 ${
                      selectedReason === reason.id
                        ? 'border-emerald-500 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                        : 'border-gray-800/80 bg-slate-900/30 hover:border-gray-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{reason.icon}</span>
                    <div className="space-y-1">
                      <p className="text-xs font-extrabold text-white">{reason.title}</p>
                      <p className="text-[11px] text-gray-400 leading-snug">{reason.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Additional Details (Optional)
              </label>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="e.g. I haven't logged in or used Frontier for 5 months, or service was offline for 3 days."
                rows={2}
                className="w-full rounded-2xl border border-gray-800 bg-slate-900/80 p-3 text-xs text-gray-200 placeholder-gray-500 focus:border-emerald-500 focus:outline-none transition-all"
              />
            </div>

            {/* Submit Action */}
            <button
              onClick={handleGenerateStrategy}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  <span>Researching Policy & Building Negotiation Script...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-current text-slate-950" />
                  <span>Generate AI Negotiation & Refund Package</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Step 2: Display Generated Dispute Strategy Package */
          <div className="space-y-5 animate-fade-in">
            {/* Strategy Summary Banner */}
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  AI Negotiation Strategy Ready
                </span>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed">
                {disputePackage.strategySummary}
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1.5 border-b border-gray-800 pb-2">
              <button
                onClick={() => setActiveTab('phone')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'phone'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Phone Script</span>
              </button>

              <button
                onClick={() => setActiveTab('email')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'email'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email & Chat Letter</span>
              </button>

              <button
                onClick={() => setActiveTab('leverage')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'leverage'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Terms Leverage</span>
              </button>

              <button
                onClick={() => setActiveTab('bank')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'bank'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Card Dispute</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="space-y-4">
              {/* 1. Phone Script Tab */}
              {activeTab === 'phone' && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-400">1. Opening Line (Read to Support Rep)</span>
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-gray-800 text-gray-200 flex items-start justify-between gap-2">
                      <p className="italic">"{disputePackage.phoneScript?.opening}"</p>
                      <button
                        onClick={() => handleCopy(disputePackage.phoneScript?.opening, 'phone_open')}
                        className="p-1.5 text-gray-400 hover:text-emerald-400 shrink-0"
                      >
                        {copiedKey === 'phone_open' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-emerald-400">2. Key Points to State</span>
                    <ul className="space-y-2">
                      {disputePackage.phoneScript?.keyPoints?.map((pt: string, idx: number) => (
                        <li key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-gray-800/80 text-gray-300 flex items-center space-x-2">
                          <ChevronRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase text-rose-400">3. If They Refuse / State Company Policy</span>
                    <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200">
                      <p className="italic">"{disputePackage.phoneScript?.escalationIfDenied}"</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Email & Live Chat Tab */}
              {activeTab === 'email' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400">Ready-To-Send Email / Customer Support Chat Transcript</span>
                    <button
                      onClick={() => handleCopy(disputePackage.emailDraft, 'email_draft')}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-bold flex items-center space-x-1"
                    >
                      {copiedKey === 'email_draft' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy Email Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={disputePackage.emailDraft}
                    rows={8}
                    className="w-full rounded-2xl border border-gray-800 bg-slate-900/90 p-3.5 text-xs text-gray-200 font-mono leading-relaxed focus:outline-none"
                  />
                </div>
              )}

              {/* 3. Terms Leverage Tab */}
              {activeTab === 'leverage' && (
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-emerald-400">Consumer Rights & Legal/Terms Clauses to Quote</span>
                  <div className="space-y-2">
                    {disputePackage.legalPolicyLeverage?.map((rule: string, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900/70 border border-gray-800 flex items-start space-x-3 text-xs text-gray-200">
                        <FileText className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <p>{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Bank Chargeback Tab */}
              {activeTab === 'bank' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-gray-800 flex items-center justify-between">
                    <span className="text-gray-400 font-semibold">Recommended Card Chargeback Code:</span>
                    <span className="font-mono font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                      {disputePackage.bankDisputeReasonCode}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-400">Bank Dispute Statement (For Chase / BofA / Apple Card)</span>
                      <button
                        onClick={() => handleCopy(disputePackage.bankDisputeLetter, 'bank_letter')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-bold flex items-center space-x-1"
                      >
                        {copiedKey === 'bank_letter' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>Copy Statement</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      value={disputePackage.bankDisputeLetter}
                      rows={4}
                      className="w-full rounded-2xl border border-gray-800 bg-slate-900/90 p-3 text-xs text-gray-200 font-mono leading-relaxed focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Reset / Done Button */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <button
                onClick={() => setDisputePackage(null)}
                className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
              >
                ← Back to Dispute Goals
              </button>
              <button
                onClick={onClose}
                className="py-2 px-5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:brightness-110"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
