/* The three dashboard views, built on lib/detective.js.
 *   Basic    : a case board for data detectives (one clue card per variable, plain definitions, trend verdicts)
 *   Advanced : variable explorer, two-variable comparison, correlation matrix, trend tests
 *   Playful  : case files (questions built from the real data, each answer shows its evidence), fingerprint, forecast game */
import {VARS, varById, SEASONS, seasonLabel, series, clip, availableVars, verdict, trendTest, ols, pearson, detrend, mean,
  spark, trendChart, anomalyChart, stripes, heatmap, cycleChart, decadeChart, scatter, zChart, corrMatrix, baselineOf,
  fmt, sgn, pTxt, MON, MON_LONG, wireTips} from './detective.js';
import {callout} from './risk-compare.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let C = {ic:() => '', store:{get:(k, d) => d, set(){}}, toast(){}, place:() => ({short:'this place'})};
export function initViews(ctx){ C = {...C, ...ctx}; wireTips(); wireAdvanced(); wirePlayful(); }

const LV_CLASS = {real:'lv-real', maybe:'lv-maybe', none:'lv-none'};
const dots = n => `<span class="ev-dots" role="img" aria-label="evidence ${n} of 4">${[0,1,2,3].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
const yearsOf = A => { const s = A?.nasa?.bundle?.series; return s ? [+s.month[0].slice(0, 4), +s.month[s.month.length - 1].slice(0, 4)] : null; };

/* ===================== BASIC ===================== */
function changeText(v, vd){
  const d = v.unit === '°C' ? 1 : v.dec === 0 && Math.abs(vd.change) < 10 ? 1 : v.dec;
  return `${sgn(vd.change, d)} ${v.unit}`;
}
function clueCard(A, v){
  const sr = series(A, v.id), vd = sr && verdict(sr); if(!vd) return '';
  const y0 = sr.years[0], y1 = sr.years[sr.years.length - 1];
  const fact = vd.level === 'none'
    ? `Goes up and down from year to year, with no steady direction since ${y0}.`
    : `From ${y0} to ${y1} the trend line moved <b>${changeText(v, vd)}</b> (about ${sgn(vd.t.slope * 10, Math.min(2, v.dec + 1))} ${esc(v.unit)} every 10 years): ${esc(vd.dir)}.`;
  return `<article class="clue ${LV_CLASS[vd.level]}" style="--c:${v.color}">
    <header><span class="clue-ic">${C.ic(v.icon)}</span><div class="clue-t"><h3>${esc(v.name)}</h3><p>${esc(v.unit)} · ${esc(v.src)}</p></div></header>
    <p class="stamp">${esc(vd.word)}</p>
    <p class="clue-def">${esc(v.def)}</p>
    <figure class="clue-fig">${spark(sr, vd)}<figcaption><span>${y0}</span><span>${y1}</span></figcaption></figure>
    <p class="clue-fact">${fact}</p>
    <div class="clue-ev"><span>Evidence</span>${dots(vd.evidence)}<small>If nothing were really changing, a pattern this strong would turn up by chance ${esc(vd.chance)} times.</small></div>
  </article>`;
}
function summaryHtml(A, I, loc){
  const n = loc.short, vt = series(A, 'temp') && verdict(series(A, 'temp')), vr = series(A, 'rain') && verdict(series(A, 'rain')), yr = yearsOf(A);
  const head = !vt ? `Here is what NASA data shows for ${n}.` : vt.level === 'real' ? (vt.t.slope > 0 ? `${n} is getting warmer, and the data says it is not chance.` : `${n} is getting cooler, and the data says it is not chance.`) : vt.level === 'maybe' ? `${n} may be warming, but the evidence is not strong yet.` : `${n}'s temperature shows no clear long-term change.`;
  const pts = [];
  if(vt) pts.push(['thermo', vt.level === 'none' ? `Temperature has no steady direction since ${yr[0]}.` : `Average temperature: ${changeText(varById('temp'), vt)} since ${yr[0]} on the trend line.`]);
  if(vr) pts.push(['drop', vr.level === 'real' ? `Rainfall is ${vr.t.slope > 0 ? 'rising' : 'falling'}: ${changeText(varById('rain'), vr)} a year since ${yr[0]}.` : 'Rainfall changes a lot from year to year, with no clear long-term trend.']);
  pts.push(['wind', !A.aq ? 'Air-quality data is not loaded for this place yet.' : A.aq.pm25 <= 15 ? `The air has few fine particles (${A.aq.pm25} µg/m³ yearly average).` : A.aq.pm25 <= 35 ? `The air has a moderate level of fine particles (${A.aq.pm25} µg/m³). Sensitive people may notice on dusty days.` : `The air carries a lot of fine particles (${A.aq.pm25} µg/m³). Limit long outdoor exercise on bad days.`]);
  const sol = A.cur.solar ?? A.base.solar;
  if(sol != null) pts.push(['sun', sol >= 5 ? `Very sunny: ${sol.toFixed(1)} kWh of sunlight per square metre a day, great for solar power.` : sol >= 4 ? `A fair amount of sun for solar power (${sol.toFixed(1)} kWh/m² a day).` : `Sunshine is on the low side for solar power (${sol.toFixed(1)} kWh/m² a day).`]);
  const watch = I.hazardFlags.length ? `${I.hazardFlags.slice(0, 2).map(f => f.t).join('. ')}. Open Risk Monitoring for details.` : 'No natural-hazard warning signs in the screening.';
  return `<p class="sum-head">${esc(head)}</p><ul class="sum-list">${pts.map(([i, t]) => `<li><span class="sum-ic">${C.ic(i)}</span><span>${esc(t)}</span></li>`).join('')}</ul>${callout(C.ic, I.hazardFlags.length ? 'warn' : 'ok', I.hazardFlags.length ? 'Watch out' : 'All clear', esc(watch))}`;
}
const TOOLKIT = [
  ['Variable', 'One thing that is measured, such as temperature or rainfall. Each card on the case board is one variable.'],
  ['Trend', 'The overall direction over many years, once the ups and downs of single years are smoothed out. The orange line shows it.'],
  ['Significant', 'A trend so steady that it would very rarely appear by luck. We call it real when that chance is below 1 in 20 (p < 0.05).'],
  ['p-value', 'The chance of seeing a pattern at least this strong if nothing were really changing. Small p means strong evidence.'],
  ['Average (baseline)', 'A reference to compare against. Scientists often use the 1991–2020 average, called the climate normal.'],
  ['Anomaly', 'How far one year is above or below the average. +1 °C means one degree warmer than normal.'],
  ['Correlation', 'Two variables that tend to move together. It does not prove one causes the other.'],
  ['Grid cell', 'NASA values here describe an area about 50 km wide, not one street or one weather station.']
];
function toolkitHtml(){
  return `<div class="tk-demo"><figure><svg viewBox="0 0 160 70" aria-hidden="true"><path d="M8 52 L24 44 L40 50 L56 36 L72 40 L88 28 L104 32 L120 20 L136 24 L152 12" fill="none" stroke="#CFE3EF" stroke-opacity=".5" stroke-width="1.6"/><line x1="8" y1="52" x2="152" y2="14" stroke="#FFB46B" stroke-width="2.4"/></svg><figcaption><b>Real trend</b> keeps climbing despite the wiggles</figcaption></figure>
    <figure><svg viewBox="0 0 160 70" aria-hidden="true"><path d="M8 34 L24 22 L40 44 L56 30 L72 48 L88 26 L104 40 L120 30 L136 46 L152 32" fill="none" stroke="#CFE3EF" stroke-opacity=".5" stroke-width="1.6"/><line x1="8" y1="35" x2="152" y2="35" stroke="#91AEC2" stroke-width="2.4" stroke-dasharray="5 4"/></svg><figcaption><b>Just noise</b> goes up and down with no direction</figcaption></figure></div>
    <dl class="tk-list">${TOOLKIT.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
    <p class="tk-steps"><b>How to investigate:</b> pick a variable, look at its line, read the verdict, then switch to Advanced to test a season, a shorter period or a link between two variables.</p>`;
}
/* the single most striking result on the case board, shown as a key-finding callout */
function keyFinding(A, loc){
  const vs = availableVars(A, false).map(v => { const sr = series(A, v.id), vd = sr && verdict(sr); return vd && {v, sr, vd, rel:Math.abs(vd.t.z)}; }).filter(Boolean);
  const real = vs.filter(x => x.vd.level === 'real').sort((a, b) => b.rel - a.rel);
  if(!real.length) return callout(C.ic, 'key', 'Key finding', `<b>No variable shows a real long-term trend at ${esc(loc.short)}.</b> The ups and downs here look like normal year-to-year variation. That is a finding too.`);
  const x = real[0], others = real.slice(1).map(y => y.v.short);
  return callout(C.ic, 'key', 'Key finding', `<b>${esc(x.v.name)} ${x.vd.t.slope > 0 ? 'rose' : 'fell'} by ${esc(changeText(x.v, x.vd))} since ${x.sr.years[0]}</b>, and the trend test says this is not chance (p ${pTxt(x.vd.t.p)}).${others.length ? ` Also changing for real: ${esc(others.join(', '))}.` : ''}`);
}
export function renderBasic(A, I, loc){
  $('#sumBody').innerHTML = summaryHtml(A, I, loc);
  const vars = availableVars(A, false), yr = yearsOf(A);
  $('#caseLead').textContent = `Every card is one variable NASA measures at ${loc.short}${yr ? `, ${yr[0]} to ${yr[1]}` : ''}. Read what it means, look at its line, then check the verdict: a real trend, or could it be chance?`;
  $('#caseGrid').innerHTML = vars.map(v => clueCard(A, v)).join('') || '<div class="empty">No long NASA record is loaded for this place.</div>';
  $('#caseKey').innerHTML = keyFinding(A, loc);
  $('#toolkit').innerHTML = toolkitHtml();
}

/* ===================== ADVANCED ===================== */
const EX = {v:'temp', season:'year', from:null, to:null, chart:'trend', ma:false};
const VS = {x:'temp', y:'sun', detr:false};
const MX = {detr:false};
let ADV_A = null;
const CHARTS = [['trend','Trend'],['anom','Difference from average'],['heat','Every month'],['cycle','Average year'],['dec','Decades']];
const opt = (list, val) => list.map(([k, l]) => `<option value="${esc(k)}"${k === val ? ' selected' : ''}>${esc(l)}</option>`).join('');
function rangeOf(A){ const vars = availableVars(A); const ys = vars.flatMap(v => series(A, v.id).years); return [Math.min(...ys), Math.max(...ys)]; }

function statsBlock(sr){
  const v = sr.v, t = trendTest(sr.years, sr.values), f = ols(sr.years, sr.values), vd = verdict(sr), d = v.dec + 1, base = baselineOf(sr);
  if(!t) return '<p class="muted">Too few years for a trend test (8 needed).</p>';
  const rows = [['Years used', `${sr.years.length} (${sr.years[0]}–${sr.years[sr.years.length - 1]})`], ['Average', `${fmt(mean(sr.values), v.dec)} ${v.unit}`], [`Average ${base.label}`, `${fmt(base.m, v.dec)} ${v.unit}`],
    ["Sen's slope", `${sgn(t.slope * 10, d)} ${v.unit} / decade`], ['95% range of slope', `${sgn(t.lo * 10, d)} to ${sgn(t.hi * 10, d)}`], ['Change on trend line', `${sgn(t.slope * (t.x1 - t.x0), d)} ${v.unit}`],
    ["Mann-Kendall τ", fmt(t.tau, 3)], ['Mann-Kendall z', fmt(t.z, 2)], ['p-value (two-sided)', pTxt(t.p)],
    ['Least-squares slope', f ? `${sgn(f.slope * 10, d)} ± ${fmt(f.ci * 10, d)} / decade` : '—'], ['R²', f ? fmt(f.r2, 3) : '—'], ['Least-squares p', f ? pTxt(f.p) : '—']];
  const read = vd.level === 'real' ? `A monotonic ${t.slope > 0 ? 'increase' : 'decrease'} is significant at the 5% level (Mann-Kendall p ${pTxt(t.p)}), and the 95% range of Sen's slope excludes zero${t.lo * t.hi > 0 ? '' : ' only narrowly'}.` : vd.level === 'maybe' ? `Weak evidence (p ${pTxt(t.p)}): the direction is suggestive but not significant at 5%. A longer record or a different season may settle it.` : `No significant monotonic trend (p ${pTxt(t.p)}). Year-to-year variability dominates over this period.`;
  return `<dl class="xp-stats">${rows.map(([k, x]) => `<div><dt>${esc(k)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>${callout(C.ic, vd.level === 'real' ? 'key' : 'info', 'What this means', `<b>${esc(vd.word)}.</b> ${esc(read)}`, vd.level === 'real' ? 'search' : 'info')}`;
}
function explorerHtml(A){
  const vars = availableVars(A), v = varById(EX.v) && vars.some(x => x.id === EX.v) ? varById(EX.v) : vars[0];
  if(!v) return '<div class="empty">No NASA series loaded for this place.</div>';
  EX.v = v.id; if(v.kind === 'annual') EX.season = 'year';
  const [r0, r1] = rangeOf(A); EX.from ??= r0; EX.to ??= r1;
  const full = series(A, v.id, EX.season); const sr = full && clip(full, EX.from, EX.to);
  const monthlyOnly = ['heat', 'cycle'], chart = v.kind === 'annual' && monthlyOnly.includes(EX.chart) ? 'trend' : EX.chart;
  const yrsOpt = Array.from({length:r1 - r0 + 1}, (_, i) => r0 + i).map(y => [String(y), String(y)]);
  const ctl = `<div class="xp-ctl">
    <label>Variable<select data-ex="v">${opt(vars.map(x => [x.id, x.name]), v.id)}</select></label>
    <label>Season<select data-ex="season"${v.kind === 'annual' ? ' disabled' : ''}>${opt(SEASONS, EX.season)}</select></label>
    <label>From<select data-ex="from">${opt(yrsOpt, String(EX.from))}</select></label>
    <label>To<select data-ex="to">${opt(yrsOpt, String(EX.to))}</select></label></div>
    <div class="xp-tabs" role="tablist" aria-label="Chart type">${CHARTS.map(([k, l]) => `<button role="tab" data-ex-chart="${k}" aria-selected="${k === chart}"${v.kind === 'annual' && monthlyOnly.includes(k) ? ' disabled title="Needs monthly data"' : ''}>${l}</button>`).join('')}</div>`;
  if(!sr || sr.years.length < 8) return ctl + '<div class="empty">Pick at least 8 years with data for this variable.</div>';
  const fig = chart === 'trend' ? trendChart(sr, {ma:EX.ma}) : chart === 'anom' ? anomalyChart(sr) : chart === 'heat' ? heatmap(A, v, EX.from, EX.to) : chart === 'cycle' ? cycleChart(A, v, EX.from, EX.to) : decadeChart(sr);
  const cap = {trend:`Each dot is one ${EX.season === 'year' ? 'year' : seasonLabel(EX.season).toLowerCase()}. Orange: Sen's trend line (dashed when not significant), with its 95% range shaded.`, anom:`Bars show how far each year sits above or below the ${baselineOf(sr).label}.`, heat:'Each square is one month, coloured by how far it was from that calendar month’s average over the chosen years. Look for colour drifting over time.', cycle:'The average year in the earliest and the latest years of the range. The gap between the two shows which months changed most.', dec:'Each box holds the middle half of the yearly values in a decade; the white line is the median, dots are single years.'}[chart];
  return ctl + `<div class="xp-body"><figure class="xp-fig"><div class="xp-fig-h"><b>${esc(v.name)}${EX.season !== 'year' ? `, ${esc(seasonLabel(EX.season).toLowerCase())}` : ''}</b>${chart === 'trend' ? `<label class="chk-inline"><input type="checkbox" data-ex="ma"${EX.ma ? ' checked' : ''}> 10-year running mean</label>` : ''}</div>${fig}<figcaption>${esc(cap)} <span class="muted">${esc(v.def)}</span></figcaption></figure>
    <aside class="xp-side"><h3>Statistics</h3>${statsBlock(sr)}<button class="btn-ghost" data-ex-csv>${C.ic('download')}Download this series (CSV)</button></aside></div>`;
}
function vsHtml(A){
  const vars = availableVars(A); if(vars.length < 2) return '<div class="empty">Two variables are needed.</div>';
  if(!vars.some(v => v.id === VS.x)) VS.x = vars[0].id; if(!vars.some(v => v.id === VS.y) || VS.y === VS.x) VS.y = vars.find(v => v.id !== VS.x).id;
  const vx = varById(VS.x), vy = varById(VS.y), sx = clip(series(A, vx.id), EX.from, EX.to), sy = clip(series(A, vy.id), EX.from, EX.to);
  const yrs = sx.years.filter(y => sy.years.includes(y)), a0 = yrs.map(y => sx.values[sx.years.indexOf(y)]), b0 = yrs.map(y => sy.values[sy.years.indexOf(y)]);
  const ctl = `<div class="xp-ctl"><label>Across (x)<select data-vs="x">${opt(vars.map(v => [v.id, v.name]), vx.id)}</select></label><label>Up (y)<select data-vs="y">${opt(vars.filter(v => v.id !== vx.id).map(v => [v.id, v.name]), vy.id)}</select></label>
    <div class="seg seg-sm" role="group" aria-label="Values"><button data-vs-detr="0" aria-pressed="${!VS.detr}">Yearly values</button><button data-vs-detr="1" aria-pressed="${VS.detr}">With trends removed</button></div></div>`;
  if(yrs.length < 6) return ctl + `<div class="empty">These two variables share only ${yrs.length} years in ${EX.from}–${EX.to}.</div>`;
  const a = VS.detr ? detrend(yrs, a0) : a0, b = VS.detr ? detrend(yrs, b0) : b0, r = pearson(a, b), f = ols(a, b);
  const raw = pearson(a0, b0), strength = Math.abs(r.r) >= .7 ? 'strong' : Math.abs(r.r) >= .4 ? 'moderate' : Math.abs(r.r) >= .2 ? 'weak' : 'almost no';
  const read = `${strength === 'almost no' ? 'Almost no link' : `A ${strength} ${r.r > 0 ? 'positive' : 'negative'} link`} (r = ${fmt(r.r, 2)}, p ${pTxt(r.p)}, ${r.n} years): ${r.r > 0 ? `years with more ${vx.short.toLowerCase()} tend to have more ${vy.short.toLowerCase()}` : `years with more ${vx.short.toLowerCase()} tend to have less ${vy.short.toLowerCase()}`}${r.p < 0.05 ? '' : ', but this could be chance'}.`;
  const trap = !VS.detr && raw && Math.abs(raw.r) > .4 ? ` Both variables may simply share a trend over time. Press <b>With trends removed</b> to check whether the link survives (it is then ${'r = ' + fmt(pearson(detrend(yrs, a0), detrend(yrs, b0))?.r, 2)}).` : VS.detr ? ' Trends were removed from both, so this compares the year-to-year ups and downs only.' : '';
  return ctl + `<div class="vs-grid"><figure>${scatter(a, b, yrs.map(String), vx, vy, f, {anom:VS.detr})}<figcaption>One dot per year. Orange: least-squares line (dashed when not significant).</figcaption></figure>
    <figure>${zChart(yrs, a0, b0, vx, vy)}<figcaption>Both variables on one scale (standard deviations from their own average), so you can see whether they rise and fall together.</figcaption></figure></div>
    ${callout(C.ic, r.p < 0.05 ? 'key' : 'info', 'What this means', `${read}${trap} <span class="muted">Correlation is a clue, not proof that one causes the other.</span>`, r.p < 0.05 ? 'search' : 'info')}`;
}
function matrixHtml(A){
  const vars = availableVars(A).filter(v => v.id !== 'rainSat'); if(vars.length < 3) return '<div class="empty">Not enough variables.</div>';
  const {html} = corrMatrix(A, vars, MX.detr, EX.from, EX.to);
  return `<div class="xp-ctl"><div class="seg seg-sm" role="group" aria-label="Values"><button data-mx-detr="0" aria-pressed="${!MX.detr}">Yearly values</button><button data-mx-detr="1" aria-pressed="${MX.detr}">With trends removed</button></div><span class="muted">${EX.from}–${EX.to} · Pearson r · * p &lt; 0.05 · click a square to plot the pair</span></div>
    <div class="mx-wrap">${html}<div class="mx-legend"><span>−1</span><i></i><span>+1</span><small>red: move together · blue: move in opposite directions</small></div></div>`;
}
function trendTableHtml(A){
  const vars = availableVars(A);
  const rows = vars.map(v => { const s0 = series(A, v.id, v.kind === 'annual' ? 'year' : EX.season); const sr = s0 && clip(s0, EX.from, EX.to); const vd = sr && sr.years.length >= 8 && verdict(sr); if(!vd) return '';
    const t = vd.t, d = v.dec + 1;
    return `<tr data-ex-load="${v.id}" tabindex="0"><td class="l"><span class="sw" style="background:${v.color}"></span>${esc(v.name)}</td><td>${sr.years[0]}–${sr.years[sr.years.length - 1]}</td><td>${fmt(mean(sr.values), v.dec)} ${esc(v.unit)}</td><td>${sgn(t.slope * 10, d)}</td><td>${sgn(t.lo * 10, d)} to ${sgn(t.hi * 10, d)}</td><td>${fmt(t.tau, 2)}</td><td>${pTxt(t.p)}</td><td class="l"><span class="vpill ${LV_CLASS[vd.level]}">${esc(vd.short)}</span></td></tr>`; }).join('');
  return `<p class="muted tt-note">${esc(seasonLabel(EX.season))}${EX.season !== 'year' ? ' (yearly-only variables use the whole year)' : ''}, ${EX.from}–${EX.to}. Slope per decade in each variable’s unit. Click a row to open it in the explorer.</p><table class="tbl"><thead><tr><th class="l">Variable</th><th>Years</th><th>Average</th><th>Sen slope / decade</th><th>95% range</th><th>τ</th><th>p</th><th class="l">Verdict</th></tr></thead><tbody>${rows}</tbody></table>`;
}
export function renderAdvanced(A){
  if(ADV_A !== A){ ADV_A = A; const [r0, r1] = rangeOf(A); EX.from = r0; EX.to = r1; }
  $('#advExplorer').innerHTML = explorerHtml(A);
  $('#advVs').innerHTML = vsHtml(A);
  $('#advMatrix').innerHTML = matrixHtml(A);
  $('#advTrendTbl').innerHTML = trendTableHtml(A);
}
function seriesCsv(){
  const A = ADV_A, sr = clip(series(A, EX.v, EX.season), EX.from, EX.to), v = sr.v;
  const rows = [['variable', v.name], ['unit', v.unit], ['season', seasonLabel(EX.season)], ['source', v.src], ['place', C.place().name], [], ['year', 'value']].concat(sr.years.map((y, i) => [y, sr.values[i]]));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], {type:'text/csv'})); a.download = `earthanova-${v.id}-${EX.season}-${EX.from}-${EX.to}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function wireAdvanced(){
  document.addEventListener('change', e => {
    const t = e.target; if(!ADV_A) return;
    if(t.dataset.ex){ const k = t.dataset.ex; if(k === 'ma') EX.ma = t.checked; else if(k === 'from' || k === 'to'){ EX[k] = +t.value; if(EX.to - EX.from < 7){ if(k === 'from') EX.to = EX.from + 7; else EX.from = EX.to - 7; } const [r0, r1] = rangeOf(ADV_A); EX.from = Math.max(r0, EX.from); EX.to = Math.min(r1, EX.to); } else EX[k] = t.value; renderAdvanced(ADV_A); }
    else if(t.dataset.vs){ VS[t.dataset.vs] = t.value; $('#advVs').innerHTML = vsHtml(ADV_A); }
  });
  document.addEventListener('click', e => {
    if(!ADV_A) return; const t = e.target;
    const ch = t.closest('[data-ex-chart]'); if(ch && !ch.disabled){ EX.chart = ch.dataset.exChart; $('#advExplorer').innerHTML = explorerHtml(ADV_A); return; }
    if(t.closest('[data-ex-csv]')){ seriesCsv(); return; }
    const vd = t.closest('[data-vs-detr]'); if(vd){ VS.detr = vd.dataset.vsDetr === '1'; $('#advVs').innerHTML = vsHtml(ADV_A); return; }
    const md = t.closest('[data-mx-detr]'); if(md){ MX.detr = md.dataset.mxDetr === '1'; $('#advMatrix').innerHTML = matrixHtml(ADV_A); return; }
    const mc = t.closest('[data-mx]'); if(mc){ const [a, b] = mc.dataset.mx.split(','); VS.x = b; VS.y = a; VS.detr = MX.detr; $('#advVs').innerHTML = vsHtml(ADV_A); $('#advVs').closest('.card').scrollIntoView({behavior:'smooth', block:'start'}); return; }
    const ld = t.closest('[data-ex-load]'); if(ld){ EX.v = ld.dataset.exLoad; $('#advExplorer').innerHTML = explorerHtml(ADV_A); $('#advExplorer').closest('.card').scrollIntoView({behavior:'smooth', block:'start'}); }
  });
  document.addEventListener('keydown', e => { if((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[data-mx],[data-ex-load]')){ e.preventDefault(); e.target.click(); } });
}

/* ===================== PLAYFUL ===================== */
const RANKS = [['Rookie detective', 0], ['Data sleuth', 80], ['Trend hunter', 200], ['Climate inspector', 380], ['Chief scientist', 600]];
const BADGES = {first:['First case closed', 'search'], real:['Sharp eye', 'eye'], trend:['Trend spotter', 'trend'], link:['Link finder', 'compare'], forecast:['Forecaster', 'bolt'], perfect:['Perfect case', 'trophy']};
const xp = () => C.store.get('es:xp:guest', {xp:0, done:{}, badges:{}});
function award(n, key, badge){ const d = xp(); d.badges ??= {}; let got = 0; if(!key || !d.done[key]){ if(key) d.done[key] = 1; d.xp += n; got = n; } if(badge && !d.badges[badge]){ d.badges[badge] = Date.now(); C.toast(`Badge earned: ${BADGES[badge][0]}`); } C.store.set('es:xp:guest', d); renderQuest(); return got; }
function rankOf(x){ let i = 0; RANKS.forEach((r, k) => { if(x >= r[1]) i = k; }); return {i, title:RANKS[i][0], from:RANKS[i][1], to:RANKS[i + 1]?.[1] ?? null}; }
function renderQuest(){
  const d = xp(), R = rankOf(d.xp), pct = R.to ? Math.round((d.xp - R.from) / (R.to - R.from) * 100) : 100;
  $('#qLevelTag').textContent = `Rank ${R.i + 1} of ${RANKS.length}`;
  $('#questBody').innerHTML = `<div class="q-top"><span class="q-badge">${C.ic('trophy')}</span><div><p class="q-title">${esc(R.title)}</p><p class="q-sub">${d.xp} XP${R.to ? ` · ${R.to - d.xp} XP to ${esc(RANKS[R.i + 1][0].toLowerCase())}` : ' · top rank'}</p></div></div>
    <div class="meter meter-xp" role="img" aria-label="${pct}% to the next rank"><span style="width:${pct}%"></span></div>
    <ul class="badges">${Object.entries(BADGES).map(([k, [n, i]]) => `<li class="${d.badges?.[k] ? 'on' : ''}" title="${esc(n)}${d.badges?.[k] ? '' : ' (not earned yet)'}">${C.ic(i)}<span>${esc(n)}</span></li>`).join('')}</ul>`;
}

let PA = null;   // analysis the playful view was built for
function fingerprintHtml(A, loc){
  const sr = series(A, 'temp'); if(!sr) return '<div class="empty">No temperature record here.</div>';
  const t = trendTest(sr.years, sr.values), y0 = sr.years[0], y1 = sr.years[sr.years.length - 1], born = Math.max(y0, Math.min(y1 - 5, 2008));
  const hot = sr.years[sr.values.indexOf(Math.max(...sr.values))], cold = sr.years[sr.values.indexOf(Math.min(...sr.values))];
  const s = A.nasa.bundle.series, tm = s.t2m, iMax = tm.indexOf(Math.max(...tm.filter(x => x != null))), [yy, mm] = s.month[iMax].split('-');
  return `<div class="fp-band">${stripes(sr, 110)}<div class="fp-axis"><span>${y0}</span><span>${y1}</span></div></div>
    <p class="fp-cap">Each stripe is one year in ${esc(loc.short)}: blue cooler than the 1991–2020 average, red warmer. Hover a stripe to read it.</p>
    <div class="fp-facts"><div><span>Warmest year</span><b>${hot}</b></div><div><span>Coolest year</span><b>${cold}</b></div><div><span>Hottest month on record</span><b>${MON_LONG[+mm - 1]} ${yy}</b><small>${fmt(tm[iMax], 1)} °C average</small></div></div>
    <div class="fp-born"><label for="fpBorn">Born in <output id="fpBornOut">${born}</output>?</label><input id="fpBorn" type="range" min="${y0}" max="${y1 - 3}" value="${born}" data-pl-born><p id="fpBornTxt">${bornText(t, born, y1, loc)}</p></div>`;
}
function bornText(t, y, y1, loc){
  if(!t) return '';
  const ch = t.slope * (y1 - y), d = Math.abs(ch) < 1 ? 2 : 1;
  return Math.abs(ch) < 0.05 ? `Since ${y}, ${esc(loc.short)}'s temperature trend has barely moved.` : `Since ${y}, ${esc(loc.short)}'s trend line has moved <b>${sgn(ch, d)} °C</b>. ${Math.abs(t.slope) * 10 >= 0.3 ? 'That is faster than the global average of about 0.2 °C per decade.' : ''}`;
}

/* case files: each question carries the evidence shown after answering */
function shuffle(a, seed){ let s = seed || 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; const b = a.slice(); for(let i = b.length - 1; i > 0; i--){ const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function buildCases(A, loc){
  const n = loc.short, Q = [], seed = Math.round(Math.abs(loc.lat * 1000 + loc.lon * 7)) + 3;
  const st = series(A, 'temp'), vt = st && verdict(st);
  if(st && vt?.level === 'real'){
    const rev = {...st, values:st.values.slice().reverse()}, flat = {...st, values:shuffle(detrend(st.years, st.values).map(x => x + mean(st.values)), seed)};
    const opts = shuffle([['real', st], ['rev', rev], ['flat', flat]], seed + 1);
    Q.push({kind:'pick', badge:'real', t:`One of these lines is the real yearly temperature of ${n} since ${st.years[0]}. The other two are fakes. Which is real?`,
      o:opts.map(([k, s], i) => [k, `Line ${'ABC'[i]}`, spark(s, null)]), a:'real',
      why:`The real record ${vt.t.slope > 0 ? 'climbs' : 'falls'} over time. One fake runs the same years backwards in time; the other has the same ups and downs but in random order, so it has no trend.`,
      ev:() => trendChart(st), tip:'A trend is the overall direction once single-year wiggles are ignored.'});
  }
  const pool = ['rain', 'sun', 'soil', 'tmax'].map(id => series(A, id)).filter(Boolean).map(sr => [sr, verdict(sr)]).filter(x => x[1]);
  const tq = pool.find(x => x[1].level === 'real') || pool[0];
  if(tq){ const [sr, vd] = tq, a = vd.level === 'real' ? (vd.t.slope > 0 ? 'up' : 'down') : 'none';
    const m0 = mean(sr.values), dev = sr.values.map(x => Math.abs(x - m0)), odd = sr.years[dev.indexOf(Math.max(...dev))], y0 = sr.years[0], y1 = sr.years[sr.years.length - 1];
    const first = mean(sr.values.slice(0, 10)), last = mean(sr.values.slice(-10)), dd = sr.v.unit === '°C' ? 1 : sr.v.dec;
    const size = `${sr.v.name} moved ${sgn(vd.change, dd)} ${sr.v.unit} on the trend line from ${y0} to ${y1} (first 10 years averaged ${fmt(first, dd)}, last 10 years ${fmt(last, dd)} ${sr.v.unit}).`;
    Q.push({kind:'choice', badge:'trend', pre:`<figure class="clue-fig">${spark(sr, null)}<figcaption><span>${y0}</span><span>${y1}</span></figcaption></figure>`,
      t:`Here is ${sr.v.name.toLowerCase()} in ${n}, one dot per year. Is there a real trend, or is it just ups and downs?`,
      hint:'Look past single jumps: do the left end and the right end of the line sit at different levels?',
      o:[['up', 'Real rise'], ['down', 'Real fall'], ['none', 'No clear trend']], a,
      why:a === 'none' ? `${size} The trend test gives p ${pTxt(vd.t.p)}, above 0.05: a change this small could easily be chance.`
        : `${size} Single years jump up and down (look at ${odd}), but the overall direction is ${a === 'up' ? 'up' : 'down'}. The trend test gives p ${pTxt(vd.t.p)}: if nothing were really changing, a pattern this steady would appear by chance ${vd.chance} times.`,
      ev:() => trendChart(sr), tip:'Scientists call a trend significant when the chance of it appearing by luck is below 1 in 20.'}); }
  const sr = series(A, 'rain');
  if(sr && sr.years.length > 20){ const yrs = sr.years, i = Math.floor(yrs.length * .15), j = Math.floor(yrs.length * .8), [y1, y2] = [yrs[i + seed % 5], yrs[j - seed % 4]], v1 = sr.values[yrs.indexOf(y1)], v2 = sr.values[yrs.indexOf(y2)];
    Q.push({kind:'choice', t:`Which year was wetter in ${n}: ${y1} or ${y2}?`, o:[[String(y1), String(y1)], [String(y2), String(y2)]], a:String(v1 >= v2 ? y1 : y2),
      why:`${y1} had ${fmt(v1, 0)} mm and ${y2} had ${fmt(v2, 0)} mm of rain. One year alone tells you nothing about a trend: you need many years.`, ev:() => anomalyChart(sr), tip:'An anomaly is how far one year is from the average.'}); }
  const g = A.nasa?.bundle?.series;
  if(g){ const vt2 = varById('temp'), clim = MON.map((_, m) => mean(g.t2m.filter((_, k) => +g.month[k].slice(5, 7) === m + 1))), hot = clim.indexOf(Math.max(...clim));
    const opts = shuffle([hot, (hot + 2) % 12, (hot + 5) % 12, (hot + 9) % 12], seed + 2).map(m => [String(m), MON_LONG[m]]);
    Q.push({kind:'choice', t:`On average, which month is the hottest in ${n}?`, o:opts, a:String(hot), why:`${MON_LONG[hot]} averages ${fmt(clim[hot], 1)} °C. ${loc.lat < 0 ? 'South of the equator the seasons are flipped.' : ''}`, ev:() => cycleChart(A, vt2, +g.month[0].slice(0, 4), +g.month[g.month.length - 1].slice(0, 4)), tip:'The average year (the climatology) shows the normal rhythm of the seasons.'}); }
  if(st && vt){ const ch = vt.t.slope * (vt.t.x1 - vt.t.x0);
    Q.push({kind:'slider', badge:'trend', t:`Guess: how much did ${n}'s temperature trend line change from ${vt.t.x0} to ${vt.t.x1}?`, min:-1, max:3, step:.1, a:ch,
      why:`The trend line moved ${sgn(ch, 2)} °C. Within 0.3 °C counts as solved.`, ev:() => trendChart(st), tip:'Sen’s slope is the median of the slopes between every pair of years, so one odd year cannot pull it.'}); }
  const ra = series(A, 'rain'), so = series(A, 'soil');
  if(ra && so){ const yrs = ra.years.filter(y => so.years.includes(y)), a0 = yrs.map(y => ra.values[ra.years.indexOf(y)]), b0 = yrs.map(y => so.values[so.years.indexOf(y)]), r = pearson(detrend(yrs, a0), detrend(yrs, b0));
    if(r){ const a = r.p < 0.05 ? (r.r > 0 ? 'pos' : 'neg') : 'none';
      Q.push({kind:'choice', badge:'link', t:`Detective question: in ${n}, are years with more rain also years with wetter soil?`, o:[['pos', 'Yes, they go together'], ['neg', 'No, the opposite'], ['none', 'No clear link']], a,
        why:`Correlation r = ${fmt(r.r, 2)} (p ${pTxt(r.p)}) after removing long-term trends. ${a === 'pos' ? 'Rain soaks into the soil, so a link makes sense.' : a === 'none' ? 'In very dry or irrigated places rain may be too small to change soil wetness much.' : 'An unusual result worth investigating.'}`,
        ev:() => scatter(detrend(yrs, a0), detrend(yrs, b0), yrs.map(String), varById('rain'), varById('soil'), ols(detrend(yrs, a0), detrend(yrs, b0)), {anom:true}), tip:'Correlation measures how closely two variables move together, from −1 to +1.'}); } }
  return Q;
}
const QZ = {qs:[], i:0, score:0, locked:false, key:''};
function renderCase(){
  const body = $('#quizBody'), q = QZ.qs[QZ.i];
  if(!QZ.qs.length){ body.innerHTML = '<div class="empty">Not enough data to open a case here.</div>'; $('#quizMeta').innerHTML = ''; return; }
  if(!q){ const perfect = QZ.score === QZ.qs.length; award(10, QZ.key + ':done', 'first'); if(perfect) award(30, QZ.key + ':perfect', 'perfect');
    $('#quizMeta').innerHTML = ''; body.innerHTML = `<div class="quiz-end"><span class="q-badge big">${C.ic(perfect ? 'trophy' : 'search')}</span><h3>${perfect ? 'Case closed. Every clue solved.' : `Case closed: ${QZ.score} of ${QZ.qs.length} clues solved`}</h3><p>${perfect ? 'You read the data like a scientist.' : 'Open the case again, or try another place: every place has different clues.'}</p><button class="btn-primary" data-pl="again">${C.ic('refresh')}Open the case again</button></div>`; return; }
  $('#quizMeta').innerHTML = `<span class="case-prog" aria-label="Clue ${QZ.i + 1} of ${QZ.qs.length}">${QZ.qs.map((_, k) => `<i class="${k < QZ.i ? 'done' : k === QZ.i ? 'on' : ''}"></i>`).join('')}</span>`;
  const opts = q.kind === 'pick' ? `<div class="pick-opts">${q.o.map(([k, l, svg]) => `<button class="pick-opt" data-pl="pick" data-k="${k}"><span>${l}</span>${svg}</button>`).join('')}</div>`
    : q.kind === 'slider' ? `<div class="guess-row"><input id="caseRange" type="range" min="${q.min}" max="${q.max}" step="${q.step}" value="1" aria-label="Your guess in °C"><output id="caseOut" class="guess-out">+1.0 °C</output></div><button class="btn-primary" data-pl="slide">${C.ic('bolt')}Lock in my guess</button>`
    : `<div class="quiz-opts">${q.o.map(([k, l]) => `<button class="quiz-opt" data-pl="pick" data-k="${esc(k)}">${esc(l)}</button>`).join('')}</div>`;
  body.innerHTML = `<p class="case-n">Clue ${QZ.i + 1}</p><p class="quiz-q">${esc(q.t)}</p>${q.hint ? `<p class="case-hint">${C.ic('bulb')}<span>${esc(q.hint)}</span></p>` : ''}${q.pre ? `<div class="case-pre">${q.pre}</div>` : ''}${opts}<div class="quiz-fb" id="quizFb" aria-live="polite"></div>`;
}
function answerCase(ok, btn, extra = ''){
  const q = QZ.qs[QZ.i]; QZ.locked = true; if(ok){ QZ.score++; award(20, `${QZ.key}:${QZ.i}`, q.badge); }
  $$('#quizBody [data-pl="pick"]').forEach(b => { b.disabled = true; if(b.dataset.k === String(q.a)) b.classList.add('right'); else if(b === btn) b.classList.add('wrong'); });
  $$('#quizBody [data-pl="slide"], #caseRange').forEach(b => b.disabled = true);
  const right = q.kind === 'slider' ? `${sgn(q.a, 1)} °C` : (q.o.find(o => String(o[0]) === String(q.a)) || [])[1];
  $('#quizFb').innerHTML = `<p class="${ok ? 'ok' : 'no'}">${C.ic(ok ? 'check' : 'alert')}<span><b>${ok ? `Solved: ${esc(right)}.` : `Not this time. The answer is: ${esc(right)}.`}</b> ${extra}${esc(q.why)}</span></p>
    <figure class="case-ev"><figcaption>The evidence</figcaption>${q.ev()}</figure>${callout(C.ic, 'tip', 'Detective tip', esc(q.tip), 'book')}
    <button class="btn-primary" data-pl="next">${QZ.i + 1 >= QZ.qs.length ? 'Close the case' : 'Next clue'}</button>`;
}
function renderForecastGame(A, loc){
  const el = $('#guessBody'), fc = A.nasa?.bundle?.forecast?.forecast, s = A.nasa?.bundle?.series;
  if(!fc?.length || !s){ el.innerHTML = '<div class="empty">No forecast for this place.</div>'; return; }
  const f = fc.find(r => +r.month.slice(5, 7) === 7) || fc[Math.min(5, fc.length - 1)], m = +f.month.slice(5, 7), yr = f.month.slice(0, 4);
  const past = s.month.map((x, i) => +x.slice(5, 7) === m ? [x.slice(0, 4), s.t2m[i]] : null).filter(x => x && x[1] != null), last = past[past.length - 1], avg = mean(past.map(p => p[1]));
  const lo = Math.floor(avg - 4), hi = Math.ceil(avg + 4), start = Math.round(avg * 2) / 2;
  el.innerHTML = `<p class="quiz-q">What will the average temperature in ${esc(loc.short)} be in ${MON_LONG[m - 1]} ${yr}?</p>
    <p class="muted">Clues: ${MON_LONG[m - 1]} ${last[0]} averaged ${fmt(last[1], 1)} °C, and the long-term ${MON_LONG[m - 1]} average is ${fmt(avg, 1)} °C.</p>
    <div class="guess-row"><input id="fcRange" type="range" min="${lo}" max="${hi}" step="0.1" value="${start}" aria-label="Your guess in °C"><output id="fcOut" class="guess-out">${start.toFixed(1)} °C</output></div>
    <button class="btn-primary" data-pl="fc" data-v="${f.value}" data-lo="${f.lo90}" data-hi="${f.hi90}">${C.ic('bolt')}Lock in my guess</button><div class="quiz-fb" id="fcFb" aria-live="polite"></div>`;
}
export function renderPlayful(A, loc){
  PA = A; renderQuest();
  $('#funFinger').innerHTML = fingerprintHtml(A, loc);
  Object.assign(QZ, {qs:buildCases(A, loc), i:0, score:0, locked:false, key:`${loc.id}:case`}); renderCase();
  renderForecastGame(A, loc);
}
function wirePlayful(){
  document.addEventListener('input', e => {
    const t = e.target;
    if(t.matches('[data-pl-born]')){ const y = +t.value, sr = series(PA, 'temp'); $('#fpBornOut').textContent = y; $('#fpBornTxt').innerHTML = bornText(trendTest(sr.years, sr.values), y, sr.years[sr.years.length - 1], C.place()); }
    else if(t.id === 'caseRange') $('#caseOut').textContent = `${sgn(+t.value, 1)} °C`;
    else if(t.id === 'fcRange') $('#fcOut').textContent = `${(+t.value).toFixed(1)} °C`;
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-pl]'); if(!b || !PA) return; const k = b.dataset.pl;
    if(k === 'pick' && !QZ.locked) answerCase(String(QZ.qs[QZ.i].a) === b.dataset.k, b);
    else if(k === 'slide' && !QZ.locked){ const g = +$('#caseRange').value, q = QZ.qs[QZ.i]; answerCase(Math.abs(g - q.a) <= 0.3, null, `You guessed ${sgn(g, 1)} °C. `); }
    else if(k === 'next'){ QZ.i++; QZ.locked = false; renderCase(); }
    else if(k === 'again'){ Object.assign(QZ, {i:0, score:0, locked:false}); renderCase(); }
    else if(k === 'fc'){ const g = +$('#fcRange').value, v = +b.dataset.v, lo = +b.dataset.lo, hi = +b.dataset.hi, diff = Math.abs(g - v), inside = g >= lo && g <= hi;
      b.disabled = true; $('#fcRange').disabled = true; const got = award(diff <= 0.5 ? 30 : inside ? 15 : 5, `${C.place().id}:fc`, diff <= 0.5 ? 'forecast' : null);
      $('#fcFb').innerHTML = `<p class="${inside ? 'ok' : 'no'}">${C.ic(inside ? 'check' : 'alert')}<span><b>${diff <= 0.5 ? 'Bullseye.' : inside ? 'Inside the forecast range.' : 'Outside the range.'}</b> NASA-based forecast: <b>${v.toFixed(1)} °C</b> (90% range ${lo.toFixed(1)} to ${hi.toFixed(1)}). You said ${g.toFixed(1)} °C. Come back after that month to see who was closer: you or the model.${got ? ` +${got} XP` : ''}</span></p>`; }
  });
}
