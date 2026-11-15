/* Compare: "What to expect on your dates" (NASA POWER daily, trend-adjusted climatology from /api/outlook).
 * Risk Monitoring: hazard ranking, trend verdicts per hazard, "when in the year" calendar and the events map.
 * Charts follow the same style as lib/detective.js (dv-* classes, shared tooltip via data-tip). */
import {series, verdict, varById, mean, sgn, fmt, MON, MON_LONG} from './detective.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tip = (h, rows) => `data-tip="${esc(JSON.stringify({h, r:rows}))}"`;
const phone = () => typeof window !== 'undefined' && window.innerWidth <= 640;
const pc = x => x == null ? '—' : `${Math.round(x * 100)}%`;
const C_LO = '#4C9BE8', C_HI = '#F0705A';

/* ===================== COMPARE: outlook for the travel dates ===================== */
export function outlookChart(rows){
  const W = phone() ? 380 : 720, L = phone() ? 80 : 130, R = 18, T = 26, rowH = 76, H = T + rows.length * rowH + 30;
  const vals = rows.flatMap(r => [r.ol.low.p10, r.ol.high.p90]), lo = Math.floor(Math.min(...vals) / 5) * 5 - (Math.min(...vals) % 5 < 1.5 ? 5 : 0), hi = Math.ceil(Math.max(...vals) / 5) * 5;
  const X = v => L + (v - lo) / (hi - lo) * (W - L - R);
  let g = '';
  for(let v = lo; v <= hi; v += 5) g += `<line class="dv-grid" x1="${X(v)}" x2="${X(v)}" y1="${T - 6}" y2="${H - 26}"/><text class="dv-ax" x="${X(v)}" y="${H - 8}" text-anchor="middle">${v}°</text>`;
  if(35 > lo && 35 < hi) g += `<line x1="${X(35)}" x2="${X(35)}" y1="${T - 10}" y2="${H - 26}" stroke="#FF6178" stroke-dasharray="4 4" stroke-width="1.4"/><text class="dv-ax" x="${X(35) + 4}" y="${T - 12}" fill="#FF8A9A">35° hot</text>`;
  rows.forEach((r, i) => {
    const y = T + i * rowH, band = (q, col, yy, label) => `<rect x="${X(q.p10).toFixed(1)}" y="${yy}" width="${Math.max(3, X(q.p90) - X(q.p10)).toFixed(1)}" height="16" rx="8" fill="${col}" fill-opacity=".38" stroke="${col}" stroke-width="1.4"/><line x1="${X(q.p50).toFixed(1)}" x2="${X(q.p50).toFixed(1)}" y1="${yy - 3}" y2="${yy + 19}" stroke="#EAF8FF" stroke-width="2.6" stroke-linecap="round"/><text class="dv-lbl" x="${(X(q.p90) + 8).toFixed(1)}" y="${yy + 12}" fill="${col}">${fmt(q.p50, 0)}°</text><rect class="dv-hit" x="${X(q.p10) - 4}" y="${yy - 4}" width="${X(q.p90) - X(q.p10) + 8}" height="24" ${tip(`${r.name}: ${label}`, [['typical', `${fmt(q.p50, 1)} °C`], ['8 days in 10', `${fmt(q.p10, 1)} to ${fmt(q.p90, 1)} °C`]])}/>`;
    g += `<text class="dv-lbl" x="${L - 12}" y="${y + 20}" text-anchor="end" fill="#EAF8FF">${esc(r.name)}</text><text class="dv-ax" x="${L - 12}" y="${y + 36}" text-anchor="end">${esc(r.role)}</text>`;
    g += band(r.ol.low, C_LO, y + 6, 'night low') + band(r.ol.high, C_HI, y + 32, 'afternoon high');
    if(i < rows.length - 1) g += `<line class="dv-grid" x1="${L - 120}" x2="${W - R}" y1="${y + rowH - 8}" y2="${y + rowH - 8}"/>`;
  });
  return `<svg class="dv-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Night lows and afternoon highs to expect on your dates">${g}</svg>
    <div class="dv-key"><span><i style="background:${C_LO}"></i>Night low</span><span><i style="background:${C_HI}"></i>Afternoon high</span><span class="muted">bar = 8 days in 10 · white tick = typical day</span></div>`;
}
/* Open-Meteo weather forecast (not NASA) for the days of the trip that fall in the next 16 days,
 * drawn on top of the NASA "normal" range for each day, so you see if this year looks warmer or cooler than usual. */
export function forecastVsNormal(name, ol, fc){
  const byD = Object.fromEntries((ol.daily || []).map(r => [r.d, r]));
  const days = fc.filter(f => byD[f.d]).slice(0, 16); if(!days.length) return '';
  const W = phone() ? 380 : 720, H = phone() ? 230 : 250, L = 40, R = 14, T = 18, B = 30, n = days.length;
  const vals = days.flatMap(f => [f.hi, f.lo, ...byD[f.d].hi, ...byD[f.d].lo]).filter(v => v != null);
  const lo = Math.floor(Math.min(...vals) / 5) * 5, hi = Math.ceil(Math.max(...vals) / 5) * 5, slot = (W - L - R) / n;
  const X = i => L + (i + .5) * slot, Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let g = '';
  for(let v = lo; v <= hi; v += 5) g += `<line class="dv-grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="dv-ax" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}°</text>`;
  const band = (k, col) => { const top = days.map((f, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(byD[f.d][k][2]).toFixed(1)}`).join(''), bot = days.slice().reverse().map((f, j) => `L${X(n - 1 - j).toFixed(1)} ${Y(byD[f.d][k][0]).toFixed(1)}`).join('');
    return n > 1 ? `<path d="${top}${bot}Z" fill="${col}" fill-opacity=".22"/>` : `<rect x="${X(0) - 10}" y="${Y(byD[days[0].d][k][2])}" width="20" height="${Y(byD[days[0].d][k][0]) - Y(byD[days[0].d][k][2])}" fill="${col}" fill-opacity=".22"/>`; };
  g += band('hi', C_HI) + band('lo', C_LO);
  const line = (k, col) => n > 1 ? `<path d="${days.map((f, i) => f[k] == null ? '' : `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(f[k]).toFixed(1)}`).join('')}" fill="none" stroke="${col}" stroke-width="2.2"/>` : '';
  g += line('hi', C_HI) + line('lo', C_LO);
  const every = Math.max(1, Math.ceil(n / (phone() ? 5 : 8)));
  days.forEach((f, i) => { const nr = byD[f.d], dl = new Date(f.d + 'T12:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'});
    [['hi', C_HI], ['lo', C_LO]].forEach(([k, col]) => { if(f[k] != null) g += `<circle cx="${X(i).toFixed(1)}" cy="${Y(f[k]).toFixed(1)}" r="4" fill="${col}" stroke="#06111F" stroke-width="1.5"/>`; });
    if(i % every === 0) g += `<text class="dv-ax" x="${X(i)}" y="${H - 10}" text-anchor="middle">${dl}</text>`;
    g += `<rect class="dv-hit" x="${(X(i) - slot / 2).toFixed(1)}" y="${T}" width="${slot.toFixed(1)}" height="${H - T - B}" ${tip(`${name}, ${dl}`, [['forecast high / low', `${fmt(f.hi, 0)} / ${fmt(f.lo, 0)} °C`], ['normal high (NASA)', `${fmt(nr.hi[0], 0)} to ${fmt(nr.hi[2], 0)} °C`], ['normal low (NASA)', `${fmt(nr.lo[0], 0)} to ${fmt(nr.lo[2], 0)} °C`], ...(f.pop != null ? [['chance of rain', `${f.pop}%`]] : [])])}/>`; });
  const dHi = mean(days.map(f => f.hi - byD[f.d].hi[1])), word = Math.abs(dHi) < 1 ? 'about normal' : dHi > 0 ? `${fmt(dHi, 1)} °C warmer than normal` : `${fmt(-dHi, 1)} °C cooler than normal`;
  const wet = days.filter(f => (f.pop ?? 0) >= 50).length;
  return `<div class="fc-block"><p class="fc-sum"><b>${esc(name)}:</b> forecast afternoons are ${word} for ${n === 1 ? 'this day' : `these ${n} days`}${wet ? `, with rain likely on ${wet} day${wet > 1 ? 's' : ''}` : ''}.</p>
    <svg class="dv-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)}: weather forecast compared with the normal range">${g}</svg></div>`;
}
export function forecastSection(a, b){
  const parts = [a, b].filter(d => d.fc?.length).map(d => forecastVsNormal(d.loc.short, d.ol, d.fc)).filter(Boolean);
  if(!parts.length) return '';
  return `<section class="card cmp-sec"><header class="cmp-sec-h"><h2>Weather forecast for your first days</h2><span class="tag amber">Not NASA: Open-Meteo forecast</span></header>
    <p class="cmp-idea">Your trip starts soon, so a real weather forecast exists. Dots and lines are the forecast; the shaded bands are what is normal for each day from NASA data. Above the band means warmer than usual.</p>
    <div class="fc-grid">${parts.join('')}</div>
    <div class="dv-key"><span><i style="background:${C_HI}"></i>Afternoon high</span><span><i style="background:${C_LO}"></i>Night low</span><span class="muted">band = normal range (8 days in 10, NASA POWER) · line = forecast</span></div>
    <p class="muted cmp-src">Forecast: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Weather data by Open-Meteo.com</a> (CC BY 4.0), from national weather services. Forecasts reach about 16 days ahead; later days use NASA data only.</p></section>`;
}
/* one sentence on what to expect at the destination, as a key-finding callout */
function outlookKey(b){
  const o = b.ol, wet = o.odds.wet ?? 0, rainTxt = wet < .05 ? 'rain is very unlikely' : wet < .2 ? `rain on about 1 day in ${Math.max(2, Math.round(1 / wet))}` : `rain on about ${Math.round(wet * 100)}% of days`;
  const hot = o.odds.hot >= .1 ? ` About ${Math.round(o.odds.hot * 100)}% of days reach 35 °C.` : '', cold = o.odds.cold >= .1 ? ` Some nights drop to 5 °C or less.` : '';
  return `<aside class="callout co-key"><span class="co-ic"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg></span><div class="co-b"><p class="co-k">In ${esc(b.loc.short)} on your dates</p><div class="co-t"><b>Expect afternoons around ${fmt(o.high.p50, 0)} °C and nights around ${fmt(o.low.p50, 0)} °C</b>, with ${rainTxt}.${hot}${cold}</div></div></aside>`;
}
export function outlookHtml(a, b){
  const rows = [{name:a.loc.short, role:'from', ol:a.ol}, {name:b.loc.short, role:'to', ol:b.ol}];
  const line = (label, f, better) => { const x = f(a.ol), y = f(b.ol), w = better ? better(a.ol, b.ol) : 0; return `<tr><th scope="row">${label}</th><td class="${w < 0 ? 'win' : ''}">${x}</td><td class="${w > 0 ? 'win' : ''}">${y}</td></tr>`; };
  const diffP = (k, lowerBetter = true) => (p, q) => { const d = (q.odds[k] ?? 0) - (p.odds[k] ?? 0); return Math.abs(d) < .1 ? 0 : (lowerBetter ? (d < 0 ? 1 : -1) : (d > 0 ? 1 : -1)); };
  const chk = o => o.check ? `<b>${pc(o.check.cover_high)}</b> of real afternoon highs fell inside the bar (target 80%), checked on ${o.check.years[0]}–${o.check.years[1]}` : 'not enough years to check';
  return `<section class="card cmp-sec">
    <header class="cmp-sec-h"><h2>What to expect on your dates</h2><span class="tag cyan">NASA POWER daily, ${a.ol.years[0]}–${a.ol.years[1]}</span></header>
    <p class="cmp-idea">Nobody can forecast the exact weather weeks ahead. But 30 years of NASA data for the same days, moved to today's warmer climate, show what is likely.</p>
    ${outlookKey(b)}
    <figure class="cmp-fig">${outlookChart(rows)}</figure>
    <div class="tbl-scroll"><table class="tbl cmp-tbl"><thead><tr><th></th><th>${esc(a.loc.short)} <small>(from)</small></th><th>${esc(b.loc.short)} <small>(to)</small></th></tr></thead><tbody>
      ${line('Chance of a hot day (35 °C or more)', o => pc(o.odds.hot), diffP('hot'))}
      ${line('Chance of a rainy day (1 mm or more)', o => pc(o.odds.wet), diffP('wet'))}
      ${line('Chance of a cold night (5 °C or less)', o => pc(o.odds.cold), diffP('cold'))}
      ${line('Typical rain over your dates', o => o.rain.median_total == null ? '—' : `${fmt(o.rain.median_total, 0)} mm`)}
      ${line('Afternoons now vs 30 years ago', o => `${fmt(o.then_now.now_high, 1)} °C <small>vs ${fmt(o.then_now.then_high, 1)} °C (${o.then_now.then})</small>`)}
    </tbody></table></div>
    <details class="cmp-how"><summary>How reliable is this?</summary>
      <p>We rebuilt the outlook for each of the last 10 years using only earlier years, then compared it with what really happened.</p>
      <ul><li><b>${esc(a.loc.short)}:</b> ${chk(a.ol)}.</li><li><b>${esc(b.loc.short)}:</b> ${chk(b.ol)}.</li></ul>
      <p class="muted">Method: same calendar days (±3) in each of the last 30 years, each shifted by the local warming trend, then the spread and the odds are counted. It describes likely conditions, not a forecast for one day.</p></details>
  </section>`;
}
/* turn the outlook into the fields the comfort/safety score uses */
export function climFromOutlook(o){
  return {meanT:(o.high.mean + o.low.mean) / 2, hi:o.high.p50, lo:o.low.p50, rainPerDay:o.rain.per_day ?? 0, wetFrac:o.odds.wet ?? 0,
    hotFrac:o.odds.hot, coldFrac:o.odds.frost, lenDays:o.window.days, rainTotal:o.rain.median_total ?? 0};
}

/* ===================== callouts =====================
 * One look for the things a visitor should not miss: kind 'key' = key finding (orange, the evidence colour),
 * 'tip' = what you can do (cyan), 'warn' = watch out (red), 'ok' = all clear (green). */
export const callout = (ic, kind, label, body, icon) =>
  `<aside class="callout co-${kind}"><span class="co-ic">${ic(icon || {key:'search', tip:'bulb', warn:'alert', ok:'check'}[kind])}</span><div class="co-b"><p class="co-k">${esc(label)}</p><div class="co-t">${body}</div></div></aside>`;

/* ===================== RISK MONITORING ===================== */
/* practical advice per hazard, shown as a "What you can do" callout */
export const HZ_TIPS = {
  quake:{hi:'Learn "drop, cover, hold on", know the safe spot in each room (under a sturdy table), fix heavy furniture to the wall and keep a small emergency bag ready.', lo:'Strong earthquakes are rare here, but knowing "drop, cover, hold on" is always worth it.'},
  heat:{hi:'Drink water often, avoid hard outdoor work between 11:00 and 16:00, keep rooms shaded, and check on older people and children during heat waves.', lo:'Heat is not a big threat here. On hot days still carry water and take breaks in the shade.'},
  drought:{hi:'Save water at home, water plants early in the morning or late in the evening, and follow local water-use advice.', lo:'No sign of a drying trend. Using water carefully still helps in dry seasons.'},
  flood:{hi:'Never walk or drive through flood water, keep street drains clear, and know the way to higher ground from home and school.', lo:'No strong flood signal. During heavy storms, still avoid low roads and underpasses.'},
  dust:{hi:'On dusty or polluted days, limit hard exercise outdoors and keep windows closed. People with asthma should keep their medicine at hand; a well-fitting N95 mask helps.', lo:'The air is mostly clean. Sensitive people may still notice the occasional dusty day.'},
  sea:{hi:'Low coastal areas will flood more often during storms. Check local flood maps before building or buying near the shore.', lo:'The sea is rising slowly here. It matters most for very low land right on the coast.'}
};
export function topConcern(HAZARDS, H, levels){
  const ranked = HAZARDS.map((h, i) => ({h, i, r:H[h.id], lv:levels[i]})).filter(x => x.lv !== 'na' && x.lv !== 'scanning').sort((a, b) => b.r.score - a.r.score);
  return ranked[0] || null;
}

/* the question each tower answers, in plain words */
export const HZ_Q = {
  quake:'How often does the ground shake nearby?',
  heat:'Is it getting hotter here?',
  drought:'Is the land getting drier?',
  flood:'Are heavy rain, storms or floods a threat?',
  dust:'How clean is the air?',
  sea:'Is the sea rising here?'
};
/* trend verdict (same test as the dashboard) for the variable behind each tower */
const HZ_VAR = {heat:'temp', drought:'soil', flood:'rain', dust:'pm25', sea:'sea'};
export function hazardTrend(A, id){
  const v = HZ_VAR[id]; if(!v) return null;
  const sr = series(A, v); const vd = sr && verdict(sr); if(!vd) return null;
  const bad = {heat:1, drought:-1, flood:1, dust:1, sea:1}[id], worse = vd.level !== 'none' && Math.sign(vd.t.slope) === bad;
  return {vd, sr, worse, text:`${sr.v.short}: ${vd.word.toLowerCase()}`, years:`${sr.years[0]}–${sr.years[sr.years.length - 1]}`};
}
export function glanceHtml(HAZARDS, H, levels, sel, LEVEL, ic, A){
  const order = HAZARDS.map((h, i) => i).sort((x, y) => (levels[y] === 'na') - (levels[x] === 'na') || H[HAZARDS[y].id].score - H[HAZARDS[x].id].score);
  return order.map(i => { const h = HAZARDS[i], r = H[h.id], lv = levels[i], col = LEVEL[lv][1], tr = lv !== 'scanning' && hazardTrend(A, h.id);
    return `<li><button class="gl-row" data-i="${i}" aria-pressed="${i === sel}"><span class="gl-ic" style="color:${col}">${ic(h.icon)}</span>
      <span class="gl-t"><b>${esc(h.hazard)}</b><small>${esc(HZ_Q[h.id])}</small></span>
      <span class="gl-bar" aria-hidden="true"><i style="width:${lv === 'scanning' ? 0 : r.score}%;background:${col}"></i></span>
      <span class="lvl lvl-${lv}">${LEVEL[lv][0]}</span>${tr && tr.worse ? `<span class="gl-tr" title="${esc(tr.text)}">${ic('trend')}</span>` : '<span class="gl-tr"></span>'}</button></li>`; }).join('');
}

/* when in the year: one row per hazard, 12 months, darker = more of that hazard */
export function calendarHtml(A){
  const s = A?.nasa?.bundle?.series; if(!s) return '<div class="empty">No monthly NASA record for this place.</div>';
  const last = +s.month[s.month.length - 1].slice(0, 4), from = last - 9;
  const clim = (arr, f = x => x) => MON.map((_, m) => mean(s.month.map((ym, i) => (+ym.slice(0, 4) >= from && +ym.slice(5, 7) === m + 1 && arr?.[i] != null) ? f(arr[i], ym) : null)));
  const dim = ym => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const rows = [];
  const tmax = clim(s.t2m_max);
  if(tmax.some(x => x != null)) rows.push({id:'heat', name:'Heat', unit:'°C', note:'daytime high', vals:tmax, lvl:v => (v - 26) / 16, fmt:v => fmt(v, 0) + '°', col:'#F0705A'});
  const rain = s.prectotcorr ? MON.map((_, m) => mean(s.month.map((ym, i) => (+ym.slice(0, 4) >= from && +ym.slice(5, 7) === m + 1 && s.prectotcorr[i] != null) ? s.prectotcorr[i] * dim(ym) : null))) : null;
  if(rain && rain.some(x => x != null)){ const mx = Math.max(...rain); rows.push({id:'flood', name:'Heavy rain', unit:'mm', note:'rain per month', vals:rain, lvl:v => mx < 5 ? v / 60 : v / Math.max(mx, 60), fmt:v => fmt(v, 0), col:'#3FB8AF'}); }
  const soil = clim(s.gwetroot, x => x * 100);
  if(soil.some(x => x != null)) rows.push({id:'drought', name:'Dry soil', unit:'%', note:'soil wetness, lower is drier', vals:soil, lvl:v => (55 - v) / 40, fmt:v => fmt(v, 0) + '%', col:'#C8894B'});
  if(A.air?.monthly_clim?.length === 12) rows.push({id:'dust', name:'Dusty air', unit:'µg/m³', note:'PM2.5', vals:A.air.monthly_clim, lvl:v => v / 45, fmt:v => fmt(v, 0), col:'#C9A27C'});
  const eo = A.eonet?.byCat;
  if(eo){ const cnt = Array(12).fill(0); ['severeStorms', 'floods', 'landslides'].forEach(k => (eo[k] || []).forEach(e => { const m = +String(e.date).slice(5, 7); if(m) cnt[m - 1]++; })); const mx = Math.max(...cnt);
    if(mx > 0) rows.push({id:'storm', name:'Storm & flood events', unit:'events', note:'NASA EONET', vals:cnt, lvl:v => v / mx, fmt:v => v ? String(v) : '', col:'#7FB2FF'}); }
  const cw = phone() ? 24 : 50, L = phone() ? 118 : 186, T = 22, rh = phone() ? 34 : 40, W = L + 12 * cw + 6, H = T + rows.length * rh + 4;
  let g = MON.map((m, i) => `<text class="dv-ax" x="${L + i * cw + cw / 2}" y="14" text-anchor="middle">${phone() ? m[0] : m}</text>`).join('');
  const hexA = (c, a) => { const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(2)})`; };
  rows.forEach((r, k) => { const y = T + k * rh;
    g += `<text class="dv-lbl" x="${L - 10}" y="${y + rh / 2}" text-anchor="end" fill="#EAF8FF">${esc(r.name)}</text><text class="dv-ax" x="${L - 10}" y="${y + rh / 2 + 13}" text-anchor="end">${phone() ? '' : esc(r.note)}</text>`;
    r.vals.forEach((v, m) => { const t = v == null ? 0 : Math.max(0, Math.min(1, r.lvl(v)));
      g += `<rect x="${L + m * cw + 1}" y="${y + 2}" width="${cw - 2}" height="${rh - 4}" rx="6" fill="${v == null ? '#0E1E2C' : hexA(r.col, .08 + t * .85)}" ${v == null ? '' : tip(`${r.name}, ${MON_LONG[m]}`, [[r.note, `${r.id === 'storm' ? v : fmt(v, r.unit === '°C' ? 1 : 0)} ${r.unit}`]])}/>`;
      if(!phone() && v != null) g += `<text class="dv-cal-v" x="${L + m * cw + cw / 2}" y="${y + rh / 2 + 4}" text-anchor="middle" fill="${t > .55 ? '#06111F' : '#CFE3EF'}" pointer-events="none">${r.fmt(v)}</text>`; }); });
  return `<svg class="dv-svg dv-cal" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hazards by month">${g}</svg>
    <p class="muted cal-note">Averages for ${from}–${last} from NASA POWER, MERRA-2 and EONET. Darker means more of that hazard. Earthquakes have no season, so they are not shown.</p>`;
}

/* events near you: earthquakes (USGS) and NASA EONET events placed by direction and distance */
export function eventsMapHtml(A){
  const R0 = A.radiusKm, lat0 = A.loc.lat, lon0 = A.loc.lon, k = Math.cos(lat0 * Math.PI / 180);
  const pts = [];
  (A.quakes?.list || []).forEach(q => { if(q.lat == null) return; pts.push({kind:'quake', lat:q.lat, lon:q.lon, mag:q.mag, title:`M${q.mag.toFixed(1)} earthquake`, meta:`${new Date(q.time).toISOString().slice(0, 10)} · ${q.dist} km away`}); });
  const KINDS = {severeStorms:['storm', 'Storm', '#7FB2FF'], floods:['flood', 'Flood', '#3FB8AF'], landslides:['slide', 'Landslide', '#C8894B'], volcanoes:['volcano', 'Volcano', '#FF6178']};
  Object.entries(A.eonet?.byCat || {}).forEach(([cat, list]) => { const kd = KINDS[cat]; if(!kd) return; list.forEach(e => { if(e.lat == null) return; pts.push({kind:kd[0], lat:e.lat, lon:e.lon, title:`${kd[1]}: ${e.title}`, meta:`${e.date} · ${e.dist} km away`, col:kd[2]}); }); });
  if(!pts.length) return {html:'<div class="empty">No earthquakes or NASA EONET events with a location in this radius and period.</div>', n:0};
  const S = phone() ? 340 : 420, c = S / 2, rr = c - 26;
  const P = p => { const dx = (p.lon - lon0) * 111.32 * k, dy = (p.lat - lat0) * 110.57, d = Math.hypot(dx, dy), f = Math.min(1, d / R0); const a = Math.atan2(dy, dx); return [c + Math.cos(a) * f * rr, c - Math.sin(a) * f * rr]; };
  let g = `<circle cx="${c}" cy="${c}" r="${rr}" fill="rgba(79,209,232,.04)" stroke="rgba(79,209,232,.35)"/>`;
  [.25, .5, .75].forEach(f => { g += `<circle cx="${c}" cy="${c}" r="${rr * f}" fill="none" stroke="rgba(145,174,194,.18)" stroke-dasharray="3 5"/>`; });
  [.5, 1].forEach(f => { g += `<text class="dv-ax" x="${c + rr * f * .71 + 4}" y="${c + rr * f * .71 + 12}">${Math.round(R0 * f)} km</text>`; });
  g += `<line x1="${c}" x2="${c}" y1="${c - rr - 6}" y2="${c + rr + 6}" stroke="rgba(145,174,194,.12)"/><line y1="${c}" y2="${c}" x1="${c - rr - 6}" x2="${c + rr + 6}" stroke="rgba(145,174,194,.12)"/><text class="dv-ax" x="${c}" y="12" text-anchor="middle">N</text>`;
  pts.sort((p, q) => (q.mag || 0) - (p.mag || 0)).forEach(p => { const [x, y] = P(p);
    g += p.kind === 'quake' ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + Math.max(0, p.mag - 4) * 3.4).toFixed(1)}" fill="#FFB46B" fill-opacity=".55" stroke="#FFB46B" stroke-width="1.2" ${tip(p.title, [['', p.meta]])}/>`
      : `<rect x="${(x - 5).toFixed(1)}" y="${(y - 5).toFixed(1)}" width="10" height="10" rx="2.5" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})" fill="${p.col}" stroke="#06111F" stroke-width="1.2" ${tip(p.title, [['', p.meta]])}/>`; });
  g += `<circle cx="${c}" cy="${c}" r="6" fill="#EAF8FF" stroke="#22D3EE" stroke-width="3"/>`;
  const cnt = k2 => pts.filter(p => p.kind === k2).length, kinds = [['quake', 'Earthquakes (USGS)', '#FFB46B', 'circle'], ['storm', 'Storms', '#7FB2FF'], ['flood', 'Floods', '#3FB8AF'], ['slide', 'Landslides', '#C8894B'], ['volcano', 'Volcanoes', '#FF6178']].filter(x => cnt(x[0]));
  return {n:pts.length, html:`<div class="map-wrap"><svg class="dv-svg dv-map" viewBox="0 0 ${S} ${S}" role="img" aria-label="${pts.length} events around the scanned place">${g}</svg>
    <ul class="map-legend">${kinds.map(([k2, n, col, shape]) => `<li><i class="${shape === 'circle' ? 'dot' : 'dia'}" style="background:${col}"></i>${n}<b>${cnt(k2)}</b></li>`).join('')}<li class="muted">Bigger circle = stronger earthquake. The centre is your scanned place; rings show distance.</li></ul></div>`};
}
