export type SourceType =
  | 'provider_manual'
  | 'phone_transcript'
  | 'web_page'
  | 'denial_letter'

export type ConfidenceStatus =
  | 'verified'    // multiple recent sources agree
  | 'likely'      // single strong recent source, no contradictions
  | 'conflicted'  // active sources disagree
  | 'stale'       // only old sources, no recent confirmation
  | 'deprecated'  // explicitly tombstoned by a newer source
  | 'overridden'  // user-supplied value for this session

export interface Source {
  source_id: string
  source_type: SourceType
  source_name: string
  source_date: string
  retrieved_date: string
  source_language?: string   // BCP-47, e.g. 'es', 'fr', 'zh'. Absent means English.
  data: Record<string, unknown>
}

export interface PayerData {
  payer: string
  sources: Source[]
}

export interface FieldEvidence {
  source_id: string
  source_type: SourceType
  source_name: string
  source_date: string
  source_language?: string
  value: unknown
  isDeprecated: boolean
  deprecationNote?: string
  trustScore: number
}

export interface ReconciledField {
  field: string
  bestValue: unknown
  status: ConfidenceStatus
  confidence: number        // 0–100
  agreementCount: number
  totalSources: number
  evidence: FieldEvidence[] // sorted: active first, deprecated last
  reasoning: string
}

export interface ReconciledRoute {
  payer: string
  payerKey: string
  fields: Record<string, ReconciledField>
  drugFields: Record<string, Record<string, ReconciledField>>
  availableDrugs: string[]
  lastUpdated: string       // ISO date string of most recent source
}

export interface RouteData {
  [payerKey: string]: PayerData
}
