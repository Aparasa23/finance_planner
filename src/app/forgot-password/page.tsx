'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { directResetPassword } from '@/app/actions/auth'
import { KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await directResetPassword(formData)
      if (result && 'error' in result && result.error) {
        setError(result.error)
      } else if (result && 'success' in result && result.success) {
        setSuccess(result.message || 'Password updated successfully!')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
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
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <KeyRound className="h-6 w-6 text-emerald-950" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Reset Your Password
            </h2>
            <p className="text-xs text-gray-400 mt-1">Enter your account email and choose a new password</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs animate-shake">
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-gray-400 mb-1">
              Account Email Address
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
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
              placeholder="At least 6 characters"
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
              <KeyRound className="h-4.5 w-4.5 mr-2" />
            )}
            Update Password & Sign In
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center text-xs font-semibold text-gray-400 hover:text-gray-200 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
