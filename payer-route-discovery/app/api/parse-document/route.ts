import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

// ── System prompt ─────────────────────────────────────────────────────────────
// Tells Claude to operate as a multilingual PA specialist regardless of
// what language the uploaded document is written in.

const SYSTEM_PROMPT = `You are a multilingual medical billing specialist who extracts prior authorization (PA) routing data from insurance payer documents.

You work fluently with documents in any language — English, Spanish, French, Portuguese, Chinese, and others. When a document is not in English, translate field values into English where applicable (e.g. boolean answers, source type labels) but preserve proper nouns like payer names, drug names, rep names, and phone numbers exactly as written.

Rules:
- Always output ONLY valid JSON. No markdown fences, no explanation, no text outside the JSON object.
- Normalize all dates to ISO 8601 (YYYY-MM-DD). Handle formats like "17 de abril de 2026", "April 17, 2026", "17/04/2026", "2026-04-17", etc.
- Normalize phone/fax numbers to a clean US format e.g. "(888) 267-3300". Keep extension suffixes like "ext. 3" or "Option 2".
- For boolean fields: map any affirmative phrase in any language to true (sí, oui, yes, 是, sim, required, requerido, obligatoire, etc.) and negative phrases to false.
- Infer sourceType from document structure and content cues in any language:
    denial_letter    → carta de denegación, lettre de refus, 拒绝信
    phone_transcript → transcripción de llamada, notes d'appel, 电话记录, call notes, rep call
    web_page         → página web guardada, page web, 网页
    provider_manual  → manual del proveedor, guide du prestataire, 提供者手册
- Use null for any field you cannot confidently extract.`

// ── Extraction prompts ────────────────────────────────────────────────────────

const PAYER_PROMPT = `Extract prior authorization routing information from the document above.
The document may be in any language — extract and normalize all values into the JSON structure below.

Return ONLY this JSON object. Use null for any field not found.

{
  "payerName": string | null,
  "submissionMethods": string[],
  "faxNumber": string | null,
  "portalUrl": string | null,
  "phoneUrgent": string | null,
  "phoneStatusOnly": string | null,
  "paForm": string | null,
  "chartNoteWindowDays": number | null,
  "turnaroundStandardDays": number | null,
  "turnaroundUrgentHours": number | null,
  "sourceType": "denial_letter" | "phone_transcript" | "web_page" | "provider_manual",
  "sourceName": string | null,
  "sourceDate": string | null,
  "detectedLanguage": string | null
}

Field notes:
- submissionMethods: array of zero or more values from ["fax", "portal", "phone", "mail"]. Map equivalents in other languages: "fax"→fax, "portal/web"→portal, "teléfono/llame"→phone, "correo/mail"→mail.
- phoneUrgent: phone number for urgent / expedited PA calls.
- phoneStatusOnly: phone number only for checking PA status.
- paForm: PA form name, number, or identifier if mentioned.
- chartNoteWindowDays: how many days of chart notes are required (extract integer only).
- turnaroundStandardDays: standard PA decision timeline in days.
- turnaroundUrgentHours: urgent/expedited PA timeline in hours.
- sourceName: the call reference number, rep name/ID, document title, or URL — whatever best identifies the source.
- sourceDate: date of the call, letter, or document in YYYY-MM-DD. Normalize from any date format or language.
- detectedLanguage: BCP-47 language code of the document (e.g. "en", "es", "fr", "zh", "pt").`

const SOURCE_PROMPT = `Extract ALL prior authorization routing data from this document, including denial-specific details.

Return ONLY this JSON object. Use null for any field not found.

{
  "sourceType": "denial_letter" | "phone_transcript" | "web_page" | "provider_manual",
  "sourceName": string | null,
  "sourceDate": string | null,
  "detectedLanguage": string | null,
  "data": {
    "submission_methods": string[] | null,
    "fax_number": string | null,
    "fax_number_old": string | null,
    "fax_old_status": string | null,
    "portal_url": string | null,
    "pa_form": string | null,
    "pa_form_note": string | null,
    "chart_note_window_days": number | null,
    "chart_note_policy_update": string | null,
    "turnaround_standard_days": number | null,
    "turnaround_urgent_hours": number | null,
    "phone_urgent": string | null,
    "phone_status_only": string | null,
    "denial_reason": string | null,
    "denial_reasons": string[] | null,
    "appeal_fax": string | null,
    "appeal_phone": string | null,
    "appeal_mail": string | null,
    "appeal_deadline_days": number | null,
    "drugs": {
      "[drugName]": {
        "step_therapy_required": boolean | null,
        "biosimilar_required": boolean | null,
        "biosimilar_preferred": boolean | null,
        "biosimilar_attestation": string | null,
        "auth_period_months": number | null,
        "notes": string | null
      }
    } | null
  }
}

Field notes:
- sourceType: infer from document structure. Hint may be provided — trust it unless contradicted.
- sourceName: the most specific identifier — case reference, rep name/ID, document title, or URL.
- sourceDate: date of the call, letter, or document in YYYY-MM-DD.
- submission_methods: array of zero or more from ["fax", "portal", "phone", "mail"].
- fax_number_old: only include if the document explicitly marks a fax as deprecated/old.
- denial_reason: use for a single sentence reason; use denial_reasons (array) if multiple distinct reasons listed.
- drugs: include one entry per drug name mentioned with any requirements. Use null if no drugs mentioned.
- detectedLanguage: BCP-47 code (e.g. "en", "es", "fr").`

const DRUG_PROMPT = `Extract drug-specific prior authorization requirements from the document above.
The document may be in any language — extract and normalize all values into the JSON structure below.

Return ONLY this JSON object. Use null for any field not found.

{
  "drugName": string | null,
  "stepTherapyRequired": boolean,
  "biosimilarRequired": boolean,
  "biosimilarPreferred": boolean,
  "biosimilarAttestation": string | null,
  "authPeriodMonths": number | null,
  "notes": string | null,
  "sourceType": "denial_letter" | "phone_transcript" | "web_page" | "provider_manual",
  "sourceDate": string | null,
  "detectedLanguage": string | null
}

Field notes:
- stepTherapyRequired: true if the document states step therapy / terapia escalonada / thérapie par étapes is required before this drug is covered.
- biosimilarRequired: true if a biosimilar must be tried first.
- biosimilarPreferred: true if a biosimilar is preferred (but not strictly required).
- biosimilarAttestation: the exact attestation language the prescriber must sign (translate to English if needed).
- authPeriodMonths: authorization validity period in months (convert weeks or years to months).
- notes: any other PA requirements or clinical criteria mentioned (in English).
- sourceDate: normalize to YYYY-MM-DD from any format or language.
- detectedLanguage: BCP-47 language code of the document.`

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('ANTHROPIC_API_KEY not set', { status: 500 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return new Response('Expected multipart/form-data', { status: 400 })
  }

  const file           = formData.get('file') as File | null
  const mode           = (formData.get('mode') as string | null) ?? 'payer'
  const hintSourceType = (formData.get('hintSourceType') as string | null) ?? ''

  if (!file) return new Response('No file provided', { status: 400 })

  const maxBytes = 20 * 1024 * 1024 // 20 MB
  if (file.size > maxBytes) {
    return new Response('File too large (max 20 MB)', { status: 413 })
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  const bytes = await file.arrayBuffer()

  type DocSource = { type: 'base64'; media_type: 'application/pdf'; data: string }
  type Content  =
    | { type: 'document'; source: DocSource }
    | { type: 'text'; text: string }

  const content: Content[] = []

  if (isPdf) {
    const base64 = Buffer.from(bytes).toString('base64')
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    })
  } else {
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    content.push({ type: 'text', text: `Document content:\n\n${decoded}` })
  }

  let prompt = PAYER_PROMPT
  if (mode === 'drug')   prompt = DRUG_PROMPT
  if (mode === 'source') prompt = hintSourceType
    ? `The user has indicated this is a "${hintSourceType}" document. ${SOURCE_PROMPT}`
    : SOURCE_PROMPT
  content.push({ type: 'text', text: prompt })

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      // Use Sonnet for better multilingual accuracy on complex documents
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: content as never }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // Strip optional markdown fences and extract the JSON object
    const cleaned   = raw.replace(/```(?:json)?\n?/g, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response('Model returned no JSON object', { status: 422 })
    }

    // Validate it is parseable before forwarding
    JSON.parse(jsonMatch[0])

    return new Response(jsonMatch[0], {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(msg, { status: 500 })
  }
}
