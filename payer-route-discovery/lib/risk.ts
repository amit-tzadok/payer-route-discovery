import type { ReconciledRoute, Source } from './types'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RiskFactor {
  label:  string
  impact: 'positive' | 'negative' | 'neutral'
  detail: string
  points: number
}

export interface RiskAssessment {
  score:   number       // 0–100
  level:   RiskLevel
  factors: RiskFactor[]
}

const CRITICAL_FIELDS = ['submission_methods', 'fax_number', 'portal_url', 'pa_form', 'phone_urgent']

export function estimateRisk(
  route: ReconciledRoute,
  drugName?: string | null,
): RiskAssessment {
  const factors: RiskFactor[] = []
  let score = 0

  const fields = Object.values(route.fields)

  // ── Factor 1: critical field completeness ─────────────────────────────────
  const missingCritical = CRITICAL_FIELDS.filter(f => !route.fields[f])
  if (missingCritical.length > 0) {
    const pts = missingCritical.length * 10
    score += pts
    factors.push({
      label:  'Missing critical fields',
      impact: 'negative',
      detail: `${missingCritical.map(f => f.replace(/_/g, ' ')).join(', ')} not found`,
      points: pts,
    })
  } else {
    factors.push({
      label:  'All critical fields present',
      impact: 'positive',
      detail: 'Submission methods, fax, portal, PA form and urgent phone all on record',
      points: 0,
    })
  }

  // ── Factor 2: conflicts ───────────────────────────────────────────────────
  const conflicted = fields.filter(f => f.status === 'conflicted')
  if (conflicted.length > 0) {
    const pts = Math.min(30, conflicted.length * 10)
    score += pts
    factors.push({
      label:  `${conflicted.length} conflicting field${conflicted.length > 1 ? 's' : ''}`,
      impact: 'negative',
      detail: conflicted.map(f => f.field.replace(/_/g, ' ')).join(', '),
      points: pts,
    })
  }

  // ── Factor 3: stale data ──────────────────────────────────────────────────
  const stale = fields.filter(f => f.status === 'stale')
  if (stale.length > 0) {
    const pts = Math.min(20, stale.length * 7)
    score += pts
    factors.push({
      label:  `${stale.length} stale field${stale.length > 1 ? 's' : ''}`,
      impact: 'negative',
      detail: 'Outdated sources — verification recommended',
      points: pts,
    })
  }

  // ── Factor 4: denial letter evidence ─────────────────────────────────────
  const allEvidence = fields.flatMap(f => f.evidence)
  const denialSources = new Set(
    allEvidence
      .filter(e => e.source_type === 'denial_letter')
      .map(e => e.source_id),
  )
  if (denialSources.size > 0) {
    const pts = Math.min(20, denialSources.size * 10)
    score += pts
    factors.push({
      label:  `${denialSources.size} denial letter${denialSources.size > 1 ? 's' : ''} on file`,
      impact: 'negative',
      detail: 'Prior denials increase the risk of future rejections',
      points: pts,
    })
  }

  // ── Factor 5: multiple submission paths (positive) ────────────────────────
  const methods = route.fields.submission_methods
  const methodCount = Array.isArray(methods?.bestValue) ? (methods.bestValue as string[]).length : 0
  if (methodCount >= 2) {
    score -= 8
    factors.push({
      label:  `${methodCount} submission methods`,
      impact: 'positive',
      detail: 'Multiple pathways reduce filing risk',
      points: -8,
    })
  }

  // ── Factor 6: drug-specific complexity ───────────────────────────────────
  if (drugName && route.drugFields[drugName]) {
    const drug = route.drugFields[drugName]
    let drugPts = 0
    const drugRisks: string[] = []

    if (drug.step_therapy_required?.bestValue === true) {
      drugPts += 12; drugRisks.push('step therapy required')
    }
    if (drug.biosimilar_required?.bestValue === true) {
      drugPts += 8; drugRisks.push('biosimilar required')
    }
    if (drug.biosimilar_attestation?.bestValue) {
      drugPts += 5; drugRisks.push('attestation language required')
    }
    const authMonths = Number(drug.auth_period_months?.bestValue)
    if (authMonths > 0 && authMonths <= 3) {
      drugPts += 5; drugRisks.push(`short auth period (${authMonths} mo)`)
    }

    if (drugPts > 0) {
      score += drugPts
      factors.push({
        label:  'Drug-specific requirements',
        impact: 'negative',
        detail: drugRisks.join(', '),
        points: drugPts,
      })
    } else {
      factors.push({
        label:  'No extra drug requirements',
        impact: 'positive',
        detail: `${drugName} has no step therapy or biosimilar hurdles`,
        points: 0,
      })
    }
  }

  const clamped = Math.max(0, Math.min(100, score))
  const level: RiskLevel =
    clamped >= 70 ? 'critical' :
    clamped >= 45 ? 'high'     :
    clamped >= 20 ? 'medium'   : 'low'

  return { score: clamped, level, factors }
}

// ── Serialise denial letter context for AI ───────────────────────────────────

export function denialContextForAI(sources: Source[]): string {
  const denials = sources.filter(s => s.source_type === 'denial_letter')
  if (denials.length === 0) return ''

  const lines: string[] = ['Denial letters on file:']
  for (const d of denials) {
    lines.push(`  Case: ${d.source_name} (${d.source_date})`)
    const data = d.data

    // Explicit denial reasons
    if (data.denial_reason) {
      lines.push(`    Denial reason: ${data.denial_reason}`)
    }
    if (Array.isArray(data.denial_reasons)) {
      lines.push(`    Denial reasons:`)
      ;(data.denial_reasons as string[]).forEach(r => lines.push(`      - ${r}`))
    }

    // Form / documentation notes
    if (data.pa_form_note)              lines.push(`    Form note: ${data.pa_form_note}`)
    if (data.chart_note_policy_update)  lines.push(`    Chart note policy updated: ${data.chart_note_policy_update}`)

    // Appeal contacts + deadline
    if (data.appeal_deadline_days) lines.push(`    Appeal deadline: ${data.appeal_deadline_days} days`)
    if (data.appeal_fax)           lines.push(`    Appeal fax: ${data.appeal_fax}`)
    if (data.appeal_phone)         lines.push(`    Appeal phone: ${data.appeal_phone}`)
    if (data.appeal_mail)          lines.push(`    Appeal mail: ${data.appeal_mail}`)
  }

  return lines.join('\n')
}

// ── Serialise route data for AI context ──────────────────────────────────────

export function routeSummaryForAI(route: ReconciledRoute, drugName?: string | null): string {
  const lines: string[] = [`Payer: ${route.payer}`, `Last updated: ${route.lastUpdated}`]

  for (const [key, field] of Object.entries(route.fields)) {
    lines.push(`  ${key}: ${JSON.stringify(field.bestValue)} [${field.status}, ${field.confidence}% confidence]`)
  }

  if (drugName && route.drugFields[drugName]) {
    lines.push(`\nDrug: ${drugName}`)
    for (const [key, field] of Object.entries(route.drugFields[drugName])) {
      lines.push(`  ${key}: ${JSON.stringify(field.bestValue)} [${field.status}]`)
    }
  }

  const risk = estimateRisk(route, drugName)
  lines.push(`\nRisk: ${risk.level} (score ${risk.score}/100)`)

  return lines.join('\n')
}
