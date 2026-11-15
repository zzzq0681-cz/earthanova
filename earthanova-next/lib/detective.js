/* Data-detective toolkit for Earthanova.
 * Variables (with plain definitions), trend statistics (Mann-Kendall + Sen's slope, least squares,
 * Pearson correlation) and the SVG charts used by the Basic, Advanced and Playful views.
 * Pure functions: they take the analysis object built in earthanova.js and return HTML strings. */

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => v != null && Number.isFinite(+v);
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MON_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export {MON, MON_LONG};

/* ---------------- statistics ---------------- */
export const mean = a => { const v = a.filter(num); return v.length ? v.reduce((s, x) => s + +x, 0) / v.length : null; };
export const sd = a => { const v = a.filter(num), m = mean(v); return v.length > 1 ? Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)) : null; };
const median = a => { const v = a.filter(num).sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };

function erf(x){ const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
export const normCdf = z => 0.5 * (1 + erf(z / Math.SQRT2));
function lnGamma(x){ const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5]; let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t); let s = 1.000000000190015; for(const k of c) s += k / ++y; return -t + Math.log(2.5066282746310005 * s / x); }
function betacf(a, b, x){
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap; if(Math.abs(d) < 1e-30) d = 1e-30; d = 1 / d; let h = d;
  for(let m = 1; m <= 200; m++){
    const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if(Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if(Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if(Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if(Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; const del = d * c; h *= del;
    if(Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
function ibeta(x, a, b){ if(x <= 0) return 0; if(x >= 1) return 1; const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x)); return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b; }
/** two-sided p-value of a Student t statistic */
export const tP = (t, df) => df > 0 ? ibeta(df / (df + t * t), df / 2, 0.5) : 1;
const tCrit = df => { let lo = 0, hi = 50; for(let i = 0; i < 60; i++){ const m = (lo + hi) / 2; if(tP(m, df) > 0.05) lo = m; else hi = m; } return (lo + hi) / 2; };

const pairs = (xs, ys) => xs.map((x, i) => [x, ys[i]]).filter(p => num(p[0]) && num(p[1]));

/** Mann-Kendall test with tie correction and Sen's slope (+ 95% interval). xs = years. */
export function trendTest(xs, ys){
  const P = pairs(xs, ys), n = P.length; if(n < 8) return null;
  let S = 0; const slopes = [];
  for(let i = 0; i < n - 1; i++) for(let j = i + 1; j < n; j++){ const d = P[j][1] - P[i][1]; S += d > 0 ? 1 : d < 0 ? -1 : 0; if(P[j][0] !== P[i][0]) slopes.push(d / (P[j][0] - P[i][0])); }
  const ties = {}; P.forEach(p => { const k = p[1].toFixed(6); ties[k] = (ties[k] || 0) + 1; });
  const varS = (n * (n - 1) * (2 * n + 5) - Object.values(ties).reduce((s, t) => s + t * (t - 1) * (2 * t + 5), 0)) / 18;
  const z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0, p = 2 * (1 - normCdf(Math.abs(z)));
  slopes.sort((a, b) => a - b); const N = slopes.length, slope = median(slopes);
  const C = 1.96 * Math.sqrt(varS), m1 = Math.max(0, Math.round((N - C) / 2) - 1), m2 = Math.min(N - 1, Math.round((N + C) / 2));
  const intercept = median(P.map(([x, y]) => y - slope * x));
  return {n, S, z, p, tau:S / (n * (n - 1) / 2), slope, lo:slopes[m1], hi:slopes[m2], intercept, x0:P[0][0], x1:P[n - 1][0]};
}
/** ordinary least squares y = a + b x */
export function ols(xs, ys){
  const P = pairs(xs, ys), n = P.length; if(n < 4) return null;
  const mx = mean(P.map(p => p[0])), my = mean(P.map(p => p[1])); let sxx = 0, sxy = 0, syy = 0;
  P.forEach(([x, y]) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); syy += (y - my) ** 2; });
  if(!sxx) return null;
  const b = sxy / sxx, a = my - b * mx, sse = P.reduce((s, [x, y]) => s + (y - a - b * x) ** 2, 0), se = Math.sqrt(sse / (n - 2) / sxx), t = se ? b / se : 0;
  return {n, slope:b, intercept:a, r2:syy ? 1 - sse / syy : 0, se, t, p:tP(t, n - 2), ci:tCrit(n - 2) * se};
}
export function pearson(xs, ys){
  const P = pairs(xs, ys), n = P.length; if(n < 5) return null;
  const mx = mean(P.map(p => p[0])), my = mean(P.map(p => p[1])); let sxx = 0, syy = 0, sxy = 0;
  P.forEach(([x, y]) => { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); });
  if(!sxx || !syy) return null;
  const r = sxy / Math.sqrt(sxx * syy), t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r));
  return {r, n, p:tP(t, n - 2)};
}
export const detrend = (xs, ys) => { const f = ols(xs, ys); return f ? ys.map((y, i) => num(y) ? y - (f.intercept + f.slope * xs[i]) : null) : ys; };
const zscore = ys => { const m = mean(ys), s = sd(ys); return ys.map(y => num(y) && s ? (y - m) / s : null); };

/* ---------------- variables ---------------- */
const daysIn = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
/** Every variable a visitor can investigate. kind 'monthly' come from NASA POWER / GPM IMERG monthly series; 'annual' from the hazard datasets. */
export const VARS = [
  {id:'temp', name:'Average temperature', short:'Temperature', unit:'°C', dec:1, kind:'monthly', agg:'mean', color:'#F0705A', icon:'thermo',
    get:s => s.t2m, def:'How warm the air is 2 metres above the ground, averaged over day and night.', why:'The clearest sign of a warming climate.',
    up:'warmer', down:'cooler', pos:'#E8604C', neg:'#4C9BE8', src:'NASA POWER (MERRA-2)'},
  {id:'tmax', name:'Daytime high', short:'Daytime high', unit:'°C', dec:1, kind:'monthly', agg:'mean', color:'#FF9F5A', icon:'sun',
    get:s => s.t2m_max, def:'The warmest temperature of each day, averaged. It shows how hot afternoons get.', why:'Hot afternoons affect health, work outdoors and electricity use.',
    up:'hotter afternoons', down:'milder afternoons', pos:'#E8604C', neg:'#4C9BE8', src:'NASA POWER (MERRA-2)'},
  {id:'rain', name:'Rainfall', short:'Rainfall', unit:'mm', dec:0, kind:'monthly', agg:'sum', color:'#3FB8AF', icon:'drop',
    get:s => s.prectotcorr && s.prectotcorr.map((v, i) => num(v) ? v * daysIn(s.month[i]) : null),
    def:'All the rain (and melted snow) that falls in a year, in millimetres: 1 mm is 1 litre of water on every square metre. Estimated by a NASA weather model since 1981.', why:'Farms, rivers and drinking water depend on it.',
    up:'wetter', down:'drier', pos:'#3FB8AF', neg:'#C8894B', src:'NASA POWER (MERRA-2, bias-corrected)'},
  {id:'rainSat', name:'Rainfall seen by satellites', short:'Satellite rain', unit:'mm', dec:0, kind:'monthly', agg:'sum', color:'#62D4C9', icon:'drop', adv:true,
    get:s => s.imerg_mm, def:'Rain measured by NASA’s GPM satellites (IMERG), available from mid-2000. A second, independent rain record.', why:'Lets you check the rain trend with a different instrument.',
    up:'wetter', down:'drier', pos:'#3FB8AF', neg:'#C8894B', src:'NASA GPM IMERG V07'},
  {id:'sun', name:'Sunshine energy', short:'Sunshine', unit:'kWh/m²/day', dec:2, kind:'monthly', agg:'mean', color:'#F5C451', icon:'sun',
    get:s => s.allsky_sfc_sw_dwn && s.allsky_sfc_sw_dwn.map(v => num(v) ? v / 3.6 : null),
    def:'How much energy from the sun reaches each square metre of ground in a day, after clouds and haze.', why:'Plants and solar panels both run on it.',
    up:'sunnier', down:'less sunny', pos:'#F5C451', neg:'#7E8FA0', src:'NASA POWER (CERES)'},
  {id:'soil', name:'Soil wetness', short:'Soil wetness', unit:'%', dec:0, kind:'monthly', agg:'mean', color:'#5CC98A', icon:'leaf',
    get:s => s.gwetroot && s.gwetroot.map(v => num(v) ? v * 100 : null),
    def:'How full of water the soil is around plant roots: 0% is bone dry, 100% is soaked.', why:'Dry soil means stressed crops and a higher drought risk.',
    up:'wetter soil', down:'drier soil', pos:'#4FBF7A', neg:'#B9844F', src:'NASA POWER (MERRA-2)'},
  {id:'pm25', name:'Fine-particle pollution (PM2.5)', short:'PM2.5', unit:'µg/m³', dec:1, kind:'annual', color:'#C9A27C', icon:'wind',
    def:'Tiny particles in the air, under 2.5 thousandths of a millimetre: dust, sea salt, smoke and pollution. They reach deep into the lungs.', why:'The WHO links long exposure to heart and lung disease.',
    up:'dirtier air', down:'cleaner air', pos:'#C9874C', neg:'#5BC0A8', src:'NASA MERRA-2 aerosols'},
  {id:'sea', name:'Sea level', short:'Sea level', unit:'mm', dec:0, kind:'annual', color:'#6AA8F0', icon:'waves',
    def:'Height of the nearby open sea, measured by satellites, compared with the start of the record.', why:'Higher seas push floods and salt water further inland.',
    up:'higher sea', down:'lower sea', pos:'#4C9BE8', neg:'#8FA3B5', src:'NASA-SSH altimetry'}
];
export const varById = id => VARS.find(v => v.id === id);

export const SEASONS = [['year','Whole year'],['djf','Winter (Dec–Feb)'],['mam','Spring (Mar–May)'],['jja','Summer (Jun–Aug)'],['son','Autumn (Sep–Nov)'],...MON_LONG.map((m, i) => ['m' + (i + 1), m])];
const SEASON_MONTHS = {year:[1,2,3,4,5,6,7,8,9,10,11,12], djf:[12,1,2], mam:[3,4,5], jja:[6,7,8], son:[9,10,11]};
export const seasonLabel = k => (SEASONS.find(s => s[0] === k) || SEASONS[0])[1];

/** Monthly grid {years, byYear:{y:[12 values]}} for a monthly variable. */
export function monthlyGrid(A, v){
  const s = A?.nasa?.bundle?.series; if(!s || v.kind !== 'monthly') return null;
  const arr = v.get(s); if(!arr || !arr.some(num)) return null;
  const by = {}; s.month.forEach((m, i) => { const y = +m.slice(0, 4), mo = +m.slice(5, 7); (by[y] ??= Array(12).fill(null))[mo - 1] = num(arr[i]) ? +arr[i] : null; });
  const years = Object.keys(by).map(Number).sort((a, b) => a - b);
  return {years, byYear:by};
}
/** One value per year for a variable and season. Only complete years are kept. */
export function series(A, vid, season = 'year'){
  const v = varById(vid); if(!v) return null;
  if(v.kind === 'annual'){
    if(season !== 'year') return null;
    if(vid === 'pm25' && A.air?.annual?.length >= 8) return {v, years:A.air.years.slice(), values:A.air.annual.map(Number)};
    if(vid === 'sea' && A.sea?.available && A.sea.distance_km <= 50 && A.sea.annual_mm?.length >= 6) return {v, years:A.sea.years.slice(), values:A.sea.annual_mm.map(Number)};
    return null;
  }
  const g = monthlyGrid(A, v); if(!g) return null;
  const months = season.startsWith('m') ? [+season.slice(1)] : SEASON_MONTHS[season];
  const years = [], values = [];
  g.years.forEach(y => {
    const vals = months.map(m => (season === 'djf' && m === 12) ? g.byYear[y - 1]?.[11] : g.byYear[y]?.[m - 1]);
    if(vals.some(x => !num(x))) return;
    years.push(y); values.push(v.agg === 'sum' ? vals.reduce((a, b) => a + b, 0) : mean(vals));
  });
  return years.length >= 8 ? {v, years, values} : null;
}
export const availableVars = (A, includeAdv = true) => VARS.filter(v => (includeAdv || !v.adv) && series(A, v.id));
const clip = (sr, from, to) => { const i = sr.years.map((y, k) => (y >= from && y <= to) ? k : -1).filter(k => k >= 0); return {...sr, years:i.map(k => sr.years[k]), values:i.map(k => sr.values[k])}; };
export {clip};

/* ---------------- plain-language verdicts ---------------- */
export function verdict(sr){
  const t = trendTest(sr.years, sr.values); if(!t) return null;
  const v = sr.v, span = t.x1 - t.x0, change = t.slope * span, rel = Math.abs(change) / Math.max(1e-9, Math.abs(mean(sr.values)));
  const tiny = v.unit === '°C' ? Math.abs(change) < 0.15 : rel < 0.03;   // too small to matter even if regular
  let level, word, short;
  if(t.p < 0.05 && !tiny){ level = 'real'; word = t.slope > 0 ? `Rising: a real trend` : `Falling: a real trend`; short = t.slope > 0 ? 'Rising' : 'Falling'; }
  else if(t.p < 0.2 && !tiny){ level = 'maybe'; word = t.slope > 0 ? 'Maybe rising, not proven' : 'Maybe falling, not proven'; short = t.slope > 0 ? 'Maybe up' : 'Maybe down'; }
  else { level = 'none'; word = 'No clear trend'; short = 'Steady'; }
  const evidence = t.p < 0.01 ? 4 : t.p < 0.05 ? 3 : t.p < 0.2 ? 2 : t.p < 0.5 ? 1 : 0;
  const chance = t.p < 0.001 ? 'less than 1 in 1,000' : t.p < 0.01 ? `about 1 in ${Math.round(1 / t.p / 10) * 10 || 100}` : t.p < 0.5 ? `about 1 in ${Math.max(2, Math.round(1 / t.p))}` : 'more than 1 in 2';
  return {t, level, word, short, evidence, change, span, chance, dir:t.slope > 0 ? v.up : v.down};
}
export const fmt = (x, d = 1) => num(x) ? (+x).toFixed(d) : '—';
export const sgn = (x, d = 1) => !num(x) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(d);
export const pTxt = p => !num(p) ? '—' : p < 0.001 ? '< 0.001' : p.toFixed(3);
const decOf = v => v.dec + (v.unit === '°C' ? 1 : v.dec === 0 ? 1 : 1);

/* ---------------- chart primitives ---------------- */
const phone = () => typeof window !== 'undefined' && window.innerWidth <= 640;
const niceStep = (span, target = 5) => { const raw = span / target, p = 10 ** Math.floor(Math.log10(raw || 1)), n = raw / p; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p; };
function yScale(vals, pad = 0.08, zero = false){
  let lo = Math.min(...vals.filter(num)), hi = Math.max(...vals.filter(num)); if(zero) lo = Math.min(lo, 0);
  if(lo === hi){ lo -= 1; hi += 1; } const sp = hi - lo; lo -= sp * pad; hi += sp * pad; if(zero && Math.min(...vals) >= 0) lo = Math.max(lo, 0);
  const st = niceStep(hi - lo); return {lo:Math.floor(lo / st) * st, hi:Math.ceil(hi / st) * st, st};
}
const tickFmt = st => v => { const d = st >= 1 ? 0 : st >= 0.1 ? 1 : 2; return (+v).toFixed(d).replace('-', '−'); };
function frame({W, H, L, R, T, B, ys, xs, xTicks, yFmt, yLabel}){
  let g = '';
  for(let v = ys.lo; v <= ys.hi + 1e-9; v += ys.st){ const y = T + (ys.hi - v) / (ys.hi - ys.lo) * (H - T - B); g += `<line class="dv-grid" x1="${L}" x2="${W - R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="dv-ax" x="${L - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end">${(yFmt || tickFmt(ys.st))(v)}</text>`; }
  (xTicks || []).forEach(([x, lab]) => { g += `<text class="dv-ax" x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle">${lab}</text>`; });
  if(yLabel) g += `<text class="dv-ax dv-unit" x="2" y="${T - 12}">${esc(yLabel)}</text>`;
  return g;
}
const svgWrap = (W, H, label, body, cls = '') => `<svg class="dv-svg ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${body}</svg>`;
const yearTicks = (years, X, every) => { const out = [], n = years.length, e = every || (n > 30 ? 10 : n > 15 ? 5 : 2); years.forEach((y, i) => { if(y % e === 0 || i === n - 1 && (y % e) > e / 2) out.push([X(y), String(y)]); }); return out; };
const tipAttr = (head, rows) => `data-tip="${esc(JSON.stringify({h:head, r:rows}))}"`;

/** Small trend sparkline for clue cards. */
export function spark(sr, vd){
  const W = 260, H = 74, L = 4, R = 4, T = 6, B = 6, xs = sr.years, ys = yScale(sr.values, .12);
  const X = y => L + (y - xs[0]) / Math.max(1, xs[xs.length - 1] - xs[0]) * (W - L - R), Y = v => T + (ys.hi - v) / (ys.hi - ys.lo) * (H - T - B);
  const line = sr.values.map((v, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  let g = `<path d="${line}" fill="none" stroke="${sr.v.color}" stroke-opacity=".55" stroke-width="1.6" stroke-linejoin="round"/>`;
  if(vd?.t){ const t = vd.t, a = t.intercept + t.slope * xs[0], b = t.intercept + t.slope * xs[xs.length - 1]; g += `<line x1="${X(xs[0])}" y1="${Y(a).toFixed(1)}" x2="${X(xs[xs.length - 1])}" y2="${Y(b).toFixed(1)}" stroke="${vd.level === 'none' ? '#91AEC2' : '#FFB46B'}" stroke-width="2.4" stroke-linecap="round"${vd.level === 'real' ? '' : ' stroke-dasharray="5 4"'}/>`; }
  const last = sr.values[sr.values.length - 1]; g += `<circle cx="${X(xs[xs.length - 1]).toFixed(1)}" cy="${Y(last).toFixed(1)}" r="3.2" fill="${sr.v.color}"/>`;
  return svgWrap(W, H, `${sr.v.name} ${xs[0]} to ${xs[xs.length - 1]}`, g, 'dv-spark');
}

/** Annual values with Sen trend line and its 95% range; optional 10-year running mean. */
export function trendChart(sr, opt = {}){
  const W = phone() ? 460 : 720, H = phone() ? 270 : 300, L = 48, R = phone() ? 16 : 120, T = 26, B = 26, v = sr.v, xs = sr.years, d = v.dec;
  const t = trendTest(xs, sr.values), ma = opt.ma ? sr.values.map((_, i) => i < 9 ? null : mean(sr.values.slice(i - 9, i + 1))) : null;
  const all = [...sr.values]; if(t) all.push(t.intercept + t.slope * xs[0], t.intercept + t.slope * xs[xs.length - 1]);
  const ys = yScale(all, .1), X = y => L + (y - xs[0]) / Math.max(1, xs[xs.length - 1] - xs[0]) * (W - L - R), Y = v2 => T + (ys.hi - v2) / (ys.hi - ys.lo) * (H - T - B);
  let g = frame({W, H, L, R, T, B, ys, xTicks:yearTicks(xs, X), yLabel:v.unit});
  if(t){
    const xm = (t.x0 + t.x1) / 2, ym = t.intercept + t.slope * xm, band = [[t.x0, ym + t.lo * (t.x0 - xm)], [t.x1, ym + t.hi * (t.x1 - xm)], [t.x1, ym + t.lo * (t.x1 - xm)], [t.x0, ym + t.hi * (t.x0 - xm)]];
    g += `<path d="M${X(band[0][0])} ${Y(band[0][1]).toFixed(1)} L${X(band[1][0])} ${Y(band[1][1]).toFixed(1)} L${X(band[2][0])} ${Y(band[2][1]).toFixed(1)} L${X(band[3][0])} ${Y(band[3][1]).toFixed(1)}Z" fill="#FFB46B" opacity=".12"/>`;
  }
  g += `<path d="${sr.values.map((y, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)} ${Y(y).toFixed(1)}`).join('')}" fill="none" stroke="#CFE3EF" stroke-opacity=".35" stroke-width="1.4"/>`;
  if(ma) g += `<path d="${ma.map((y, i) => y == null ? '' : `${ma[i - 1] == null ? 'M' : 'L'}${X(xs[i]).toFixed(1)} ${Y(y).toFixed(1)}`).join('')}" fill="none" stroke="#4FD1E8" stroke-width="2.2" stroke-linejoin="round"/>`;
  if(t){ const a = t.intercept + t.slope * xs[0], b = t.intercept + t.slope * xs[xs.length - 1];
    g += `<line x1="${X(xs[0])}" y1="${Y(a).toFixed(1)}" x2="${X(xs[xs.length - 1])}" y2="${Y(b).toFixed(1)}" stroke="#FFB46B" stroke-width="2.4" stroke-linecap="round"${t.p < 0.05 ? '' : ' stroke-dasharray="6 5"'}/>`;
    if(!phone()) g += `<text class="dv-lbl" x="${X(xs[xs.length - 1]) + 8}" y="${Y(b) + 4}" fill="#FFB46B">trend ${sgn(t.slope * 10, d + 1)}</text><text class="dv-ax" x="${X(xs[xs.length - 1]) + 8}" y="${Y(b) + 18}">per decade</text>`;
  }
  if(ma && !phone()) g += `<text class="dv-lbl" x="${X(xs[xs.length - 1]) + 8}" y="${Y(ma[ma.length - 1]) - 8}" fill="#4FD1E8">10-yr mean</text>`;
  sr.values.forEach((y, i) => { g += `<circle class="dv-dot" cx="${X(xs[i]).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="3.4" fill="#E4F3FB"/><rect class="dv-hit" x="${(X(xs[i]) - (W - L - R) / xs.length / 2).toFixed(1)}" y="${T}" width="${((W - L - R) / xs.length).toFixed(1)}" height="${H - T - B}" ${tipAttr(String(xs[i]), [[v.short, `${fmt(y, d)} ${v.unit}`], ...(t ? [['trend line', `${fmt(t.intercept + t.slope * xs[i], d)} ${v.unit}`]] : []), ...(ma && ma[i] != null ? [['10-year mean', `${fmt(ma[i], d)} ${v.unit}`]] : [])])}/>`; });
  return svgWrap(W, H, `${v.name}: yearly values and trend`, g);
}

/** Anomaly bars (difference from the 1991–2020 average, or the whole-record average). */
export function baselineOf(sr){ const b = sr.values.filter((_, i) => sr.years[i] >= 1991 && sr.years[i] <= 2020); return b.length >= 20 ? {m:mean(b), label:'1991–2020 average'} : {m:mean(sr.values), label:`${sr.years[0]}–${sr.years[sr.years.length - 1]} average`}; }
export function anomalyChart(sr){
  const W = phone() ? 460 : 720, H = phone() ? 250 : 280, L = 48, R = 16, T = 26, B = 26, v = sr.v, xs = sr.years, base = baselineOf(sr), an = sr.values.map(y => y - base.m);
  const ys = yScale([...an, 0], .1), X = y => L + (y - xs[0] + .5) / (xs[xs.length - 1] - xs[0] + 1) * (W - L - R), Y = a => T + (ys.hi - a) / (ys.hi - ys.lo) * (H - T - B), bw = Math.max(2, (W - L - R) / xs.length - 2);
  let g = frame({W, H, L, R, T, B, ys, xTicks:yearTicks(xs, X), yLabel:`${v.unit} vs ${base.label}`, yFmt:x => sgn(x, ys.st >= 1 ? 0 : 1).replace('±', '')});
  an.forEach((a, i) => { const y0 = Y(0), y1 = Y(a), top = Math.min(y0, y1), h = Math.max(1, Math.abs(y1 - y0));
    g += `<rect x="${(X(xs[i]) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(3, bw / 2)}" fill="${a >= 0 ? v.pos : v.neg}"/>`;
    g += `<rect class="dv-hit" x="${(X(xs[i]) - bw / 2 - 1).toFixed(1)}" y="${T}" width="${(bw + 2).toFixed(1)}" height="${H - T - B}" ${tipAttr(String(xs[i]), [[v.short, `${fmt(sr.values[i], v.dec)} ${v.unit}`], ['vs average', `${sgn(a, v.dec + 1)} ${v.unit}`]])}/>`; });
  g += `<line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="#91AEC2" stroke-width="1"/>`;
  return svgWrap(W, H, `${v.name}: difference from the ${base.label}`, g);
}
/** Warming-stripe style band (one stripe per year). */
export function stripes(sr, h = 90){
  const W = 720, xs = sr.years, base = baselineOf(sr), an = sr.values.map(y => y - base.m), m = Math.max(...an.map(Math.abs)) || 1, w = W / xs.length;
  return svgWrap(W, h, `${sr.v.name} stripes, one per year from ${xs[0]} to ${xs[xs.length - 1]}`, an.map((a, i) => `<rect x="${(i * w).toFixed(2)}" y="0" width="${(w + .6).toFixed(2)}" height="${h}" fill="${divColor(a / m, sr.v)}" ${tipAttr(String(xs[i]), [[sr.v.short, `${fmt(sr.values[i], sr.v.dec)} ${sr.v.unit}`], ['vs average', `${sgn(a, sr.v.dec + 1)} ${sr.v.unit}`]])}/>`).join(''), 'dv-stripes');
}
const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join(''); };
const MID = '#22313F';
export const divColor = (t, v) => { t = Math.max(-1, Math.min(1, t)); return t >= 0 ? mix(MID, v.pos, Math.sqrt(t)) : mix(MID, v.neg, Math.sqrt(-t)); };

/** Year x month heatmap of differences from each month's own average. */
export function heatmap(A, v, from, to){
  const g = monthlyGrid(A, v); if(!g) return '';
  const years = g.years.filter(y => y >= from && y <= to), clim = MON.map((_, m) => mean(years.map(y => g.byYear[y][m])));
  const an = years.map(y => g.byYear[y].map((x, m) => num(x) && num(clim[m]) ? x - clim[m] : null)), mx = Math.max(...an.flat().filter(num).map(Math.abs)) || 1;
  const cw = phone() ? 28 : 46, ch = Math.max(7, Math.min(14, Math.floor(560 / years.length))), L = 40, T = 22, W = L + 12 * cw + 8, H = T + years.length * ch + 6;
  let b = MON.map((m, i) => `<text class="dv-ax" x="${L + i * cw + cw / 2}" y="14" text-anchor="middle">${phone() ? m[0] : m}</text>`).join('');
  years.forEach((y, r) => { if(y % 5 === 0 || r === 0 || r === years.length - 1) b += `<text class="dv-ax" x="${L - 6}" y="${T + r * ch + ch / 2 + 4}" text-anchor="end">${y}</text>`;
    an[r].forEach((a, m) => { b += `<rect x="${L + m * cw + .5}" y="${T + r * ch + .5}" width="${cw - 1}" height="${ch - 1}" rx="1.5" fill="${num(a) ? divColor(a / mx, v) : '#0E1E2C'}" ${num(a) ? tipAttr(`${MON_LONG[m]} ${y}`, [[v.short, `${fmt(g.byYear[y][m], v.dec)} ${v.unit}`], [`vs ${MON[m]} average`, `${sgn(a, v.dec + 1)} ${v.unit}`]]) : ''}/>`; }); });
  return svgWrap(W, H, `${v.name}: every month from ${from} to ${to}, coloured by difference from that month's average`, b, 'dv-heat');
}
/** Average year: monthly climatology for two periods. */
export function cycleChart(A, v, from, to){
  const g = monthlyGrid(A, v); if(!g) return '';
  const yrs = g.years.filter(y => y >= from && y <= to && g.byYear[y].every(num)), k = Math.max(5, Math.min(15, Math.floor(yrs.length / 3)));
  const a = yrs.slice(0, k), b = yrs.slice(-k), ca = MON.map((_, m) => mean(a.map(y => g.byYear[y][m]))), cb = MON.map((_, m) => mean(b.map(y => g.byYear[y][m])));
  const W = phone() ? 460 : 720, H = phone() ? 250 : 280, L = 48, R = 16, T = 30, B = 26, ys = yScale([...ca, ...cb], .1, v.agg === 'sum'), slot = (W - L - R) / 12, X = m => L + (m + .5) * slot, Y = x => T + (ys.hi - x) / (ys.hi - ys.lo) * (H - T - B);
  let s = frame({W, H, L, R, T, B, ys, xTicks:MON.map((m, i) => [X(i), phone() ? m[0] : m]), yLabel:v.unit + (v.agg === 'sum' ? ' per month' : '')});
  const cA = '#7FA6BF', cB = v.color;
  if(v.agg === 'sum'){ const bw = Math.min(16, slot * .32); MON.forEach((_, m) => { [[ca[m], cA, -1], [cb[m], cB, 1]].forEach(([val, col, side]) => { const y = Y(val), y0 = Y(Math.max(0, ys.lo)); s += `<rect x="${(X(m) + (side < 0 ? -bw - 1 : 1)).toFixed(1)}" y="${Math.min(y, y0).toFixed(1)}" width="${bw}" height="${Math.abs(y0 - y).toFixed(1)}" rx="2.5" fill="${col}"/>`; }); }); }
  else [[ca, cA, '6 4'], [cb, cB, '']].forEach(([arr, col, dash]) => { s += `<path d="${arr.map((x, m) => `${m ? 'L' : 'M'}${X(m).toFixed(1)} ${Y(x).toFixed(1)}`).join('')}" fill="none" stroke="${col}" stroke-width="2.4"${dash ? ` stroke-dasharray="${dash}"` : ''}/>` + arr.map((x, m) => `<circle cx="${X(m).toFixed(1)}" cy="${Y(x).toFixed(1)}" r="3.4" fill="${col}"/>`).join(''); });
  MON.forEach((_, m) => { s += `<rect class="dv-hit" x="${(X(m) - slot / 2).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${H - T - B}" ${tipAttr(MON_LONG[m], [[`${a[0]}–${a[a.length - 1]}`, `${fmt(ca[m], v.dec)} ${v.unit}`], [`${b[0]}–${b[b.length - 1]}`, `${fmt(cb[m], v.dec)} ${v.unit}`], ['change', `${sgn(cb[m] - ca[m], v.dec + 1)} ${v.unit}`]])}/>`; });
  const key = `<div class="dv-key"><span><i style="background:${cA}"></i>${a[0]}–${a[a.length - 1]} average</span><span><i style="background:${cB}"></i>${b[0]}–${b[b.length - 1]} average</span></div>`;
  return svgWrap(W, H, `${v.name}: average year, early versus recent years`, s) + key;
}
/** Box plot of yearly values per decade. */
export function decadeChart(sr){
  const v = sr.v, groups = {}; sr.years.forEach((y, i) => { (groups[Math.floor(y / 10) * 10] ??= []).push([y, sr.values[i]]); });
  const keys = Object.keys(groups).map(Number).sort((a, b) => a - b), W = phone() ? 460 : 720, H = phone() ? 250 : 280, L = 48, R = 16, T = 26, B = 26;
  const ys = yScale(sr.values, .1), slot = (W - L - R) / keys.length, X = i => L + (i + .5) * slot, Y = x => T + (ys.hi - x) / (ys.hi - ys.lo) * (H - T - B), bw = Math.min(60, slot * .42);
  let s = frame({W, H, L, R, T, B, ys, xTicks:keys.map((k, i) => [X(i), `${k}s`]), yLabel:v.unit});
  const q = (a, p) => { const z = a.slice().sort((x, y) => x - y), i = (z.length - 1) * p, lo = Math.floor(i); return z[lo] + (z[Math.ceil(i)] - z[lo]) * (i - lo); };
  keys.forEach((k, i) => { const vals = groups[k].map(p => p[1]), q1 = q(vals, .25), q2 = q(vals, .5), q3 = q(vals, .75), mn = Math.min(...vals), mxv = Math.max(...vals);
    s += `<line x1="${X(i)}" x2="${X(i)}" y1="${Y(mxv).toFixed(1)}" y2="${Y(mn).toFixed(1)}" stroke="#91AEC2" stroke-width="1.2"/><rect x="${(X(i) - bw / 2).toFixed(1)}" y="${Y(q3).toFixed(1)}" width="${bw}" height="${Math.max(1, Y(q1) - Y(q3)).toFixed(1)}" rx="4" fill="${v.color}" fill-opacity=".28" stroke="${v.color}" stroke-width="1.4"/><line x1="${(X(i) - bw / 2).toFixed(1)}" x2="${(X(i) + bw / 2).toFixed(1)}" y1="${Y(q2).toFixed(1)}" y2="${Y(q2).toFixed(1)}" stroke="#EAF8FF" stroke-width="2.2"/>`;
    groups[k].forEach(([y, val], j) => { s += `<circle cx="${(X(i) + bw / 2 + 8 + (j % 2) * 5).toFixed(1)}" cy="${Y(val).toFixed(1)}" r="2.6" fill="#E4F3FB" ${tipAttr(String(y), [[v.short, `${fmt(val, v.dec)} ${v.unit}`]])}/>`; });
    s += `<rect class="dv-hit" x="${(X(i) - bw / 2).toFixed(1)}" y="${Y(q3).toFixed(1)}" width="${bw}" height="${Math.max(6, Y(q1) - Y(q3)).toFixed(1)}" ${tipAttr(`${k}s (${vals.length} years)`, [['median', `${fmt(q2, v.dec)} ${v.unit}`], ['middle half', `${fmt(q1, v.dec)} to ${fmt(q3, v.dec)}`], ['lowest / highest', `${fmt(mn, v.dec)} / ${fmt(mxv, v.dec)}`]])}/>`; });
  return svgWrap(W, H, `${v.name}: spread of yearly values in each decade`, s);
}
/** Scatter of two variables with least-squares line. */
export function scatter(xs, ys, labels, vx, vy, fit, opt = {}){
  const W = phone() ? 420 : 520, H = phone() ? 320 : 360, L = 54, R = 16, T = 34, B = 40, sx = yScale(xs, .08), sy = yScale(ys, .08);
  const X = x => L + (x - sx.lo) / (sx.hi - sx.lo) * (W - L - R), Y = y => T + (sy.hi - y) / (sy.hi - sy.lo) * (H - T - B);
  let g = frame({W, H, L, R, T, B, ys:sy, yLabel:(opt.anom ? 'change in ' : '') + vy.unit});
  for(let v = sx.lo; v <= sx.hi + 1e-9; v += sx.st) g += `<line class="dv-grid" y1="${T}" y2="${H - B}" x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}"/><text class="dv-ax" x="${X(v).toFixed(1)}" y="${H - B + 16}" text-anchor="middle">${tickFmt(sx.st)(v)}</text>`;
  g += `<text class="dv-ax" x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle">${esc((opt.anom ? 'change in ' : '') + vx.short + ' (' + vx.unit + ')')}</text>`;
  if(fit){ const x0 = sx.lo, x1 = sx.hi; g += `<line x1="${X(x0)}" y1="${Y(fit.intercept + fit.slope * x0).toFixed(1)}" x2="${X(x1)}" y2="${Y(fit.intercept + fit.slope * x1).toFixed(1)}" stroke="#FFB46B" stroke-width="2.2" stroke-linecap="round"${fit.p < 0.05 ? '' : ' stroke-dasharray="6 5"'} clip-path="inset(0)"/>`; }
  xs.forEach((x, i) => { if(!num(x) || !num(ys[i])) return; g += `<circle class="dv-dot" cx="${X(x).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="4.2" fill="#4FD1E8" fill-opacity=".8" stroke="#06111F" stroke-width="1.5" ${tipAttr(labels[i], [[vx.short, `${fmt(x, vx.dec + (opt.anom ? 1 : 0))} ${vx.unit}`], [vy.short, `${fmt(ys[i], vy.dec + (opt.anom ? 1 : 0))} ${vy.unit}`]])}/>`; });
  return svgWrap(W, H, `${vy.name} against ${vx.name}`, g);
}
/** Both variables as z-scores (standard deviations from their own mean) on one shared axis. */
export function zChart(years, a, b, va, vb){
  const za = zscore(a), zb = zscore(b), W = phone() ? 460 : 720, H = phone() ? 240 : 260, L = 40, R = 16, T = 22, B = 26, ys = {lo:-3, hi:3, st:1};
  const X = y => L + (y - years[0]) / Math.max(1, years[years.length - 1] - years[0]) * (W - L - R), Y = z => T + (ys.hi - Math.max(-3, Math.min(3, z))) / 6 * (H - T - B);
  let g = frame({W, H, L, R, T, B, ys, xTicks:yearTicks(years, X), yFmt:z => z === 0 ? 'avg' : sgn(z, 0).replace('±', '')});
  const path = (z, col) => `<path d="${z.map((v, i) => num(v) ? `${i && num(z[i - 1]) ? 'L' : 'M'}${X(years[i]).toFixed(1)} ${Y(v).toFixed(1)}` : '').join('')}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>`;
  g += path(za, '#4FD1E8') + path(zb, '#FF9F5A');
  years.forEach((y, i) => { g += `<rect class="dv-hit" x="${(X(y) - (W - L - R) / years.length / 2).toFixed(1)}" y="${T}" width="${((W - L - R) / years.length).toFixed(1)}" height="${H - T - B}" ${tipAttr(String(y), [[va.short, `${fmt(a[i], va.dec)} ${va.unit} (${sgn(za[i], 1)} sd)`], [vb.short, `${fmt(b[i], vb.dec)} ${vb.unit} (${sgn(zb[i], 1)} sd)`]])}/>`; });
  return svgWrap(W, H, `${va.name} and ${vb.name} as standard scores`, g) + `<div class="dv-key"><span><i style="background:#4FD1E8"></i>${esc(va.short)}</span><span><i style="background:#FF9F5A"></i>${esc(vb.short)}</span><span class="muted">0 = each variable’s own average; ±1 = one standard deviation</span></div>`;
}
/** Correlation matrix (annual values of every available variable over their common years). */
export function corrMatrix(A, vars, detr, from, to){
  const S = vars.map(v => clip(series(A, v.id), from, to)), n = vars.length;
  const cell = phone() ? 44 : 62, L = phone() ? 90 : 128, T = phone() ? 90 : 120, W = L + n * cell + 60, H = T + n * cell + 4;
  const cells = [];
  let g = '';
  vars.forEach((v, i) => { g += `<text class="dv-ax dv-mx-l" x="${L - 8}" y="${T + i * cell + cell / 2 + 4}" text-anchor="end">${esc(v.short)}</text><text class="dv-ax dv-mx-l" transform="translate(${L + i * cell + cell / 2 + 4},${T - 8}) rotate(-45)">${esc(v.short)}</text>`; });
  for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){
    const yrs = S[i].years.filter(y => S[j].years.includes(y)), a = yrs.map(y => S[i].values[S[i].years.indexOf(y)]), b = yrs.map(y => S[j].values[S[j].years.indexOf(y)]);
    const r = i === j ? {r:1, n:yrs.length, p:0} : pearson(detr ? detrend(yrs, a) : a, detr ? detrend(yrs, b) : b);
    const x = L + j * cell, y = T + i * cell, rv = r ? r.r : null, fill = i === j ? '#15283A' : rv == null ? '#0E1E2C' : rv >= 0 ? mix(MID, '#E8604C', Math.sqrt(Math.abs(rv))) : mix(MID, '#4C9BE8', Math.sqrt(Math.abs(rv)));
    cells.push({i, j, r});
    g += `<rect class="${i === j ? '' : 'dv-mx-c'}" x="${x + 1}" y="${y + 1}" width="${cell - 2}" height="${cell - 2}" rx="5" fill="${fill}" ${i === j ? '' : `data-mx="${vars[i].id},${vars[j].id}" tabindex="0" role="button"`} ${r && i !== j ? tipAttr(`${vars[i].short} vs ${vars[j].short}`, [['r', fmt(rv, 2)], ['p-value', pTxt(r.p)], ['years', String(r.n)], ['', 'click to plot']]) : ''}/>`;
    if(rv != null) g += `<text class="dv-mx-v" x="${x + cell / 2}" y="${y + cell / 2 + 4}" text-anchor="middle" pointer-events="none">${i === j ? '' : fmt(rv, 2).replace('-', '−')}${r && r.p < 0.05 && i !== j ? '*' : ''}</text>`;
  }
  return {html:svgWrap(W, H, 'Correlation matrix of the variables', g, 'dv-mx'), cells};
}

/* ---------------- tooltip (one shared element, used by every chart above) ---------------- */
let tipEl = null;
export function wireTips(){
  if(tipEl || typeof document === 'undefined') return;
  tipEl = document.createElement('div'); tipEl.className = 'dv-tip'; tipEl.setAttribute('role', 'status'); document.body.appendChild(tipEl);
  const show = (el, x, y) => {
    let d; try{ d = JSON.parse(el.dataset.tip); }catch{ return; }
    tipEl.innerHTML = `<b>${esc(d.h)}</b>${d.r.map(([k, v]) => `<span>${k ? `<i>${esc(k)}</i>` : ''}${esc(v)}</span>`).join('')}`;
    tipEl.style.opacity = 1;
    const r = tipEl.getBoundingClientRect(), px = Math.min(innerWidth - r.width - 8, Math.max(8, x - r.width / 2)), py = y - r.height - 14 < 8 ? y + 18 : y - r.height - 14;
    tipEl.style.transform = `translate(${px}px,${py}px)`;
  };
  document.addEventListener('pointermove', e => { const el = e.target.closest?.('[data-tip]'); if(el) show(el, e.clientX, e.clientY); else tipEl.style.opacity = 0; }, {passive:true});
  document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tip]'); if(el){ const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); } });
  document.addEventListener('focusout', () => { tipEl.style.opacity = 0; });
  document.addEventListener('scroll', () => { tipEl.style.opacity = 0; }, {passive:true, capture:true});
}
