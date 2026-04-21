import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import fs   from 'fs'
import path from 'path'
import { reconciledRoutes, routeData } from '@/lib/data'
import { routeSummaryForAI, denialContextForAI, estimateRisk } from '@/lib/risk'

const SYSTEM_PROMPT = `You are a PA (Prior Authorization) routing assistant for Ruma Care, a specialty pharmacy.
You have detailed knowledge of payer routing data including submission methods, fax numbers, portal URLs, phone numbers, turnaround times, and drug-specific requirements.

FORMATTING RULES — follow strictly:
- Never use markdown syntax: no **, no *, no #, no _underscores_, no backticks
- Never use bullet points with - or * — write lists as numbered lines (1. 2. 3.) or as plain sentences
- Use plain text only. Short paragraphs separated by blank lines are fine.
- Be concise. Clinic workers are busy.

You can:
- Answer questions about any payer's PA routing requirements
- Explain risk assessments and what the score means
- Compare two or more payers side-by-side
- Advise on the best submission pathway for a given payer
- Explain what fields like step therapy, biosimilar requirements, or chart note windows mean
- Explain why a PA was likely denied and what to fix before resubmitting
- Walk through an appeal step-by-step (deadline, where to send, what to include)
- Compare an approved case vs a denied case and highlight what was different

When analyzing a denial:
1. Start with the explicit denial reason from the denial letter if one is on file
2. Cross-reference against the drug-specific requirements (step therapy, biosimilar trial, attestation, form version)
3. Check for documentation issues — outdated chart notes, wrong PA form version, missing biosimilar trial records
4. Tell the user exactly what to fix and resubmit
5. Provide appeal contact info and deadline if available

Guidelines:
- Be concise and practical — clinic workers are busy
- When mentioning phone numbers, fax numbers or URLs, format them clearly
- Risk score: 0–19 = low, 20–44 = medium, 45–69 = high, 70+ = critical
- If asked to "generate a PDF" or "download", tell them to use the Export PDF button in the top-right of the payer panel
- Never fabricate field values — only report what is in the provided context
- When comparing payers, highlight the most actionable differences first`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('ANTHROPIC_API_KEY not set', { status: 500 })

  let body: { messages: { role: string; content: string }[]; payerKey?: string; drugName?: string }
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { messages, payerKey, drugName } = body

  // ── Build context ──────────────────────────────────────────────────────────

  const contextLines: string[] = []

  // Current payer details
  if (payerKey && reconciledRoutes[payerKey]) {
    const route   = reconciledRoutes[payerKey]
    const rawPayer = routeData[payerKey]
    contextLines.push('=== CURRENTLY SELECTED PAYER ===')
    contextLines.push(routeSummaryForAI(route, drugName))

    // Denial letter details: reasons, form notes, appeal contacts (from structured JSON)
    if (rawPayer?.sources) {
      const denialCtx = denialContextForAI(rawPayer.sources)
      if (denialCtx) {
        contextLines.push('')
        contextLines.push(denialCtx)
      }
    }

    // Full denial letter text (the original .txt file, which contains explicit denial reasons)
    const letterPath = path.join(process.cwd(), '..', payerKey, 'denial_letter.txt')
    if (fs.existsSync(letterPath)) {
      const letterText = fs.readFileSync(letterPath, 'utf-8')
      contextLines.push('\n=== FULL DENIAL LETTER ===')
      contextLines.push(letterText)
    }
  }

  // All available payers (condensed list for comparison questions)
  const payerList = Object.entries(reconciledRoutes)
    .map(([key, route]) => {
      const risk = estimateRisk(route)
      return `${route.payer} (key: ${key}, risk: ${risk.level}, score: ${risk.score})`
    })
    .join('\n')

  contextLines.push('\n=== ALL AVAILABLE PAYERS ===')
  contextLines.push(payerList)

  const systemWithContext = SYSTEM_PROMPT + '\n\n' + contextLines.join('\n')

  // ── Call Claude ────────────────────────────────────────────────────────────

  try {
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemWithContext,
      messages:   messages as { role: 'user' | 'assistant'; content: string }[],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(msg, { status: 500 })
  }
}
