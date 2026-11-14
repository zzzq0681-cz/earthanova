/* Earthanova app logic — ported unchanged from the original Vite project (src/main.js).
 * It drives the server-rendered markup in components/EarthanovaMarkup.tsx imperatively,
 * and is loaded once, client-side only, by components/EarthanovaClient.tsx. */
import Globe from 'globe.gl';
import {towerViz, renderChart as renderHzChart, wireCharts as wireHzCharts} from './hazard-charts.js';
import {eonetEvents, nasaHazards, nasaWindow, nasaFind, nasaEnsure, nasaLoad, nasaBuildAnalysis, isStatic, reportUrl} from './nasa-data.js';

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
const uKey = k => `es:${k}:${S.user?.id || 'guest'}`;
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
  A.hazErr = hz.status === 'rejected' ? (hz.reason?.message || 'unavailable') : (hz.value?.error || null);
  return A;
}
/* USGS earthquake catalogue (NASA has no earthquake catalogue; EONET lists none), labelled as USGS in the UI. */
async function usgsQuakes(loc, radiusKm, period){
  const j = await getJSON(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${loc.lat}&longitude=${loc.lon}&maxradiuskm=${radiusKm}&starttime=${period.start}-01-01&endtime=${period.end}-12-31&minmagnitude=4&orderby=magnitude&limit=200`, 15000);
  const f = j.features || [];
  return {count:f.length, maxMag: f.length ? Math.max(...f.map(q => q.properties.mag)) : null,
    all: f.map(q => ({mag:q.properties.mag, time:q.properties.time})),
    list: f.slice(0, 25).map(q => ({mag:q.properties.mag, place:q.properties.place, time:q.properties.time, url:q.properties.url,
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
    air: !A.aq ? ['Not loaded yet','na','no NASA layer yet'] : A.aq.pm25 <= 15 ? ['Good air quality','good',`PM2.5 ${A.aq.pm25} µg/m³`] : A.aq.pm25 <= 35 ? ['Moderate air quality','warn',`PM2.5 ${A.aq.pm25} µg/m³`] : ['Poor air quality','warn',`PM2.5 ${A.aq.pm25} µg/m³`]
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

/* ---------- accounts (stored in this browser only) ---------- */
const ROLES = [
  {id:'scientist', label:'Scientist / Researcher', desc:'I need the full data, statistics and exports.', view:'advanced', icon:'flask'},
  {id:'student', label:'Student', desc:'I am learning. Keep it simple and fun.', view:'playful', icon:'book'},
  {id:'developer', label:'Developer / Engineer', desc:'I build with data, models or APIs.', view:'advanced', icon:'code'},
  {id:'professional', label:'Planner / Professional', desc:'Farming, energy, insurance, cities, safety.', view:'basic', icon:'briefcase'},
  {id:'general', label:'Everyday person', desc:'I just want to understand my area.', view:'basic', icon:'user'}
];
const FIELDS = ['Climate science','Geology / seismology','Hydrology & water','Environmental science','Agriculture & food','Urban planning','Energy','Data science / software','School or general studies','Other'];
const INTERESTS = ['Temperature & climate','Rainfall & drought','Floods','Earthquakes','Air quality','Sea level & coasts','Solar energy','Agriculture','Cities & planning'];
const PURPOSES = ['Research or publication','Studying or homework','Building an app or model','Work: planning or risk assessment','Personal curiosity'];
const roleOf = id => ROLES.find(r => r.id === id) || ROLES[4];
const allUsers = () => store.get('es:users', []);
async function sha(text){
  try{ const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join(''); }
  catch{ return btoa(unescape(encodeURIComponent(text))); }
}
const publicUser = u => ({id:u.id, name:u.name, email:u.email, role:u.role, field:u.field, interests:u.interests, purpose:u.purpose});
async function registerUser(d){
  const list = allUsers(), email = d.email.trim().toLowerCase();
  if(list.some(u => u.email === email)) throw new Error('An account with this email already exists. Try logging in.');
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const u = {id:'u' + Date.now().toString(36) + Math.random().toString(36).slice(2,5), name:d.name.trim(), email, salt, hash:await sha(salt + d.password), role:d.role, field:d.field, interests:d.interests, purpose:d.purpose, created:Date.now()};
  store.set('es:users', [...list, u]); return u;
}
async function verifyUser(email, password){
  const u = allUsers().find(x => x.email === email.trim().toLowerCase());
  if(!u || u.hash !== await sha(u.salt + password)) throw new Error('Email or password is incorrect.');
  return u;
}
function setUser(u){
  S.user = u ? publicUser(u) : null;
  store.set('es:session', u ? u.id : null);
  document.body.classList.toggle('authed', !!u);
  if(u){
    const initials = u.name.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase() || 'EA';
    $('#userBtn').textContent = initials; $('#upName').textContent = u.name; $('#upEmail').textContent = u.email; $('#upRole').textContent = roleOf(u.role).label;
    setView(store.get(uKey('view'), null) || roleOf(u.role).view, false); renderPlanChip();
  }
}
function setView(v, persist = true){
  S.view = v; document.body.dataset.view = v;
  $$('[data-setview]').forEach(b => b.setAttribute('aria-pressed', b.dataset.setview === v));
  if(persist && S.user) store.set(uKey('view'), v);
  if(S.A) requestAnimationFrame(() => { renderChart(); refreshMosaics(); });
}
function closeUserPop(){ $('#userPop').hidden = true; $('#userBtn').setAttribute('aria-expanded','false'); }

/* auth dialog */
const AU = {mode:'register', step:1, role:null, interests:new Set(), d:{}};
function buildAuthChoices(){
  $('#roleGrid').innerHTML = ROLES.map(r => `<button type="button" class="role" data-role="${r.id}" aria-pressed="false">${ic(r.icon)}<span><b>${r.label}</b><small>${r.desc}</small></span></button>`).join('');
  $('#interestGrid').innerHTML = INTERESTS.map(t => `<button type="button" class="chip-opt" data-interest="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('');
  $('#rgField').innerHTML = `<option value="">Choose…</option>` + FIELDS.map(f => `<option>${esc(f)}</option>`).join('');
  $('#rgPurpose').innerHTML = `<option value="">Choose…</option>` + PURPOSES.map(f => `<option>${esc(f)}</option>`).join('');
}
function showAuthPane(){
  const reg = AU.mode === 'register';
  $('#loginForm').hidden = reg; $('#regForm1').hidden = !reg || AU.step !== 1; $('#regForm2').hidden = !reg || AU.step !== 2;
  $$('#auth .tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === AU.mode));
  $('#authTitle').textContent = !reg ? 'Welcome back' : AU.step === 1 ? 'Create your account' : 'Tell us how you will use it';
  $$('#auth .form-err').forEach(e => e.textContent = '');
}
function openAuth(mode = 'register', reason = ''){
  AU.mode = mode; AU.step = 1;
  $('#authReason').textContent = reason || (mode === 'register' ? 'Create a free account to continue.' : 'Log in to continue.');
  showAuthPane(); $('#auth').hidden = false; document.body.classList.add('modal-open');
  setTimeout(() => $(mode === 'register' ? '#rgName' : '#liEmail').focus(), 60);
}
function closeAuth(cancel = true){ $('#auth').hidden = true; document.body.classList.remove('modal-open'); if(cancel) S.pending = null; }
function afterAuth(welcome){
  closeAuth(false); renderPresets(); fillLocation(); if(world) world.labelsData(globeLabels());
  toast(welcome);
  if(S.pending){ const p = S.pending; S.pending = null; S.loc = withId(p.loc); $('#radius').value = String(p.radius); scan(); }
  else if(S.page === 'home' && S.state === 'selected'){ /* user can press Scan Area */ }
}
function wireAuth(){
  buildAuthChoices();
  $('#authClose').addEventListener('click', () => closeAuth(true));
  $('#auth').addEventListener('mousedown', e => { if(e.target.id === 'auth') closeAuth(true); });
  $$('#auth .tabs button').forEach(b => b.addEventListener('click', () => { AU.mode = b.dataset.mode; AU.step = 1; showAuthPane(); }));
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#liErr'); err.textContent = '';
    if(!$('#liEmail').value.trim() || !$('#liPass').value){ err.textContent = 'Enter your email and password.'; return; }
    try{ const u = await verifyUser($('#liEmail').value, $('#liPass').value); setUser(u); afterAuth(`Welcome back, ${u.name.split(' ')[0]}.`); }
    catch(ex){ err.textContent = ex.message; }
  });
  $('#regForm1').addEventListener('submit', e => {
    e.preventDefault(); const err = $('#rg1Err');
    const name = $('#rgName').value.trim(), email = $('#rgEmail').value.trim(), pass = $('#rgPass').value;
    if(!name){ err.textContent = 'Please enter your name.'; return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ err.textContent = 'Enter a valid email address.'; return; }
    if(pass.length < 6){ err.textContent = 'Password must be at least 6 characters.'; return; }
    if(allUsers().some(u => u.email === email.toLowerCase())){ err.textContent = 'That email is already registered. Use the Log in tab.'; return; }
    AU.d = {name, email, password:pass}; AU.step = 2; showAuthPane();
  });
  $('#roleGrid').addEventListener('click', e => { const b = e.target.closest('[data-role]'); if(!b) return; AU.role = b.dataset.role; $$('#roleGrid .role').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $('#interestGrid').addEventListener('click', e => { const b = e.target.closest('[data-interest]'); if(!b) return; const k = b.dataset.interest; AU.interests.has(k) ? AU.interests.delete(k) : AU.interests.add(k); b.setAttribute('aria-pressed', AU.interests.has(k)); });
  $('#rgBack').addEventListener('click', () => { AU.step = 1; showAuthPane(); });
  $('#regForm2').addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#rg2Err');
    if(!AU.role){ err.textContent = 'Pick the option that describes you best.'; return; }
    try{
      const u = await registerUser({...AU.d, role:AU.role, field:$('#rgField').value, interests:[...AU.interests], purpose:$('#rgPurpose').value});
      setUser(u); AU.d = {};
      afterAuth(`Account created. Your dashboard starts in ${roleOf(u.role).view} view.`);
    }catch(ex){ err.textContent = ex.message; AU.step = 1; showAuthPane(); $('#rg1Err').textContent = ex.message; }
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !$('#auth').hidden) closeAuth(true); });
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
  if(e.target.id === 'stage') sizeGlobe(); else if(e.target.id === 'chartWrap') renderChart(); else renderMosaic(e.target);
}));
mosaics.forEach(m => ro.observe(m)); ro.observe($('#stage')); ro.observe($('#chartWrap'));
const refreshMosaics = () => mosaics.forEach(m => { delete m.dataset.key; renderMosaic(m); });

/* ---------- hazard towers (Risk Monitoring) ---------- */
const HAZARDS = [
  {id:'quake', code:'T-01', name:'Seismic & Volcanic Tower', hazard:'Earthquakes and volcanoes', icon:'quake', src:'USGS Earthquake Catalog (M4+) and NASA EONET volcano reports, study period'},
  {id:'heat', code:'T-02', name:'Heat Tower', hazard:'Extreme heat', icon:'sun', src:'NASA POWER (MERRA-2) temperature'},
  {id:'drought', code:'T-03', name:'Drought Tower', hazard:'Drought', icon:'soil', src:'NASA POWER soil wetness and NASA GPM IMERG rainfall'},
  {id:'flood', code:'T-04', name:'Storm & Flood Tower', hazard:'Floods, storms and landslides', icon:'drop', src:'NASA GPM IMERG rainfall change and NASA EONET flood, storm and landslide events (GDACS, NOAA NHC, JTWC)'},
  {id:'dust', code:'T-05', name:'Dust Tower', hazard:'Windblown dust', icon:'wind', src:'NASA MERRA-2 aerosol diagnostics (surface dust PM2.5)'},
  {id:'sea', code:'T-06', name:'Sea-Level Tower', hazard:'Sea-level rise', icon:'waves', src:'NASA-SSH satellite altimetry (reference missions), 0.5 degree grid'}
];
const LEVEL = {low:['Low','#36E2B1'], moderate:['Moderate','#FFBE55'], high:['High','#FF6178'], na:['No data','#91AEC2'], scanning:['Scanning','#22D3EE']};
const clamp = (v, a=0, b=100) => Math.max(a, Math.min(b, v));
function dustSeaTowers(dust, sea, hzNote){
  const H = {};
  const D = dust;
  if(!D || !D.annual?.length) H.dust = {level:'na', score:0, headline:'NASA dust data unavailable', explain:`The NASA MERRA-2 aerosol series could not be loaded for this point${hzNote}.`, metrics:[], items:[]};
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
    metrics:[['Temperature change', sgn(dT) + ' °C'], [`Days ≥ ${A.hotBase} °C`, `${A.base.hot ?? '—'} → ${A.cur.hot ?? '—'} / yr`], ['Trend', A.trend ? sgn(A.trend.slope, 2) + ' °C/yr' : 'n/a']], items:[]};
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
  Object.assign(H, dustSeaTowers(A.dust, A.sea, hzNote));
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
    chips += `<g class="rchip" data-i="${i}"><rect x="${chx}" y="${chy}" width="${cw}" height="40" rx="8" fill="rgba(6,17,31,.92)" stroke="${col}" stroke-opacity=".7"/><text x="${chx+11}" y="${chy+17}" fill="#EAF8FF" font-family="Sora, sans-serif" font-weight="600" font-size="13">${defs[i].code}</text><circle cx="${chx+14}" cy="${chy+29}" r="3.4" fill="${col}"/><text x="${chx+23}" y="${chy+32.5}" fill="${col}" font-family="Inter, sans-serif" font-weight="700" font-size="11">${LEVEL[lv][0]}</text></g>`;
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
  $$('#towerList .tw-row').forEach(b => b.setAttribute('aria-pressed', +b.dataset.i === S.hazard));
}
function selectHazard(i){ S.hazard = i; applyHazardHighlight(); renderTowerDetail(); }
function renderTowerList(levels){
  $('#towerList').innerHTML = HAZARDS.map((h, i) => { const lv = levels[i]; return `<li><button class="tw-row" data-i="${i}" aria-pressed="${i === S.hazard}"><span class="tw-ic" style="color:${LEVEL[lv][1]}">${ic(h.icon)}</span><span class="tw-t"><b>${h.name}</b><small>${h.hazard}</small></span><span class="lvl lvl-${lv}">${LEVEL[lv][0]}</span></button></li>`; }).join('');
  $$('#towerList .tw-row').forEach(b => b.addEventListener('click', () => selectHazard(+b.dataset.i)));
  const n = k => levels.filter(l => l === k).length;
  $('#riskCounts').innerHTML = `<span class="lvl lvl-high">${n('high')} high</span><span class="lvl lvl-moderate">${n('moderate')} moderate</span><span class="lvl lvl-low">${n('low')} low</span>${n('na') ? `<span class="lvl lvl-na">${n('na')} no data</span>` : ''}`;
}
function renderTowerDetail(){
  if(!S.H) return;
  const h = HAZARDS[S.hazard], r = S.H[h.id], lv = LEVEL[r.level];
  let viz = {charts:[], analysis:[], note:''}, figs = '', tips = {};
  try{
    const pd = per(S.A); viz = towerViz(h.id, S.A, {years:pd.years, baseLabel:pd.baseLabel, curLabel:pd.curLabel});
    figs = viz.charts.map((c, i) => { const o = renderHzChart(c, `${h.id}${i}`); tips[`${h.id}${i}`] = o.tips; return o.html; }).join('');
  }catch(e){ console.warn('hazard charts', e); }
  $('#towerDetail').innerHTML = `<header><span class="td-ic" style="color:${lv[1]}">${ic(h.icon)}</span><div><p class="td-code">${h.code} · ${h.hazard}</p><h3>${h.name}</h3></div><span class="lvl lvl-${r.level}">${lv[0]}</span></header>
    <div class="meter" role="img" aria-label="Risk score ${r.score} out of 100"><span style="width:${r.score}%;background:${lv[1]}"></span></div>
    <p class="td-head">${esc(r.headline)}</p><p class="td-exp">${esc(r.explain)}</p>
    ${r.metrics.length ? `<div class="kv">${r.metrics.map(m => `<div><span>${esc(m[0])}</span><b>${esc(m[1])}</b></div>`).join('')}</div>` : ''}
    ${figs ? `<section class="hz-charts" aria-label="Charts for ${esc(h.name)}">${figs}</section>` : (r.level === 'na' ? '' : '<p class="td-exp">No chart is available for this tower with the data loaded.</p>')}
    ${viz.analysis.length ? `<h4>Analysis</h4><ul class="hz-analysis">${viz.analysis.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${viz.note ? `<p class="hz-note">${esc(viz.note)}</p>` : ''}` : ''}
    ${r.items.length ? `<h4>Recent events</h4><ul class="list">${r.items.map(e => `<li><div class="grow"><b>${esc(e.title)}</b><span>${esc(e.meta)}</span></div>${e.url ? `<a class="link-btn" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.tag || 'USGS')}</a>` : ''}</li>`).join('')}</ul>` : ''}
    <p class="td-src">Source: ${esc(h.src)}. Screening only. This is not an official hazard assessment or warning system.</p>`;
  wireHzCharts($('#towerDetail'), tips);
}
function renderRisk(){
  const has = !!S.A;
  $('#riskWrap').hidden = !has; $('#riskEmpty').hidden = has;
  if(!has) return;
  $('#riskSub').textContent = `${S.loc.name} · scanned ${ago(S.A.fetchedAt)} · ${S.A.radiusKm} km radius. Storms, floods, landslides and volcanoes come from NASA EONET; dust from NASA MERRA-2; sea level from NASA-SSH altimetry; earthquakes from USGS (EONET has none); heat, drought and rainfall signals from NASA POWER and GPM IMERG. Wildfires are not tracked: EONET does not separate natural from human-caused fires.`;
  refreshMosaics();
  const tok = ++S.riskTok, final = levelsOf(S.H), cur = HAZARDS.map(() => 'scanning');
  renderRiskStage(cur); renderTowerList(cur); renderTowerDetail();
  HAZARDS.forEach((_, i) => setTimeout(() => { if(tok !== S.riskTok || S.page !== 'risk') return; cur[i] = final[i]; renderRiskStage(cur); renderTowerList(cur); }, REDUCED ? 0 : 500 + i*380));
  announce('Risk towers are scanning ' + S.loc.name);
}

/* ---------- dashboard ---------- */
function renderDashboardCore(){
  const A = S.A, I = S.I = interpret(A);
  const hiItem = (icon, k, [val, tone, detail], flag) => `<div class="hi-item tone-${tone}"><span class="hi-ic">${ic(icon)}</span><div><p class="hi-k">${k}</p><p class="hi-v">${esc(val)}</p><p class="hi-d">${esc(detail)}</p></div>${flag ? `<span class="hi-flag">${ic(flag)}</span>` : ''}</div>`;
  $('#hiGrid').innerHTML = hiItem('sun','Solar potential', I.hi.solar, I.hi.solar[1]==='good'?'check':'') + hiItem('cloud','Climate indicator', I.hi.climate, I.hi.climate[1]==='warn'?'alert':'check') + hiItem('wind','Air quality', I.hi.air, I.hi.air[1]==='good'?'check':I.hi.air[1]==='warn'?'alert':'');

  // before / after
  { const pd = per(A); $('#baBeforeT').textContent = `Baseline ${pd.baseLabel}`; $('#baAfterT').textContent = `Current ${pd.curLabel}`; $('#baRange').textContent = `${pd.baseLabel} avg vs ${pd.curLabel} avg`; }
  $('#baBeforeVals').textContent = `${A.base.temp?.toFixed(1) ?? '—'} °C · ${A.base.rain ?? '—'} mm/yr`;
  $('#baAfterVals').textContent = `${A.cur.temp?.toFixed(1) ?? '—'} °C · ${A.cur.rain ?? '—'} mm/yr`;
  $('#baBeforeDate').textContent = A.img?.before ? `Imagery ${A.img.before.date}` : 'Current imagery';
  $('#baAfterDate').textContent = A.img?.after ? `Imagery ${A.img.after.date}` : 'Current imagery';
  $('#baNote').textContent = A.img ? (A.img.same ? 'No newer Wayback imagery for this tile in the chosen period — both panels show the same capture. Climate: NASA POWER.' : 'Imagery: Esri World Imagery Wayback (release dates; capture may be earlier). Climate: NASA POWER.') : 'Historical imagery unavailable — showing current imagery. Climate: NASA POWER.';

  // key changes
  const tiles = [
    {m:'temp', label:'Temperature', icon:'thermo', v:I.dT, text:`${sgn(I.dT)} °C`, from:`${A.base.temp?.toFixed(1)} → ${A.cur.temp?.toFixed(1)} °C`, flag:S.I.status[0]==='finding'},
    {m:'rain', label:'Rainfall', icon:'drop', v:I.dRain, text:I.dRain == null ? (I.dryRain ? 'Hyper-arid' : 'n/a') : `${sgn(I.dRain,0)}%${I.shortRain ? '*' : ''}`, from:`${A.base.rain ?? '—'} → ${A.cur.rain ?? '—'} mm/yr${I.shortRain ? ` · *short window: ${A.rainN.cur} yr vs ${A.rainN.base} yr` : ''}`, flag:S.I.status[1]==='finding'},
    {m:'hot', label:`Days ≥ ${A.hotBase} °C`, icon:'flame', v:I.dHot, text:I.dHot == null ? 'n/a' : `${sgn(I.dHot,0)}/yr`, from:`${A.base.hot ?? '—'} → ${A.cur.hot ?? '—'} days`, flag:I.dHot != null && I.dHot >= 5},
    {m:'soil', label:'Soil moisture', icon:'soil', v:I.drySoil ? A.cur.soil - A.base.soil : I.dSoil, text:I.drySoil ? 'Very dry' : I.dSoil == null ? 'n/a' : `${sgn(I.dSoil,0)}%`, from:A.base.soil == null ? 'n/a over water' : `${A.base.soil.toFixed(3)} → ${A.cur.soil.toFixed(3)}`, flag:I.dSoil != null && Math.abs(I.dSoil) >= 10}
  ];
  $('#kcGrid').innerHTML = tiles.map(t => { const dir = t.v == null || t.v === 0 ? 'flat' : t.v > 0 ? 'up' : 'down';
    return `<div class="kc-tile${t.flag?' flag':''}" data-metric="${t.m}"><span class="kc-ic">${ic(t.icon)}</span><div style="min-width:0"><p class="kc-k">${t.label}</p><p class="kc-v">${t.text}${ic(dir, `role="img" aria-label="${dir==='up'?'increased':dir==='down'?'decreased':'no change'}"`)}</p><p class="kc-s">${t.from}</p></div></div>`; }).join('');
  const tr = A.trend;
  $('#verdict').innerHTML = tr ? `<b>Trend ${per(A).label}:</b> ${sgn(tr.slope,2)} °C/yr — ${tr.sig ? 'statistically significant (95%)' : `not statistically significant (only ${tr.n} years)`}. Rainfall ${I.dRain == null ? (I.dryRain ? 'is hyper-arid (a few mm/yr), so no % change' : 'n/a') : I.dRain <= -5 ? 'decreased' : I.dRain >= 5 ? 'increased' : 'roughly stable'} vs baseline${I.shortRain ? ' (short rain window, not a trend)' : ''}.` : '<b>Trend:</b> insufficient data.';

  // forecast
  $$('.scen-btn').forEach(b => { const k = b.dataset.s, v = A.proj?.[k]?.[4];
    b.disabled = !A.proj; b.querySelector('.dv').textContent = v == null ? '—' : `${v.toFixed(1)} °C`;
    b.setAttribute('aria-label', `${b.querySelector('.nm').textContent}: ${v == null ? 'unavailable' : v.toFixed(1)+' °C in '+(per(A).projYears[4] ?? '')}`); });
  $('#scenNote').textContent = A.proj ? `Band: ${Object.keys(A.proj.models).length} CMIP6 models` : (A.nasa ? 'NASA NEX-GDDP-CMIP6 projections are not loaded yet. See the 12-month forecast below.' : 'CMIP6 projections unavailable for this point.');
  const rows = [...A.years.map(r => [r.year, r.temp, null, null, null]), ...per(A).projYears.map((y,i) => [y, null, A.proj?.low[i], A.proj?.mean[i], A.proj?.high[i]])];
  $('#fcTable tbody').innerHTML = rows.map(r => `<tr>${r.map(c => `<td>${c == null ? '—' : c}</td>`).join('')}</tr>`).join('');
  renderChart();
  renderNasaPanel();

  // status bar
  const ageMin = Math.round((Date.now() - A.fetchedAt)/60000);
  $('#sbChip span').textContent = ageMin < 2 ? 'Data ready' : `Cached · ${ageMin < 60 ? ageMin+' min' : Math.round(ageMin/60)+' h'} ago`;
  $('#sbSrc').textContent = A.nasa ? 'NASA POWER' : A.proj ? 'ERA5 · CMIP6' : 'ERA5';
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
  $('#nasaHead').innerHTML = `Long-term warming <b>${sgn(at.slope_per_decade, 2)} °C per decade</b> (${at.significant ? 'statistically significant' : 'not significant'}); summer <b>${sgn(sm.slope_per_decade, 2)} °C per decade</b>. Mann-Kendall test with Sen's slope on ${at.n_years} annual values.`;

  // chart 1: annual mean temperature + Sen trend line
  const yrs0 = [...new Set(s.month.map(m => +m.slice(0, 4)))];
  const ann = yrs0.map(y => { const v = s.month.map((m, i) => +m.slice(0, 4) === y ? s.t2m[i] : null).filter(x => x != null); return v.length === 12 ? mean(v) : null; });
  const slope = at.slope_per_decade / 10, ic0 = median(ann.map((v, i) => v == null ? null : v - slope * yrs0[i]));
  const idx = yrs0.map((_, i) => i), tk = idx.filter(i => (yrs0[i] - yrs0[0]) % 10 === 0).map(i => [i, yrs0[i]]); tk.push([idx.length - 1, yrs0[idx.length - 1]]);
  nasaSvg($('#nasaAnnual'), {n:idx.length, ticks:tk, lines:[
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
  $('#nasaTrends tbody').innerHTML = order.filter(k => tr[k]).map(k => { const t = tr[k];
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
  $('#dhSub').textContent = `${fmtLat(S.loc.lat)}, ${fmtLon(S.loc.lon)} · study period ${per(A).label} · ${A.radiusKm} km hazard radius · scanned ${ago(A.fetchedAt)}`;
  renderSummary(); renderAdvanced(); renderPlayful();
}

/* Basic: plain language */
function plainSummary(A, I){
  const n = S.loc.short, dT = I.dT;
  const head = dT == null ? `Here is what we found for ${n}.` : dT >= 0.3 ? `${n} is getting warmer.` : dT <= -0.3 ? `${n} has been a little cooler lately.` : `${n}'s temperature has stayed about the same.`;
  const pts = [];
  if(dT != null) pts.push({icon:'thermo', text:Math.abs(dT) < 0.3 ? `Average temperature is about the same as in ${per(A).baseLabel}.` : `The average temperature is ${Math.abs(dT).toFixed(1)} °C ${dT > 0 ? 'higher' : 'lower'} than in ${per(A).baseLabel}.`});
  if(I.dRain != null) pts.push({icon:'drop', text:I.dRain <= -10 ? `Recent years were drier: ${Math.abs(I.dRain)}% less rain than ${per(A).baseLabel}. Short windows, a few wet years can dominate.` : I.dRain >= 10 ? `Recent years were wetter: ${I.dRain}% more rain than ${per(A).baseLabel}. Short windows, a few wet years can dominate.` : 'The amount of yearly rain is about the same as before.'});
  pts.push({icon:'wind', text:!A.aq ? 'Air quality data is not available here right now.' : A.aq.pm25 <= 15 ? 'The air is clean (fine dust is low).' : A.aq.pm25 <= 35 ? 'The air is a little dusty. Sensitive people may notice.' : 'The air is quite dusty. Limit long outdoor exercise on bad days.'});
  const sol = A.cur.solar ?? A.base.solar;
  if(sol != null) pts.push({icon:'sun', text:sol >= 5 ? 'It is very sunny here, which is great for solar power.' : sol >= 4 ? 'There is a fair amount of sun for solar power.' : 'Sunshine is on the lower side for solar power.'});
  if(A.proj) pts.push({icon:'trend', text:`By ${per(A).projYears[4]} the average temperature is expected to be around ${A.proj.mean[4].toFixed(1)} °C.`});
  const watch = I.flags.length ? `Worth keeping an eye on: ${I.flags.slice(0, 3).map(f => f.t.toLowerCase()).join('; ')}. See Risk Monitoring for details.` : 'Nothing unusual stands out right now.';
  return {head, pts, watch, warn:I.flags.length > 0};
}
function renderSummary(){
  const {head, pts, watch, warn} = plainSummary(S.A, S.I);
  $('#sumBody').innerHTML = `<p class="sum-head">${esc(head)}</p><ul class="sum-list">${pts.map(p => `<li><span class="sum-ic">${ic(p.icon)}</span><span>${esc(p.text)}</span></li>`).join('')}</ul><p class="sum-watch ${warn ? 'warn' : 'ok'}">${ic(warn ? 'alert' : 'check')}<span>${esc(watch)}</span></p>`;
}

/* Advanced: all the detail */
function renderAdvanced(){
  const A = S.A, I = S.I, H = S.H, tr = A.trend;
  $('#advStats').innerHTML = `<div class="kv kv4">
    <div><span>Temperature change</span><b>${sgn(I.dT)} °C</b></div>
    <div><span>Rainfall change</span><b>${I.dRain == null ? (I.dryRain ? 'Hyper-arid' : 'n/a') : sgn(I.dRain,0) + '%'}</b></div>
    <div><span>Linear trend ${per(A).label}</span><b>${tr ? sgn(tr.slope,2) + ' °C/yr' : 'n/a'}</b></div>
    <div><span>Regression t (n=${tr ? tr.n : '—'})</span><b>${tr ? (Math.abs(tr.t) > 999 ? (tr.t > 0 ? '> 999' : '< −999') : tr.t.toFixed(2)) : 'n/a'}</b></div>
    <div><span>Significance (95%)</span><b>${tr ? (tr.sig ? 'Significant' : 'Not significant') : 'n/a'}</b></div>
    <div><span>${A.nasa ? 'NASA grid point' : 'ERA5 grid cell'}</span><b class="mono">${A.grid.lat.toFixed(2)}, ${A.grid.lon.toFixed(2)}</b></div>
    <div><span>Elevation (DEM)</span><b>${A.elev != null ? Math.round(A.elev) + ' m' : 'n/a'}</b></div>
    <div><span>PM2.5 mean (90 d)</span><b>${A.aq ? A.aq.pm25 + ' µg/m³' : 'n/a'}</b></div></div>
    <p>${tr ? `Ordinary least squares on ${tr.n} annual means: ${tr.sig ? 'the slope is significant at the 95% level.' : 'the slope is not significant at the 95% level, so treat it as directional.'}` : ''} Baseline (${per(A).baseLabel}) and current (${per(A).curLabel}) windows differ in length (${per(A).baseYears.length} vs ${per(A).curYears.length} years). Hot-day threshold ${A.hotBase} °C. Fetched ${new Date(A.fetchedAt).toISOString().replace('T',' ').slice(0,16)} UTC.</p>`;
  const r = A.years.map(y => `<tr><td>${y.year}</td><td>${y.temp?.toFixed(2) ?? '—'}</td><td>${y.rain ?? '—'}</td><td>${y.hot ?? '—'}</td><td>${y.soil ?? '—'}</td><td>${y.solar?.toFixed(2) ?? '—'}</td></tr>`).join('');
  const row = (lbl, o) => `<tr class="avg"><td>${lbl}</td><td>${o.temp?.toFixed(2) ?? '—'}</td><td>${o.rain ?? '—'}</td><td>${o.hot ?? '—'}</td><td>${o.soil ?? '—'}</td><td>${o.solar?.toFixed(2) ?? '—'}</td></tr>`;
  $('#advYears').innerHTML = `<table class="tbl"><thead><tr><th>Year</th><th>Mean temp °C</th><th>Rain mm</th><th>Days ≥ ${A.hotBase} °C</th><th>Soil m³/m³</th><th>Solar kWh/m²/d</th></tr></thead><tbody>${r}${row('Avg ' + per(A).baseLabel, A.base)}${row('Avg ' + per(A).curLabel, A.cur)}</tbody></table>`;
  if(A.proj){
    const names = Object.keys(A.proj.models);
    $('#advModels').innerHTML = `<table class="tbl"><thead><tr><th>Year</th>${names.map(n => `<th>${n.replace(/_/g,' ')}</th>`).join('')}<th>Low</th><th>Mean</th><th>High</th></tr></thead><tbody>${per(A).projYears.map((y,i) => `<tr><td>${y}</td>${names.map(n => `<td>${A.proj.models[n][i]?.toFixed(2) ?? '—'}</td>`).join('')}<td>${A.proj.low[i].toFixed(2)}</td><td>${A.proj.mean[i].toFixed(2)}</td><td>${A.proj.high[i].toFixed(2)}</td></tr>`).join('')}</tbody></table><p>Each CMIP6 HighResMIP model is bias-adjusted with the delta method: projected = ERA5 baseline (${per(A).baseLabel}) + the model's change relative to its own ${per(A).baseLabel} mean. A scenario projection, not a weather forecast.</p>`;
  } else $('#advModels').innerHTML = `<div class="empty">${per(A).proj ? 'CMIP6 projections were unavailable for this point.' : `Projections are only shown when the study period ends in ${LAST_YEAR}. This period ends in ${per(A).end}.`}</div>`;
  const towers = HAZARDS.map(h => `<tr><td>${h.code} ${h.name}</td><td><span class="lvl lvl-${H[h.id].level}">${LEVEL[H[h.id].level][0]}</span></td><td>${H[h.id].score}</td><td class="l">${esc(H[h.id].headline)}</td></tr>`).join('');
  const quakes = A.quakes ? (A.quakes.list.length ? A.quakes.list.slice(0, 12).map(e => `<tr><td>${new Date(e.time).toISOString().slice(0,10)}</td><td>M${e.mag.toFixed(1)}</td><td class="l">${esc(e.place || 'Unknown')}</td><td>${e.dist} km</td></tr>`).join('') : '') : '';
  $('#advHaz').innerHTML = `<table class="tbl"><thead><tr><th>Tower</th><th>Level</th><th>Score</th><th class="l">Finding</th></tr></thead><tbody>${towers}</tbody></table>
    <h3>Earthquakes M4+ within ${A.radiusKm} km, ${per(A).label}</h3>${A.quakes ? (quakes ? `<table class="tbl"><thead><tr><th>Date</th><th>Mag</th><th class="l">Place</th><th>Distance</th></tr></thead><tbody>${quakes}</tbody></table>` : '<div class="empty">None recorded.</div>') : '<div class="empty">USGS data unavailable.</div>'}`;
  $('#advExport').innerHTML = `<div class="btn-row"><button class="btn-primary" data-act="report-quick">${ic('file')}Save as report</button><button class="btn-secondary" data-act="csv">${ic('download')}Download CSV</button></div>
    <p>Sources: ${A.nasa ? 'NASA POWER (MERRA-2 / CERES) monthly data; NASA GPM IMERG V07 rainfall; NASA EONET events (storms, floods, landslides, volcanoes; notable events only); NASA MERRA-2 dust aerosol; NASA-SSH sea level; USGS Earthquake Catalog; Esri World Imagery Wayback. Grid values (~50 km) can differ from station records.' : 'ERA5 reanalysis (ECMWF / Copernicus) and CMIP6 via Open-Meteo; USGS Earthquake Catalog; Copernicus DEM; CAMS air quality; Esri World Imagery Wayback. Grid values (~25 km) can differ from station records.'} Screening rules are simple thresholds, not an official assessment.</p>`;
}

/* Playful: quizzes and games */
const XP_LEVELS = [['Rookie Explorer', 0], ['Weather Detective', 100], ['Climate Ranger', 250], ['Planet Guardian', 500]];
const xpData = () => store.get(uKey('xp'), {xp:0, done:{}});
function levelInfo(xp){ let i = 0; XP_LEVELS.forEach((l, k) => { if(xp >= l[1]) i = k; }); const nx = XP_LEVELS[i + 1]; return {i, level:i + 1, title:XP_LEVELS[i][0], from:XP_LEVELS[i][1], to:nx ? nx[1] : null}; }
function addXp(n, key){
  const d = xpData(); if(key){ if(d.done[key]) return 0; d.done[key] = 1; }
  d.xp += n; store.set(uKey('xp'), d); renderQuest(); return n;
}
function renderQuest(){
  const d = xpData(), L = levelInfo(d.xp), pctv = L.to ? Math.round((d.xp - L.from) / (L.to - L.from) * 100) : 100;
  $('#qLevelTag').textContent = `Level ${L.level}`;
  $('#questBody').innerHTML = `<div class="q-top"><span class="q-badge">${ic('trophy')}</span><div><p class="q-title">${L.title}</p><p class="q-sub">${d.xp} XP${L.to ? ` · ${L.to - d.xp} XP to the next rank` : ' · top rank reached'}</p></div></div><div class="meter meter-xp" role="img" aria-label="${pctv}% to next level"><span style="width:${pctv}%"></span></div><p class="q-hint">Earn XP by taking the quiz and guessing the future. XP counts once per place, so explore somewhere new for more.</p>`;
}
function funTiles(A, I){
  const n = S.loc.short, tiles = [];
  const dT = I.dT;
  if(dT != null) tiles.push({icon:'thermo', big:dT >= 0.3 ? 'Warmer' : dT <= -0.3 ? 'Cooler' : 'Steady', line:dT >= 0.6 ? 'Ice cream here has officially become a drink.' : dT >= 0.3 ? 'Ice cream melts a bit faster than it used to.' : dT <= -0.3 ? 'Penguins nod approvingly.' : 'The planet\'s thermostat is staying chill.', tone:dT >= 0.3 ? 'warn' : 'good'});
  if(I.dRain != null) tiles.push({icon:'drop', big:I.dRain >= 10 ? 'Wetter' : I.dRain <= -10 ? 'Drier' : 'Same rain', line:I.dRain >= 10 ? 'Umbrellas are working overtime.' : I.dRain <= -10 ? 'The plants are sending polite complaints.' : 'Umbrellas keep their normal hours.', tone:I.dRain <= -10 || I.dRain >= 20 ? 'warn' : 'good'});
  tiles.push({icon:'wind', big:!A.aq ? 'Unknown' : A.aq.pm25 <= 15 ? 'Clean air' : A.aq.pm25 <= 35 ? 'A bit hazy' : 'Dusty', line:!A.aq ? 'Our air sensors took a nap.' : A.aq.pm25 <= 15 ? 'Lungs say thank you.' : A.aq.pm25 <= 35 ? 'Maybe skip the marathon today.' : 'Masks are in fashion.', tone:!A.aq || A.aq.pm25 <= 15 ? 'good' : 'warn'});
  const sol = A.cur.solar ?? A.base.solar;
  tiles.push({icon:'sun', big:sol == null ? 'Unknown' : sol >= 5 ? 'Super sunny' : sol >= 4 ? 'Pretty sunny' : 'Gentle sun', line:sol == null ? 'The sun is being shy.' : sol >= 5 ? 'Solar panels work double shifts.' : sol >= 4 ? 'Solar panels are happy.' : 'Solar panels take lots of tea breaks.', tone:'good'});
  tiles.push({icon:'quake', big:!A.quakes ? 'Unknown' : A.quakes.count === 0 ? 'Calm ground' : `${A.quakes.count} wiggles`, line:!A.quakes ? 'The ground is keeping secrets.' : A.quakes.count === 0 ? 'No big shakes in this period.' : `Earthquakes of M4+ near ${n} in ${per(A).label}. Earth likes to stretch.`, tone:A.quakes && A.quakes.count >= 10 ? 'warn' : 'good'});
  return tiles;
}
const Q = {qs:[], i:0, score:0, locked:false, key:null};
function buildQuiz(A, I){
  const n = S.loc.short, qs = [];
  if(I.dT != null){ const a = I.dT >= 0.2 ? 'warm' : I.dT <= -0.2 ? 'cool' : 'same'; qs.push({t:`Is ${n} warmer or cooler now than in ${per(A).baseLabel}?`, o:[['warm','Warmer'],['cool','Cooler'],['same','About the same']], a, ok:`Yes! It changed by ${sgn(I.dT)} °C. Thermometers noticed.`, no:`Close, but the data says ${sgn(I.dT)} °C. Thermometers do not lie.`}); }
  if(I.dRain != null){ const a = I.dRain >= 5 ? 'more' : I.dRain <= -5 ? 'less' : 'same'; qs.push({t:`Compared with before, does it rain more or less each year in ${n}?`, o:[['more','More rain'],['less','Less rain'],['same','About the same']], a, ok:`Correct! Rain changed by ${sgn(I.dRain,0)}%. Clouds are impressed.`, no:`Nope, rain changed by ${sgn(I.dRain,0)}%. The clouds are laughing.`}); }
  const hot = A.years.filter(y => y.temp != null).sort((x, y) => y.temp - x.temp)[0];
  if(hot){ const yrs = [...new Set([hot.year, ...per(A).years].filter(y => y !== hot.year).slice(0, 3).concat(hot.year))].sort(); qs.push({t:`Which year was the hottest in ${n} between ${per(A).start} and ${per(A).end}?`, o:yrs.map(y => [String(y), String(y)]), a:String(hot.year), ok:`Right! ${hot.year} averaged ${hot.temp.toFixed(1)} °C.`, no:`It was ${hot.year}, at ${hot.temp.toFixed(1)} °C. Sunscreen would have helped.`}); }
  if(A.quakes){ const c = A.quakes.count, a = c === 0 ? 'none' : c < 10 ? 'few' : 'many'; qs.push({t:`How many earthquakes of M4+ happened within ${A.radiusKm} km in ${per(A).label}?`, o:[['none','None'],['few','1 to 9'],['many','10 or more']], a, ok:`Spot on: ${c}. Your instincts are seismic.`, no:`It was ${c}. The ground has been busier (or calmer) than you guessed.`}); }
  if(A.aq){ const p = A.aq.pm25, a = p <= 15 ? 'clean' : p <= 35 ? 'mid' : 'dusty'; qs.push({t:`How is the air in ${n}? (fine dust, PM2.5)`, o:[['clean','Clean'],['mid','A bit dusty'],['dusty','Very dusty']], a, ok:`Yes! ${p} µg/m³. Lungs approve this message.`, no:`It is ${p} µg/m³, so the answer differs from your guess. Air is sneaky.`}); }
  return qs.slice(0, 5);
}
function resetQuiz(){ Object.assign(Q, {qs:buildQuiz(S.A, S.I), i:0, score:0, locked:false, key:`${S.loc.id}:quiz`}); renderQuiz(); }
function renderQuiz(){
  const body = $('#quizBody'); if(!Q.qs.length){ body.innerHTML = '<div class="empty">Not enough data to make a quiz for this place.</div>'; $('#quizMeta').textContent = ''; return; }
  if(Q.i >= Q.qs.length){
    const perfect = Q.score === Q.qs.length;
    const bonus = perfect ? addXp(20, Q.key + ':perfect') : 0;
    $('#quizMeta').textContent = '';
    body.innerHTML = `<div class="quiz-end"><span class="q-badge big">${ic(perfect ? 'trophy' : 'star')}</span><h3>${perfect ? 'Perfect score!' : `You got ${Q.score} out of ${Q.qs.length}`}</h3><p>${perfect ? 'You read this place like a pro. Bonus XP unlocked.' : 'Not bad for a human! Try again to beat your score.'}</p><button class="btn-primary" data-act="quiz-again">${ic('refresh')}Play again</button></div>`; return;
  }
  const q = Q.qs[Q.i]; $('#quizMeta').innerHTML = `<span class="tag">Question ${Q.i + 1} of ${Q.qs.length}</span><span class="tag mint">${Q.score} correct</span>`;
  body.innerHTML = `<p class="quiz-q">${esc(q.t)}</p><div class="quiz-opts">${q.o.map(o => `<button class="quiz-opt" data-act="quiz-pick" data-k="${esc(o[0])}">${esc(o[1])}</button>`).join('')}</div><div class="quiz-fb" id="quizFb" aria-live="polite"></div>`;
}
function quizPick(k, btn){
  if(Q.locked) return; Q.locked = true; const q = Q.qs[Q.i], right = k === q.a;
  $$('#quizBody .quiz-opt').forEach(b => { b.disabled = true; if(b.dataset.k === q.a) b.classList.add('right'); else if(b === btn) b.classList.add('wrong'); });
  if(right){ Q.score++; addXp(20, `${Q.key}:${Q.i}`); }
  $('#quizFb').innerHTML = `<p class="${right ? 'ok' : 'no'}">${ic(right ? 'check' : 'alert')}<span>${esc(right ? q.ok : q.no)}</span></p><button class="btn-primary" data-act="quiz-next">${Q.i + 1 >= Q.qs.length ? 'See my score' : 'Next question'}</button>`;
  $('#quizMeta').innerHTML = `<span class="tag">Question ${Q.i + 1} of ${Q.qs.length}</span><span class="tag mint">${Q.score} correct</span>`;
}
const G = {done:false};
function renderGuess(){
  const A = S.A, el = $('#guessBody'); G.done = false;
  if(!A.proj || A.cur.temp == null){ el.innerHTML = '<div class="empty">Future models are not available for this place.</div>'; return; }
  const c = A.cur.temp, min = Math.floor((c - 1) * 2) / 2, max = Math.ceil((c + 3) * 2) / 2;
  el.innerHTML = `<p class="quiz-q">What will the average yearly temperature in ${esc(S.loc.short)} be in ${per(A).projYears[4]}?</p><p class="muted">Right now (${per(A).curLabel}) it is ${c.toFixed(1)} °C.</p>
    <div class="guess-row"><input id="guessRange" type="range" min="${min}" max="${max}" step="0.1" value="${(c + 0.6).toFixed(1)}" aria-label="Your guess in °C"><output id="guessOut" class="guess-out">${(c + 0.6).toFixed(1)} °C</output></div>
    <button class="btn-primary" data-act="guess-lock">${ic('bolt')}Lock in my guess</button><div class="quiz-fb" id="guessFb" aria-live="polite"></div>`;
  $('#guessRange').addEventListener('input', e => { $('#guessOut').textContent = (+e.target.value).toFixed(1) + ' °C'; });
}
function guessLock(){
  if(G.done) return; G.done = true; const A = S.A, g = +$('#guessRange').value, t = A.proj.mean[4], diff = Math.abs(g - t);
  const [xp, word, joke] = diff <= 0.3 ? [30, 'Bullseye', 'You might be a climate model in disguise.'] : diff <= 0.8 ? [15, 'Close', 'Not bad. The models were within shouting distance.'] : [5, 'Not quite', 'The future is tricky. That is why scientists use four models.'];
  const got = addXp(xp, `${S.loc.id}:guess`);
  $('#guessRange').disabled = true; $$('[data-act="guess-lock"]').forEach(b => b.disabled = true);
  $('#guessFb').innerHTML = `<p class="${diff <= 0.8 ? 'ok' : 'no'}">${ic(diff <= 0.8 ? 'check' : 'alert')}<span><b>${word}!</b> The models expect about <b>${t.toFixed(1)} °C</b> (range ${A.proj.low[4].toFixed(1)} to ${A.proj.high[4].toFixed(1)}). You guessed ${g.toFixed(1)} °C. ${joke}${got ? ` +${got} XP` : ' XP already earned for this place.'}</span></p>`;
}
function renderPlayful(){
  renderQuest();
  $('#funGrid').innerHTML = funTiles(S.A, S.I).map(t => `<div class="fun-tile tone-${t.tone}"><span class="fun-ic">${ic(t.icon)}</span><b>${esc(t.big)}</b><p>${esc(t.line)}</p></div>`).join('');
  resetQuiz(); renderGuess();
}

let chartGeom = null;
function renderChart(){
  const A = S.A, wrap = $('#chartWrap'), svg = $('#chart'); if(!A) return;
  const pd = per(A), OBS_YEARS = pd.years, PROJ_YEARS = pd.projYears, LO = OBS_YEARS[OBS_YEARS.length-1];
  const W = wrap.clientWidth, H = wrap.clientHeight; if(W < 80 || H < 60) return;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const xs = A.proj ? [...OBS_YEARS, ...PROJ_YEARS] : OBS_YEARS;
  const obs = A.years.map(r => r.temp);
  const vals = [...obs, A.cur.temp, ...(A.proj ? [...A.proj.low, ...A.proj.high] : [])].filter(v => v != null);
  const lo = Math.floor((Math.min(...vals) - 0.15)*2)/2, hi = Math.ceil((Math.max(...vals) + 0.15)*2)/2, step = (hi - lo) > 3 ? 1 : 0.5;
  const L = 40, R = 96, T = 12, B = 22, n = xs.length;
  const X = y => L + (y - xs[0]) * (W - L - R) / (n - 1), Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  let g = '';
  for(let t = lo; t <= hi + 1e-9; t += step) g += `<line x1="${L}" x2="${W-R+8}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${L-7}" y="${Y(t)+4}" text-anchor="end">${t.toFixed(step < 1 ? 1 : 0)}°</text>`;
  const every = (W - L - R) / n < 34 ? 2 : 1;
  xs.forEach((y, i) => { if(i === n-1 || (i % every === 0 && !(every > 1 && i === n-2))) g += `<text x="${X(y)}" y="${H-5}" text-anchor="middle">${y}</text>`; });
  if(A.proj) g += `<line class="divider" x1="${(X(LO)+X(PROJ_YEARS[0]))/2}" x2="${(X(LO)+X(PROJ_YEARS[0]))/2}" y1="${T}" y2="${H-B}"/>`;
  $('#fcGrid').innerHTML = g;
  $('#fcRef').innerHTML = '';
  const pts = (ys, arr) => ys.map((y,i) => arr[i] == null ? null : `${X(y).toFixed(1)} ${Y(arr[i]).toFixed(1)}`).filter(Boolean);
  $('#obsLine').setAttribute('d', 'M' + pts(OBS_YEARS, obs).join(' L'));
  const k = S.scenario, col = {low:'#36E2B1', mean:'#22D3EE', high:'#FFBE55'}[k];
  const lastObs = obs[obs.length-1];
  const labels = [];
  let dots = OBS_YEARS.map((y,i) => obs[i] == null ? '' : `<circle class="dot" r="4" cx="${X(y)}" cy="${Y(obs[i])}" style="fill:#cfe3ef"/>`).join('');
  labels.push(`<text class="lbl" x="${X(OBS_YEARS[0])}" y="${Math.max(T+10, Y(Math.max(...obs.filter(v=>v!=null))) - 10)}">${A.nasa ? 'NASA POWER' : 'ERA5'} observed</text>`);
  if(A.proj){
    const band = `M${X(LO)} ${Y(lastObs)} ` + PROJ_YEARS.map((y,i) => `L${X(y)} ${Y(A.proj.high[i])}`).join(' ') + ' ' + [...PROJ_YEARS].reverse().map((y,i) => `L${X(y)} ${Y(A.proj.low[4-i])}`).join(' ') + ' Z';
    $('#fcBand').setAttribute('d', band);
    const line = `M${X(LO).toFixed(1)} ${Y(lastObs).toFixed(1)} L` + pts(PROJ_YEARS, A.proj[k]).join(' L');
    const ln = $('#fcLine'); ln.style.d = `path("${line}")`; ln.style.stroke = col;
    dots += PROJ_YEARS.map((y,i) => `<circle class="dot" r="4.5" cx="${X(y)}" cy="${Y(A.proj[k][i])}" style="fill:${col}"/>`).join('');
    const name = {low:'Model low', mean:'Ensemble mean', high:'Model high'}[k];
    labels.push(`<text class="lbl" x="${X(PROJ_YEARS[4])+9}" y="${Y(A.proj[k][4])+4}">${A.proj[k][4].toFixed(1)} °C</text><text x="${X(PROJ_YEARS[4])+9}" y="${Y(A.proj[k][4])+18}">${name}</text>`);
  } else { $('#fcBand').removeAttribute('d'); $('#fcLine').style.d = 'none'; }
  $('#fcDots').innerHTML = dots; $('#fcLabels').innerHTML = labels.join('');
  const hit = $('#fcHit'); hit.setAttribute('x', L); hit.setAttribute('y', T); hit.setAttribute('width', Math.max(0, W-L-R+8)); hit.setAttribute('height', Math.max(0, H-T-B));
  chartGeom = {X, Y, xs, T, B, H, L, W, R};
}
function chartHover(e){
  if(!chartGeom || !S.A) return; const {X, Y, xs, T, H, B, L, W, R} = chartGeom, A = S.A, pd = per(S.A), OBS_YEARS = pd.years, PROJ_YEARS = pd.projYears, rect = $('#chartWrap').getBoundingClientRect();
  const i = Math.max(0, Math.min(xs.length-1, Math.round((e.clientX - rect.left - L) / ((W-L-R)/(xs.length-1))))), yr = xs[i];
  const oi = OBS_YEARS.indexOf(yr), pi = PROJ_YEARS.indexOf(yr);
  const v = oi >= 0 ? A.years[oi].temp : A.proj[S.scenario][pi]; if(v == null) return;
  const xh = $('#fcXh'); xh.setAttribute('x1', X(yr)); xh.setAttribute('x2', X(yr)); xh.setAttribute('y1', T); xh.setAttribute('y2', H-B); xh.style.opacity = .8;
  const tip = $('#fcTip'); tip.style.left = X(yr)+'px'; tip.style.top = (Y(v)-6)+'px'; tip.style.opacity = 1;
  tip.innerHTML = oi >= 0 ? `<span>${yr} · ${S.A?.nasa ? 'NASA POWER' : 'ERA5'} observed</span><br><b>${v.toFixed(2)} °C</b>` : `<span>${yr} · CMIP6 ${S.scenario === 'mean' ? 'ensemble mean' : 'model '+S.scenario}</span><br><b>${v.toFixed(2)} °C</b> <span>range ${A.proj.low[pi].toFixed(1)}–${A.proj.high[pi].toFixed(1)}</span>`;
}
$('#fcHit').addEventListener('pointermove', chartHover);
$('#fcHit').addEventListener('pointerleave', () => { $('#fcTip').style.opacity = 0; $('#fcXh').style.opacity = 0; });
$$('.scen-btn').forEach(b => b.addEventListener('click', () => { S.scenario = b.dataset.s; $$('.scen-btn').forEach(x => x.setAttribute('aria-pressed', x === b)); renderChart(); announce(`${b.querySelector('.nm').textContent} shown.`); }));


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
const PAGE_LABEL = {dashboard:'the dashboard', projects:'Projects', risk:'Risk Monitoring', tracking:'Hazard Tracking', compare:'Compare places', reports:'Reports', plans:'Plans', profile:'your profile'};
function setPage(p){
  S.page = p; document.body.dataset.page = p;
  $$('.topnav [data-nav]').forEach(b => b.toggleAttribute('aria-current', b.dataset.nav === p));
  $$('.topnav [aria-current]').forEach(b => b.setAttribute('aria-current', 'page'));
  closeUserPop();
  requestAnimationFrame(() => { sizeGlobe(); refreshMosaics(); renderChart(); });
}
function goHome(){
  S.token++; S.riskTok++; setPage('home');
  if(S.state !== 'selected') setState('idle'); else updateGlobe();
  announce('Explore the globe, search, or click anywhere on Earth.');
}
function go(p){
  if(p === 'home') return goHome();
  if(!S.user){ openAuth('login', `Log in to open ${PAGE_LABEL[p]}.`); return; }
  if(p === 'dashboard'){
    if(S.A){ setPage('dashboard'); if(S.state !== 'scanning') showResults(); return; }
    const r = recents()[0];
    if(r){ S.loc = withId(r); scan(); return; }
    toast('Pick a region on the globe and press Scan Area first.'); goHome(); return;
  }
  S.riskTok++; setPage(p);
  if(p === 'projects') renderProjects(); else if(p === 'risk') renderRisk(); else if(p === 'reports') renderReports(); else if(p === 'tracking') renderTracking(); else if(p === 'compare') renderCompare(); else if(p === 'plans') renderPlans(); else if(p === 'profile') renderProfile();
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
/* Home -> Scan: ask for an account first */
function requestScan(){
  if(!S.user){ S.pending = {loc:S.loc, radius:+$('#radius').value}; openAuth('register', `Create a free account to scan ${S.loc.short}.`); return; }
  scan();
}
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
  if(!S.A) return;
  S.loc = S.A.loc; fillLocation(); syncScanCtl(); renderDashboard(); renderInset(); setState('results');
  $('#stExplain').textContent = 'Scan complete. Switch views above, or open Risk Monitoring to see one tower per natural hazard.';
  $('#sbChip').className = 'chip ok';
  setTimeout(() => { refreshMosaics(); renderChart(); }, 950);
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
const reportsOf = () => store.get(uKey('reports'), []);
const SECTIONS = [['summary','Summary and indicators'],['years','Yearly climate record'],['projection','Outlook projection'],['towers','Risk tower results'],['hazards','Earthquake list']];
function renderReports(){
  const reps = reportsOf(), has = !!S.A;
  $('#pageReports').innerHTML = `<div class="page-in"><header class="page-h"><div><h1>${ic('file')}Reports</h1><p>Save the research you did as a report, then download it as a PDF or keep the data as CSV.</p></div></header>
    <div class="rep-new card">${has ? `<h2>${ic('plus')}New report from your current scan</h2>
      <div class="rep-form"><label>Title<input id="rpTitle" type="text" value="${esc(S.loc.short)} climate and hazard study"></label>
      <label>Notes <span>(optional)</span><textarea id="rpNotes" rows="3" placeholder="Your findings, questions, next steps…"></textarea></label>
      <fieldset><legend>Include</legend><div class="chips">${SECTIONS.map(s => `<label class="chk"><input type="checkbox" class="rp-sec" value="${s[0]}" checked><span>${s[1]}</span></label>`).join('')}</div></fieldset>
      <div class="btn-row"><button class="btn-primary" data-act="report-save">${ic('check')}Save report</button><button class="btn-secondary" data-act="report-save-pdf">${ic('print')}Save and download PDF</button></div></div>`
      : `<h2>${ic('plus')}New report</h2><p class="muted">Scan a region first. Your report is built from the scan results.</p><button class="btn-primary" data-act="go-home">${ic('pin')}Pick a region</button>`}</div>
    <h2 class="sec-h">Saved reports (${reps.length})</h2>
    ${reps.length ? `<ul class="rep-list">${reps.map(r => `<li class="card rep-item"><span class="rep-ic">${ic('file')}</span><div class="grow"><b>${esc(r.title)}</b><span>${esc(r.loc.name)} · ${new Date(r.createdAt).toLocaleString()} · ${r.sections.length} section${r.sections.length === 1 ? '' : 's'}</span>${r.notes ? `<em>${esc(r.notes.slice(0, 140))}${r.notes.length > 140 ? '…' : ''}</em>` : ''}</div>
      <div class="rep-actions"><button class="btn-ghost" data-act="report-view" data-id="${r.id}">${ic('eye')}Preview</button><button class="btn-primary" data-act="report-pdf" data-id="${r.id}">${ic('print')}PDF</button><button class="btn-ghost" data-act="report-csv" data-id="${r.id}">${ic('download')}CSV</button><button class="icon-btn" data-act="report-del" data-id="${r.id}" aria-label="Delete report ${esc(r.title)}">${ic('trash')}</button></div></li>`).join('')}</ul>`
      : `<div class="empty-state">${ic('file')}<h3>No saved reports</h3><p>Reports you save will appear here so you can open them again later.</p></div>`}</div>`;
}
function saveReport(title, notes, sections){
  if(!canAdd('reports')){ upsell('reports'); return null; }
  const rep = {id:'r' + Date.now().toString(36), title:title || `${S.loc.short} report`, notes:notes || '', sections, createdAt:Date.now(), view:S.view, loc:S.A.loc, A:S.A};
  try{ localStorage.setItem(uKey('reports'), JSON.stringify([rep, ...reportsOf()].slice(0, 25))); }catch{ toast('Storage is full. Delete an old report first.'); return null; }
  return rep;
}
function csvText(A, loc){
  const rows = [['location', loc.name], ['latitude', loc.lat], ['longitude', loc.lon], ['era5_grid', `${A.grid.lat},${A.grid.lon}`], ['fetched', new Date(A.fetchedAt).toISOString()], [],
    ['year','source','mean_temp_c','rain_mm','hot_days','soil_m3m3','solar_kwh_m2_day','model_low_c','ensemble_mean_c','model_high_c']];
  A.years.forEach(y => rows.push([y.year,A.nasa ? 'NASA POWER' : 'ERA5',y.temp,y.rain,y.hot,y.soil,y.solar,'','','']));
  if(A.proj) per(A).projYears.forEach((y,i) => rows.push([y,'CMIP6','','','','','',A.proj.low[i],A.proj.mean[i],A.proj.high[i]]));
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
  const author = S.user ? `${esc(S.user.name)} (${esc(roleOf(S.user.role).label)})` : 'Earthanova user';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(rep.title)}</title><style>body{font:14px/1.5 Inter,system-ui,sans-serif;color:#0b1b2b;max-width:860px;margin:32px auto;padding:0 24px}h1{font:700 26px Sora,system-ui;margin:0}h2{font:600 17px Sora,system-ui;margin:26px 0 8px;border-bottom:2px solid #22D3EE;padding-bottom:4px}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}td,th{border-bottom:1px solid #d6e2ea;padding:6px 8px;text-align:right}td:first-child,th:first-child{text-align:left}th{color:#45627a;font-weight:600}.muted{color:#45627a}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.box{border:1px solid #d6e2ea;border-radius:10px;padding:10px 12px}.box b{display:block;font-size:18px}ul{padding-left:18px}.notes{white-space:pre-wrap;background:#f1f7fa;border-radius:10px;padding:10px 12px}@media print{.noprint{display:none}}</style></head><body>
  <p class="noprint"><button onclick="print()">Print / Save as PDF</button></p>
  <h1>${esc(rep.title)}</h1><p class="muted">${esc(loc.name)} · ${fmtLat(loc.lat)}, ${fmtLon(loc.lon)} · ${A.nasa ? 'NASA POWER' : 'ERA5'} grid ${A.grid.lat.toFixed(2)}, ${A.grid.lon.toFixed(2)} · elevation ${A.elev != null ? Math.round(A.elev) + ' m' : 'n/a'}<br>Prepared by ${author} on ${new Date(rep.createdAt).toLocaleDateString()} · data fetched ${d} UTC</p>
  ${rep.notes ? `<h2>Notes</h2><p class="notes">${esc(rep.notes)}</p>` : ''}
  ${has('summary') ? `<h2>Summary</h2><div class="grid"><div class="box">Temperature change<b>${sgn(I.dT)} °C</b><span class="muted">${per(A).baseLabel} → ${per(A).curLabel}</span></div><div class="box">Rainfall change<b>${I.dRain == null ? (I.dryRain ? 'Hyper-arid' : 'n/a') : sgn(I.dRain,0) + '%'}</b><span class="muted">${A.base.rain ?? '—'} → ${A.cur.rain ?? '—'} mm/yr</span></div><div class="box">Trend<b>${A.trend ? sgn(A.trend.slope,2) + ' °C/yr' : 'n/a'}</b><span class="muted">${A.trend ? (A.trend.sig ? 'significant (95%)' : 'not significant') : ''}</span></div></div>
    <h2>Indicators</h2><ul><li>Solar: ${esc(I.hi.solar[0])} (${esc(I.hi.solar[2])})</li><li>Climate: ${esc(I.hi.climate[0])} (${esc(I.hi.climate[2])})</li><li>Air quality: ${esc(I.hi.air[0])} (${esc(I.hi.air[2])})</li></ul>
    <h2>Screening flags</h2>${I.flags.length ? `<ul>${I.flags.map(f => `<li>${esc(f.t)}</li>`).join('')}</ul>` : '<p>No thresholds exceeded.</p>'}` : ''}
  ${has('towers') ? `<h2>Risk tower results</h2><table><thead><tr><th>Tower</th><th>Level</th><th style="text-align:left">Finding</th></tr></thead><tbody>${tw}</tbody></table>` : ''}
  ${has('years') ? `<h2>Yearly record (${A.nasa ? 'NASA POWER' : 'ERA5'})</h2><table><thead><tr><th>Year</th><th>Mean °C</th><th>Rain mm</th><th>Days ≥ ${A.hotBase} °C</th><th>Soil m³/m³</th><th>Solar kWh/m²/d</th></tr></thead><tbody>${tr}</tbody></table>` : ''}
  ${has('projection') && A.proj ? `<h2>Projection ${rng(per(A).projYears)} (CMIP6, bias-adjusted)</h2><table><thead><tr><th>Year</th><th>Model low</th><th>Ensemble mean</th><th>Model high</th></tr></thead><tbody>${pr}</tbody></table>` : ''}
  ${has('hazards') ? `<h2>Earthquakes M4+ within ${A.radiusKm} km, ${per(A).label}</h2>${A.quakes ? (A.quakes.list.length ? `<table><thead><tr><th>Date</th><th>Magnitude</th><th>Place</th><th>Distance</th></tr></thead><tbody>${A.quakes.list.slice(0,15).map(e => `<tr><td>${new Date(e.time).toISOString().slice(0,10)}</td><td>${e.mag.toFixed(1)}</td><td style="text-align:left">${esc(e.place)}</td><td>${e.dist} km</td></tr>`).join('')}</tbody></table>` : '<p>None recorded.</p>') : '<p>Unavailable.</p>'}` : ''}
  <h2>Sources &amp; limitations</h2><p class="muted">${A.nasa ? 'NASA POWER (MERRA-2 / CERES) monthly data; NASA GPM IMERG V07 rainfall; NASA EONET events; NASA MERRA-2 dust; NASA-SSH sea level; USGS Earthquake Catalog; Esri World Imagery Wayback. Grid-cell values (~50 km) may differ' : 'ERA5 reanalysis (Copernicus/ECMWF) and CMIP6 HighResMIP via Open-Meteo; USGS Earthquake Catalog; CAMS air quality; Copernicus DEM; Esri World Imagery Wayback. Grid-cell values (~25 km) may differ'} from station records. Screening rules are simple thresholds and not an official assessment. Projections are scenario-based, not forecasts.</p>
  ${autoPrint ? '<script>addEventListener("load",()=>setTimeout(()=>print(),400))<\/script>' : ''}</body></html>`;
}
function openReport(rep, autoPrint){
  const url = URL.createObjectURL(new Blob([reportHTML(rep, autoPrint)], {type:'text/html'})), w = window.open(url, '_blank');
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
function closeDialog(){ $('#dlg').hidden = true; if($('#auth').hidden) document.body.classList.remove('modal-open'); }
$('#dlg').addEventListener('mousedown', e => { if(e.target.id === 'dlg') closeDialog(); });

/* ---------- plans & subscription ---------- */
const PRICE_PRO = '$12';
const PLANS = {
  basic:{id:'basic', name:'Basic', price:'Free', per:'', blurb:'For curious people, students and first projects.', limits:{projects:3, reports:3, tracked:1},
    feats:['Scan any place for any study period', 'Basic, Advanced and Playful dashboards', 'Risk Monitoring towers', 'Compare places before you travel', 'Up to 3 projects and 3 saved reports', 'Track 1 region with Hazard Tracking']},
  pro:{id:'pro', name:'Pro', price:PRICE_PRO, per:'/ month', blurb:'For researchers, developers and working professionals.', limits:{projects:50, reports:50, tracked:10},
    feats:['Everything in Basic', 'Up to 50 projects', 'Up to 50 saved reports', 'Track up to 10 regions with Hazard Tracking']},
  org:{id:'org', name:'Organization', price:'Custom', per:'', contact:true, blurb:'For teams, institutes and companies.', limits:{projects:Infinity, reports:Infinity, tracked:Infinity},
    feats:['Everything in Pro', 'Unlimited projects, reports and tracked regions', 'Onboarding for your team', 'Plan set up and managed by our team: contact sales']}
};
const LIMIT_LABEL = {projects:'projects', reports:'saved reports', tracked:'tracked regions'};
const lim = v => v === Infinity ? 'Unlimited' : v;
const subOf = () => store.get(uKey('sub'), null) || {plan:'basic', status:'active', since:S.user?.created || Date.now(), renews:null, history:[{at:Date.now(), plan:'basic', note:'Account created on the Basic plan'}]};
const planOf = () => PLANS[subOf().plan] || PLANS.basic;
const orgReq = () => store.get(uKey('orgreq'), null);
function setPlan(plan, note){
  const s = subOf(); s.plan = plan; s.status = 'active'; s.since = Date.now(); s.renews = plan === 'pro' ? Date.now() + 30*864e5 : null;
  s.history = [{at:Date.now(), plan, note}, ...(s.history || [])].slice(0, 20); store.set(uKey('sub'), s); renderPlanChip();
}
function renderPlanChip(){ if(S.user) $('#upPlan').textContent = `${planOf().name} plan`; }
const trackList = () => store.get(uKey('track'), []);
const usage = () => ({projects:favs().length, reports:reportsOf().length, tracked:trackList().length});
const canAdd = kind => usage()[kind] < planOf().limits[kind];
function upsell(kind){
  const p = planOf();
  showDialog({title:'Plan limit reached', body:`<p>Your ${p.name} plan includes up to ${lim(p.limits[kind])} ${LIMIT_LABEL[kind]}. Upgrade your plan to add more.</p>`, actions:[{label:'Not now'}, {label:'See plans', cls:'btn-primary', fn:() => { go('plans'); }}]});
}
function usageMeters(){
  const u = usage(), p = planOf();
  return Object.keys(LIMIT_LABEL).map(k => { const l = p.limits[k], pct = l === Infinity ? 8 : Math.min(100, Math.round(u[k] / l * 100)); return `<div class="use"><div class="use-h"><span>${LIMIT_LABEL[k][0].toUpperCase() + LIMIT_LABEL[k].slice(1)}</span><b>${u[k]} / ${lim(l)}</b></div><div class="meter"><span style="width:${pct}%;background:${pct >= 100 ? 'var(--amber)' : 'var(--cyan)'}"></span></div></div>`; }).join('');
}
function renderPlans(){
  const cur = subOf().plan, req = orgReq();
  const card = p => {
    const isCur = cur === p.id;
    let cta;
    if(p.id === 'basic') cta = isCur ? '<button class="btn-secondary" disabled>Current plan</button>' : '<button class="btn-secondary" data-act="plan-basic">Switch to Basic</button>';
    else if(p.id === 'pro') cta = isCur ? '<button class="btn-secondary" disabled>Current plan</button>' : '<button class="btn-primary" data-act="plan-pro">Upgrade to Pro</button>';
    else cta = isCur ? '<button class="btn-secondary" disabled>Current plan</button>' : `<button class="btn-primary" data-act="plan-org">${ic('mail')}${req ? 'Update contact request' : 'Contact sales'}</button>`;
    return `<article class="plan${p.id === 'pro' ? ' plan-hot' : ''}${isCur ? ' plan-cur' : ''}">${p.id === 'pro' ? '<span class="plan-tag">Most popular</span>' : ''}${isCur ? '<span class="plan-tag cur">Your plan</span>' : ''}
      <h3>${p.name}</h3><p class="plan-blurb">${p.blurb}</p><p class="plan-price"><b>${p.price}</b> <span>${p.per}</span></p>
      <ul class="plan-feats">${p.feats.map(f => `<li>${ic('check')}<span>${f}</span></li>`).join('')}</ul>
      ${p.id === 'org' && req ? `<p class="plan-note">${ic('mail')}Request sent ${ago(req.at)}. Our team will contact you at ${esc(req.email)}.</p>` : ''}
      <div class="plan-cta">${cta}</div></article>`;
  };
  $('#pagePlans').innerHTML = `<div class="page-in"><header class="page-h"><div><h1>${ic('star')}Plans &amp; subscription</h1><p>Choose the plan that fits how you use Earthanova. Pro is self-service. The Organization plan is set up with our team: send us a request and we will get in touch.</p></div></header>
    <div class="plan-grid">${Object.values(PLANS).map(card).join('')}</div>
    <div class="card plan-use"><h2>${ic('bars')}Your usage on the ${planOf().name} plan</h2><div class="use-grid">${usageMeters()}</div></div>
    <p class="muted foot">Prototype note: billing is simulated in this demo. No card is charged and no payment details are collected.</p></div>`;
}
function proDialog(){
  showDialog({title:'Upgrade to Pro', body:`<p>Pro is ${PRICE_PRO} per month and includes up to 50 projects, 50 saved reports and 10 tracked regions.</p><p class="muted">Demo billing: nothing is charged in this prototype. Activating Pro starts a 30-day subscription period you can track in your profile.</p>`,
    actions:[{label:'Cancel'}, {label:'Activate Pro', cls:'btn-primary', fn:() => { setPlan('pro', `Upgraded to Pro (${PRICE_PRO}/month)`); toast('You are now on Pro.'); rerenderAccountPages(); }}]});
}
function orgDialog(){
  const r = orgReq() || {}, u = S.user;
  showDialog({title:'Contact sales: Organization plan', body:`<form class="form" id="orgForm" onsubmit="return false"><label>Organization<input id="orgName" type="text" value="${esc(r.org || '')}" placeholder="Institute, company or school"></label>
    <label>Your name<input id="orgContact" type="text" value="${esc(r.name || u.name)}"></label><label>Work email<input id="orgEmail" type="email" value="${esc(r.email || u.email)}"></label>
    <label>Team size<select id="orgSize">${['1–10','11–50','51–200','200+'].map(x => `<option${r.size === x ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
    <label>What do you need?<textarea id="orgMsg" rows="3" placeholder="Tell us about your team and use case">${esc(r.msg || '')}</textarea></label><p class="form-err" id="orgErr" role="alert"></p></form>`,
    actions:[{label:'Cancel'}, {label:'Send request', cls:'btn-primary', fn:() => {
      const v = id => $(id).value.trim();
      if(!v('#orgName') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('#orgEmail'))){ $('#orgErr').textContent = 'Enter your organization and a valid email.'; return false; }
      store.set(uKey('orgreq'), {org:v('#orgName'), name:v('#orgContact'), email:v('#orgEmail'), size:$('#orgSize').value, msg:v('#orgMsg'), at:Date.now(), status:'pending'});
      toast('Request sent. Our team will contact you soon.'); rerenderAccountPages();
    }}]});
}
function rerenderAccountPages(){ renderPlanChip(); if(S.page === 'plans') renderPlans(); if(S.page === 'profile') renderProfile(); }

/* ---------- profile ---------- */
const PF = {role:null, interests:new Set()};
const dt = t => new Date(t).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
function renderProfile(){
  const u = allUsers().find(x => x.id === S.user.id); if(!u) return;
  PF.role = u.role; PF.interests = new Set(u.interests || []);
  const sub = subOf(), plan = PLANS[sub.plan], req = orgReq();
  $('#pageProfile').innerHTML = `<div class="page-in"><header class="page-h"><div><h1>${ic('user')}My profile</h1><p>Edit your details, change how Earthanova adapts to you, and follow your subscription.</p></div></header>
    <div class="prof-grid">
    <section class="card prof-main"><div class="prof-id"><span class="avatar big">${esc($('#userBtn').textContent)}</span><div><h2>${esc(u.name)}</h2><p>${esc(u.email)}</p><p class="muted">Member since ${dt(u.created)}</p></div></div>
      <form class="form" id="profileForm" novalidate>
        <label>Full name<input id="pfName" type="text" value="${esc(u.name)}" autocomplete="name"></label>
        <label>Email<input id="pfEmail" type="email" value="${esc(u.email)}" autocomplete="email"></label>
        <fieldset><legend>I am a…</legend><div class="role-grid">${ROLES.map(r => `<button type="button" class="role" data-prole="${r.id}" aria-pressed="${r.id === u.role}">${ic(r.icon)}<span><b>${r.label}</b><small>${r.desc}</small></span></button>`).join('')}</div></fieldset>
        <label>Field or specialty<select id="pfField"><option value="">Choose…</option>${FIELDS.map(f => `<option${f === u.field ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
        <fieldset><legend>Interests</legend><div class="chips">${INTERESTS.map(t => `<button type="button" class="chip-opt" data-pint="${esc(t)}" aria-pressed="${PF.interests.has(t)}">${esc(t)}</button>`).join('')}</div></fieldset>
        <label>I use Earthanova for<select id="pfPurpose"><option value="">Choose…</option>${PURPOSES.map(f => `<option${f === u.purpose ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
        <fieldset><legend>Default dashboard view</legend><div class="seg" role="group" aria-label="Default view"><button type="button" data-setview="basic">${ic('eye')}Basic</button><button type="button" data-setview="advanced">${ic('flask')}Advanced</button><button type="button" data-setview="playful">${ic('bolt')}Playful</button></div></fieldset>
        <p class="form-err" id="pfErr" role="alert"></p><div class="btn-row"><button class="btn-primary" type="submit">Save changes</button></div></form></section>
    <aside class="prof-side">
      <section class="card"><h2>${ic('star')}Subscription</h2><div class="sub-plan"><span class="tag mint">${plan.name}</span><span class="lvl lvl-low">${sub.status === 'active' ? 'Active' : sub.status}</span></div>
        <dl class="sub-dl"><div><dt>Plan</dt><dd>${plan.name} · ${plan.price} ${plan.per}</dd></div><div><dt>Started</dt><dd>${dt(sub.since)}</dd></div><div><dt>${sub.plan === 'pro' ? 'Renews' : 'Billing'}</dt><dd>${sub.plan === 'pro' ? dt(sub.renews) : sub.plan === 'basic' ? 'No charge' : 'Managed by our team'}</dd></div></dl>
        ${req ? `<p class="plan-note">${ic('mail')}Organization request sent ${ago(req.at)} (${esc(req.status)}).</p>` : ''}
        <div class="use-grid">${usageMeters()}</div>
        <div class="btn-row"><button class="btn-primary" data-nav="plans">Manage plan</button>${sub.plan === 'pro' ? '<button class="btn-secondary" data-act="plan-cancel">Cancel Pro</button>' : ''}</div>
        <h3>History</h3><ul class="hist">${(sub.history || []).slice(0, 5).map(h => `<li><b>${esc(h.note)}</b><span>${dt(h.at)}</span></li>`).join('')}</ul></section>
      <section class="card"><h2>${ic('lock')}Password</h2><form class="form" id="pwForm" novalidate><label>Current password<input id="pwOld" type="password" autocomplete="current-password"></label><label>New password<input id="pwNew" type="password" autocomplete="new-password" placeholder="At least 6 characters"></label><label>Repeat new password<input id="pwNew2" type="password" autocomplete="new-password"></label><p class="form-err" id="pwErr" role="alert"></p><button class="btn-secondary" type="submit">Update password</button></form></section>
      <section class="card"><h2>${ic('file')}Your data</h2><div class="btn-row"><button class="btn-secondary" data-act="export-data">${ic('download')}Export my data</button><button class="btn-secondary" data-act="logout">${ic('logout')}Log out</button></div><button class="link-btn danger" data-act="delete-account">Delete my account</button></section>
    </aside></div></div>`;
  setView(S.view, false);
}
async function saveProfile(){
  const err = $('#pfErr'); err.textContent = '';
  const name = $('#pfName').value.trim(), email = $('#pfEmail').value.trim().toLowerCase();
  if(!name){ err.textContent = 'Please enter your name.'; return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ err.textContent = 'Enter a valid email address.'; return; }
  const list = allUsers(), i = list.findIndex(x => x.id === S.user.id);
  if(list.some((x, k) => k !== i && x.email === email)){ err.textContent = 'That email belongs to another account.'; return; }
  Object.assign(list[i], {name, email, role:PF.role, field:$('#pfField').value, interests:[...PF.interests], purpose:$('#pfPurpose').value});
  store.set('es:users', list); setUser(list[i]); toast('Profile updated.'); renderProfile();
}
async function savePassword(){
  const err = $('#pwErr'); err.textContent = '';
  const list = allUsers(), i = list.findIndex(x => x.id === S.user.id), u = list[i];
  if(u.hash !== await sha(u.salt + $('#pwOld').value)){ err.textContent = 'Current password is incorrect.'; return; }
  if($('#pwNew').value.length < 6){ err.textContent = 'New password must be at least 6 characters.'; return; }
  if($('#pwNew').value !== $('#pwNew2').value){ err.textContent = 'The new passwords do not match.'; return; }
  u.salt = Math.random().toString(36).slice(2) + Date.now().toString(36); u.hash = await sha(u.salt + $('#pwNew').value); store.set('es:users', list);
  toast('Password updated.'); $('#pwForm').reset();
}
function exportData(){
  const u = allUsers().find(x => x.id === S.user.id), {salt, hash, ...pub} = u;
  const data = {profile:pub, subscription:subOf(), projects:favs(), recent:recents(), reports:reportsOf(), tracked:trackList(), organizationRequest:orgReq()};
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'})); a.download = 'earthanova-my-data.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function deleteAccount(){
  showDialog({title:'Delete your account?', body:'<p>This removes your profile, projects, reports, tracked regions and subscription from this browser. It cannot be undone.</p>', actions:[{label:'Keep my account'}, {label:'Delete everything', cls:'btn-primary danger-btn', fn:() => {
    const id = S.user.id; store.set('es:users', allUsers().filter(x => x.id !== id));
    Object.keys(localStorage).filter(k => k.endsWith(':' + id)).forEach(k => localStorage.removeItem(k)); logout(); toast('Your account was deleted.');
  }}]});
}

/* ---------- place picker (used by tracking and compare) ---------- */
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

/* ---------- hazard tracking ---------- */
const TRACK = [
  {id:'quake', code:'K-01', name:'Seismic Watch', hazard:'Earthquakes', icon:'quake'},
  {id:'volcano', code:'K-02', name:'Volcano Watch', hazard:'Volcanoes', icon:'flame'},
  {id:'storm', code:'K-03', name:'Storm Watch', hazard:'Severe storms', icon:'wind'},
  {id:'flood', code:'K-04', name:'Flood & Landslide Watch', hazard:'Floods & landslides', icon:'drop'},
  {id:'dust', code:'K-05', name:'Dust Watch', hazard:'Windblown dust', icon:'cloud'},
  {id:'sea', code:'K-06', name:'Sea-Level Watch', hazard:'Sea-level rise', icon:'waves'}
];
const T = {sel:null, tower:0, data:{}, tok:0};
const TRK_DAYS = 30, TRK_KM = 300;
const trkLoading = (m = 'Loading NASA data…') => ({level:'scanning', score:0, headline:m, explain:'Dust and sea level come from NASA archives. The first scan of a new place can take 1-2 minutes, then it is stored.', metrics:[], series:null, items:[]});
function trackReadings(eq, eo){
  const R = {}, none = (m, why = 'This source could not be reached. Try Refresh in a moment.') => ({level:'na', score:0, headline:m, explain:why, metrics:[], series:null, items:[]});
  const mk = (level, score, headline, explain, metrics, items = []) => ({level, score:Math.round(clamp(score)), headline, explain, metrics, series:null, items});
  if(eq?.features){
    const f = eq.features, mq = f.length ? Math.max(...f.map(q => q.properties.mag)) : null;
    R.quake = mk(mq >= 6 ? 'high' : mq >= 4.5 ? 'moderate' : 'low', ((mq || 3) - 3) / 3 * 100, f.length ? `${f.length} quakes of M3+ in ${TRK_DAYS} days, largest M${mq.toFixed(1)}` : `No M3+ earthquakes in the last ${TRK_DAYS} days`, `Counts USGS earthquakes within ${TRK_KM} km. Moderate when the largest is M4.5 or more, high at M6 or more.`, [['Events M3+', f.length], ['Largest', mq != null ? 'M' + mq.toFixed(1) : '—'], ['Radius', TRK_KM + ' km']],
      f.slice(0, 5).map(q => ({title:`M${q.properties.mag.toFixed(1)} · ${q.properties.place || 'Unknown'}`, meta:new Date(q.properties.time).toISOString().slice(0, 10), url:q.properties.url, tag:'USGS'})));
  } else R.quake = none('USGS unavailable');
  const note = 'NASA EONET lists notable events only (GDACS, NOAA, JTWC, Smithsonian and others), so "none listed" is not proof of safety.';
  const ev = (key, lists, label, code) => {
    if(!eo){ R[key] = none('NASA EONET unavailable'); return; }
    const all = lists.flatMap(k => eo.byCat[k] || []).sort((x, y) => y.date.localeCompare(x.date)), n = all.length;
    R[key] = mk(n >= 3 ? 'high' : n >= 1 ? 'moderate' : 'low', n / 3 * 100, n ? `${n} ${label} event${n > 1 ? 's' : ''} in ${TRK_DAYS} days` : `No ${label} events listed in ${TRK_DAYS} days`, `NASA EONET events within ${TRK_KM} km over the last ${TRK_DAYS} days. Moderate at 1 event, high at 3 or more. ${note}`, [['Events', n], ['Radius', TRK_KM + ' km'], ['Window', TRK_DAYS + ' days']], all.slice(0, 6).map(e => ({title:e.title, meta:`${e.date} · ${e.dist} km away${e.mag ? ' · ' + e.mag : ''}`, url:e.url, tag:'NASA EONET'})));
  };
  ev('volcano', ['volcanoes'], 'volcano'); ev('storm', ['severeStorms'], 'severe storm'); ev('flood', ['floods', 'landslides'], 'flood or landslide');
  R.dust = trkLoading(); R.sea = trkLoading();
  return R;
}
async function fetchTrack(l, force, onUpdate){
  const c = T.data[l.id]; if(c && !force && Date.now() - c.at < 9e5) return c;
  const q = `latitude=${l.lat}&longitude=${l.lon}`, now = Date.now(), since = new Date(now - TRK_DAYS*864e5).toISOString().slice(0, 10), today = new Date(now).toISOString().slice(0, 10);
  const [eq, eo] = await Promise.allSettled([
    getJSON(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&${q}&maxradiuskm=${TRK_KM}&starttime=${since}&minmagnitude=3&orderby=magnitude&limit=100`, 15000),
    eonetEvents(l.lat, l.lon, TRK_KM, {startDate:since, endDate:today})
  ]);
  const d = {at:now, R:trackReadings(eq.value, eo.value)}; T.data[l.id] = d;
  /* dust and sea level are slow the first time (server fetches NASA archives), so they fill in afterwards */
  (async () => {
    try{
      const hit = await nasaEnsure(l.lat, l.lon, l.short || l.name), hz = await nasaHazards(hit.place.name);
      Object.assign(d.R, dustSeaTowers(hz.dust, hz.sea, ''));
    }catch(e){
      const m = (e && e.message) || 'unavailable';
      d.R.dust = {level:'na', score:0, headline:'NASA dust data unavailable', explain:`The NASA server could not load this series (${m}). Try Refresh later.`, metrics:[], series:null, items:[]};
      d.R.sea = {...d.R.dust, headline:'NASA sea-level data unavailable'};
    }
    ['dust', 'sea'].forEach(k => { d.R[k].series = null; });
    if(onUpdate) onUpdate();
  })();
  return d;
}
function addTracked(l){
  const list = trackList(); if(list.some(x => x.id === l.id)){ toast(`${l.short || l.name} is already tracked.`); return false; }
  if(!canAdd('tracked')){ upsell('tracked'); return false; }
  list.push({id:l.id, name:l.name, short:l.short || l.name, lat:l.lat, lon:l.lon}); store.set(uKey('track'), list); return true;
}
function removeTracked(id){ store.set(uKey('track'), trackList().filter(x => x.id !== id)); if(T.sel === id) T.sel = null; }
const trkLevels = id => { const d = T.data[id]; return d ? TRACK.map(t => d.R[t.id].level) : TRACK.map(() => 'scanning'); };
async function renderTracking(force){
  const list = trackList(), tok = ++T.tok;
  $('#trkEmpty').hidden = list.length > 0; $('#trkBody').hidden = !list.length;
  $('#trkChips').innerHTML = list.map(r => `<span class="chip-reg"><button role="tab" data-trk-sel="${esc(r.id)}" aria-selected="${r.id === T.sel}">${ic('pin')}${esc(r.short)}</button><button class="x" data-trk-del="${esc(r.id)}" aria-label="Stop tracking ${esc(r.short)}">${ic('close')}</button></span>`).join('');
  if(!list.length){
    $('#trkEmpty').innerHTML = `${ic('pulse')}<h3>No regions tracked yet</h3><p>Add a region above and its six hazard towers will start watching it. Try one of these:</p><div class="chips">${PRESETS.slice(0, 5).map(p => `<button class="chip-opt" data-act="trk-add-id" data-id="${esc(p.id)}">${esc(p.short)}</button>`).join('')}</div>`;
    return;
  }
  if(!list.some(r => r.id === T.sel)) T.sel = list[0].id;
  $('#trkChips').querySelectorAll('[data-trk-sel]').forEach(b => b.setAttribute('aria-selected', b.dataset.trkSel === T.sel));
  drawTrackStage(); renderTrackMatrix(list);
  await Promise.all(list.map(async r => { try{ await fetchTrack(r, force, () => { if(tok === T.tok){ renderTrackMatrix(list); if(r.id === T.sel) drawTrackStage(); } }); }catch{} if(tok !== T.tok) return; renderTrackMatrix(list); if(r.id === T.sel) drawTrackStage(); }));
  if(tok === T.tok){ const t0 = Math.min(...list.map(r => T.data[r.id]?.at || Date.now())); $('#trkSub').textContent = `Watching ${list.length} region${list.length > 1 ? 's' : ''}. Earthquakes, volcanoes, storms, floods and landslides: last 30 days. Dust and sea level: NASA long-term records. Updated ${ago(t0)}.`; }
}
function renderTrackMatrix(list){
  $('#trkMatrix').innerHTML = `<table class="tbl mx"><thead><tr><th>Region</th>${TRACK.map(t => `<th title="${t.name}">${ic(t.icon)}<span class="mx-n">${t.hazard}</span></th>`).join('')}</tr></thead><tbody>${list.map(r => { const d = T.data[r.id]; return `<tr class="${r.id === T.sel ? 'sel' : ''}"><td><button class="link-btn" data-trk-sel="${esc(r.id)}">${esc(r.short)}</button></td>${TRACK.map((t, i) => { const lv = d ? d.R[t.id].level : 'scanning'; return `<td><button class="mx-c" data-trk-sel="${esc(r.id)}" data-trk-tower="${i}"><span class="lvl lvl-${lv}">${LEVEL[lv][0]}</span></button></td>`; }).join('')}</tr>`; }).join('')}</tbody></table>`;
}
function drawTrackStage(){
  const r = trackList().find(x => x.id === T.sel); if(!r) return;
  const lv = trkLevels(r.id); drawTowers($('#trkSvg'), TRACK, lv, 'k', pickTrackTower, T.tower);
  $('#trkRegion').textContent = r.name;
  const n = k => lv.filter(l => l === k).length;
  $('#trkCounts').innerHTML = `<span class="lvl lvl-high">${n('high')} high</span><span class="lvl lvl-moderate">${n('moderate')} moderate</span><span class="lvl lvl-low">${n('low')} low</span>`;
  $('#trkTowers').innerHTML = TRACK.map((t, i) => `<li><button class="tw-row" data-i="${i}" data-trk-tower="${i}" aria-pressed="${i === T.tower}"><span class="tw-ic" style="color:${LEVEL[lv[i]][1]}">${ic(t.icon)}</span><span class="tw-t"><b>${t.name}</b><small>${t.hazard}</small></span><span class="lvl lvl-${lv[i]}">${LEVEL[lv[i]][0]}</span></button></li>`).join('');
  renderTrackDetail();
}
function pickTrackTower(i){ T.tower = i; drawTrackStage(); }
function renderTrackDetail(){
  const r = trackList().find(x => x.id === T.sel), d = r && T.data[r.id], el = $('#trkDetail');
  if(!d){ el.innerHTML = '<p class="td-exp">Loading live data…</p>'; return; }
  const t = TRACK[T.tower], x = d.R[t.id], lv = LEVEL[x.level];
  const bars = x.series ? `<div class="bars" role="img" aria-label="Daily values">${x.series.pts.map(p => { const pc = p.v == null ? 0 : clamp((p.v - x.series.lo) / ((x.series.hi - x.series.lo) || 1) * 100, 4); return `<div class="bar"><span class="bv">${p.v == null ? '—' : (+p.v).toFixed(x.series.dec)}</span><i style="height:${pc}%;background:${lv[1]}"></i><span class="bl">${p.l}</span></div>`; }).join('')}</div><p class="bars-u">Unit: ${x.series.unit}</p>` : '';
  el.innerHTML = `<header><span class="td-ic" style="color:${lv[1]}">${ic(t.icon)}</span><div><p class="td-code">${t.code} · ${t.hazard} · ${esc(r.short)}</p><h3>${t.name}</h3></div><span class="lvl lvl-${x.level}">${lv[0]}</span></header>
    <div class="meter" role="img" aria-label="Threat score ${x.score} out of 100"><span style="width:${x.score}%;background:${lv[1]}"></span></div><p class="td-head">${esc(x.headline)}</p><p class="td-exp">${esc(x.explain)}</p>${bars}
    ${x.metrics.length ? `<div class="kv">${x.metrics.map(m => `<div><span>${esc(m[0])}</span><b>${esc(m[1])}</b></div>`).join('')}</div>` : ''}
    ${x.items.length ? `<h4>Latest events</h4><ul class="list">${x.items.map(e => `<li><div class="grow"><b>${esc(e.title)}</b><span>${esc(e.meta)}</span></div>${e.url ? `<a class="link-btn" href="${esc(e.url)}" target="_blank" rel="noopener">USGS</a>` : ''}</li>`).join('')}</ul>` : ''}
    <p class="td-src">Sources: USGS earthquakes, NASA EONET events, NASA MERRA-2 dust, NASA-SSH sea level. Updated ${ago(d.at)}. Screening only, not an official warning.</p>`;
}
function initTrackingPage(){
  placePicker($('#trkInput'), $('#trkResults'), (l, inp) => { inp.value = ''; if(addTracked(l)){ T.sel = l.id; toast(`Now tracking ${l.short}.`); renderTracking(); } });
}

/* ---------- compare places (travel advisor) ---------- */
const CMP = {from:null, to:null, start:null, end:null, pref:'mild', purpose:'trip', res:null};
const PREF = {mild:[18, 26, 'mild (18–26 °C)'], warm:[24, 32, 'warm (24–32 °C)'], cool:[8, 18, 'cool (8–18 °C)']};
const isoDay = d => d.toISOString().slice(0, 10);
function renderCompare(){
  if(!CMP.start){ const a = new Date(Date.now() + 14*864e5), b = new Date(Date.now() + 21*864e5); CMP.start = isoDay(a); CMP.end = isoDay(b); }
  if(!CMP.from && S.A) CMP.from = S.A.loc;
  const chipsFor = key => knownPlaces().slice(0, 6).map(p => `<button type="button" class="chip-opt" data-cmp-pick="${key}" data-id="${esc(p.id)}">${esc(p.short)}</button>`).join('');
  $('#pageCompare').innerHTML = `<div class="page-in"><header class="page-h"><div><h1>${ic('compare')}Compare places</h1><p>Thinking of travelling or moving? Pick where you are, where you want to go and when. We compare the climate for your dates, the air and the earthquake risk, then tell you if it looks like a good decision.</p></div></header>
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
  const q = `latitude=${l.lat}&longitude=${l.lon}`, today = isoDay(new Date()), far = isoDay(new Date(Date.now() + 15*864e5));
  const near = win.start <= far && win.end >= today;
  const dustP = nasaEnsure(l.lat, l.lon, l.short || l.name).then(hit => nasaHazards(hit.place.name));   // slow the first time for a new place
  const [clm, eq, dst, fc] = await Promise.allSettled([
    nasaWindow(l.lat, l.lon, win.start, win.end),
    getJSON(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&${q}&maxradiuskm=200&starttime=${LAST_YEAR - 9}-01-01&minmagnitude=4.5&orderby=magnitude&limit=500`, 15000),
    dustP,
    near ? getJSON(`https://api.open-meteo.com/v1/forecast?${q}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_gusts_10m_max&start_date=${win.start < today ? today : win.start}&end_date=${win.end > far ? far : win.end}&timezone=auto`, 15000) : Promise.reject(new Error('far'))
  ]);
  if(clm.status !== 'fulfilled') throw new Error(`NASA climate history for ${l.short} could not be loaded${clm.reason?.message ? ` (${clm.reason.message})` : ''}.`);
  const clim = clm.value; clim.rainTotal = clim.rainPerDay * clim.lenDays;
  const f = eq.status === 'fulfilled' ? eq.value.features || [] : null;
  const quakes = f ? {perYear:f.length / 10, count:f.length, max:f.length ? Math.max(...f.map(q => q.properties.mag)) : null} : null;
  const dustA = dst.status === 'fulfilled' ? dst.value.dust?.annual : null;
  const dust = dustA && dustA.length ? mean(dustA.slice(-5)) : null;
  const fd = fc.status === 'fulfilled' ? fc.value.daily : null;
  const fcast = fd && fd.time.length ? {n:fd.time.length, hi:mean(fd.temperature_2m_max), lo:mean(fd.temperature_2m_min), rain:fd.precipitation_sum.reduce((a, b) => a + (b || 0), 0), gust:Math.max(...fd.wind_gusts_10m_max)} : null;
  return {loc:l, clim, quakes, dust, elev:null, fcast};
}
function scorePlace(d, pref, purpose){
  const c = d.clim, [lo, hi] = PREF[pref], dist = c.meanT < lo ? lo - c.meanT : c.meanT > hi ? c.meanT - hi : 0;
  const P = {};
  P.comfort = {score:clamp(100 - dist * 8 - Math.max(0, c.hi - 36) * 3), w:{trip:.30, relocate:.25}};
  P.rain = {score:clamp(100 - c.rainPerDay * 12 - c.wetFrac * 20), w:{trip:.20, relocate:.10}};
  P.extreme = {score:clamp(100 - c.hotFrac * 220 - c.coldFrac * 160), w:{trip:.15, relocate:.15}};
  P.air = {score:d.dust == null ? 60 : clamp(100 - d.dust * 2.5), w:{trip:.10, relocate:.25}};
  P.seismic = {score:d.quakes ? clamp(100 - d.quakes.perYear * 5 - ((d.quakes.max || 0) >= 7 ? 20 : 0)) : 70, w:{trip:.15, relocate:.20}};
  if(d.elev != null && d.elev > 2000) P.altitude = {score:clamp(100 - (d.elev - 2000) / 25), w:{trip:.10, relocate:.05}};
  let tw = 0, ts = 0; Object.values(P).forEach(p => { const w = p.w[purpose]; tw += w; ts += w * p.score; });
  return {parts:P, total:Math.round(ts / tw)};
}
const CMP_METRICS = [
  ['comfort', 'Typical temperature', d => `${d.clim.meanT.toFixed(1)} °C <small>(high ${d.clim.hi.toFixed(0)} · low ${d.clim.lo.toFixed(0)})</small>`],
  ['rain', 'Rain in your dates', d => `${d.clim.rainTotal.toFixed(0)} mm <small>(${Math.round(d.clim.wetFrac * 100)}% wet days)</small>`],
  ['extreme', 'Extreme heat / cold days', d => `${Math.round(d.clim.hotFrac * 100)}% hot · ${Math.round(d.clim.coldFrac * 100)}% freezing`],
  ['air', 'Natural dust (PM2.5, yearly mean)', d => d.dust == null ? 'No data' : `${d.dust.toFixed(1)} µg/m³`],
  ['seismic', 'Earthquake activity', d => d.quakes ? `${d.quakes.perYear.toFixed(1)} M4.5+ / yr${d.quakes.max ? ` <small>(max M${d.quakes.max.toFixed(1)})</small>` : ''}` : 'No data'],
  ['altitude', 'Altitude', d => d.elev == null ? '—' : `${Math.round(d.elev)} m`]
];
function advise(a, b, sa, sb, win, purpose){
  const diff = sb.total - sa.total, flags = [], pros = [], cons = [], tips = [], c = b.clim;
  if(b.quakes && ((b.quakes.max || 0) >= 6.5 || b.quakes.perYear >= 15)) flags.push(`${b.loc.short} has high earthquake activity.`);
  if(b.dust != null && b.dust > 40) flags.push(`${b.loc.short} is very dusty: windblown dust averages ${b.dust.toFixed(0)} µg/m³ (PM2.5).`);
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
  const win = {start:CMP.start, end:CMP.end}; $('#cmpOut').innerHTML = '<div class="card cmp-load"><div class="spinner"></div><p>Comparing NASA climate, dust and earthquake history for both places. A new place can take 1-2 minutes the first time…</p></div>';
  try{
    const [a, b] = await Promise.all([placeData(CMP.from, win), placeData(CMP.to, win)]);
    CMP.res = {a, b, win, purpose:CMP.purpose, pref:CMP.pref, at:Date.now()}; showCompare(CMP.res);
  }catch(ex){ $('#cmpOut').innerHTML = ''; err.textContent = (ex.message || 'Comparison failed.') + ' Check your connection and try again.'; }
}
function showCompare(r){
  const {a, b, win} = r, sa = scorePlace(a, r.pref, r.purpose), sb = scorePlace(b, r.pref, r.purpose), v = advise(a, b, sa, sb, win, r.purpose);
  const rows = CMP_METRICS.filter(m => sa.parts[m[0]] || sb.parts[m[0]]).map(m => { const x = sa.parts[m[0]]?.score ?? 0, y = sb.parts[m[0]]?.score ?? 0, w = Math.abs(x - y) < 5 ? '' : x > y ? 'a' : 'b';
    return `<tr><th scope="row">${m[1]}</th><td class="${w === 'a' ? 'win' : ''}">${sa.parts[m[0]] ? m[2](a) : '—'}${w === 'a' ? ic('check') : ''}</td><td class="${w === 'b' ? 'win' : ''}">${sb.parts[m[0]] ? m[2](b) : '—'}${w === 'b' ? ic('check') : ''}</td></tr>`; }).join('');
  const fcBox = d => d.fcast ? `<p class="cmp-fc">${ic('calendar')}<span>Forecast for ${d.fcast.n} of your days: highs ${d.fcast.hi.toFixed(0)} °C, lows ${d.fcast.lo.toFixed(0)} °C, ${d.fcast.rain.toFixed(0)} mm rain, gusts to ${d.fcast.gust.toFixed(0)} km/h.</span></p>` : '';
  const sc = (d, s) => `<div class="cmp-card"><h3>${esc(d.loc.name)}</h3><p class="mono">${fmtLat(d.loc.lat)}, ${fmtLon(d.loc.lon)}</p><div class="cmp-score"><b>${s.total}</b><span>/ 100 comfort and safety score</span></div><div class="meter"><span style="width:${s.total}%;background:${s.total >= 70 ? 'var(--mint)' : s.total >= 50 ? 'var(--amber)' : 'var(--red)'}"></span></div>${fcBox(d)}</div>`;
  const li = (arr, icn, cls) => arr.map(t => `<li class="${cls}">${ic(icn)}<span>${esc(t)}</span></li>`).join('');
  const dd = x => new Date(x + 'T12:00:00').toLocaleDateString();
  $('#cmpOut').innerHTML = `<div class="cmp-verdict v-${v.level}"><span class="v-ic">${ic(v.level === 'good' ? 'check' : 'alert')}</span><div><p class="v-k">${r.purpose === 'trip' ? 'Trip advice' : 'Relocation advice'} · ${dd(win.start)} to ${dd(win.end)}</p><h2>${esc(v.head)}</h2><p>${esc(a.loc.short)} scores ${sa.total} and ${esc(b.loc.short)} scores ${sb.total} (${v.diff >= 0 ? '+' : '−'}${Math.abs(v.diff)} for your destination).</p></div></div>
    <div class="cmp-cards">${sc(a, sa)}${sc(b, sb)}</div>
    <div class="card"><div class="tbl-scroll"><table class="tbl cmp-tbl"><thead><tr><th></th><th>${esc(a.loc.short)} <small>(from)</small></th><th>${esc(b.loc.short)} <small>(to)</small></th></tr></thead><tbody>${rows}</tbody></table></div><p class="muted">Climate values are averages for the same dates over ${LAST_YEAR - 4}–${LAST_YEAR} (NASA POWER daily; rain from NASA GPM IMERG when the place is stored, otherwise POWER), so they describe what is typical, not a forecast${a.fcast || b.fcast ? ' (the short forecast shown is from Open-Meteo, not NASA)' : ''}. Dust is the natural part of airborne particles from NASA MERRA-2; earthquakes are from USGS. A check mark means clearly better.</p></div>
    <div class="cmp-notes">${v.flags.length ? `<section class="card"><h3>${ic('alert')}Watch out</h3><ul class="notes">${li(v.flags, 'alert', 'bad')}</ul></section>` : ''}${(v.pros.length || v.cons.length) ? `<section class="card"><h3>${ic('compare')}Why</h3><ul class="notes">${li(v.pros, 'check', 'good')}${li(v.cons, 'alert', 'bad')}</ul></section>` : ''}${v.tips.length ? `<section class="card"><h3>${ic('bulb')}Tips for ${esc(b.loc.short)}</h3><ul class="notes">${li(v.tips, 'bulb', '')}</ul></section>` : ''}</div>
    <div class="btn-row"><button class="btn-primary" data-act="cmp-open">${ic('scan')}Open ${esc(b.loc.short)} dashboard</button><button class="btn-secondary" data-act="cmp-track">${ic('pulse')}Track ${esc(b.loc.short)} hazards</button></div>
    <p class="muted foot">This is general guidance from open climate data, not a safety guarantee. Always check official travel advisories, visa rules and current local conditions before you decide.</p>`;
}

/* ---------- wiring ---------- */
function goIdle(){ S.token++; setState('idle'); announce('Explore the globe, search, or click anywhere on Earth.'); }
function logout(){
  setUser(null); S.A = S.I = S.H = null; S.pending = null; S.riskTok++;
  closeUserPop(); renderPresets(); fillLocation(); if(world) world.labelsData(globeLabels());
  goHome(); setState('idle'); toast('You are logged out.');
}
document.addEventListener('click', e => {
  const t = e.target;
  const nav = t.closest('[data-nav]'); if(nav){ go(nav.dataset.nav); return; }
  const nl = t.closest('[data-nav-link]'); if(nl){ go(nl.dataset.navLink); return; }
  const sv = t.closest('[data-setview]'); if(sv){ setView(sv.dataset.setview); return; }
  if(!t.closest('#userMenu')) closeUserPop();
  const ts = t.closest('[data-trk-sel]'); if(ts){ T.sel = ts.dataset.trkSel; if(ts.dataset.trkTower != null) T.tower = +ts.dataset.trkTower; $$('#trkChips [data-trk-sel]').forEach(x => x.setAttribute('aria-selected', x.dataset.trkSel === T.sel)); drawTrackStage(); renderTrackMatrix(trackList()); return; }
  const tt = t.closest('#trkTowers [data-trk-tower]'); if(tt){ pickTrackTower(+tt.dataset.trkTower); return; }
  const td = t.closest('[data-trk-del]'); if(td){ removeTracked(td.dataset.trkDel); renderTracking(); return; }
  const cp = t.closest('[data-cmp-pick]'); if(cp){ const l = findLoc(cp.dataset.id) || knownPlaces().find(x => x.id === cp.dataset.id); if(l){ CMP[cp.dataset.cmpPick] = l; CMP.res = null; $(cp.dataset.cmpPick === 'from' ? '#cmpFrom' : '#cmpTo').value = l.name; } return; }
  const pr = t.closest('[data-prole]'); if(pr){ PF.role = pr.dataset.prole; $$('[data-prole]').forEach(x => x.setAttribute('aria-pressed', x === pr)); return; }
  const pi = t.closest('[data-pint]'); if(pi){ const k = pi.dataset.pint; PF.interests.has(k) ? PF.interests.delete(k) : PF.interests.add(k); pi.setAttribute('aria-pressed', PF.interests.has(k)); return; }
  const b = t.closest('[data-act]'); if(!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  if(act === 'open' || act === 'open-risk'){ const l = findLoc(id); if(l){ S.loc = withId(l); S.goto = act === 'open-risk' ? 'risk' : null; scan(); } }
  else if(act === 'del'){ const l = findLoc(id); if(l){ toggleFav(l); renderProjects(); fillLocation(); if(world) world.labelsData(globeLabels()); toast(`${l.short || l.name} removed from Projects.`); } }
  else if(act === 'star'){ const l = findLoc(id); if(l){ if(!isFav(l) && !canAdd('projects')){ upsell('projects'); return; } if(!isFav(l)) toggleFav(l); renderProjects(); fillLocation(); toast(`${l.short || l.name} added to Projects.`); } }
  else if(act === 'go-home') goHome();
  else if(act === 'clear'){ Object.keys(localStorage).filter(k => k.startsWith(CACHE_VER)).forEach(k => localStorage.removeItem(k)); toast('Cached scans cleared.'); }
  else if(act === 'csv'){ if(S.A) downloadCSV(S.A, S.loc); else toast('Scan a location first.'); }
  else if(act === 'report-quick'){ if(!S.A) return; const r = saveReport(`${S.loc.short} climate and hazard study`, '', SECTIONS.map(s => s[0])); if(r){ toast('Report saved. Find it in Reports.'); } }
  else if(act === 'report-save' || act === 'report-save-pdf'){
    const secs = $$('.rp-sec').filter(c => c.checked).map(c => c.value);
    if(!secs.length){ toast('Pick at least one section to include.'); return; }
    const r = saveReport($('#rpTitle').value.trim(), $('#rpNotes').value.trim(), secs);
    if(r){ renderReports(); toast('Report saved.'); if(act === 'report-save-pdf') openReport(r, true); }
  }
  else if(act === 'plan-pro') proDialog();
  else if(act === 'plan-org') orgDialog();
  else if(act === 'plan-basic') showDialog({title:'Switch to Basic?', body:'<p>Basic includes 3 projects, 3 saved reports and 1 tracked region. Items you already have are kept, but you will not be able to add more until you are under the limits.</p>', actions:[{label:'Stay on my plan'}, {label:'Switch to Basic', cls:'btn-primary', fn:() => { setPlan('basic', 'Switched to Basic'); toast('You are on the Basic plan.'); rerenderAccountPages(); }}]});
  else if(act === 'plan-cancel') showDialog({title:'Cancel Pro?', body:'<p>You will move to the Basic plan right away. Your data is kept, but Basic has lower limits.</p>', actions:[{label:'Keep Pro'}, {label:'Cancel Pro', cls:'btn-primary', fn:() => { setPlan('basic', 'Pro cancelled'); toast('Pro cancelled. You are on Basic.'); rerenderAccountPages(); }}]});
  else if(act === 'export-data') exportData();
  else if(act === 'logout') logout();
  else if(act === 'delete-account') deleteAccount();
  else if(act === 'trk-add-current'){ const l = S.A ? S.A.loc : S.loc; if(addTracked(l)){ T.sel = l.id; toast(`Now tracking ${l.short}.`); renderTracking(); } }
  else if(act === 'trk-add-projects'){ let n = 0; for(const f of favs()){ if(trackList().some(x => x.id === f.id)) continue; if(!addTracked(f)) break; n++; } if(n) toast(`Added ${n} project${n > 1 ? 's' : ''} to tracking.`); renderTracking(); }
  else if(act === 'trk-add-id'){ const l = findLoc(id); if(l && addTracked(l)){ T.sel = l.id; renderTracking(); } }
  else if(act === 'cmp-swap'){ [CMP.from, CMP.to] = [CMP.to, CMP.from]; CMP.res = null; renderCompare(); }
  else if(act === 'cmp-open'){ if(CMP.res){ S.loc = withId(CMP.res.b.loc); S.goto = null; scan(); } }
  else if(act === 'cmp-track'){ if(CMP.res && addTracked(CMP.res.b.loc)){ T.sel = CMP.res.b.loc.id; toast(`Now tracking ${CMP.res.b.loc.short}.`); go('tracking'); } }
  else if(act.startsWith('report-')){
    const r = reportsOf().find(x => x.id === id); if(!r) return;
    if(act === 'report-view') openReport(r, false);
    else if(act === 'report-pdf') openReport(r, true);
    else if(act === 'report-csv') downloadCSV(r.A, r.loc);
    else if(act === 'report-del'){ store.set(uKey('reports'), reportsOf().filter(x => x.id !== id)); renderReports(); toast('Report deleted.'); }
  }
  else if(act === 'quiz-pick') quizPick(b.dataset.k, b);
  else if(act === 'quiz-next'){ Q.i++; Q.locked = false; renderQuiz(); }
  else if(act === 'quiz-again') resetQuiz();
  else if(act === 'guess-lock') guessLock();
});
document.addEventListener('submit', e => {
  const f = e.target.id;
  if(f === 'profileForm'){ e.preventDefault(); saveProfile(); }
  else if(f === 'pwForm'){ e.preventDefault(); savePassword(); }
  else if(f === 'cmpForm'){ e.preventDefault(); runCompare(); }
  else if(f === 'trkForm') e.preventDefault();
});
$('#trkRefresh').addEventListener('click', () => renderTracking(true));
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
$('#loginBtn').addEventListener('click', () => openAuth('login', 'Log in to your account.'));
$('#logoutBtn').addEventListener('click', logout);
$('#userBtn').addEventListener('click', () => { const p = $('#userPop'); p.hidden = !p.hidden; $('#userBtn').setAttribute('aria-expanded', !p.hidden); });
$('#retryBtn').addEventListener('click', () => scan(true));
$('#changeBtn').addEventListener('click', goIdle);
$('#errChange').addEventListener('click', goHome);
$('#popClose').addEventListener('click', goIdle);
$('#riskRescan').addEventListener('click', renderRisk);
$('#sbChip').addEventListener('click', () => { if(S.state === 'results') scan(true); });
$('#locSelect').addEventListener('change', e => { const l = findLoc(e.target.value); if(l){ S.loc = withId(l); scan(); } });
$('#radius').addEventListener('change', () => { $('#locArea').textContent = `${$('#radius').value} km`; });
$('#favBtn').addEventListener('click', () => { if(!isFav(S.loc) && !canAdd('projects')){ upsell('projects'); return; } const on = toggleFav(S.loc); $('#favBtn').setAttribute('aria-pressed', on); fillLocation(); if(world) world.labelsData(globeLabels()); toast(on ? `${S.loc.short} added to Projects. You are now studying it.` : `${S.loc.short} removed from Projects.`); });
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ closeUserPop(); if(!$('#dlg').hidden) closeDialog(); if(S.page === 'home' && S.state === 'selected' && $('#auth').hidden) goIdle(); } });

/* ---------- boot ---------- */
wireAuth(); initPeriodControls(); initTrackingPage();
const sessionId = store.get('es:session', null), sessionUser = sessionId && allUsers().find(u => u.id === sessionId);
if(sessionUser) setUser(sessionUser);
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
