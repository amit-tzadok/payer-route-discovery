'use client'

import { useState, useRef } from 'react'
import { useT, formatFieldValueT } from '@/lib/i18n'
import type { ReconciledField } from '@/lib/types'
import ConfidenceBadge from './ConfidenceBadge'
import ConflictDrawer from './ConflictDrawer'
import OverrideModal from './OverrideModal'
import { relativeDate } from '@/lib/reconciler'

const MONO_FIELDS = new Set([
  'fax_number', 'portal_url', 'phone_urgent', 'phone_status_only', 'pa_form',
])

// Submission method pill colours — keyed by first token (fax, portal, phone, mail)
const METHOD_STYLE: Record<string, string> = {
  fax:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  portal: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  phone:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  mail:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

// Humanize a raw submission method value: "phone_urgent_only" → "Phone (urgent only)"
function humanizeMethod(raw: string): string {
  const parts = raw.split('_')
  const base  = parts[0]
  const qualifier = parts.slice(1).join(' ')
  const label = base.charAt(0).toUpperCase() + base.slice(1)
  return qualifier ? `${label} (${qualifier})` : label
}

interface Props {
  fieldKey:  string
  field:     ReconciledField
  payerName: string
  drugName?: string
}

export default function FieldRow({ fieldKey, field, payerName, drugName }: Props) {
  const t = useT()
  const [open,      setOpen]      = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [override,  setOverride]  = useState<{ value: string; reason: string } | null>(null)
  const [copied,    setCopied]    = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const label        = t.fields[fieldKey] ?? fieldKey.replace(/_/g, ' ')
  const isExpandable = field.status === 'conflicted' || field.evidence.length > 1
  const useMono      = MONO_FIELDS.has(fieldKey)
  const rawValue     = override ? null : field.bestValue
  const displayValue = override
    ? override.value
    : formatFieldValueT(fieldKey, field.bestValue, t)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(String(override?.value ?? field.bestValue))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Special value renderers ───────────────────────────────────────────────
  function renderValue() {
    // Override always shows plain text
    if (override) {
      return (
        <span className="text-[13px] font-medium text-ruma-orange truncate flex-1">
          {displayValue}
          <span className="ml-2 text-[10px] font-sans font-semibold uppercase tracking-wide
            text-ruma-orange bg-ruma-orange-bg px-1.5 py-0.5 rounded">
            {t.overriddenBadge}
          </span>
        </span>
      )
    }

    // Submission methods → colored pills
    if (fieldKey === 'submission_methods' && Array.isArray(rawValue)) {
      return (
        <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
          {rawValue.map((m: unknown) => {
            const raw     = String(m).toLowerCase()
            const baseKey = raw.split('_')[0]
            const cls     = METHOD_STYLE[baseKey] ?? 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
            return (
              <span key={raw}
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
                {humanizeMethod(raw)}
              </span>
            )
          })}
        </div>
      )
    }

    // Portal URL → external link
    if (fieldKey === 'portal_url' && rawValue) {
      const href = String(rawValue).startsWith('http') ? String(rawValue) : `https://${rawValue}`
      return (
        <a href={href} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center gap-1.5 text-[12px] font-mono text-ruma-blue
            hover:text-ruma-blue-dark hover:underline truncate min-w-0"
        >
          <span className="truncate">{displayValue}</span>
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 shrink-0 opacity-60">
            <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M7 1h4m0 0v4m0-4L5 7"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      )
    }

    // Phone fields → tel: link
    if ((fieldKey === 'phone_urgent' || fieldKey === 'phone_status_only') && rawValue) {
      const digits = String(rawValue).replace(/\D/g, '')
      return (
        <a href={`tel:${digits}`}
          onClick={e => e.stopPropagation()}
          className="flex-1 flex items-center gap-1.5 text-[12px] font-mono text-ruma-blue
            hover:text-ruma-blue-dark hover:underline truncate min-w-0"
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 shrink-0 opacity-60">
            <path d="M2 2.5C2 2.5 3 4.5 4.5 6S9.5 10 9.5 10l1.5-1.5-2-2-1 1c-.5-.5-1.5-1.5-2-2l1-1-2-2L3 4 2 2.5z"
              stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
          </svg>
          <span className="truncate">{displayValue}</span>
        </a>
      )
    }

    // Default
    return (
      <span className={`flex-1 text-[13px] font-medium truncate
        ${useMono ? 'font-mono text-[12px] text-gray-700' : 'text-gray-900'}
      `}>
        {displayValue}
      </span>
    )
  }

  return (
    <div ref={rowRef}>
      <div
        className={`
          flex items-start gap-4 px-5 py-3.5 transition-colors select-none
          ${isExpandable ? 'cursor-pointer hover:bg-gray-50 group' : ''}
          ${open ? 'bg-gray-50' : ''}
        `}
        onClick={() => {
          if (!isExpandable) return
          const opening = !open
          setOpen(opening)
          if (opening) {
            // Give React a tick to render the drawer, then scroll it into view
            setTimeout(() => {
              rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }, 50)
          }
        }}
      >
        {/* Label */}
        <span className="w-32 shrink-0 text-[12px] text-gray-600 font-semibold mt-0.5">
          {label}
        </span>

        {/* Value + badge + chevron — all in one flex row so badge can never float over pills */}
        <div className="flex-1 flex items-start justify-between gap-3 min-w-0">

          {/* Value content */}
          <div className="flex-1 flex items-start gap-2 min-w-0">
            {renderValue()}

            {/* Copy button — on hover for mono/phone/portal fields */}
            {useMono && !override && (
              <button
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy'}
                className={`shrink-0 w-6 h-6 rounded flex items-center justify-center
                  opacity-0 group-hover:opacity-100 transition-all duration-150
                  ${copied
                    ? 'text-ruma-green bg-ruma-green-bg'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {copied ? (
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                    <path d="M10 2L4.5 9l-2.5-2" stroke="currentColor" strokeWidth="1.3"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                    <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1.3" rx="0.5"/>
                    <path d="M3 5V2a1 1 0 011-1h5a1 1 0 011 1v5" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Badge + date + chevron — always to the right, never overlaps pills */}
          <div className="flex items-start gap-1.5 shrink-0 mt-0.5">
            <div className="flex flex-col items-end gap-0.5">
              <ConfidenceBadge status={override ? 'overridden' : field.status} />
              {!override && field.evidence[0]?.source_date && (
                <span className="text-[10px] text-gray-400 font-normal pr-0.5">
                  {relativeDate(field.evidence[0].source_date)}
                </span>
              )}
            </div>
            {isExpandable ? (
              <svg
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 text-gray-300
                  group-hover:text-gray-500 ${open ? 'rotate-180 text-gray-500' : ''}`}
                viewBox="0 0 16 16"
                fill="none"
              >
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
          </div>

        </div>
      </div>

      {/* Evidence drawer */}
      {isExpandable && open && (
        <div className="pb-2">
          <ConflictDrawer
            field={field}
            fieldKey={fieldKey}
            payerName={payerName}
            drugName={drugName}
            override={override}
            onOverrideClick={() => setShowModal(true)}
            onClearOverride={() => setOverride(null)}
          />
        </div>
      )}

      {/* Override modal */}
      {showModal && (
        <OverrideModal
          fieldLabel={label}
          currentValue={override?.value ?? formatFieldValueT(fieldKey, field.bestValue, t)}
          onConfirm={(value, reason) => {
            setOverride({ value, reason })
            setShowModal(false)
          }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
