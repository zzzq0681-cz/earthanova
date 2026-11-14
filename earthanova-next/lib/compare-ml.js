/* Compare page, third section: ML forecast of the day-to-night temperature swing (daily high minus daily low) for the user's dates.
 * The model itself lives on the server (predict.py: ridge regression per lead time, trained on NASA POWER daily data).
 * This file only draws its answer: the expected swing for the dates with an 80% range, the same dates in a typical year,
 * and a skill chart that shows how much better (or not) the model is at each lead time, taken from a backtest on the last 5 years.
 * Pure functions (data in, HTML strings out). Tooltips are wired by wirePlanner() from compare-planner.js. */

const C = { cyan: '#22D3EE', mint: '#36E2B1', amber: '#FFBE55', red: '#FF6178', violet: '#A78BFA', ink: '#EAF8FF', ink2: '#91AEC2', surface: '#0C2234' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => v != null && !Number.isNaN(v);
const f = (v, d = 0) => num(v) ? Number(v).toFixed(d) : '—';
const sg = (v, d = 1) => { if (!num(v)) return '—'; const r = Number(Math.abs(v).toFixed(d)); return (r === 0 ? '±' : v > 0 ? '+' : '−') + r.toFixed(d); };
const dShort = iso => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const dLong = iso => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const keyHtml = k => `<span><i class="hz-key hz-key-${k.kind}" style="--c:${k.color}"></i>${esc(k.name)}</span>`;
const W = 900, L = 42, R = 14;

function niceStep(span) { return span > 28 ? 10 : span > 14 ? 5 : span > 7 ? 2 : 1; }

/* ---------- chart 1: daily swing, model vs typical year ---------- */
function swingChart(days, tips) {
  const n = days.length, slot = (W - L - R) / n, X = i => L + (i + .5) * slot;
  const H = 240, T = 22, B = 30, ih = H - T - B;
  const vals = days.flatMap(d => [d.sl, d.sh, d.typ]);
  const step = niceStep(Math.max(...vals) - Math.min(...vals));
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.5) / step) * step), hi = Math.ceil((Math.max(...vals) + 0.5) / step) * step;
  const Y = v => T + (hi - v) / (hi - lo) * ih;
  let g = '';
  for (let t = lo; t <= hi + 1e-9; t += step) g += `<line class="hz-grid" x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="hz-ax" x="${L - 7}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${t}°</text>`;
  const inI = days.map((d, i) => d.in ? i : -1).filter(i => i >= 0);
  if (inI.length) {
    const a = L + inI[0] * slot, b = L + (inI[inI.length - 1] + 1) * slot;
    g += `<rect x="${a.toFixed(1)}" y="${T}" width="${(b - a).toFixed(1)}" height="${ih}" fill="${C.cyan}" opacity=".10" rx="3"/><text class="hz-ref-t" x="${(a + 6).toFixed(1)}" y="${T + 12}">Your dates</text>`;
  }
  const up = days.map((d, i) => `${X(i).toFixed(1)} ${Y(d.sh).toFixed(1)}`), dn = days.map((d, i) => `${X(i).toFixed(1)} ${Y(d.sl).toFixed(1)}`).reverse();
  g += `<path d="M${up.join(' L')} L${dn.join(' L')} Z" fill="${C.cyan}" opacity=".18"/>`;
  g += `<path d="M${days.map((d, i) => `${X(i).toFixed(1)} ${Y(d.typ).toFixed(1)}`).join(' L')}" fill="none" stroke="${C.ink2}" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round"/>`;
  g += `<path d="M${days.map((d, i) => `${X(i).toFixed(1)} ${Y(d.s).toFixed(1)}`).join(' L')}" fill="none" stroke="${C.cyan}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  [inI[0], inI[inI.length - 1]].filter((v, k, a) => v != null && a.indexOf(v) === k).forEach(i => { g += `<circle cx="${X(i).toFixed(1)}" cy="${Y(days[i].s).toFixed(1)}" r="4.5" fill="${C.cyan}" stroke="${C.surface}" stroke-width="2"/>`; });
  const every = Math.max(1, Math.ceil(n / 9));
  days.forEach((d, i) => { if (i % every === 0) g += `<text class="hz-ax" x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(dShort(d.d))}</text>`; });
  g += `<line class="hz-xh" y1="${T}" y2="${T + ih}"/>`;
  days.forEach((d, i) => { g += `<rect class="hz-hit" data-pt="mlswing" data-i="${i}" tabindex="0" x="${(X(i) - slot / 2).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${ih}" fill="transparent"/>`; });
  tips.mlswing = days.map(d => ({ head: dLong(d.d) + (d.in ? ' · your dates' : ''), rows: [
    { name: 'model: day-to-night swing', value: `${f(d.s, 1)} °C`, color: C.cyan, kind: 'line' },
    { name: '80% range', value: `${f(d.sl, 1)} to ${f(d.sh, 1)} °C`, color: C.cyan, kind: 'wash' },
    { name: 'typical year', value: `${f(d.typ, 1)} °C`, color: C.ink2, kind: 'dash' }] }));
  return `<svg class="hz-plot pl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Model forecast of the day-to-night temperature swing with an 80 percent range, against the typical year" data-w="${W}" data-h="${H}">${g}</svg>`;
}

/* ---------- chart 3: how good the model is at each lead time (from the backtest) ---------- */
const bucketLabel = b => b[0] === b[1] ? `${b[0]} d` : `${b[0]}–${b[1]} d`;
function skillChart(bt, mineBucket, tips) {
  const rows = bt.buckets, n = rows.length, slot = (W - L - R) / n, X = i => L + (i + .5) * slot, bw = Math.min(22, slot * 0.3);
  const H = 230, T = 26, B = 40, ih = H - T - B;
  const all = rows.flatMap(r => [r.dtr.skill_typical, r.dtr.skill_trend]);
  const hi = Math.max(10, Math.ceil(Math.max(...all) / 10) * 10), lo = Math.min(0, Math.floor(Math.min(...all) / 10) * 10), Y = v => T + (hi - v) / (hi - lo) * ih;
  let g = '';
  for (let t = lo; t <= hi; t += 10) g += `<line class="hz-grid" x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="hz-ax" x="${L - 7}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${t}%</text>`;
  g += `<line x1="${L}" x2="${W - R}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="${C.ink2}" stroke-width="1.5"/>`;
  rows.forEach((r, i) => {
    if (mineBucket && r.lead[0] === mineBucket[0]) g += `<rect x="${(X(i) - slot / 2 + 2).toFixed(1)}" y="${T - 6}" width="${(slot - 4).toFixed(1)}" height="${(ih + 6).toFixed(1)}" fill="${C.cyan}" opacity=".10" rx="4"/><text class="hz-ref-t" x="${X(i).toFixed(1)}" y="${T - 10}" text-anchor="middle" style="fill:${C.cyan}">your dates</text>`;
    [[r.dtr.skill_typical, C.cyan, -1], [r.dtr.skill_trend, C.violet, 1]].forEach(([v, col, side]) => {
      const x = X(i) + (side < 0 ? -bw - 1 : 1), y0 = Y(0), y1 = Y(v), top = Math.min(y0, y1), h = Math.abs(y1 - y0); if (h < 0.5) return;
      const rr = Math.min(4, h / 2, bw / 2), up = v >= 0;
      const d = up ? `M${x.toFixed(1)} ${y0.toFixed(1)}V${(top + rr).toFixed(1)}Q${x.toFixed(1)} ${top.toFixed(1)} ${(x + rr).toFixed(1)} ${top.toFixed(1)}H${(x + bw - rr).toFixed(1)}Q${(x + bw).toFixed(1)} ${top.toFixed(1)} ${(x + bw).toFixed(1)} ${(top + rr).toFixed(1)}V${y0.toFixed(1)}Z`
        : `M${x.toFixed(1)} ${y0.toFixed(1)}V${(top + h - rr).toFixed(1)}Q${x.toFixed(1)} ${(top + h).toFixed(1)} ${(x + rr).toFixed(1)} ${(top + h).toFixed(1)}H${(x + bw - rr).toFixed(1)}Q${(x + bw).toFixed(1)} ${(top + h).toFixed(1)} ${(x + bw).toFixed(1)} ${(top + h - rr).toFixed(1)}V${y0.toFixed(1)}Z`;
      g += `<path class="hz-bar" data-i="${i}" d="${d}" fill="${col}"/>`;
    });
    g += `<text class="hz-val" x="${(X(i) - bw / 2 - 1).toFixed(1)}" y="${(Y(Math.max(r.dtr.skill_typical, 0)) - 6).toFixed(1)}" text-anchor="middle">${f(r.dtr.skill_typical, 0)}%</text>`;
    g += `<text class="hz-ax" x="${X(i).toFixed(1)}" y="${H - 20}" text-anchor="middle">${esc(bucketLabel(r.lead))}</text>`;
  });
  g += `<text class="hz-ax" x="${(W / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">Days between the last NASA observation and the day being predicted</text>`;
  g += `<line class="hz-xh" y1="${T}" y2="${T + ih}"/>`;
  rows.forEach((r, i) => { g += `<rect class="hz-hit" data-pt="mlskill" data-i="${i}" tabindex="0" x="${(X(i) - slot / 2).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${ih}" fill="transparent"/>`; });
  tips.mlskill = rows.map(r => ({ head: `${bucketLabel(r.lead)} ahead · ${r.n} test cases`, rows: [
    { name: 'error below the typical-year method', value: `${sg(r.dtr.skill_typical, 0)}%`, color: C.cyan, kind: 'rect' },
    { name: 'error vs climate + warming trend', value: `${sg(r.dtr.skill_trend, 0)}%`, color: C.violet, kind: 'rect' },
    { name: 'model / typical error', value: `${f(r.dtr.mae, 2)} / ${f(r.dtr.mae_typical, 2)} °C`, color: C.ink2, kind: 'line' },
    { name: 'the 80% range held', value: `${f(r.cover80, 0)}% of days`, color: C.ink2, kind: 'line' },
    { name: 'recent weather used', value: r.used_recent_weather ? 'yes' : 'no, climate + trend only', color: C.ink2, kind: 'line' }] }));
  return `<svg class="hz-plot pl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Model skill by lead time: how much lower the swing error is than the typical year method" data-w="${W}" data-h="${H}">${g}</svg>`;
}

/* ---------- the section ---------- */
export function mlErrorHtml(place, msg, soft) {
  return `<section class="pl-sec" aria-label="ML forecast"><header class="pl-h"><div><p class="pl-k">ML forecast for your dates</p><h3>What does the model expect in ${esc(place)}?</h3></div></header><p class="${soft ? 'pl-verdict' : 'td-exp'}">${esc(msg)}</p></section>`;
}

const swingWord = v => v >= 13 ? 'large' : v >= 8 ? 'moderate' : 'small';
const swingAdvice = v => v >= 13 ? 'Hot days and much cooler nights (dry, clear air): bring a layer for the evenings.'
  : v >= 8 ? 'Evenings are noticeably cooler than the afternoons: a light layer is enough.'
  : 'Nights stay close to daytime temperatures (humid or cloudy air): do not expect a cool-down after sunset.';

/* ml: response of /api/predict with start/end. opts is kept for the caller but the swing does not depend on comfort range. */
export function mlHtml(ml, place, opts, tips) {
  const w = ml.window, bt = ml.backtest, m = ml.model, nd = w.nDays;
  const dS = w.dtr - w.typical.dtr, sk = w.skill, tm = sk && sk.dtr;
  const verdict = `For ${dShort(w.start)} to ${dShort(w.end)} the model expects a ${swingWord(w.dtr)} day-to-night swing of ${f(w.dtr, 1)} °C on average (80% range ${f(w.interval[0], 1)} to ${f(w.interval[1], 1)} °C), `
    + `${Math.abs(dS) < 0.3 ? 'about the same as' : `${f(Math.abs(dS), 1)} °C ${dS > 0 ? 'wider than' : 'narrower than'}`} a typical year. ${swingAdvice(w.dtr)}`;
  const lead = `Your dates start ${w.leadFirst} day${w.leadFirst > 1 ? 's' : ''} after the last NASA observation (${dLong(ml.issued)}). ` + (tm
    ? `At ${w.bucket[0]}–${w.bucket[1]} days ahead, the backtest (${bt.test_from.slice(0, 4)}–${bt.test_to.slice(0, 4)}, data the model had not seen) gave an average swing error of ${f(tm.mae, 1)} °C for the model against ${f(tm.mae_typical, 1)} °C for the typical-year method, ${tm.skill_typical >= 0.5 ? `${f(tm.skill_typical, 0)}% lower` : tm.skill_typical <= -0.5 ? `${f(-tm.skill_typical, 0)}% higher` : 'the same'}. The swing is within ±2 °C on ${f(tm.within2, 0)}% of days (typical year ${f(tm.within2_typical, 0)}%). `
      + (sk.used_recent_weather ? 'At this range the model still uses the recent weather (swing, temperature and how many days were wet).' : 'At this range recent weather no longer helps, so the model uses climate plus trend, the same as the typical year with a trend.') : '');
  const stats = [
    { k: 'Expected swing', v: `${f(w.dtr, 1)} °C`, s: `80% range ${f(w.interval[0], 1)} to ${f(w.interval[1], 1)} · ${swingWord(w.dtr)}` },
    { k: 'Typical year', v: `${f(w.typical.dtr, 1)} °C`, s: `${sg(dS)} °C vs the model` },
    { k: 'Typical day / night', v: `${f(w.typical.hi, 0)} / ${f(w.typical.lo, 0)} °C`, s: 'average high / low for these dates' },
    { k: 'Model error in the backtest', v: tm ? `${f(tm.mae, 1)} °C` : '—', s: tm ? `typical-year method ${f(tm.mae_typical, 1)} °C` : 'not available for this range' }
  ];
  const tilesHtml = stats.map(x => `<div class="ml-stat"><span>${esc(x.k)}</span><b>${x.v}</b><small>${esc(x.s)}</small></div>`).join('');
  const days = w.days;
  const keysT = [{ name: 'Model: day-to-night swing', color: C.cyan, kind: 'line' }, { name: '80% range', color: C.cyan, kind: 'wash' }, { name: 'Typical year', color: C.ink2, kind: 'dash' }];
  const keysS = [{ name: 'Error reduction vs the typical-year method', color: C.cyan, kind: 'rect' }, { name: 'vs climate + warming trend only', color: C.violet, kind: 'rect' }];
  const dayTable = `<details class="hz-table"><summary>Table view</summary><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Date</th><th>Swing °C</th><th>80% range</th><th>Typical year</th></tr></thead><tbody>${days.map(d => `<tr><td>${esc(dLong(d.d))}${d.in ? ' ●' : ''}</td><td>${f(d.s, 1)}</td><td>${f(d.sl, 1)} to ${f(d.sh, 1)}</td><td>${f(d.typ, 1)}</td></tr>`).join('')}</tbody></table></div></details>`;
  const skillTable = `<details class="hz-table"><summary>Table view</summary><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Lead</th><th>Test cases</th><th>Model error °C</th><th>Typical-year error °C</th><th>Skill vs typical</th><th>Skill vs trend</th><th>R² model / typical</th><th>Within ±2 °C model / typical</th><th>80% range held</th><th>Recent weather used</th></tr></thead><tbody>${bt.buckets.map(r => `<tr><td>${esc(bucketLabel(r.lead))}</td><td>${r.n}</td><td>${f(r.dtr.mae, 2)}</td><td>${f(r.dtr.mae_typical, 2)}</td><td>${sg(r.dtr.skill_typical, 1)}%</td><td>${sg(r.dtr.skill_trend, 1)}%</td><td>${f(r.dtr.r2, 2)} / ${f(r.dtr.r2_typical, 2)}</td><td>${f(r.dtr.within2, 0)}% / ${f(r.dtr.within2_typical, 0)}%</td><td>${f(r.cover80, 0)}%</td><td>${r.used_recent_weather ? 'yes' : 'no'}</td></tr>`).join('')}</tbody></table></div></details>`;
  return `<section class="pl-sec ml-sec" aria-label="ML forecast">
    <header class="pl-h"><div><p class="pl-k">ML forecast for your dates</p><h3>How big will the day-to-night swing be in ${esc(place)}?</h3></div><span class="ml-badge">Trained on NASA POWER daily data, ${esc(m.train_from.slice(0, 4))}–${esc(m.train_to.slice(0, 4))}</span></header>
    <p class="pl-verdict">${esc(verdict)}</p>
    <div class="ml-stats">${tilesHtml}</div>
    ${w.clipped ? `<p class="hz-note">Part of your dates is outside what the model can predict (it starts the day after the last NASA observation and looks at most 12 months ahead), so only ${esc(dShort(w.start))} to ${esc(dShort(w.end))} is used.</p>` : ''}
    <figure class="hz-fig pl-fig"><figcaption><b>Day-to-night swing: model vs typical year</b><span>The swing is the daily high minus the daily low. The line is the model, the band is where 8 days in 10 should fall, the dashed line is a typical year (the average seasonal cycle, with no trend)</span></figcaption><div class="hz-wrap" data-pl="mlswing">${swingChart(days, tips)}<div class="tip hz-tip"></div></div><div class="hz-legend">${keysT.map(keyHtml).join('')}</div>${dayTable}</figure>
    <figure class="hz-fig pl-fig"><figcaption><b>How good is the model at each lead time?</b><span>Backtest on ${esc(bt.test_from.slice(0, 4))}–${esc(bt.test_to.slice(0, 4))}: the model was trained only on data before ${esc(dLong(bt.train_to))}, then predicted days it had never seen. Above 0% means a smaller error than the typical-year method.</span></figcaption><div class="hz-wrap" data-pl="mlskill">${skillChart(bt, w.bucket, tips)}<div class="tip hz-tip"></div></div><div class="hz-legend">${keysS.map(keyHtml).join('')}</div>${skillTable}</figure>
    <p class="pl-win-f">${esc(lead)}</p>
    <details class="ml-how"><summary>How the model works</summary><ul class="hz-analysis">
      <li>Why the swing: the average temperature is almost entirely the season, so any method looks the same. The swing (daily high minus daily low) changes much more from day to day: dry, clear air gives hot days and cold nights, humid or cloudy air gives a small swing.</li>
      <li>Data: ${esc(String(m.n_days))} days of NASA POWER daily high and low temperature, mean temperature and rain for this grid cell, from ${esc(m.train_from)} to ${esc(m.train_to)}.</li>
      <li>Step 1, climate and trend: a regression on the time of year and on the year itself gives the normal swing for each day and how it is changing here (${sg(m.trend_per_decade, 2)} °C per decade at this point).</li>
      <li>Step 2, recent weather: one ridge regression per lead time (1–3, 4–7, 8–14, 15–30, 31–60, 61–120, 121–240 and 241–400 days) learns how much the recent swing, the recent temperature anomaly and the share of wet days still matter for the target day. A lead time only uses it if it beats climate plus trend on days held out of the training.</li>
      <li>The 80% range comes from the model's own errors for that lead time and month. The range for the whole period uses the same dates in past years.</li>
      <li>Limits: this is a statistical model, not a weather forecast. Beyond about two weeks it is mostly climate plus trend, and the chart above shows that openly. Grid values (about 50 km) can differ from a station.</li></ul></details>
    <p class="hz-note">Source: NASA POWER daily data (MERRA-2 based), model trained on this server. “Typical year” here is the average seasonal cycle over the whole record without a trend. It is guidance, not a safety guarantee; always check official forecasts close to departure.</p></section>`;
}
