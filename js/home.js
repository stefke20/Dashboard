/* Front page: greeting & date, weather, news, today's snapshot, tasks, up next. */
(function (PD) {
  const { esc, $, $$, fmt, store } = PD;

  /* ---------- weather ---------- */
  const WMO = {
    0: ['Clear sky', '☀️', '🌙'], 1: ['Mainly clear', '🌤️', '🌙'], 2: ['Partly cloudy', '⛅', '☁️'], 3: ['Overcast', '☁️', '☁️'],
    45: ['Fog', '🌫️'], 48: ['Freezing fog', '🌫️'],
    51: ['Light drizzle', '🌦️', '🌧️'], 53: ['Drizzle', '🌦️', '🌧️'], 55: ['Heavy drizzle', '🌧️'],
    56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'],
    61: ['Light rain', '🌦️', '🌧️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
    66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'],
    71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 77: ['Snow grains', '🌨️'],
    80: ['Rain showers', '🌦️', '🌧️'], 81: ['Rain showers', '🌧️'], 82: ['Violent showers', '⛈️'],
    85: ['Snow showers', '🌨️'], 86: ['Snow showers', '❄️'],
    95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm, hail', '⛈️'], 99: ['Thunderstorm, hail', '⛈️'],
  };
  const wx = (code, isDay = 1) => { const w = WMO[code] || ['Unknown', '🌡️']; return { text: w[0], icon: (!isDay && w[2]) || w[1] }; };
  const windDir = (deg) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

  function cached(key, maxAgeMs) {
    try {
      const c = JSON.parse(localStorage.getItem(`pd.cache.${key}`));
      if (c && Date.now() - c.t < maxAgeMs) return c.v;
    } catch { /* ignore */ }
    return null;
  }
  const putCache = (key, v) => { try { localStorage.setItem(`pd.cache.${key}`, JSON.stringify({ t: Date.now(), v })); } catch { /* ignore */ } };
  const staleCache = (key) => { try { return JSON.parse(localStorage.getItem(`pd.cache.${key}`))?.v || null; } catch { return null; } };

  async function loadWeather(force) {
    const el = $('#weather');
    if (!el) return;
    const loc = store.get('settings').location;
    const ck = `wx.${loc.lat},${loc.lon}`;
    let data = !force && cached(ck, 15 * 60e3);
    if (!data) {
      el.classList.add('loading');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}`
        + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation'
        + '&hourly=temperature_2m,weather_code,precipitation_probability,is_day'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,precipitation_sum,uv_index_max'
        + '&timezone=auto&forecast_days=7';
      try { data = await PD.fetchJSON(url); putCache(ck, data); } catch (e) {
        data = staleCache(ck);
        if (!data) { el.classList.remove('loading'); el.innerHTML = weatherShell(loc, `<p class="empty">Couldn't load the weather (${esc(e.message)}). <button class="link" data-wx-retry>Try again</button></p>`); bindWeather(); return; }
      }
      el.classList.remove('loading');
    }
    renderWeather(data, loc);
  }

  const weatherShell = (loc, inner) => `
    <div class="card-head"><h2>Weather</h2><span class="muted small">${esc(loc.name)}</span>
      <button class="icon-btn sm" data-wx-retry title="Refresh" aria-label="Refresh weather"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg></button></div>${inner}`;

  function bindWeather() { $$('[data-wx-retry]').forEach((b) => (b.onclick = () => loadWeather(true))); }

  function renderWeather(d, loc) {
    const el = $('#weather');
    const c = d.current; const now = wx(c.weather_code, c.is_day);
    const nowIdx = Math.max(d.hourly.time.findIndex((t) => new Date(t) >= new Date(Date.now() - 3600e3)), 0);
    const hours = d.hourly.time.slice(nowIdx, nowIdx + 24).map((t, i) => ({
      t: new Date(t), temp: d.hourly.temperature_2m[nowIdx + i], code: d.hourly.weather_code[nowIdx + i],
      rain: d.hourly.precipitation_probability[nowIdx + i], day: d.hourly.is_day[nowIdx + i],
    }));
    const dl = d.daily;
    const tMin = Math.min(...dl.temperature_2m_min); const tMax = Math.max(...dl.temperature_2m_max);
    const tip = rainTip(hours);

    el.innerHTML = weatherShell(loc, `
      <div class="wx-now">
        <div class="wx-icon" aria-hidden="true">${now.icon}</div>
        <div>
          <div class="wx-temp">${Math.round(c.temperature_2m)}°</div>
          <div class="wx-desc">${esc(now.text)}</div>
        </div>
        <div class="wx-hilo">
          <span>H ${Math.round(dl.temperature_2m_max[0])}°</span>
          <span>L ${Math.round(dl.temperature_2m_min[0])}°</span>
        </div>
      </div>
      <p class="wx-tip">${esc(tip)}</p>
      <div class="wx-stats">
        <div><span>Feels like</span><b>${Math.round(c.apparent_temperature)}°</b></div>
        <div><span>Wind</span><b>${Math.round(c.wind_speed_10m)} km/h ${windDir(c.wind_direction_10m)}</b></div>
        <div><span>Humidity</span><b>${c.relative_humidity_2m}%</b></div>
        <div><span>UV max</span><b>${fmt.num(dl.uv_index_max[0], 0)}</b></div>
        <div><span>Sunrise</span><b>${fmt.time(new Date(dl.sunrise[0]))}</b></div>
        <div><span>Sunset</span><b>${fmt.time(new Date(dl.sunset[0]))}</b></div>
      </div>
      <div class="wx-hours" tabindex="0" aria-label="Hourly forecast">
        ${hours.map((h, i) => `<div class="wx-hour">
          <span class="muted small">${i === 0 ? 'Now' : fmt.time(h.t).slice(0, 2) + 'h'}</span>
          <span class="wx-hicon">${wx(h.code, h.day).icon}</span>
          <b>${Math.round(h.temp)}°</b>
          <span class="rain small${h.rain >= 50 ? ' strong' : ''}">${h.rain ?? 0}%</span>
        </div>`).join('')}
      </div>
      <ul class="wx-days">
        ${dl.time.map((t, i) => {
          const lo = dl.temperature_2m_min[i]; const hi = dl.temperature_2m_max[i];
          const left = ((lo - tMin) / (tMax - tMin || 1)) * 100; const width = ((hi - lo) / (tMax - tMin || 1)) * 100;
          return `<li>
            <span class="wx-day">${i === 0 ? 'Today' : fmt.weekday(PD.parseKey(t))}</span>
            <span class="wx-dicon" title="${esc(wx(dl.weather_code[i]).text)}">${wx(dl.weather_code[i]).icon}</span>
            <span class="rain small">${dl.precipitation_probability_max[i] ?? 0}%</span>
            <span class="muted">${Math.round(lo)}°</span>
            <span class="range"><i style="left:${left}%;width:${Math.max(width, 6)}%"></i></span>
            <b>${Math.round(hi)}°</b>
          </li>`;
        }).join('')}
      </ul>`);
    bindWeather();
    // sunrise/sunset also feeds the hero
    const sun = $('#heroSun');
    if (sun) sun.textContent = `☀ ${fmt.time(new Date(dl.sunrise[0]))} – ${fmt.time(new Date(dl.sunset[0]))}`;
    PD.daily.renderBriefing(); PD.settings.applyTheme(); // sunset theme uses today's sun times
  }

  function rainTip(hours) {
    const next = hours.slice(0, 12);
    const wet = next.find((h) => h.rain >= 50);
    if (!wet) {
      const max = Math.max(...next.map((h) => h.temp));
      return max >= 25 ? 'Dry and warm today — stay hydrated.' : 'No rain expected in the next 12 hours.';
    }
    if (wet === next[0]) return '☔ Rain likely right now — take an umbrella.';
    return `☔ Rain likely from about ${fmt.time(wet.t)} — take an umbrella.`;
  }

  /* ---------- news ---------- */
  let newsFilter = 'all';
  const NEWS_PAGE = 5;
  let newsLimit = NEWS_PAGE;

  function parseRSS(xml, source) {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const items = $$('item', doc).length ? $$('item', doc) : $$('entry', doc);
    return items.map((it) => {
      const get = (sel) => it.getElementsByTagName(sel)[0]?.textContent?.trim() || '';
      const link = get('link') || it.getElementsByTagName('link')[0]?.getAttribute('href') || '';
      const media = it.getElementsByTagName('media:content')[0] || it.getElementsByTagName('media:thumbnail')[0] || it.getElementsByTagName('enclosure')[0];
      return {
        title: get('title'), link, date: new Date(get('pubDate') || get('published') || get('updated') || get('dc:date')).getTime() || 0,
        img: media?.getAttribute('url') || '', source,
      };
    });
  }

  async function fetchFeed(feed) {
    const ck = `news.${feed.id}`;
    const hit = cached(ck, 20 * 60e3);
    if (hit) return hit;
    const enc = encodeURIComponent(feed.url);
    const strategies = [
      async () => {
        const j = await PD.fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${enc}`);
        if (j.status !== 'ok') throw new Error(j.message || 'rss2json failed');
        return j.items.map((i) => ({
          title: i.title, link: i.link, date: new Date(i.pubDate.replace(' ', 'T')).getTime() || 0,
          img: i.thumbnail || i.enclosure?.link || '', source: feed.name,
        }));
      },
      async () => parseRSS((await PD.fetchJSON(`https://api.allorigins.win/get?url=${enc}`)).contents, feed.name),
      async () => parseRSS(await PD.fetchText(`https://corsproxy.io/?url=${enc}`), feed.name),
    ];
    for (const s of strategies) {
      try {
        const items = (await s()).filter((i) => i.title && i.link).slice(0, 30);
        if (items.length) { putCache(ck, items); return items; }
      } catch { /* try next */ }
    }
    const stale = staleCache(ck);
    if (stale) return stale;
    throw new Error(`Could not load ${feed.name}`);
  }

  async function loadNews() {
    const el = $('#newsList');
    if (!el) return;
    const feeds = store.get('settings').feeds.filter((f) => f.enabled);
    if (!feeds.length) { el.innerHTML = '<p class="empty">No news sources enabled. Add some in Settings.</p>'; return; }
    el.innerHTML = '<div class="skeleton-list">' + '<div class="skeleton"></div>'.repeat(6) + '</div>';
    const results = await Promise.allSettled(feeds.map(fetchFeed));
    const failed = feeds.filter((_, i) => results[i].status === 'rejected').map((f) => f.name);
    const all = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    renderNews(all, feeds, failed);
  }

  function renderNews(all, feeds, failed) {
    const chips = $('#newsChips');
    chips.innerHTML = ['all', ...feeds.map((f) => f.name)].map((n) => `<button class="chip${newsFilter === n ? ' active' : ''}" data-src="${esc(n)}">${n === 'all' ? 'All' : esc(n)}</button>`).join('');
    $$('.chip', chips).forEach((b) => (b.onclick = () => { newsFilter = b.dataset.src; newsLimit = NEWS_PAGE; renderNews(all, feeds, failed); }));

    const list = all.filter((i) => newsFilter === 'all' || i.source === newsFilter).sort((a, b) => b.date - a.date);
    const el = $('#newsList');
    if (!list.length) {
      el.innerHTML = `<p class="empty">Couldn't load news right now${failed.length ? ` (${esc(failed.join(', '))})` : ''}. The feeds are fetched via public CORS proxies, which are sometimes rate-limited — try again in a minute.</p>`;
      return;
    }
    el.innerHTML = `<ul class="news">${list.slice(0, newsLimit).map((i) => `
      <li><a href="${esc(i.link)}" target="_blank" rel="noopener">
        ${i.img ? `<img src="${esc(i.img)}" alt="" loading="lazy" onerror="this.remove()">` : '<span class="news-noimg" aria-hidden="true"></span>'}
        <span class="news-text"><span class="news-title">${esc(i.title)}</span>
        <span class="muted small">${esc(i.source)}${i.date ? ` · ${fmt.ago(i.date)}` : ''}</span></span>
      </a></li>`).join('')}</ul>
      ${list.length > newsLimit ? '<button class="btn ghost full" id="newsMore">Show more</button>' : ''}
      ${failed.length ? `<p class="muted small">Not available right now: ${esc(failed.join(', '))}</p>` : ''}`;
    const more = $('#newsMore');
    if (more) more.onclick = () => { newsLimit += NEWS_PAGE; renderNews(all, feeds, failed); };
  }

  /* ---------- tasks ---------- */
  function renderTasks() {
    const el = $('#tasks');
    if (!el) return;
    const today = PD.todayKey();
    const tasks = store.get('tasks');
    const visible = tasks.filter((t) => !t.done || t.doneOn === today);
    const open = visible.filter((t) => !t.done).length;
    el.innerHTML = `
      <div class="card-head"><h2>Today's focus</h2><span class="muted small">${open} open</span></div>
      <form class="inline-form" id="taskForm">
        <input id="taskInput" placeholder="Add a task for today…" autocomplete="off" maxlength="140">
        <button class="btn" type="submit">Add</button>
      </form>
      <ul class="checklist">${visible.length ? visible.map((t) => `
        <li class="${t.done ? 'done' : ''}">
          <label><input type="checkbox" data-id="${t.id}" ${t.done ? 'checked' : ''}><span>${esc(t.text)}</span></label>
          ${t.date < today && !t.done ? `<span class="pill peach small">from ${esc(PD.relDay(t.date).toLowerCase())}</span>` : ''}
          <button class="icon-btn sm ghost" data-del="${t.id}" aria-label="Delete task"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
        </li>`).join('') : '<li class="empty">Nothing planned. Enjoy the day ✨</li>'}</ul>`;
    $('#taskForm').onsubmit = (e) => {
      e.preventDefault();
      const v = $('#taskInput').value.trim();
      if (!v) return;
      tasks.push({ id: PD.uid(), text: v, done: false, date: today });
      store.save('tasks'); renderTasks(); $('#taskInput').focus();
    };
    $$('input[type=checkbox]', el).forEach((cb) => (cb.onchange = () => {
      const t = tasks.find((x) => x.id === cb.dataset.id);
      t.done = cb.checked; t.doneOn = cb.checked ? today : null;
      store.save('tasks'); renderTasks();
    }));
    $$('[data-del]', el).forEach((b) => (b.onclick = () => {
      store.set('tasks', tasks.filter((x) => x.id !== b.dataset.del)); renderTasks();
    }));
  }

  /* ---------- up next (from calendar) ---------- */
  function renderAgenda() {
    const el = $('#agenda');
    if (!el) return;
    const items = PD.calendar.upcoming(14).slice(0, 7);
    el.innerHTML = `
      <div class="card-head"><h2>Up next</h2><a class="muted small" href="#calendar">Calendar →</a></div>
      ${items.length ? `<ul class="agenda">${items.map((e) => `
        <li><span class="dot ${PD.calendar.TYPES[e.type].cls}"${e.color && e.type === 'google' ? ` style="--ev:${esc(e.color)}"` : ''}></span>
          <span class="agenda-title">${esc(e.displayTitle)}</span>
          <span class="muted small">${esc(PD.relDay(e.occursOn))}${e.time ? ` · ${esc(e.time)}` : ''}</span></li>`).join('')}</ul>`
        : '<p class="empty">Nothing in the next two weeks. Add events, tasks and birthdays in the Calendar tab.</p>'}`;
  }

  /* ---------- snapshot tiles ---------- */
  function renderTiles() {
    const el = $('#tiles');
    if (!el) return;
    const today = PD.todayKey();
    const diet = store.get('diet'); const health = store.get('health');
    const eaten = (diet.log[today] || []).reduce((s, e) => s + e.kcal, 0);
    const water = diet.water[today] || 0;
    const steps = health.daily[today]?.steps || 0;
    const wk = PD.health.weekSummary();
    const ws = PD.workout.stats();
    const activeMin = Math.round(ws.weekMin + (wk ? wk.time / 60 : 0));
    const pct = (v, m) => Math.min(100, m ? (v / m) * 100 : 0);
    el.innerHTML = `
      <a class="tile violet" href="#diet">
        <span class="tile-label">Calories</span>
        <span class="tile-value"><span data-count="${eaten}">0</span><small> / ${fmt.num(diet.targets.kcal)}</small></span>
        <span class="bar-track"><i style="width:${pct(eaten, diet.targets.kcal)}%"></i></span>
        <span class="muted small">${eaten > diet.targets.kcal ? `${fmt.num(eaten - diet.targets.kcal)} over` : `${fmt.num(diet.targets.kcal - eaten)} left`}</span>
      </a>
      <a class="tile mint" href="#health">
        <span class="tile-label">Steps</span>
        <span class="tile-value">${steps ? `<span data-count="${steps}">0</span>` : '—'}<small> / ${fmt.num(health.stepGoal)}</small></span>
        <span class="bar-track"><i style="width:${pct(steps, health.stepGoal)}%"></i></span>
        <span class="muted small">${steps ? `${Math.round(pct(steps, health.stepGoal))}% of goal` : 'Log or import in Health'}</span>
      </a>
      <a class="tile peach" href="#workout">
        <span class="tile-label">Active this week</span>
        <span class="tile-value"><span data-count="${activeMin}">0</span><small> min</small></span>
        <span class="bar-track"><i style="width:${pct(ws.weekCount, ws.goal)}%"></i></span>
        <span class="muted small">${ws.weekCount}/${ws.goal} workouts${wk ? ` · ${fmt.num(wk.km, 1)} km on Strava` : ''}</span>
      </a>
      <div class="tile sky">
        <span class="tile-label">Water</span>
        <span class="tile-value">${water}<small> / ${diet.targets.water} glasses</small></span>
        <span class="glasses">${Array.from({ length: Math.max(diet.targets.water, water) }, (_, i) => `<i class="${i < water ? 'full' : ''}"></i>`).join('')}</span>
        <span class="tile-actions">
          <button class="btn sm ghost" data-water="-1" aria-label="Remove a glass">−</button>
          <button class="btn sm" data-water="1">+ Glass</button>
        </span>
      </div>`;
    $$('[data-water]', el).forEach((b) => (b.onclick = () => {
      diet.water[today] = Math.max(0, (diet.water[today] || 0) + Number(b.dataset.water));
      store.save('diet'); renderTiles();
      if (Number(b.dataset.water) > 0 && diet.water[today] === diet.targets.water) { PD.fx.confetti({ count: 70, origin: { x: 0.75, y: 0.4 } }); PD.toast('Hydration goal reached 💧'); }
    }));
    PD.fx.countUp(el);
  }

  /* ---------- hero ---------- */
  function greeting(h) {
    if (h < 6) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function renderHero() {
    const el = $('#hero');
    if (!el) return;
    const now = new Date();
    const name = store.get('settings').name;
    const start = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - start) / 864e5) + 1;
    const daysInYear = ((now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0) ? 366 : 365;
    const m = PD.daily.moon(now);
    el.innerHTML = `
      <div class="hero-actions">
        <button class="hero-btn" id="heroSpeak" title="Read my briefing aloud" aria-label="Read my briefing aloud"><svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg></button>
        <button class="hero-btn" id="heroReview" title="Your week in review" aria-label="Your week in review"><svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg></button>
        <button class="hero-btn" id="heroCustomize" title="Customise home" aria-label="Customise home"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg></button>
      </div>
      ${PD.seasons.heroFx()}
      <p class="eyebrow">${esc(greeting(now.getHours()))}${name ? `, ${esc(name)}` : ''} ${PD.seasons.special() ? `${PD.seasons.special().emoji} · ${esc(PD.seasons.special().text)}` : '👋'}</p>
      <h1 class="hero-day">${esc(fmt.weekday(now, 'long'))}</h1>
      <p class="hero-date">${esc(fmt.date(now, { day: 'numeric', month: 'long', year: 'numeric' }))}</p>
      <div class="hero-meta">
        <span class="pill violet">Week ${PD.isoWeek(now)}</span>
        <a class="pill level-pill" href="#workout" title="Your level — see achievements in My workout">⭐ Lv ${PD.game.compute().level}</a>
        <span class="pill mint" id="heroClock">${fmt.time(now)}</span>
        <span class="pill peach" id="heroSun">☀ –</span>
        <span class="pill" title="${esc(m.name)} · ${m.illum}% illuminated">${m.icon} ${esc(m.name)}</span>
      </div>
      <p class="briefing" id="briefing" hidden></p>
      <div class="year-progress" title="Day ${dayOfYear} of ${daysInYear}">
        <span class="muted small">Day ${dayOfYear} of ${daysInYear}</span>
        <span class="bar-track"><i style="width:${(dayOfYear / daysInYear) * 100}%"></i></span>
        <span class="muted small">${Math.round((dayOfYear / daysInYear) * 100)}%</span>
      </div>`;
    $('#heroSpeak').onclick = PD.daily.speakBriefing;
    $('#heroReview').onclick = () => PD.review.open();
    $('#heroCustomize').onclick = customize;
    PD.daily.renderBriefing();
  }

  /* ---------- customisable layout ---------- */
  const CARDS = {
    hero: { label: 'Greeting, date & briefing', col: 'L', fixed: true, html: '<div class="card hero" id="hero"></div>' },
    tiles: { label: 'Snapshot tiles', col: 'L', html: '<div class="tiles" id="tiles"></div>' },
    weather: { label: 'Weather', col: 'R', html: '<div class="card weather" id="weather"><div class="card-head"><h2>Weather</h2></div><div class="skeleton tall"></div></div>' },
    air: { label: 'Air & pollen', col: 'R', html: '<div class="card" id="air"><div class="card-head"><h2>Air &amp; pollen</h2></div><div class="skeleton"></div></div>' },
    agenda: { label: 'Up next', col: 'R', html: '<div class="card" id="agenda"></div>' },
    habits: { label: 'Habits & mood', col: 'L', html: '<div class="card" id="habitsCard"></div>' },
    tasks: { label: "Today's tasks", col: 'R', html: '<div class="card" id="tasks"></div>' },
    focus: { label: 'Focus timer', col: 'R', html: '<div class="card" id="focusCard"></div>' },
    news: { label: 'News', col: 'L', html: `<div class="card news-card" id="newsCard"><div class="card-head"><h2>News</h2>
      <button class="icon-btn sm" id="newsRefresh" title="Refresh" aria-label="Refresh news"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg></button></div>
      <div class="chips" id="newsChips"></div><div id="newsList"></div></div>` },
    spotify: { label: 'Spotify', col: 'R', html: '<div class="card spotify-card" id="spotify"></div>' },
    dose: { label: 'Quote & on this day', col: 'L', html: '<div class="card" id="dose"></div>' },
  };
  const DEFAULT_ORDER = ['hero', 'tiles', 'weather', 'air', 'agenda', 'habits', 'tasks', 'focus', 'spotify', 'news', 'dose'];

  function layout() {
    const h = store.get('settings').home || {};
    const order = [...(h.order || []).filter((id) => CARDS[id]), ...DEFAULT_ORDER.filter((id) => !(h.order || []).includes(id))];
    return order.map((id) => ({ id, ...CARDS[id], col: h.cols?.[id] || CARDS[id].col, hidden: !CARDS[id].fixed && (h.hidden || []).includes(id) }));
  }

  function customize() {
    let rows = layout();
    const draw = (body, close) => {
      body.innerHTML = `
        <p class="muted small">Show, hide and reorder the cards on your home page. On a wide screen, choose the column; on a phone they stack in this order.</p>
        <ol class="items layout-list">${rows.map((r, i) => `
          <li class="item" data-i="${i}">
            <label class="toggle grow"><input type="checkbox" ${r.hidden ? '' : 'checked'} ${r.fixed ? 'disabled' : ''} data-vis> <b>${esc(r.label)}</b></label>
            <span class="segmented sm"><label><input type="radio" name="c${i}" value="L" ${r.col === 'L' ? 'checked' : ''}><span>Left</span></label><label><input type="radio" name="c${i}" value="R" ${r.col === 'R' ? 'checked' : ''}><span>Right</span></label></span>
            <span class="item-move">
              <button type="button" class="icon-btn sm ghost" data-up ${i === 0 ? 'disabled' : ''} aria-label="Move up"><svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg></button>
              <button type="button" class="icon-btn sm ghost" data-down ${i === rows.length - 1 ? 'disabled' : ''} aria-label="Move down"><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
            </span>
          </li>`).join('')}</ol>
        <div class="row gap end"><button type="button" class="btn ghost" id="layReset">Reset</button><span class="spacer"></span><button type="button" class="btn ghost" data-cancel>Cancel</button><button type="button" class="btn" id="laySave">Save</button></div>`;
      const read = () => { $$('.layout-list .item', body).forEach((li) => { const r = rows[+li.dataset.i]; r.hidden = !$('[data-vis]', li).checked; r.col = $('input[type=radio]:checked', li).value; }); };
      const move = (i, d) => { read(); const [x] = rows.splice(i, 1); rows.splice(i + d, 0, x); draw(body, close); };
      $$('.layout-list .item', body).forEach((li) => { const i = +li.dataset.i; $('[data-up]', li).onclick = () => move(i, -1); $('[data-down]', li).onclick = () => move(i, 1); });
      $('[data-cancel]', body).onclick = close;
      $('#layReset', body).onclick = () => { store.get('settings').home = {}; rows = layout(); draw(body, close); };
      $('#laySave', body).onclick = () => {
        read();
        store.get('settings').home = { order: rows.map((r) => r.id), hidden: rows.filter((r) => r.hidden).map((r) => r.id), cols: Object.fromEntries(rows.map((r) => [r.id, r.col])) };
        store.save('settings'); close(); render(); PD.fx.enter($('#page-home'));
      };
    };
    PD.modal('Customise home', '', draw);
  }

  let clockTimer; let renderedDay;
  function startClock() {
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      const c = $('#heroClock');
      if (c) c.textContent = fmt.time(new Date());
      // roll over at midnight
      if (renderedDay !== PD.todayKey() && PD.app.current() === 'home') render();
    }, 15000);
  }

  function render() {
    renderedDay = PD.todayKey();
    const page = $('#page-home');
    const rows = layout().filter((r) => !r.hidden);
    // inline order = phone stacking order (columns use display: contents there)
    const col = (c) => rows.map((r, i) => (r.col === c ? r.html.replace(/^<div /, `<div style="order:${i}" `) : '')).join('');
    page.innerHTML = `<div class="home-grid"><div class="home-col">${col('L')}</div><div class="home-col">${col('R')}</div></div>`;
    renderHero(); renderTiles(); renderTasks(); renderAgenda();
    PD.habits.card($('#habitsCard')); PD.focus.card($('#focusCard'));
    loadWeather(); loadNews(); PD.air.load(); PD.daily.dose(); PD.spotify.card();
    const nr = $('#newsRefresh');
    if (nr) nr.onclick = () => {
      store.get('settings').feeds.forEach((f) => localStorage.removeItem(`pd.cache.news.${f.id}`));
      loadNews();
    };
    startClock();
  }

  /** Pull-to-refresh: reload all live cards. */
  function refresh() {
    Object.keys(localStorage).filter((k) => /^pd\.cache\.(news|wx|air)\./.test(k)).forEach((k) => localStorage.removeItem(k));
    render(); PD.toast('Refreshed');
  }

  PD.home = { render, renderTiles, renderAgenda, refresh, customize, renderTasks, clearNewsCache: () => Object.keys(localStorage).filter((k) => k.startsWith('pd.cache.news.')).forEach((k) => localStorage.removeItem(k)) };
})(window.PD);
