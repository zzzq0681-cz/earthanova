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
            <img className="brand-logo" src="/logo.png" alt="" width={44} height={44} />
            <span><b>EARTHANOVA</b><small>Explore Earth. Understand change.</small></span>
          </a>
          <nav className="topnav" id="topnav" aria-label="Primary">
            <button data-nav="dashboard"><i data-ic="home" /><span className="lbl">Dashboard</span></button>
            {" "}
            <button data-nav="projects"><i data-ic="layers" /><span className="lbl">Projects</span></button>
            {" "}
            <button data-nav="risk" title="Risk Monitoring"><i data-ic="radar" /><span className="lbl">Risk</span></button>
            {" "}
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
                {/* BASIC: plain language for students and the public */}
                <article className="card summary" data-views="basic" aria-labelledby="sumH">
                  <header className="card-h">
                    <h2 id="sumH"><i data-ic="bulb" />In plain words</h2><div className="right"><span className="tag">NASA open data</span></div>
                  </header>
                  <div id="sumBody" />
                </article>
                <article className="card case" data-views="basic" aria-labelledby="caseH">
                  <header className="card-h">
                    <h2 id="caseH"><i data-ic="search" />Case board: what is changing here?</h2>
                  </header>
                  <p className="card-lead" id="caseLead" />
                  <div className="case-grid" id="caseGrid" />
                </article>
                <article className="card toolkit" data-views="basic" aria-labelledby="tkH">
                  <header className="card-h">
                    <h2 id="tkH"><i data-ic="book" />Detective toolkit: words you will meet</h2>
                  </header>
                  <div id="toolkit" />
                </article>
                <article className="card ba" data-views="basic" aria-labelledby="baH">
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
                {/* ADVANCED: explore, test and compare variables */}
                <article className="card xp" data-views="advanced" aria-labelledby="xpH">
                  <header className="card-h">
                    <h2 id="xpH"><i data-ic="flask" />Variable explorer</h2><div className="right"><span className="tag cyan">NASA POWER monthly, 1981 onward</span></div>
                  </header>
                  <div id="advExplorer" />
                </article>
                <article className="card vs" data-views="advanced" aria-labelledby="vsH">
                  <header className="card-h">
                    <h2 id="vsH"><i data-ic="compare" />Compare two variables</h2>
                  </header>
                  <div id="advVs" />
                </article>
                <article className="card mx" data-views="advanced" aria-labelledby="mxH">
                  <header className="card-h">
                    <h2 id="mxH"><i data-ic="layers" />Correlation matrix</h2>
                  </header>
                  <div id="advMatrix" />
                </article>
                <article className="card tt" data-views="advanced" aria-labelledby="ttH">
                  <header className="card-h">
                    <h2 id="ttH"><i data-ic="trend" />Trend tests for every variable</h2>
                  </header>
                  <div className="tbl-scroll" id="advTrendTbl" />
                </article>
                <article className="card nasa" id="nasaCard" hidden data-views="advanced" aria-labelledby="nasaH">
                  <header className="card-h">
                    <h2 id="nasaH"><i data-ic="trend" />12-month temperature forecast <small id="nasaSub" /></h2>
                    <div className="right"><span className="tag" title="Monthly NASA POWER data (MERRA-2 / CERES), 1981 to 2025">NASA POWER</span></div>
                  </header>
                  <p className="nasa-head" id="nasaHead" />
                  <div className="nasa-grid">
                    <div className="nasa-charts">
                      <h3>Last 5 years and next 12 months (90% band)</h3>
                      <svg className="nasa-chart" id="nasaMonthly" role="img" aria-label="Monthly temperature, last five years, with a 12 month forecast and uncertainty band" />
                      <table className="sr-only" id="nasaFcTable">
                        <caption>12-month temperature forecast</caption>
                        <thead><tr><th>Month</th><th>Forecast °C</th><th>90% low</th><th>90% high</th></tr></thead>
                        <tbody />
                      </table>
                    </div>
                    <div className="nasa-side">
                      <h3>Notes on the data</h3>
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
                <article className="card " data-views="advanced" aria-labelledby="advYearsH">
                  <header className="card-h">
                    <h2 id="advYearsH"><i data-ic="bars" />Yearly record <small>study period, calendar years</small></h2>
                  </header>
                  <div className="tbl-scroll" id="advYears" />
                </article>
                <article className="card " data-views="advanced" aria-labelledby="advHazH">
                  <header className="card-h">
                    <h2 id="advHazH"><i data-ic="quake" />Hazard catalogue</h2><div className="right"><button className="link-btn" data-nav-link="risk">Open Risk Monitoring<i data-ic="chevr" /></button></div>
                  </header>
                  <div id="advHaz" />
                </article>
                <article className="card " data-views="advanced" aria-labelledby="advExpH">
                  <header className="card-h">
                    <h2 id="advExpH"><i data-ic="download" />Export &amp; methods</h2>
                  </header>
                  <div id="advExport" />
                </article>
                {/* PLAYFUL: games built from the same data */}
                <article className="card quest" data-views="playful" aria-labelledby="qH">
                  <header className="card-h">
                    <h2 id="qH"><i data-ic="trophy" />Detective rank</h2><div className="right"><span className="tag mint" id="qLevelTag">Level 1</span></div>
                  </header>
                  <div id="questBody" />
                </article>
                <article className="card finger" data-views="playful" aria-labelledby="fH">
                  <header className="card-h">
                    <h2 id="fH"><i data-ic="thermo" />Climate fingerprint</h2>
                  </header>
                  <div id="funFinger" />
                </article>
                <article className="card quiz" data-views="playful" aria-labelledby="zH">
                  <header className="card-h">
                    <h2 id="zH"><i data-ic="search" />Case files <small>every answer is hidden in the real data</small></h2><div className="right"><div id="quizMeta" /></div>
                  </header>
                  <div id="quizBody" />
                </article>
                <article className="card guess" data-views="playful" aria-labelledby="gH">
                  <header className="card-h">
                    <h2 id="gH"><i data-ic="bolt" />Beat the forecast</h2>
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
          <section className="page" id="pageCompare" aria-label="Compare places" />
          <section className="page" id="pageReports" aria-label="Reports" />
        </main>
      </div>
      <div className="splash" id="splash" role="status" aria-live="polite">
        <div className="splash-inner">
          <img className="splash-logo" src="/logo.png" alt="" width={96} height={96} />
          <p className="eyebrow">Open climate &amp; hazard data · any point on Earth</p>
          <h1>EARTHANOVA</h1>
          <p className="tagline">Explore Earth. Detect Change. Understand What Comes Next.</p>
          <div className="splash-bar" aria-hidden="true">
            <span id="splashFill" />
          </div>
          <p className="splash-note" id="splashNote">Preparing your Earth explorer…</p>
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
