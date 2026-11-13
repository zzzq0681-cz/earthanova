# 05 — One-Day Build Order & Acceptance Checklist

## Delivery format
**Preferred:** one working `index.html` (with local assets if needed) that runs as a demo. The HTML can use local synthetic JSON or inline JS data. If a library needs network access, document it and provide a fallback before the live presentation.

## Build sequence

### Step 1 — Skeleton + visual shell (P0)
- [ ] Recreate top bar, left nav, globe workspace, right dashboard grid.
- [ ] Apply dark navy / cyan art direction and readable typography.
- [ ] Put `DEMO • SIMULATED DATA` in the UI.

**Done when:** the layout looks like one coherent command center.

### Step 2 — Globe interaction (P0)
- [ ] Earth renders clearly.
- [ ] Rotate by dragging, zoom via scroll/buttons.
- [ ] Choose Alexandria preset, and click a point on Earth.
- [ ] Show selected coordinates and target ring.

**Done when:** selection works smoothly, even without any backend.

### Step 3 — Popup + scan transition (P0)
- [ ] Popup opens on location click.
- [ ] `Scan Area` and `Change Location` work.
- [ ] The globe transitions to left panel.
- [ ] Scan animation runs ~2–3 seconds then completes.

**Done when:** the entire interaction is visible without page reload.

### Step 4 — Dashboard with coherent demo data (P0)
- [ ] Summary cards.
- [ ] Before/After indicators.
- [ ] 3–4 key changes.
- [ ] Short, clearly demo-labeled finding.
- [ ] Forecast illustration + scenario toggles.

**Done when:** all values agree with the same demo dataset.

### Step 5 — Virtual stations (P1)
- [ ] T-01 through T-04 surround selected area in the visual scene.
- [ ] Simple beam/pulse animations.
- [ ] Clicking station highlights a finding.
- [ ] One demo watch/alert status.

**Done when:** stations are understandable without claiming physical measurements.

### Step 6 — Presenter QA (P0)
- [ ] Open demo in target browser and laptop resolution.
- [ ] Test globe drag, zoom, preset and free click.
- [ ] Test popup and scan multiple times.
- [ ] Check chart values, labels and scenario buttons.
- [ ] Test reload and reset path.
- [ ] Test offline or fallback mode.
- [ ] No console errors, missing images, undefined labels, or long load delay.
- [ ] Make a screen recording as backup if possible.

## Scope freeze rule
**If pressed for time:** keep Steps 1–4 fully working, reduce station animations to 4 glowing clickable markers, and skip everything else. A polished single user journey is better than many incomplete features.

## One-slide honesty statement
“This is an interactive UX/technical concept. Data and forecasts are simulated for demonstration. Future work connects verified Earth observation datasets and validates the analysis.”

## What comes after the presentation (not built now)
Real data integration, significance testing, verified forecasting, authentication, saved projects, real alerts, institutional plans, billing, and production deployment.
