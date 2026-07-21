import React from 'react'
import { WifiOff, RotateCcw } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#030712] text-gray-100 px-4 text-center">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-gray-800 space-y-6">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
          <WifiOff className="h-6 w-6" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Connection Lost
          </h1>
          <p className="text-sm text-gray-400">
            Canopy is currently offline. Some features require an active internet connection to contact financial institutions and secure server endpoints.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center space-x-2 w-full py-2.5 px-4 bg-emerald-500 text-emerald-950 font-bold rounded-xl text-sm shadow-md shadow-emerald-500/10 hover:bg-emerald-400 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retry Connection</span>
          </Link>
        </div>

        <p className="text-[10px] text-gray-500">
          Your local session state will automatically re-verify once the signal returns.
        </p>
      </div>
    </div>
  )
}
