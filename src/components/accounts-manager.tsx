'use client'

import React, { useState } from 'react'
import { createManualAccount, createInstallmentPlan } from '@/app/actions/obligation'
import { exchangePlaidPublicToken } from '@/app/actions/plaid'
import { Plus, CreditCard, Landmark, PiggyBank, PlusCircle, Trash2, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react'

interface Account {
  id: string
  name: string
  type: string
  subtype: string | null
  current_balance: number
  mask: string | null
  connection?: {
    provider: string
    status: string
    last_synced_at: string
  } | null
}

interface Connection {
  id: string
  provider: string
  status: string
  last_synced_at: string
}

interface Plan {
  id: string
  name: string
  provider: string
  financed_principal: number
  remaining_principal: number
  regular_payment_amount: number
  payments_completed: number
  total_scheduled_payments: number
  account_id?: string | null
  apr?: number
}

interface AccountsManagerProps {
  initialAccounts: Account[]
  connections: Connection[]
  plans: Plan[]
  isPlaidActive: boolean
}

export function AccountsManager({ initialAccounts, connections, plans, isPlaidActive }: AccountsManagerProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [activeForm, setActiveForm] = useState<'none' | 'manual' | 'plaid' | 'bnpl'>('none')
  const [loading, setLoading] = useState<string | null>(null)
  const [forceSandbox, setForceSandbox] = useState(false)

  // Manual account form states
  const [manualName, setManualName] = useState('')
  const [manualType, setManualType] = useState<'manual_asset' | 'manual_liability'>('manual_asset')
  const [manualSubtype, setManualSubtype] = useState('')
  const [manualBalance, setManualBalance] = useState('')

  // BNPL plan form states
  const [bnplName, setBnplName] = useState('')
  const [bnplProvider, setBnplProvider] = useState('')
  const [bnplAmount, setBnplAmount] = useState('')
  const [bnplRate, setBnplRate] = useState('0') // 0% interest default
  const [bnplTerm, setBnplTerm] = useState('12')
  const [bnplStartDate, setBnplStartDate] = useState(new Date().toISOString().split('T')[0])
  const [bnplAutopay, setBnplAutopay] = useState(true)

  // Group accounts
  const assets = accounts.filter(
    (a) => a.type === 'depository' || a.type === 'manual_asset' || a.type === 'investment'
  )
  const liabilities = accounts.filter(
    (a) => a.type === 'credit' || a.type === 'loan' || a.type === 'manual_liability'
  )

  const openPlaid = (linkToken: string) => {
    const handler = (window as any).Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: any) => {
        const result = await exchangePlaidPublicToken(publicToken)
        setLoading(null)
        if (result && result.success) {
          alert('Financial account connected successfully!')
          window.location.reload()
        } else if (result && 'error' in result) {
          alert(result.error)
        }
      },
      onExit: () => {
        setLoading(null)
      }
    })
    handler.open()
  }

  const handleRealPlaidLink = async () => {
    setLoading('link')
    
    const { getPlaidLinkToken } = await import('@/app/actions/plaid')
    const result = await getPlaidLinkToken()
    
    if (result.error || !result.linkToken) {
      alert(result.error || 'Failed to generate Plaid link token')
      setLoading(null)
      return
    }
    
    const linkToken = result.linkToken

    if (!(window as any).Plaid) {
      const script = document.createElement('script')
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'
      script.onload = () => {
        openPlaid(linkToken)
      }
      document.head.appendChild(script)
    } else {
      openPlaid(linkToken)
    }
  }

  const handleSimulateBankLink = async (bankName: string) => {
    setLoading('link')
    // Exchange a simulated public token. In mock mode, this creates a mock bank item,
    // queries mock accounts, syncs initial transactions, and returns success.
    const result = await exchangePlaidPublicToken(`mock_public_token_for_${bankName.toLowerCase().replace(/ /g, '_')}`)
    setLoading(null)

    if (result && result.success) {
      alert(`Successfully connected ${result.institutionName || bankName}! Refreshing accounts...`)
      window.location.reload()
    } else if (result && 'error' in result) {
      alert(result.error)
    }
  }

  const handleAddManualAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    const balance = parseFloat(manualBalance)

    if (!manualName || isNaN(balance)) {
      alert('Please fill out name and balance correctly.')
      return
    }

    setLoading('manual')
    const result = await createManualAccount({
      name: manualName,
      type: manualType,
      subtype: manualSubtype || manualType.replace('manual_', ''),
      balance,
    })
    setLoading(null)

    if (result && result.accountId) {
      // Optimistic locally updated state
      setAccounts((prev) => [
        ...prev,
        {
          id: result.accountId!,
          name: manualName,
          type: manualType,
          subtype: manualSubtype || 'manual',
          current_balance: balance,
          mask: 'MANL',
          connection: null,
        },
      ])
      setActiveForm('none')
      setManualName('')
      setManualBalance('')
    } else if (result && 'error' in result) {
      alert(result.error)
    }
  }

  const handleAddBNPL = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(bnplAmount)
    const rate = parseFloat(bnplRate)
    const term = parseInt(bnplTerm)

    if (!bnplName || !bnplProvider || isNaN(amount) || amount <= 0 || isNaN(term)) {
      alert('Please fill out loan details correctly.')
      return
    }

    setLoading('bnpl')
    const result = await createInstallmentPlan({
      name: bnplName,
      provider: bnplProvider,
      purchaseAmount: amount,
      interestRate: rate,
      termMonths: term,
      startDate: bnplStartDate,
      autopay: bnplAutopay,
    })
    setLoading(null)

    if (result && result.success) {
      alert('BNPL Installment Plan and linked bill occurrences generated!')
      window.location.reload()
    } else if (result && 'error' in result) {
      alert(result.error)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Panels: Accounts List grouped */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Assets Section */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-gray-100 flex items-center">
            <PiggyBank className="h-4.5 w-4.5 text-emerald-400 mr-2" /> Assets (Cash & Investments)
          </h2>
          <div className="divide-y divide-gray-800/60">
            {assets.length === 0 ? (
              <p className="text-xs text-gray-500 py-3">No cash assets recorded.</p>
            ) : (
              assets.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-xs font-semibold text-gray-200">{acc.name}</p>
                    <p className="text-[10px] text-gray-500 capitalize">
                      {acc.subtype || acc.type} {acc.mask ? `•••• ${acc.mask}` : ''}
                      {acc.connection && (
                        <span className="text-emerald-500/80 ml-2 font-medium">• Linked ({acc.connection.provider})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <p className="text-xs font-bold text-emerald-400">
                      ${Number(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    {!acc.connection && acc.type === 'manual_asset' && (
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this manual asset account?')) return
                          const { deleteManualAccount } = await import('@/app/actions/obligation')
                          setLoading(acc.id)
                          const result = await deleteManualAccount(acc.id)
                          setLoading(null)
                          if (result && result.success) {
                            alert('Account deleted successfully!')
                            window.location.reload()
                          } else if (result && 'error' in result) {
                            alert(result.error)
                          }
                        }}
                        disabled={loading === acc.id}
                        className="p-1 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete Account"
                      >
                        {loading === acc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Liabilities Section */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-gray-100 flex items-center">
            <CreditCard className="h-4.5 w-4.5 text-emerald-400 mr-2" /> Liabilities (Cards & Loans)
          </h2>
          <div className="divide-y divide-gray-800/60">
            {liabilities.length === 0 ? (
              <p className="text-xs text-gray-500 py-3">No liabilities or debt accounts connected.</p>
            ) : (
              liabilities.map((acc) => {
                const linkedPlan = plans.find((p) => p.account_id === acc.id)
                return (
                  <div key={acc.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-xs font-semibold text-gray-200">{acc.name}</p>
                      <p className="text-[10px] text-gray-500 capitalize">
                        {linkedPlan ? (
                          <span>
                            {linkedPlan.provider} • Paid {linkedPlan.payments_completed}/{linkedPlan.total_scheduled_payments} mos • {Number(linkedPlan.apr).toFixed(2)}% APR
                          </span>
                        ) : (
                          <span>
                            {acc.subtype || acc.type} {acc.mask ? `•••• ${acc.mask}` : ''}
                            {acc.connection && (
                              <span className="text-emerald-500/80 ml-2 font-medium">• Linked ({acc.connection.provider})</span>
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-xs font-bold text-rose-400">
                          -${Number(acc.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        {linkedPlan && (
                          <p className="text-[9px] text-gray-500">
                            Payoff: ${Number(linkedPlan.regular_payment_amount).toFixed(2)}/mo
                          </p>
                        )}
                      </div>
                      
                      {/* Delete buttons for manual ledgers */}
                      {linkedPlan ? (
                        <button
                          onClick={async () => {
                            if (!confirm('Are you sure you want to delete this loan ledger? This will delete the account and all its amortization payments.')) return
                            const { deleteInstallmentPlan } = await import('@/app/actions/obligation')
                            setLoading(linkedPlan.id)
                            const result = await deleteInstallmentPlan(linkedPlan.id)
                            setLoading(null)
                            if (result && result.success) {
                              alert('Loan deleted successfully!')
                              window.location.reload()
                            } else if (result && 'error' in result) {
                              alert(result.error)
                            }
                          }}
                          disabled={loading === linkedPlan.id}
                          className="p-1 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Loan"
                        >
                          {loading === linkedPlan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      ) : (acc.type === 'manual_liability' || acc.type === 'loan') && !acc.connection ? (
                        <button
                          onClick={async () => {
                            if (!confirm('Are you sure you want to delete this manual liability account?')) return
                            const { deleteManualAccount } = await import('@/app/actions/obligation')
                            setLoading(acc.id)
                            const result = await deleteManualAccount(acc.id)
                            setLoading(null)
                            if (result && result.success) {
                              alert('Account deleted successfully!')
                              window.location.reload()
                            } else if (result && 'error' in result) {
                              alert(result.error)
                            }
                          }}
                          disabled={loading === acc.id}
                          className="p-1 text-rose-500/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Account"
                        >
                          {loading === acc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Dynamic Form Action Panels */}
      <div className="space-y-4">
        
        {/* Connection Action Panels triggers */}
        <div className="glass-panel p-5 rounded-2xl space-y-3.5">
          <h2 className="text-sm font-bold text-gray-100">Integrate Accounts</h2>
          
          <div className="grid grid-cols-1 gap-2.5">
            <button
              onClick={() => setActiveForm('plaid')}
              className="w-full text-xs font-bold py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center space-x-1"
            >
              <LinkIcon className="h-4 w-4" />
              <span>Link Bank Account</span>
            </button>
            
            <button
              onClick={() => setActiveForm('manual')}
              className="w-full text-xs font-bold py-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800/50 text-gray-200 flex items-center justify-center space-x-1"
            >
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              <span>Add Manual Ledger</span>
            </button>

            <button
              onClick={() => setActiveForm('bnpl')}
              className="w-full text-xs font-bold py-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800/50 text-gray-200 flex items-center justify-center space-x-1 cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              <span>Add Loan / Mortgage Ledger</span>
            </button>
          </div>
        </div>

        {/* Active Connections List */}
        <div className="glass-panel p-5 rounded-2xl space-y-3.5 bg-slate-950/10">
          <h2 className="text-sm font-bold text-gray-100 flex items-center">
            <LinkIcon className="h-4.5 w-4.5 text-emerald-400 mr-2" /> Active Integrations
          </h2>
          {connections.length === 0 ? (
            <p className="text-xs text-gray-500">No active bank connections. Link an account to start syncing.</p>
          ) : (
            <div className="space-y-2.5">
              {connections.map((c) => (
                <div key={c.id} className="p-3 bg-gray-950/20 border border-gray-900 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                        {c.provider === 'plaid' ? 'Plaid API Link' : 'Mock Connection'}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Status: <span className="text-emerald-400 font-bold uppercase">{c.status}</span>
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm('Are you sure you want to disconnect this connection? This will wipe all its synced accounts and transactions.')) return
                        const { deleteConnection } = await import('@/app/actions/plaid')
                        setLoading(c.id)
                        const result = await deleteConnection(c.id)
                        setLoading(null)
                        if (result && result.success) {
                          alert('Disconnected successfully!')
                          window.location.reload()
                        } else if (result && 'error' in result) {
                          alert(result.error)
                        }
                      }}
                      disabled={loading === c.id}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-colors cursor-pointer"
                      title="Disconnect Link"
                    >
                      {loading === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-900 pt-2 text-[10px]">
                    <span className="text-gray-500">
                      Synced: {c.last_synced_at ? new Date(c.last_synced_at).toLocaleTimeString() : 'Never'}
                    </span>
                    <button
                      onClick={async () => {
                        setLoading(`sync_${c.id}`)
                        const { syncConnectionData } = await import('@/app/actions/plaid')
                        const result = await syncConnectionData(c.id)
                        setLoading(null)
                        if (result && result.success) {
                          alert('Sync complete! Refreshing database values...')
                          window.location.reload()
                        } else if (result && 'error' in result) {
                          alert(result.error)
                        }
                      }}
                      disabled={loading === `sync_${c.id}`}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-extrabold uppercase tracking-wider cursor-pointer"
                    >
                      {loading === `sync_${c.id}` ? 'Syncing...' : 'Sync Now 🔄'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form: Plaid Link or Sandbox simulation connection */}
        {activeForm === 'plaid' && (
          <div className="glass-panel p-5 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-gray-900 pb-2">
              <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
                {isPlaidActive && !forceSandbox ? 'Connect Real Institution' : 'Select Sandbox Bank'}
              </h3>
              <button
                onClick={() => {
                  setActiveForm('none')
                  setForceSandbox(false)
                }}
                className="text-xs text-gray-500 hover:text-gray-400"
              >
                Cancel
              </button>
            </div>
            
            {loading === 'link' ? (
              <div className="py-6 flex flex-col items-center justify-center text-xs text-gray-500 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                <span>Initializing secure Plaid link...</span>
              </div>
            ) : isPlaidActive && !forceSandbox ? (
              <div className="space-y-4 text-xs">
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  Plaid credentials detected in your local environment. Click the button below to launch Plaid’s secure authentication window and authorize your bank account connection.
                </p>
                <button
                  onClick={handleRealPlaidLink}
                  className="w-full text-xs font-bold py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center space-x-2 shadow-lg hover:scale-[1.01] transition-transform cursor-pointer"
                >
                  <LinkIcon className="h-4.5 w-4.5" />
                  <span>Launch Plaid Link</span>
                </button>
                <button
                  onClick={() => setForceSandbox(true)}
                  className="w-full text-[10px] text-gray-500 hover:text-emerald-400 font-bold uppercase tracking-wider text-center py-1 transition-colors block cursor-pointer"
                >
                  Or simulate sandbox bank instead
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {!isPlaidActive && (
                  <p className="text-[10px] text-yellow-500/80 bg-yellow-500/5 border border-yellow-500/10 p-2.5 rounded-xl flex items-start space-x-1.5 leading-relaxed">
                    <AlertCircle className="h-4 w-4 shrink-0 text-yellow-550 mr-1 mt-0.5" />
                    <span>
                      Plaid credentials missing in `.env.local`. Running in simulator sandbox mode. Connect one of the mock banking channels below to generate dummy ledger streams.
                    </span>
                  </p>
                )}
                <div className="space-y-2">
                  {['Chase Bank', 'Bank of America', 'American Express'].map((bank) => (
                    <button
                      key={bank}
                      onClick={() => handleSimulateBankLink(bank)}
                      className="w-full text-left p-3 bg-gray-950/20 hover:bg-gray-900/30 border border-gray-800/50 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>{bank}</span>
                      <Landmark className="h-4 w-4 text-emerald-400" />
                    </button>
                  ))}
                </div>
                {isPlaidActive && (
                  <button
                    onClick={() => setForceSandbox(false)}
                    className="w-full text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider text-center py-1 transition-colors block cursor-pointer"
                  >
                    Back to Real Link Connection
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form: Manual Account Ledger */}
        {activeForm === 'manual' && (
          <div className="glass-panel p-5 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Manual Ledger</h3>
              <button onClick={() => setActiveForm('none')} className="text-xs text-gray-500 hover:text-gray-400">Cancel</button>
            </div>

            <form onSubmit={handleAddManualAccount} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Home Cash Envelope"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Type</label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as any)}
                    className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500"
                  >
                    <option value="manual_asset">Asset (Cash/Value)</option>
                    <option value="manual_liability">Liability (Debt)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Subtype</label>
                  <input
                    type="text"
                    placeholder="e.g. Cash, Loan, Land"
                    value={manualSubtype}
                    onChange={(e) => setManualSubtype(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Current Balance ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  required
                  value={manualBalance}
                  onChange={(e) => setManualBalance(e.target.value)}
                  className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading === 'manual'}
                className="w-full text-xs py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center"
              >
                {loading === 'manual' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Account'}
              </button>
            </form>
          </div>
        )}

        {/* Form: Link BNPL/Affirm Loan */}
        {activeForm === 'bnpl' && (
          <div className="glass-panel p-5 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">Add Loan / Mortgage Ledger</h3>
              <button onClick={() => setActiveForm('none')} className="text-xs text-gray-500 hover:text-gray-400">Cancel</button>
            </div>

            <form onSubmit={handleAddBNPL} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Loan Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Valon Mortgage, TD Auto Car Loan"
                    required
                    value={bnplName}
                    onChange={(e) => setBnplName(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Lender / Provider</label>
                  <input
                    type="text"
                    placeholder="e.g. Valon, TD Auto Finance, Affirm"
                    required
                    value={bnplProvider}
                    onChange={(e) => setBnplProvider(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Financed Principal ($)</label>
                  <input
                    type="number"
                    placeholder="e.g. 324500"
                    required
                    value={bnplAmount}
                    onChange={(e) => setBnplAmount(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Interest Rate (APR %)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5.5 for 5.5%"
                    value={bnplRate}
                    onChange={(e) => setBnplRate(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Term (Months)</label>
                  <input
                    type="number"
                    placeholder="e.g. 360 for 30yr mortgage, 12 for BNPL"
                    required
                    value={bnplTerm}
                    onChange={(e) => setBnplTerm(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    required
                    value={bnplStartDate}
                    onChange={(e) => setBnplStartDate(e.target.value)}
                    className="bg-slate-900 border border-gray-800/80 rounded-xl px-3 py-2 text-xs text-gray-200 w-full focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <input
                  type="checkbox"
                  id="bnplAutopay"
                  checked={bnplAutopay}
                  onChange={(e) => setBnplAutopay(e.target.checked)}
                  className="rounded border-gray-850 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <label htmlFor="bnplAutopay" className="text-[10px] text-gray-400 font-semibold select-none">
                  Enable AutoPay reminders
                </label>
              </div>

              <button
                type="submit"
                disabled={loading === 'bnpl'}
                className="w-full text-xs py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all flex items-center justify-center cursor-pointer"
              >
                {loading === 'bnpl' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Loan'}
              </button>
            </form>
          </div>
        )}

      </div>

    </div>
  )
}
