'use client'

import React, { useState, useEffect } from 'react'
import { relativeDate } from '@/lib/reconciler'
import { useT, formatFieldValueT } from '@/lib/i18n'
import { useLanguage } from '@/lib/language-context'
import type { ReconciledField } from '@/lib/types'
import SourceTypeBadge from './SourceTypeBadge'

// ── Module-level reasoning cache ───────────────────────────────────────────────
// Key: `${payerName}::${drugName ?? '_route'}::${fieldKey}::${language}`
const reasoningCache = new Map<string, string>()

/** Split text on **bold** markers and return inline JSX with <strong> for bold spans. */
function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

interface Props {
  field:           ReconciledField
  fieldKey:        string
  payerName:       string
  drugName?:       string
  override:        { value: string; reason: string } | null
  onOverrideClick: () => void
  onClearOverride: () => void
}

// ── AI reasoning hook ──────────────────────────────────────────────────────────
function useAIReasoning(
  field: ReconciledField,
  fieldKey: string,
  fieldLabel: string,
  payerName: string,
  drugName: string | undefined,
  language: string,
) {
  const cacheKey = `${payerName}::${drugName ?? '_route'}::${fieldKey}::${language}`
  const cached   = reasoningCache.get(cacheKey)

  const [text,    setText]    = useState(cached ?? '')
  const [loading, setLoading] = useState(!cached)
  const [usedAI,  setUsedAI]  = useState(!!cached)

  useEffect(() => {
    // Cache hit — update state immediately (handles language switches back to a cached value)
    const hit = reasoningCache.get(cacheKey)
    if (hit !== undefined) {
      setText(hit)
      setLoading(false)
      setUsedAI(true)
      return
    }

    let cancelled = false
    setText('')
    setLoading(true)
    setUsedAI(false)

    async function stream() {
      try {
        const res = await fetch('/api/reasoning', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fieldLabel,
            fieldKey,
            payerName,
            language,
            status:   field.status,
            evidence: field.evidence.map(e => ({
              source_type:  e.source_type,
              source_date:  e.source_date,
              source_name:  e.source_name,
              value:        e.value,
              isDeprecated: e.isDeprecated,
            })),
          }),
        })

        if (!res.ok || !res.body) throw new Error('no response')

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let   full    = ''
        let   got     = false

        while (!cancelled) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          if (chunk) {
            if (!got) { got = true; setUsedAI(true) }
            full += chunk
            setText(prev => prev + chunk)
          }
        }

        if (!cancelled && full) reasoningCache.set(cacheKey, full)

      } catch {
        if (!cancelled) setText(field.reasoning)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    stream()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey])

  return { text, loading, usedAI }
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ConflictDrawer({
  field, fieldKey, payerName, drugName, override, onOverrideClick, onClearOverride,
}: Props) {
  const t          = useT()
  const language   = useLanguage()
  const fieldLabel = t.fields[fieldKey] ?? fieldKey.replace(/_/g, ' ')
  const { text, loading, usedAI } = useAIReasoning(field, fieldKey, fieldLabel, payerName, drugName, language)

  return (
    <div className="mx-1 mb-1 rounded-xl border border-ruma-border-2 bg-white overflow-hidden shadow-sm">

      {/* Reasoning banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-ruma-bg border-b border-ruma-border min-h-[44px]">
        {usedAI ? (
          <svg className="w-3.5 h-3.5 text-ruma-blue mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none">
            <path d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5L8 2z"
              stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
        )}

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center gap-1.5 h-4">
              <span className="text-[11px] text-gray-400">{t.analyzingSources}</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-gray-300 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          ) : (
            <p className="text-[12px] text-gray-700 leading-relaxed">{renderBold(text)}</p>
          )}
        </div>

        {usedAI && !loading && (
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest
            text-white bg-ruma-blue px-1.5 py-0.5 rounded">
            AI
          </span>
        )}
      </div>

      {/* Evidence table */}
      <div className="divide-y divide-ruma-border">
        {field.evidence.map(ev => {
          const isBest =
            !ev.isDeprecated &&
            JSON.stringify(ev.value) === JSON.stringify(field.bestValue)

          return (
            <div
              key={ev.source_id}
              className={`grid items-center gap-3 px-4 py-2.5 text-[12px]
                ${isBest ? 'bg-white' : 'bg-ruma-bg/40'}
                ${ev.isDeprecated ? 'opacity-40' : ''}
              `}
              style={{ gridTemplateColumns: 'auto 1fr auto auto auto' }}
            >
              <SourceTypeBadge type={ev.source_type} short />

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-gray-500 truncate">{ev.source_name}</p>
                  {/* Language badge — shown when source is not in English */}
                  {ev.source_language && ev.source_language !== 'en' && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider
                      px-1 py-0.5 rounded bg-ruma-orange-bg text-ruma-orange-dark">
                      {ev.source_language.toUpperCase()}
                    </span>
                  )}
                </div>
                {ev.isDeprecated && ev.deprecationNote && (
                  <p className="text-[10px] text-ruma-red mt-0.5">{ev.deprecationNote}</p>
                )}
              </div>

              <span className="text-gray-400 whitespace-nowrap tabular-nums">
                {relativeDate(ev.source_date)}
              </span>

              <span className={`font-mono whitespace-nowrap
                ${ev.isDeprecated ? 'line-through text-gray-400'
                  : isBest ? 'text-gray-900 font-semibold' : 'text-gray-600'}
              `}>
                {formatFieldValueT(fieldKey, ev.value, t)}
              </span>

              {isBest ? (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-ruma-green-bg shrink-0">
                  <svg className="w-3 h-3 text-ruma-green-dark" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.4"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              ) : (
                <span className="w-5 h-5 shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-ruma-bg border-t border-ruma-border">
        <span className="text-[11px] text-gray-400">
          {override ? (
            <span className="text-ruma-orange font-medium">
              {t.overriddenText(override.reason)}
            </span>
          ) : (
            t.sourcesAgree(field.agreementCount, field.totalSources)
          )}
        </span>

        {override ? (
          <button
            onClick={onClearOverride}
            className="text-[11px] text-gray-400 font-medium hover:text-gray-600 transition-colors"
          >
            {t.clearOverride}
          </button>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onOverrideClick() }}
            className="text-[11px] text-ruma-blue font-medium hover:text-ruma-blue-dark transition-colors"
          >
            {t.overrideValue}
          </button>
        )}
      </div>
    </div>
  )
}
