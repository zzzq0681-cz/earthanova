# 01 — MVP Scope & Features

## MVP goal
Create a **credible, visually compelling concept demo** of Earth Sentinel in one day. Focus on a single end-to-end user journey. **No production features are required.**

## Only 5 MVP modules

### M1 — Welcome / Enter Dashboard
- Simple welcome or demo-entry screen: **Enter Earth Sentinel**.
- Skip authentication: no passwords, accounts or server.
- Clear “Demo Mode — Simulated Data” label.

### M2 — Interactive 3D Globe (hero feature)
- Rotating Earth with realistic globe imagery where feasible.
- Drag to rotate, scroll/pinch to zoom, click to choose a location.
- Support city presets: **Alexandria**, Cairo, and one international example.
- Show latitude / longitude of selection.
- Animate a location target and focus camera.
- For arbitrary clicks, show coordinates and a generic **Custom Area**; do not invent a city name.
- If a real map SDK is impractical before the demo, prioritize a working globe interaction and reliable preset selection over perfect terrain.

### M3 — Location Popup & Scan
- Glass-style popup over/near selected location.
- Name, coordinates, *Demo Area* / optional radius selector.
- Buttons: **Scan Area** and **Change Location**.
- On Scan: globe shifts/compacts to the left, scan ring / beam animates, progress updates, then right-side dashboard reveals.
- The animation represents processing, **not a real sensor sweep**.

### M4 — One Unified Analysis Dashboard
Keep all essentials in **one screen**, not separate apps:
- **Human Intelligence summary:** 3 simple interpretation cards (opportunity, climate indicator, living suitability); all marked illustrative.
- **Before vs After:** baseline (e.g. 2019–2023) against latest (e.g. 2024–2025), with two comparable panels.
- **Key Changes:** 3–4 indicators like temperature, rainfall, vegetation, and urbanization.
- **Trend finding:** one plain-language verdict: *increased / decreased / unclear*, derived from demo values; do not call it statistically significant without a proper test.
- **5-Year Outlook:** one simple line chart, with **Baseline / Best Case / Stress Case** buttons; explicitly labeled *Illustrative scenario, not a forecast*.

### M5 — Discovery / Monitoring Visualization
- Four **virtual stations** around the selected region (T-01 to T-04).
- Animated beams and status: Ready / Scanning / Finding.
- Each station maps to an indicator (Climate / Water / Land / Hazards).
- One visible **demo alert** such as “Coastal exposure: review recommended.”
- Clicking a station highlights its indicator / brief explanation.
- No claim that these are real physical towers or emergency warning systems.

## Simplified site structure
Just **one app page** containing globe + dashboard, plus optional intro overlay. The top navigation can act as **tabs/anchors**, not separate complex pages.

## Remove for now (out of scope)
| Postpone | Why |
|---|---|
| Real authentication, roles, accounts | Slows demo with no storytelling value |
| Backend, databases, cloud deployment | Local seeded JSON works for concept |
| NASA/live API integrations | Could fail or require data-cleaning before deadline |
| AI chatbot / RAG | Scripted evidence-based demo copy is safer and faster |
| Real statistical significance engine | Not needed to demonstrate the UX; keep trend directional |
| Validated predictive models | Show scenario simulation only |
| Real-time alerts / emails / push | Visual alert is sufficient |
| Real hospital/school ratings | No verified sources in MVP |
| Billing / subscriptions / admin | Explain future SaaS potential in the pitch only |
| Investment recommendations | Show “potential to investigate,” not investment advice |
| PDF reports / project collaboration | No role in the core live demo |
| Full mobile optimization | Desktop presentation first |

## Priority order
**P0 — Must work:** globe interaction → click → popup → scan → coherent dashboard.  
**P1 — If time:** station beams, scenario toggles, smooth transitions, 3 city presets.  
**P2 — Nice to have:** saved favorite, microinteractions, detailed tooltip, mobile polish.

## Product positioning
A future **SaaS Earth intelligence platform**, but tomorrow’s deliverable is explicitly a **concept MVP** proving the experience.
