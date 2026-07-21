import React from 'react'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
        <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest animate-pulse">
          Syncing Ledger Ledger
        </p>
      </div>
    </div>
  )
}
