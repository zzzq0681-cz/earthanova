/* Earthanova app logic — ported unchanged from the original Vite project (src/main.js).
 * It drives the server-rendered markup in components/EarthanovaMarkup.tsx imperatively,
 * and is loaded once, client-side only, by components/EarthanovaClient.tsx. */
import Globe from 'globe.gl';
import {towerViz, renderChart as renderHzChart, wireCharts as wireHzCharts} from './hazard-charts.js';
import {buildPlan, bestTimeHtml, wirePlanner} from './compare-planner.js';
import {outlookHtml, forecastSection, climFromOutlook, HZ_Q, HZ_TIPS, hazardTrend, glanceHtml, calendarHtml, eventsMapHtml, callout, topConcern} from './risk-compare.js';
import {initViews, renderBasic, renderAdvanced as renderAdvViews, renderPlayful as renderPlayViews} from './views.js';
import {VARS, series as dvSeries, verdict as dvVerdict, fmt as dvFmt, sgn as dvSgn, pTxt} from './detective.js';
import {eonetEvents, nasaHazards, nasaOutlook, nasaClimateYear, apiBase, nasaFind, nasaEnsure, nasaLoad, nasaBuildAnalysis, isStatic, reportUrl} from './nasa-data.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TEX = {night:'https://unpkg.com/three-globe@2.41.12/example/img/earth-night.jpg', topo:'https://unpkg.com/three-globe@2.41.12/example/img/earth-topology.png'};
const ESRI = (z,y,x) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const WAYBACK = (r,z,y,x) => `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${r}/${z}/${y}/${x}`;
const MODELS = ['EC_Earth3P_HR','MPI_ESM1_2_XR','MRI_AGCM3_2_S','CMCC_CM2_VHR4'];
const LAST_YEAR = new Date().getFullYear() - 1;
const yrs = (a, b) => Array.from({length:b - a + 1}, (_, i) => a + i);
const rng = a => a.length > 1 ? `${a[0]}–${a[a.length - 1]}` : `${a[0]}`;
function makePeriod(start, end){
  const years = yrs(start, end), nCur = years.length >= 5 ? 2 : 1, baseYears = years.slice(0, -nCur), curYears = years.slice(-nCur);
  const proj = end === LAST_YEAR;
  return {start, end, years, baseYears, curYears, proj, projYears:proj ? yrs(end + 1, end + 5) : [], baseLabel:rng(baseYears), curLabel:rng(curYears), label:`${start}–${end}`};
}
const per = A => A.period || (A.period = Object.assign(makePeriod(2019, 2025), {proj:!!A.proj, projYears:[2026,2027,2028,2029,2030]}));
const CACHE_VER = 'es:v4-nasa:';

/* ---------- icons ---------- */
const P = {
  globe:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z',
  home:'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  pin:'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  radar:'M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8M12 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  bars:'M4 20V12M9 20V5M14 20v-9M19 20V8',
  trend:'M3 17l6-6 4 4 8-8M15 7h6v6',
  orbit:'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z M12 3c4 0 4 18 0 18s-4-18 0-18z M4.2 7.5c2-3.5 17.6 5.5 15.6 9s-17.6-5.5-15.6-9z',
  layers:'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
  file:'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z M14 3v5h5 M8 13h8M8 17h6',
  sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  cloud:'M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 11.5a3.25 3.25 0 0 1-.5 6.5z',
  wind:'M3 8h11a3 3 0 1 0-3-3 M3 12h16a3 3 0 1 1-3 3 M3 16h7',
  check:'M5 12.5l4.5 4.5L19 7.5',
  alert:'M12 3.5l9.5 17h-19z M12 10v4.5 M12 17.5h.01',
  thermo:'M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0z M12 9v7',
  drop:'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  leaf:'M5 19c0-9 6-14 15-14 0 9-5 15-14 15z M5 19l8-8',
  flame:'M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-3 5-3 8a6 6 0 0 0 6 6z',
  soil:'M3 14h18 M5 18h14 M8 22h8 M12 3v8 M9 6l3-3 3 3',
  chev:'M6 9l6 6 6-6', chevr:'M9 6l6 6-6 6',
  star:'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  refresh:'M20 11a8 8 0 0 0-14.5-4.5L4 8 M4 4v4h4 M4 13a8 8 0 0 0 14.5 4.5L20 16 M20 20v-4h-4',
  pulse:'M3 12h4l2-5 4 10 2-5h6',
  info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5 M12 8h.01',
  scan:'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  up:'M12 19V5M6 11l6-6 6 6', down:'M12 5v14M6 13l6 6 6-6', flat:'M5 12h14',
  brain:'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V6a2 2 0 0 0-3-2z M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  compare:'M4 5h7v14H4z M13 5h7v14h-7z',
  calendar:'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  tower:'M12 3v3 M9 21l3-15 3 15 M10 15h4 M8 9a4 4 0 0 1 8 0',
  search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  download:'M12 4v11 M7 10l5 5 5-5 M5 20h14',
  trash:'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13',
  quake:'M3 12h3l2-6 3 12 3-9 2 3h5',
  flask:'M9 3h6 M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3 M8 15h8',
  book:'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 5v16 M9 7h6',
  code:'M8 8l-5 4 5 4 M16 8l5 4-5 4 M14 5l-4 14',
  briefcase:'M4 8h16v11H4z M9 8V5h6v3 M4 13h16',
  user:'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M4 21a8 8 0 0 1 16 0',
  logout:'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4 M16 8l4 4-4 4 M20 12H9',
  lock:'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
  close:'M6 6l12 12M18 6L6 18',
  plus:'M12 5v14M5 12h14',
  trophy:'M7 4h10v5a5 5 0 0 1-10 0z M7 6H4v2a3 3 0 0 0 3 3 M17 6h3v2a3 3 0 0 1-3 3 M12 14v4 M8 21h8',
  bolt:'M13 3L5 14h6l-1 7 8-11h-6z',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  waves:'M3 9c3 0 3-2 6-2s3 2 6 2 3-2 6-2 M3 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2 M3 19c3 0 3-2 6-2s3 2 6 2 3-2 6-2',
  mail:'M3 6h18v12H3z M3 7l9 6 9-6',
  bulb:'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z',
  print:'M7 9V4h10v5 M6 17H4v-6h16v6h-2 M7 14h10v6H7z'
};
const ic = (n, extra='') => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" ${extra}><path d="${P[n]}"/></svg>`;
const hydrateIcons = root => root.querySelectorAll('i[data-ic]').forEach(el => { el.outerHTML = ic(el.dataset.ic); });
hydrateIcons(document);

/* ---------- storage ---------- */
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch{ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{ /* quota or private mode */ } }
};
const PRESETS = [
  {name:'Alexandria, Egypt', short:'Alexandria', lat:31.2, lon:29.92, featured:true},
  {name:'Cairo, Egypt', short:'Cairo', lat:30.04, lon:31.24},
  {name:'Riyadh, Saudi Arabia', short:'Riyadh', lat:24.71, lon:46.68},
  {name:'Singapore', short:'Singapore', lat:1.35, lon:103.82},
  {name:'Aswan, Egypt', short:'Aswan', lat:24.09, lon:32.9}
].map(withId);
function withId(l){ return {...l, lat:+(+l.lat).toFixed(4), lon:+(+l.lon).toFixed(4), id:`${(+l.lat).toFixed(2)},${(+l.lon).toFixed(2)}`}; }
const uKey = k => `es:${k}:guest`;
const favs = () => store.get(uKey('favs'), []);
const recents = () => store.get(uKey('recent'), []);
const isFav = l => favs().some(f => f.id === l.id);
function toggleFav(l){ const f = favs(); const i = f.findIndex(x => x.id === l.id); if(i >= 0) f.splice(i,1); else f.unshift({...l, since:Date.now()}); store.set(uKey('favs'), f.slice(0,30)); return i < 0; }
function addRecent(l){ const r = recents().filter(x => x.id !== l.id); r.unshift({...l, at:Date.now()}); store.set(uKey('recent'), r.slice(0,10)); }

/* ---------- data layer ---------- */
async function getJSON(url, timeout=25000){
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try{ const r = await fetch(url, {signal:ctl.signal}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
  finally{ clearTimeout(t); }
}
const mean = a => { const v = a.filter(x => x != null && !Number.isNaN(x)); return v.length ? v.reduce((s,x)=>s+x,0)/v.length : null; };
const round = (v, d=1) => v == null ? null : +v.toFixed(d);

function linreg(xs, ys){
  const pts = xs.map((x,i)=>[x,ys[i]]).filter(p => p[1] != null), n = pts.length;
  if(n < 3) return null;
  const mx = mean(pts.map(p=>p[0])), my = mean(pts.map(p=>p[1]));
  let sxx=0, sxy=0; pts.forEach(([x,y]) => { sxx += (x-mx)**2; sxy += (x-mx)*(y-my); });
  const b = sxy/sxx, a = my - b*mx;
  const sse = pts.reduce((s,[x,y]) => s + (y-(a+b*x))**2, 0), se = Math.sqrt(sse/(n-2)/sxx);
  const T95 = {1:12.706,2:4.303,3:3.182,4:2.776,5:2.571,6:2.447,7:2.365,8:2.306,9:2.262,10:2.228}[n-2] || 2.0;
  const t = se > 0 ? b/se : 0;
  return {slope:b, t, n, sig: Math.abs(t) > T95};
}

let waybackCfg = null;
async function waybackReleases(){
  if(waybackCfg) return waybackCfg;
  const c = await getJSON('https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json', 15000);
  waybackCfg = Object.entries(c).map(([id,v]) => ({id:+id, date:(String(v.itemTitle).match(/\d{4}-\d{2}-\d{2}/)||[])[0]})).filter(r => r.date).sort((a,b) => a.date < b.date ? -1 : 1);
  return waybackCfg;
}
async function waybackPair(lat, lon, period){
  const rel = await waybackReleases(), z = 13, {x, y} = tileXY(lat, lon, z), tx = Math.floor(x), ty = Math.floor(y);
  const early = rel.find(r => r.date >= `${period.start}-01-01`) || rel[0], inRange = rel.filter(r => r.date <= `${period.end}-12-31`), latest = inRange[inRange.length-1] || rel[rel.length-1];
  const resolve = async r => {
    const j = await getJSON(`https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tilemap/${r.id}/${z}/${ty}/${tx}`, 12000);
    if(!j || !j.data || !j.data[0]) return null;
    const id = (j.select && j.select[0]) || r.id;
    return {id, date:(rel.find(x => x.id === id) || r).date};
  };
  const [before, after] = await Promise.all([resolve(early), resolve(latest)]);
  return {before, after, same: !!(before && after && before.id === after.id)};
}

async function reverseName(lat, lon){
  try{
    const j = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`, 10000);
    const place = j.city || j.locality, ctry = j.countryName;
    if(place && ctry) return {name:`${place}, ${ctry}`, short:place};
    if(ctry) return {name:ctry, short:ctry};
    if(place) return {name:place, short:place};
  }catch{ /* fall through */ }
  return null;
}

/* Data policy: climate series come from NASA only (via the Earth Sentinel API). */
async function analyze(loc, radiusKm, onStep, period){ return analyzeNasa(loc, radiusKm, onStep, period); }
async function analyzeNasa(loc, radiusKm, onStep, period){
  const hit = await nasaEnsure(loc.lat, loc.lon, loc.short || loc.name).catch(e => { onStep('era5', false); throw e; });
  if(!hit.covered){
    onStep('era5', false);
    const e = new Error(`No NASA time series is loaded for this location yet (nearest loaded place: ${hit.place.name}, ${Math.round(hit.distance_km)} km away).`);
    e.userFacing = true; throw e;
  }
  const bundle = await nasaLoad(hit.place.name).catch(e => { onStep('era5', false); throw e; });
  onStep('era5', true, 'NASA POWER');
  ['cmip', 'air'].forEach(k => onStep(k, true, 'not loaded yet'));
  const hazP = Promise.allSettled([eonetEvents(loc.lat, loc.lon, radiusKm, period), usgsQuakes(loc, radiusKm, period), nasaHazards(hit.place.name)]);
  let img = null;
  try{ img = await waybackPair(loc.lat, loc.lon, period); onStep('img', true); }catch{ onStep('img', false); }
  const [eon, qk, hz] = await hazP;
  onStep('hazard', [eon, qk, hz].some(r => r.status === 'fulfilled'), 'NASA EONET · MERRA-2 · NASA-SSH · USGS');
  const A = nasaBuildAnalysis(loc, radiusKm, bundle, img, period, hit, {mean, round, linreg});
  A.eonet = eon.status === 'fulfilled' ? eon.value : null;
  A.quakes = qk.status === 'fulfilled' ? qk.value : null;
  A.dust = hz.status === 'fulfilled' ? hz.value.dust : null;
  A.sea = hz.status === 'fulfilled' ? hz.value.sea : null;
  A.air = hz.status === 'fulfilled' ? hz.value.air || null : null;
  if(A.air?.annual?.length){ const r5 = A.air.annual.slice(-5); A.aq = {pm25:Math.round(mean(r5) * 10) / 10, years:r5.length, aod:A.air.aod_recent, comp:A.air.components_recent}; }
  A.hazErr = hz.status === 'rejected' ? (hz.reason?.message || 'unavailable') : (hz.value?.error || null);
  return A;
}
/* USGS earthquake catalogue (NASA has no earthquake catalogue; EONET lists none), labelled as USGS in the UI. */
async function usgsQuakes(loc, radiusKm, period){
  const j = await getJSON(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${loc.lat}&longitude=${loc.lon}&maxradiuskm=${radiusKm}&starttime=${period.start}-01-01&endtime=${period.end}-12-31&minmagnitude=4&orderby=magnitude&limit=200`, 15000);
  const f = j.features || [];
  return {count:f.length, maxMag: f.length ? Math.max(...f.map(q => q.properties.mag)) : null,
    all: f.map(q => ({mag:q.properties.mag, time:q.properties.time})),
    list: f.slice(0, 60).map(q => ({mag:q.properties.mag, place:q.properties.place, time:q.properties.time, url:q.properties.url, lat:q.geometry.coordinates[1], lon:q.geometry.coordinates[0],
      dist: Math.round(haversine(loc.lat, loc.lon, q.geometry.coordinates[1], q.geometry.coordinates[0]))}))};
}
/* Previous Open-Meteo / USGS implementation, no longer used for the climate record. */
async function analyzeLegacy(loc, radiusKm, onStep, period){
  const q = `latitude=${loc.lat}&longitude=${loc.lon}`;
  const step = (k, p) => p.then(v => { onStep(k, true); return v; }, e => { onStep(k, false, e); throw e; });
  const era5P = step('era5', getJSON(`https://archive-api.open-meteo.com/v1/archive?${q}&start_date=${period.start}-01-01&end_date=${period.end}-12-31&daily=temperature_2m_mean,temperature_2m_max,precipitation_sum,shortwave_radiation_sum,soil_moisture_0_to_7cm_mean&timezone=UTC`, 40000));
  const cmipP = step('cmip', period.proj ? getJSON(`https://climate-api.open-meteo.com/v1/climate?${q}&start_date=${period.start}-01-01&end_date=${period.end + 5}-12-31&models=${MODELS.join(',')}&daily=temperature_2m_mean`, 20000) : Promise.resolve(null));
  const hazP = step('hazard', Promise.all([
    getJSON(`https://api.open-meteo.com/v1/elevation?${q}`, 12000).catch(() => null),
    getJSON(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${loc.lat}&longitude=${loc.lon}&maxradiuskm=${radiusKm}&starttime=${period.start}-01-01&endtime=${period.end}-12-31&minmagnitude=4&orderby=magnitude&limit=200`, 12000).catch(() => null)
  ]).then(r => { if(!r[0] && !r[1]) throw new Error('hazard sources unavailable'); return r; }));
  const airP = step('air', period.proj ? getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&hourly=pm2_5&past_days=92&forecast_days=0`, 12000) : Promise.resolve(null));
  const imgP = step('img', waybackPair(loc.lat, loc.lon, period));
  const [era5, cmip, haz, air, img] = await Promise.allSettled([era5P, cmipP, hazP, airP, imgP]);
  if(era5.status !== 'fulfilled') throw new Error('The ERA5 climate record could not be loaded' + (era5.reason ? ` (${era5.reason.message})` : '') + '.');
  return buildAnalysis(loc, radiusKm, era5.value, cmip.value, haz.value, air.value, img.value, period);
}

function buildAnalysis(loc, radiusKm, era5, cmip, haz, air, img, period){
  const d = era5.daily, by = {};
  d.time.forEach((t, i) => {
    const y = +t.slice(0,4); const o = by[y] ??= {t:[], tx:[], p:[], sw:[], sm:[]};
    o.t.push(d.temperature_2m_mean[i]); o.tx.push(d.temperature_2m_max[i]); o.p.push(d.precipitation_sum[i]);
    o.sw.push(d.shortwave_radiation_sum[i]); o.sm.push(d.soil_moisture_0_to_7cm_mean[i]);
  });
  const hotBase = period.years.some(y => (by[y]?.tx || []).filter(v => v >= 35).length >= 3) ? 35 : 30;
  const years = period.years.map(y => {
    const o = by[y] || {t:[],tx:[],p:[],sw:[],sm:[]}, pv = o.p.filter(v => v != null);
    return {
      year:y, temp:round(mean(o.t),2), rain: pv.length > 300 ? round(pv.reduce((s,v)=>s+v,0),0) : null,
      hot:o.tx.filter(v => v != null && v >= hotBase).length,
      solar:round(mean(o.sw) == null ? null : mean(o.sw)/3.6, 2), soil:round(mean(o.sm),3)
    };
  });
  const avg = (k, ys) => round(mean(years.filter(r => ys.includes(r.year)).map(r => r[k])), {soil:3, rain:0, hot:1}[k] ?? 2);
  const B = period.baseYears, C = period.curYears;
  const base = {temp:avg('temp',B), rain:avg('rain',B), hot:avg('hot',B), solar:avg('solar',B), soil:avg('soil',B)};
  const cur  = {temp:avg('temp',C), rain:avg('rain',C), hot:avg('hot',C), solar:avg('solar',C), soil:avg('soil',C)};
  const trend = linreg(period.years, years.map(r => r.temp));

  let proj = null;
  if(cmip && cmip.daily){
    const models = {};
    MODELS.forEach(m => {
      const key = `temperature_2m_mean_${m}`, arr = cmip.daily[key]; if(!arr) return;
      const yr = {}; cmip.daily.time.forEach((t,i) => { (yr[+t.slice(0,4)] ??= []).push(arr[i]); });
      const ann = y => mean(yr[y] || []), ref = mean(B.map(ann));
      if(ref == null) return;
      models[m] = period.projYears.map(y => ann(y) == null ? null : round(base.temp + ann(y) - ref, 2));
    });
    const names = Object.keys(models);
    if(names.length){
      const col = i => names.map(n => models[n][i]).filter(v => v != null);
      proj = {models, low:period.projYears.map((_,i) => round(Math.min(...col(i)),2)), mean:period.projYears.map((_,i) => round(mean(col(i)),2)), high:period.projYears.map((_,i) => round(Math.max(...col(i)),2))};
    }
  }
  let elev = null, quakes = null;
  if(haz){
    elev = haz[0]?.elevation?.[0] ?? null;
    const f = haz[1]?.features || [];
    if(haz[1]) quakes = {count:f.length, maxMag: f.length ? Math.max(...f.map(q => q.properties.mag)) : null,
      list: f.slice(0, 25).map(q => ({mag:q.properties.mag, place:q.properties.place, time:q.properties.time, url:q.properties.url,
        dist: Math.round(haversine(loc.lat, loc.lon, q.geometry.coordinates[1], q.geometry.coordinates[0]))}))};
  }
  let aq = null;
  if(air && air.hourly){ const v = mean(air.hourly.pm2_5); if(v != null) aq = {pm25:round(v,1), from:air.hourly.time[0], to:air.hourly.time[air.hourly.time.length-1]}; }
  return {v:3, period, loc, radiusKm, fetchedAt:Date.now(), grid:{lat:era5.latitude, lon:era5.longitude}, hotBase, years, base, cur, trend, proj, elev, quakes, aq, img: img || null};
}
function haversine(a1,o1,a2,o2){ const R=6371, r=Math.PI/180, da=(a2-a1)*r, dO=(o2-o1)*r; const h=Math.sin(da/2)**2+Math.cos(a1*r)*Math.cos(a2*r)*Math.sin(dO/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }

/* ---------- interpretation (pure functions of the analysis) ---------- */
const sgn = (v, d=1) => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d);
const pct = (a, b) => (a == null || b == null || a === 0) ? null : Math.round((b - a) / Math.abs(a) * 100);
function interpret(A){
  const dT = A.cur.temp != null && A.base.temp != null ? round(A.cur.temp - A.base.temp, 1) : null;
  const shortRain = !!A.rainN && (A.rainN.cur < 2 || A.rainN.base < 3);   // too few complete rain years to compare windows
  const dryRain = A.base.rain != null && A.base.rain < 20, dRain = dryRain ? null : pct(A.base.rain, A.cur.rain), drySoil = A.base.soil != null && A.base.soil < 0.05, dSoil = drySoil ? null : pct(A.base.soil, A.cur.soil);
  const dHot = A.cur.hot != null && A.base.hot != null ? round(A.cur.hot - A.base.hot, 1) : null;
  const flags = [];
  if(dT != null && dT >= 0.5) flags.push({k:'climate', t:`Warming ${sgn(dT)} °C`});
  if(dRain != null && !shortRain && dRain <= -15) flags.push({k:'water', t:`Rainfall ${sgn(dRain,0)}% vs baseline (short windows, check the long-term trend)`});
  if(dRain != null && !shortRain && dRain >= 20) flags.push({k:'water', t:`Rainfall ${sgn(dRain,0)}% (flood review)`});
  if(dHot != null && dHot >= 5) flags.push({k:'land', t:`Hot days ${sgn(dHot,0)}/yr`});
  if(A.elev != null && A.elev > 0 && A.elev < 10) flags.push({k:'hazard', t:`Low-lying (${Math.round(A.elev)} m)`});
  if(A.quakes && (A.quakes.maxMag >= 5.5 || A.quakes.count >= 10)) flags.push({k:'hazard', t:`Seismic: ${A.quakes.count} M4+ in ${per(A).label} (max M${A.quakes.maxMag.toFixed(1)})`});
  if(A.eonet){ const b = A.eonet.byCat;
    if(b.severeStorms.length >= 3) flags.push({k:'hazard', t:`Severe storms: ${b.severeStorms.length} tracks within ${A.radiusKm} km`});
    if(b.volcanoes.length) flags.push({k:'hazard', t:`Volcanic activity reported within ${A.radiusKm} km`}); }
  if(A.aq && A.aq.pm25 > 35) flags.push({k:'hazard', t:`PM2.5 ${A.aq.pm25} µg/m³`});
  const climateFlags = flags.filter(f => f.k !== 'hazard'), hazardFlags = flags.filter(f => f.k === 'hazard');
  const status = [
    (dT != null && Math.abs(dT) >= 0.5) || A.trend?.sig ? 'finding' : 'monitoring',
    dRain != null && !shortRain && Math.abs(dRain) >= 10 ? 'finding' : 'monitoring',
    (dSoil != null && Math.abs(dSoil) >= 10) || (dHot != null && Math.abs(dHot) >= 5) ? 'finding' : 'monitoring',
    hazardFlags.length ? 'review' : 'monitoring'
  ];
  const solar = A.cur.solar ?? A.base.solar;
  const hi = {
    solar: solar == null ? ['Unavailable','na',''] : solar >= 5 ? ['High solar resource','good',`${solar.toFixed(1)} kWh/m²/day`] : solar >= 4 ? ['Moderate solar resource','neutral',`${solar.toFixed(1)} kWh/m²/day`] : ['Low solar resource','na',`${solar.toFixed(1)} kWh/m²/day`],
    climate: climateFlags.length ? ['Review recommended','warn',`${climateFlags.length} climate signal${climateFlags.length>1?'s':''}`] : ['No climate flags','good',`vs ${per(A).baseLabel} baseline`],
    air: !A.aq ? ['Not loaded yet','na','NASA air data not loaded'] : A.aq.pm25 <= 15 ? ['Good air quality','good',`PM2.5 ${A.aq.pm25} µg/m³`] : A.aq.pm25 <= 35 ? ['Moderate air quality','warn',`PM2.5 ${A.aq.pm25} µg/m³`] : ['Poor air quality','warn',`PM2.5 ${A.aq.pm25} µg/m³`]
  };
  return {dT, dRain, dryRain, shortRain, dSoil, drySoil, dHot, flags, climateFlags, hazardFlags, status, hi};
}

/* ---------- state ---------- */
const S = {page:'splash', state:'idle', loc:PRESETS[0], A:null, I:null, H:null, scenario:'mean', hazard:0, token:0, riskTok:0, user:null, view:'basic', pending:null};
const announce = t => { $('#announce').textContent = t; };
let toastT; function toast(t){ const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3000); }
function setState(s){ S.state = s; document.body.dataset.state = s; updateGlobe(); }
const fmtLat = v => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? 'N' : 'S'}`;
const fmtLon = v => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? 'E' : 'W'}`;
const ago = t => { const m = Math.round((Date.now() - t)/60000); return m < 2 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m/60)} h ago` : `${Math.round(m/1440)} d ago`; };

/* ---------- dashboard view (Basic / Advanced / Playful) ---------- */
function setView(v, persist = true){
  S.view = v; document.body.dataset.view = v;
  $$('[data-setview]').forEach(b => b.setAttribute('aria-pressed', b.dataset.setview === v));
  if(persist) store.set('es:view', v);
  if(S.A) requestAnimationFrame(() => { renderView(v); refreshMosaics(); });
}

/* ---------- globe ---------- */
let world = null;
function hasWebGL(){ try{ const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }catch{ return false; } }
function reticleEl(){ const d = document.createElement('div'); d.className = 'reticle'; d.innerHTML = '<svg viewBox="0 0 64 64"><g class="spin"><path d="M4 18V4h14M46 4h14v14M60 46v14H46M18 60H4V46"/></g><circle cx="32" cy="32" r="12"/><circle cx="32" cy="32" r="3.5" fill="currentColor"/><path d="M32 14v8M32 42v8M14 32h8M42 32h8"/></svg>'; return d; }
const globeLabels = () => { const seen = new Set(); return [...PRESETS, ...favs()].filter(l => !seen.has(l.id) && seen.add(l.id)); };
function initGlobe(){
  if(typeof Globe !== 'function' || !hasWebGL()){ document.body.classList.add('no-webgl'); return; }
  try{
    world = Globe({animateIn:false})($('#globe'))
      .backgroundColor('rgba(0,0,0,0)').globeImageUrl(TEX.night).bumpImageUrl(TEX.topo)
      .showAtmosphere(true).atmosphereColor('#3fd8ff').atmosphereAltitude(0.2)
      .labelsData(globeLabels()).labelLat('lat').labelLng('lon').labelText('short')
      .labelSize(0.9).labelDotRadius(0.42).labelAltitude(0.012).labelResolution(3).labelColor(() => 'rgba(234,248,255,0.92)')
      .onLabelClick(d => { if(S.page === 'home') select(d); })
      .onGlobeClick(({lat, lng}) => { if(Number.isFinite(lat) && Number.isFinite(lng) && S.page === 'home' && (S.state === 'idle' || S.state === 'selected')) selectPoint(lat, lng); })
      .ringsData([]).ringLat('lat').ringLng('lon').ringColor(() => t => `rgba(34,211,238,${1-t})`).ringMaxRadius(4.5).ringPropagationSpeed(2.4).ringRepeatPeriod(900)
      .htmlElementsData([]).htmlLat('lat').htmlLng('lon').htmlAltitude(0.01).htmlElement(() => reticleEl());
    const c = world.controls(); c.autoRotateSpeed = 0.45; c.enableDamping = true;
    c.addEventListener('start', () => { c.autoRotate = false; });
    sizeGlobe();
  }catch(e){ console.error(e); document.body.classList.add('no-webgl'); world = null; }
}
function sizeGlobe(){ if(!world) return; const st = $('#stage'); world.width(st.clientWidth).height(st.clientHeight); }
function updateGlobe(instant){
  if(!world) return;
  const c = world.controls(), l = S.loc, dur = instant ? 0 : 1100;
  if(S.state === 'idle' || S.state === 'intro'){
    world.ringsData([]).htmlElementsData([]).labelsData(globeLabels()); c.autoRotate = !REDUCED;
    world.pointOfView({lat:22, lng:l ? l.lon - 20 : 20, altitude:2.5}, dur);
  } else {
    c.autoRotate = false;
    world.ringsData([l]).htmlElementsData([l]).labelsData(S.state === 'selected' ? globeLabels().filter(p => p.id !== l.id) : []);
    world.pointOfView({lat:l.lat, lng:l.lon, altitude:S.state === 'selected' ? 1.9 : 1.42}, dur);
  }
  globeInteractive();
}
/* the globe can be turned and zoomed only while choosing a place on the home page; after a scan it stays fixed on the target */
function globeInteractive(){
  if(!world) return;
  const c = world.controls(), on = S.page === 'home' && (S.state === 'idle' || S.state === 'selected' || S.state === 'intro');
  c.enableRotate = on; c.enableZoom = on; c.enablePan = false;
  $('#globe').classList.toggle('is-locked', !on);
}
/* "Scan another place": back to the globe with nothing selected */
function newScan(){
  S.token++; S.riskTok++; setPage('home'); setState('idle');
  announce('Pick a new place on the globe or search for one, then scan it.');
}

/* ---------- imagery mosaics ---------- */
function tileXY(lat, lon, z){ const n = 2**z, r = Math.max(-85, Math.min(85, lat))*Math.PI/180; return {x:(lon+180)/360*n, y:(1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n}; }
function renderMosaic(el){
  const l = S.loc; if(!l) return;
  const w = el.clientWidth, h = el.clientHeight; if(!w || !h) return;
  const src = el.dataset.src, img = S.A?.img, z = +el.dataset.z;
  let rel = null;
  if(src === 'before') rel = img?.before?.id; else if(src === 'after') rel = img?.after?.id;
  if((src === 'before' || src === 'after') && S.A?.loc.id !== l.id) return;
  const key = `${l.lat},${l.lon},${z},${w},${h},${rel}`; if(el.dataset.key === key) return; el.dataset.key = key;
  const {x, y} = tileXY(l.lat, l.lon, z), T = 256, n = 2**z;
  const x0 = Math.floor(x-w/2/T), x1 = Math.floor(x+w/2/T), y0 = Math.max(0, Math.floor(y-h/2/T)), y1 = Math.min(n-1, Math.floor(y+h/2/T));
  const frag = document.createDocumentFragment();
  for(let ty = y0; ty <= y1; ty++) for(let tx = x0; tx <= x1; tx++){
    const im = new Image(); im.alt = ''; im.decoding = 'async'; im.draggable = false;
    const wx = ((tx % n) + n) % n; im.src = rel ? WAYBACK(rel, z, ty, wx) : ESRI(z, ty, wx);
    im.style.left = ((tx-x)*T + w/2) + 'px'; im.style.top = ((ty-y)*T + h/2) + 'px'; frag.appendChild(im);
  }
  el.replaceChildren(frag);
}
const mosaics = $$('.mosaic');
const ro = new ResizeObserver(es => es.forEach(e => {
  if(e.target.id === 'stage') sizeGlobe(); else renderMosaic(e.target);
}));
mosaics.forEach(m => ro.observe(m)); ro.observe($('#stage'));
const refreshMosaics = () => mosaics.forEach(m => { delete m.dataset.key; renderMosaic(m); });

/* ---------- hazard towers (Risk Monitoring) ---------- */
const HAZARDS = [
  {id:'quake', code:'T-01', name:'Seismic & Volcanic Tower', hazard:'Earthquakes and volcanoes', icon:'quake', src:'USGS Earthquake Catalog (M4+) and NASA EONET volcano reports, study period'},
  {id:'heat', code:'T-02', name:'Heat Tower', hazard:'Extreme heat', icon:'sun', src:'NASA POWER (MERRA-2) temperature'},
  {id:'drought', code:'T-03', name:'Drought Tower', hazard:'Drought', icon:'soil', src:'NASA POWER soil wetness and NASA GPM IMERG rainfall'},
  {id:'flood', code:'T-04', name:'Storm & Flood Tower', hazard:'Floods, storms and landslides', icon:'drop', src:'NASA GPM IMERG rainfall change and NASA EONET flood, storm and landslide events (GDACS, NOAA NHC, JTWC)'},
  {id:'dust', code:'T-05', name:'Air Quality Tower', hazard:'Air quality (fine particles)', icon:'wind', src:'NASA MERRA-2 aerosol diagnostics (PM2.5 from dust, sea salt, black carbon, organic carbon and sulfate)'},
  {id:'sea', code:'T-06', name:'Sea-Level Tower', hazard:'Sea-level rise', icon:'waves', src:'NASA-SSH satellite altimetry (reference missions), 0.5 degree grid'}
];
const LEVEL = {low:['Low','#36E2B1'], moderate:['Moderate','#FFBE55'], high:['High','#FF6178'], na:['No data','#91AEC2'], scanning:['Scanning','#22D3EE']};
const clamp = (v, a=0, b=100) => Math.max(a, Math.min(b, v));
function airTower(Ar){
  const last5 = Ar.annual.slice(-5), rec = mean(last5), all = mean(Ar.annual), tr = Ar.trend_per_decade, c = Ar.components_recent;
  const parts = [['Dust', c.dust], ['Sulfate', c.so4], ['Organic carbon', c.oc], ['Sea salt', c.salt], ['Black carbon', c.bc]].sort((a, b) => b[1] - a[1]);
  const top = parts[0];
  return {
    level:rec >= 35 ? 'high' : rec >= 15 ? 'moderate' : 'low', score:Math.round(clamp(rec / 35 * 100)),
    headline:`Fine particles (PM2.5) average ${rec.toFixed(1)} µg/m³ (last ${last5.length} years)`,
    explain:`Total fine particles in the air near the ground, from NASA MERRA-2: dust, sea salt, black carbon, organic carbon and sulfate added together (the formula NASA's modelling office publishes). The biggest part here is ${top[0].toLowerCase()} (${top[1].toFixed(1)} µg/m³). Moderate at 15 µg/m³ and high at 35 µg/m³ as a yearly mean, the WHO 2021 interim targets 3 and 1 (the WHO guideline itself is 5). It is modelled and assimilated data on a 50 km grid: it shows the regional air, not a street-level or city-centre reading, and it has no gases such as NO₂ or ozone.`,
    metrics:[[`Last ${last5.length} years`, rec.toFixed(1) + ' µg/m³'], [`Long-term mean (${Ar.years[0]}–${Ar.years[Ar.years.length - 1]})`, all.toFixed(1) + ' µg/m³'], ['Trend', tr == null ? 'n/a' : `${sgn(tr, 2)} µg/m³ per decade${Ar.significant ? '' : ' (not significant)'}`],
      ['Made of', parts.map(x => `${x[0]} ${x[1].toFixed(1)}`).join(' · ')], ['Aerosol optical depth', Ar.aod_recent == null ? 'n/a' : Ar.aod_recent.toFixed(2)]], items:[]};
}
function dustSeaTowers(dust, sea, hzNote, air){
  const H = {};
  const D = dust;
  if(air?.annual?.length >= 8) H.dust = airTower(air);
  else if(!D || !D.annual?.length) H.dust = {level:'na', score:0, headline:'NASA dust data unavailable', explain:`The NASA MERRA-2 aerosol series could not be loaded for this point${hzNote}.`, metrics:[], items:[]};
  else {
    const last5 = D.annual.slice(-5), rec = mean(last5), all = mean(D.annual), tr = D.trend_per_decade;
    H.dust = {
      level:rec >= 25 ? 'high' : rec >= 10 ? 'moderate' : 'low', score:Math.round(clamp(rec / 25 * 100)),
      headline:`Natural dust PM2.5 averages ${rec.toFixed(1)} µg/m³ (last ${last5.length} years)`,
      explain:'Surface concentration of fine windblown dust (PM2.5) from NASA MERRA-2. Dust is the natural part of airborne particles: smoke, traffic and industry are not counted. Moderate at 10 µg/m³ and high at 25 µg/m³ as an annual mean (screening thresholds for this tool). It is modelled and assimilated data on a 50 km grid, not a ground measurement.',
      metrics:[[`Last ${last5.length} years`, rec.toFixed(1) + ' µg/m³'], [`Long-term mean (${D.years[0]}–${D.years[D.years.length - 1]})`, all.toFixed(1) + ' µg/m³'], ['Trend', tr == null ? 'n/a' : `${sgn(tr, 2)} µg/m³ per decade${D.significant ? '' : ' (not significant)'}`]], items:[]};
  }
  const Sx = sea;
  if(!Sx) H.sea = {level:'na', score:0, headline:'NASA sea-level data unavailable', explain:`The NASA-SSH altimetry series could not be loaded for this point${hzNote}.`, metrics:[], items:[]};
  else if(Sx.available && Sx.distance_km > 50) H.sea = {level:'na', score:0, headline:'Not coastal, no open ocean nearby', explain:`The nearest NASA-SSH open-ocean cell is ${Sx.distance_km} km away, too far to say anything about sea level at this location. This tower is not rated here.`, metrics:[], items:[]};
  else if(!Sx.available) H.sea = {level:'na', score:0, headline:/Inland/.test(Sx.reason || '') ? 'Inland location, no open ocean nearby' : 'Sea-level data unavailable', explain:(Sx.reason || 'No altimetry data.') + ' Satellite altimetry only covers the open ocean, so this tower is not rated here.', metrics:[], items:[]};
  else {
    const tr = Sx.trend_mm_per_year, ar = Sx.annual_mm, rise = ar.length >= 6 ? mean(ar.slice(-3)) - mean(ar.slice(0, 3)) : null;
    H.sea = tr == null ? {level:'na', score:0, headline:'Sea-level trend not available', explain:'Too few complete years to fit a sea-level trend.', metrics:[], items:[]} : {
      level:(Sx.significant && tr >= 5) ? 'high' : (Sx.significant && tr >= 3) ? 'moderate' : 'low', score:Math.round(clamp(tr / 6 * 100)),
      headline:`Sea level near here ${tr >= 0 ? 'is rising' : 'is falling'} ${Math.abs(tr).toFixed(1)} mm/yr (${Sx.years[0]}–${Sx.years[Sx.years.length - 1]})`,
      explain:`Absolute sea-level trend from NASA satellite altimetry (NASA-SSH, 0.5° grid) at the nearest open-ocean cell, ${Sx.distance_km} km from the target. It does not include land sinking or rising (for example river deltas), which can make the local rise larger or smaller. Moderate at 3 mm/yr and high at 5 mm/yr when statistically significant (screening thresholds for this tool).`,
      metrics:[['Trend', `${sgn(tr, 1)} mm/yr${Sx.significant ? '' : ' (not significant)'}`], ['Change over record', rise == null ? 'n/a' : `${sgn(rise, 0)} mm`], ['Ocean cell', `${Sx.grid_lat.toFixed(2)}, ${Sx.grid_lon.toFixed(2)} (${Sx.distance_km} km)`]], items:[]};
  }
  return H;
}
function hazardReadings(A, I){
  const q = A.quakes, H = {};
  const mq = q ? q.maxMag : null;
  H.quake = !q ? {level:'na', score:0, headline:'USGS data unavailable', explain:'The USGS catalogue could not be reached during this scan.', metrics:[], items:[]} : {
    level:(mq >= 6.5 || q.count >= 30) ? 'high' : (mq >= 5.5 || q.count >= 10) ? 'moderate' : 'low',
    score:Math.round(clamp(Math.max(q.count / 30, Math.max(0, (mq || 4) - 4) / 2.5) * 100)),
    headline:q.count ? `${q.count} earthquake${q.count > 1 ? 's' : ''} of M4+ in ${per(A).label}` : `No M4+ earthquakes in ${per(A).label}`,
    explain:`Counted within ${A.radiusKm} km of the target. Rated moderate when the largest event reaches M5.5 or there are 10 or more events, and high at M6.5 or 30 or more.`,
    metrics:[['Events M4+', q.count], ['Largest', mq != null ? 'M' + mq.toFixed(1) : '—'], ['Search radius', A.radiusKm + ' km']],
    items:q.list.slice(0, 6).map(e => ({title:`M${e.mag.toFixed(1)} · ${e.place || 'Unknown location'}`, meta:`${new Date(e.time).toISOString().slice(0,10)} · ${e.dist} km away`, url:e.url, tag:'USGS'}))};
  const dT = I.dT, dHot = I.dHot;
  H.heat = (dT == null && dHot == null) ? {level:'na', score:0, headline:'No temperature record', explain:'NASA POWER temperatures were not available.', metrics:[], items:[]} : {
    level:((dHot ?? 0) >= 15 || (dT ?? 0) >= 1) ? 'high' : ((dHot ?? 0) >= 5 || (dT ?? 0) >= 0.5) ? 'moderate' : 'low',
    score:Math.round(clamp(Math.max((dHot ?? 0) / 15, (dT ?? 0) / 1) * 100)),
    headline:dT != null && dT >= 0.3 ? `Warming ${sgn(dT)} °C vs ${per(A).baseLabel}` : 'No strong warming signal',
    explain:`Compares ${per(A).curLabel} with the ${per(A).baseLabel} baseline. Rated moderate at +0.5 °C or +5 hot days a year, and high at +1 °C or +15 hot days (a hot day is ${A.hotBase} °C or more).`,
    metrics:[['Temperature change', sgn(dT) + ' °C'], ...(A.base.hot != null ? [[`Days ≥ ${A.hotBase} °C`, `${A.base.hot} → ${A.cur.hot ?? '—'} / yr`]] : []), ['Long-term trend', (() => { const sr = dvSeries(A, 'temp'), vd = sr && dvVerdict(sr); return vd ? `${dvSgn(vd.t.slope * 10, 2)} °C per decade (${sr.years[0]}–${sr.years[sr.years.length - 1]})` : 'n/a'; })()]], items:[]};
  const dr = I.dRain, ds = I.drySoil ? null : I.dSoil, arid = A.base.rain != null && A.base.rain < 150;
  H.drought = (dr == null && ds == null) ? {level:'na', score:0, headline:'No rainfall record', explain:'NASA POWER soil wetness and NASA GPM IMERG rainfall were not available.', metrics:[], items:[]} : {
    level:((dr ?? 0) <= -25 || (ds ?? 0) <= -25) ? 'high' : ((dr ?? 0) <= -15 || (ds ?? 0) <= -15) ? 'moderate' : 'low',
    score:Math.round(clamp(Math.max(-(dr ?? 0) / 25, -(ds ?? 0) / 25) * 100)),
    headline:dr != null && dr <= -10 ? `Rainfall down ${Math.abs(dr)}%` : 'Rainfall close to normal',
    explain:`Looks for falling rainfall or soil moisture compared with ${per(A).baseLabel}. Rated moderate below −15% and high below −25%.${arid ? ' This is a very dry region, so small changes in millimetres can look large in percent.' : ''}`,
    metrics:[['Rainfall change', dr == null ? (I.dryRain ? 'Hyper-arid' : 'n/a') : sgn(dr, 0) + '%'], ['Annual rain', `${A.base.rain ?? '—'} → ${A.cur.rain ?? '—'} mm`], ['Soil moisture', I.drySoil ? 'Very dry' : ds == null ? 'n/a' : sgn(ds, 0) + '%']], items:[]};
  const low = A.elev != null && A.elev < 10;
  H.flood = dr == null ? {level:'na', score:0, headline:'No rainfall record', explain:'NASA GPM IMERG rainfall was not available.', metrics:[], items:[]} : {
    level:(dr >= 40 || (dr >= 20 && low)) ? 'high' : (dr >= 20 || (low && dr >= 10)) ? 'moderate' : 'low',
    score:Math.round(clamp((Math.max(dr, 0) / 40) * 100 + (low ? 15 : 0))),
    headline:dr >= 20 ? `Rainfall up ${dr}%` : low ? 'Low ground, rainfall steady' : 'No flood signal',
    explain:'Looks for rising rainfall, made more serious on low ground. Moderate at +20%, high at +40%, or +20% on land below 10 m.',
    metrics:[['Rainfall change', sgn(dr, 0) + '%'], ['Elevation', A.elev != null ? Math.round(A.elev) + ' m' : 'n/a'], ['Annual rain', `${A.base.rain ?? '—'} → ${A.cur.rain ?? '—'} mm`]], items:[]};
  const eo = A.eonet, EV = k => eo ? (eo.byCat[k] || []) : null;
  const items = (list, tag) => list.slice(0, 6).map(e => ({title:e.title, meta:`${e.date} · ${e.dist} km away${e.mag ? ' · ' + e.mag : ''}`, url:e.url, tag}));
  const trunc = eo && eo.truncated ? ' (list truncated at 1000 events, true count is higher)' : '';
  const hzNote = A.hazErr ? ` (${A.hazErr})` : '';
  Object.assign(H, dustSeaTowers(A.dust, A.sea, hzNote, A.air));
  /* fold NASA EONET events into the towers they belong to */
  const RANK = {na:0, low:1, moderate:2, high:3};
  const fold = (r, lv, score, head, its, metric, note) => {
    const was = r.level === 'na';
    if(RANK[lv] > RANK[r.level]) r.level = lv;
    r.score = Math.max(r.score, Math.round(score));
    const neutral = was || /^No /.test(r.headline);
    r.headline = neutral ? head : `${r.headline}; ${head}`;
    r.explain = was ? note : `${r.explain} ${note}`;
    r.metrics = [...r.metrics, metric]; r.items = [...its, ...r.items];
  };
  const vol = EV('volcanoes') || [];
  if(vol.length) fold(H.quake, vol.length >= 5 ? 'high' : 'moderate', clamp(vol.length / 5 * 100), `${vol.length} volcanic activity report${vol.length > 1 ? 's' : ''} within ${A.radiusKm} km`, items(vol, 'NASA EONET'), ['Volcano reports (EONET)', vol.length], 'Volcano reports come from NASA EONET (Smithsonian, GDACS and others); moderate with any report, high with 5 or more.');
  const wet = [...(EV('floods') || []), ...(EV('landslides') || []), ...(EV('severeStorms') || [])].sort((a, b) => b.date.localeCompare(a.date));
  if(wet.length) fold(H.flood, wet.length >= 15 ? 'high' : wet.length >= 5 ? 'moderate' : 'low', clamp(wet.length / 15 * 100), `${wet.length} flood, storm or landslide event${wet.length > 1 ? 's' : ''} listed within ${A.radiusKm} km`, items(wet, 'NASA EONET'), ['Flood/storm/landslide events (EONET)', wet.length], 'Flood, storm and landslide events come from NASA EONET (GDACS, NOAA NHC, JTWC; notable events only, best coverage in North America and for tropical cyclones); moderate at 5 events, high at 15.');
  return H;
}
const levelsOf = H => HAZARDS.map(h => H[h.id].level);

const RT = [{x:120,y:215},{x:150,y:370},{x:120,y:520},{x:680,y:215},{x:650,y:370},{x:680,y:520}];
const RTGT = {x:400, y:350}, RS = .8;
function drawTowers(svg, defs, levels, pre, pick, sel){
  let beams = '', towers = '', chips = '';
  RT.forEach((t, i) => {
    const lv = levels[i], col = LEVEL[lv][1], dx = t.x, dy = t.y - 94*RS, vx = RTGT.x - dx, vy = RTGT.y - dy, L = Math.hypot(vx, vy), px = -vy/L*16, py = vx/L*16;
    const dim = lv === 'na' ? ' is-na' : '';
    beams += `<linearGradient id="${pre}bg${i}" gradientUnits="userSpaceOnUse" x1="${dx}" y1="${dy}" x2="${RTGT.x}" y2="${RTGT.y}"><stop offset="0" stop-color="${col}" stop-opacity=".8"/><stop offset="1" stop-color="${col}" stop-opacity=".06"/></linearGradient><polygon class="beam${dim}" data-i="${i}" style="animation-delay:${i*.3}s" points="${dx},${dy} ${RTGT.x+px},${RTGT.y+py} ${RTGT.x-px},${RTGT.y-py}" fill="url(#${pre}bg${i})"/>`;
    towers += `<g class="tower-g" data-i="${i}" tabindex="0" role="button" aria-label="${defs[i].name}: ${LEVEL[lv][0]}"><title>${defs[i].code} ${defs[i].name}</title><use href="#tower" x="${t.x - 40*RS}" y="${t.y - 140*RS}" width="${80*RS}" height="${140*RS}"/><text x="${t.x}" y="${t.y + 18}" text-anchor="middle" fill="#EAF8FF" font-family="Inter, sans-serif" font-weight="600" font-size="13">${defs[i].hazard}</text></g>`;
    const side = i < 3 ? 1 : -1, cw = 104, chx = side > 0 ? t.x + 24*RS : t.x - 24*RS - cw, chy = t.y - 140*RS - 8;
    chips += `<g class="rchip" data-i="${i}"><rect x="${chx}" y="${chy}" width="${cw}" height="40" rx="8" fill="rgba(6,17,31,.92)" stroke="${col}" stroke-opacity=".7"/><text x="${chx+11}" y="${chy+17}" fill="#EAF8FF" font-family="Bricolage Grotesque, Sora, sans-serif" font-weight="600" font-size="13">${defs[i].code}</text><circle cx="${chx+14}" cy="${chy+29}" r="3.4" fill="${col}"/><text x="${chx+23}" y="${chy+32.5}" fill="${col}" font-family="Inter, sans-serif" font-weight="700" font-size="11">${LEVEL[lv][0]}</text></g>`;
  });
  const T = RTGT;
  svg.innerHTML = `<defs><radialGradient id="${pre}tgt"><stop offset="0" stop-color="#22D3EE" stop-opacity=".55"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></radialGradient></defs>
    <circle cx="${T.x}" cy="${T.y}" r="110" fill="url(#${pre}tgt)"/>${beams}
    <g fill="none" stroke="#22D3EE"><circle class="pulse-ring" cx="${T.x}" cy="${T.y}" r="30" stroke-width="2"/><g class="target-rings"><circle cx="${T.x}" cy="${T.y}" r="62" stroke-width="1.2" stroke-dasharray="6 8" opacity=".8"/><circle cx="${T.x}" cy="${T.y}" r="86" stroke-width="1" stroke-dasharray="2 10" opacity=".6"/></g><circle cx="${T.x}" cy="${T.y}" r="38" stroke-width="1.6" opacity=".9"/><circle cx="${T.x}" cy="${T.y}" r="16" stroke-width="2.2" filter="url(#glow)"/></g>
    <circle cx="${T.x}" cy="${T.y}" r="5.5" fill="#EAF8FF" filter="url(#glow)"/>${towers}${chips}`;
  svg.querySelectorAll('.tower-g').forEach(g => { const f = () => pick(+g.dataset.i); g.addEventListener('click', f); g.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); f(); } }); });
  highlightTowers(svg, sel);
}
function highlightTowers(svg, i){
  svg.querySelectorAll('.tower-g').forEach(g => { g.classList.toggle('is-hl', +g.dataset.i === i); g.classList.toggle('is-dim', +g.dataset.i !== i); });
  svg.querySelectorAll('.beam').forEach(b => b.classList.toggle('is-dim', +b.dataset.i !== i));
}
function renderRiskStage(levels){ drawTowers($('#riskSvg'), HAZARDS, levels, 'r', selectHazard, S.hazard); }
function applyHazardHighlight(){
  highlightTowers($('#riskSvg'), S.hazard);
  $$('#towerList .gl-row').forEach(b => b.setAttribute('aria-pressed', +b.dataset.i === S.hazard));
}
function selectHazard(i){ S.hazard = i; applyHazardHighlight(); renderTowerDetail(); }
function renderTowerList(levels){
  $('#towerList').innerHTML = glanceHtml(HAZARDS, S.H, levels, S.hazard, LEVEL, ic, S.A);
  $$('#towerList .gl-row').forEach(b => b.addEventListener('click', () => selectHazard(+b.dataset.i)));
  const n = k => levels.filter(l => l === k).length;
  const top = levels.includes('scanning') ? null : topConcern(HAZARDS, S.H, levels);
  $('#riskTop').innerHTML = !top ? '' : top.r.score < 34 && top.lv === 'low'
    ? callout(ic, 'ok', 'Top concern', '<b>No hazard stands out here.</b> All towers read low in this screening.')
    : callout(ic, top.lv === 'high' ? 'warn' : 'key', 'Top concern', `<b>${esc(top.h.hazard)}</b>: ${esc(top.r.headline)}.`, top.h.icon);
  $('#riskCounts').innerHTML = levels.includes('scanning') ? '<span class="lvl lvl-scanning">Scanning…</span>' : `<span class="lvl lvl-high">${n('high')} high</span><span class="lvl lvl-moderate">${n('moderate')} moderate</span><span class="lvl lvl-low">${n('low')} low</span>${n('na') ? `<span class="lvl lvl-na">${n('na')} no data</span>` : ''}`;
}
function renderTowerDetail(){
  if(!S.H) return;
  const h = HAZARDS[S.hazard], r = S.H[h.id], lv = LEVEL[r.level], tr = hazardTrend(S.A, h.id);
  let viz = {charts:[], analysis:[], note:''}, figs = '', tips = {};
  try{
    const pd = per(S.A); viz = towerViz(h.id, S.A, {years:pd.years, baseLabel:pd.baseLabel, curLabel:pd.curLabel});
    figs = viz.charts.map((c, i) => { const o = renderHzChart(c, `${h.id}${i}`); tips[`${h.id}${i}`] = o.tips; return o.html; }).join('');
  }catch(e){ console.warn('hazard charts', e); }
  const stamp = tr ? `<p class="stamp ${tr.vd.level === 'real' ? 'lv-real' : tr.vd.level === 'maybe' ? 'lv-maybe' : 'lv-none'}" title="Mann-Kendall test, ${tr.years}">${esc(tr.text)}</p>` : '';
  const el = $('#towerDetail');
  el.innerHTML = `<header class="rd-h"><span class="td-ic" style="color:${lv[1]}">${ic(h.icon)}</span><div class="grow"><p class="td-code">${h.code} · ${esc(h.name)}</p><h2>${esc(HZ_Q[h.id])}</h2></div><span class="lvl lvl-${r.level}">${lv[0]}</span></header>
    <div class="rd-sum"><div><p class="td-head">${esc(r.headline)}</p>${stamp}<div class="meter" role="img" aria-label="Risk score ${r.score} out of 100"><span style="width:${r.score}%;background:${lv[1]}"></span></div><small class="muted">Risk score ${r.score} / 100</small></div>
      ${r.metrics.length ? `<div class="kv">${r.metrics.map(m => `<div><span>${esc(m[0])}</span><b>${esc(m[1])}</b></div>`).join('')}</div>` : ''}</div>
    ${r.level !== 'na' && HZ_TIPS[h.id] ? callout(ic, 'tip', 'What you can do', esc(r.level === 'low' ? HZ_TIPS[h.id].lo : HZ_TIPS[h.id].hi)) : ''}
    ${viz.charts.length ? `<div class="hz-grid n${Math.min(viz.charts.length, 2)}">${figs}${viz.analysis.length ? `<section class="hz-card hz-ana"><h4>What the data says</h4><ul class="hz-analysis">${viz.analysis.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}</div>` : (r.level === 'na' ? '' : '<p class="td-exp">No chart is available for this tower with the data loaded.</p>')}
    <div class="rd-more"><details><summary>How is this rated?</summary><p class="td-exp">${esc(r.explain)}</p>${viz.note ? `<p class="td-exp">${esc(viz.note)}</p>` : ''}</details>
    ${r.items.length ? `<details><summary>Recent events (${r.items.length})</summary><ul class="list">${r.items.map(e => `<li><div class="grow"><b>${esc(e.title)}</b><span>${esc(e.meta)}</span></div>${e.url ? `<a class="link-btn" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.tag || 'USGS')}</a>` : ''}</li>`).join('')}</ul></details>` : ''}</div>
    <p class="td-src">Source: ${esc(h.src)}. Screening only, not an official hazard warning.</p>`;
  wireHzCharts(el, tips);
}
function renderRisk(){
  const has = !!S.A;
  $('#riskWrap').hidden = !has; $('#riskEmpty').hidden = has;
  if(!has) return;
  $('#riskSub').textContent = `${S.loc.name}, ${S.A.radiusKm} km around, ${per(S.A).label}. Six towers, one per natural hazard.`;
  refreshMosaics();
  try{ $('#riskCal').innerHTML = calendarHtml(S.A); }catch(e){ console.warn('calendar', e); }
  try{ const m = eventsMapHtml(S.A); $('#riskEvents').innerHTML = m.html; $('#mapCount').textContent = `${m.n} event${m.n === 1 ? '' : 's'}`; }catch(e){ console.warn('map', e); }
  const tok = ++S.riskTok, final = levelsOf(S.H), cur = HAZARDS.map(() => 'scanning');
  renderRiskStage(cur); renderTowerList(cur); renderTowerDetail();
  HAZARDS.forEach((_, i) => setTimeout(() => { if(tok !== S.riskTok || S.page !== 'risk') return; cur[i] = final[i]; renderRiskStage(cur); renderTowerList(cur); }, REDUCED ? 0 : 400 + i*300));
  announce('Risk towers are scanning ' + S.loc.name);
}

/* ---------- dashboard ---------- */
function renderDashboardCore(){
  const A = S.A; S.I = interpret(A);
  { const pd = per(A); $('#baBeforeT').textContent = `Baseline ${pd.baseLabel}`; $('#baAfterT').textContent = `Current ${pd.curLabel}`; $('#baRange').textContent = `${pd.baseLabel} avg vs ${pd.curLabel} avg`; }
  $('#baBeforeVals').textContent = `${A.base.temp?.toFixed(1) ?? '—'} °C · ${A.base.rain ?? '—'} mm/yr`;
  $('#baAfterVals').textContent = `${A.cur.temp?.toFixed(1) ?? '—'} °C · ${A.cur.rain ?? '—'} mm/yr`;
  $('#baBeforeDate').textContent = A.img?.before ? `Imagery ${A.img.before.date}` : 'Current imagery';
  $('#baAfterDate').textContent = A.img?.after ? `Imagery ${A.img.after.date}` : 'Current imagery';
  $('#baNote').textContent = A.img ? (A.img.same ? 'No newer Wayback imagery for this tile in the chosen period, so both panels show the same capture. Climate: NASA POWER.' : 'Imagery: Esri World Imagery Wayback (release dates; capture may be earlier). Climate: NASA POWER.') : 'Historical imagery unavailable, showing current imagery. Climate: NASA POWER.';
  renderNasaPanel();
  const ageMin = Math.round((Date.now() - A.fetchedAt)/60000);
  $('#sbChip span').textContent = ageMin < 2 ? 'Data ready' : `Cached · ${ageMin < 60 ? ageMin+' min' : Math.round(ageMin/60)+' h'} ago`;
  $('#sbSrc').textContent = A.nasa ? 'NASA POWER' : 'ERA5';
  $('#locElev').textContent = A.elev != null ? `${Math.round(A.elev)} m` : '—';
  $('#locArea').textContent = `${A.radiusKm} km`;
}

/* ---------- NASA time series & forecast card ---------- */
const median = a => { const v = a.filter(x => x != null).sort((x, y) => x - y), n = v.length; return n ? (n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2) : null; };
const NASA_LABEL = {annual_mean_temp:'Annual mean temperature', summer_JJA_mean_temp:'Summer (Jun–Aug) temperature', annual_mean_daily_max:'Mean daily maximum', annual_precip:'Annual precipitation', root_zone_wetness:'Root-zone soil wetness', solar_radiation:'Surface solar radiation'};
function nasaSvg(svg, o){
  const W = 560, H = 200, L = 40, R = 16, T = 12, B = 24, n = o.n;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const all = [...o.lines.flatMap(l => l.y), ...(o.band ? [...o.band.lo, ...o.band.hi] : [])].filter(v => v != null);
  const lo = Math.floor(Math.min(...all) - 0.3), hi = Math.ceil(Math.max(...all) + 0.3);
  const X = i => L + i * (W - L - R) / (n - 1), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const step = (hi - lo) > 12 ? 4 : (hi - lo) > 6 ? 2 : 1;
  let g = '';
  for(let t = Math.ceil(lo / step) * step; t <= hi; t += step) g += `<line class="g" x1="${L}" x2="${W - R}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end">${t}°</text>`;
  o.ticks.forEach(([i, lab]) => { g += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${lab}</text>`; });
  let body = '';
  if(o.band){
    const up = o.band.idx.map((i, k) => `${X(i).toFixed(1)} ${Y(o.band.hi[k]).toFixed(1)}`), dn = o.band.idx.map((i, k) => `${X(i).toFixed(1)} ${Y(o.band.lo[k]).toFixed(1)}`).reverse();
    body += `<path d="M${up.join(' L')} L${dn.join(' L')} Z" fill="#FFBE55" fill-opacity=".2"/>`;
  }
  o.lines.forEach(l => {
    const pts = l.x.map((i, k) => l.y[k] == null ? null : `${X(i).toFixed(1)} ${Y(l.y[k]).toFixed(1)}`).filter(Boolean);
    body += `<path d="M${pts.join(' L')}" fill="none" stroke="${l.color}" stroke-width="${l.w || 2}"${l.dash ? ` stroke-dasharray="${l.dash}"` : ''} stroke-linejoin="round"/>`;
    if(l.dots) body += l.x.map((i, k) => l.y[k] == null ? '' : `<circle cx="${X(i).toFixed(1)}" cy="${Y(l.y[k]).toFixed(1)}" r="2.6" fill="${l.color}"/>`).join('');
  });
  (o.labels || []).forEach(t => { body += `<text class="lbl" x="${X(t.i).toFixed(1)}" y="${(Y(t.v) + (t.dy ?? -8)).toFixed(1)}" text-anchor="${t.anchor || 'start'}" style="fill:${t.color}">${t.text}</text>`; });
  svg.innerHTML = g + body;
}
function renderNasaPanel(){
  const A = S.A, card = $('#nasaCard'); if(!card) return;
  if(!A || !A.nasa){ card.hidden = true; return; }
  card.hidden = false;
  const b = A.nasa.bundle, s = b.series, T = b.trends.trends, tr = Object.fromEntries(T.map(t => [t.variable, t]));
  const at = tr.annual_mean_temp, sm = tr.summer_JJA_mean_temp, y0 = s.month[0].slice(0, 4), y1 = s.month[s.month.length - 1].slice(0, 4);
  $('#nasaSub').textContent = `${A.nasa.place.name} · NASA POWER ${y0}–${y1}`;
  $('#nasaHead').innerHTML = `Next 12 months of monthly temperature from a seasonal + trend model with a machine-learning correction, trained on NASA POWER. Long-term warming <b>${sgn(at.slope_per_decade, 2)} °C per decade</b> (${at.significant ? 'statistically significant' : 'not significant'}); summer <b>${sgn(sm.slope_per_decade, 2)} °C per decade</b>. Mann-Kendall test with Sen's slope on ${at.n_years} annual values.`;

  // chart 1: annual mean temperature + Sen trend line
  const yrs0 = [...new Set(s.month.map(m => +m.slice(0, 4)))];
  const ann = yrs0.map(y => { const v = s.month.map((m, i) => +m.slice(0, 4) === y ? s.t2m[i] : null).filter(x => x != null); return v.length === 12 ? mean(v) : null; });
  const slope = at.slope_per_decade / 10, ic0 = median(ann.map((v, i) => v == null ? null : v - slope * yrs0[i]));
  const idx = yrs0.map((_, i) => i), tk = idx.filter(i => (yrs0[i] - yrs0[0]) % 10 === 0).map(i => [i, yrs0[i]]); tk.push([idx.length - 1, yrs0[idx.length - 1]]);
  if($('#nasaAnnual')) nasaSvg($('#nasaAnnual'), {n:idx.length, ticks:tk, lines:[
    {x:idx, y:ann, color:'#cfe3ef', dots:true, w:1.8},
    {x:[0, idx.length - 1], y:[ic0 + slope * yrs0[0], ic0 + slope * yrs0[idx.length - 1]], color:'#FFBE55', dash:'6 4', w:2}],
    labels:[{i:idx.length - 1, v:ic0 + slope * yrs0[idx.length - 1], text:`trend ${sgn(at.slope_per_decade, 2)} °C/decade`, color:'#FFBE55', anchor:'end', dy:-10}]});

  // chart 2: last 5 years (monthly) + next 12 months with 90% band
  const fc = b.forecast.forecast, hist = 60, hm = s.month.slice(-hist), ht = s.t2m.slice(-hist), nF = fc.length;
  const hx = hm.map((_, i) => i), fx = fc.map((_, i) => hist + i);
  nasaSvg($('#nasaMonthly'), {n:hist + nF, ticks:[[0, hm[0]], [24, hm[24]], [48, hm[48]], [hist + nF - 1, fc[nF - 1].month]], lines:[
    {x:hx, y:ht, color:'#22D3EE', w:1.8},
    {x:[hist - 1, ...fx], y:[ht[hist - 1], ...fc.map(r => r.value)], color:'#FFBE55', w:2.2}],
    band:{idx:fx, lo:fc.map(r => r.lo90), hi:fc.map(r => r.hi90)},
    labels:[{i:hist + nF - 1, v:fc[nF - 1].value, text:`${fc[nF - 1].value.toFixed(1)} °C`, color:'#FFBE55', anchor:'end', dy:-14}]});
  $('#nasaFcTable tbody').innerHTML = fc.map(r => `<tr><td>${r.month}</td><td>${r.value.toFixed(1)}</td><td>${r.lo90.toFixed(1)}</td><td>${r.hi90.toFixed(1)}</td></tr>`).join('');

  // trends table + caveats
  const order = ['annual_mean_temp', 'summer_JJA_mean_temp', 'annual_mean_daily_max', 'annual_precip', 'root_zone_wetness', 'solar_radiation'];
  if($('#nasaTrends')) $('#nasaTrends tbody').innerHTML = order.filter(k => tr[k]).map(k => { const t = tr[k];
    return `<tr><td>${NASA_LABEL[k]}${t.caveat ? ` <span class="nasa-warn" title="${esc(t.caveat)}" aria-label="caution">⚠</span>` : ''}</td><td>${sgn(t.slope_per_decade, 3)} <small>${esc(t.unit.replace('degC/decade', '°C/decade'))}</small></td><td>${t.p_value < 0.001 ? '&lt;0.001' : t.p_value.toFixed(3)}</td><td>${t.significant ? 'yes' : 'no'}</td></tr>`; }).join('');
  const cav = T.filter(t => t.caveat);
  $('#nasaCaveats').innerHTML = cav.map(t => `<li><b>${NASA_LABEL[t.variable] || t.variable}:</b> ${esc(t.caveat)}</li>`).join('');

  // reliability from the rolling backtest
  const bt = b.backtest.results, hs = [...new Set(bt.map(r => r.horizon))];
  $('#nasaRel tbody').innerHTML = hs.map(h => { const f = m => bt.find(r => r.horizon === h && r.model === m), ml = f('ridge_resid');
    return `<tr><td>${h} mo</td><td>${f('clim_trend').rmse.toFixed(2)}</td><td>${ml.rmse.toFixed(2)}</td><td>${ml.ridge_significant ? 'yes' : 'no'}</td></tr>`; }).join('');

  // server-side report links (need the live API; not available in a static preview)
  const nm = A.nasa.place.name;
  $('#nasaLinks').innerHTML = isStatic() ? `<span class="muted">PDF and CSV reports are generated by the NASA data service (not available in this offline preview).</span>`
    : `<a class="btn-secondary" href="${reportUrl(nm, 'pdf')}" download>${ic('file')}PDF report</a> <a class="btn-secondary" href="${reportUrl(nm, 'csv')}" download>${ic('download')}CSV data</a>`;
}

function renderDashboard(){
  const A = S.A;
  renderDashboardCore(); S.H = hazardReadings(A, S.I);
  $('#dhTitle').textContent = S.loc.name;
  $('#dhSub').textContent = `${fmtLat(S.loc.lat)}, ${fmtLon(S.loc.lon)} · events and imagery ${per(A).label} · ${A.radiusKm} km hazard radius · scanned ${ago(A.fetchedAt)}`;
  renderView(S.view);
}
/* Each view renders when it is shown, so charts are sized for the screen at that moment. */
function renderView(v){
  if(!S.A) return;
  try{
    if(v === 'basic') renderBasic(S.A, S.I, S.loc);
    else if(v === 'advanced'){ renderAdvViews(S.A); renderAdvancedTables(); }
    else renderPlayViews(S.A, S.loc);
  }catch(e){ console.error('view', v, e); }
}
function renderAdvancedTables(){
  const A = S.A, H = S.H;
  const hasHot = A.years.some(y => y.hot != null), hotTd = v => hasHot ? `<td>${v ?? '—'}</td>` : '';
  const r = A.years.map(y => `<tr><td>${y.year}</td><td>${y.temp?.toFixed(2) ?? '—'}</td><td>${y.rain ?? '—'}</td>${hotTd(y.hot)}<td>${y.soil ?? '—'}</td><td>${y.solar?.toFixed(2) ?? '—'}</td></tr>`).join('');
  const row = (lbl, o) => `<tr class="avg"><td>${lbl}</td><td>${o.temp?.toFixed(2) ?? '—'}</td><td>${o.rain ?? '—'}</td>${hotTd(o.hot)}<td>${o.soil ?? '—'}</td><td>${o.solar?.toFixed(2) ?? '—'}</td></tr>`;
  $('#advYears').innerHTML = `<table class="tbl"><thead><tr><th>Year</th><th>Mean temp °C</th><th>Rain mm${A.nasa ? ' (GPM IMERG)' : ''}</th>${hasHot ? `<th>Days ≥ ${A.hotBase} °C</th>` : ''}<th>Soil m³/m³</th><th>Solar kWh/m²/d</th></tr></thead><tbody>${r}${row('Avg ' + per(A).baseLabel, A.base)}${row('Avg ' + per(A).curLabel, A.cur)}</tbody></table>`;
  const towers = HAZARDS.map(h => `<tr><td>${h.code} ${h.name}</td><td><span class="lvl lvl-${H[h.id].level}">${LEVEL[H[h.id].level][0]}</span></td><td>${H[h.id].score}</td><td class="l">${esc(H[h.id].headline)}</td></tr>`).join('');
  const quakes = A.quakes ? (A.quakes.list.length ? A.quakes.list.slice(0, 12).map(e => `<tr><td>${new Date(e.time).toISOString().slice(0,10)}</td><td>M${e.mag.toFixed(1)}</td><td class="l">${esc(e.place || 'Unknown')}</td><td>${e.dist} km</td></tr>`).join('') : '') : '';
  $('#advHaz').innerHTML = `<table class="tbl"><thead><tr><th>Tower</th><th>Level</th><th>Score</th><th class="l">Finding</th></tr></thead><tbody>${towers}</tbody></table>
    <h3>Earthquakes M4+ within ${A.radiusKm} km, ${per(A).label}</h3>${A.quakes ? (quakes ? `<table class="tbl"><thead><tr><th>Date</th><th>Mag</th><th class="l">Place</th><th>Distance</th></tr></thead><tbody>${quakes}</tbody></table>` : '<div class="empty">None recorded.</div>') : '<div class="empty">USGS data unavailable.</div>'}`;
  $('#advExport').innerHTML = `<div class="btn-row"><button class="btn-primary" data-act="report-quick">${ic('file')}Save as report</button><button class="btn-secondary" data-act="csv">${ic('download')}Download CSV</button></div>
    <p>Sources: ${A.nasa ? 'NASA POWER (MERRA-2 / CERES) monthly data; NASA GPM IMERG V07 rainfall; NASA EONET events (storms, floods, landslides, volcanoes; notable events only); NASA MERRA-2 aerosols (air quality, PM2.5); NASA-SSH sea level; USGS Earthquake Catalog; Esri World Imagery Wayback. Grid values (~50 km) can differ from station records.' : 'ERA5 reanalysis (ECMWF / Copernicus) and CMIP6 via Open-Meteo; USGS Earthquake Catalog; Copernicus DEM; CAMS air quality; Esri World Imagery Wayback. Grid values (~25 km) can differ from station records.'} Screening rules are simple thresholds, not an official assessment.</p>`;
}

/* ---------- scan target (dashboard stage) ---------- */
function renderInset(){
  const T = {x:205, y:290};
  $('#insetSvg').innerHTML = `<defs><radialGradient id="tgtGlow"><stop offset="0" stop-color="#22D3EE" stop-opacity=".55"/><stop offset="1" stop-color="#22D3EE" stop-opacity="0"/></radialGradient><linearGradient id="sweepG" x1="0" x2="1"><stop offset="0" stop-color="#22D3EE" stop-opacity="0"/><stop offset="1" stop-color="#22D3EE" stop-opacity=".45"/></linearGradient></defs>
    <circle cx="${T.x}" cy="${T.y}" r="130" fill="url(#tgtGlow)"/>
    <path class="sweep" style="transform-origin:${T.x}px ${T.y}px" d="M${T.x} ${T.y} L${T.x+170} ${T.y} A170 170 0 0 0 ${T.x+147} ${T.y-85} Z" fill="url(#sweepG)"/>
    <g fill="none" stroke="#22D3EE"><circle class="pulse-ring" cx="${T.x}" cy="${T.y}" r="30" stroke-width="2"/><g class="target-rings"><circle cx="${T.x}" cy="${T.y}" r="70" stroke-width="1.2" stroke-dasharray="6 8" opacity=".8"/><circle cx="${T.x}" cy="${T.y}" r="100" stroke-width="1" stroke-dasharray="2 10" opacity=".6"/></g><circle cx="${T.x}" cy="${T.y}" r="42" stroke-width="1.6" opacity=".9"/><circle cx="${T.x}" cy="${T.y}" r="17" stroke-width="2.2" filter="url(#glow)"/><path d="M${T.x-58} ${T.y}h28M${T.x+30} ${T.y}h28M${T.x} ${T.y-58}v28M${T.x} ${T.y+30}v28" stroke-width="1.6"/></g>
    <circle cx="${T.x}" cy="${T.y}" r="6" fill="#EAF8FF" filter="url(#glow)"/>`;
}

/* ---------- location chrome ---------- */
function fillLocation(){
  const l = S.loc;
  $('#popTitle').textContent = l.name; $('#popCoords').textContent = `${fmtLat(l.lat)} · ${fmtLon(l.lon)}`;
  $('#locCoords').textContent = `${fmtLat(l.lat)}, ${fmtLon(l.lon)}`;
  $('#sbName').textContent = l.short; $('#spName').textContent = l.name;
  $('#locArea').textContent = `${$('#radius').value} km`;
  if(!S.A || S.A.loc.id !== l.id) $('#locElev').textContent = '—';
  const sel = $('#locSelect'), seen = new Set(), opts = [];
  [l, ...PRESETS, ...favs()].forEach(x => { if(seen.has(x.id)) return; seen.add(x.id); opts.push(`<option value="${esc(x.id)}">${esc(x.name)}</option>`); });
  sel.innerHTML = opts.join(''); sel.value = l.id;
  $('#favBtn').setAttribute('aria-pressed', isFav(l));
  renderPresets();
}
function renderPresets(){
  const items = [...PRESETS, ...favs().filter(f => !PRESETS.some(p => p.id === f.id))].slice(0, 7);
  $('#presets').innerHTML = items.map(p => `<button data-id="${esc(p.id)}">${ic(isFav(p) ? 'star' : 'pin')}${esc(p.short)}${p.featured ? ' <span class="feat">Featured</span>' : ''}</button>`).join('');
}
$('#presets').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if(b) select(findLoc(b.dataset.id)); });
const findLoc = id => [S.loc, ...PRESETS, ...favs(), ...recents()].find(x => x && x.id === id);

/* ---------- pages ---------- */

function setPage(p){
  S.page = p; document.body.dataset.page = p;
  $$('.topnav [data-nav]').forEach(b => b.toggleAttribute('aria-current', b.dataset.nav === p));
  $$('.topnav [aria-current]').forEach(b => b.setAttribute('aria-current', 'page'));
  globeInteractive();
  requestAnimationFrame(() => { sizeGlobe(); refreshMosaics(); });
}
function goHome(){
  S.token++; S.riskTok++; setPage('home');
  if(S.state !== 'selected') setState('idle'); else updateGlobe();
  announce('Explore the globe, search, or click anywhere on Earth.');
}
function go(p){
  if(p === 'home') return goHome();
  if(p === 'dashboard'){
    if(S.A){ setPage('dashboard'); if(S.state !== 'scanning') showResults(); return; }
    const r = recents()[0];
    if(r){ S.loc = withId(r); scan(); return; }
    toast('Pick a region on the globe and press Scan Area first.'); goHome(); return;
  }
  S.riskTok++; setPage(p);
  if(p === 'projects') renderProjects(); else if(p === 'risk') renderRisk(); else if(p === 'reports') renderReports(); else if(p === 'compare') renderCompare();
}

/* ---------- flow ---------- */
function select(l){
  S.token++; S.loc = withId(l);
  if(S.page !== 'home') setPage('home');
  fillLocation(); setState('selected');
  $('#popSub').textContent = 'Climate: NASA POWER grid cell (~50 km).';
  announce(`${S.loc.name} selected. Press Scan Area to analyse.`);
  setTimeout(() => $('#scanBtn').focus({preventScroll:true}), 400);
}
async function selectPoint(lat, lon){
  const l = withId({name:'Locating…', short:'Custom Area', lat, lon});
  select(l);
  const r = await reverseName(l.lat, l.lon);
  if(S.loc.id !== l.id) return;
  S.loc = {...S.loc, ...(r || {name:`Custom Area (${fmtLat(lat)}, ${fmtLon(lon)})`, short:'Custom Area'})}; fillLocation();
}
function requestScan(){ scan(); }
/* ---------- study period controls ---------- */
const YEAR_MIN = 2000;
function fillYears(sel, from, to, val){ sel.innerHTML = yrs(from, to).map(y => `<option>${y}</option>`).join(''); sel.value = String(val); }
function initPeriodControls(){
  [['#pStart','#pEnd'], ['#dStart','#dEnd']].forEach(([a, b]) => { fillYears($(a), YEAR_MIN, LAST_YEAR - 2, LAST_YEAR - 6); fillYears($(b), YEAR_MIN + 2, LAST_YEAR, LAST_YEAR); });
}
function setPeriodValues(start, end){ ['#pStart', '#dStart'].forEach(i => { $(i).value = String(start); }); ['#pEnd', '#dEnd'].forEach(i => { $(i).value = String(end); }); }
function fixPeriod(changed){
  const pair = changed.id.startsWith('p') ? ['#pStart', '#pEnd'] : ['#dStart', '#dEnd'], a = $(pair[0]), b = $(pair[1]);
  if(+b.value - +a.value < 2){ if(changed === a) b.value = String(Math.min(LAST_YEAR, +a.value + 2)); else a.value = String(Math.max(YEAR_MIN, +b.value - 2)); if(+b.value - +a.value < 2) a.value = String(+b.value - 2); }
  setPeriodValues(+a.value, +b.value);
}
const getPeriod = () => makePeriod(+$('#pStart').value, +$('#pEnd').value);
function syncScanCtl(){
  if(!S.A) return; const pd = per(S.A);
  setPeriodValues(Math.min(pd.start, LAST_YEAR - 2), pd.end); $('#dRad').value = String(S.A.radiusKm); $('#radius').value = String(S.A.radiusKm);
}
const STEP_KEYS = ['era5','cmip','hazard','air','img'];
async function scan(force = false){
  const token = ++S.token, l = S.loc, radius = +$('#radius').value, period = getPeriod();
  S.riskTok++; setPage('dashboard'); fillLocation();
  renderInset(); setState('scanning');
  $('#stExplain').textContent = `Scanning ${radius} km around the target…`;
  const sp = $('#scanProgress'); sp.classList.remove('has-error');
  const lis = Object.fromEntries($$('#spSteps li').map(li => [li.dataset.k, li])); Object.values(lis).forEach(li => { li.className = 'on'; });
  $('#sbChip').className = 'chip info'; $('#sbChip span').textContent = 'Scanning';
  const key = `${CACHE_VER}${l.id}:${radius}:${period.start}-${period.end}`, cached = !force && store.get(key, null), fresh = cached && Date.now() - cached.fetchedAt < 7*864e5;
  lis.era5.firstChild.textContent = `NASA POWER climate record ${period.label} `;
  lis.cmip.firstChild.textContent = 'NASA climate projections ';
  let done = 0; const t0 = performance.now(), minT = REDUCED ? 300 : fresh ? 1300 : 2200;
  const fg = $('#spFg'), pctEl = $('#spPct');
  (function tick(){ if(token !== S.token || S.state !== 'scanning') return;
    const p = Math.min(done / STEP_KEYS.length, (performance.now() - t0) / minT, 1);
    fg.style.strokeDashoffset = 408*(1-p); pctEl.textContent = Math.round(p*100) + '%'; requestAnimationFrame(tick); })();
  let A;
  if(fresh){ A = {...cached, loc:l}; $('#spNote').textContent = 'Loaded from local cache (refresh from the status bar).';
    for(const k of STEP_KEYS){ await sleep(minT / 7); if(token !== S.token) return; lis[k].className = 'done'; done++; } }
  else {
    $('#spNote').textContent = 'Fetching NASA time series for this point…';
    try{
      A = await analyze(l, radius, (k, ok, note) => { if(token !== S.token) return; lis[k].className = ok ? 'done' : 'fail'; const sm = lis[k].querySelector('small'); if(!ok) sm.textContent = 'unavailable'; else if(typeof note === 'string') sm.textContent = note; done++; }, period);
      store.set(key, A);
    }catch(e){
      if(token !== S.token) return;
      sp.classList.add('has-error'); $('#spErrMsg').textContent = `${e.message || 'Request failed.'}${e.userFacing ? ' Try Alexandria, Cairo, Aswan, Riyadh or Singapore.' : ' Check your internet connection and try again.'}`;
      $('#sbChip').className = 'chip bad'; $('#sbChip span').textContent = 'Error'; announce('Scan failed. ' + (e.message || '')); return;
    }
  }
  const wait = minT - (performance.now() - t0); if(wait > 0) await sleep(wait);
  if(token !== S.token) return;
  done = STEP_KEYS.length;
  S.A = A; addRecent(l);
  showResults();
  if(S.page === 'risk') renderRisk();
  if(S.goto){ const g = S.goto; S.goto = null; go(g); }
}
function showResults(){
  document.body.classList.add('scanned');   // page navigation appears once a place has been scanned
  if(!S.A) return;
  S.loc = S.A.loc; fillLocation(); syncScanCtl(); renderDashboard(); renderInset(); setState('results');
  $('#stExplain').textContent = 'Scan complete. Switch views above, or open Risk Monitoring to see one tower per natural hazard.';
  $('#sbChip').className = 'chip ok';
  setTimeout(refreshMosaics, 950);
  announce(`Results ready for ${S.loc.name}.`);
}

/* ---------- projects ---------- */
function projCard(l){
  const {x, y} = tileXY(l.lat, l.lon, 9), tile = ESRI(9, Math.floor(y), Math.floor(x)), last = recents().find(r => r.id === l.id);
  return `<article class="proj"><div class="proj-img" style="background-image:url('${tile}')"><span class="tag mint">${ic('star')}Studying</span></div>
    <div class="proj-b"><h3>${esc(l.name)}</h3><p class="mono proj-c">${fmtLat(l.lat)}, ${fmtLon(l.lon)}</p>
    <p class="muted">${l.since ? 'Studying since ' + new Date(l.since).toLocaleDateString() : ''}${last ? ` · last scan ${ago(last.at)}` : ' · not scanned yet'}</p>
    <label class="sr-only" for="note-${esc(l.id)}">Notes for ${esc(l.short)}</label>
    <textarea id="note-${esc(l.id)}" data-note="${esc(l.id)}" rows="3" placeholder="Research notes for this place…">${esc(l.note || '')}</textarea>
    <div class="proj-actions"><button class="btn-primary" data-act="open" data-id="${esc(l.id)}">${ic('scan')}Open dashboard</button><button class="btn-secondary" data-act="open-risk" data-id="${esc(l.id)}">Risk Monitoring</button><button class="icon-btn" data-act="del" data-id="${esc(l.id)}" aria-label="Remove ${esc(l.name)} from projects" title="Remove from projects">${ic('trash')}</button></div></div></article>`;
}
function renderProjects(){
  const f = favs(), r = recents().filter(x => !f.some(p => p.id === x.id));
  $('#pageProjects').innerHTML = `<div class="page-in"><header class="page-h"><div><h1>${ic('layers')}Projects</h1><p>Star a region and it becomes a project: a place you are studying. Keep notes and jump back in any time.</p></div></header>
    ${f.length ? `<div class="proj-grid">${f.map(projCard).join('')}</div>` : `<div class="empty-state">${ic('star')}<h3>No projects yet</h3><p>Open a scan and press the star next to the place name to mark it as a place you study.</p><button class="btn-primary" data-act="go-home">${ic('pin')}Pick a region</button></div>`}
    <h2 class="sec-h">Recent scans</h2>
    ${r.length ? `<ul class="list">${r.map(l => `<li>${ic('pin')}<div class="grow"><b>${esc(l.name)}</b><span>${fmtLat(l.lat)}, ${fmtLon(l.lon)}${l.at ? ' · scanned ' + ago(l.at) : ''}</span></div><button class="btn-ghost" data-act="open" data-id="${esc(l.id)}">Open</button><button class="icon-btn" data-act="star" data-id="${esc(l.id)}" aria-label="Star ${esc(l.name)}" title="Mark as project">${ic('star')}</button></li>`).join('')}</ul>` : '<div class="empty">No other scans yet.</div>'}
    <p class="muted foot">Saved in this browser. <button class="link-btn" data-act="clear">Clear cached scans</button></p></div>`;
}

/* ---------- reports ---------- */
/* No accounts: each visit gets an anonymous session on the server (reports.py). Reports stay while the site is open
 * (a ping every minute) and for 15 minutes after the last ping, so closing the tab by mistake loses nothing.
 * Saving the same place, period and sections twice keeps one report. */
const RP = {sid:null, list:[], full:{}, err:'', ready:null};
const SID_KEY = 'es:visit';
const reportsOf = () => RP.list;
async function sessApi(method, path, body){
  const r = await fetch(apiBase() + path, {method, headers:{'Content-Type':'application/json'}, body:body ? JSON.stringify(body) : undefined});
  if(!r.ok){ const e = new Error(`HTTP ${r.status}`); e.status = r.status; try{ e.msg = (await r.json()).error; }catch{} throw e; }
  return r.json();
}
async function newSession(){ const {sid} = await sessApi('POST', '/session'); RP.sid = sid; store.set(SID_KEY, sid); RP.list = []; RP.full = {}; return sid; }
/* reuse the visit stored in this browser if the server still has it (closed less than 15 minutes ago), else start a new one */
function startSession(){
  if(isStatic()) return (RP.ready = Promise.resolve(null));
  return RP.ready = (async () => {
    try{
      const old = store.get(SID_KEY, null);
      if(old){ try{ await sessApi('POST', `/session/${old}/ping`); RP.sid = old; await loadReports(); return old; }catch(e){ if(e.status !== 404) throw e; } }
      return await newSession();
    }catch{ RP.err = 'The report service could not be reached, so reports cannot be saved right now.'; return null; }
  })();
}
async function loadReports(){
  if(!RP.sid) return;
  try{ RP.list = (await sessApi('GET', `/session/${RP.sid}/reports`)).reports; RP.err = ''; }
  catch(e){ if(e.status === 404){ await newSession(); } else RP.err = 'The report service could not be reached.'; }
  if(S.page === 'reports') renderReports();
}
async function pingSession(){
  if(!RP.sid) return;
  try{ await sessApi('POST', `/session/${RP.sid}/ping`); }
  catch(e){ if(e.status === 404){ const had = RP.list.length; await newSession(); if(had){ toast('Your previous visit expired, so its reports were removed.'); if(S.page === 'reports') renderReports(); } } }
}
setInterval(pingSession, 60000);
addEventListener('pagehide', () => { if(RP.sid) try{ navigator.sendBeacon(apiBase() + `/session/${RP.sid}/ping`); }catch{} });
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') pingSession(); });
async function fullReport(id){
  if(RP.full[id]) return RP.full[id];
  return RP.full[id] = await sessApi('GET', `/session/${RP.sid}/reports/${encodeURIComponent(id)}`);
}
const SECTIONS = [['summary','Summary and indicators'],['trends','Trend tests for every variable'],['years','Yearly climate record'],['towers','Risk tower results'],['hazards','Earthquake list']];
function renderReports(){
  const reps = reportsOf(), has = !!S.A;
  $('#pageReports').innerHTML = `<div class="page-in"><header class="page-h"><div><h1>${ic('file')}Reports</h1><p>Save what you found as a report, then open it as a PDF or download the data as CSV. Reports are kept for this visit and for 15 minutes after you close the site. No account needed.</p></div></header>
    <div class="rep-new card">${has ? `<h2>${ic('plus')}New report from your current scan</h2>
      <div class="rep-form"><label>Title<input id="rpTitle" type="text" value="${esc(S.loc.short)} climate and hazard study"></label>
      <label>Notes <span>(optional)</span><textarea id="rpNotes" rows="3" placeholder="Your findings, questions, next steps…"></textarea></label>
      <fieldset><legend>Include</legend><div class="chips">${SECTIONS.map(s => `<label class="chk"><input type="checkbox" class="rp-sec" value="${s[0]}" checked><span>${s[1]}</span></label>`).join('')}</div></fieldset>
      <div class="btn-row"><button class="btn-primary" data-act="report-save">${ic('check')}Save report</button><button class="btn-secondary" data-act="report-save-pdf">${ic('print')}Save and open PDF</button></div></div>`
      : `<h2>${ic('plus')}New report</h2><p class="muted">Scan a region first. Your report is built from the scan results.</p><button class="btn-primary" data-act="go-home">${ic('pin')}Pick a region</button>`}</div>
    ${RP.err ? `<p class="rep-err">${esc(RP.err)}</p>` : ''}
    <h2 class="sec-h">Saved in this visit (${reps.length})</h2>
    ${reps.length ? `<ul class="rep-list">${reps.map(r => `<li class="card rep-item"><span class="rep-ic">${ic('file')}</span><div class="grow"><b>${esc(r.title)}</b><span>${esc(r.loc.name)} · ${new Date(r.createdAt).toLocaleString()} · ${r.sections.length} section${r.sections.length === 1 ? '' : 's'}</span>${r.notes ? `<em>${esc(r.notes.slice(0, 140))}${r.notes.length > 140 ? '…' : ''}</em>` : ''}</div>
      <div class="rep-actions"><button class="btn-ghost" data-act="report-view" data-id="${esc(r.id)}">${ic('eye')}Preview</button><button class="btn-primary" data-act="report-pdf" data-id="${esc(r.id)}">${ic('print')}PDF</button><button class="btn-ghost" data-act="report-csv" data-id="${esc(r.id)}">${ic('download')}CSV</button><button class="icon-btn" data-act="report-del" data-id="${esc(r.id)}" aria-label="Delete report ${esc(r.title)}">${ic('trash')}</button></div></li>`).join('')}</ul>`
      : `<div class="empty-state">${ic('file')}<h3>No saved reports yet</h3><p>Reports you save during this visit appear here.</p></div>`}</div>`;
}
async function saveReport(title, notes, sections){
  await RP.ready;
  if(!RP.sid){ toast(RP.err || 'Reports cannot be saved right now.'); return null; }
  const rep = {id:'r' + Date.now().toString(36) + Math.random().toString(36).slice(2,5), title:title || `${S.loc.short} report`, notes:notes || '', sections, createdAt:Date.now(), view:S.view, loc:S.A.loc, A:S.A};
  let out;
  try{ out = await sessApi('POST', `/session/${RP.sid}/reports`, {report:rep}); }
  catch(e){
    if(e.status === 404){ await newSession(); try{ out = await sessApi('POST', `/session/${RP.sid}/reports`, {report:rep}); }catch{ toast('Could not save the report.'); return null; } }
    else { toast(e.status === 413 ? 'This report is too large to save.' : e.status === 409 ? (e.msg || 'Too many reports in this visit. Delete one first.') : 'Could not reach the report service. The report was not saved.'); return null; }
  }
  if(out.duplicate){ toast('This report is already saved: same place, period and sections.'); return RP.list.find(r => r.id === out.id) ? fullReport(out.id) : rep; }
  RP.full[rep.id] = rep;
  const {A, ...meta} = rep; RP.list = [meta, ...RP.list];
  if(S.page === 'reports') renderReports();
  return rep;
}
function csvText(A, loc){
  const rows = [['location', loc.name], ['latitude', loc.lat], ['longitude', loc.lon], ['era5_grid', `${A.grid.lat},${A.grid.lon}`], ['fetched', new Date(A.fetchedAt).toISOString()], [],
    ['year','source','mean_temp_c','rain_mm','hot_days','soil_m3m3','solar_kwh_m2_day','model_low_c','ensemble_mean_c','model_high_c']];
  A.years.forEach(y => rows.push([y.year,A.nasa ? 'NASA POWER' : 'ERA5',y.temp,y.rain,y.hot,y.soil,y.solar,'','','']));
  if(A.proj) per(A).projYears.forEach((y,i) => rows.push([y,'CMIP6','','','','','',A.proj.low[i],A.proj.mean[i],A.proj.high[i]]));
  const ms = A.nasa?.bundle?.series;
  if(ms){ rows.push([], ['monthly NASA series'], ['month','t2m_c','t2m_max_c','precip_mm_per_day_power','imerg_mm_month','solar_kwh_m2_day','root_zone_wetness_0_1']);
    ms.month.forEach((m, i) => rows.push([m, ms.t2m[i], ms.t2m_max?.[i], ms.prectotcorr?.[i], ms.imerg_mm?.[i], ms.allsky_sfc_sw_dwn?.[i] == null ? '' : +(ms.allsky_sfc_sw_dwn[i] / 3.6).toFixed(3), ms.gwetroot?.[i]])); }
  return rows.map(r => r.map(c => /[",\n]/.test(String(c ?? '')) ? `"${String(c).replace(/"/g,'""')}"` : (c ?? '')).join(',')).join('\n');
}
const slugOf = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'location';
function downloadCSV(A, loc){
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csvText(A, loc)], {type:'text/csv'})); a.download = `earthanova-${slugOf(loc.name)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function reportHTML(rep, autoPrint){
  const A = rep.A, loc = rep.loc, I = interpret(A), H = hazardReadings(A, I), has = k => rep.sections.includes(k);
  const d = new Date(A.fetchedAt).toISOString().replace('T',' ').slice(0,16);
  const tr = A.years.map(y => `<tr><td>${y.year}</td><td>${y.temp?.toFixed(2) ?? '—'}</td><td>${y.rain ?? '—'}</td><td>${y.hot ?? '—'}</td><td>${y.soil ?? '—'}</td><td>${y.solar?.toFixed(2) ?? '—'}</td></tr>`).join('');
  const pr = A.proj ? per(A).projYears.map((y,i) => `<tr><td>${y}</td><td>${A.proj.low[i].toFixed(2)}</td><td>${A.proj.mean[i].toFixed(2)}</td><td>${A.proj.high[i].toFixed(2)}</td></tr>`).join('') : '';
  const tw = HAZARDS.map(h => `<tr><td>${h.code} ${h.name}</td><td>${LEVEL[H[h.id].level][0]}</td><td style="text-align:left">${esc(H[h.id].headline)}</td></tr>`).join('');
  const trendRows = VARS.map(v => { const sr = dvSeries(A, v.id), vd = sr && dvVerdict(sr); return vd ? `<tr><td>${esc(v.name)}</td><td>${sr.years[0]}–${sr.years[sr.years.length - 1]}</td><td>${dvSgn(vd.t.slope * 10, v.dec + 1)} ${esc(v.unit)}</td><td>${pTxt(vd.t.p)}</td><td style="text-align:left">${esc(vd.word)}</td></tr>` : ''; }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(rep.title)}</title><style>body{font:14px/1.5 Inter,system-ui,sans-serif;color:#0b1b2b;max-width:860px;margin:32px auto;padding:0 24px}h1{font:700 26px Sora,system-ui;margin:0}h2{font:600 17px Sora,system-ui;margin:26px 0 8px;border-bottom:2px solid #22D3EE;padding-bottom:4px}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}td,th{border-bottom:1px solid #d6e2ea;padding:6px 8px;text-align:right}td:first-child,th:first-child{text-align:left}th{color:#45627a;font-weight:600}.muted{color:#45627a}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.box{border:1px solid #d6e2ea;border-radius:10px;padding:10px 12px}.box b{display:block;font-size:18px}ul{padding-left:18px}.notes{white-space:pre-wrap;background:#f1f7fa;border-radius:10px;padding:10px 12px}@media print{.noprint{display:none}}</style></head><body>
  <p class="noprint"><button onclick="print()">Print / Save as PDF</button></p>
  <h1>${esc(rep.title)}</h1><p class="muted">${esc(loc.name)} · ${fmtLat(loc.lat)}, ${fmtLon(loc.lon)} · ${A.nasa ? 'NASA POWER' : 'ERA5'} grid ${A.grid.lat.toFixed(2)}, ${A.grid.lon.toFixed(2)} · elevation ${A.elev != null ? Math.round(A.elev) + ' m' : 'n/a'}<br>Prepared with Earthanova on ${new Date(rep.createdAt).toLocaleDateString()} · data fetched ${d} UTC</p>
  ${rep.notes ? `<h2>Notes</h2><p class="notes">${esc(rep.notes)}</p>` : ''}
  ${has('summary') ? `<h2>Summary</h2><div class="grid"><div class="box">Temperature change<b>${sgn(I.dT)} °C</b><span class="muted">${per(A).baseLabel} → ${per(A).curLabel}</span></div><div class="box">Rainfall change<b>${I.dRain == null ? (I.dryRain ? 'Hyper-arid' : 'n/a') : sgn(I.dRain,0) + '%'}</b><span class="muted">${A.base.rain ?? '—'} → ${A.cur.rain ?? '—'} mm/yr</span></div><div class="box">Trend<b>${A.trend ? sgn(A.trend.slope,2) + ' °C/yr' : 'n/a'}</b><span class="muted">${A.trend ? (A.trend.sig ? 'significant (95%)' : 'not significant') : ''}</span></div></div>
    <h2>Indicators</h2><ul><li>Solar: ${esc(I.hi.solar[0])} (${esc(I.hi.solar[2])})</li><li>Climate: ${esc(I.hi.climate[0])} (${esc(I.hi.climate[2])})</li><li>Air quality: ${esc(I.hi.air[0])} (${esc(I.hi.air[2])})</li></ul>
    <h2>Screening flags</h2>${I.flags.length ? `<ul>${I.flags.map(f => `<li>${esc(f.t)}</li>`).join('')}</ul>` : '<p>No thresholds exceeded.</p>'}` : ''}
  ${has('trends') && trendRows ? `<h2>Trend tests (Mann-Kendall with Sen's slope, whole NASA record)</h2><table><thead><tr><th>Variable</th><th>Years</th><th>Trend per decade</th><th>p-value</th><th style="text-align:left">Verdict</th></tr></thead><tbody>${trendRows}</tbody></table><p class="muted">A trend is called real when p &lt; 0.05: a pattern that steady would appear by chance less than 1 time in 20.</p>` : ''}
  ${has('towers') ? `<h2>Risk tower results</h2><table><thead><tr><th>Tower</th><th>Level</th><th style="text-align:left">Finding</th></tr></thead><tbody>${tw}</tbody></table>` : ''}
  ${has('years') ? `<h2>Yearly record (${A.nasa ? 'NASA POWER' : 'ERA5'})</h2><table><thead><tr><th>Year</th><th>Mean °C</th><th>Rain mm</th><th>Days ≥ ${A.hotBase} °C</th><th>Soil m³/m³</th><th>Solar kWh/m²/d</th></tr></thead><tbody>${tr}</tbody></table>` : ''}
  ${has('projection') && A.proj ? `<h2>Projection ${rng(per(A).projYears)} (CMIP6, bias-adjusted)</h2><table><thead><tr><th>Year</th><th>Model low</th><th>Ensemble mean</th><th>Model high</th></tr></thead><tbody>${pr}</tbody></table>` : ''}
  ${has('hazards') ? `<h2>Earthquakes M4+ within ${A.radiusKm} km, ${per(A).label}</h2>${A.quakes ? (A.quakes.list.length ? `<table><thead><tr><th>Date</th><th>Magnitude</th><th>Place</th><th>Distance</th></tr></thead><tbody>${A.quakes.list.slice(0,15).map(e => `<tr><td>${new Date(e.time).toISOString().slice(0,10)}</td><td>${e.mag.toFixed(1)}</td><td style="text-align:left">${esc(e.place)}</td><td>${e.dist} km</td></tr>`).join('')}</tbody></table>` : '<p>None recorded.</p>') : '<p>Unavailable.</p>'}` : ''}
  <h2>Sources &amp; limitations</h2><p class="muted">${A.nasa ? 'NASA POWER (MERRA-2 / CERES) monthly data; NASA GPM IMERG V07 rainfall; NASA EONET events; NASA MERRA-2 aerosols (air quality, PM2.5); NASA-SSH sea level; USGS Earthquake Catalog; Esri World Imagery Wayback. Grid-cell values (~50 km) may differ' : 'ERA5 reanalysis (Copernicus/ECMWF) and CMIP6 HighResMIP via Open-Meteo; USGS Earthquake Catalog; CAMS air quality; Copernicus DEM; Esri World Imagery Wayback. Grid-cell values (~25 km) may differ'} from station records. Screening rules are simple thresholds and not an official assessment. Projections are scenario-based, not forecasts.</p>
  ${autoPrint ? '<script>addEventListener("load",()=>setTimeout(()=>print(),400))<\/script>' : ''}</body></html>`;
}
function openReport(rep, autoPrint, pre){
  const url = URL.createObjectURL(new Blob([reportHTML(rep, autoPrint)], {type:'text/html'}));
  let w = pre || window.open(url, '_blank'); if(pre && !pre.closed) pre.location.href = url; else if(pre) w = null;
  if(!w){ const a = document.createElement('a'); a.href = url; a.download = `earthanova-${slugOf(rep.loc.name)}.html`; a.click(); toast('Pop-up blocked. The report was downloaded instead (open it and use Print to save as PDF).'); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- search ---------- */
let searchT, searchSeq = 0, searchItems = [], searchIdx = -1;
const sInput = $('#searchInput'), sList = $('#searchResults');
function closeSearch(){ sList.classList.remove('open'); sInput.setAttribute('aria-expanded','false'); searchIdx = -1; }
function renderSearch(){
  sList.innerHTML = searchItems.length ? searchItems.map((r,i) => `<li role="option" id="sr${i}" aria-selected="${i === searchIdx}" data-i="${i}"><b>${esc(r.short)}</b><span>${esc([r.admin, r.country].filter(Boolean).join(', '))} · ${fmtLat(r.lat)}, ${fmtLon(r.lon)}</span></li>`).join('') : '<li class="muted">No places found.</li>';
  sList.classList.add('open'); sInput.setAttribute('aria-expanded','true');
  if(searchIdx >= 0) sInput.setAttribute('aria-activedescendant', `sr${searchIdx}`); else sInput.removeAttribute('aria-activedescendant');
}
sInput.addEventListener('input', () => {
  clearTimeout(searchT); const q = sInput.value.trim(); if(q.length < 2){ closeSearch(); return; }
  searchT = setTimeout(async () => {
    const seq = ++searchSeq;
    sList.innerHTML = '<li class="muted">Searching…</li>'; sList.classList.add('open');
    try{
      const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`, 10000);
      if(seq !== searchSeq) return;
      searchItems = (j.results || []).map(r => ({name:`${r.name}, ${r.country || ''}`.replace(/, $/,''), short:r.name, admin:r.admin1, country:r.country, lat:r.latitude, lon:r.longitude}));
      searchIdx = searchItems.length ? 0 : -1; renderSearch();
    }catch{ if(seq === searchSeq){ sList.innerHTML = '<li class="muted">Search unavailable — check your connection.</li>'; } }
  }, 280);
});
sInput.addEventListener('keydown', e => {
  if(!sList.classList.contains('open') || !searchItems.length){ if(e.key === 'Escape') closeSearch(); return; }
  if(e.key === 'ArrowDown'){ e.preventDefault(); searchIdx = (searchIdx + 1) % searchItems.length; renderSearch(); }
  else if(e.key === 'ArrowUp'){ e.preventDefault(); searchIdx = (searchIdx - 1 + searchItems.length) % searchItems.length; renderSearch(); }
  else if(e.key === 'Escape'){ closeSearch(); }
});
$('#searchForm').addEventListener('submit', e => { e.preventDefault(); if(searchIdx >= 0 && searchItems[searchIdx]) pickSearch(searchItems[searchIdx]); });
sList.addEventListener('mousedown', e => { const li = e.target.closest('li[data-i]'); if(li){ e.preventDefault(); pickSearch(searchItems[+li.dataset.i]); } });
sInput.addEventListener('blur', () => setTimeout(closeSearch, 120));
function pickSearch(r){ closeSearch(); sInput.value = ''; sInput.blur(); select(r); }



/* ---------- dialog ---------- */
function showDialog({title, body = '', actions = []}){
  $('#dlgT').textContent = title; $('#dlgB').innerHTML = body;
  const a = $('#dlgA'); a.innerHTML = '';
  actions.forEach(x => { const b = document.createElement('button'); b.className = x.cls || 'btn-secondary'; b.textContent = x.label; b.addEventListener('click', () => { if(x.fn && x.fn() === false) return; closeDialog(); }); a.appendChild(b); });
  $('#dlg').hidden = false; document.body.classList.add('modal-open');
  const f = $('#dlg input, #dlg textarea'); if(f) setTimeout(() => f.focus(), 50);
}
function closeDialog(){ $('#dlg').hidden = true; document.body.classList.remove('modal-open'); }
$('#dlg').addEventListener('mousedown', e => { if(e.target.id === 'dlg') closeDialog(); });

/* ---------- place picker (used by compare) ---------- */
function placePicker(inp, list, onPick){
  let t, seq = 0, items = [];
  inp.addEventListener('input', () => {
    clearTimeout(t); const q = inp.value.trim(); if(q.length < 2){ list.hidden = true; return; }
    t = setTimeout(async () => {
      const my = ++seq; list.hidden = false; list.innerHTML = '<li class="muted">Searching…</li>';
      try{
        const j = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`, 10000); if(my !== seq) return;
        items = (j.results || []).map(r => ({name:`${r.name}, ${r.country || ''}`.replace(/, $/, ''), short:r.name, admin:r.admin1, country:r.country, lat:r.latitude, lon:r.longitude}));
        list.innerHTML = items.length ? items.map((r, i) => `<li data-i="${i}"><b>${esc(r.short)}</b><span>${esc([r.admin, r.country].filter(Boolean).join(', '))}</span></li>`).join('') : '<li class="muted">No places found.</li>';
      }catch{ if(my === seq) list.innerHTML = '<li class="muted">Search unavailable. Check your connection.</li>'; }
    }, 280);
  });
  list.addEventListener('mousedown', e => { const li = e.target.closest('li[data-i]'); if(!li) return; e.preventDefault(); const r = items[+li.dataset.i]; list.hidden = true; inp.value = r.name; onPick(withId(r), inp); });
  inp.addEventListener('blur', () => setTimeout(() => { list.hidden = true; }, 150));
  inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); const li = list.querySelector('li[data-i]'); if(li && !list.hidden) li.dispatchEvent(new MouseEvent('mousedown', {bubbles:true})); } });
}
const knownPlaces = () => { const seen = new Set(); return [...(S.A ? [S.A.loc] : []), ...favs(), ...PRESETS].filter(p => !seen.has(p.id) && seen.add(p.id)); };

/* ---------- compare places (travel advisor) ---------- */
const CMP = {from:null, to:null, start:null, end:null, pref:'mild', purpose:'trip', res:null};
const PREF = {mild:[18, 26, 'mild (18–26 °C)'], warm:[24, 32, 'warm (24–32 °C)'], cool:[8, 18, 'cool (8–18 °C)']};
const isoDay = d => d.toISOString().slice(0, 10);
function renderCompare(){
  if(!CMP.start){ const a = new Date(Date.now() + 5*864e5), b = new Date(Date.now() + 12*864e5); CMP.start = isoDay(a); CMP.end = isoDay(b); }
  if(!CMP.from && S.A) CMP.from = S.A.loc;
  const chipsFor = key => knownPlaces().slice(0, 6).map(p => `<button type="button" class="chip-opt" data-cmp-pick="${key}" data-id="${esc(p.id)}">${esc(p.short)}</button>`).join('');
  $('#pageCompare').innerHTML = `<div class="page-in"><header class="page-h"><div><h1>${ic('compare')}Compare places</h1><p>Is your destination a good choice for your dates? Pick two places and the dates. We compare them with NASA data and give one clear answer.</p></div></header>
    <form class="card cmp-form" id="cmpForm" novalidate>
      <div class="cmp-grid">
        <div class="cmp-f"><label for="cmpFrom">From: where you are</label><div class="pick">${ic('pin')}<input id="cmpFrom" type="text" autocomplete="off" placeholder="Search a city…" value="${esc(CMP.from?.name || '')}"><ul class="pick-list" id="cmpFromList" hidden></ul></div><div class="chips">${chipsFor('from')}</div></div>
        <div class="cmp-swap"><button type="button" class="icon-btn" data-act="cmp-swap" aria-label="Swap places" title="Swap places">${ic('refresh')}</button></div>
        <div class="cmp-f"><label for="cmpTo">To: where you want to go</label><div class="pick">${ic('pin')}<input id="cmpTo" type="text" autocomplete="off" placeholder="Search a city…" value="${esc(CMP.to?.name || '')}"><ul class="pick-list" id="cmpToList" hidden></ul></div><div class="chips">${chipsFor('to')}</div></div>
      </div>
      <div class="cmp-opts">
        <label>Travel from<input type="date" id="cmpStart" value="${CMP.start}"></label>
        <label>Until<input type="date" id="cmpEnd" value="${CMP.end}"></label>
        <label>This is a<select id="cmpPurpose"><option value="trip"${CMP.purpose === 'trip' ? ' selected' : ''}>Trip (days or weeks)</option><option value="relocate"${CMP.purpose === 'relocate' ? ' selected' : ''}>Move (living there)</option></select></label>
        <label>I prefer weather that is<select id="cmpPref">${Object.entries(PREF).map(([k, v]) => `<option value="${k}"${CMP.pref === k ? ' selected' : ''}>${v[2]}</option>`).join('')}</select></label>
      </div>
      <p class="form-err" id="cmpErr" role="alert"></p><div class="btn-row"><button class="btn-primary" type="submit">${ic('compare')}Compare and advise</button></div>
    </form><div id="cmpOut"></div></div>`;
  placePicker($('#cmpFrom'), $('#cmpFromList'), l => { CMP.from = l; });
  placePicker($('#cmpTo'), $('#cmpToList'), l => { CMP.to = l; });
  if(CMP.res) showCompare(CMP.res);
}
const mdNum = d => (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
async function placeData(l, win){
  const q = `latitude=${l.lat}&longitude=${l.lon}`;
  const hzP = nasaEnsure(l.lat, l.lon, l.short || l.name).then(hit => nasaHazards(hit.place.name));   // slow the first time for a new place
  const today = isoDay(new Date()), far = isoDay(new Date(Date.now() + 15*864e5)), near = win.start <= far && win.end >= today;
  const [olR, eq, hz, fcR] = await Promise.allSettled([
    nasaOutlook(l.lat, l.lon, win.start, win.end),
    getJSON(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&${q}&maxradiuskm=200&starttime=${LAST_YEAR - 9}-01-01&minmagnitude=4.5&orderby=magnitude&limit=500`, 15000),
    hzP,
    /* Open-Meteo weather forecast (not NASA), only for trip days within the next 16 days */
    near ? getJSON(`https://api.open-meteo.com/v1/forecast?${q}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&forecast_days=16&timezone=auto`, 15000) : Promise.resolve(null)
  ]);
  if(olR.status !== 'fulfilled') throw new Error(`NASA climate history for ${l.short} could not be loaded${olR.reason?.message ? ` (${olR.reason.message})` : ''}.`);
  const ol = olR.value, clim = climFromOutlook(ol);
  const f = eq.status === 'fulfilled' ? eq.value.features || [] : null;
  const quakes = f ? {perYear:f.length / 10, count:f.length, max:f.length ? Math.max(...f.map(q => q.properties.mag)) : null} : null;
  const dustA = hz.status === 'fulfilled' ? hz.value.dust?.annual : null, airA = hz.status === 'fulfilled' ? hz.value.air?.annual : null;
  const fd = fcR.status === 'fulfilled' ? fcR.value?.daily : null;
  const fc = fd ? fd.time.map((d, i) => ({d, hi:fd.temperature_2m_max[i], lo:fd.temperature_2m_min[i], rain:fd.precipitation_sum?.[i], pop:fd.precipitation_probability_max?.[i]})).filter(f => f.d >= win.start && f.d <= win.end && f.hi != null) : null;
  return {loc:l, ol, clim, quakes, fc, dust:dustA?.length ? mean(dustA.slice(-5)) : null, pm:airA?.length >= 5 ? mean(airA.slice(-5)) : null, elev:null};
}
function scorePlace(d, pref, purpose){
  const c = d.clim, [lo, hi] = PREF[pref], dist = c.meanT < lo ? lo - c.meanT : c.meanT > hi ? c.meanT - hi : 0;
  const P = {};
  P.comfort = {score:clamp(100 - dist * 8 - Math.max(0, c.hi - 36) * 3), w:{trip:.30, relocate:.25}};
  P.rain = {score:clamp(100 - c.rainPerDay * 12 - c.wetFrac * 20), w:{trip:.20, relocate:.10}};
  P.extreme = {score:clamp(100 - c.hotFrac * 220 - c.coldFrac * 160), w:{trip:.15, relocate:.15}};
  P.air = {score:d.pm != null ? clamp(100 - d.pm * 1.6) : d.dust == null ? 60 : clamp(100 - d.dust * 2.5), w:{trip:.10, relocate:.25}};
  P.seismic = {score:d.quakes ? clamp(100 - d.quakes.perYear * 5 - ((d.quakes.max || 0) >= 7 ? 20 : 0)) : 70, w:{trip:.15, relocate:.20}};
  if(d.elev != null && d.elev > 2000) P.altitude = {score:clamp(100 - (d.elev - 2000) / 25), w:{trip:.10, relocate:.05}};
  let tw = 0, ts = 0; Object.values(P).forEach(p => { const w = p.w[purpose]; tw += w; ts += w * p.score; });
  return {parts:P, total:Math.round(ts / tw)};
}
const CMP_METRICS = [
  ['comfort', 'Typical temperature', d => `${d.clim.meanT.toFixed(1)} °C <small>(day ${d.clim.hi.toFixed(0)} · night ${d.clim.lo.toFixed(0)})</small>`],
  ['rain', 'Rain in your dates', d => `${d.clim.rainTotal.toFixed(0)} mm <small>(${Math.round(d.clim.wetFrac * 100)}% rainy days)</small>`],
  ['extreme', 'Extreme heat / cold days', d => `${Math.round(d.clim.hotFrac * 100)}% hot · ${Math.round(d.clim.coldFrac * 100)}% freezing`],
  ['air', 'Air quality (PM2.5, yearly mean)', d => d.pm != null ? `${d.pm.toFixed(1)} µg/m³` : d.dust == null ? 'No data' : `${d.dust.toFixed(1)} µg/m³ <small>(dust only)</small>`],
  ['seismic', 'Earthquake activity', d => d.quakes ? `${d.quakes.perYear.toFixed(1)} M4.5+ / yr${d.quakes.max ? ` <small>(max M${d.quakes.max.toFixed(1)})</small>` : ''}` : 'No data'],
  ['altitude', 'Altitude', d => d.elev == null ? '—' : `${Math.round(d.elev)} m`]
];
function advise(a, b, sa, sb, win, purpose){
  const diff = sb.total - sa.total, flags = [], pros = [], cons = [], tips = [], c = b.clim;
  if(b.quakes && ((b.quakes.max || 0) >= 6.5 || b.quakes.perYear >= 15)) flags.push(`${b.loc.short} has high earthquake activity.`);
  if(b.pm != null && b.pm > 35) flags.push(`${b.loc.short} has poor air quality: fine particles (PM2.5) average ${b.pm.toFixed(0)} µg/m³, above the WHO 35 µg/m³ interim target.`);
  else if(b.pm == null && b.dust != null && b.dust > 40) flags.push(`${b.loc.short} is very dusty: windblown dust averages ${b.dust.toFixed(0)} µg/m³ (PM2.5).`);
  if(c.hotFrac > .35) flags.push(`More than a third of your days in ${b.loc.short} reach 35 °C or more.`);
  if(c.coldFrac > .4) flags.push(`Many nights in ${b.loc.short} fall below freezing.`);
  if(b.elev != null && b.elev > 2500) flags.push(`${b.loc.short} is high (${Math.round(b.elev)} m): altitude sickness is possible.`);
  Object.keys(sb.parts).forEach(k => { if(!sa.parts[k]) return; const dd = sb.parts[k].score - sa.parts[k].score, nm = CMP_METRICS.find(m => m[0] === k)[1].toLowerCase(); if(dd >= 15) pros.push(`Better ${nm} than ${a.loc.short}.`); else if(dd <= -15) cons.push(`Worse ${nm} than ${a.loc.short}.`); });
  if(c.hotFrac > .15 || c.hi >= 33) tips.push('Pack light clothing, sunscreen and a water bottle; plan outdoor activity for early morning or evening.');
  if(c.rainPerDay > 2.5 || c.wetFrac > .4) tips.push('Bring a rain jacket and keep plans flexible for wet days.');
  if(c.coldFrac > .1 || c.lo <= 3) tips.push('Bring warm layers for the evenings.');
  if(b.dust != null && b.dust > 25) tips.push('Consider an N95 mask on dusty days, especially for children or asthma.');
  if(b.quakes && b.quakes.perYear >= 3) tips.push('Check how your accommodation handles earthquakes and note the exits.');
  let level;
  if(purpose === 'trip') level = sb.total >= 70 ? 'good' : sb.total >= 50 ? 'ok' : 'bad';
  else level = (diff >= 8 && sb.total >= 55) ? 'good' : (diff > -8 && sb.total >= 45) ? 'ok' : 'bad';
  if(flags.length && level === 'good') level = 'ok'; else if(flags.length >= 2 && level === 'ok') level = 'bad';
  const f = x => new Date(x + 'T12:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'}), when = `${f(win.start)} to ${f(win.end)}`;
  const head = purpose === 'trip'
    ? {good:`Good decision: ${b.loc.short} looks like a great trip for ${when}.`, ok:`Possible, with care: ${b.loc.short} is workable for ${when}.`, bad:`Not recommended: conditions in ${b.loc.short} look poor for ${when}.`}[level]
    : {good:`Good move: ${b.loc.short} scores clearly better than ${a.loc.short} for living.`, ok:`Mixed: ${b.loc.short} is not clearly better than ${a.loc.short}. Weigh the other factors.`, bad:`Not recommended: ${b.loc.short} scores worse than ${a.loc.short} on the conditions we measure.`}[level];
  return {level, head, diff, flags, pros, cons, tips};
}
async function runCompare(){
  const err = $('#cmpErr'); err.textContent = '';
  CMP.start = $('#cmpStart').value; CMP.end = $('#cmpEnd').value; CMP.pref = $('#cmpPref').value; CMP.purpose = $('#cmpPurpose').value;
  if(!CMP.from || !CMP.to){ err.textContent = 'Choose both places from the suggestions (or tap one of the quick buttons).'; return; }
  if(CMP.from.id === CMP.to.id){ err.textContent = 'Pick two different places.'; return; }
  if(!CMP.start || !CMP.end || CMP.end < CMP.start){ err.textContent = 'Choose travel dates (the end date must be after the start).'; return; }
  if((new Date(CMP.end) - new Date(CMP.start)) / 864e5 > 90){ err.textContent = 'Please choose a window of 90 days or less.'; return; }
  const win = {start:CMP.start, end:CMP.end}; $('#cmpOut').innerHTML = '<div class="card cmp-load"><div class="spinner"></div><p>Reading 30 years of NASA climate, the air and earthquake history for both places. A new place can take 1–2 minutes the first time…</p></div>';
  try{
    const [a, b] = await Promise.all([placeData(CMP.from, win), placeData(CMP.to, win)]);
    CMP.res = {a, b, win, purpose:CMP.purpose, pref:CMP.pref, at:Date.now()}; showCompare(CMP.res);
  }catch(ex){ $('#cmpOut').innerHTML = ''; err.textContent = (ex.message || 'Comparison failed.') + ' Check your connection and try again.'; }
}
function showCompare(r){
  const {a, b, win} = r, sa = scorePlace(a, r.pref, r.purpose), sb = scorePlace(b, r.pref, r.purpose), v = advise(a, b, sa, sb, win, r.purpose);
  const rows = CMP_METRICS.filter(m => sa.parts[m[0]] || sb.parts[m[0]]).map(m => { const x = sa.parts[m[0]]?.score ?? 0, y = sb.parts[m[0]]?.score ?? 0, w = Math.abs(x - y) < 5 ? '' : x > y ? 'a' : 'b';
    return `<tr><th scope="row">${m[1]}</th><td class="${w === 'a' ? 'win' : ''}">${sa.parts[m[0]] ? m[2](a) : '—'}${w === 'a' ? ic('check') : ''}</td><td class="${w === 'b' ? 'win' : ''}">${sb.parts[m[0]] ? m[2](b) : '—'}${w === 'b' ? ic('check') : ''}</td></tr>`; }).join('');
  const sc = (d, s, role) => `<div class="cmp-card"><p class="td-code">${role}</p><h3>${esc(d.loc.name)}</h3><div class="cmp-score"><b>${s.total}</b><span>/ 100 comfort and safety</span></div><div class="meter"><span style="width:${s.total}%;background:${s.total >= 70 ? 'var(--mint)' : s.total >= 50 ? 'var(--amber)' : 'var(--red)'}"></span></div></div>`;
  const li = (arr, icn, cls) => arr.map(t => `<li class="${cls}">${ic(icn)}<span>${esc(t)}</span></li>`).join('');
  const dd = x => new Date(x + 'T12:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'});
  $('#cmpOut').innerHTML = `<div class="cmp-verdict v-${v.level}"><span class="v-ic">${ic(v.level === 'good' ? 'check' : 'alert')}</span><div><p class="v-k">${r.purpose === 'trip' ? 'Trip' : 'Move'} · ${dd(win.start)} to ${dd(win.end)}</p><h2>${esc(v.head)}</h2><p>${esc(a.loc.short)} scores ${sa.total} and ${esc(b.loc.short)} scores ${sb.total} out of 100.</p></div></div>
    <div class="cmp-cards">${sc(a, sa, 'From')}${sc(b, sb, 'To')}</div>
    <section class="card cmp-sec"><header class="cmp-sec-h"><h2>Side by side</h2></header><p class="cmp-idea">Both places on the same scale for your dates. A check mark shows the clearly better one.</p>
      <div class="tbl-scroll"><table class="tbl cmp-tbl"><thead><tr><th></th><th>${esc(a.loc.short)} <small>(from)</small></th><th>${esc(b.loc.short)} <small>(to)</small></th></tr></thead><tbody>${rows}</tbody></table></div>
      ${v.flags.length || v.tips.length || v.pros.length || v.cons.length ? `<div class="cmp-notes2">${v.flags.length ? callout(ic, 'warn', 'Watch out', v.flags.map(esc).join('<br>')) : ''}${v.pros.length || v.cons.length ? callout(ic, 'key', `Why ${esc(b.loc.short)} scores ${sb.total >= sa.total ? 'higher' : 'lower'}`, [...v.pros, ...v.cons].map(esc).join('<br>'), 'compare') : ''}${v.tips.length ? callout(ic, 'tip', `Tips for ${esc(b.loc.short)}`, `<ul>${v.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`) : ''}</div>` : ''}
      <p class="muted cmp-src">Climate: NASA POWER daily, 30 years for your dates. Air (PM2.5): NASA MERRA-2. Earthquakes: USGS, M4.5+ within 200 km, ${LAST_YEAR - 9}–${LAST_YEAR}.${a.fc?.length || b.fc?.length ? ' Weather forecast: Open-Meteo (not NASA).' : ''}</p></section>
    ${outlookHtml(a, b)}
    ${forecastSection(a, b)}
    <div id="cmpPlan"></div>
    <div class="btn-row"><button class="btn-primary" data-act="cmp-open">${ic('scan')}Open ${esc(b.loc.short)} dashboard</button></div>
    <p class="muted foot">General guidance from open NASA climate data, not a safety guarantee. Check official travel advice before you decide.</p>`;
  loadPlanner(r);
}

/* ---------- compare: best time to go (destination) ---------- */
const PL = {cache:{}, tok:0};
async function loadPlanner(r){
  const host = $('#cmpPlan'); if(!host) return;
  const tok = ++PL.tok, place = r.b.loc;
  host.innerHTML = `<div class="card cmp-load"><div class="spinner"></div><p>Loading the year of NASA climate for ${esc(place.short)}…</p></div>`;
  const pk = PL.cache[place.id] ??= {};
  const days = Math.max(1, Math.round((new Date(r.win.end) - new Date(r.win.start)) / 864e5) + 1);
  try{
    pk.profile ??= await nasaClimateYear(place.lat, place.lon);
    if(tok !== PL.tok) return;
    const plan = buildPlan(pk.profile, {range:PREF[r.pref].slice(0, 2), purpose:r.purpose, lenWeeks:r.purpose === 'trip' ? Math.max(1, Math.min(13, Math.round(days / 7))) : 4, win:r.win});
    const tips = {};
    host.innerHTML = `<div class="pl-root">${bestTimeHtml(plan, place.short, tips)}</div>`;
    wirePlanner(host, tips);
  }catch(e){
    delete pk.profile;
    if(tok !== PL.tok) return;
    host.innerHTML = `<div class="card"><p class="td-exp">The yearly climate for ${esc(place.short)} could not be loaded (${esc((e && e.message) || 'unavailable')}). Try again in a moment.</p></div>`;
  }
}
/* ---------- wiring ---------- */
function goIdle(){ S.token++; setState('idle'); announce('Explore the globe, search, or click anywhere on Earth.'); }
document.addEventListener('click', e => {
  const t = e.target;
  const nav = t.closest('[data-nav]'); if(nav){ go(nav.dataset.nav); return; }
  const nl = t.closest('[data-nav-link]'); if(nl){ go(nl.dataset.navLink); return; }
  const sv = t.closest('[data-setview]'); if(sv){ setView(sv.dataset.setview); return; }
  const cp = t.closest('[data-cmp-pick]'); if(cp){ const l = findLoc(cp.dataset.id) || knownPlaces().find(x => x.id === cp.dataset.id); if(l){ CMP[cp.dataset.cmpPick] = l; CMP.res = null; $(cp.dataset.cmpPick === 'from' ? '#cmpFrom' : '#cmpTo').value = l.name; } return; }
  const b = t.closest('[data-act]'); if(!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if(act === 'open' || act === 'open-risk'){ const l = findLoc(id); if(l){ S.loc = withId(l); S.goto = act === 'open-risk' ? 'risk' : null; scan(); } }
  else if(act === 'del'){ const l = findLoc(id); if(l){ toggleFav(l); renderProjects(); fillLocation(); if(world) world.labelsData(globeLabels()); toast(`${l.short || l.name} removed from Projects.`); } }
  else if(act === 'star'){ const l = findLoc(id); if(l){ if(!isFav(l)) toggleFav(l); renderProjects(); fillLocation(); toast(`${l.short || l.name} added to Projects.`); } }
  else if(act === 'go-home') goHome();
  else if(act === 'new-scan') newScan();
  else if(act === 'clear'){ Object.keys(localStorage).filter(k => k.startsWith(CACHE_VER)).forEach(k => localStorage.removeItem(k)); toast('Cached scans cleared.'); }
  else if(act === 'csv'){ if(S.A) downloadCSV(S.A, S.loc); else toast('Scan a location first.'); }
  else if(act === 'report-quick'){ if(!S.A) return; saveReport(`${S.loc.short} climate and hazard study`, '', SECTIONS.map(s => s[0])).then(r => { if(r && !RP.list.some(x => x.id === r.id && x.createdAt < Date.now() - 2000)) toast('Report saved. Find it in Reports (kept for this visit).'); }); }
  else if(act === 'report-save' || act === 'report-save-pdf'){
    const secs = $$('.rp-sec').filter(c => c.checked).map(c => c.value);
    if(!secs.length){ toast('Pick at least one section to include.'); return; }
    const pre = act === 'report-save-pdf' ? window.open('', '_blank') : null;
    saveReport($('#rpTitle').value.trim(), $('#rpNotes').value.trim(), secs).then(r => { if(r){ renderReports(); if(pre) openReport(r, true, pre); } else if(pre) pre.close(); });
  }
  else if(act === 'cmp-swap'){ [CMP.from, CMP.to] = [CMP.to, CMP.from]; CMP.res = null; renderCompare(); }
  else if(act === 'cmp-open'){ if(CMP.res){ S.loc = withId(CMP.res.b.loc); S.goto = null; scan(); } }
  else if(act.startsWith('report-')){
    const m = reportsOf().find(x => x.id === id); if(!m) return;
    if(act === 'report-del'){
      sessApi('DELETE', `/session/${RP.sid}/reports/${encodeURIComponent(id)}`).then(() => { RP.list = RP.list.filter(x => x.id !== id); delete RP.full[id]; renderReports(); toast('Report deleted.'); })
        .catch(() => toast('Could not delete the report. Check your connection and try again.'));
    }else{
      const pre = act === 'report-csv' ? null : window.open('', '_blank');
      fullReport(id).then(r => { if(act === 'report-csv') downloadCSV(r.A, r.loc); else openReport(r, act === 'report-pdf', pre); })
        .catch(() => { if(pre) pre.close(); toast('Could not open the report. It may have expired with your previous visit.'); });
    }
  }
});
document.addEventListener('submit', e => {
  const f = e.target.id;
  if(f === 'cmpForm'){ e.preventDefault(); runCompare(); }
});
['#pStart', '#pEnd', '#dStart', '#dEnd'].forEach(i => $(i).addEventListener('change', e => fixPeriod(e.target)));
$('#dRad').addEventListener('change', () => { $('#radius').value = $('#dRad').value; });
$('#rescanBtn').addEventListener('click', () => { $('#radius').value = $('#dRad').value; scan(true); });
$('#pQuick').addEventListener('click', e => { const b = e.target.closest('button[data-q]'); if(!b) return; const n = +b.dataset.q; setPeriodValues(LAST_YEAR - n + 1, LAST_YEAR); });
document.addEventListener('change', e => {
  const n = e.target.closest('[data-note]'); if(!n) return;
  const f = favs(), i = f.findIndex(x => x.id === n.dataset.note); if(i >= 0){ f[i].note = n.value; store.set(uKey('favs'), f); toast('Note saved.'); }
});
$('#homeLink').addEventListener('click', e => { e.preventDefault(); goHome(); });
$('#scanBtn').addEventListener('click', requestScan);
$('#scanRegionBtn').addEventListener('click', () => { if(S.state === 'selected') requestScan(); else { sInput.focus(); toast('Search a place, pick a featured city, or click anywhere on the globe.'); } });
$('#retryBtn').addEventListener('click', () => scan(true));
$('#changeBtn').addEventListener('click', goIdle);
$('#errChange').addEventListener('click', goHome);
$('#popClose').addEventListener('click', goIdle);
$('#riskRescan').addEventListener('click', renderRisk);
$('#sbChip').addEventListener('click', () => { if(S.state === 'results') scan(true); });
$('#locSelect').addEventListener('change', e => { const l = findLoc(e.target.value); if(l){ S.loc = withId(l); scan(); } });
$('#radius').addEventListener('change', () => { $('#locArea').textContent = `${$('#radius').value} km`; });
$('#favBtn').addEventListener('click', () => { const on = toggleFav(S.loc); $('#favBtn').setAttribute('aria-pressed', on); fillLocation(); if(world) world.labelsData(globeLabels()); toast(on ? `${S.loc.short} added to Projects. You are now studying it.` : `${S.loc.short} removed from Projects.`); });
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ if(!$('#dlg').hidden) closeDialog(); else if(S.page === 'home' && S.state === 'selected') goIdle(); } });

/* ---------- boot ---------- */
initPeriodControls();
/* accounts were removed: clear what older versions kept in this browser (accounts, passwords, plans, account tokens) */
try{ Object.keys(localStorage).filter(k => k === 'es:users' || k === 'es:session' || /^es:(tok|sub|orgreq|reports|view):u/.test(k)).forEach(k => localStorage.removeItem(k)); }catch{}
setView(store.get('es:view', 'basic'), false);
initViews({ic, store, toast, place:() => S.loc});
startSession();
initGlobe();
S.loc = withId(PRESETS[0]); fillLocation(); setState('idle'); updateGlobe(true);
function finishSplash(){ setPage('home'); setState('idle'); updateGlobe(); }
(function runSplash(){
  if(new URLSearchParams(location.search).has('skip')){ finishSplash(); return; }
  const fill = $('#splashFill'), note = $('#splashNote'), dur = REDUCED ? 600 : 2800, t0 = performance.now();
  const msgs = ['Preparing your Earth explorer…', 'Loading satellite imagery…', 'Calibrating the globe…', 'Ready.'];
  (function f(){ const p = Math.min(1, (performance.now() - t0) / dur); fill.style.width = (p * 100) + '%'; note.textContent = msgs[Math.min(msgs.length - 1, Math.floor(p * msgs.length))];
    if(p < 1) requestAnimationFrame(f); else finishSplash(); })();
})();

/* ---------- responsive tables ----------
 * Wide data tables (trends, hazard catalogue, yearly record, Compare tables) are rendered as HTML
 * strings all over the app. On a phone they are wider than the card, so every table gets a
 * horizontally scrolling wrapper instead of being clipped at the card edge. */
function wrapTables(){
  document.querySelectorAll('table:not(.sr-only)').forEach(t => {
    if(t.closest('.tbl-scroll, .tbl-x')) return;
    const w = document.createElement('div'); w.className = 'tbl-x';
    t.parentNode.insertBefore(w, t); w.appendChild(t);
  });
}
let wrapQueued = false;
new MutationObserver(() => { if(wrapQueued) return; wrapQueued = true; requestAnimationFrame(() => { wrapQueued = false; wrapTables(); }); })
  .observe(document.body, {childList: true, subtree: true});
wrapTables();
