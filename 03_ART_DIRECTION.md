# 03 — Art Direction & MVP UI Design

## Reference image
Use the **user-supplied Earth Sentinel dashboard screenshot** as the visual north star. Recreate its design *language*, not a static image: cinematic globe on the left; dense but readable intelligence cards on the right; cyan HUD lines; dark navy UI; simulated towers and beams.

## Style name
**Cinematic Geospatial Command Center** — premium NASA-style mission-control aesthetics with practical SaaS dashboard clarity.

## Design tokens
| Role | Hex | Usage |
|---|---|---|
| Deep-space background | `#06111F` | App background |
| Navy panel | `#0C2234` | Cards and sidebar |
| Cyan highlight | `#22D3EE` | Focus, selected coordinates, scan |
| Success mint | `#36E2B1` | Successful scan / online demo status |
| Warning amber | `#FFBE55` | Demo risk indicators |
| Critical red | `#FF6178` | Only clearly labeled critical demo cases |
| Main text | `#EAF8FF` | Headings and results |
| Secondary text | `#91AEC2` | Labels / metadata |

**Typography:** Space Grotesk / Sora for headings, Inter for English body, IBM Plex Sans Arabic for Arabic presentation assets; monospaced numerals for coordinates.

## Layout (desktop-first)
```text
┌────────────────── TOP BAR: LOGO · DASHBOARD · ANALYSIS · FORECAST · DISCOVERY ──────────────────┐
│ SIDEBAR │      LEFT ~48%               │                RIGHT ~52%                              │
│         │  3D GLOBE / CAMERA           │  Human Intelligence summary (3 cards)                  │
│Overview │  Location target             │  Before / After (side-by-side)                          │
│Location │  Virtual towers overlay      │  5-Year Scenario chart + controls                      │
│Analysis │  Glowing scan animation      │  Key Changes + Monitoring status                        │
│Forecast │  Scan progress / status      │  Scientific takeaway                                   │
│Discovery│                               │                                                     │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

## MVP screens / states
1. **Landing / Start:** dark full-screen globe, logo, “Explore Earth”, `Enter Dashboard`.
2. **Globe Idle:** rotating globe, search/presets, minimal floating controls.
3. **Location Selected:** glow/target ring with anchored glass popup.
4. **Scanning:** globe shrinks to left, luminous sweeps and station signals animate; progress text.
5. **Results:** right dashboard fades in, cards and charts populate with synthetic dataset.
6. **Scenario / Monitoring interaction:** chart and highlighted towers update when clicked.

## Components to build
- `TopNavigation`, `SidebarNavigation`
- `EarthGlobe`, `GlobeTarget`, `RegionPopup`, `ScanOverlay`
- `HumanIntelligenceCards`, `CompareCard`, `ForecastCard`
- `KeyChangesGrid`, `StationMarkers`, `MonitoringCard`, `TrendVerdict`
- `DemoDataBadge`

## Motion guidelines
- Earth idle spin: calm and continuous; drag cancels spin.
- Camera focus: smooth fly-to (0.6–1.2 seconds).
- Popup reveal: 180–250 ms opacity / slight scale.
- Scan: ~2–3 seconds (demo pace); progress must match state.
- Results: stagger card reveal (100–200 ms intervals).
- Station warning: amber pulse, no obnoxious looping alarm sound.
- Respect reduced-motion preference where possible.

## Non-negotiable readability
- Keep actual chart numbers large and labels legible.
- Use a `DEMO / SIMULATED` marker in the header and result area.
- No unrelated decoration inside charts.
- On smaller screens: globe on top, results stacked below; no need for perfect mobile implementation before presentation.
