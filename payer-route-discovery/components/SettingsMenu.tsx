'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { LANGUAGES, type LanguageCode } from '@/lib/language'

interface Props {
  language: LanguageCode
  onLanguageChange: (lang: LanguageCode) => void
}

export default function SettingsMenu({ language, onLanguageChange }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Settings"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600
          hover:bg-ruma-bg-2 transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="none" className="w-4.5 h-4.5">
          <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="3" r="1.5" fill="currentColor"/>
          <circle cx="10" cy="17" r="1.5" fill="currentColor"/>
          <path d="M10 5v10M6 8h8M6 12h8" stroke="currentColor" strokeWidth="1.2" 
            strokeLinecap="round" opacity="0.5"/>
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border border-ruma-border
          rounded-lg shadow-lg z-50 min-w-48 overflow-hidden">
          
          {/* Language section */}
          <div className="border-b border-ruma-border px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Language
            </p>
            <div className="space-y-1">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => {
                    onLanguageChange(l.code)
                    setOpen(false)
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-[12px] transition-colors
                    ${language === l.code
                      ? 'bg-ruma-blue-light text-ruma-blue font-medium'
                      : 'text-gray-600 hover:bg-ruma-bg-2'
                    }`}
                >
                  {l.label} · {l.full}
                </button>
              ))}
            </div>
          </div>

          {/* Info footer */}
          <div className="px-3 py-2 text-[10px] text-gray-400">
            <p>
              Guide · Click any field to see sources & confidence scoring
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
