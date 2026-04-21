'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { makeUserField } from '@/lib/userdata'
import { PAYERS } from '@/lib/data'
import type { ReconciledRoute, SourceType } from '@/lib/types'

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'denial_letter',    label: 'Denial Letter'    },
  { value: 'phone_transcript', label: 'Phone Transcript' },
  { value: 'web_page',         label: 'Web Page'         },
  { value: 'provider_manual',  label: 'Provider Manual'  },
]

const SUBMISSION_OPTIONS = ['fax', 'portal', 'phone'] as const

interface Props {
  onConfirm: (route: ReconciledRoute) => void
  onCancel:  () => void
}

export default function AddPayerModal({ onConfirm, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]

  // Tab state
  const [tab, setTab] = useState<'manual' | 'upload'>('manual')

  // Upload / parse state
  const [parsing,       setParsing]       = useState(false)
  const [parsedFrom,    setParsedFrom]    = useState<string | null>(null)
  const [parsedLang,    setParsedLang]    = useState<string | null>(null)
  const [uploadError,   setUploadError]   = useState('')
  const [dragging,   setDragging]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [payerName,        setPayerName]        = useState('')
  const [sourceType,       setSourceType]        = useState<SourceType>('phone_transcript')
  const [sourceName,       setSourceName]        = useState('')
  const [sourceDate,       setSourceDate]        = useState(today)
  const [submissions,      setSubmissions]       = useState<string[]>(['fax', 'portal'])
  const [faxNumber,        setFaxNumber]         = useState('')
  const [portalUrl,        setPortalUrl]         = useState('')
  const [phoneUrgent,      setPhoneUrgent]       = useState('')
  const [phoneStatus,      setPhoneStatus]       = useState('')
  const [paForm,           setPaForm]            = useState('')
  const [chartNoteWindow,  setChartNoteWindow]   = useState('')
  const [turnaroundStd,    setTurnaroundStd]     = useState('')
  const [turnaroundUrgent, setTurnaroundUrgent]  = useState('')
  const [error,            setError]             = useState('')

  const payerKey = payerName.trim().toLowerCase().replace(/\s+/g, '_')

  const toggleSubmission = (method: string) =>
    setSubmissions(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method],
    )

  // ── File parsing ─────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    if (!file) return
    setUploadError('')
    setParsing(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('mode', 'payer')

      const res = await fetch('/api/parse-document', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())

      const data = await res.json() as {
        payerName?: string
        submissionMethods?: string[]
        faxNumber?: string
        portalUrl?: string
        phoneUrgent?: string
        phoneStatusOnly?: string
        paForm?: string
        chartNoteWindowDays?: number | null
        turnaroundStandardDays?: number | null
        turnaroundUrgentHours?: number | null
        sourceType?: SourceType
        sourceName?: string
        sourceDate?: string
        detectedLanguage?: string
      }

      if (data.payerName)           setPayerName(data.payerName)
      if (data.submissionMethods?.length) setSubmissions(data.submissionMethods)
      if (data.faxNumber)           setFaxNumber(data.faxNumber)
      if (data.portalUrl)           setPortalUrl(data.portalUrl)
      if (data.phoneUrgent)         setPhoneUrgent(data.phoneUrgent)
      if (data.phoneStatusOnly)     setPhoneStatus(data.phoneStatusOnly)
      if (data.paForm)              setPaForm(data.paForm)
      if (data.chartNoteWindowDays != null)    setChartNoteWindow(String(data.chartNoteWindowDays))
      if (data.turnaroundStandardDays != null) setTurnaroundStd(String(data.turnaroundStandardDays))
      if (data.turnaroundUrgentHours != null)  setTurnaroundUrgent(String(data.turnaroundUrgentHours))
      if (data.sourceType)          setSourceType(data.sourceType)
      if (data.sourceName)          setSourceName(data.sourceName)
      if (data.sourceDate)          setSourceDate(data.sourceDate)

      setParsedFrom(file.name)
      setParsedLang(data.detectedLanguage ?? null)
      setTab('manual') // switch to review mode
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
    if (!payerName.trim()) { setError('Payer name is required.'); return }
    if (PAYERS.includes(payerKey)) {
      setError(`"${payerName.trim()}" already exists. Use overrides to update individual fields.`)
      return
    }
    if (submissions.length === 0) { setError('Select at least one submission method.'); return }
    setError('')

    const src = sourceName.trim() || `${parsedFrom ? 'Parsed from document' : 'Manually added'} — ${sourceType.replace(/_/g, ' ')}`

    const fields: Record<string, ReturnType<typeof makeUserField>> = {}
    if (submissions.length)      fields.submission_methods        = makeUserField('submission_methods',        submissions,                               sourceType, src, sourceDate)
    if (faxNumber.trim())        fields.fax_number                = makeUserField('fax_number',                faxNumber.trim(),                          sourceType, src, sourceDate)
    if (portalUrl.trim())        fields.portal_url                = makeUserField('portal_url',                portalUrl.trim(),                          sourceType, src, sourceDate)
    if (phoneUrgent.trim())      fields.phone_urgent              = makeUserField('phone_urgent',              phoneUrgent.trim(),                        sourceType, src, sourceDate)
    if (phoneStatus.trim())      fields.phone_status_only         = makeUserField('phone_status_only',         phoneStatus.trim(),                        sourceType, src, sourceDate)
    if (paForm.trim())           fields.pa_form                   = makeUserField('pa_form',                   paForm.trim(),                             sourceType, src, sourceDate)
    if (chartNoteWindow.trim())  fields.chart_note_window_days    = makeUserField('chart_note_window_days',    Number(chartNoteWindow)  || chartNoteWindow.trim(),  sourceType, src, sourceDate)
    if (turnaroundStd.trim())    fields.turnaround_standard_days  = makeUserField('turnaround_standard_days',  Number(turnaroundStd)    || turnaroundStd.trim(),    sourceType, src, sourceDate)
    if (turnaroundUrgent.trim()) fields.turnaround_urgent_hours   = makeUserField('turnaround_urgent_hours',   Number(turnaroundUrgent) || turnaroundUrgent.trim(), sourceType, src, sourceDate)

    onConfirm({
      payer:          payerName.trim(),
      payerKey,
      fields,
      drugFields:     {},
      availableDrugs: [],
      lastUpdated:    sourceDate,
    })
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputCls = `w-full px-3 py-2 rounded-lg border border-ruma-border text-[13px]
    focus:outline-none focus:ring-2 focus:ring-ruma-blue/20 focus:border-ruma-blue transition-colors`
  const labelCls = 'block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onCancel} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-ruma-border flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-ruma-border shrink-0">
          <h2 className="text-[15px] font-semibold text-gray-900">Add Insurance Company</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">Stored locally for this session.</p>
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
                      Claude will read the document and extract payer routing fields automatically.
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

              {/* Payer name */}
              <div>
                <label className={labelCls}>Payer Name <span className="text-ruma-blue normal-case font-normal">*</span></label>
                <input autoFocus type="text" value={payerName}
                  onChange={e => { setPayerName(e.target.value); setError('') }}
                  placeholder="e.g. Molina Healthcare" className={inputCls} />
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
                  placeholder="e.g. Call to (800) 555-0100, Rep Jane #1234" className={inputCls} />
              </div>

              <hr className="border-ruma-border" />

              {/* Submission methods */}
              <div>
                <label className={labelCls}>Submission Methods <span className="text-ruma-blue normal-case font-normal">*</span></label>
                <div className="flex gap-3">
                  {SUBMISSION_OPTIONS.map(m => (
                    <label key={m} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input type="checkbox" checked={submissions.includes(m)} onChange={() => toggleSubmission(m)}
                        className="accent-ruma-blue" />
                      <span className="text-[13px] text-gray-700 capitalize">{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Fax Number</label>
                  <input type="text" value={faxNumber} onChange={e => setFaxNumber(e.target.value)}
                    placeholder="(800) 555-0100" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Portal URL</label>
                  <input type="text" value={portalUrl} onChange={e => setPortalUrl(e.target.value)}
                    placeholder="www.availity.com" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Urgent Phone</label>
                  <input type="text" value={phoneUrgent} onChange={e => setPhoneUrgent(e.target.value)}
                    placeholder="(800) 555-0100" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Status Phone</label>
                  <input type="text" value={phoneStatus} onChange={e => setPhoneStatus(e.target.value)}
                    placeholder="(800) 555-0200" className={inputCls} />
                </div>
              </div>

              {/* Documentation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>PA Form</label>
                  <input type="text" value={paForm} onChange={e => setPaForm(e.target.value)}
                    placeholder="e.g. MOL-PA-2025" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Chart Note Window (days)</label>
                  <input type="number" value={chartNoteWindow} onChange={e => setChartNoteWindow(e.target.value)}
                    placeholder="90" className={inputCls} />
                </div>
              </div>

              {/* Timelines */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Std. Turnaround (days)</label>
                  <input type="number" value={turnaroundStd} onChange={e => setTurnaroundStd(e.target.value)}
                    placeholder="5" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Urgent Turnaround (hours)</label>
                  <input type="number" value={turnaroundUrgent} onChange={e => setTurnaroundUrgent(e.target.value)}
                    placeholder="24" className={inputCls} />
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
            <button onClick={handleConfirm} disabled={!payerName.trim()}
              className="px-4 py-2 rounded-lg text-[13px] font-medium bg-ruma-blue text-white
                hover:bg-ruma-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              Add Payer
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
