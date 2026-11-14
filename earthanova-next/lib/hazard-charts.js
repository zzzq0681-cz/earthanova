/* Hazard visuals for the Risk page: one or two charts plus a written analysis per tower.
 * Pure functions (data in, strings out) so they can be unit-tested. Colours are the site's own tokens.
 * Marks follow the dataviz specs: bars <= 24 px with a 4 px rounded cap, 2 px lines, 8 px end dots with a surface ring,
 * hairline grid, a 2 px gap between stacked segments, tooltips on hover plus a table view for every chart. */

export const C = {cyan:'#22D3EE', mint:'#36E2B1', amber:'#FFBE55', red:'#FF6178', violet:'#A78BFA', ink:'#EAF8FF', ink2:'#91AEC2', surface:'#0C2234'};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => v != null && !Number.isNaN(v);
const mean = a => { const v = a.filter(num); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const median = a => { const v = a.filter(num).sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
const f = (v, d = 1) => num(v) ? Number(v).toFixed(d) : '—';
const sg = (v, d = 1) => !num(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d);

/* ---------- series helpers ---------- */
/* Annual values from the monthly NASA series; only complete years (12 valid months). mode: 'mean' | 'sum' */
export function annualFrom(series, key, mode = 'mean', scaleByDays = false) {
  const by = {};
  series.month.forEach((m, i) => {
    const v = series[key] ? series[key][i] : null;
    if (v == null) return;
    const y = +m.slice(0, 4), mo = +m.slice(5, 7);
    (by[y] ??= []).push(scaleByDays ? v * new Date(y, mo, 0).getDate() : v);
  });
  const years = Object.keys(by).map(Number).sort((a, b) => a - b).filter(y => by[y].length === 12);
  return { years, values: years.map(y => mode === 'sum' ? by[y].reduce((s, x) => s + x, 0) : mean(by[y])) };
}
/* Sen line through (years, values) with a given slope per year: intercept from the median residual. */
function senLine(years, values, slopePerYear) {
  const ic = median(values.map((v, i) => v == null ? null : v - slopePerYear * years[i]));
  return { v0: ic + slopePerYear * years[0], v1: ic + slopePerYear * years[years.length - 1] };
}
function ols(xs, ys) {
  const p = xs.map((x, i) => [x, ys[i]]).filter(q => num(q[1])), n = p.length;
  if (n < 3) return null;
  const mx = mean(p.map(q => q[0])), my = mean(p.map(q => q[1]));
  let sxx = 0, sxy = 0; p.forEach(([x, y]) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); });
  const b = sxy / sxx; return { slope: b, a: my - b * mx };
}
const argmax = a => a.reduce((b, v, i) => num(v) && (b < 0 || v > a[b]) ? i : b, -1);
const argmin = a => a.reduce((b, v, i) => num(v) && (b < 0 || v < a[b]) ? i : b, -1);

/* ---------- renderer ---------- */
function niceTicks(lo, hi, want = 4) {
  const span = hi - lo || 1, raw = span / want, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(10));
  return t;
}
const roundedTop = (x, y, w, h, r) => {
  x = +x; y = +y; w = +w; h = +h;
  if (h <= 0) return '';
  r = Math.min(r, h / 2, w / 2);
  return r <= 0 ? `M${x} ${y}h${w}v${h}h${-w}Z` : `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
};

/* spec: {title, sub, kind:'bars'|'line', xs:[label], series:[{name,color,values,colors?}], stacked, refs:[{v,label}],
 *        trend:{v0,v1,label}, shade:{i0,i1,label}, marks:[{i,v,label}], unit, dec, yMin, yMax, legend:[{name,color,kind}], alt} */
export function renderChart(spec, uid) {
  const W = 440, H = 206, L = 44, R = (spec.refs && spec.refs.length) ? 66 : 18, T = 16, B = 28, n = spec.xs.length, dec = spec.dec ?? 1;
  const bars = spec.kind === 'bars';
  const all = [];
  if (spec.stacked) {
    for (let i = 0; i < n; i++) all.push(spec.series.reduce((s, x) => s + (x.values[i] || 0), 0));
  } else spec.series.forEach(s => s.values.forEach(v => num(v) && all.push(v)));
  (spec.refs || []).forEach(r => all.push(r.v));
  if (spec.trend) all.push(spec.trend.v0, spec.trend.v1);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (bars) lo = Math.min(0, spec.yMin ?? 0); else { const pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad; }
  if (spec.yMin != null && !bars) lo = spec.yMin;
  if (spec.yMax != null) hi = spec.yMax; else if (bars) hi *= 1.12;
  if (hi === lo) hi = lo + 1;
  const ticks = niceTicks(lo, hi, 4); lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
  const iw = W - L - R, ih = H - T - B, slot = bars ? iw / n : iw / Math.max(1, n - 1);
  const X = i => bars ? L + (i + 0.5) * slot : L + i * slot, Y = v => T + (hi - v) / (hi - lo) * ih;
  const tstep = ticks.length > 1 ? ticks[1] - ticks[0] : 1, tdec = tstep >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(tstep) - 1e-9) + (Math.abs(tstep * 10 ** Math.ceil(-Math.log10(tstep)) - Math.round(tstep * 10 ** Math.ceil(-Math.log10(tstep)))) > 1e-6 ? 1 : 0));
  const fmtTick = v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'k' : v.toFixed(tdec);
  let g = '';
  /* shaded window */
  if (spec.shade) {
    const x0 = bars ? L + spec.shade.i0 * slot : X(spec.shade.i0) - slot / 2, x1 = bars ? L + (spec.shade.i1 + 1) * slot : X(spec.shade.i1) + slot / 2;
    g += `<rect x="${Math.max(L, x0).toFixed(1)}" y="${T}" width="${(Math.min(W - R, x1) - Math.max(L, x0)).toFixed(1)}" height="${ih}" fill="${C.cyan}" opacity=".07"/>`;
  }
  ticks.forEach(t => { g += `<line class="hz-grid" x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/><text class="hz-ax" x="${L - 7}" y="${(Y(t) + 4).toFixed(1)}" text-anchor="end">${fmtTick(t)}</text>`; });
  const every = Math.max(1, Math.ceil(n / 8));
  spec.xs.forEach((x, i) => { if (i % every === 0 || i === n - 1) { if (i !== n - 1 && n - 1 - i < every) return; g += `<text class="hz-ax" x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(x)}</text>`; } });
  /* reference lines */
  (spec.refs || []).forEach(r => { g += `<line class="hz-ref" x1="${L}" x2="${W - R + 2}" y1="${Y(r.v).toFixed(1)}" y2="${Y(r.v).toFixed(1)}"/><text class="hz-ref-t" x="${W - R + 5}" y="${(Y(r.v) + 3.5).toFixed(1)}" text-anchor="start">${esc(r.label)}</text>`; });
  /* marks */
  if (bars) {
    const bw = Math.min(24, slot * 0.62), cum = Array(n).fill(0);
    spec.series.forEach((s, si) => {
      const top = si === spec.series.length - 1 || !spec.stacked;
      s.values.forEach((v, i) => {
        if (!num(v) || v <= 0) return;
        const base = spec.stacked ? cum[i] : 0, y1 = Y(base + v), y0 = Y(base), gap = spec.stacked && base > 0 ? 2 : 0;
        const col = (s.colors && s.colors[i]) || s.color;
        g += `<path class="hz-bar" data-i="${i}" d="${roundedTop((X(i) - bw / 2).toFixed(1), y1.toFixed(1), bw.toFixed(1), Math.max(0, y0 - y1 - gap).toFixed(1), top ? 4 : 0)}" fill="${col}"/>`;
        if (spec.stacked) cum[i] += v;
      });
    });
    /* sparing value labels: the largest bar and the last one */
    const tot = spec.stacked ? all.slice(0, n) : spec.series[0].values, mi = argmax(tot);
    [...new Set([mi, n - 1])].forEach(i => { const v = tot[i]; if (num(v) && v > 0) g += `<text class="hz-val" x="${X(i).toFixed(1)}" y="${(Y(v) - 6).toFixed(1)}" text-anchor="middle">${f(v, dec)}</text>`; });
  } else {
    spec.series.forEach(s => {
      const pts = s.values.map((v, i) => num(v) ? [X(i), Y(v)] : null).filter(Boolean);
      if (pts.length < 2) return;
      if (spec.series.length === 1) g += `<path d="M${pts[0][0].toFixed(1)} ${(T + ih).toFixed(1)} ${pts.map(p => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} L${pts[pts.length - 1][0].toFixed(1)} ${(T + ih).toFixed(1)} Z" fill="${s.color}" opacity=".10"/>`;
      g += `<path d="M${pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    });
  }
  /* trend line */
  if (spec.trend) {
    const x0 = bars ? X(0) : X(0), x1 = X(n - 1);
    g += `<line class="hz-trend" x1="${x0.toFixed(1)}" y1="${Y(spec.trend.v0).toFixed(1)}" x2="${x1.toFixed(1)}" y2="${Y(spec.trend.v1).toFixed(1)}"/>`;
  }
  /* highlighted marks (e.g. largest event) and the end dot of a line */
  (spec.marks || []).forEach(m => { g += `<circle cx="${X(m.i).toFixed(1)}" cy="${Y(m.v).toFixed(1)}" r="4.5" fill="${C.amber}" stroke="${C.surface}" stroke-width="2"/><text class="hz-val" x="${X(m.i).toFixed(1)}" y="${(Y(m.v) - 10).toFixed(1)}" text-anchor="middle">${esc(m.label)}</text>`; });
  if (!bars) spec.series.forEach(s => {
    let li = -1; s.values.forEach((v, i) => { if (num(v)) li = i; });
    if (li >= 0) g += `<circle cx="${X(li).toFixed(1)}" cy="${Y(s.values[li]).toFixed(1)}" r="4" fill="${s.color}" stroke="${C.surface}" stroke-width="2"/><text class="hz-val" x="${(X(li) + 2).toFixed(1)}" y="${(Y(s.values[li]) - 10).toFixed(1)}" text-anchor="end">${f(s.values[li], dec)}</text>`;
  });
  /* hover layer */
  g += `<line class="hz-xh" y1="${T}" y2="${T + ih}"/>`;
  const hitW = bars ? slot : Math.max(slot, 12);
  spec.xs.forEach((x, i) => { g += `<rect class="hz-hit" data-i="${i}" x="${(X(i) - hitW / 2).toFixed(1)}" y="${T}" width="${hitW.toFixed(1)}" height="${ih}" fill="transparent"/>`; });

  /* tooltips: plain data, built with textContent in the browser */
  const tips = spec.xs.map((x, i) => ({
    x: X(i) / W * 100, y: Y(num(all[i]) && spec.stacked ? all[i] : (spec.series.map(s => s.values[i]).filter(num)[0] ?? lo)) / H * 100, head: String(x),
    rows: [...spec.series.filter(s => s.values[i] != null && (!spec.stacked || s.values[i] > 0)).map(s => ({ name: s.name, color: (s.colors && s.colors[i]) || s.color, value: f(s.values[i], dec) + (spec.unit ? ' ' + spec.unit : ''), kind: bars ? 'rect' : 'line' })),
      ...(spec.trend && num(spec.trend.at?.(i)) ? [{ name: 'Trend', color: C.amber, value: f(spec.trend.at(i), dec) + (spec.unit ? ' ' + spec.unit : ''), kind: 'dash' }] : [])]
  }));

  /* legend: always for 2+ keyed items, none for a lone series */
  const keys = spec.legend || [
    ...spec.series.map(s => ({ name: s.name, color: s.color, kind: bars ? 'rect' : 'line' })),
    ...(spec.trend ? [{ name: spec.trend.label || 'Trend', color: C.amber, kind: 'dash' }] : []),
    ...(spec.refs || []).map(r => ({ name: r.label, color: C.ink2, kind: 'dash' })),
    ...(spec.shade ? [{ name: spec.shade.label, color: C.cyan, kind: 'wash' }] : [])];
  const legend = keys.length > 1 ? `<div class="hz-legend">${keys.map(k => `<span><i class="hz-key hz-key-${k.kind}" style="--c:${k.color}"></i>${esc(k.name)}</span>`).join('')}</div>` : '';

  /* table view (every value reachable without hovering) */
  const cols = spec.series.map(s => s.name), hasTrend = !!(spec.trend && spec.trend.at);
  const table = `<details class="hz-table"><summary>Table view</summary><div class="tbl-scroll"><table class="tbl"><thead><tr><th>${esc(spec.xLabel || 'Year')}</th>${cols.map(c => `<th>${esc(c)}${spec.unit ? ' (' + esc(spec.unit) + ')' : ''}</th>`).join('')}${hasTrend ? '<th>Trend</th>' : ''}</tr></thead><tbody>${spec.xs.map((x, i) => `<tr><td>${esc(x)}</td>${spec.series.map(s => `<td>${f(s.values[i], dec)}</td>`).join('')}${hasTrend ? `<td>${f(spec.trend.at(i), dec)}</td>` : ''}</tr>`).join('')}</tbody></table></div></details>`;

  const html = `<figure class="hz-fig" data-hz="${esc(uid)}"><figcaption><b>${esc(spec.title)}</b>${spec.sub ? `<span>${esc(spec.sub)}</span>` : ''}</figcaption>
    <div class="hz-wrap"><svg class="hz-plot" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(spec.alt || spec.title)}" data-w="${W}" data-h="${H}">${g}</svg><div class="tip hz-tip" role="status"></div></div>${legend}${table}</figure>`;
  return { html, tips };
}

/* ---------- per-tower content ---------- */
const lineYears = (y) => y.map(String);
function withTrendAt(trend, years) { if (trend) trend.at = i => trend.v0 + (trend.v1 - trend.v0) * (i / Math.max(1, years.length - 1)); return trend; }

/* A: analysis from earthanova.js. ctx: {years, baseLabel, curLabel}. Returns {charts:[spec], analysis:[html-safe strings (plain text)], note} */
export function towerViz(id, A, ctx) {
  const out = { charts: [], analysis: [], note: '' };
  const s = A.nasa?.bundle?.series, tr = A.nasa?.bundle?.trends?.trends ? Object.fromEntries(A.nasa.bundle.trends.trends.map(t => [t.variable, t])) : {};
  const yrsStudy = ctx.years;

  if (id === 'quake') {
    const q = A.quakes; if (!q) return out;
    const evs = q.all || q.list.map(e => ({ time: e.time, mag: e.mag }));
    const cnt = yrsStudy.map(y => evs.filter(e => new Date(e.time).getUTCFullYear() === y).length);
    const bigPerYear = yrsStudy.map(y => Math.max(0, ...evs.filter(e => new Date(e.time).getUTCFullYear() === y).map(e => e.mag)));
    const mi = argmax(bigPerYear), big = q.list[0];
    out.charts.push({ title: 'Earthquakes of M4+ per year', sub: `within ${A.radiusKm} km · USGS`, kind: 'bars', xs: lineYears(yrsStudy), series: [{ name: 'Events', color: C.cyan, values: cnt }],
      marks: big && mi >= 0 && bigPerYear[mi] > 0 ? [{ i: mi, v: cnt[mi], label: 'M' + bigPerYear[mi].toFixed(1) }] : [], legend: [{ name: 'Events per year', color: C.cyan, kind: 'rect' }, { name: 'Year of the largest event', color: C.amber, kind: 'dot' }], dec: 0, alt: `Earthquakes of magnitude 4 or more per year, ${yrsStudy[0]} to ${yrsStudy[yrsStudy.length - 1]}` });
    const tot = q.count, pk = argmax(cnt), m5 = evs.filter(e => e.mag >= 5).length;
    out.analysis.push(`${tot} earthquake${tot === 1 ? '' : 's'} of M4+ in ${ctx.years[0]}–${ctx.years[ctx.years.length - 1]}, about ${f(tot / yrsStudy.length, 1)} a year.`);
    if (tot) out.analysis.push(`Busiest year: ${yrsStudy[pk]} with ${cnt[pk]} events. ${m5} of them reached M5 or more.`);
    if (big) out.analysis.push(`Largest: M${big.mag.toFixed(1)}, ${big.place || 'unknown location'}, ${new Date(big.time).toISOString().slice(0, 10)}, ${big.dist} km from the target.`);
    if (q.list.length) out.analysis.push(`Closest listed event: ${Math.min(...q.list.map(e => e.dist))} km away.`);
    if (tot >= 200) out.note = 'The USGS request is capped at the 200 strongest events, so the weaker ones in busy years are missing. Real counts are higher.';
    const v = A.eonet?.byCat?.volcanoes || [];
    if (v.length) out.analysis.push(`NASA EONET lists ${v.length} volcanic activity report${v.length > 1 ? 's' : ''} within the radius, latest ${v[0].date} (${v[0].title}).`);
  }

  if (id === 'heat' && s) {
    const a = annualFrom(s, 't2m'), at = tr.annual_mean_temp; if (a.years.length < 5) return out;
    const sl = at ? at.slope_per_decade / 10 : ols(a.years, a.values)?.slope, line = sl != null ? withTrendAt(senLine(a.years, a.values, sl), a.years) : null;
    if (line) { line.label = `Trend ${sg(sl * 10, 2)} °C per decade`; }
    out.charts.push({ title: 'Annual mean temperature', sub: `${a.years[0]}–${a.years[a.years.length - 1]} · NASA POWER`, kind: 'line', xs: lineYears(a.years), series: [{ name: 'Annual mean', color: C.cyan, values: a.values }], trend: line,
      shade: { i0: Math.max(0, a.years.indexOf(yrsStudy[0])), i1: a.years.length - 1, label: 'Study window' }, unit: '°C', dec: 1, alt: 'Annual mean temperature over the NASA POWER record with its long-term trend' });
    const hi = argmax(a.values), lo = argmin(a.values);
    out.analysis.push(`Long-term trend ${sg(sl * 10, 2)} °C per decade${at ? ` (${at.significant ? 'statistically significant' : 'not significant'}, Mann-Kendall with Sen's slope on ${at.n_years} yearly values)` : ''}. Over the whole record that adds up to about ${sg(sl * (a.years.length - 1), 1)} °C.`);
    out.analysis.push(`Warmest year: ${a.years[hi]} at ${f(a.values[hi], 1)} °C. Coolest: ${a.years[lo]} at ${f(a.values[lo], 1)} °C.`);
    if (num(A.base.temp) && num(A.cur.temp)) out.analysis.push(`${ctx.curLabel} averaged ${f(A.cur.temp, 1)} °C against ${f(A.base.temp, 1)} °C in ${ctx.baseLabel} (${sg(A.cur.temp - A.base.temp, 1)} °C). The tower rates this change.`);
    out.note = 'Counting days at or above the hot-day threshold needs daily data, which is not loaded here.';
  }

  if ((id === 'drought' || id === 'flood') && s) {
    const hasIm = s.imerg_mm && s.imerg_mm.some(num);
    const a = hasIm ? annualFrom(s, 'imerg_mm', 'sum') : annualFrom(s, 'prectotcorr', 'sum', true);
    const src = hasIm ? 'NASA GPM IMERG' : 'NASA POWER';
    if (a.years.length >= 5) {
      const mu = mean(a.values), thr = id === 'flood' ? mu * 1.2 : mu * 0.8;
      const colors = a.values.map(v => id === 'flood' ? (v >= thr ? C.red : C.cyan) : (v <= thr ? C.amber : C.cyan));
      const ptr = tr.annual_precip, sl = ptr ? ptr.slope_per_decade / 10 : null;
      out.charts.push({ title: 'Annual rainfall', sub: `${a.years[0]}–${a.years[a.years.length - 1]} · ${src}`, kind: 'bars', xs: lineYears(a.years), series: [{ name: 'Rain', color: C.cyan, colors, values: a.values }], refs: [{ v: mu, label: `Mean ${f(mu, 0)} mm` }], unit: 'mm', dec: 0,
        legend: id === 'flood' ? [{ name: 'Normal year', color: C.cyan, kind: 'rect' }, { name: 'Wet year (20% above mean)', color: C.red, kind: 'rect' }, { name: 'Mean', color: C.ink2, kind: 'dash' }] : [{ name: 'Normal year', color: C.cyan, kind: 'rect' }, { name: 'Dry year (20% below mean)', color: C.amber, kind: 'rect' }, { name: 'Mean', color: C.ink2, kind: 'dash' }],
        alt: `Annual rainfall per year from ${src}, with the long-term mean` });
      const wet = argmax(a.values), dry = argmin(a.values), nDry = a.values.filter(v => v <= mu * 0.8).length, nWet = a.values.filter(v => v >= mu * 1.2).length;
      const last5 = mean(a.values.slice(-5));
      if (id === 'drought') {
        out.analysis.push(`Average rainfall is ${f(mu, 0)} mm a year (${src}, ${a.years[0]}–${a.years[a.years.length - 1]}). Driest year: ${a.years[dry]} with ${f(a.values[dry], 0)} mm.`);
        out.analysis.push(`${nDry} of ${a.years.length} years were dry (20% below the mean). The last five years averaged ${f(last5, 0)} mm, ${sg((last5 / mu - 1) * 100, 0)}% against the mean.`);
        if (mu < 20) out.analysis.push('This place is hyper-arid, so a change of a few millimetres looks large in percent. Read the millimetres, not the percentages.');
        if (ptr) out.analysis.push(`Rainfall trend: ${sg(ptr.slope_per_decade, 1)} mm per decade (${ptr.significant ? 'statistically significant' : 'not significant'}).`);
        const sa = annualFrom(s, 'gwetroot');
        if (sa.years.length >= 5 && sa.values.some(num)) {
          const sm = mean(sa.values);
          out.charts.push({ title: 'Root-zone soil wetness', sub: `${sa.years[0]}–${sa.years[sa.years.length - 1]} · NASA POWER, index 0 (dry) to 1 (wet)`, kind: 'line', xs: lineYears(sa.years), series: [{ name: 'Soil wetness', color: C.mint, values: sa.values }], refs: [{ v: sm, label: `Mean ${f(sm, 2)}` }], dec: 2,
            alt: 'Annual mean root-zone soil wetness over the NASA POWER record' });
          out.analysis.push(`Soil wetness averages ${f(sm, 2)}; the last year is ${f(sa.values[sa.values.length - 1], 2)}.`);
        }
      } else {
        out.analysis.push(`Wettest year: ${a.years[wet]} with ${f(a.values[wet], 0)} mm, ${f(a.values[wet] / mu * 100 - 100, 0)}% above the ${f(mu, 0)} mm mean. ${nWet} of ${a.years.length} years were wet (20% above the mean).`);
        out.analysis.push(`The last five years averaged ${f(last5, 0)} mm, ${sg((last5 / mu - 1) * 100, 0)}% against the mean.`);
        if (ptr) out.analysis.push(`Rainfall trend: ${sg(ptr.slope_per_decade, 1)} mm per decade (${ptr.significant ? 'statistically significant' : 'not significant'}).`);
      }
    }
    if (id === 'flood' && A.eonet) {
      const cats = [['floods', 'Floods', C.cyan, 'flood', 'floods'], ['landslides', 'Landslides', C.violet, 'landslide', 'landslides'], ['severeStorms', 'Severe storms', C.amber, 'severe storm', 'severe storms']];
      const perYear = k => yrsStudy.map(y => (A.eonet.byCat[k] || []).filter(e => +String(e.date).slice(0, 4) === y).length);
      const total = cats.reduce((n, [k]) => n + (A.eonet.byCat[k] || []).length, 0);
      out.charts.push({ title: 'Flood, landslide and storm events per year', sub: `within ${A.radiusKm} km · NASA EONET`, kind: 'bars', stacked: true, xs: lineYears(yrsStudy), series: cats.map(([k, name, color]) => ({ name, color, values: perYear(k) })), dec: 0,
        alt: 'Natural events per year from NASA EONET: floods, landslides and severe storms' });
      const bits = cats.map(([k, , , one, many]) => { const n = (A.eonet.byCat[k] || []).length; return `${n} ${n === 1 ? one : many}`; }).join(', ');
      out.analysis.push(`NASA EONET lists ${total} event${total === 1 ? '' : 's'} within ${A.radiusKm} km in ${yrsStudy[0]}–${yrsStudy[yrsStudy.length - 1]}: ${bits}.`);
      const latest = cats.flatMap(([k]) => A.eonet.byCat[k] || []).sort((x, y) => y.date.localeCompare(x.date))[0];
      if (latest) out.analysis.push(`Most recent: ${latest.title} (${latest.date}, ${latest.dist} km away).`);
      out.note = (A.eonet.truncated ? 'The EONET list was cut at 1000 events, so the true counts are higher. ' : '') + 'EONET lists notable events only, so an empty year does not mean nothing happened.';
    }
  }

  if (id === 'dust' && A.air?.annual?.length >= 8) {
    const R = A.air, sl = R.trend_per_decade != null ? R.trend_per_decade / 10 : null, line = sl != null ? withTrendAt(senLine(R.years, R.annual, sl), R.years) : null;
    if (line) line.label = `Trend ${sg(sl * 10, 2)} µg/m³ per decade`;
    const last5 = mean(R.annual.slice(-5)), all = mean(R.annual), hi = argmax(R.annual), nMod = R.annual.filter(v => v >= 15).length, c = R.components_recent;
    out.charts.push({ title: 'Fine particles in the air (PM2.5)', sub: `${R.years[0]}–${R.years[R.years.length - 1]} · NASA MERRA-2, yearly mean of dust, sea salt, black and organic carbon, sulfate`, kind: 'line', xs: lineYears(R.years), series: [{ name: 'Yearly mean', color: C.cyan, values: R.annual }], trend: line,
      refs: [{ v: 15, label: 'Moderate 15' }, { v: 35, label: 'High 35' }], shade: { i0: Math.max(0, R.annual.length - 5), i1: R.annual.length - 1, label: 'Last 5 years' }, unit: 'µg/m³', dec: 1, yMin: 0,
      alt: 'Yearly mean fine-particle (PM2.5) concentration from NASA MERRA-2 with the moderate and high thresholds' });
    const mo = R.monthly_clim || [];
    if (mo.length === 12 && mo.every(v => v != null)) out.charts.push({ title: 'Which months have the cleanest air', sub: 'Average PM2.5 by calendar month, last 10 years · NASA MERRA-2', kind: 'bars', xs: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], series: [{ name: 'PM2.5', color: C.cyan, values: mo }],
      refs: [{ v: 15, label: 'Moderate 15' }], unit: 'µg/m³', dec: 1, yMin: 0, alt: 'Average fine-particle concentration for each calendar month' });
    out.analysis.push(`The last five years averaged ${f(last5, 1)} µg/m³ against ${f(all, 1)} µg/m³ over the whole record.`);
    if (sl != null) out.analysis.push(`Trend ${sg(R.trend_per_decade, 2)} µg/m³ per decade (${R.significant ? 'statistically significant' : 'not significant'}).`);
    out.analysis.push(`What the particles are made of (last five years): dust ${f(c.dust, 1)}, sulfate ${f(c.so4, 1)}, organic carbon ${f(c.oc, 1)}, sea salt ${f(c.salt, 1)}, black carbon ${f(c.bc, 1)} µg/m³.`);
    out.analysis.push(`Highest year: ${R.years[hi]} at ${f(R.annual[hi], 1)} µg/m³. ${nMod} of ${R.annual.length} years were at or above the moderate level (15 µg/m³).`);
    out.note = 'NASA MERRA-2 is a model constrained by satellite and ground observations on a 50 km grid. It shows regional air quality well but smooths out cities and traffic, and it does not include gases such as NO₂ or ozone.';
  } else if (id === 'dust') {
    const D = A.dust; if (!D || !D.annual?.length) return out;
    const sl = D.trend_per_decade != null ? D.trend_per_decade / 10 : null, line = sl != null ? withTrendAt(senLine(D.years, D.annual, sl), D.years) : null;
    if (line) line.label = `Trend ${sg(sl * 10, 2)} µg/m³ per decade`;
    const last5 = mean(D.annual.slice(-5)), all = mean(D.annual), hi = argmax(D.annual), nMod = D.annual.filter(v => v >= 10).length;
    out.charts.push({ title: 'Natural dust at the surface (PM2.5)', sub: `${D.years[0]}–${D.years[D.years.length - 1]} · NASA MERRA-2, yearly mean`, kind: 'line', xs: lineYears(D.years), series: [{ name: 'Yearly mean', color: C.cyan, values: D.annual }], trend: line,
      refs: [{ v: 10, label: 'Moderate 10' }, { v: 25, label: 'High 25' }], shade: { i0: Math.max(0, D.annual.length - 5), i1: D.annual.length - 1, label: 'Last 5 years' }, unit: 'µg/m³', dec: 1, yMin: 0,
      alt: 'Yearly mean natural dust concentration from NASA MERRA-2 with the moderate and high thresholds' });
    out.analysis.push(`The last five years averaged ${f(last5, 1)} µg/m³ against ${f(all, 1)} µg/m³ over the whole record.`);
    if (sl != null) out.analysis.push(`Trend ${sg(D.trend_per_decade, 2)} µg/m³ per decade (${D.significant ? 'statistically significant' : 'not significant'}).`);
    out.analysis.push(`Highest year: ${D.years[hi]} at ${f(D.annual[hi], 1)} µg/m³. ${nMod} of ${D.annual.length} years were at or above the moderate level (10 µg/m³).`);
    out.note = 'This is the natural, windblown-dust share of fine particles. Smoke, traffic and industry are not counted, so it is not a full air-quality reading.';
  }

  if (id === 'sea') {
    const Sx = A.sea; if (!Sx || !Sx.available || Sx.distance_km > 50 || !Sx.annual_mm?.length) return out;
    const sl = Sx.trend_mm_per_year, line = sl != null ? withTrendAt(senLine(Sx.years, Sx.annual_mm, sl), Sx.years) : null;
    if (line) line.label = `Trend ${sg(sl, 1)} mm per year`;
    out.charts.push({ title: 'Sea level near the target', sub: `${Sx.years[0]}–${Sx.years[Sx.years.length - 1]} · NASA-SSH altimetry, yearly mean`, kind: 'line', xs: lineYears(Sx.years), series: [{ name: 'Sea level anomaly', color: C.cyan, values: Sx.annual_mm }], trend: line, unit: 'mm', dec: 0,
      alt: 'Yearly mean sea level anomaly from NASA-SSH satellite altimetry with its linear trend' });
    const span = Sx.years[Sx.years.length - 1] - Sx.years[0], rise = sl != null ? sl * span : null;
    out.analysis.push(`Sea level is ${sl >= 0 ? 'rising' : 'falling'} ${f(Math.abs(sl), 1)} mm a year (${Sx.significant ? 'statistically significant' : 'not significant'}), about ${sg(rise, 0)} mm over ${Sx.years[0]}–${Sx.years[Sx.years.length - 1]}.`);
    if (Sx.annual_mm.length >= 6) out.analysis.push(`The last three years sit ${sg(mean(Sx.annual_mm.slice(-3)) - mean(Sx.annual_mm.slice(0, 3)), 0)} mm from the first three.`);
    out.analysis.push(`Measured at the nearest open-ocean cell, ${Sx.distance_km} km from the target (${f(Sx.grid_lat, 2)}, ${f(Sx.grid_lon, 2)}).`);
    out.note = 'This is absolute sea level from satellites. Land sinking or rising (for example river deltas) is not included and can make the local change larger or smaller.';
  }
  return out;
}

/* ---------- browser wiring ---------- */
export function wireCharts(root, tipsById) {
  root.querySelectorAll('.hz-fig').forEach(fig => {
    const tips = tipsById[fig.dataset.hz]; if (!tips) return;
    const svg = fig.querySelector('.hz-plot'), tip = fig.querySelector('.hz-tip'), xh = svg.querySelector('.hz-xh');
    const W = +svg.dataset.w;
    const hide = () => { tip.style.opacity = 0; xh.style.opacity = 0; svg.querySelectorAll('.hz-bar.is-hover').forEach(b => b.classList.remove('is-hover')); };
    const show = i => {
      const t = tips[i]; if (!t) return;
      tip.textContent = '';
      const h = document.createElement('span'); h.textContent = t.head; tip.appendChild(h);
      t.rows.forEach(r => {
        tip.appendChild(document.createElement('br'));
        const k = document.createElement('i'); k.className = 'hz-key hz-key-' + (r.kind === 'dot' ? 'rect' : r.kind); k.style.setProperty('--c', r.color); tip.appendChild(k);
        const b = document.createElement('b'); b.textContent = r.value; tip.appendChild(b);
        const n = document.createElement('span'); n.textContent = ' ' + r.name; tip.appendChild(n);
      });
      tip.style.left = Math.min(86, Math.max(14, t.x)) + '%'; tip.style.top = t.y + '%'; tip.style.opacity = 1;
      const x = t.x / 100 * W; xh.setAttribute('x1', x); xh.setAttribute('x2', x); xh.style.opacity = .7;
      svg.querySelectorAll('.hz-bar').forEach(b => b.classList.toggle('is-hover', +b.dataset.i === i));
    };
    svg.addEventListener('pointermove', e => { const r = e.target.closest && e.target.closest('.hz-hit'); if (r) show(+r.dataset.i); });
    svg.addEventListener('pointerleave', hide);
  });
}
