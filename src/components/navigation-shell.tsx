'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CreditCard,
  Calendar,
  Sparkles,
  Settings,
  Bell,
  LogOut,
  User,
  Loader2
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { FloatingAssistant } from './floating-assistant'

interface NavigationShellProps {
  children: React.ReactNode
  userEmail?: string | null
  userName?: string | null
}

export function NavigationShell({ children, userEmail, userName }: NavigationShellProps) {
  const pathname = usePathname()
  const [isPending, startTransition] = React.useTransition()

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Accounts', href: '/accounts', icon: CreditCard },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Assistant', href: '/assistant', icon: Sparkles },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut()
    })
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen flex-col md:flex-row bg-[#030712] text-gray-100 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col glass-panel border-r border-gray-800 p-4 shrink-0 justify-between">
        <div className="flex flex-col space-y-6">
          {/* Logo / Title */}
          <div className="flex items-center space-x-2 px-2 py-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-sm font-bold text-emerald-950">C</span>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Canvora
              </h1>
              <span className="text-[10px] text-emerald-400 font-medium tracking-wide">PRIVATE HOUSEHOLD</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border border-transparent'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-emerald-400' : 'text-gray-400 group-hover:text-gray-300'}`} />
                  <span>{item.name}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User profile / Logout */}
        <div className="space-y-4 pt-4 border-t border-gray-800/80">
          <div className="flex items-center space-x-3 px-2">
            <div className="h-9 w-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-emerald-400">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-gray-200 truncate">{userName || 'Member'}</p>
              <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="flex w-full items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-400" />
            ) : (
              <LogOut className="h-4 w-4 text-red-400" />
            )}
            <span>Sign Out</span>
          </button>

          <div className="pt-2 text-center text-[9px] text-gray-600 tracking-wide border-t border-gray-800/40">
            © {new Date().getFullYear()} Canvora Personal Finance™
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        {/* Top Header (Mobile & Desktop) */}
        <header className="flex h-14 items-center justify-between px-4 glass-panel border-b border-gray-800/60 z-10 shrink-0">
          <div className="flex items-center md:hidden space-x-2">
            <div className="h-7 w-7 rounded bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md">
              <span className="text-[10px] font-bold text-emerald-950">C</span>
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Canvora
            </span>
          </div>

          {/* Quick Stats or Header Info */}
          <div className="hidden md:flex items-center text-xs text-gray-400 space-x-4">
            <div>
              Status: <span className="text-emerald-400 font-semibold">Synced</span>
            </div>
            <div className="h-3 w-px bg-gray-800" />
            <div>
              OS Mode: <span className="text-gray-300">Intelligent Heuristics</span>
            </div>
          </div>

          {/* Quick Actions (Notifications trigger) */}
          <div className="flex items-center space-x-2">
            <Link
              href="/settings"
              className="relative p-2 rounded-full hover:bg-gray-800/80 text-gray-300 hover:text-gray-100 transition-all border border-transparent hover:border-gray-800"
            >
              <Bell className="h-5 w-5" />
              {/* Notification Badge indicator */}
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/60" />
            </Link>
          </div>
        </header>

        {/* Dynamic page contents */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 md:pb-8">
          <div className="mx-auto max-w-5xl space-y-6 fade-in-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 glass-nav flex items-center justify-around px-2 z-30 md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                active ? 'text-emerald-400' : 'text-gray-500'
              }`}
            >
              <Icon className={`h-5.5 w-5.5 ${active ? 'stroke-[2.2px] text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'text-gray-500'}`} />
              <span className="text-[9px] mt-1 font-medium tracking-wide leading-none">{item.name}</span>
            </Link>
          )
        })}
      </nav>
      {/* Viewport-fixed floating assistant widget */}
      <FloatingAssistant />
    </div>
  )
}
