import rawData from '../data/extracted_route_data.json'
import type { RouteData, ReconciledRoute } from './types'
import { reconcilePayer } from './reconciler'

export const routeData = rawData as unknown as RouteData

export const PAYERS = Object.keys(routeData)

// Pre-reconcile all payers once at module load — source data is static JSON
export const reconciledRoutes: Record<string, ReconciledRoute> =
  Object.fromEntries(
    Object.keys(routeData).map(k => [k, reconcilePayer(routeData[k], k)])
  )

export function getPayerDisplayName(key: string): string {
  return routeData[key]?.payer ?? key
}

// Human-readable field labels
export const FIELD_LABELS: Record<string, string> = {
  submission_methods:       'Submission Methods',
  fax_number:               'Fax Number',
  portal_url:               'Portal',
  pa_form:                  'PA Form',
  chart_note_window_days:   'Chart Note Window',
  turnaround_standard_days: 'Standard Turnaround',
  turnaround_fax_days:      'Fax Turnaround',
  turnaround_urgent_hours:  'Urgent Turnaround',
  phone_urgent:             'Urgent Phone',
  phone_status_only:        'Status Phone',
  step_therapy_required:    'Step Therapy Required',
  biosimilar_required:      'Biosimilar Required',
  biosimilar_preferred:     'Biosimilar Preferred',
  biosimilar_attestation:   'Biosimilar Attestation',
  auth_period_months:       'Auth Period',
  notes:                    'Notes',
}

// Section groupings for the route panel
export const ROUTE_SECTIONS: { label: string; fields: string[] }[] = [
  {
    label: 'Submission',
    fields: ['submission_methods'],
  },
  {
    label: 'Contact',
    fields: ['fax_number', 'portal_url', 'phone_urgent', 'phone_status_only'],
  },
  {
    label: 'Documentation',
    fields: ['pa_form', 'chart_note_window_days'],
  },
  {
    label: 'Timelines',
    fields: ['turnaround_standard_days', 'turnaround_fax_days', 'turnaround_urgent_hours'],
  },
]

export const DRUG_SECTIONS: { label: string; fields: string[] }[] = [
  {
    label: 'Requirements',
    fields: [
      'step_therapy_required',
      'biosimilar_required',
      'biosimilar_preferred',
      'biosimilar_attestation',
      'auth_period_months',
    ],
  },
  {
    label: 'Notes',
    fields: ['notes'],
  },
]

// Value formatters
export function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) {
    return value
      .map(v =>
        String(v)
          .replace(/_/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase()),
      )
      .join(' · ')
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (field.endsWith('_days'))   return typeof value === 'number' ? `${value} days` : String(value)
  if (field.endsWith('_hours'))  return typeof value === 'number' ? `${value} hrs`  : String(value)
  if (field.endsWith('_months')) return typeof value === 'number' ? `${value} months` : String(value)
  return String(value)
}
