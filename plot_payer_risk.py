"""
Payer Risk Heatmap
==================
Dual-panel matplotlib figure:
  Top:    colour-map strip – each payer bar coloured by its risk score
          (plasma palette: yellow = low risk → dark purple = high risk)
  Bottom: line chart of the same risk scores

Usage:
    python plot_payer_risk.py                  # shows window
    python plot_payer_risk.py --save           # saves payer_risk.png
"""

import json
import argparse
from datetime import datetime, date
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import matplotlib.cm as cm


# ── Load data ──────────────────────────────────────────────────────────────────

DATA_FILE = Path(__file__).parent / "payer-route-discovery/data/extracted_route_data.json"
with open(DATA_FILE) as f:
    raw = json.load(f)

TODAY = date.today()

# ── Risk scoring (mirrors lib/risk.ts logic) ───────────────────────────────────

CRITICAL_FIELDS = {"submission_methods", "fax_number", "portal_url", "pa_form", "phone_urgent"}
STALE_DAYS = {
    "denial_letter":   730,
    "phone_transcript": 180,
    "web_page":         270,
    "provider_manual":  365,
}


def days_since(iso_date: str) -> int:
    try:
        d = date.fromisoformat(iso_date)
        return (TODAY - d).days
    except (ValueError, TypeError):
        return 9999


def compute_risk(payer_key: str, payer_data: dict) -> dict:
    """Return dict with score (0-100), level, and breakdown."""
    sources   = payer_data["sources"]
    score     = 0
    breakdown = {}

    # All field keys present across sources
    present_fields: set[str] = set()
    for src in sources:
        for key in src.get("data", {}):
            if key != "drugs":
                present_fields.add(key)

    missing_critical = CRITICAL_FIELDS - present_fields
    miss_pts = len(missing_critical) * 10
    score += miss_pts
    breakdown["missing_critical"] = miss_pts

    # Denial-letter penalty
    denials    = [s for s in sources if s["source_type"] == "denial_letter"]
    denial_pts = min(20, len(denials) * 10)
    score += denial_pts
    breakdown["denials"] = denial_pts

    # Stale-source penalty
    stale_pts = 0
    for src in sources:
        threshold = STALE_DAYS.get(src["source_type"], 365)
        if days_since(src["source_date"]) > threshold:
            stale_pts += 7
    stale_pts = min(20, stale_pts)
    score += stale_pts
    breakdown["stale"] = stale_pts

    # Drug-complexity penalty
    drug_pts = 0
    for src in sources:
        for drug_info in src.get("data", {}).get("drugs", {}).values():
            if drug_info.get("step_therapy_required"):
                drug_pts += 12
            if drug_info.get("biosimilar_required"):
                drug_pts += 8
            months = drug_info.get("auth_period_months", 0)
            if months and 0 < months <= 3:
                drug_pts += 5
    drug_pts = min(30, drug_pts)
    score += drug_pts
    breakdown["drug_complexity"] = drug_pts

    # Multiple submission methods → bonus
    methods: list = []
    for src in sources:
        m = src.get("data", {}).get("submission_methods", [])
        if isinstance(m, list):
            methods.extend(m)
    if len(set(methods)) >= 2:
        score -= 8
        breakdown["multi_method_bonus"] = -8

    clamped = max(0, min(100, score))
    level   = (
        "critical" if clamped >= 70 else
        "high"     if clamped >= 45 else
        "medium"   if clamped >= 20 else
        "low"
    )
    return {"payer": payer_data["payer"], "score": clamped, "level": level, **breakdown}


results = [compute_risk(k, v) for k, v in raw.items()]
results.sort(key=lambda r: r["score"])          # ascending left → right

payer_labels  = [r["payer"] for r in results]
scores        = np.array([r["score"] for r in results])
n             = len(scores)

# ── Colour mapping ─────────────────────────────────────────────────────────────

cmap    = cm.plasma                             # yellow/orange → purple → dark blue
norm    = mcolors.Normalize(vmin=0, vmax=100)
colours = [cmap(norm(s)) for s in scores]

# ── Figure layout ──────────────────────────────────────────────────────────────

fig, (ax_strip, ax_line) = plt.subplots(
    2, 1,
    figsize=(10, 4.5),
    gridspec_kw={"height_ratios": [1, 4], "hspace": 0.06},
)
fig.patch.set_facecolor("white")

# ── Top panel: colour strip ────────────────────────────────────────────────────

bar_w = 0.9
for i, (col, score_val) in enumerate(zip(colours, scores)):
    ax_strip.bar(i, 1, width=bar_w, color=col, align="center")

ax_strip.set_xlim(-0.5, n - 0.5)
ax_strip.set_ylim(0, 1)
ax_strip.set_xticks([])
ax_strip.set_yticks([])
ax_strip.spines["top"].set_visible(False)
ax_strip.spines["right"].set_visible(False)
ax_strip.spines["left"].set_visible(False)

# Annotate score inside each bar
for i, s in enumerate(scores):
    ax_strip.text(i, 0.5, str(int(s)),
                  ha="center", va="center",
                  fontsize=8, fontweight="bold",
                  color="white" if s > 30 else "black")

# ── Bottom panel: risk-score line chart ────────────────────────────────────────

xs = np.arange(n)

ax_line.plot(xs, scores, color="#4a90d9", linewidth=2, marker="o",
             markersize=7, markerfacecolor="white", markeredgewidth=2,
             markeredgecolor="#4a90d9", zorder=3)

# Colour-coded markers on the line
for i, (x, s) in enumerate(zip(xs, scores)):
    ax_line.plot(x, s, "o", markersize=10,
                 color=colours[i], markeredgecolor="#333", markeredgewidth=0.8,
                 zorder=4)

# Horizontal risk-level bands
band_defs = [
    (0,  20, "#d1fae5", "Low"),
    (20, 45, "#fef3c7", "Medium"),
    (45, 70, "#fed7aa", "High"),
    (70, 100, "#fee2e2", "Critical"),
]
for lo, hi, colour, lbl in band_defs:
    ax_line.axhspan(lo, hi, color=colour, alpha=0.35, zorder=0)
    ax_line.text(-0.45, (lo + hi) / 2, lbl,
                 fontsize=7, va="center", color="#888", style="italic")

# Axes decoration
ax_line.set_xlim(-0.5, n - 0.5)
ax_line.set_ylim(0, 105)
ax_line.set_xticks(xs)
ax_line.set_xticklabels(payer_labels, fontsize=8.5, rotation=15, ha="right")
ax_line.set_ylabel("Risk Score (0–100)", fontsize=9)
ax_line.set_yticks([0, 20, 45, 70, 100])
ax_line.spines["top"].set_visible(False)
ax_line.spines["right"].set_visible(False)
ax_line.tick_params(axis="both", labelsize=8)
ax_line.grid(axis="y", linestyle="--", linewidth=0.5, alpha=0.4, zorder=1)

# ── Colourbar legend ───────────────────────────────────────────────────────────

sm = cm.ScalarMappable(cmap=cmap, norm=norm)
sm.set_array([])
cbar = fig.colorbar(sm, ax=ax_strip, orientation="vertical",
                    fraction=0.03, pad=0.01)
cbar.set_label("Risk Score", fontsize=7)
cbar.ax.tick_params(labelsize=7)

# ── Title ──────────────────────────────────────────────────────────────────────

fig.suptitle("Payer PA Risk Overview", fontsize=12, fontweight="bold", y=0.98)

# ── Output ─────────────────────────────────────────────────────────────────────

parser = argparse.ArgumentParser()
parser.add_argument("--save", action="store_true", help="Save to payer_risk.png")
args, _ = parser.parse_known_args()

if args.save:
    out = Path(__file__).parent / "payer_risk.png"
    fig.savefig(out, dpi=150, bbox_inches="tight")
    print(f"Saved → {out}")
else:
    plt.show()
