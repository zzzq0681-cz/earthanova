# 04 — Synthetic Demo Data & Logic

## Why simulated data?
We are showcasing a concept tomorrow. Synthetic data allows a reliable, repeatable demo. **Never present it as real NASA observation, measured hazard, scientific proof, or an accurate forecast.**

## Demo location: Alexandria, Egypt
Coordinates: `31.20, 29.92` (approximate).  
Suggested area: **demo buffer around clicked coordinates**; do not claim a precise municipal boundary without geospatial data.

## One consistent sample case
The following values are **invented for the demonstration**. The UI may use these exact sample numbers, with consistent units and periods.

| Indicator | Before: 2019–2023 average | After: 2024–2025 average | Displayed change |
|---|---:|---:|---:|
| Average temperature | 24.0 °C | 25.4 °C | **+1.4 °C** |
| Annual rainfall | 200 mm | 184 mm | **−8%** |
| Vegetation cover (relative index) | 0.50 | 0.55 | **+10%** |
| Built-up area (relative index) | 100 | 117 | **+17%** |

**Important:** Before and After windows have unequal lengths, so the UI must label them as averages and not imply identical sample counts. These values illustrate change, not climatological significance.

### Clear demo finding
**“In this simulated scenario, the selected area shows higher average temperature (+1.4 °C) and lower rainfall (−8%) compared with the previous baseline. Further observation and independent datasets would be needed to establish a real trend.”**

### Human Intelligence cards
- **Solar potential:** `Potential to investigate` — not “approved for investment.”
- **Climate indicator:** `Review recommended` — not “real disaster risk.”
- **Family living:** `Not evaluated in MVP` — do not invent 78% without education/health/transport datasets.

### 5-year scenario (illustrative, 2026–2030)
Use a simple consistent curve such as:

| Year | Baseline demo temperature |
|---|---:|
| 2026 | 25.6 °C |
| 2027 | 25.8 °C |
| 2028 | 26.1 °C |
| 2029 | 26.3 °C |
| 2030 | 26.6 °C |

Scenario buttons: **Best Case**, **Baseline**, **Stress Case**. For demo mechanics, use small deterministic adjustments to this series (e.g. −0.3 °C / 0 / +0.4 °C by 2030, interpolated over the horizon), labeled “illustrative”, not scientifically modeled outcomes.

### Four virtual stations
| Station | Name | Source of displayed data | Demo state |
|---|---|---|---|
| T-01 | Climate Sentinel | Synthetic temperature | Finding |
| T-02 | Hydro Watch | Synthetic rainfall | Finding |
| T-03 | Land Guardian | Synthetic vegetation | Monitoring |
| T-04 | Hazard Watch | Synthetic risk marker | Review flag |

Example in-app alert: **“Demo watch: coastal exposure — inspect local flood-risk data before drawing conclusions.”**

## Interaction cases (small state machine)
```text
idle
 → location_selected
 → scan_preparing
 → scanning
 → results_ready
 ↘ change_location → location_selected
```

### Rules
1. One source-of-truth object per demo location for all cards, chart series, summaries and alerts.
2. Selecting Alexandria shows its predefined case; for other locations use a separate preset case or a clearly labeled generated sample.
3. Never generate a random value on each render (numbers must not jump when switching tabs).
4. If no demo data exists for a clicked point, show **“Custom area selected — sample analysis available”** and generate one stable demo case from the coordinates.
5. Scanning animation ends before the dashboard claims completed results.
6. Distinguish **observed value** (none in this MVP), **synthetic data**, **illustrative projection**, and **suggested next action**.

## Minimal in-memory JSON structure
```json
{
  "location": {"name": "Alexandria, Egypt", "lat": 31.2, "lon": 29.92},
  "demo": true,
  "baseline": "2019–2023 average",
  "current": "2024–2025 average",
  "metrics": {
    "temperature": {"before": 24.0, "after": 25.4, "unit": "°C"},
    "rainfall": {"before": 200, "after": 184, "unit": "mm"},
    "vegetation_index": {"before": 0.5, "after": 0.55, "unit": "index"},
    "built_up_index": {"before": 100, "after": 117, "unit": "index"}
  },
  "alert": {"level": "demo-review", "message": "Coastal exposure: review local flood data"}
}
```

This is a **visual decision-support prototype**, not a real automated hazard alert system.
