'use client'

import { useMemo } from 'react'
import { estimateRisk, type RiskLevel } from '@/lib/risk'
import type { ReconciledRoute } from '@/lib/types'

interface Props {
  routes:          Record<string, ReconciledRoute>
  selectedDrug?:   string | null
  onPayerClick?:   (payerKey: string) => void
}

// ── Plasma colormap (matches matplotlib's plasma) ──────────────────────────────
const PLASMA: [number, number, number][] = [
  [13,  8,   135],
  [84,  2,   163],
  [139, 10,  165],
  [185, 50,  137],
  [219, 92,  104],
  [244, 136, 73],
  [254, 188, 43],
  [240, 249, 33],
]

function plasma(score: number): string {
  const t = Math.max(0, Math.min(100, score)) / 100
  const n = PLASMA.length - 1
  const i = Math.min(Math.floor(t * n), n - 1)
  const f = t * n - i
  const [r1, g1, b1] = PLASMA[i]
  const [r2, g2, b2] = PLASMA[i + 1]
  return `rgb(${Math.round(r1 + (r2 - r1) * f)},${Math.round(g1 + (g2 - g1) * f)},${Math.round(b1 + (b2 - b1) * f)})`
}

function textColor(score: number): string {
  // dark text for bright (high-score) colours, white for dark (low-score)
  return score >= 65 ? '#111' : '#fff'
}

const RISK_BANDS: { lo: number; hi: number; fill: string; label: string; level: RiskLevel }[] = [
  { lo: 0,  hi: 20,  fill: '#d1fae5', label: 'Low',      level: 'low'      },
  { lo: 20, hi: 45,  fill: '#fef3c7', label: 'Medium',   level: 'medium'   },
  { lo: 45, hi: 70,  fill: '#fed7aa', label: 'High',     level: 'high'     },
  { lo: 70, hi: 100, fill: '#fee2e2', label: 'Critical', level: 'critical' },
]

const LEVEL_DOT: Record<RiskLevel, string> = {
  low:      '#10b981',
  medium:   '#f97316',
  high:     '#ef4444',
  critical: '#991b1b',
}

// SVG layout constants
const W          = 640
const MARGIN_L   = 46
const MARGIN_R   = 16
const MARGIN_B   = 52
const STRIP_H    = 48
const GAP        = 12
const CHART_TOP  = STRIP_H + GAP
const CHART_H    = 180
const CHART_BOT  = CHART_TOP + CHART_H
const TOTAL_H    = CHART_BOT + MARGIN_B
const PLOT_W     = W - MARGIN_L - MARGIN_R

function yScale(score: number) {
  return CHART_TOP + CHART_H - (score / 100) * CHART_H
}

export default function PayerRiskChart({ routes, selectedDrug, onPayerClick }: Props) {
  const data = useMemo(() => {
    return Object.entries(routes)
      .map(([key, route]) => ({ key, route, ...estimateRisk(route, selectedDrug) }))
      .sort((a, b) => a.score - b.score)
  }, [routes, selectedDrug])

  const n    = data.length
  const step = PLOT_W / n
  const cx   = (i: number) => MARGIN_L + step * i + step / 2

  // Polyline points for the line
  const linePoints = data.map((d, i) => `${cx(i)},${yScale(d.score)}`).join(' ')

  return (
    <div className="bg-white rounded-xl border border-ruma-border overflow-hidden">
      {/* Title bar */}
      <div className="px-5 py-3 border-b border-ruma-border bg-gray-50 flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
          Payer Risk Overview
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          {RISK_BANDS.map(b => (
            <div key={b.label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: b.fill, border: '1px solid #ddd' }} />
              {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* SVG chart */}
      <div className="p-4">
        <svg
          viewBox={`0 0 ${W} ${TOTAL_H}`}
          width="100%"
          style={{ display: 'block' }}
          aria-label="Payer risk overview chart"
        >
          {/* ── Colour strip ─────────────────────────────────────────── */}
          {data.map((d, i) => (
            <g
              key={d.key}
              style={{ cursor: onPayerClick ? 'pointer' : 'default' }}
              onClick={() => onPayerClick?.(d.key)}
            >
              <rect
                x={MARGIN_L + step * i + 1}
                y={0}
                width={step - 2}
                height={STRIP_H}
                fill={plasma(d.score)}
                rx={3}
              />
              <text
                x={cx(i)}
                y={STRIP_H / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight="700"
                fill={textColor(d.score)}
              >
                {d.score}
              </text>
            </g>
          ))}

          {/* ── Risk-band backgrounds ─────────────────────────────────── */}
          {RISK_BANDS.map(b => {
            const y1 = yScale(b.hi)
            const y2 = yScale(b.lo)
            return (
              <rect
                key={b.label}
                x={MARGIN_L}
                y={y1}
                width={PLOT_W}
                height={y2 - y1}
                fill={b.fill}
                opacity={0.5}
              />
            )
          })}

          {/* ── Y-axis grid + labels ─────────────────────────────────── */}
          {[0, 20, 45, 70, 100].map(v => {
            const y = yScale(v)
            return (
              <g key={v}>
                <line
                  x1={MARGIN_L} y1={y} x2={MARGIN_L + PLOT_W} y2={y}
                  stroke="#d1d5db" strokeWidth={0.8} strokeDasharray="3 3"
                />
                <text
                  x={MARGIN_L - 5} y={y}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize={9} fill="#9ca3af"
                >
                  {v}
                </text>
              </g>
            )
          })}

          {/* ── Band labels (right-side italic) ──────────────────────── */}
          {RISK_BANDS.map(b => (
            <text
              key={b.label}
              x={MARGIN_L + 4}
              y={yScale((b.lo + b.hi) / 2)}
              dominantBaseline="middle"
              fontSize={9}
              fill="#9ca3af"
              fontStyle="italic"
            >
              {b.label}
            </text>
          ))}

          {/* ── Connecting line ───────────────────────────────────────── */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="#4a90d9"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* ── Dots + X-axis labels ──────────────────────────────────── */}
          {data.map((d, i) => {
            const x = cx(i)
            const y = yScale(d.score)
            const shortName = d.route.payer
              .replace('Blue Cross Blue Shield', 'BCBS')
              .replace('UnitedHealthcare', 'UHC')
            return (
              <g
                key={d.key}
                style={{ cursor: onPayerClick ? 'pointer' : 'default' }}
                onClick={() => onPayerClick?.(d.key)}
              >
                {/* outer ring */}
                <circle cx={x} cy={y} r={8} fill="white" stroke="#d1d5db" strokeWidth={1} />
                {/* coloured inner dot */}
                <circle
                  cx={x} cy={y} r={6}
                  fill={plasma(d.score)}
                  stroke={LEVEL_DOT[d.level]}
                  strokeWidth={1.5}
                />

                {/* X-axis payer label */}
                <text
                  x={x}
                  y={CHART_BOT + 10}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill="#374151"
                  fontWeight="500"
                >
                  {shortName.split(' ').map((word, wi) => (
                    <tspan key={wi} x={x} dy={wi === 0 ? 0 : 11}>{word}</tspan>
                  ))}
                </text>
              </g>
            )
          })}

          {/* ── Axes ─────────────────────────────────────────────────── */}
          <line
            x1={MARGIN_L} y1={CHART_TOP}
            x2={MARGIN_L} y2={CHART_BOT}
            stroke="#9ca3af" strokeWidth={1}
          />
          <line
            x1={MARGIN_L} y1={CHART_BOT}
            x2={MARGIN_L + PLOT_W} y2={CHART_BOT}
            stroke="#9ca3af" strokeWidth={1}
          />

          {/* Y-axis label */}
          <text
            x={10}
            y={CHART_TOP + CHART_H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill="#9ca3af"
            transform={`rotate(-90, 10, ${CHART_TOP + CHART_H / 2})`}
          >
            Risk Score (0–100)
          </text>
        </svg>
      </div>

      <p className="text-center text-[10px] text-gray-400 pb-3">
        Click a payer to view their routing details
      </p>
    </div>
  )
}
