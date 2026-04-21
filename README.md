# Payer Route Discovery

A tool for infusion clinic ops teams to look up how to submit a prior authorization for any payer + drug combination — and to know how much to trust what they're looking at.

Built as a take-home project for Ruma Care.

---

## The problem

Before an infusion clinic can submit a prior authorization, they need to know *how* to submit it: which fax number, which portal, what forms, what documentation window. That information is scattered across provider manuals, payer websites, phone calls, and denial letters — and it changes constantly. A fax number that worked last month might be dead today. Different sources contradict each other. There's no single source of truth.

This tool reconciles conflicting source data into a single best-guess route per payer, shows you how confident it is in each field, and lets you see exactly why when something looks uncertain.

---

## Quick start

```bash
npm install
cp .env.local.example .env.local   # paste your Anthropic API key
npm run dev                         # opens at http://localhost:3000
```

The app works without an API key — the AI features (conflict explanations and the PA Assistant chat) just won't respond. Everything else is fully functional.

---

## Features

### Dashboard
The home screen shows all five payers at a glance — overall confidence status, risk score, turnaround times, and submission methods. A **Tasks** sidebar lets you track pending PAs, appeals, and follow-ups grouped by urgency (Overdue / Today / This Week / Upcoming). Tasks persist across sessions.

### Payer detail
Select a payer (and optionally filter by drug) to see the full submission route. Each field — fax number, portal URL, PA form, turnaround time, etc. — shows:

- **The best known value**, chosen by weighing source type and recency
- **A confidence badge** (Verified / Likely / Conflict / Stale) and how old the data is
- **An evidence drawer** (click any field) showing every source that reported a value, when, and why the system picked the one it did. If an API key is set, Claude streams a plain-English explanation of any conflict.

You can also **manually override** any field if you've verified something independently. The override shows an "Overridden" badge for the session.

Other things in the detail view:
- **Risk panel** — scores the overall route 0–100 based on conflict density, data staleness, submission method reliability, and turnaround times
- **Approval history** — a quarterly chart showing non-denial vs. denial-letter source events over time, sized to match the risk panel
- **Risk Overview** — a nav bar toggle that shows a multi-payer risk bar chart so you can compare risk scores across all payers at once
- **Export** — download the full reconciled route as JSON

### Adding sources
Click **Add Source** in the payer header to upload or paste a new document (denial letter, phone transcript, provider manual, or web page). Claude automatically extracts all routing fields from it, shows you a preview of what was found, and immediately re-reconciles the payer with the new evidence included. Sources added this way persist in the browser session.

### Adding payers and drugs
Custom payers can be added from the sidebar. Drug-specific requirements (step therapy, biosimilar rules, auth period) can be added per payer — they show up as a separate drug-specific section in the detail view.

### PA Assistant
A floating chat widget (bottom-right corner) lets you ask free-form questions about a payer — "why was this PA denied?", "how do I appeal?", "what's the risk level?" — with payer and drug context automatically passed to Claude. Quick-prompt buttons appear when you first open it for the current payer.

### Payer comparison
The **Compare** button in the nav bar opens a side-by-side field-by-field comparison of the current payer against any other. Rows where the two payers differ are highlighted in amber, with a difference count in the header. The second payer is selectable from a dropdown inside the modal.

### Multilingual sources
When you upload or paste a source document, Claude extracts fields regardless of what language the document is in. Spanish, French, Mandarin, Portuguese, and others are supported. Field values are normalized into English (e.g. "sí" → true, "17 de abril de 2026" → 2026-04-17), while proper nouns like payer names, drug names, and phone numbers are preserved exactly. The detected language is stored on the source record.

### UI language
The interface itself supports English, Spanish, French, Mandarin, and Portuguese — toggle in the top right.

### Keyboard shortcuts
`Cmd+/` opens the shortcuts reference. `Cmd+K` focuses search.

---

## How it decides what to trust

Every source gets a trust score based on two things: **source type** and **recency**.

| Source | Base trust | Reasoning |
|---|---|---|
| Denial Letter | 4 / 4 | The payer enforcing their own policy on a real case. Ground truth. |
| Phone Transcript | 3 / 4 | Real-time, but only as reliable as the individual rep. |
| Web Page | 2 / 4 | Official, but often lags behind internal policy changes. |
| Provider Manual | 1 / 4 | Annual update cycle — operationally stale within months. |

Recency multiplies the trust score down as data ages — a phone transcript from last week is weighted much higher than one from two years ago.

The highest-scoring active source wins. Then the field gets a status:

| Status | What it means |
|---|---|
| **Verified** | Two or more independent sources agree |
| **Likely** | One recent source, nothing contradicting it |
| **Conflict** | Active sources disagree on the value |
| **Stale** | The best available source is over a year old |

One extra mechanism: **tombstoning**. If a source says "fax number X is no longer active" and gives a new one, the old value is flagged as deprecated before conflict analysis runs. This prevents a denial letter correctly updating a fax number from being treated as a conflict with older sources that still show the dead number.

---

## Running the reconciliation pipeline (CLI)

The same reconciliation logic runs as a standalone CLI — no UI needed. Useful if you want to pipe the output into another system.

```bash
npm run reconcile                           # all payers → stdout JSON
npm run reconcile -- --payer aetna --pretty # one payer, formatted
npm run reconcile -- --out results.json     # write to file
```

Output is structured JSON with a `summary` block (field counts by status) and a `payers` block with reconciled fields, drug-specific requirements, and a `conflicts` array listing every disagreement and what was overruled.

The UI and the CLI share the same core reconciler (`lib/reconciler.ts`). In production, downstream systems — a CRM, an EMR, a Slack alert bot — could consume the CLI output directly without going through the UI.

---

## With more time

- **Password-protected PDF export** — the current export produces a JSON file. Given that payer routing data is operationally sensitive, I'd like to add a PDF export option with password protection so exported reports can't be opened by unintended recipients. This would require a server-side PDF library (e.g. `pdf-lib`) since browsers can't natively write encrypted PDFs.
