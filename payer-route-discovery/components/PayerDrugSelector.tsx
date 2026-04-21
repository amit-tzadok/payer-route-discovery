'use client'

import { useT } from '@/lib/i18n'
import { PayerLogo } from '@/lib/logos'

interface Props {
  payers:         string[]
  selectedPayer:  string
  selectedDrug:   string | null
  drugs:          string[]
  onPayerChange:  (payer: string) => void
  onDrugChange:   (drug: string | null) => void
  getDisplayName: (key: string) => string
  onAddPayer:     () => void
  onAddDrug:      () => void
  onDeletePayer:  (key: string) => void
  isCustomPayer:  (key: string) => boolean
}

export default function PayerDrugSelector({
  payers, selectedPayer, selectedDrug, drugs,
  onPayerChange, onDrugChange, getDisplayName,
  onAddPayer, onAddDrug, onDeletePayer, isCustomPayer,
}: Props) {
  const t = useT()
  return (
    <div className="flex flex-col h-full">

      {/* ── Payers ─────────────────────────────────────────────── */}
      <div className="px-3 pt-4 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-2 mb-2">
          {t.payerLabel}
        </p>
        <div className="space-y-0.5">
          {payers.map(payer => {
            const active  = payer === selectedPayer
            const custom  = isCustomPayer(payer)
            return (
              <div key={payer} className="group relative flex items-center">
                <button
                  onClick={() => onPayerChange(payer)}
                  className={`
                    flex-1 text-left px-2.5 py-2.5 rounded-lg text-[13px] flex items-center gap-2.5 pr-7
                    ${active
                      ? 'bg-ruma-blue text-white shadow-md hover:shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  {isCustomPayer(payer) ? (
                    <span className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                      ${active ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'}
                    `}>
                      {getDisplayName(payer).slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <PayerLogo payerKey={payer} size="md" />
                  )}
                  <span className="truncate font-medium">{getDisplayName(payer)}</span>
                  {custom && (
                    <span className={`shrink-0 text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded
                      ${active ? 'bg-white/20 text-white' : 'bg-ruma-bg-3 text-gray-400'}`}>
                      custom
                    </span>
                  )}
                </button>
                {/* Delete button — only for custom payers */}
                {custom && (
                  <button
                    onClick={e => { e.stopPropagation(); onDeletePayer(payer) }}
                    title="Remove"
                    className={`absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity
                      w-5 h-5 rounded flex items-center justify-center
                      ${active ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-ruma-red'}`}
                  >
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add payer button */}
        <button
          onClick={onAddPayer}
          className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px]
            text-gray-400 hover:text-ruma-blue hover:bg-ruma-bg transition-colors"
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 shrink-0">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {t.addPayer}
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-ruma-border" />

      {/* ── Drugs ──────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-2 mb-2">
          {t.drugLabel}
        </p>
        <div className="space-y-0.5">
          {drugs.length > 0 && (
            <button
              onClick={() => onDrugChange(null)}
              className={`
                w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors flex items-center gap-2
                ${selectedDrug === null
                  ? 'text-gray-700 font-medium bg-ruma-bg'
                  : 'text-gray-400 hover:bg-ruma-bg hover:text-gray-600'
                }
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedDrug === null ? 'bg-ruma-blue' : 'bg-gray-200'}`} />
              {t.routeOnly}
            </button>
          )}
          {drugs.map(drug => {
            const active = drug === selectedDrug
            return (
              <button
                key={drug}
                onClick={() => onDrugChange(drug)}
                className={`
                  w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] transition-colors flex items-center gap-2
                  ${active
                    ? 'bg-ruma-cyan-light text-ruma-cyan-dark font-medium'
                    : 'text-gray-600 hover:bg-ruma-bg'
                  }
                `}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-ruma-cyan' : 'bg-gray-300'}`} />
                {drug}
              </button>
            )
          })}
        </div>

        {/* Add drug button */}
        <button
          onClick={onAddDrug}
          className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px]
            text-gray-400 hover:text-ruma-blue hover:bg-ruma-bg transition-colors"
        >
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 shrink-0">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {t.addDrug}
        </button>
      </div>

    </div>
  )
}
