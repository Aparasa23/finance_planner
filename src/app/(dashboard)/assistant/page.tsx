'use client'

import React, { useState, useRef, useEffect } from 'react'
import { askFinancialAssistant } from '@/app/actions/assistant'
import { Sparkles, Send, Loader2, User, Bot, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Message {
  sender: 'user' | 'assistant'
  text: string
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello! I am your **Canopy Assistant**. I can help you summarize accounts, review upcoming bills, track savings targets, or run spending analytics for your household. What would you like to explore today?",
    },
  ])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [geminiHistory, setGeminiHistory] = useState<any[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const prompt = inputText.trim()
    if (!prompt || loading) return

    // 1. Add user message to display list
    setMessages((prev) => [...prev, { sender: 'user', text: prompt }])
    setInputText('')
    setLoading(true)

    try {
      // 2. Call Server Action
      const result = await askFinancialAssistant(prompt, geminiHistory)

      if (result && result.success) {
        setMessages((prev) => [...prev, { sender: 'assistant', text: result.answer }])
        setGeminiHistory(result.history || [])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: `⚠️ Error: ${result?.error || 'Failed to generate response'}`,
          },
        ])
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'assistant', text: '⚠️ Error: Unexpected connection failure.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Simple custom Markdown formatter helper (handles bold, bullets, links)
  const formatMarkdown = (text: string) => {
    return text.split('\n').map((line, lineIdx) => {
      let content = line

      // 1. Bullet list items
      const isBullet = content.trim().startsWith('* ')
      if (isBullet) {
        content = content.trim().substring(2)
      }

      // Parse bold tags **text**
      const boldParts = content.split('**')
      const formattedParts = boldParts.map((part, partIdx) => {
        if (partIdx % 2 === 1) {
          return <strong key={partIdx} className="text-emerald-400 font-bold">{part}</strong>
        }

        // Parse citation links e.g. [Checking Account](/dashboard)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
        const segments: React.ReactNode[] = []
        let lastIndex = 0
        let match

        while ((match = linkRegex.exec(part)) !== null) {
          const before = part.substring(lastIndex, match.index)
          if (before) segments.push(before)

          const linkText = match[1]
          const linkHref = match[2]
          segments.push(
            <Link
              key={match.index}
              href={linkHref}
              className="text-emerald-400 font-bold underline hover:text-emerald-300 decoration-emerald-500/40"
            >
              {linkText}
            </Link>
          )

          lastIndex = linkRegex.lastIndex
        }

        const remaining = part.substring(lastIndex)
        if (remaining) segments.push(remaining)

        return <span key={partIdx}>{segments}</span>
      })

      if (isBullet) {
        return (
          <li key={lineIdx} className="ml-4 list-disc text-xs text-gray-300 leading-relaxed py-0.5">
            {formattedParts}
          </li>
        )
      }

      if (content.trim() === '') {
        return <div key={lineIdx} className="h-2" />
      }

      return (
        <p key={lineIdx} className="text-xs text-gray-300 leading-relaxed py-0.5">
          {formattedParts}
        </p>
      )
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-100 flex items-center">
            <Sparkles className="h-5 w-5 mr-1.5 text-emerald-400 animate-pulse" /> Financial Assistant
          </h1>
          <p className="text-xs text-gray-400">Natural language support for bills, goals, and analytics.</p>
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className="flex-1 glass-panel rounded-2xl p-5 overflow-y-auto space-y-4 flex flex-col min-h-0 border border-gray-800/40">
        <div className="flex-1 space-y-4 min-h-0">
          {messages.map((msg, idx) => {
            const isBot = msg.sender === 'assistant'
            return (
              <div
                key={idx}
                className={`flex space-x-3.5 max-w-[85%] ${
                  isBot ? 'self-start' : 'self-end flex-row-reverse space-x-reverse ml-auto'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 border ${
                    isBot
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-gray-800 border-gray-700 text-gray-300'
                  }`}
                >
                  {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                    isBot
                      ? 'bg-gray-950/30 border border-gray-800/40 rounded-tl-sm'
                      : 'bg-emerald-500 text-slate-950 rounded-tr-sm font-semibold'
                  }`}
                >
                  {isBot ? (
                    <div className="space-y-1">{formatMarkdown(msg.text)}</div>
                  ) : (
                    <p className="leading-relaxed">{msg.text}</p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Typing Loading Indicator bubble */}
          {loading && (
            <div className="flex space-x-3.5 max-w-[80%] self-start animate-pulse">
              <div className="h-7 w-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-3 bg-gray-950/30 border border-gray-800/40 rounded-2xl rounded-tl-sm text-xs flex items-center space-x-1.5 text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span>Assistant is querying database...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input footer */}
      <form onSubmit={handleSend} className="flex space-x-3 shrink-0">
        <input
          type="text"
          disabled={loading}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask me: 'What bills do I have due this week?' or 'How is my savings goal progressing?'"
          className="flex-1 bg-slate-950 border border-gray-800/80 rounded-2xl px-4 py-3 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="p-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-2xl font-bold transition-all flex items-center justify-center shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
