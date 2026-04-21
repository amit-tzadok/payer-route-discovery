'use client'

import { useState, useRef } from 'react'
import { relativeDate, overallStatus } from '@/lib/reconciler'
import { ROUTE_SECTIONS, DRUG_SECTIONS } from '@/lib/data'
import { useT, formatFieldValueT } from '@/lib/i18n'
import type { ReconciledRoute } from '@/lib/types'

interface Props {
  route:       ReconciledRoute
  selectedDrug: string | null
}

// Status colours for PDF cells (RGB arrays)
const STATUS_COLORS: Record<string, [number, number, number]> = {
  verified:   [30,  199, 154],   // ruma green
  likely:     [48,  66,  230],   // ruma blue
  conflicted: [212, 97,  31],    // ruma orange
  stale:      [160, 160, 160],
  deprecated: [220, 80,  80],
  overridden: [212, 97,  31],
}

export default function ExportButton({ route, selectedDrug }: Props) {
  const t = useT()
  const [loading,       setLoading]       = useState(false)
  const [showPwDialog,  setShowPwDialog]  = useState(false)
  const [password,      setPassword]      = useState('')
  const [showPw,        setShowPw]        = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startExport = () => {
    setPassword('')
    setShowPw(false)
    setShowPwDialog(true)
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleExport = async (pw: string) => {
    setShowPwDialog(false)
    setLoading(true)
    try {
      // Dynamic import keeps jspdf out of the initial bundle
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        ...(pw ? {
          encryption: {
            userPassword:     pw,
            ownerPassword:    pw,
            userPermissions:  ['print', 'copy'] as ('print' | 'modify' | 'copy' | 'annot-forms')[],
          },
        } : {}),
      })
      const PAGE_W = doc.internal.pageSize.getWidth()
      const MARGIN = 14

      // ── Header band ──────────────────────────────────────────────
      doc.setFillColor(48, 66, 230)
      doc.rect(0, 0, PAGE_W, 28, 'F')

      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('Prior Authorization Route', MARGIN, 11)

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(route.payer + (selectedDrug ? `  ·  ${selectedDrug}` : ''), MARGIN, 19)

      doc.setFontSize(8)
      const overall = overallStatus(route)
      doc.text(
        `Status: ${overall.charAt(0).toUpperCase() + overall.slice(1)}   ·   Most recent data: ${relativeDate(route.lastUpdated)}   ·   Generated ${new Date().toLocaleDateString()}`,
        MARGIN, 25,
      )

      // ── Route sections ───────────────────────────────────────────
      let y = 36

      for (const section of ROUTE_SECTIONS) {
        const rows = section.fields
          .filter(f => !!route.fields[f])
          .map(f => {
            const field = route.fields[f]
            return [
              t.fields[f] ?? f,
              formatFieldValueT(f, field.bestValue, t),
              t.status[field.status],
              `${field.agreementCount} / ${field.totalSources}`,
            ]
          })

        if (rows.length === 0) continue

        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(100, 100, 100)
        doc.text((t.sections[section.label] ?? section.label).toUpperCase(), MARGIN, y)
        y += 2

        autoTable(doc, {
          head: [['Field', 'Value', 'Status', 'Sources']],
          body: rows,
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          styles:      { fontSize: 8.5, cellPadding: 2.5 },
          headStyles:  { fillColor: [240, 238, 235], textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 42 },
            1: { cellWidth: 90 },
            2: { cellWidth: 28 },
            3: { cellWidth: 18, halign: 'center' },
          },
          didParseCell(data) {
            // Colour the status cell dot
            if (data.column.index === 2 && data.section === 'body') {
              const status = (data.cell.raw as string).toLowerCase()
              const rgb = STATUS_COLORS[status]
              if (rgb) data.cell.styles.textColor = rgb
            }
          },
        })

        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
      }

      // ── Drug-specific section ────────────────────────────────────
      if (selectedDrug && route.drugFields[selectedDrug]) {
        const drugData = route.drugFields[selectedDrug]

        y += 2
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(48, 66, 230)
        doc.text(`Drug-Specific Requirements: ${selectedDrug}`, MARGIN, y)
        y += 4

        for (const section of DRUG_SECTIONS) {
          const rows = section.fields
            .filter(f => !!drugData[f])
            .map(f => {
              const field = drugData[f]
              return [
                t.fields[f] ?? f,
                formatFieldValueT(f, field.bestValue, t),
                t.status[field.status],
                `${field.agreementCount} / ${field.totalSources}`,
              ]
            })

          if (rows.length === 0) continue

          autoTable(doc, {
            head: [['Field', 'Value', 'Status', 'Sources']],
            body: rows,
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            styles:      { fontSize: 8.5, cellPadding: 2.5 },
            headStyles:  { fillColor: [240, 238, 235], textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 42 },
              1: { cellWidth: 90 },
              2: { cellWidth: 28 },
              3: { cellWidth: 18, halign: 'center' },
            },
          })

          y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
        }
      }

      // ── Page footer ──────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(160, 160, 160)
        doc.text(
          `Ruma Care · Payer Route Discovery · Page ${i} of ${pageCount}`,
          MARGIN,
          doc.internal.pageSize.getHeight() - 8,
        )
        doc.text(
          'CONFIDENTIAL — For internal use only',
          PAGE_W - MARGIN,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'right' },
        )
      }

      const date      = new Date().toISOString().split('T')[0]
      const payerSlug = route.payer.replace(/\s+/g, '-')
      const drugSlug  = selectedDrug ? `-${selectedDrug.replace(/\s+/g, '-')}` : ''
      doc.save(`${payerSlug}${drugSlug}-PA-Route-${date}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={startExport}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
          text-gray-600 border border-ruma-border hover:bg-ruma-bg hover:text-gray-900
          transition-colors disabled:opacity-50"
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M5 7l3 3 3-3M3 12h10" stroke="currentColor" strokeWidth="1.4"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        Export PDF
      </button>

      {/* ── Password dialog ───────────────────────────────────────────── */}
      {showPwDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowPwDialog(false) }}>
          <div className="bg-white rounded-xl shadow-xl border border-ruma-border w-80 p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-ruma-blue shrink-0" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <h3 className="text-[13px] font-bold text-gray-900">PDF Security</h3>
            </div>

            <p className="text-[12px] text-gray-500 mb-4">
              Optionally set a password to restrict opening this PDF. Leave blank to export without protection.
            </p>

            <div className="relative mb-4">
              <input
                ref={inputRef}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleExport(password) }}
                placeholder="Password (optional)"
                className="w-full px-3 pr-9 py-2 text-[12px] border border-ruma-border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-ruma-blue/30 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPw ? (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowPwDialog(false)}
                className="flex-1 py-2 text-[12px] font-medium text-gray-600 border border-ruma-border
                  rounded-lg hover:bg-ruma-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExport(password)}
                className="flex-1 py-2 text-[12px] font-medium bg-ruma-blue text-white
                  rounded-lg hover:bg-ruma-blue-light transition-colors"
              >
                {password ? 'Export with password' : 'Export without password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
