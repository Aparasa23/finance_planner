'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login } from '@/app/actions/auth'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await login(formData)
      if (result && 'error' in result) {
        setError(result.error)
      } else {
        router.push('/')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030712] px-4 py-12 sm:px-6 lg:px-8 text-gray-100">
      <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-3xl border border-gray-800 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <span className="text-base font-bold text-emerald-950">C</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Welcome to Canvora
            </h2>
            <p className="text-xs text-gray-400 mt-1">Private household ledger authentication</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs animate-shake">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-400 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-gray-400 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center py-2.5 px-4 bg-emerald-500 text-emerald-950 font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="h-4.5 w-4.5 mr-2" />
            )}
            Sign In
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-all">
              Create Household
            </Link>
          </p>
        </div>

        <div className="text-center pt-4 border-t border-gray-800/40">
          <p className="text-[10px] text-gray-600 font-medium tracking-wide">
            © {new Date().getFullYear()} Canvora Personal Finance™. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
