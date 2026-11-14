/*
 * Static markup for the Earthanova single-page app, converted from the
 * original index.html. lib/earthanova.js finds these elements by id/data-*
 * attributes and drives them imperatively, so keep ids and data-* intact.
 */
export default function EarthanovaMarkup() {
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id="metal" x1="0" x2="1">
            <stop offset="0" stopColor="#16324a" />
            <stop offset=".5" stopColor="#a9cfe2" />
            <stop offset="1" stopColor="#16324a" />
          </linearGradient>
          <linearGradient id="cabin" x1="0" x2="1">
            <stop offset="0" stopColor="#10293d" />
            <stop offset=".55" stopColor="#3d6e8c" />
            <stop offset="1" stopColor="#10293d" />
          </linearGradient>
          <radialGradient id="baseGlow">
            <stop offset="0" stopColor="#22D3EE" stopOpacity=".9" />
            <stop offset="1" stopColor="#22D3EE" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <symbol id="tower" viewBox="0 0 80 140" overflow="visible">
            <ellipse cx="40" cy="130" rx="38" ry="10" fill="url(#baseGlow)" />
            <ellipse cx="40" cy="126" rx="27" ry="7.5" fill="#0d2638" stroke="#22D3EE" strokeWidth="1.6" filter="url(#glow)" />
            <ellipse cx="40" cy="121" rx="19" ry="5" fill="#16374f" stroke="#7fdcf3" strokeWidth="1" />
            <polygon points="29,121 51,121 45.5,52 34.5,52" fill="url(#metal)" />
            <g stroke="#0d2638" strokeWidth="1.3" fill="none">
              <path d="M30.5 108 L49.5 108 M32 92 L48 92 M33.3 76 L46.7 76 M34.2 63 L45.8 63" />
              <path d="M30.5 108 L48 92 M49.5 108 L32 92 M32 92 L46.7 76 M48 92 L33.3 76 M33.3 76 L45.8 63 M46.7 76 L34.2 63" />
            </g>
            <rect x="20" y="42" width="40" height="9" rx="2" fill="url(#cabin)" />
            <ellipse cx="40" cy="51" rx="20" ry="5.5" fill="none" stroke="#22D3EE" strokeWidth="1.8" filter="url(#glow)" />
            <ellipse cx="40" cy="42" rx="20" ry="5.5" fill="#1d4561" stroke="#7fdcf3" strokeWidth="1" />
            <rect x="29" y="22" width="22" height="19" rx="3" fill="url(#cabin)" />
            <rect x="29" y="28" width="22" height="3" fill="#22D3EE" opacity=".85" filter="url(#glow)" />
            <ellipse cx="40" cy="22" rx="11" ry="3" fill="#2a5a78" />
            <line x1="40" y1="20" x2="40" y2="2" stroke="#a9cfe2" strokeWidth="1.6" />
            <circle cx="40" cy="2" r="2" fill="#FF6178" />
            <path d="M52 26 q9 -3 10 -12" stroke="#a9cfe2" strokeWidth="1.4" fill="none" />
            <ellipse cx="60" cy="14" rx="7" ry="4" transform="rotate(-35 60 14)" fill="#cfe6f2" stroke="#7fa9bf" />
            <path d="M22 30 l-6 -4 M22 34 l-7 0" stroke="#a9cfe2" strokeWidth="1.3" />
          </symbol>
        </defs>
      </svg>
      <div className="app">
        <header className="topbar">
          <a className="brand" href="#" id="homeLink" aria-label="Earthanova — home">
            <svg className="brand-logo" viewBox="0 0 48 48" aria-hidden="true">
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#7ff0ff" />
                  <stop offset="1" stopColor="#1aa6d6" />
                </linearGradient>
              </defs>
              <circle cx="24" cy="24" r="21" fill="none" stroke="url(#lg)" strokeWidth="2.4" />
              <path d="M24 3 A21 21 0 0 1 45 24" fill="none" stroke="#22D3EE" strokeWidth="4" strokeLinecap="round" filter="url(#glow)" />
              <circle cx="24" cy="24" r="13" fill="none" stroke="url(#lg)" strokeWidth="2" />
              <circle cx="24" cy="24" r="5" fill="#22D3EE" filter="url(#glow)" />
              <path d="M24 24 L38 10" stroke="#EAF8FF" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span><b>EARTHANOVA</b><small>Explore Earth. Understand change.</small></span>
          </a>
          <nav className="topnav" id="topnav" aria-label="Primary">
            <button data-nav="dashboard"><i data-ic="home" /><span className="lbl">Dashboard</span></button>
            {" "}
            <button data-nav="projects"><i data-ic="layers" /><span className="lbl">Projects</span></button>
            {" "}
            <button data-nav="risk" title="Risk Monitoring"><i data-ic="radar" /><span className="lbl">Risk</span></button>
            {" "}
            <button data-nav="tracking" title="Hazard Tracking"><i data-ic="pulse" /><span className="lbl">Tracking</span></button>
            {" "}
            <button data-nav="compare" title="Compare places"><i data-ic="compare" /><span className="lbl">Compare</span></button>
            {" "}
            <button data-nav="reports"><i data-ic="file" /><span className="lbl">Reports</span></button>
          </nav>
          <div className="top-actions">
            <form className="search" role="search" id="searchForm" autoComplete="off">
              <i data-ic="search" />
              {" "}
              <label className="sr-only" htmlFor="searchInput">Search a place</label>
              {" "}
              <input id="searchInput" type="search" placeholder="Search any city or place…" role="combobox" aria-expanded="false" aria-controls="searchResults" aria-autocomplete="list" />
              <ul className="search-results" id="searchResults" role="listbox" aria-label="Search results" />
            </form>
            <button className="btn-cta" id="scanRegionBtn" aria-label="Search or scan a region">
              <i data-ic="search" />
              <span className="cta-t">Search / Scan a Region</span>
            </button>
            {" "}
            <button className="btn-ghost" id="loginBtn"><i data-ic="user" /><span className="cta-t">Log in</span></button>
            <div className="user" id="userMenu">
              <button className="avatar" id="userBtn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">EA</button>
              <div className="user-pop" id="userPop" role="menu" hidden>
                <div className="up-head">
                  <b id="upName">—</b>
                  <span id="upEmail">—</span>
                  <span className="tag cyan" id="upRole">—</span>
                </div>
                <div className="up-plan">
                  <span className="tag mint" id="upPlan">Basic plan</span>
                </div>
                <div className="up-links">
                  <button className="btn-ghost" data-nav="profile" role="menuitem"><i data-ic="user" />My profile</button>
                  <button className="btn-ghost" data-nav="plans" role="menuitem"><i data-ic="star" />Plans &amp; subscription</button>
                </div>
                <p className="up-label">Default dashboard view</p>
                <div className="seg seg-sm" id="upViews" role="group" aria-label="Default view">
                  <button data-setview="basic">Basic</button>
                  <button data-setview="advanced">Advanced</button>
                  <button data-setview="playful">Playful</button>
                </div>
                <button className="btn-ghost up-out" id="logoutBtn" role="menuitem"><i data-ic="logout" />Log out</button>
              </div>
            </div>
          </div>
        </header>
        <main className="main" id="main">
          <section className="stage" id="stage" aria-label="3D Earth explorer">
            <div className="globe-wrap" id="globeWrap">
              <div id="globe" />
              <div className="globe-fallback" aria-hidden="true" />
            </div>
            <p className="webgl-note">WebGL unavailable — showing a simplified globe. Use search to pick a place.</p>
            <div className="idle-ui">
              <p className="hint">Drag to rotate · Scroll to zoom · Click anywhere on Earth · or search above</p>
              <div className="presets" role="group" aria-label="Featured and saved locations" id="presets" />
            </div>
            <div className="popup" id="popup" role="dialog" aria-labelledby="popTitle" aria-describedby="popSub">
              <div className="pop-top">
                <span className="tag mint">Open data</span>
                <button className="icon-btn" id="popClose" aria-label="Close">
                  <svg className="ic" viewBox="0 0 24 24">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <h2 id="popTitle">Alexandria, Egypt</h2>
              <p className="coords mono" id="popCoords">31.20° N · 29.92° E</p>
              <p className="sub" id="popSub">Climate: NASA POWER grid cell (~50 km)</p>
              <div className="field">
                <label htmlFor="radius">Hazard search radius</label>
                {" "}
                <select id="radius" defaultValue="300">
                  <option value="100">100 km</option>
                  <option value="300">300 km</option>
                  <option value="500">500 km</option>
                </select>
              </div>
              <div className="field field-col">
                <label htmlFor="pStart">Study period</label>
                {" "}
                <span className="pair"><select id="pStart" aria-label="From year" /><span>to</span><select id="pEnd" aria-label="To year" /></span>
              </div>
              <div className="quick" id="pQuick" role="group" aria-label="Quick periods">
                <button type="button" data-q="3">Last 3 yrs</button>
                <button type="button" data-q="5">Last 5 yrs</button>
                <button type="button" data-q="7">Last 7 yrs</button>
                <button type="button" data-q="12">Last 12 yrs</button>
              </div>
              <div className="pop-actions">
                <button className="btn-primary" id="scanBtn"><i data-ic="scan" />Scan Area</button>
                {" "}
                <button className="btn-secondary" id="changeBtn">Change Location</button>
              </div>
              <p className="pop-note" id="popNote"><i data-ic="lock" />Free account needed to run a scan.</p>
            </div>
            <svg className="link-line" aria-hidden="true">
              <line x1="26%" y1="50%" x2="40%" y2="50%" />
              <circle cx="40%" cy="50%" r="3.5" />
            </svg>
            <div className="stage-head">
              <div className="loc-row">
                <div className="loc-pill">
                  <i data-ic="pin" />
                  {" "}
                  <label className="sr-only" htmlFor="locSelect">Location</label>
                  {" "}
                  <select id="locSelect" />
                  {" "}
                  <span className="chev"><i data-ic="chev" /></span>
                </div>
                <button className="fav" id="favBtn" aria-pressed="false" aria-label="Mark as a project (I study this place)" title="Star = I am studying this place (adds it to Projects)">
                  <i data-ic="star" />
                </button>
              </div>
              <p className="loc-meta">
                <span className="mono" id="locCoords">31.20° N, 29.92° E</span>
                <span className="sep" />
                <span>Elevation <b id="locElev">—</b></span>
                <span className="sep" />
                <span>Hazard radius <b id="locArea">300 km</b></span>
              </p>
            </div>
            <div className="inset-wrap" id="insetWrap">
              <div className="inset">
                <div className="inset-map mosaic" id="insetMap" data-z="12" data-src="live" />
                <div className="inset-tint" />
                <svg className="inset-svg" id="insetSvg" viewBox="0 0 400 480" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Scan target over the selected area" />
              </div>
              <svg className="inset-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polygon points="9,0 100,0 100,90 91,100 0,100 0,10" />
                <line className="tick" x1="40" y1="0" x2="60" y2="0" />
                <line className="tick" x1="100" y1="35" x2="100" y2="55" />
              </svg>
              <p className="st-explain" id="stExplain" aria-live="polite">Scanning the area…</p>
            </div>
            <div className="statusbar" id="statusbar">
              <div className="sb-title">
                <span className="dot" />
                <span>Scan — <span id="sbName">Alexandria</span></span>
              </div>
              <div className="sb-items">
                <div className="sb-item">
                  <i data-ic="pulse" />
                  <div>
                    <b id="sbSrc">NASA POWER</b>
                    <span>MERRA-2 · CERES</span>
                  </div>
                </div>
                <button className="chip ok" id="sbChip" title="Re-fetch data from the sources"><i data-ic="check" /><span>Data ready</span></button>
              </div>
            </div>
          </section>
          <section className="dash" id="dash" aria-label="Analysis dashboard">
            <div className="scan-progress" id="scanProgress">
              <div className="sp-ring">
                <svg viewBox="0 0 140 140">
                  <circle className="bg" cx="70" cy="70" r="65" />
                  <circle className="fg" id="spFg" cx="70" cy="70" r="65" />
                </svg>
                <span id="spPct">0%</span>
              </div>
              <h2>Scanning <span id="spName">Alexandria</span></h2>
              <ol className="sp-steps" id="spSteps">
                <li data-k="era5">NASA POWER climate record 2019–2025 <small>MERRA-2</small></li>
                <li data-k="cmip">NASA climate projections <small>not loaded yet</small></li>
                <li data-k="hazard">Hazards <small>NASA EONET · USGS</small></li>
                <li data-k="air">Air quality <small>not loaded yet</small></li>
                <li data-k="img">Historical imagery <small>Esri Wayback</small></li>
              </ol>
              <p className="sp-note" id="spNote">Fetching open datasets for this point.</p>
              <div className="sp-error" role="alert">
                <p id="spErrMsg">Could not load the climate record.</p>
                <div className="pop-actions">
                  <button className="btn-primary" id="retryBtn"><i data-ic="refresh" />Retry</button>
                  <button className="btn-secondary" id="errChange">Change Location</button>
                </div>
              </div>
            </div>
            <div className="dash-body" id="dashBody">
              <div className="dash-head">
                <div className="dh-title">
                  <h1 id="dhTitle">Alexandria, Egypt</h1>
                  <p id="dhSub">—</p>
                </div>
                <div className="scan-ctl" id="scanCtl">
                  <label className="sr-only" htmlFor="dStart">From</label>
                  <select id="dStart" />
                  <span>to</span>
                  <label className="sr-only" htmlFor="dEnd">To</label>
                  <select id="dEnd" />
                  <label className="sr-only" htmlFor="dRad">Radius</label>
                  <select id="dRad"><option value="100">100 km</option><option value="300">300 km</option><option value="500">500 km</option></select>
                  <button className="btn-secondary" id="rescanBtn"><i data-ic="refresh" />Re-scan</button>
                </div>
                <div className="seg" id="viewSeg" role="group" aria-label="Dashboard view">
                  <button data-setview="basic" aria-pressed="true" title="Plain language for everyone"><i data-ic="eye" />Basic</button>
                  {" "}
                  <button data-setview="advanced" aria-pressed="false" title="Full detail for scientists and researchers">
                    <i data-ic="flask" />
                    Advanced
                  </button>
                  {" "}
                  <button data-setview="playful" aria-pressed="false" title="Student-friendly with quizzes and games">
                    <i data-ic="bolt" />
                    Playful
                  </button>
                </div>
              </div>
              <div className="cards" id="cards">
                {/* BASIC */}
                <article className="card summary" data-views="basic" aria-labelledby="sumH">
                  <header className="card-h">
                    <h2 id="sumH"><i data-ic="bulb" />In plain words</h2>
                    <div className="right">
                      <span className="tag">NASA open data</span>
                    </div>
                  </header>
                  <div id="sumBody" />
                </article>
                <article className="card hi" data-views="basic advanced" aria-labelledby="hiH">
                  <header className="card-h">
                    <h2 id="hiH"><i data-ic="brain" />Human Intelligence</h2>
                    <div className="right">
                      <span className="tag">Indicative</span>
                      <button className="icon-btn" aria-label="About these cards" title="Rule-based readings of open datasets. Not investment, safety or living advice.">
                        <i data-ic="info" />
                      </button>
                    </div>
                  </header>
                  <div className="hi-grid" id="hiGrid" />
                </article>
                <article className="card ba" data-views="basic advanced" aria-labelledby="baH">
                  <header className="card-h">
                    <h2 id="baH"><i data-ic="compare" />Before vs After</h2>
                    <div className="right">
                      <i data-ic="calendar" />
                      <span id="baRange">2019–2023 avg vs 2024–2025 avg</span>
                    </div>
                  </header>
                  <div className="ba-grid">
                    <div className="ba-panel">
                      <div className="mosaic" id="baBefore" data-z="13" data-src="before" />
                      <div className="ba-label">
                        <b id="baBeforeT">Baseline 2019–2023</b>
                        <span id="baBeforeVals">—</span>
                      </div>
                      <span className="ba-date" id="baBeforeDate">Imagery —</span>
                    </div>
                    <div className="ba-arrow" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 6l6 6-6 6M12 6l6 6-6 6" />
                      </svg>
                    </div>
                    <div className="ba-panel">
                      <div className="mosaic" id="baAfter" data-z="13" data-src="after" />
                      <div className="ba-label">
                        <b id="baAfterT">Current 2024–2025</b>
                        <span id="baAfterVals">—</span>
                      </div>
                      <span className="ba-date" id="baAfterDate">Imagery —</span>
                    </div>
                  </div>
                  <p className="ba-note" id="baNote">Imagery: Esri World Imagery Wayback (release dates). Climate: NASA POWER (MERRA-2).</p>
                </article>
                <article className="card fc" data-views="basic advanced" aria-labelledby="fcH">
                  <header className="card-h">
                    <h2 id="fcH"><i data-ic="bars" />5-Year Outlook <small>annual mean temperature, °C</small></h2>
                    <div className="right">
                      <span className="tag amber" title="Scenario outlook (NASA NEX-GDDP-CMIP6, not loaded yet). Projections are scenario-based, not weather forecasts.">
                        Scenario outlook · not a forecast
                      </span>
                    </div>
                  </header>
                  <div className="fc-grid">
                    <div className="chart-wrap" id="chartWrap">
                      <svg id="chart" aria-hidden="true">
                        <defs>
                          <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop id="fcStop1" offset="0" stopColor="#22D3EE" stopOpacity=".30" />
                            <stop offset="1" stopColor="#22D3EE" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <g className="grid" id="fcGrid" />
                        <g className="ref" id="fcRef" />
                        <path id="fcBand" />
                        <path id="obsLine" />
                        <path id="fcLine" />
                        <line className="xh" id="fcXh" />
                        <g id="fcDots" />
                        <g id="fcLabels" />
                        <rect id="fcHit" fill="transparent" />
                      </svg>
                      <div className="tip" id="fcTip" />
                      <table className="sr-only" id="fcTable">
                        <caption>Observed and projected annual mean temperature</caption>
                        <thead>
                          <tr>
                            <th>Year</th>
                            <th>Observed (NASA POWER)</th>
                            <th>Model low</th>
                            <th>Ensemble mean</th>
                            <th>Model high</th>
                          </tr>
                        </thead>
                        <tbody />
                      </table>
                    </div>
                    <div className="scen">
                      <h3>Scenarios · 2030</h3>
                      <div className="scen-list" role="group" aria-label="Projection band">
                        <button className="scen-btn" data-s="low" aria-pressed="false">
                          <i data-ic="leaf" />
                          <span className="nm">Model low</span>
                          <span className="dv">—</span>
                        </button>
                        {" "}
                        <button className="scen-btn" data-s="mean" aria-pressed="true">
                          <i data-ic="trend" />
                          <span className="nm">Ens. mean</span>
                          <span className="dv">—</span>
                        </button>
                        {" "}
                        <button className="scen-btn" data-s="high" aria-pressed="false">
                          <i data-ic="alert" />
                          <span className="nm">Model high</span>
                          <span className="dv">—</span>
                        </button>
                      </div>
                      <p className="scen-note" id="scenNote">Shaded band = range of 4 CMIP6 models.</p>
                    </div>
                  </div>
                </article>
                <article className="card nasa" id="nasaCard" hidden data-views="basic advanced" aria-labelledby="nasaH">
                  <header className="card-h">
                    <h2 id="nasaH"><i data-ic="trend" />NASA time series &amp; 12-month forecast <small id="nasaSub" /></h2>
                    <div className="right"><span className="tag" title="Monthly NASA POWER data (MERRA-2 / CERES), 1981 to 2025">NASA POWER</span></div>
                  </header>
                  <p className="nasa-head" id="nasaHead" />
                  <div className="nasa-grid">
                    <div className="nasa-charts">
                      <h3>Annual mean temperature and trend</h3>
                      <svg className="nasa-chart" id="nasaAnnual" role="img" aria-label="Annual mean temperature 1981 to 2025 with trend line" />
                      <h3>Last 5 years and next 12 months (90% band)</h3>
                      <svg className="nasa-chart" id="nasaMonthly" role="img" aria-label="Monthly temperature, last five years, with a 12 month forecast and uncertainty band" />
                      <table className="sr-only" id="nasaFcTable">
                        <caption>12-month temperature forecast</caption>
                        <thead><tr><th>Month</th><th>Forecast °C</th><th>90% low</th><th>90% high</th></tr></thead>
                        <tbody />
                      </table>
                    </div>
                    <div className="nasa-side">
                      <h3>Long-term trends</h3>
                      <table className="tbl nasa-tbl" id="nasaTrends">
                        <thead><tr><th>Variable</th><th>Per decade</th><th>p</th><th>Sig.</th></tr></thead>
                        <tbody />
                      </table>
                      <ul className="nasa-cav" id="nasaCaveats" />
                      <h3>How reliable is the forecast?</h3>
                      <table className="tbl nasa-tbl" id="nasaRel">
                        <thead><tr><th>Ahead</th><th>Baseline RMSE</th><th>ML RMSE</th><th>ML better</th></tr></thead>
                        <tbody />
                      </table>
                      <p className="scen-note">Rolling backtest 2011–2025 (°C). The ML step only helps at short horizons; longer forecasts use the seasonal + trend baseline. Bands are approximate.</p>
                      <div className="btn-row" id="nasaLinks" />
                    </div>
                  </div>
                </article>
                <article className="card kc" data-views="basic advanced" aria-labelledby="kcH">
                  <header className="card-h">
                    <h2 id="kcH"><i data-ic="bars" />Key Changes</h2>
                    <div className="right">
                      <button className="link-btn" data-nav-link="risk">Risk Monitoring<i data-ic="chevr" /></button>
                    </div>
                  </header>
                  <div className="kc-grid" id="kcGrid" />
                  <p className="verdict" id="verdict" />
                </article>
                {/* ADVANCED */}
                <article className="card" data-views="advanced" aria-labelledby="advStatsH">
                  <header className="card-h">
                    <h2 id="advStatsH"><i data-ic="flask" />Statistical summary</h2>
                    <div className="right">
                      <span className="tag cyan">Researcher detail</span>
                    </div>
                  </header>
                  <div id="advStats" />
                </article>
                <article className="card" data-views="advanced" aria-labelledby="advYearsH">
                  <header className="card-h">
                    <h2 id="advYearsH"><i data-ic="bars" />Yearly record <small>NASA POWER (temperature, soil, solar) · NASA GPM IMERG (rain) · calendar years</small></h2>
                  </header>
                  <div className="tbl-scroll" id="advYears" />
                </article>
                <article className="card" data-views="advanced" aria-labelledby="advModelsH">
                  <header className="card-h">
                    <h2 id="advModelsH"><i data-ic="trend" />CMIP6 model ensemble <small>2026–2030, bias-adjusted</small></h2>
                  </header>
                  <div className="tbl-scroll" id="advModels" />
                </article>
                <article className="card" data-views="advanced" aria-labelledby="advHazH">
                  <header className="card-h">
                    <h2 id="advHazH"><i data-ic="quake" />Hazard catalogue</h2>
                    <div className="right">
                      <button className="link-btn" data-nav-link="risk">Open Risk Monitoring<i data-ic="chevr" /></button>
                    </div>
                  </header>
                  <div id="advHaz" />
                </article>
                <article className="card" data-views="advanced" aria-labelledby="advExpH">
                  <header className="card-h">
                    <h2 id="advExpH"><i data-ic="download" />Export &amp; methods</h2>
                  </header>
                  <div id="advExport" />
                </article>
                {/* PLAYFUL */}
                <article className="card quest" data-views="playful" aria-labelledby="qH">
                  <header className="card-h">
                    <h2 id="qH"><i data-ic="trophy" />Planet Quest</h2>
                    <div className="right">
                      <span className="tag mint" id="qLevelTag">Level 1</span>
                    </div>
                  </header>
                  <div id="questBody" />
                </article>
                <article className="card fun" data-views="playful" aria-labelledby="fH">
                  <header className="card-h">
                    <h2 id="fH"><i data-ic="bulb" />Meet your place</h2>
                  </header>
                  <div className="fun-grid" id="funGrid" />
                </article>
                <article className="card quiz" data-views="playful" aria-labelledby="zH">
                  <header className="card-h">
                    <h2 id="zH"><i data-ic="bolt" />Quick quiz <small>answers hide in the real data</small></h2>
                    <div className="right" id="quizMeta" />
                  </header>
                  <div id="quizBody" />
                </article>
                <article className="card guess" data-views="playful" aria-labelledby="gH">
                  <header className="card-h">
                    <h2 id="gH"><i data-ic="trend" />Guess the future</h2>
                  </header>
                  <div id="guessBody" />
                </article>
              </div>
            </div>
          </section>
          <section className="page" id="pageProjects" aria-label="Projects" />
          <section className="page" id="pageRisk" aria-label="Risk Monitoring">
            <div className="page-in wide">
              <header className="page-h">
                <div>
                  <h1><i data-ic="radar" />Risk Monitoring</h1>
                  <p id="riskSub">One watch tower per natural hazard, all aimed at your scanned region. Hazard layers come from NASA EONET, MERRA-2, NASA-SSH and USGS.</p>
                </div>
                <div className="ph-actions">
                  <button className="btn-ghost" id="riskRescan"><i data-ic="refresh" />Rescan towers</button>
                </div>
              </header>
              <div className="risk" id="riskWrap">
                <div className="risk-main">
                  <div className="risk-scroll">
                    <div className="risk-stage" id="riskStage">
                      <div className="risk-map mosaic" id="riskMap" data-z="12" data-src="live" />
                      <div className="inset-tint" />
                      <svg className="risk-svg" id="riskSvg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Six hazard towers scanning the selected region" />
                    </div>
                    <p className="risk-hint">Swipe sideways to see all six towers</p>
                  </div>
                  <div className="risk-viz" id="towerViz" aria-live="polite" />
                </div>
                <aside className="risk-side">
                  <div className="risk-sum">
                    <p>Tower status</p>
                    <div className="counts" id="riskCounts" />
                  </div>
                  <ul className="tower-list" id="towerList" />
                  <div className="tower-detail" id="towerDetail" />
                </aside>
              </div>
              <div className="empty-state" id="riskEmpty" hidden>
                <i data-ic="radar" />
                <h3>No region scanned yet</h3>
                <p>Pick a place on the globe and scan it. Each tower will then analyse its own hazard.</p>
                <button className="btn-primary" data-act="go-home"><i data-ic="pin" />Pick a region</button>
              </div>
            </div>
          </section>
          <section className="page" id="pageTracking" aria-label="Hazard Tracking">
            <div className="page-in wide">
              <header className="page-h">
                <div>
                  <h1><i data-ic="pulse" />Hazard Tracking</h1>
                  <p id="trkSub">
                    Watch the regions you care about. Each tower follows one natural hazard: earthquakes, volcanoes, storms, floods and landslides over the last 30 days, plus long-term dust and sea level from NASA.
                  </p>
                </div>
                <div className="ph-actions">
                  <button className="btn-ghost" id="trkRefresh"><i data-ic="refresh" />Refresh</button>
                </div>
              </header>
              <div className="card trk-add">
                <div className="trk-row">
                  <form className="pick" id="trkForm" autoComplete="off">
                    <i data-ic="search" />
                    <label className="sr-only" htmlFor="trkInput">Add a region to track</label>
                    <input id="trkInput" type="search" placeholder="Add a region to track…" />
                    <ul className="pick-list" id="trkResults" hidden />
                  </form>
                  <button className="btn-secondary" data-act="trk-add-current"><i data-ic="pin" />Add current region</button>
                  {" "}
                  <button className="btn-secondary" data-act="trk-add-projects"><i data-ic="layers" />Add my projects</button>
                </div>
                <div className="chips trk-chips" id="trkChips" role="tablist" aria-label="Tracked regions" />
              </div>
              <div id="trkBody">
                <div className="card">
                  <div className="tbl-scroll" id="trkMatrix" />
                </div>
                <div className="risk" style={{ marginTop: "16px" }}>
                  <div className="risk-scroll">
                    <div className="risk-stage trk-stage">
                      <svg className="risk-svg" id="trkSvg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hazard watch towers for the selected region" />
                    </div>
                    <p className="risk-hint">Swipe sideways to see all six towers</p>
                  </div>
                  <aside className="risk-side">
                    <div className="risk-sum">
                      <p id="trkRegion">—</p>
                      <div className="counts" id="trkCounts" />
                    </div>
                    <ul className="tower-list" id="trkTowers" />
                    <div className="tower-detail" id="trkDetail" />
                  </aside>
                </div>
              </div>
              <div className="empty-state" id="trkEmpty" hidden />
            </div>
          </section>
          <section className="page" id="pageCompare" aria-label="Compare places" />
          <section className="page" id="pagePlans" aria-label="Plans" />
          <section className="page" id="pageProfile" aria-label="Profile" />
          <section className="page" id="pageReports" aria-label="Reports" />
        </main>
      </div>
      <div className="splash" id="splash" role="status" aria-live="polite">
        <div className="splash-inner">
          <svg className="splash-logo" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="21" fill="none" stroke="#22D3EE" strokeWidth="2.4" />
            <path d="M24 3 A21 21 0 0 1 45 24" fill="none" stroke="#7ff0ff" strokeWidth="4" strokeLinecap="round" filter="url(#glow)" />
            <circle cx="24" cy="24" r="13" fill="none" stroke="#22D3EE" strokeWidth="2" />
            <circle cx="24" cy="24" r="5" fill="#22D3EE" filter="url(#glow)" />
          </svg>
          <p className="eyebrow">Open climate &amp; hazard data · any point on Earth</p>
          <h1>EARTHANOVA</h1>
          <p className="tagline">Explore Earth. Detect Change. Understand What Comes Next.</p>
          <div className="splash-bar" aria-hidden="true">
            <span id="splashFill" />
          </div>
          <p className="splash-note" id="splashNote">Preparing your Earth explorer…</p>
        </div>
      </div>
      <div className="modal" id="auth" role="dialog" aria-modal="true" aria-labelledby="authTitle" hidden>
        <div className="modal-card">
          <button className="icon-btn modal-x" id="authClose" aria-label="Close"><i data-ic="close" /></button>
          <aside className="auth-side">
            <svg className="brand-logo" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="21" fill="none" stroke="#22D3EE" strokeWidth="2.4" />
              <circle cx="24" cy="24" r="13" fill="none" stroke="#22D3EE" strokeWidth="2" />
              <circle cx="24" cy="24" r="5" fill="#22D3EE" />
            </svg>
            <h3>Scan any place on Earth</h3>
            <ul>
              <li><i data-ic="scan" />Climate history and 5-year outlook</li>
              <li><i data-ic="radar" />One watch tower per natural hazard</li>
              <li><i data-ic="layers" />Star places to keep as your projects</li>
              <li><i data-ic="file" />Save your research as PDF reports</li>
            </ul>
            <p>Your dashboard adapts to you: simple for everyone, detailed for scientists, playful for students.</p>
          </aside>
          <div className="auth-main">
            <p className="eyebrow" id="authReason">Create a free account to continue.</p>
            <h2 id="authTitle">Create your account</h2>
            <div className="tabs" role="tablist" aria-label="Account">
              <button role="tab" data-mode="register" aria-selected="true">Register</button>
              {" "}
              <button role="tab" data-mode="login" aria-selected="false">Log in</button>
            </div>
            <form id="loginForm" className="form" noValidate>
              <label>Email<input id="liEmail" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
              {" "}
              <label>Password<input id="liPass" type="password" autoComplete="current-password" required placeholder="Your password" /></label>
              <p className="form-err" id="liErr" role="alert" />
              <button className="btn-primary" type="submit">Log in</button>
            </form>
            <form id="regForm1" className="form" noValidate>
              <p className="step">Step 1 of 2 · Your account</p>
              <label>Full name<input id="rgName" type="text" autoComplete="name" required placeholder="Your name" /></label>
              {" "}
              <label>Email<input id="rgEmail" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
              {" "}
              <label>
                Password
                <input id="rgPass" type="password" autoComplete="new-password" required minLength={6} placeholder="At least 6 characters" />
              </label>
              <p className="form-err" id="rg1Err" role="alert" />
              <button className="btn-primary" type="submit">Continue</button>
            </form>
            <form id="regForm2" className="form" noValidate>
              <p className="step">Step 2 of 2 · Tell us about you</p>
              <fieldset>
                <legend>Which describes you best?</legend>
                <div className="role-grid" id="roleGrid" />
              </fieldset>
              <label>Field or specialty<select id="rgField" /></label>
              <fieldset>
                <legend>What are you interested in? <span>(pick any)</span></legend>
                <div className="chips" id="interestGrid" />
              </fieldset>
              <label>What will you use Earthanova for?<select id="rgPurpose" /></label>
              <p className="form-err" id="rg2Err" role="alert" />
              <div className="pop-actions">
                <button className="btn-secondary" type="button" id="rgBack">Back</button>
                <button className="btn-primary" type="submit">Create account</button>
              </div>
            </form>
            <p className="auth-note">Demo accounts are stored only in this browser.</p>
          </div>
        </div>
      </div>
      <div className="modal" id="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT" hidden>
        <div className="dlg-card">
          <h3 id="dlgT" />
          <div className="dlg-b" id="dlgB" />
          <div className="btn-row dlg-a" id="dlgA" />
        </div>
      </div>
      <div className="toast" id="toast" role="status" />
      <p className="sr-only" aria-live="polite" id="announce" />
    </>
  );
}
