'use client'

import { useState, useRef, useCallback } from 'react'
import type { Source, SourceType } from '@/lib/types'

interface Props {
  payerName: string
  payerKey:  string
  onConfirm: (source: Source) => void
  onCancel:  () => void
}

type Tab = 'upload' | 'paste'

const SOURCE_TYPE_META: { type: SourceType; label: string; description: string }[] = [
  { type: 'denial_letter',    label: 'Denial Letter',   description: 'Denial determination from payer' },
  { type: 'phone_transcript', label: 'Phone Call',      description: 'Rep call notes or transcript'    },
  { type: 'provider_manual',  label: 'Provider Manual', description: 'Official PA guidelines document'  },
  { type: 'web_page',         label: 'Web Page',        description: 'Saved page from payer website'   },
]

const PREVIEW_LABELS: Record<string, string> = {
  submission_methods:       'Submission Methods',
  fax_number:               'Fax Number',
  fax_number_old:           'Old Fax (deprecated)',
  portal_url:               'Portal',
  pa_form:                  'PA Form',
  pa_form_note:             'Form Note',
  chart_note_window_days:   'Chart Note Window',
  chart_note_policy_update: 'Policy Updated',
  turnaround_standard_days: 'Standard Turnaround',
  turnaround_urgent_hours:  'Urgent Turnaround',
  phone_urgent:             'Urgent Phone',
  phone_status_only:        'Status Phone',
  denial_reason:            'Denial Reason',
  denial_reasons:           'Denial Reasons',
  appeal_fax:               'Appeal Fax',
  appeal_phone:             'Appeal Phone',
  appeal_mail:              'Appeal Mail',
  appeal_deadline_days:     'Appeal Deadline',
}

function formatPreviewValue(key: string, value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (key.endsWith('_days'))   return `${value} days`
  if (key.endsWith('_hours'))  return `${value} hrs`
  return String(value)
}

interface ParsedResult {
  sourceType:       SourceType | null
  sourceName:       string | null
  sourceDate:       string | null
  detectedLanguage: string | null
  data:             Record<string, unknown>
}

export default function AddSourceModal({ payerName, payerKey, onConfirm, onCancel }: Props) {
  const [tab,        setTab]        = useState<Tab>('upload')
  const [sourceType, setSourceType] = useState<SourceType>('denial_letter')
  const [pasteText,  setPasteText]  = useState('')
  const [parsing,    setParsing]    = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsed,     setParsed]     = useState<ParsedResult | null>(null)
  const [sourceName, setSourceName] = useState('')
  const [sourceDate, setSourceDate] = useState('')
  const [dragging,   setDragging]   = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const runParse = useCallback(async (file: File) => {
    setParsing(true)
    setParseError('')
    setParsed(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('mode', 'source')
      fd.append('hintSourceType', sourceType)
      const res = await fetch('/api/parse-document', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json() as ParsedResult
      setParsed(result)
      setSourceName(result.sourceName ?? '')
      setSourceDate(result.sourceDate ?? new Date().toISOString().split('T')[0])
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Parse failed')
    } finally {
      setParsing(false)
    }
  }, [sourceType])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) runParse(file)
    e.target.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) runParse(file)
  }, [runParse])

  const handlePasteExtract = () => {
    if (!pasteText.trim()) return
    const file = new File([pasteText], 'pasted.txt', { type: 'text/plain' })
    runParse(file)
  }

  const handleConfirm = () => {
    if (!parsed) return
    const cleanData: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== null && v !== undefined) cleanData[k] = v
    }
    const label = SOURCE_TYPE_META.find(s => s.type === sourceType)?.label ?? sourceType
    const source: Source = {
      source_id:       `user-${payerKey}-${Date.now()}`,
      source_type:     sourceType,
      source_name:     sourceName.trim() || `${label} – ${sourceDate}`,
      source_date:     sourceDate,
      retrieved_date:  new Date().toISOString().split('T')[0],
      source_language: parsed.detectedLanguage && parsed.detectedLanguage !== 'en'
        ? parsed.detectedLanguage : undefined,
      data: cleanData,
    }
    onConfirm(source)
  }

  // Fields to show in the preview (flat data, excluding drugs dict)
  const previewEntries = parsed
    ? Object.entries(parsed.data).filter(([k, v]) =>
        k !== 'drugs' && v !== null && v !== undefined && PREVIEW_LABELS[k]
      )
    : []

  const drugNames = parsed?.data.drugs
    ? Object.keys(parsed.data.drugs as Record<string, unknown>)
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-ruma-border shrink-0">
          <h2 className="text-[15px] font-bold text-gray-900">Add Source</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">{payerName}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">

          {/* Source type selector */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Source Type
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SOURCE_TYPE_META.map(({ type, label, description }) => (
                <button
                  key={type}
                  onClick={() => setSourceType(type)}
                  className={`text-left px-3 py-2.5 rounded-xl border transition-all
                    ${sourceType === type
                      ? 'border-ruma-blue bg-ruma-blue/5 text-ruma-blue'
                      : 'border-ruma-border text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <p className="text-[12px] font-semibold">{label}</p>
                  <p className={`text-[10px] mt-0.5 leading-tight
                    ${sourceType === type ? 'text-ruma-blue/60' : 'text-gray-400'}`}>
                    {description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Input — hidden after parse */}
          {!parsed && !parsing && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                {(['upload', 'paste'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-1.5 rounded-md text-[12px] font-medium transition-all
                      ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {t === 'upload' ? 'Upload File' : 'Paste Text'}
                  </button>
                ))}
              </div>

              {tab === 'upload' ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-xl border-2 border-dashed py-10 flex flex-col items-center gap-2 cursor-pointer transition-colors
                    ${dragging
                      ? 'border-ruma-blue bg-ruma-blue/5'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <svg className="w-8 h-8 text-gray-300" viewBox="0 0 32 32" fill="none">
                    <path d="M16 20V10M11 15l5-5 5 5" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 26h16a2 2 0 002-2V12l-6-6H8a2 2 0 00-2 2v16a2 2 0 002 2z"
                      stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[13px] font-medium text-gray-500">
                    Drop file here or click to browse
                  </p>
                  <p className="text-[11px] text-gray-400">PDF or TXT · up to 20 MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder="Paste call notes, email content, or any source text…"
                    className="w-full h-36 px-3 py-2.5 text-[12px] border border-ruma-border rounded-xl
                      resize-none focus:outline-none focus:ring-2 focus:ring-ruma-blue/30"
                  />
                  <button
                    onClick={handlePasteExtract}
                    disabled={!pasteText.trim()}
                    className="w-full py-2 text-[12px] font-semibold bg-ruma-blue text-white rounded-lg
                      disabled:opacity-40 hover:bg-ruma-blue-light transition-colors"
                  >
                    Extract Fields
                  </button>
                </div>
              )}
            </>
          )}

          {/* Parsing spinner */}
          {parsing && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 rounded-full border-2 border-ruma-blue border-t-transparent animate-spin" />
              <p className="text-[12px] text-gray-500">Extracting fields with Claude…</p>
            </div>
          )}

          {/* Error */}
          {parseError && (
            <p className="text-[12px] text-ruma-red bg-ruma-red-bg px-3 py-2 rounded-lg">
              {parseError}
            </p>
          )}

          {/* Parsed preview */}
          {parsed && (
            <div className="space-y-3">

              {/* Success banner */}
              <div className="flex items-center gap-2 px-3 py-2 bg-ruma-green-bg rounded-lg">
                <svg className="w-4 h-4 text-ruma-green shrink-0" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[12px] text-ruma-green-dark font-medium">
                  {previewEntries.length} field{previewEntries.length !== 1 ? 's' : ''} extracted
                  {drugNames.length > 0 && ` · ${drugNames.length} drug${drugNames.length !== 1 ? 's' : ''}: ${drugNames.join(', ')}`}
                </p>
                <button
                  onClick={() => { setParsed(null); setParseError('') }}
                  className="ml-auto text-[10px] text-gray-400 hover:text-gray-700 font-medium shrink-0"
                >
                  Re-upload
                </button>
              </div>

              {/* Field preview */}
              {previewEntries.length > 0 && (
                <div className="rounded-xl border border-ruma-border divide-y divide-ruma-border overflow-hidden">
                  {previewEntries.map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 px-3 py-2">
                      <span className="text-[10px] text-gray-400 w-32 shrink-0 pt-0.5 uppercase tracking-wide">
                        {PREVIEW_LABELS[key]}
                      </span>
                      <span className="text-[12px] text-gray-800 font-medium leading-snug flex-1">
                        {formatPreviewValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Editable metadata */}
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Source Name
                  </label>
                  <input
                    value={sourceName}
                    onChange={e => setSourceName(e.target.value)}
                    placeholder="e.g. Call to (800) 624-0756, Rep Karen #4412"
                    className="w-full px-3 py-2 text-[12px] border border-ruma-border rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-ruma-blue/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    Source Date
                  </label>
                  <input
                    type="date"
                    value={sourceDate}
                    onChange={e => setSourceDate(e.target.value)}
                    className="w-full px-3 py-2 text-[12px] border border-ruma-border rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-ruma-blue/30"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ruma-border flex gap-3 shrink-0">
          <button
            onClick={onCancel}
            className="flex-1 py-2 text-[13px] font-medium text-gray-600 border border-ruma-border
              rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!parsed || !sourceDate}
            className="flex-1 py-2 text-[13px] font-semibold text-white bg-ruma-blue
              rounded-xl disabled:opacity-40 hover:bg-ruma-blue-light transition-colors"
          >
            Add Source
          </button>
        </div>
      </div>
    </div>
  )
}
