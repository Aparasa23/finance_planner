'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Sparkles, MessageSquare, X, ChevronRight } from 'lucide-react'

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [dismissedDot, setDismissedDot] = useState(false)

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[9999] text-xs text-gray-200">
      {/* Floating Chat Bubble Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setDismissedDot(true)
        }}
        className="h-12 w-12 rounded-full bg-emerald-500 text-slate-950 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-emerald-500/25 relative focus:outline-none cursor-pointer"
        title="Consult Assistant"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5 animate-pulse" />}
        
        {/* Notification indicator dot */}
        {!isOpen && !dismissedDot && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-500 border-2 border-slate-950 rounded-full flex items-center justify-center text-[7px] font-bold text-white">
            1
          </span>
        )}
      </button>

      {/* Viewport-fixed Chat Panel popover */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-slate-950 border border-gray-800 rounded-2xl shadow-2xl p-4 space-y-3 backdrop-blur-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-gray-900 pb-2">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-spin-slow" />
              <span className="text-xs font-bold text-gray-100 uppercase tracking-wider">AI Household Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-300">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-gray-300 leading-relaxed">
            &ldquo;Your cash flow is solid. Apple Card is currently at <strong>55% utilization</strong>. The Verizon mobile network payment of $120.00 will be paid via Zelle to your friend on the 20th. You can configure SMS notifications in settings.&rdquo;
          </p>

          <div className="pt-1.5 flex items-center justify-between gap-2">
            <span className="text-[8px] bg-slate-900 border border-gray-850 px-2 py-0.5 rounded text-emerald-400 font-bold uppercase tracking-wider">
              SMS Engine Active
            </span>
            <Link
              href="/assistant"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-emerald-500 text-emerald-950 text-[10px] font-extrabold hover:bg-emerald-400 transition-all"
            >
              <span>Full Chat Interface</span>
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
