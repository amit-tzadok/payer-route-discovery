'use client'

import { useState, useEffect } from 'react'

interface Shortcut {
  keys: string
  description: string
}

const SHORTCUTS: Shortcut[] = [
  { keys: 'Cmd+/', description: 'Toggle this help menu' },
  { keys: 'Cmd+Shift+M', description: 'Toggle comparison mode' },
  { keys: 'Cmd+K', description: 'Focus search' },
]

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'Slash') {
        e.preventDefault()
        setIsOpen(o => !o)
      }
      if (isOpen && e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  return (
    <>
      {/* Help button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 rounded-full bg-ruma-blue text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 z-40"
        title="Keyboard shortcuts"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M8 5v3M8 11h0.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="border-b border-ruma-border px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg viewBox="0 0 12 12" fill="none" className="w-4 h-4 text-gray-500">
                  <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="px-6 py-4 space-y-3">
              {SHORTCUTS.map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[13px] text-gray-700">
                    {shortcut.description}
                  </span>
                  <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-[11px] font-mono font-semibold text-gray-700">
                    {shortcut.keys}
                  </kbd>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-ruma-border px-6 py-3 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-ruma-blue text-white text-[13px] font-semibold rounded-lg hover:bg-ruma-blue-light transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
