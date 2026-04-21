'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { makeUserField } from '@/lib/userdata'
import type { ReconciledField, SourceType } from '@/lib/types'

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'denial_letter',    label: 'Denial Letter'    },
  { value: 'phone_transcript', label: 'Phone Transcript' },
  { value: 'web_page',         label: 'Web Page'         },
  { value: 'provider_manual',  label: 'Provider Manual'  },
]

interface Props {
  payerName: string
  onConfirm: (drugName: string, fields: Record<string, ReconciledField>) => void
  onCancel:  () => void
}

export default function AddDrugModal({ payerName, onConfirm, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]

  // Tab state
  const [tab, setTab] = useState<'manual' | 'upload'>('manual')

  // Upload / parse state
  const [parsing,     setParsing]     = useState(false)
  const [parsedFrom,  setParsedFrom]  = useState<string | null>(null)
  const [parsedLang,  setParsedLang]  = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [dragging,    setDragging]    = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [drugName,        setDrugName]        = useState('')
  const [sourceType,      setSourceType]       = useState<SourceType>('phone_transcript')
  const [sourceName,      setSourceName]       = useState('')
  const [sourceDate,      setSourceDate]       = useState(today)
  const [stepTherapy,     setStepTherapy]      = useState(false)
  const [biosimRequired,  setBiosimRequired]   = useState(false)
  const [biosimPreferred, setBiosimPreferred]  = useState(false)
  const [biosimAttest,    setBiosimAttest]     = useState('')
  const [authPeriod,      setAuthPeriod]       = useState('')
  const [notes,           setNotes]            = useState('')
  const [error,           setError]            = useState('')

  // ── File parsing ─────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file) return
    setUploadError('')
    setParsing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('mode', 'drug')

      const res = await fetch('/api/parse-document', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())

      const data = await res.json() as {
        drugName?: string
        stepTherapyRequired?: boolean
        biosimilarRequired?: boolean
        biosimilarPreferred?: boolean
        biosimilarAttestation?: string
        authPeriodMonths?: number | null
        notes?: string
        sourceType?: SourceType
        sourceDate?: string
        detectedLanguage?: string
      }

      if (data.drugName)                    setDrugName(data.drugName)
      if (data.stepTherapyRequired != null) setStepTherapy(!!data.stepTherapyRequired)
      if (data.biosimilarRequired  != null) setBiosimRequired(!!data.biosimilarRequired)
      if (data.biosimilarPreferred != null) setBiosimPreferred(!!data.biosimilarPreferred)
      if (data.biosimilarAttestation)       setBiosimAttest(data.biosimilarAttestation)
      if (data.authPeriodMonths    != null) setAuthPeriod(String(data.authPeriodMonths))
      if (data.notes)                       setNotes(data.notes)
      if (data.sourceType)                  setSourceType(data.sourceType)
      if (data.sourceDate)                  setSourceDate(data.sourceDate)

      setParsedFrom(file.name)
      setParsedLang(data.detectedLanguage ?? null)
      setTab('manual')
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Failed to parse document')
    } finally {
      setParsing(false)
    }
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!drugName.trim()) { setError('Drug name is required.'); return }
    setError('')

    const src = sourceName.trim() || `${parsedFrom ? 'Parsed from document' : 'Manually added'} — ${sourceType.replace(/_/g, ' ')}`

    const fields: Record<string, ReconciledField> = {}
    fields.step_therapy_required = makeUserField('step_therapy_required', stepTherapy,     sourceType, src, sourceDate)
    fields.biosimilar_required   = makeUserField('biosimilar_required',   biosimRequired,  sourceType, src, sourceDate)
    fields.biosimilar_preferred  = makeUserField('biosimilar_preferred',  biosimPreferred, sourceType, src, sourceDate)
    if (biosimAttest.trim()) fields.biosimilar_attestation = makeUserField('biosimilar_attestation', biosimAttest.trim(), sourceType, src, sourceDate)
    if (authPeriod.trim())   fields.auth_period_months     = makeUserField('auth_period_months',     Number(authPeriod) || authPeriod.trim(), sourceType, src, sourceDate)
    if (notes.trim())        fields.notes                  = makeUserField('notes',                  notes.trim(), sourceType, src, sourceDate)

    onConfirm(drugName.trim(), fields)
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputCls = `w-full px-3 py-2 rounded-lg border border-ruma-border text-[13px]
    focus:outline-none focus:ring-2 focus:ring-ruma-blue/20 focus:border-ruma-blue transition-colors`
  const labelCls = 'block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onCancel} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-ruma-border flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-ruma-border shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-900">Add Medication</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">
            Drug-specific requirements for <span className="font-medium text-gray-600">{payerName}</span>
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-ruma-border shrink-0">
          {(['manual', 'upload'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setUploadError('') }}
              className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors
                ${tab === t
                  ? 'text-ruma-blue border-b-2 border-ruma-blue'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {t === 'manual' ? 'Manual Entry' : 'Upload Document'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* ── Upload tab ── */}
          {tab === 'upload' && (
            <div className="px-5 py-6 flex flex-col items-center gap-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors
                  flex flex-col items-center justify-center gap-3 py-12 px-6 text-center
                  ${dragging ? 'border-ruma-blue bg-ruma-blue/5' : 'border-ruma-border hover:border-ruma-blue/50 hover:bg-gray-50'}`}
              >
                {parsing ? (
                  <>
                    <svg className="w-8 h-8 text-ruma-blue animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[13px] text-gray-500 font-medium">Parsing document…</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-ruma-bg-2 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-gray-400">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5"/>
                        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5"/>
                        <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <polyline points="9 15 12 12 15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-700">Drop a document here</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">or click to browse — PDF, TXT supported</p>
                    </div>
                    <p className="text-[11px] text-gray-400 bg-ruma-bg rounded-lg px-3 py-1.5 leading-relaxed max-w-xs">
                      Claude will read the document and extract drug-specific PA requirements automatically.
                    </p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.text" className="hidden" onChange={onFileInput} />
              {uploadError && (
                <p className="w-full text-[12px] text-ruma-red bg-ruma-red-bg px-3 py-2 rounded-lg">{uploadError}</p>
              )}
            </div>
          )}

          {/* ── Manual tab ── */}
          {tab === 'manual' && (
            <div className="px-5 py-4 space-y-4">

              {/* Parsed banner */}
              {parsedFrom && (
                <div className="flex items-center gap-2 bg-ruma-green/10 border border-ruma-green/30 rounded-lg px-3 py-2">
                  <svg viewBox="0 0 12 12" fill="none" className="w-3.5 h-3.5 text-ruma-green shrink-0">
                    <path d="M10 2L4.5 9 2 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[12px] text-ruma-green-dark font-medium truncate">
                    Populated from <span className="font-semibold">{parsedFrom}</span>
                    {parsedLang && parsedLang !== 'en' && (
                      <span className="ml-1.5 text-[10px] bg-ruma-cyan-light text-ruma-cyan-dark px-1.5 py-0.5 rounded font-bold uppercase">
                        {parsedLang}
                      </span>
                    )}
                    {' '}— review and edit below
                  </p>
                  <button onClick={() => setParsedFrom(null)} className="ml-auto text-gray-400 hover:text-gray-600 shrink-0">
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Drug name */}
              <div>
                <label className={labelCls}>Drug / Medication Name <span className="text-ruma-blue normal-case font-normal">*</span></label>
                <input autoFocus type="text" value={drugName}
                  onChange={e => { setDrugName(e.target.value); setError('') }}
                  placeholder="e.g. Stelara, Dupixent, Ocrevus" className={inputCls} />
              </div>

              {/* Source info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Source Type</label>
                  <select value={sourceType} onChange={e => setSourceType(e.target.value as SourceType)} className={inputCls}>
                    {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Source Date</label>
                  <input type="date" value={sourceDate} onChange={e => setSourceDate(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Source Name <span className="normal-case font-normal text-gray-300">(optional)</span></label>
                <input type="text" value={sourceName} onChange={e => setSourceName(e.target.value)}
                  placeholder="e.g. Call to rep, denial letter ref #..." className={inputCls} />
              </div>

              <hr className="border-ruma-border" />

              {/* Toggles */}
              <div className="space-y-2.5">
                {([
                  ['Step Therapy Required',  stepTherapy,     setStepTherapy],
                  ['Biosimilar Required',    biosimRequired,  setBiosimRequired],
                  ['Biosimilar Preferred',   biosimPreferred, setBiosimPreferred],
                ] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-700">{label}</span>
                    <button type="button" onClick={() => set(!val)}
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0
                        ${val ? 'bg-ruma-blue' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all
                        ${val ? 'left-4' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className={labelCls}>Biosimilar Attestation Language <span className="normal-case font-normal text-gray-300">(optional)</span></label>
                <textarea rows={2} value={biosimAttest} onChange={e => setBiosimAttest(e.target.value)}
                  placeholder="e.g. Prescriber must attest patient is biologic-naïve..."
                  className={`${inputCls} resize-none`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Auth Period (months)</label>
                  <input type="number" value={authPeriod} onChange={e => setAuthPeriod(e.target.value)}
                    placeholder="6" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Specialist LMN required..." className={inputCls} />
                </div>
              </div>

              {error && (
                <p className="text-[12px] text-ruma-red bg-ruma-red-bg px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-ruma-bg border-t border-ruma-border flex justify-end gap-2 shrink-0">
          <button onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-ruma-bg-3 transition-colors">
            Cancel
          </button>
          {tab === 'manual' && (
            <button onClick={handleConfirm} disabled={!drugName.trim()}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-ruma-blue text-white
                hover:bg-ruma-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Add Medication
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
