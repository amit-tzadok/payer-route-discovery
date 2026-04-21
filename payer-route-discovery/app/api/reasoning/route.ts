import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { relativeDate } from '@/lib/reconciler'
import { formatFieldValue } from '@/lib/data'
import { LANGUAGE_NAMES, type LanguageCode } from '@/lib/language'

// Source type names for the prompt
const SOURCE_NAMES: Record<string, string> = {
  denial_letter:    'Denial Letter',
  phone_transcript: 'Phone Call',
  web_page:         'Web Page',
  provider_manual:  'Provider Manual',
}

function buildPrompt(
  fieldLabel: string,
  fieldKey: string,
  payerName: string,
  evidence: Array<{
    source_type: string
    source_date: string
    source_name: string
    value: unknown
    isDeprecated: boolean
  }>,
  status: string,
  language: LanguageCode,
): string {
  const sorted = [...evidence].sort((a, b) => {
    const trust: Record<string, number> = {
      denial_letter: 4, phone_transcript: 3, web_page: 2, provider_manual: 1,
    }
    return (trust[b.source_type] ?? 0) - (trust[a.source_type] ?? 0)
  })

  const lines = sorted.map(e => {
    const type = SOURCE_NAMES[e.source_type] ?? e.source_type
    const tag  = e.isDeprecated ? ' [DEPRECATED — ignore this value]' : ''
    return `  • ${type} (${relativeDate(e.source_date)}): ${formatFieldValue(fieldKey, e.value)}${tag}`
  })

  const statusNote = status === 'conflicted'
    ? 'Note: active sources disagree on this field.'
    : status === 'stale'
    ? 'Note: all data is over a year old.'
    : ''

  const langInstruction = language !== 'en'
    ? `\nIMPORTANT: Write your entire response in ${LANGUAGE_NAMES[language]}.`
    : ''

  return `You are helping an infusion clinic ops team understand a prior authorization detail.

Field: "${fieldLabel}"
Payer: ${payerName}

Sources found (sorted by reliability):
${lines.join('\n')}

Trust order: Denial Letter > Phone Call > Web Page > Provider Manual
${statusNote}

In 1–2 sentences, explain which value to use and why. Be direct and practical — this is for clinic staff filing PA requests. Do not repeat the field name or payer name.${langInstruction}`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY not set', { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (
    typeof body !== 'object' || body === null ||
    !('fieldLabel' in body) || !('fieldKey' in body) ||
    !('payerName' in body) || !('evidence' in body) || !('status' in body)
  ) {
    return new Response('Missing required fields', { status: 400 })
  }

  const { fieldLabel, fieldKey, payerName, evidence, status, language = 'en' } =
    body as { fieldLabel: string; fieldKey: string; payerName: string; evidence: unknown[]; status: string; language?: LanguageCode }

  const anthropic = new Anthropic({ apiKey })
  const encoder   = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 120,
          system:     language !== 'en'
            ? `You are a concise prior authorization expert. Always respond in ${LANGUAGE_NAMES[language]} with 1–2 sentences. You may use **bold** for key values or action words, but no other markdown.`
            : 'You are a concise prior authorization expert. Always respond in plain English with 1–2 sentences. You may use **bold** for key values or action words, but no other markdown.',
          messages:   [{ role: 'user', content: buildPrompt(fieldLabel, fieldKey, payerName, evidence as never, status, language) }],
        })

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(`[Error: ${msg}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
