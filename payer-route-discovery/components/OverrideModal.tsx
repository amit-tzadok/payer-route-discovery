'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/lib/i18n'

interface Props {
  fieldLabel:   string
  currentValue: string
  onConfirm:    (value: string, reason: string) => void
  onCancel:     () => void
}

export default function OverrideModal({ fieldLabel, currentValue, onConfirm, onCancel }: Props) {
  const t = useT()
  const [value,  setValue]  = useState(currentValue)
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    if (value.trim()) onConfirm(value.trim(), reason.trim())
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onCancel}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-ruma-border">

        {/* Header */}
        <div className="px-5 py-4 border-b border-ruma-border">
          <h2 className="text-[15px] font-semibold text-gray-900">
            {t.overrideModalTitle} · {fieldLabel}
          </h2>
          <p className="text-[12px] text-gray-400 mt-0.5">
            {t.overrideModalSubtitle}
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              {t.newValueLabel}
            </label>
            <input
              autoFocus
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
              className="w-full px-3 py-2 rounded-lg border border-ruma-border text-[13px] font-mono
                focus:outline-none focus:ring-2 focus:ring-ruma-blue/20 focus:border-ruma-blue transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
              {t.reasonLabel} <span className="normal-case font-normal text-gray-300">{t.reasonOptional}</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Confirmed with rep on call today"
              className="w-full px-3 py-2 rounded-lg border border-ruma-border text-[13px] resize-none
                focus:outline-none focus:ring-2 focus:ring-ruma-blue/20 focus:border-ruma-blue transition-colors placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-ruma-bg border-t border-ruma-border flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-ruma-bg-3 transition-colors"
          >
            {t.cancelButton}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-ruma-blue text-white
              hover:bg-ruma-blue-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.applyOverrideButton}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
