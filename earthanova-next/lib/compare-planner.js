/* Compare page, two extra sections for one place:
 *   1) Best time to go: a comfort score for each of the 52 weeks of the year, the best windows, and your own dates for comparison.
 *   2) Seasonal risk calendar: month by month heat, cold, rain, dust, and NASA EONET events (storms, floods, landslides, volcanoes).
 * Pure functions (data in, HTML strings out). The scoring matches scorePlace() in earthanova.js so both views agree.
 * Colours are the site tokens. Every chart has hover/focus tooltips and a table view. */

const C = { cyan: '#22D3EE', mint: '#36E2B1', amber: '#FFBE55', red: '#FF6178', violet: '#A78BFA', ink: '#EAF8FF', ink2: '#91AEC2', surface: '#0C2234' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => v != null && !Number.isNaN(v);
const mean = a => { const v = a.filter(num); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const f = (v, d = 0) => num(v) ? Number(v).toFixed(d) : '—';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const monthOfDoy = d => { let m = 0; for (let i = 0; i < 12; i++) if (CUM[i] <= d) m = i; return m; };       // 0..11
const doyLabel = d => `${MON[monthOfDoy(d)]} ${d - CUM[monthOfDoy(d)] + 1}`;
const weekRange = w => [w * 7, w === 51 ? 364 : w * 7 + 6];
const weekLabel = w => { const [a, b] = weekRange(w); return `${doyLabel(a)} to ${doyLabel(b)}`; };
const doyOfIso = iso => { const m = +iso.slice(5, 7) - 1, d = Math.min(+iso.slice(8, 10), MDAYS[m]); return CUM[m] + d - 1; };

/* same weights as scorePlace(): comfort, rain, extremes, air (dust). Seismic and altitude do not change through the year. */
const WEIGHTS = { comfort: { trip: .30, relocate: .25 }, rain: { trip: .20, relocate: .10 }, extreme: { trip: .15, relocate: .15 }, air: { trip: .10, relocate: .25 } };
export function scoreWeek(a, range, purpose, dust) {
  const [lo, hi] = range, dist = a.meanT < lo ? lo - a.meanT : a.meanT > hi ? a.meanT - hi : 0;
  const P = {
    comfort: clamp(100 - dist * 8 - Math.max(0, a.hi - 36) * 3),
    rain: clamp(100 - a.rainPerDay * 12 - a.wetFrac * 20),
    extreme: clamp(100 - a.hotFrac * 220 - a.coldFrac * 160),
    air: dust == null ? 60 : clamp(100 - dust * 2.5)
  };
  let tw = 0, ts = 0; for (const k in P) { const w = WEIGHTS[k][purpose]; tw += w; ts += w * P[k]; }
  return { score: Math.round(ts / tw), parts: P };
}
export const levelOfScore = s => s >= 70 ? 'good' : s >= 50 ? 'ok' : 'poor';
const LEVEL_COL = { good: C.mint, ok: C.amber, poor: C.red };
const LEVEL_TXT = { good: 'Comfortable', ok: 'Acceptable', poor: 'Poor' };

/* profile: response of /climate-year. opts: {range:[lo,hi], purpose, lenWeeks, win:{start,end} (ISO dates)} */
export function buildPlan(profile, opts) {
  const dustM = profile.dust_monthly || null, byW = Array(52).fill(null);
  profile.weeks.forEach(a => { byW[a.w] = a; });
  const rows = byW.map((a, w) => {
    if (!a) return null;
    const mid = Math.min(364, w * 7 + 3), dust = dustM ? dustM[monthOfDoy(mid)] : null;
    return { ...a, ...scoreWeek(a, opts.range, opts.purpose, dust), dust };
  });
  const sc = rows.map(r => r ? r.score : null), L = Math.max(1, Math.min(13, opts.lenWeeks || 2));
  /* rolling mean over L weeks, circular, then the best non-overlapping windows */
  const roll = sc.map((_, i) => mean(Array.from({ length: L }, (__, j) => sc[(i + j) % 52])));
  const taken = new Set(), windows = [];
  [...roll.keys()].filter(i => roll[i] != null).sort((x, y) => roll[y] - roll[x]).forEach(i => {
    if (windows.length >= 3) return;
    const ws = Array.from({ length: L }, (_, j) => (i + j) % 52);
    if (ws.some(w => taken.has(w))) return;
    ws.forEach(w => taken.add(w));
    const rs = ws.map(w => rows[w]).filter(Boolean);
    windows.push({ w0: i, weeks: ws, score: Math.round(roll[i]), meanT: mean(rs.map(r => r.meanT)), hi: mean(rs.map(r => r.hi)), lo: mean(rs.map(r => r.lo)),
      rainMm: mean(rs.map(r => r.rainPerDay)) * L * 7, wetFrac: mean(rs.map(r => r.wetFrac)), hotFrac: mean(rs.map(r => r.hotFrac)), coldFrac: mean(rs.map(r => r.coldFrac)),
      label: `${doyLabel(weekRange(ws[0])[0])} to ${doyLabel(weekRange(ws[ws.length - 1])[1])}` });
  });
  /* the user's own dates */
  let mine = null;
  if (opts.win && opts.win.start && opts.win.end) {
    let a = doyOfIso(opts.win.start), b = doyOfIso(opts.win.end), ws = new Set(), n = 0;
    for (let d = a; n < 120; d = (d + 1) % 365, n++) { ws.add(Math.min(51, Math.floor(d / 7))); if (d === b) break; }
    const list = [...ws], m = mean(list.map(w => sc[w]));
    mine = { weeks: list, score: m == null ? null : Math.round(m), label: `${doyLabel(a)} to ${doyLabel(b)}` };
  }
  return { rows, scores: sc, windows, mine, L, range: opts.range, purpose: opts.purpose, dustMonthly: dustM, rainSource: profile.rain_source, years: profile.years, months: profile.months };
}

/* EONET events (the result of eonetEvents) -> counts per calendar month and category */
export function eonetByMonth(eo) {
  if (!eo) return null;
  const cnt = k => { const a = Array(12).fill(0); (eo.byCat[k] || []).forEach(e => { const m = +String(e.date).slice(5, 7); if (m >= 1 && m <= 12) a[m - 1]++; }); return a; };
  const s = cnt('severeStorms'), fl = cnt('floods'), ls = cnt('landslides');
  return { storm: s.map((v, i) => v + fl[i] + ls[i]), volc: cnt('volcanoes'), truncated: !!eo.truncated };
}

/* ---------- shared bits ---------- */
const W = 900, L = 40, R = 14;
const keyHtml = (k) => `<span><i class="hz-key hz-key-${k.kind}" style="--c:${k.color}"></i>${esc(k.name)}</span>`;
const monthStarts = () => { const out = []; for (let m = 0; m < 12; m++) out.push([Math.min(51, Math.floor(CUM[m] / 7)), MON[m]]); return out; };

/* ---------- section 1: best time to go ---------- */
export function bestTimeHtml(plan, place, tips) {
  const n = 52, slot = (W - L - R) / n, X = w => L + (w + .5) * slot;
  const bw = Math.min(14, slot * 0.7);
  /* comfort ribbon */
  const H1 = 190, T1 = 26, B1 = 26, ih1 = H1 - T1 - B1, Y1 = v => T1 + (100 - v) / 100 * ih1;
  let g = '';
  [0, 25, 50, 75, 100].forEach(t => { g += `<line class="hz-grid" x1="${L}" x2="${W - R}" y1="${Y1(t)}" y2="${Y1(t)}"/><text class="hz-ax" x="${L - 7}" y="${Y1(t) + 4}" text-anchor="end">${t}</text>`; });
  plan.windows.forEach((win, i) => {
    const x0 = L + win.w0 * slot, wrap = win.w0 + plan.L > 52;
    const seg = (a, b) => `<rect x="${a.toFixed(1)}" y="${T1}" width="${(b - a).toFixed(1)}" height="${ih1}" fill="${C.cyan}" opacity=".12" rx="3"/>`;
    if (wrap) { g += seg(x0, W - R) + seg(L, L + (win.w0 + plan.L - 52) * slot); } else g += seg(x0, x0 + plan.L * slot);
    g += `<g><circle cx="${(x0 + Math.min(plan.L, 52 - win.w0) * slot / 2).toFixed(1)}" cy="${T1 - 10}" r="9" fill="${C.cyan}" stroke="${C.surface}" stroke-width="2"/><text x="${(x0 + Math.min(plan.L, 52 - win.w0) * slot / 2).toFixed(1)}" y="${T1 - 6}" text-anchor="middle" class="pl-badge">${i + 1}</text></g>`;
  });
  plan.rows.forEach((r, w) => { if (!r) return; const h = Math.max(1, Y1(0) - Y1(r.score)); g += `<path class="hz-bar" data-i="${w}" d="M${(X(w) - bw / 2).toFixed(1)} ${Y1(0).toFixed(1)}V${(Y1(r.score) + 3).toFixed(1)}Q${(X(w) - bw / 2).toFixed(1)} ${Y1(r.score).toFixed(1)} ${(X(w) - bw / 2 + 3).toFixed(1)} ${Y1(r.score).toFixed(1)}H${(X(w) + bw / 2 - 3).toFixed(1)}Q${(X(w) + bw / 2).toFixed(1)} ${Y1(r.score).toFixed(1)} ${(X(w) + bw / 2).toFixed(1)} ${(Y1(r.score) + 3).toFixed(1)}V${Y1(0).toFixed(1)}Z" fill="${LEVEL_COL[levelOfScore(r.score)]}"/>`; });
  monthStarts().forEach(([w, m]) => { g += `<text class="hz-ax" x="${(L + w * slot + 2).toFixed(1)}" y="${H1 - 8}">${m}</text>`; });
  if (plan.mine) {
    const ws = plan.mine.weeks.sort((a, b) => a - b), a = L + ws[0] * slot, b = L + (ws[ws.length - 1] + 1) * slot;
    if (b > a) g += `<line x1="${a.toFixed(1)}" x2="${b.toFixed(1)}" y1="${Y1(0) + 5}" y2="${Y1(0) + 5}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
  }
  g += `<line class="hz-xh" y1="${T1}" y2="${T1 + ih1}"/>`;
  plan.rows.forEach((r, w) => { if (r) g += `<rect class="hz-hit" data-pt="ribbon" data-i="${w}" tabindex="0" x="${(X(w) - slot / 2).toFixed(1)}" y="${T1}" width="${slot.toFixed(1)}" height="${ih1}" fill="transparent"/>`; });
  tips.ribbon = plan.rows.map((r, w) => !r ? null : { x: X(w) / W * 100, y: Y1(r.score) / H1 * 100, head: weekLabel(w), rows: [
    { name: LEVEL_TXT[levelOfScore(r.score)], value: `${r.score} / 100`, color: LEVEL_COL[levelOfScore(r.score)], kind: 'rect' },
    { name: 'mean temperature', value: `${f(r.meanT, 1)} °C`, color: C.cyan, kind: 'line' },
    { name: 'rain', value: `${f(r.rainPerDay * 7, 0)} mm/week`, color: C.cyan, kind: 'line' },
    { name: 'days ≥ 35 °C / ≤ 0 °C', value: `${f(r.hotFrac * 100, 0)}% / ${f(r.coldFrac * 100, 0)}%`, color: C.ink2, kind: 'line' }] });
  const ribbon = `<svg class="hz-plot pl-svg" viewBox="0 0 ${W} ${H1}" role="img" aria-label="Comfort score for each week of the year, with the three best windows numbered" data-w="${W}" data-h="${H1}">${g}</svg>`;

  /* temperature band through the year (single axis, °C) */
  const H2 = 190, T2 = 14, B2 = 26, ih2 = H2 - T2 - B2;
  const lows = plan.rows.map(r => r ? r.lo : null).filter(num), highs = plan.rows.map(r => r ? r.hi : null).filter(num);
  let lo = Math.min(...lows, plan.range[0], 0) - 2, hi = Math.max(...highs, plan.range[1], 35) + 3;
  const step = (hi - lo) >= 35 ? 10 : 5; lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const Y2 = v => T2 + (hi - v) / (hi - lo) * ih2;
  let g2 = '';
  for (let t = lo; t <= hi; t += step) g2 += `<line class="hz-grid" x1="${L}" x2="${W - R}" y1="${Y2(t)}" y2="${Y2(t)}"/><text class="hz-ax" x="${L - 7}" y="${Y2(t) + 4}" text-anchor="end">${t}°</text>`;
  g2 += `<rect x="${L}" y="${Y2(plan.range[1])}" width="${W - L - R}" height="${Y2(plan.range[0]) - Y2(plan.range[1])}" fill="${C.mint}" opacity=".10"/>`;
  g2 += `<line class="hz-ref" x1="${L}" x2="${W - R}" y1="${Y2(35)}" y2="${Y2(35)}"/><text class="hz-ref-t" x="${W - R - 2}" y="${Y2(35) - 4}" text-anchor="end">Hot day 35 °C</text>`;
  const pts = plan.rows.map((r, w) => r ? [X(w), r] : null).filter(Boolean);
  g2 += `<path d="M${pts.map(p => `${p[0].toFixed(1)} ${Y2(p[1].hi).toFixed(1)}`).join(' L')} L${pts.slice().reverse().map(p => `${p[0].toFixed(1)} ${Y2(p[1].lo).toFixed(1)}`).join(' L')} Z" fill="${C.cyan}" opacity=".16"/>`;
  g2 += `<path d="M${pts.map(p => `${p[0].toFixed(1)} ${Y2(p[1].meanT).toFixed(1)}`).join(' L')}" fill="none" stroke="${C.cyan}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  plan.windows.forEach((win, i) => { const x0 = L + win.w0 * slot; if (win.w0 + plan.L <= 52) g2 += `<line x1="${x0.toFixed(1)}" x2="${(x0 + plan.L * slot).toFixed(1)}" y1="${T2 + ih2 - 4}" y2="${T2 + ih2 - 4}" stroke="${C.cyan}" stroke-width="3" stroke-linecap="round"/>`; });
  monthStarts().forEach(([w, m]) => { g2 += `<text class="hz-ax" x="${(L + w * slot + 2).toFixed(1)}" y="${H2 - 8}">${m}</text>`; });
  g2 += `<line class="hz-xh" y1="${T2}" y2="${T2 + ih2}"/>`;
  plan.rows.forEach((r, w) => { if (r) g2 += `<rect class="hz-hit" data-pt="band" data-i="${w}" tabindex="0" x="${(X(w) - slot / 2).toFixed(1)}" y="${T2}" width="${slot.toFixed(1)}" height="${ih2}" fill="transparent"/>`; });
  tips.band = plan.rows.map((r, w) => !r ? null : { x: X(w) / W * 100, y: Y2(r.meanT) / H2 * 100, head: weekLabel(w), rows: [
    { name: 'mean', value: `${f(r.meanT, 1)} °C`, color: C.cyan, kind: 'line' },
    { name: 'typical high', value: `${f(r.hi, 1)} °C`, color: C.cyan, kind: 'rect' },
    { name: 'typical low', value: `${f(r.lo, 1)} °C`, color: C.cyan, kind: 'rect' }] });
  const band = `<svg class="hz-plot pl-svg" viewBox="0 0 ${W} ${H2}" role="img" aria-label="Typical temperature range through the year against your comfort range" data-w="${W}" data-h="${H2}">${g2}</svg>`;

  /* summary + window cards */
  const best = plan.windows[0], mine = plan.mine;
  let verdict = '';
  if (best) {
    if (mine && mine.score != null) {
      const d = best.score - mine.score;
      verdict = d <= 4 ? `Your dates (${mine.label}) already sit among the best times of the year: score ${mine.score}.`
        : `The best time is ${best.label}, score ${best.score}. Your dates (${mine.label}) score ${mine.score}, so moving would add ${d} points.`;
    } else verdict = `The best time is ${best.label}, score ${best.score}.`;
  }
  const cards = plan.windows.map((w, i) => {
    const lv = levelOfScore(w.score), flags = [];
    if (w.hotFrac >= .1) flags.push(`${f(w.hotFrac * 100, 0)}% of days reach 35 °C`);
    if (w.coldFrac >= .1) flags.push(`${f(w.coldFrac * 100, 0)}% of nights freeze`);
    if (w.wetFrac >= .3) flags.push(`${f(w.wetFrac * 100, 0)}% wet days`);
    return `<article class="pl-win"><span class="pl-rank">${i + 1}</span><div><h4>${esc(w.label)}</h4><p class="pl-win-s"><b style="color:${LEVEL_COL[lv]}">${w.score}</b> / 100 · ${LEVEL_TXT[lv]}</p>
      <dl><div><dt>Temperature</dt><dd>${f(w.meanT, 0)} °C <small>(${f(w.lo, 0)} to ${f(w.hi, 0)})</small></dd></div><div><dt>Rain</dt><dd>${f(w.rainMm, 0)} mm</dd></div><div><dt>Wet days</dt><dd>${f(w.wetFrac * 100, 0)}%</dd></div></dl>
      ${flags.length ? `<p class="pl-win-f">${esc(flags.join(' · '))}</p>` : '<p class="pl-win-f ok">No heat, frost or wet-day flags in this window.</p>'}</article>`;
  }).join('');
  const legend = [{ name: 'Comfortable (70+)', color: C.mint, kind: 'rect' }, { name: 'Acceptable (50 to 69)', color: C.amber, kind: 'rect' }, { name: 'Poor (below 50)', color: C.red, kind: 'rect' }, { name: 'Best windows (numbered)', color: C.cyan, kind: 'wash' }, ...(mine ? [{ name: 'Your dates', color: C.ink, kind: 'line' }] : [])];
  const table = `<details class="hz-table"><summary>Table view</summary><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Week</th><th>Score</th><th>Mean °C</th><th>High</th><th>Low</th><th>Rain mm/wk</th><th>Wet days %</th></tr></thead><tbody>${plan.rows.map((r, w) => r ? `<tr><td>${esc(weekLabel(w))}</td><td>${r.score}</td><td>${f(r.meanT, 1)}</td><td>${f(r.hi, 1)}</td><td>${f(r.lo, 1)}</td><td>${f(r.rainPerDay * 7, 0)}</td><td>${f(r.wetFrac * 100, 0)}</td></tr>` : '').join('')}</tbody></table></div></details>`;
  const bandKeys = [{ name: 'Mean temperature', color: C.cyan, kind: 'line' }, { name: 'Typical daily low to high', color: C.cyan, kind: 'wash' }, { name: `Your comfort range ${plan.range[0]} to ${plan.range[1]} °C`, color: C.mint, kind: 'wash' }];
  return `<section class="pl-sec" aria-label="Best time to go">
    <header class="pl-h"><div><p class="pl-k">Best time to go</p><h3>When is ${esc(place)} at its best?</h3></div></header>
    ${verdict ? `<p class="pl-verdict">${esc(verdict)}</p>` : ''}
    <div class="pl-wins">${cards}</div>
    <figure class="hz-fig pl-fig"><figcaption><b>Comfort score for every week of the year</b><span>${plan.purpose === 'trip' ? 'Trip' : 'Living'} weighting · window length ${plan.L} week${plan.L > 1 ? 's' : ''} · ${plan.years[0]}–${plan.years[1]} climate</span></figcaption><div class="hz-wrap" data-pl="ribbon">${ribbon}<div class="tip hz-tip"></div></div><div class="hz-legend">${legend.map(keyHtml).join('')}</div></figure>
    <figure class="hz-fig pl-fig"><figcaption><b>Temperature through the year</b><span>Weekly mean with the typical daily range, against your comfort range</span></figcaption><div class="hz-wrap" data-pl="band">${band}<div class="tip hz-tip"></div></div><div class="hz-legend">${bandKeys.map(keyHtml).join('')}</div>${table}</figure>
    <p class="hz-note">Score = comfort of the temperature, rain and wet days, hot and freezing days, and natural dust (when loaded), weighted as in the comparison above. Climate is the typical ${plan.years[0]}–${plan.years[1]} year from NASA POWER daily data; rain from ${esc(plan.rainSource)}. It describes what is typical, not a forecast for specific dates.</p></section>`;
}

/* ---------- section 2: seasonal risk calendar ---------- */
const RISK_ROWS = [
  { id: 'heat', label: 'Extreme heat', unit: '% of days at or above 35 °C', th: [8, 25], val: m => m.hotFrac * 100, fmt: v => v > 0 && v < 1 ? '<1' : f(v, 0), note: 'Moderate from 8% of days, high from 25%.' },
  { id: 'cold', label: 'Freezing nights', unit: '% of days with a low at or below 0 °C', th: [8, 25], val: m => m.coldFrac * 100, fmt: v => v > 0 && v < 1 ? '<1' : f(v, 0), note: 'Moderate from 8% of days, high from 25%.' },
  { id: 'rain', label: 'Rainfall', unit: 'mm in the month', th: [60, 150], val: m => m.rainMm, fmt: v => f(v, 0), note: 'Moderate from 60 mm a month, high from 150 mm.' },
  { id: 'wet', label: 'Wet days', unit: '% of days with 1 mm or more', th: [25, 50], val: m => m.wetFrac * 100, fmt: v => f(v, 0), note: 'Moderate from 25% of days, high from 50%.' },
  { id: 'dust', label: 'Natural dust', unit: 'µg/m³ of windblown dust (PM2.5)', th: [10, 25], val: (m, i, ctx) => ctx.dust ? ctx.dust[i] : null, fmt: v => f(v, 0), note: 'Moderate from 10 µg/m³, high from 25 (NASA MERRA-2).' },
  { id: 'storm', label: 'Storms, floods, landslides', unit: 'NASA EONET events in this month over 10 years', th: [3, 8], val: (m, i, ctx) => ctx.eo ? ctx.eo.storm[i] : null, fmt: v => f(v, 0), note: 'Moderate from 3 listed events, high from 8. EONET lists notable events only.' },
  { id: 'volc', label: 'Volcanic activity', unit: 'NASA EONET reports in this month over 10 years', th: [1, 3], val: (m, i, ctx) => ctx.eo ? ctx.eo.volc[i] : null, fmt: v => f(v, 0), note: 'Moderate from 1 report, high from 3.', onlyIfAny: true }
];
const lvOf = (v, th) => !num(v) ? 'na' : v >= th[1] ? 'high' : v >= th[0] ? 'moderate' : 'low';
const LV_TXT = { low: 'Low', moderate: 'Moderate', high: 'High', na: 'No data' };

export function riskCalendarHtml(plan, place, eoMonthly, win, tips) {
  const ctx = { dust: plan.dustMonthly, eo: eoMonthly };
  const mine = new Set(); if (win && win.start && win.end) { let a = doyOfIso(win.start), b = doyOfIso(win.end), n = 0; for (let d = a; n < 120; d = (d + 1) % 365, n++) { mine.add(monthOfDoy(d)); if (d === b) break; } }
  const rows = RISK_ROWS.filter(r => !(r.onlyIfAny && (!eoMonthly || !eoMonthly.volc.some(v => v > 0))));
  const cal = rows.map(r => {
    const vals = Array.from({ length: 12 }, (_, i) => { const m = plan.months.find(x => x.m === i + 1); return m || r.id === 'dust' || r.id === 'storm' || r.id === 'volc' ? r.val(m || {}, i, ctx) : null; });
    return { ...r, vals, lv: vals.map(v => lvOf(v, r.th)) };
  });
  const tipList = [];
  const head = `<div class="pl-cal-h"><span></span>${MON.map((m, i) => `<span class="${mine.has(i) ? 'is-mine' : ''}">${m}</span>`).join('')}</div>`;
  const body = cal.map((r, ri) => `<div class="pl-cal-r"><span class="pl-cal-l" title="${esc(r.unit)}"><b>${esc(r.label)}</b><small>${esc(r.unit)}</small></span>${r.vals.map((v, i) => {
    const idx = tipList.length; tipList.push({ head: `${r.label} · ${MON[i]}`, rows: [{ name: LV_TXT[r.lv[i]], value: num(v) ? `${r.fmt(v)}` : '—', color: { low: C.mint, moderate: C.amber, high: C.red, na: C.ink2 }[r.lv[i]], kind: 'rect' }, { name: r.unit, value: '', color: C.ink2, kind: 'line' }] });
    return `<span class="pl-cell lv-${r.lv[i]}${mine.has(i) ? ' is-mine' : ''}" tabindex="0" data-pt="cal" data-i="${idx}" role="img" aria-label="${esc(r.label)}, ${MON[i]}: ${esc(LV_TXT[r.lv[i]])}${num(v) ? ', ' + r.fmt(v) : ''}">${num(v) ? esc(r.fmt(v)) : '·'}</span>`;
  }).join('')}</div>`).join('');
  tips.cal = tipList;
  /* what to watch in the user's dates */
  const watch = [];
  if (mine.size) cal.forEach(r => {
    const ms = [...mine].filter(i => r.lv[i] === 'moderate' || r.lv[i] === 'high'); if (!ms.length) return;
    const worst = ms.some(i => r.lv[i] === 'high') ? 'high' : 'moderate', top = Math.max(...ms.map(i => r.vals[i]));
    watch.push({ lv: worst, text: `${r.label}: ${LV_TXT[worst].toLowerCase()} in ${ms.sort((a, b) => a - b).map(i => MON[i]).join(', ')} (peak ${r.fmt(top)}, measured as ${r.unit}).` });
  });
  const noData = cal.filter(r => r.lv.every(l => l === 'na')).map(r => r.label);
  const table = `<details class="hz-table"><summary>Table view</summary><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Hazard</th>${MON.map(m => `<th>${m}</th>`).join('')}</tr></thead><tbody>${cal.map(r => `<tr><td>${esc(r.label)} <small>(${esc(r.unit)})</small></td>${r.vals.map(v => `<td>${num(v) ? esc(r.fmt(v)) : '—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
  const legend = [{ name: 'Low', color: C.mint, kind: 'rect' }, { name: 'Moderate', color: C.amber, kind: 'rect' }, { name: 'High', color: C.red, kind: 'rect' }, { name: 'No data', color: C.ink2, kind: 'rect' }, ...(mine.size ? [{ name: 'Your travel months', color: C.cyan, kind: 'line' }] : [])];
  return `<section class="pl-sec" aria-label="Seasonal risk calendar">
    <header class="pl-h"><div><p class="pl-k">Seasonal risk calendar</p><h3>What can go wrong in ${esc(place)}, month by month</h3></div></header>
    <figure class="hz-fig pl-fig"><figcaption><b>Hazards by month</b><span>Typical ${plan.years[0]}–${plan.years[1]} year · each cell shows the value, colour shows the level</span></figcaption>
      <div class="hz-wrap" data-pl="cal"><div class="pl-cal" role="group" aria-label="Seasonal hazards by month">${head}${body}</div><div class="tip hz-tip"></div></div>
      <div class="hz-legend">${legend.map(keyHtml).join('')}</div>${table}</figure>
    ${mine.size ? `<div class="pl-watch"><h4>Watch-outs for your dates</h4>${watch.length ? `<ul class="hz-analysis">${watch.map(w => `<li class="w-${w.lv}">${esc(w.text)}</li>`).join('')}</ul>` : '<p class="pl-win-f ok">Nothing is flagged for your travel months.</p>'}</div>` : ''}
    <p class="hz-note">Heat, cold and rain come from NASA POWER daily data (rain from ${esc(plan.rainSource)}); dust from NASA MERRA-2${plan.dustMonthly ? '' : ' (not loaded for this place yet, so the row is empty)'}; storms, floods, landslides and volcanoes from NASA EONET${eoMonthly ? (eoMonthly.truncated ? ' (list cut at 1000 events, true counts are higher)' : '') : ' (could not be reached)'}. EONET lists notable events only, so low or empty does not mean safe. Earthquakes have no seasonal pattern and are not shown.${noData.length ? ' No data for: ' + esc(noData.join(', ')) + '.' : ''}</p></section>`;
}

/* ---------- browser wiring: one delegated tooltip over the whole planner ---------- */
export function wirePlanner(root, tips) {
  const hide = () => { root.querySelectorAll('.hz-tip').forEach(t => { t.style.opacity = 0; }); root.querySelectorAll('.hz-xh').forEach(x => { x.style.opacity = 0; }); root.querySelectorAll('.hz-bar.is-hover').forEach(b => b.classList.remove('is-hover')); };
  const show = el => {
    const wrap = el.closest('.hz-wrap'), tip = wrap && wrap.querySelector('.hz-tip'); if (!tip) return;
    const t = (tips[el.dataset.pt] || [])[+el.dataset.i]; if (!t) return;
    tip.textContent = '';
    const h = document.createElement('span'); h.textContent = t.head; tip.appendChild(h);
    t.rows.forEach(r => {
      tip.appendChild(document.createElement('br'));
      const k = document.createElement('i'); k.className = 'hz-key hz-key-' + r.kind; k.style.setProperty('--c', r.color); tip.appendChild(k);
      if (r.value) { const b = document.createElement('b'); b.textContent = r.value; tip.appendChild(b); }
      const n = document.createElement('span'); n.textContent = (r.value ? ' ' : '') + r.name; tip.appendChild(n);
    });
    const wr = wrap.getBoundingClientRect(), er = el.getBoundingClientRect();
    tip.style.left = Math.min(wr.width - 90, Math.max(90, er.left - wr.left + er.width / 2)) + 'px';
    tip.style.top = (er.top - wr.top + (el.tagName === 'rect' ? Math.min(er.height * 0.35, 40) : 0)) + 'px';
    tip.style.opacity = 1;
    const svg = wrap.querySelector('svg'), xh = svg && svg.querySelector('.hz-xh');
    if (xh) { const vb = svg.viewBox.baseVal, x = (er.left - wr.left + er.width / 2) / wr.width * vb.width; xh.setAttribute('x1', x); xh.setAttribute('x2', x); xh.style.opacity = .7; }
    if (svg) svg.querySelectorAll('.hz-bar').forEach(b => b.classList.toggle('is-hover', el.dataset.pt === 'ribbon' && +b.dataset.i === +el.dataset.i));
  };
  root.addEventListener('pointermove', e => { const el = e.target.closest && e.target.closest('[data-pt]'); if (el) show(el); else hide(); });
  root.addEventListener('pointerleave', hide);
  root.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('[data-pt]'); if (el) show(el); });
  root.addEventListener('focusout', hide);
}
