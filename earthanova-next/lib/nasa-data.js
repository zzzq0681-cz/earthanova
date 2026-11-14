/* NASA data layer for Earthanova.
 *
 * Talks to the Earth Sentinel data API (server.py in the data backend), which serves
 * NASA POWER (MERRA-2 / CERES) monthly series plus precomputed trends and forecasts.
 *
 * Two modes, same JSON shapes:
 *   live   : fetch `${apiBase()}/...`  (default base '/earth-api/api', override with window.EARTH_API_BASE)
 *   static : window.EARTH_SNAPSHOT = {places, bundles}  (used for offline previews; no network)
 */
const COVER_KM = 150;

const hav = (a1, o1, a2, o2) => {
  const R = 6371, r = Math.PI / 180, da = (a2 - a1) * r, dO = (o2 - o1) * r;
  const h = Math.sin(da / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dO / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const snapshot = () => (typeof window !== 'undefined' && window.EARTH_SNAPSHOT) || null;
export const isStatic = () => !!snapshot();
export const apiBase = () => (typeof window !== 'undefined' && window.EARTH_API_BASE) || '/earth-api/api';

function snapGet(snap, path) {
  const u = new URL(path, 'http://x'), p = u.pathname, q = u.searchParams;
  if (p === '/places') return snap.places;
  if (p === '/nearest') {
    const lat = +q.get('lat'), lon = +q.get('lon');
    const best = snap.places.map(pl => ({ pl, d: hav(lat, lon, pl.lat, pl.lon) })).sort((a, b) => a.d - b.d)[0];
    return {
      covered: best.d <= COVER_KM, distance_km: Math.round(best.d * 10) / 10, cover_radius_km: COVER_KM,
      place: best.pl, message: best.d <= COVER_KM ? null : 'No NASA time series loaded for this location yet.'
    };
  }
  const m = p.match(/^\/places\/([^/]+)\/(series|trends|forecast|backtest)$/);
  if (!m) throw new Error('Not available in the offline snapshot: ' + path);
  const b = snap.bundles[decodeURIComponent(m[1]).toLowerCase()];
  if (!b) throw new Error('unknown place');
  return m[2] === 'forecast' ? b.forecast[q.get('method') || 'recommended'] : b[m[2]];
}

async function apiGet(path, timeout = 20000) {
  const snap = snapshot();
  if (snap) return snapGet(snap, path);
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(apiBase() + path, { signal: ctl.signal });
    if (!r.ok) {
      let msg = '';
      try { msg = (await r.json()).error; } catch { /* not json */ }
      throw new Error(msg || `NASA data service error (HTTP ${r.status})`);
    }
    return await r.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The NASA data service did not respond.');
    throw e;
  } finally { clearTimeout(t); }
}

export const nasaPlaces = () => apiGet('/places');
export const nasaFind = (lat, lon) => apiGet(`/nearest?lat=${lat}&lon=${lon}`);
/* Like nasaFind, but if no loaded place is close the server fetches NASA data for this exact point
 * (POWER + GPM IMERG), computes trends/forecasts and stores it. Can take up to a minute the first time. */
export const nasaEnsure = (lat, lon, name) =>
  isStatic() ? nasaFind(lat, lon)
             : apiGet(`/ensure?lat=${lat}&lon=${lon}&name=${encodeURIComponent(name || '')}`, 240000);

const SERIES_VARS = 't2m,t2m_max,prectotcorr,allsky_sfc_sw_dwn,gwetroot,imerg_mm';
export async function nasaLoad(name) {
  const n = encodeURIComponent(name);
  const [series, trends, forecast, backtest] = await Promise.all([
    apiGet(`/places/${n}/series?vars=${SERIES_VARS}&start=1981&end=2025&agg=monthly`),
    apiGet(`/places/${n}/trends`),
    apiGet(`/places/${n}/forecast?method=recommended`),
    apiGet(`/places/${n}/backtest`)
  ]);
  return { series, trends, forecast, backtest };
}

export const reportUrl = (name, kind) => `${apiBase()}/places/${encodeURIComponent(name)}/report.${kind}`;

/* Same shape as buildAnalysis() in earthanova.js, so every existing panel keeps working.
 * Not available from the NASA set yet -> null: hot days (needs daily data), CMIP6 projection,
 * elevation, earthquakes, air quality. The UI already handles null for each of these. */
export function nasaBuildAnalysis(loc, radiusKm, bundle, img, period, hit, H) {
  const { mean, round, linreg } = H;
  const s = bundle.series, by = {};
  s.month.forEach((m, i) => {
    const y = +m.slice(0, 4), mo = +m.slice(5, 7), days = new Date(y, mo, 0).getDate();
    const o = (by[y] ??= { t: [], p: [], im: [], sw: [], sm: [] });
    o.t.push(s.t2m[i]);
    o.p.push(s.prectotcorr[i] == null ? null : s.prectotcorr[i] * days);   // POWER fallback, mm/day -> mm/month
    o.im.push(s.imerg_mm ? s.imerg_mm[i] : null);                          // NASA GPM IMERG V07, mm/month
    o.sw.push(s.allsky_sfc_sw_dwn[i]);
    o.sm.push(s.gwetroot[i]);
  });
  const full = a => a.length === 12 && a.every(v => v != null);
  const years = period.years.map(y => {
    const o = by[y] || { t: [], p: [], im: [], sw: [], sm: [] };
    const hasIm = !!(s.imerg_mm && s.imerg_mm.some(v => v != null));
    const sw = mean(o.sw);
    return {
      year: y, temp: full(o.t) ? round(mean(o.t), 2) : null,
      rain: hasIm ? (full(o.im) ? round(o.im.reduce((a, v) => a + v, 0), 0) : null)
                  : (full(o.p) ? round(o.p.reduce((a, v) => a + v, 0), 0) : null),   // IMERG when available
      hot: null, solar: sw == null ? null : round(sw / 3.6, 2),        // MJ/m2/day -> kWh/m2/day
      soil: round(mean(o.sm), 3)                                        // root-zone wetness index 0-1
    };
  });
  const avg = (k, ys) => round(mean(years.filter(r => ys.includes(r.year)).map(r => r[k])), { soil: 3, rain: 0, hot: 1 }[k] ?? 2);
  const B = period.baseYears, C = period.curYears;
  const base = { temp: avg('temp', B), rain: avg('rain', B), hot: null, solar: avg('solar', B), soil: avg('soil', B) };
  const cur = { temp: avg('temp', C), rain: avg('rain', C), hot: null, solar: avg('solar', C), soil: avg('soil', C) };
  const nR = ys => years.filter(r => ys.includes(r.year) && r.rain != null).length;   // complete rain years per window
  const rainN = { base: nR(B), cur: nR(C) };
  const trend = linreg(period.years, years.map(r => r.temp));
  return {
    v: 4, period, loc, radiusKm, fetchedAt: Date.now(), grid: { lat: hit.place.lat, lon: hit.place.lon }, hotBase: 35,
    years, base, cur, rainN, trend, proj: null, elev: null, quakes: null, aq: null, img: img || null,
    nasa: { place: hit.place, distance_km: hit.distance_km, bundle, source: 'NASA POWER (MERRA-2 / CERES)' }
  };
}


/* ---------- NASA EONET (Earth Observatory Natural Event Tracker) ----------
 * Open API, no key, CORS enabled. Used for volcanoes, wildfires, floods, severe storms, landslides.
 * EONET only lists notable events (GDACS, IRWIN, NOAA NHC, JTWC, Smithsonian...), so "none found" is not proof of safety.
 * It has no earthquake, drought, heat or dust events in its catalogue (checked 2019-2025). */
const EONET_CATS = ['volcanoes', 'wildfires', 'floods', 'severeStorms', 'landslides'];
export async function eonetEvents(lat, lon, radiusKm, period) {
  if (isStatic()) return null;
  const dLat = radiusKm / 111, dLon = radiusKm / (111 * Math.max(Math.cos(lat * Math.PI / 180), 0.2));
  const c = (v, a, b) => Math.max(a, Math.min(b, v));
  const bbox = [c(lon - dLon, -180, 180), c(lat + dLat, -90, 90), c(lon + dLon, -180, 180), c(lat - dLat, -90, 90)].map(v => v.toFixed(3)).join(',');
  const url = `https://eonet.gsfc.nasa.gov/api/v3/events?category=${EONET_CATS.join(',')}&status=all&bbox=${bbox}` +
    `&start=${period.start}-01-01&end=${period.end}-12-31&limit=1000`;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 25000);
  let j;
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`NASA EONET HTTP ${r.status}`);
    j = await r.json();
  } finally { clearTimeout(t); }
  const byCat = Object.fromEntries(EONET_CATS.map(k => [k, []]));
  for (const e of j.events || []) {
    const cat = e.categories?.[0]?.id;
    if (!byCat[cat]) continue;
    let best = null;
    for (const g of e.geometry || []) {
      if (g.type !== 'Point') continue;
      const d = hav(lat, lon, g.coordinates[1], g.coordinates[0]);
      if (d <= radiusKm && (!best || d < best.d)) best = { d, g };
    }
    if (!best) continue;
    const mag = best.g.magnitudeValue != null ? `${best.g.magnitudeValue} ${best.g.magnitudeUnit || ''}`.trim() : null;
    byCat[cat].push({
      title: e.title, date: (best.g.date || '').slice(0, 10), dist: Math.round(best.d), mag,
      magValue: best.g.magnitudeValue, magUnit: best.g.magnitudeUnit,
      url: e.sources?.[0]?.url || e.link, src: e.sources?.map(x => x.id).join('/') || 'EONET'
    });
  }
  for (const k of EONET_CATS) byCat[k].sort((a, b) => b.date.localeCompare(a.date));
  return { byCat, truncated: (j.events || []).length >= 1000, fetchedAt: Date.now() };
}
