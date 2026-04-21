'use client'

import { useState, useRef, useEffect } from 'react'

/** Strip common markdown artifacts so responses look clean in the chat bubble. */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/\*(.+?)\*/g,   '$1')     // *italic*
    .replace(/__(.+?)__/g,   '$1')     // __bold__
    .replace(/_(.+?)_/g,     '$1')     // _italic_
    .replace(/^#{1,6}\s+/gm, '')       // # headings
    .replace(/`(.+?)`/g,     '$1')     // `code`
    .replace(/^\s*[-*]\s+/gm, '• ')   // bullet - → •
    .trim()
}

interface Message {
  role:    'user' | 'assistant'
  content: string
}

interface Props {
  payerKey?:  string | null
  drugName?:  string | null
  payerName?: string | null
}

const QUICK_PROMPTS = (payerName: string) => [
  `Why was the ${payerName} PA denied and what do I fix?`,
  `How do I appeal a ${payerName} denial?`,
  `What's the risk level for ${payerName}?`,
  'What submission methods are available?',
]

export default function Chatbot({ payerKey, drugName, payerName }: Props) {
  const [isOpen,   setIsOpen]   = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const scrollRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset conversation when payer changes
  useEffect(() => {
    setMessages([])
  }, [payerKey])

  const sendMessage = async (text?: string) => {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    setInput('')
    const updated: Message[] = [...messages, { role: 'user', content: userText }]
    setMessages(updated)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ messages: updated, payerKey, drugName }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || `Server error ${res.status}`)
      }
      const { text: reply } = await res.json()
      setMessages([...updated, { role: 'assistant', content: reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setMessages([...updated, {
        role:    'assistant',
        content: `⚠ ${msg}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* ── Floating chat button ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-ruma-blue shadow-lg
          flex items-center justify-center text-white hover:bg-ruma-blue-light
          transition-colors z-40 border-2 border-white"
        title="PA Assistant"
        aria-label="Open PA Assistant chat"
      >
        {isOpen ? (
          /* ✕ close icon */
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          /* chat bubble icon */
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* ── Chat panel ───────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 sm:w-96 bg-white rounded-xl shadow-2xl
          border border-ruma-border flex flex-col z-40 overflow-hidden"
          style={{ height: 'min(520px, calc(100vh - 120px))' }}>

          {/* Header */}
          <div className="px-4 py-3 bg-ruma-blue text-white flex items-center justify-between shrink-0">
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight">PA Assistant</p>
              {payerName && (
                <p className="text-[11px] text-blue-200 truncate">
                  {payerName}{drugName ? ` · ${drugName}` : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-blue-300 hover:text-white text-[10px] font-medium transition-colors"
                  title="Clear conversation"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-blue-200 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.length === 0 ? (
              /* Empty state with quick prompts */
              <div className="h-full flex flex-col items-center justify-center gap-3 py-4">
                <div className="w-10 h-10 rounded-full bg-ruma-cyan-light flex items-center justify-center">
                  <svg className="w-5 h-5 text-ruma-cyan-dark" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-[12px] text-gray-500 text-center px-2">
                  Ask me about PA routing, risk assessments, or how to compare payers.
                </p>
                {payerName && (
                  <div className="w-full flex flex-col gap-1.5 mt-1">
                    {QUICK_PROMPTS(payerName).map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="w-full text-left px-3 py-2 text-[11px] rounded-lg bg-ruma-bg
                          border border-ruma-border text-gray-600 hover:bg-ruma-bg-2 hover:text-gray-900
                          transition-colors leading-snug"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] px-3 py-2 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap
                      ${msg.role === 'user'
                        ? 'bg-ruma-blue text-white rounded-br-sm'
                        : 'bg-ruma-bg text-gray-800 rounded-bl-sm border border-ruma-border'
                      }`}
                  >
                    {msg.role === 'assistant' ? stripMarkdown(msg.content) : msg.content}
                  </div>
                </div>
              ))
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2.5 rounded-xl rounded-bl-sm bg-ruma-bg border border-ruma-border">
                  <div className="flex gap-1 items-center">
                    {[0, 150, 300].map(delay => (
                      <span
                        key={delay}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-ruma-border shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about PA routing… (Enter to send)"
                rows={2}
                className="flex-1 px-3 py-2 text-[12px] border border-ruma-border rounded-lg
                  resize-none focus:outline-none focus:ring-2 focus:ring-ruma-blue/30
                  focus:border-transparent leading-snug"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="px-3 py-2 bg-ruma-blue text-white rounded-lg hover:bg-ruma-blue-light
                  disabled:opacity-40 transition-colors shrink-0 self-stretch flex items-center"
                aria-label="Send message"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M14 2L2 7l5 3.5L11 14l3-12z" stroke="currentColor" strokeWidth="1.4"
                    strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p className="text-[9px] text-gray-400 mt-1.5 text-center">
              Shift+Enter for new line · responses powered by Claude
            </p>
          </div>
        </div>
      )}
    </>
  )
}
