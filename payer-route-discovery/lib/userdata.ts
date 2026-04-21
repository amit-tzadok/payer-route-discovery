import type { ReconciledField, ReconciledRoute, Source, SourceType } from './types'

const PAYERS_KEY  = 'ruma_custom_payers_v1'
const DRUGS_KEY   = 'ruma_drug_additions_v1'
const SOURCES_KEY = 'ruma_source_additions_v1'

// ── Custom payers (brand-new entries added by the user) ───────────────────────

export function loadCustomPayers(): Record<string, ReconciledRoute> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PAYERS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveCustomPayer(key: string, route: ReconciledRoute): void {
  if (typeof window === 'undefined') return
  const all = loadCustomPayers()
  all[key] = route
  try { localStorage.setItem(PAYERS_KEY, JSON.stringify(all)) } catch {}
}

export function deleteCustomPayer(key: string): void {
  if (typeof window === 'undefined') return
  const all = loadCustomPayers()
  delete all[key]
  try { localStorage.setItem(PAYERS_KEY, JSON.stringify(all)) } catch {}
}

// ── Drug additions (drugs added to any payer, static or custom) ───────────────
// Structure: { payerKey → { drugName → { fieldKey → ReconciledField } } }

export type DrugAdditions = Record<string, Record<string, Record<string, ReconciledField>>>

export function loadDrugAdditions(): DrugAdditions {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(DRUGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveDrugAddition(
  payerKey: string,
  drugName: string,
  fields: Record<string, ReconciledField>,
): void {
  if (typeof window === 'undefined') return
  const all = loadDrugAdditions()
  if (!all[payerKey]) all[payerKey] = {}
  all[payerKey][drugName] = fields
  try { localStorage.setItem(DRUGS_KEY, JSON.stringify(all)) } catch {}
}

export function deleteDrugAddition(payerKey: string, drugName: string): void {
  if (typeof window === 'undefined') return
  const all = loadDrugAdditions()
  if (all[payerKey]) {
    delete all[payerKey][drugName]
    if (Object.keys(all[payerKey]).length === 0) delete all[payerKey]
  }
  try { localStorage.setItem(DRUGS_KEY, JSON.stringify(all)) } catch {}
}

// ── Source additions (extra sources added to any payer) ───────────────────────
// Structure: { payerKey → Source[] }

export type SourceAdditions = Record<string, Source[]>

export function loadSourceAdditions(): SourceAdditions {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(SOURCES_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

export function saveSourceAddition(payerKey: string, source: Source): void {
  if (typeof window === 'undefined') return
  const all = loadSourceAdditions()
  if (!all[payerKey]) all[payerKey] = []
  all[payerKey].push(source)
  try { localStorage.setItem(SOURCES_KEY, JSON.stringify(all)) } catch {}
}

export function deleteSourceAddition(payerKey: string, sourceId: string): void {
  if (typeof window === 'undefined') return
  const all = loadSourceAdditions()
  if (all[payerKey]) {
    all[payerKey] = all[payerKey].filter(s => s.source_id !== sourceId)
    if (all[payerKey].length === 0) delete all[payerKey]
  }
  try { localStorage.setItem(SOURCES_KEY, JSON.stringify(all)) } catch {}
}

// ── Helper: build a ReconciledField from a single user-entered value ──────────

export function makeUserField(
  fieldKey: string,
  value: unknown,
  sourceType: SourceType = 'phone_transcript',
  sourceName = 'Manually entered',
  sourceDate?: string,
): ReconciledField {
  const today = sourceDate ?? new Date().toISOString().split('T')[0]
  return {
    field:          fieldKey,
    bestValue:      value,
    status:         'likely',
    confidence:     60,
    agreementCount: 1,
    totalSources:   1,
    evidence: [{
      source_id:    `user-${fieldKey}-${Date.now()}`,
      source_type:  sourceType,
      source_name:  sourceName,
      source_date:  today,
      value,
      isDeprecated: false,
      trustScore:   3,
    }],
    reasoning: 'User-entered value.',
  }
}
