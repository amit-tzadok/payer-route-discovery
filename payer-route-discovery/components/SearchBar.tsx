'use client'

import { useState, useMemo } from 'react'
import { useT } from '@/lib/i18n'

interface SearchItem {
  type: 'payer' | 'drug'
  id: string
  label: string
  payerKey?: string
}

interface Props {
  payers: string[]
  drugs: string[]
  getPayerDisplayName: (key: string) => string
  onPayerSelect: (payer: string) => void
  onDrugSelect: (drug: string) => void
}

// Fuzzy match scoring
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  
  if (t === q) return 1000
  if (t.startsWith(q)) return 500
  if (t.includes(q)) return 100
  
  let score = 0
  let qIndex = 0
  for (let i = 0; i < t.length && qIndex < q.length; i++) {
    if (t[i] === q[qIndex]) {
      score += i === 0 ? 2 : 1
      qIndex++
    }
  }
  return qIndex === q.length ? score : -1
}

export default function SearchBar({
  payers, drugs, getPayerDisplayName, onPayerSelect, onDrugSelect,
}: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const results = useMemo<SearchItem[]>(() => {
    if (!query.trim()) return []

    const items: SearchItem[] = [
      ...payers.map(p => ({
        type: 'payer' as const,
        id: p,
        label: getPayerDisplayName(p),
        payerKey: p,
      })),
      ...drugs.map(d => ({
        type: 'drug' as const,
        id: d,
        label: d,
      })),
    ]

    return items
      .map(item => ({
        ...item,
        score: fuzzyScore(query, item.label),
      }))
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [query, payers, drugs, getPayerDisplayName])

  const handleSelect = (item: SearchItem) => {
    if (item.type === 'payer') {
      onPayerSelect(item.id)
    } else {
      onDrugSelect(item.id)
    }
    setQuery('')
    setFocused(false)
  }

  return (
    <div className="relative">
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
          viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <input
          id="payer-search"
          type="text"
          placeholder={t.searchPlaceholder || 'Search payers or drugs...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-ruma-border bg-white
            text-[12px] text-gray-900 placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-ruma-blue/30 focus:border-transparent
            transition-colors"
        />
      </div>

      {/* Results dropdown */}
      {focused && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-ruma-border
          rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map(item => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-ruma-bg-2 transition-colors
                flex items-center gap-2 text-[12px]"
            >
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0
                ${item.type === 'payer'
                  ? 'bg-ruma-cyan-light text-ruma-cyan-dark'
                  : 'bg-ruma-green-bg text-ruma-green-dark'
                }`}>
                {item.type === 'payer' ? 'Payer' : 'Drug'}
              </span>
              <span className="text-gray-900 truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
