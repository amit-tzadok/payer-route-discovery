'use client'

import { useT } from '@/lib/i18n'
import { PayerLogo } from '@/lib/logos'

interface Props {
  payers: string[]
  getPayerDisplayName: (key: string) => string
  onSelectPayer: (payer: string) => void
}

export default function EmptyState({ payers, getPayerDisplayName, onSelectPayer }: Props) {
  const t = useT()

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-ruma-blue-light flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-ruma-blue">
              <path d="M3 8h18M3 16h18M3 12h18M6 4h12a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t.emptyStateTitle || 'Infusion Route Lookup'}
        </h1>
        <p className="text-[14px] text-gray-500 mb-8">
          {t.emptyStateDesc || 'Select a payer to see prior authorization routes and requirements'}
        </p>

        {/* Payer logos grid */}
        <div className="mb-8 flex justify-center">
          <div className="grid grid-cols-3 gap-4 p-6 bg-gray-50 rounded-2xl border border-ruma-border">
            {payers.slice(0, 6).map(payer => (
              <button
                key={payer}
                onClick={() => onSelectPayer(payer)}
                className="group p-3 rounded-lg bg-white hover:bg-ruma-blue border border-ruma-border hover:border-ruma-blue
                  hover:shadow-md transition-all flex flex-col items-center gap-2"
              >
                <span className="w-10 h-10 flex items-center justify-center group-hover:filter group-hover:brightness-200">
                  <PayerLogo payerKey={payer} size="lg" />
                </span>
                <p className="text-[10px] font-medium text-gray-600 group-hover:text-white truncate max-w-[60px]">
                  {getPayerDisplayName(payer).split(' ')[0]}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <p className="text-[12px] text-gray-400">
          Choose a payer from the sidebar or use the search bar to get started
        </p>
      </div>
    </div>
  )
}
