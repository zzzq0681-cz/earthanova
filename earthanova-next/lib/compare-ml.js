/* Compare page, third section: ML forecast for the user's dates.
 * The model itself lives on the server (predict.py: ridge regression + logistic regression trained on NASA POWER daily data).
 * This file only draws its answer: expected temperature and rain for the dates with an 80% range, the same dates in a typical year,
 * and a skill chart that shows how much better (or not) the model is at each lead time, taken from a backtest on the last 5 years.
 * Pure functions (data in, HTML strings out). Tooltips are wired by wirePlanner() from compare-planner.js. */
import { scoreWeek, levelOfScore } from './compare-planner.js';

const C = { cyan: '#22D3EE', mint: '#36E2B1', amber: '#FFBE55', red: '#FF6178', violet: '#A78BFA', ink: '#EAF8FF', ink2: '#91AEC2', surface: '#0C2234' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => v != null && !Number.isNaN(v);
const f = (v, d = 0) => num(v) ? Number(v).toFixed(d) : '—';
const sg = (v, d = 1) => !num(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d);
const dShort = iso => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const dLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const keyHtml = k => `<span><i class="hz-key hz-key-${k.kind}" style="--c:${k.color}"></i>${esc(k.name)}</span>`;
const LEVEL_COL = { good: C.mint, ok: C.amber, poor: C.red };
const LEVEL_TXT = { good: 'Comfortable', ok: 'Acceptable', poor: 'Poor' };
const W = 900, L = 42, R = 14;

function niceStep(span) { return span > 28 ? 10 : span > 14 ? 5 : span > 7 ? 2 : 1; }

/* ---------- chart 1: daily temperature, model vs typical year ---------- */
function tempChart(days, range, tips) {
  const n = days.length, slot = (W - L - R) / n, X = i => L + (i + .5) * slot;
  const H = 240, T = 22, B = 30, ih = H - T - B;
  const vals = days.flatMap(d => [d.tl, d.th, d.typ]).concat(range);
  const step = niceStep(Math.max(...vals) - Math.min(...vals));
  const lo = Math.floor((Math.min(...vals) - 0.5) / step) * step, hi = Math.ceil((Math.max(...vals) + 0.5) / step) * step;
  const Y = v => T + (hi - v) / (hi - lo) * ih;
  let g = '';
  for (let t = lo; t <= hi + 1e-9; t += step) g += `<line class="hz-grid" x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="hz-ax" x="${L - 7}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${t}°</text>`;
  /* the user's own days */
  const inI = days.map((d, i) => d.in ? i : -1).filter(i => i >= 0);
  if (inI.length) {
    const a = L + inI[0] * slot, b = L + (inI[inI.length - 1] + 1) * slot;
    g += `<rect x="${a.toFixed(1)}" y="${T}" width="${(b - a).toFixed(1)}" height="${ih}" fill="${C.cyan}" opacity=".10" rx="3"/><text class="hz-ref-t" x="${(a + 6).toFixed(1)}" y="${T + 12}">Your dates</text>`;
  }
  g += `<rect x="${L}" y="${Y(range[1]).toFixed(1)}" width="${W - L - R}" height="${(Y(range[0]) - Y(range[1])).toFixed(1)}" fill="${C.mint}" opacity=".10"/>`;
  const up = days.map((d, i) => `${X(i).toFixed(1)} ${Y(d.th).toFixed(1)}`), dn = days.map((d, i) => `${X(i).toFixed(1)} ${Y(d.tl).toFixed(1)}`).reverse();
  g += `<path d="M${up.join(' L')} L${dn.join(' L')} Z" fill="${C.cyan}" opacity=".18"/>`;
  g += `<path d="M${days.map((d, i) => `${X(i).toFixed(1)} ${Y(d.typ).toFixed(1)}`).join(' L')}" fill="none" stroke="${C.ink2}" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round"/>`;
  g += `<path d="M${days.map((d, i) => `${X(i).toFixed(1)} ${Y(d.t).toFixed(1)}`).join(' L')}" fill="none" stroke="${C.cyan}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  [inI[0], inI[inI.length - 1]].filter((v, k, a) => v != null && a.indexOf(v) === k).forEach(i => { g += `<circle cx="${X(i).toFixed(1)}" cy="${Y(days[i].t).toFixed(1)}" r="4.5" fill="${C.cyan}" stroke="${C.surface}" stroke-width="2"/>`; });
  const every = Math.max(1, Math.ceil(n / 9));
  days.forEach((d, i) => { if (i % every === 0) g += `<text class="hz-ax" x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(dShort(d.d))}</text>`; });
  g += `<line class="hz-xh" y1="${T}" y2="${T + ih}"/>`;
  days.forEach((d, i) => { g += `<rect class="hz-hit" data-pt="mltemp" data-i="${i}" tabindex="0" x="${(X(i) - slot / 2).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${ih}" fill="transparent"/>`; });
  tips.mltemp = days.map((d, i) => ({ head: dLong(d.d) + (d.in ? ' · your dates' : ''), rows: [
    { name: 'model: mean temperature', value: `${f(d.t, 1)} °C`, color: C.cyan, kind: 'line' },
    { name: '80% range', value: `${f(d.tl, 1)} to ${f(d.th, 1)} °C`, color: C.cyan, kind: 'wash' },
    { name: 'typical year', value: `${f(d.typ, 1)} °C`, color: C.ink2, kind: 'dash' },
    { name: 'high / low', value: `${f(d.hi, 0)} / ${f(d.lo, 0)} °C`, color: C.cyan, kind: 'rect' }] }));
  return `<svg class="hz-plot pl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Model forecast of the daily mean temperature with an 80 percent range, against the typical year" data-w="${W}" data-h="${H}">${g}</svg>`;
}

/* ---------- chart 2: chance of rain each day ---------- */
function rainChart(days, tips) {
  const n = days.length, slot = (W - L - R) / n, X = i => L + (i + .5) * slot, bw = Math.min(16, slot * 0.7);
  const H = 130, T = 10, B = 26, ih = H - T - B, top = Math.max(50, Math.ceil(Math.max(...days.map(d => d.pw * 100)) / 25) * 25), Y = v => T + (top - v) / top * ih;
  let g = '';
  for (let t = 0; t <= top; t += top / 2) g += `<line class="hz-grid" x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="hz-ax" x="${L - 7}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${t}%</text>`;
  days.forEach((d, i) => {
    const v = d.pw * 100, x = X(i) - bw / 2, y = Y(v), h = Y(0) - y; if (h < 1) return;
    const r = Math.min(4, h / 2, bw / 2);
    g += `<path class="hz-bar" data-i="${i}" d="M${x.toFixed(1)} ${Y(0).toFixed(1)}V${(y + r).toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${(x + r).toFixed(1)} ${y.toFixed(1)}H${(x + bw - r).toFixed(1)}Q${(x + bw).toFixed(1)} ${y.toFixed(1)} ${(x + bw).toFixed(1)} ${(y + r).toFixed(1)}V${Y(0).toFixed(1)}Z" fill="${C.cyan}" opacity="${d.in ? 1 : .4}"/>`;
  });
  const every = Math.max(1, Math.ceil(n / 9));
  days.forEach((d, i) => { if (i % every === 0) g += `<text class="hz-ax" x="${X(i).toFixed(1)}" y="${H - 7}" text-anchor="middle">${esc(dShort(d.d))}</text>`; });
  g += `<line class="hz-xh" y1="${T}" y2="${T + ih}"/>`;
  days.forEach((d, i) => { g += `<rect class="hz-hit" data-pt="mlrain" data-i="${i}" tabindex="0" x="${(X(i) - slot / 2).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${ih}" fill="transparent"/>`; });
  tips.mlrain = days.map(d => ({ head: dLong(d.d) + (d.in ? ' · your dates' : ''), rows: [
    { name: 'chance of a wet day (1 mm or more)', value: `${f(d.pw * 100, 0)}%`, color: C.cyan, kind: 'rect' },
    { name: 'expected rain', value: `${f(d.r, 1)} mm`, color: C.cyan, kind: 'line' }] }));
  return `<svg class="hz-plot pl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chance of rain for each day" data-w="${W}" data-h="${H}">${g}</svg>`;
}

/* ---------- chart 3: how good the model is at each lead time (from the backtest) ---------- */
const bucketLabel = b => b[0] === b[1] ? `${b[0]} d` : `${b[0]}–${b[1]} d`;
function skillChart(bt, mineBucket, tips) {
  const rows = bt.buckets, n = rows.length, slot = (W - L - R) / n, X = i => L + (i + .5) * slot, bw = Math.min(22, slot * 0.3);
  const H = 230, T = 26, B = 40, ih = H - T - B;
  const all = rows.flatMap(r => [r.tmean.skill_typical, r.tmean.skill_trend]);
  const hi = Math.max(10, Math.ceil(Math.max(...all) / 10) * 10), lo = Math.min(0, Math.floor(Math.min(...all) / 10) * 10), Y = v => T + (hi - v) / (hi - lo) * ih;
  let g = '';
  for (let t = lo; t <= hi; t += 10) g += `<line class="hz-grid" x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="hz-ax" x="${L - 7}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${t}%</text>`;
  g += `<line x1="${L}" x2="${W - R}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="${C.ink2}" stroke-width="1.5"/>`;
  rows.forEach((r, i) => {
    if (mineBucket && r.lead[0] === mineBucket[0]) g += `<rect x="${(X(i) - slot / 2 + 2).toFixed(1)}" y="${T - 6}" width="${(slot - 4).toFixed(1)}" height="${(ih + 6).toFixed(1)}" fill="${C.cyan}" opacity=".10" rx="4"/><text class="hz-ref-t" x="${X(i).toFixed(1)}" y="${T - 10}" text-anchor="middle" style="fill:${C.cyan}">your dates</text>`;
    [[r.tmean.skill_typical, C.cyan, -1], [r.tmean.skill_trend, C.violet, 1]].forEach(([v, col, side]) => {
      const x = X(i) + (side < 0 ? -bw - 1 : 1), y0 = Y(0), y1 = Y(v), top = Math.min(y0, y1), h = Math.abs(y1 - y0); if (h < 0.5) return;
      const rr = Math.min(4, h / 2, bw / 2), up = v >= 0;
      const d = up ? `M${x.toFixed(1)} ${y0.toFixed(1)}V${(top + rr).toFixed(1)}Q${x.toFixed(1)} ${top.toFixed(1)} ${(x + rr).toFixed(1)} ${top.toFixed(1)}H${(x + bw - rr).toFixed(1)}Q${(x + bw).toFixed(1)} ${top.toFixed(1)} ${(x + bw).toFixed(1)} ${(top + rr).toFixed(1)}V${y0.toFixed(1)}Z`
        : `M${x.toFixed(1)} ${y0.toFixed(1)}V${(top + h - rr).toFixed(1)}Q${x.toFixed(1)} ${(top + h).toFixed(1)} ${(x + rr).toFixed(1)} ${(top + h).toFixed(1)}H${(x + bw - rr).toFixed(1)}Q${(x + bw).toFixed(1)} ${(top + h).toFixed(1)} ${(x + bw).toFixed(1)} ${(top + h - rr).toFixed(1)}V${y0.toFixed(1)}Z`;
      g += `<path class="hz-bar" data-i="${i}" d="${d}" fill="${col}"/>`;
    });
    g += `<text class="hz-val" x="${(X(i) - bw / 2 - 1).toFixed(1)}" y="${(Y(Math.max(r.tmean.skill_typical, 0)) - 6).toFixed(1)}" text-anchor="middle">${f(r.tmean.skill_typical, 0)}%</text>`;
    g += `<text class="hz-ax" x="${X(i).toFixed(1)}" y="${H - 20}" text-anchor="middle">${esc(bucketLabel(r.lead))}</text>`;
  });
  g += `<text class="hz-ax" x="${(W / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">Days between the last NASA observation and the day being predicted</text>`;
  g += `<line class="hz-xh" y1="${T}" y2="${T + ih}"/>`;
  rows.forEach((r, i) => { g += `<rect class="hz-hit" data-pt="mlskill" data-i="${i}" tabindex="0" x="${(X(i) - slot / 2).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${ih}" fill="transparent"/>`; });
  tips.mlskill = rows.map(r => ({ head: `${bucketLabel(r.lead)} ahead · ${r.n} test cases`, rows: [
    { name: 'error below the typical-year method', value: `${sg(r.tmean.skill_typical, 0)}%`, color: C.cyan, kind: 'rect' },
    { name: 'error vs climate + warming trend', value: `${sg(r.tmean.skill_trend, 0)}%`, color: C.violet, kind: 'rect' },
    { name: 'model / typical error', value: `${f(r.tmean.mae, 2)} / ${f(r.tmean.mae_typical, 2)} °C`, color: C.ink2, kind: 'line' },
    { name: 'the 80% range held', value: `${f(r.cover80, 0)}% of days`, color: C.ink2, kind: 'line' },
    { name: 'rain-chance score vs typical', value: `${sg(r.rain.skill_typical, 0)}%`, color: C.ink2, kind: 'line' }] }));
  return `<svg class="hz-plot pl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Model skill by lead time: how much lower the temperature error is than the typical year method" data-w="${W}" data-h="${H}">${g}</svg>`;
}

/* ---------- the section ---------- */
export function mlErrorHtml(place, msg, soft) {
  return `<section class="pl-sec" aria-label="ML forecast"><header class="pl-h"><div><p class="pl-k">ML forecast for your dates</p><h3>What does the model expect in ${esc(place)}?</h3></div></header><p class="${soft ? 'pl-verdict' : 'td-exp'}">${esc(msg)}</p></section>`;
}

/* ml: response of /api/predict with start/end. opts: {range:[lo,hi], purpose, dust} */
export function mlHtml(ml, place, opts, tips) {
  const w = ml.window, bt = ml.backtest, m = ml.model;
  const a = scoreWeek(w, opts.range, opts.purpose, opts.dust), t = scoreWeek(w.typical, opts.range, opts.purpose, opts.dust);
  const lv = levelOfScore(a.score), nd = w.nDays, dT = w.meanT - w.typical.meanT;
  const sk = w.skill, tm = sk && sk.tmean;
  const typRain = w.typical.rainPerDay * nd, typWet = w.typical.wetFrac * nd;
  const verdict = `For ${dShort(w.start)} to ${dShort(w.end)} the model expects ${f(w.meanT, 1)} °C on average (80% range ${f(w.tInterval[0], 1)} to ${f(w.tInterval[1], 1)} °C), `
    + `${f(w.rainMm, 0)} mm of rain over about ${f(w.wetDays, 1)} wet day${Math.abs(w.wetDays - 1) < .05 ? '' : 's'}. That is ${Math.abs(dT) < 0.15 ? 'about the same as' : `${f(Math.abs(dT), 1)} °C ${dT > 0 ? 'warmer' : 'cooler'} than`} a typical year.`;
  const lead = `Your dates start ${w.leadFirst} day${w.leadFirst > 1 ? 's' : ''} after the last NASA observation (${dLong(ml.issued)}). ` + (tm
    ? `At ${w.bucket[0]}–${w.bucket[1]} days ahead the model's daily mean temperature is within ±2 °C on ${f(tm.within2, 0)}% of days (typical year ${f(tm.within2_typical, 0)}%) and explains ${f(tm.r2 * 100, 0)}% of the variation (R², typical year ${f(tm.r2_typical * 100, 0)}%): that high figure is mostly the seasons, which any method gets right. The backtest (${bt.test_from.slice(0, 4)}–${bt.test_to.slice(0, 4)}, data the model had not seen) gave an average temperature error of ${f(tm.mae, 1)} °C for the model against ${f(tm.mae_typical, 1)} °C for the typical-year method, ${tm.skill_typical >= 0 ? `${f(tm.skill_typical, 0)}% lower` : `${f(-tm.skill_typical, 0)}% higher`}. `
      + (tm.skill_trend >= 3 ? `About ${f(tm.skill_trend, 0)} points of that come from recent weather persistence; the rest is the warming trend.` : 'Almost all of that gain is the warming trend; at this range recent weather no longer helps.') : '');
  const stats = [
    { k: 'Mean temperature', v: `${f(w.meanT, 1)} °C`, s: `80% range ${f(w.tInterval[0], 1)} to ${f(w.tInterval[1], 1)} · typical year ${f(w.typical.meanT, 1)} (${sg(dT)})` },
    { k: 'Daily high / low', v: `${f(w.hi, 0)} / ${f(w.lo, 0)} °C`, s: `typical year ${f(w.typical.hi, 0)} / ${f(w.typical.lo, 0)}` },
    { k: 'Rain', v: `${f(w.rainMm, 0)} mm`, s: `${f(w.wetDays, 1)} wet days · typical year ${f(typRain, 0)} mm, ${f(typWet, 1)} days` },
    { k: 'Comfort and safety score', v: `<span style="color:${LEVEL_COL[lv]}">${a.score}</span> / 100`, s: `${LEVEL_TXT[lv]} · typical year ${t.score}` }
  ];
  const tilesHtml = stats.map(x => `<div class="ml-stat"><span>${esc(x.k)}</span><b>${x.v}</b><small>${esc(x.s)}</small></div>`).join('');
  const days = w.days;
  const keysT = [{ name: 'Model: daily mean temperature', color: C.cyan, kind: 'line' }, { name: '80% range', color: C.cyan, kind: 'wash' }, { name: 'Typical year', color: C.ink2, kind: 'dash' }, { name: `Your comfort range ${opts.range[0]} to ${opts.range[1]} °C`, color: C.mint, kind: 'wash' }];
  const keysS = [{ name: 'Error reduction vs the typical-year method', color: C.cyan, kind: 'rect' }, { name: 'vs climate + warming trend only', color: C.violet, kind: 'rect' }];
  const dayTable = `<details class="hz-table"><summary>Table view</summary><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Date</th><th>Mean °C</th><th>80% range</th><th>High</th><th>Low</th><th>Typical year</th><th>Wet-day chance</th><th>Rain mm</th></tr></thead><tbody>${days.map(d => `<tr><td>${esc(dLong(d.d))}${d.in ? ' ●' : ''}</td><td>${f(d.t, 1)}</td><td>${f(d.tl, 1)} to ${f(d.th, 1)}</td><td>${f(d.hi, 1)}</td><td>${f(d.lo, 1)}</td><td>${f(d.typ, 1)}</td><td>${f(d.pw * 100, 0)}%</td><td>${f(d.r, 1)}</td></tr>`).join('')}</tbody></table></div></details>`;
  const skillTable = `<details class="hz-table"><summary>Table view</summary><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Lead</th><th>Test cases</th><th>Model error °C</th><th>Typical-year error °C</th><th>Skill vs typical</th><th>Skill vs trend</th><th>R² model / typical</th><th>Within ±2 °C model / typical</th><th>80% range held</th><th>Rain skill</th></tr></thead><tbody>${bt.buckets.map(r => `<tr><td>${esc(bucketLabel(r.lead))}</td><td>${r.n}</td><td>${f(r.tmean.mae, 2)}</td><td>${f(r.tmean.mae_typical, 2)}</td><td>${sg(r.tmean.skill_typical, 1)}%</td><td>${sg(r.tmean.skill_trend, 1)}%</td><td>${f(r.tmean.r2, 2)} / ${f(r.tmean.r2_typical, 2)}</td><td>${f(r.tmean.within2, 0)}% / ${f(r.tmean.within2_typical, 0)}%</td><td>${f(r.cover80, 0)}%</td><td>${sg(r.rain.skill_typical, 1)}%</td></tr>`).join('')}</tbody></table></div></details>`;
  return `<section class="pl-sec ml-sec" aria-label="ML forecast">
    <header class="pl-h"><div><p class="pl-k">ML forecast for your dates</p><h3>What does the model expect in ${esc(place)}?</h3></div><span class="ml-badge">Trained on NASA POWER daily data, ${esc(m.train_from.slice(0, 4))}–${esc(m.train_to.slice(0, 4))}</span></header>
    <p class="pl-verdict">${esc(verdict)}</p>
    <div class="ml-stats">${tilesHtml}</div>
    ${w.clipped ? `<p class="hz-note">Part of your dates is outside what the model can predict (it starts the day after the last NASA observation and looks at most 12 months ahead), so only ${esc(dShort(w.start))} to ${esc(dShort(w.end))} is used.</p>` : ''}
    <figure class="hz-fig pl-fig"><figcaption><b>Daily temperature: model vs typical year</b><span>The line is the model, the band is where 8 days in 10 should fall, the dashed line is a typical year (the average seasonal cycle, with no warming trend)</span></figcaption><div class="hz-wrap" data-pl="mltemp">${tempChart(days, opts.range, tips)}<div class="tip hz-tip"></div></div><div class="hz-legend">${keysT.map(keyHtml).join('')}</div>${dayTable}</figure>
    <figure class="hz-fig pl-fig"><figcaption><b>Chance of rain each day</b><span>Probability that a day gets 1 mm or more (NASA POWER rain, not IMERG)</span></figcaption><div class="hz-wrap" data-pl="mlrain">${rainChart(days, tips)}<div class="tip hz-tip"></div></div></figure>
    <figure class="hz-fig pl-fig"><figcaption><b>How good is the model at each lead time?</b><span>Backtest on ${esc(bt.test_from.slice(0, 4))}–${esc(bt.test_to.slice(0, 4))}: the model was trained only on data before ${esc(dLong(bt.train_to))}, then predicted days it had never seen. Above 0% means a smaller error than the typical-year method.</span></figcaption><div class="hz-wrap" data-pl="mlskill">${skillChart(bt, w.bucket, tips)}<div class="tip hz-tip"></div></div><div class="hz-legend">${keysS.map(keyHtml).join('')}</div>${skillTable}</figure>
    <p class="pl-win-f">${esc(lead)}</p>
    <details class="ml-how"><summary>How the model works</summary><ul class="hz-analysis">
      <li>Data: ${esc(String(m.n_days))} days of NASA POWER daily temperature (mean, high, low) and rain for this grid cell, from ${esc(m.train_from)} to ${esc(m.train_to)}.</li>
      <li>Step 1, climate and trend: a regression on the time of year and on the year itself gives the normal temperature for each day and how fast it is warming here (${sg(m.trend_per_decade, 2)} °C per decade at this point).</li>
      <li>Step 2, recent weather: one ridge regression per lead time (1–3, 4–7, 8–14, 15–30, 31–60, 61–120, 121–240 and 241–400 days) learns how much the anomalies of the last 3, 7, 30, 90 and 365 days still matter for the target day.</li>
      <li>Rain: a logistic regression gives the chance that a day gets 1 mm or more, multiplied by the usual rain on wet days at that time of year.</li>
      <li>The 80% range comes from the model's own errors for that lead time and month. The range for the whole period uses the same dates in past years.</li>
      <li>Limits: this is a statistical model, not a weather forecast. Beyond about two weeks it is mostly climate plus warming trend, and the chart above shows that openly. Grid values (about 50 km) can differ from a station.</li></ul></details>
    <p class="hz-note">Source: NASA POWER daily data (MERRA-2 based), model trained on this server. “Typical year” here is the average seasonal cycle over the whole record without a trend (the sections below use the last 10 years instead). It is guidance, not a safety guarantee; always check official forecasts close to departure.</p></section>`;
}
