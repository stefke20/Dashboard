/* Daily extras: morning briefing (read aloud), moon phase, quote of the day, "On this day" (Wikipedia). */
(function (PD) {
  const { esc, $, store, todayKey, fmt } = PD;

  /* ---------- moon ---------- */
  const MOON = [['🌑', 'New moon'], ['🌒', 'Waxing crescent'], ['🌓', 'First quarter'], ['🌔', 'Waxing gibbous'], ['🌕', 'Full moon'], ['🌖', 'Waning gibbous'], ['🌗', 'Last quarter'], ['🌘', 'Waning crescent']];
  function moon(date = new Date()) {
    const days = (date - Date.UTC(2000, 0, 6, 18, 14)) / 864e5;
    const age = ((days % 29.530588853) + 29.530588853) % 29.530588853;
    const [icon, name] = MOON[Math.round((age / 29.530588853) * 8) % 8];
    return { icon, name, age: Math.round(age), illum: Math.round((1 - Math.cos((age / 29.530588853) * 2 * Math.PI)) / 2 * 100) };
  }

  /* ---------- briefing ---------- */
  const cache = (k) => { try { return JSON.parse(localStorage.getItem(`pd.cache.${k}`))?.v || null; } catch { return null; } };
  const WX_TEXT = { 0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'cloudy', 45: 'foggy', 48: 'foggy', 51: 'drizzly', 53: 'drizzly', 55: 'drizzly', 61: 'light rain', 63: 'rainy', 65: 'heavy rain', 71: 'light snow', 73: 'snowy', 75: 'heavy snow', 80: 'showery', 81: 'showery', 82: 'stormy showers', 95: 'thundery', 96: 'thundery', 99: 'thundery' };

  function briefing() {
    const parts = [];
    const t = todayKey();
    const loc = store.get('settings').location;
    const wx = cache(`wx.${loc.lat},${loc.lon}`);
    if (wx?.current) {
      const hi = Math.round(wx.daily.temperature_2m_max[0]); const lo = Math.round(wx.daily.temperature_2m_min[0]);
      const rain = wx.daily.precipitation_probability_max?.[0] ?? 0;
      parts.push(`It's ${Math.round(wx.current.temperature_2m)}° and ${WX_TEXT[wx.current.weather_code] || 'changeable'} in ${loc.name.split(',')[0]}, ${lo}° to ${hi}° today${rain >= 50 ? ` with a ${rain}% chance of rain — take an umbrella` : ''}.`);
    }
    const items = PD.calendar.between(t, t);
    const hol = items.find((e) => e.type === 'holiday');
    if (hol) parts.push(`It's ${hol.title}.`);
    items.filter((e) => e.type === 'birthday').forEach((b) => parts.push(`🎂 ${b.displayTitle.includes('turns') ? b.displayTitle : `It's ${b.displayTitle}'s birthday`} today.`));
    const timed = items.filter((e) => ['event', 'google'].includes(e.type));
    if (timed.length) {
      const first = timed.find((e) => e.time) || timed[0];
      parts.push(`You have ${timed.length} event${timed.length === 1 ? '' : 's'} today${first ? `, starting with ${first.displayTitle}${first.time ? ` at ${first.time}` : ''}` : ''}.`);
    }
    const workout = items.find((e) => e.type === 'workout' && (e.startable || (e.routineId && !e.readonly)));
    if (workout) parts.push(`Workout planned: ${workout.displayTitle.replace(/^\S+\s/, '')}.`);
    const air = cache(`air.${loc.lat},${loc.lon}`);
    const mine = store.get('settings').allergies || [];
    if (air?.current && mine.length) {
      const high = PD.air.POLLEN.filter((p) => mine.includes(p.id) && (air.current[p.key] || 0) >= p.th[1]);
      if (high.length) parts.push(`${high.map((p) => p.name).join(' and ')} pollen is up — mind your allergies.`);
    }
    const tasks = store.get('tasks').filter((x) => !x.done).length;
    if (tasks) parts.push(`${tasks} task${tasks === 1 ? '' : 's'} on your list.`);
    const habits = store.get('habits').list;
    const left = habits.filter((h) => !PD.habits.isDone(h, t)).length;
    if (habits.length && left && new Date().getHours() >= 17) parts.push(`${left} habit${left === 1 ? '' : 's'} still to tick off.`);
    const f = store.get('fasting').active;
    if (f) parts.push(`You've been fasting for ${Math.floor((Date.now() - new Date(f.start)) / 3600e3)} hours.`);
    return parts;
  }

  function renderBriefing() {
    const el = $('#briefing');
    if (!el) return;
    const parts = briefing();
    el.innerHTML = parts.length ? `<span>${esc(parts.slice(0, 4).join(' '))}</span>` : '';
    el.hidden = !parts.length;
  }
  const speakBriefing = () => {
    const name = store.get('settings').name;
    const h = new Date().getHours();
    const hi = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    PD.fx.speak(`${hi}${name ? ` ${name}` : ''}. It's ${fmt.date(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}. ${briefing().join(' ')}`.replace(/🎂\s?/g, ''));
  };

  /* ---------- quote + on this day ---------- */
  const QUOTES = [
    ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant'],
    ['The best time to plant a tree was 20 years ago. The second best time is now.', 'Chinese proverb'],
    ['Take care of your body. It’s the only place you have to live.', 'Jim Rohn'],
    ['The journey of a thousand miles begins with one step.', 'Lao Tzu'],
    ['You do not rise to the level of your goals. You fall to the level of your systems.', 'James Clear'],
    ['Every action you take is a vote for the type of person you wish to become.', 'James Clear'],
    ['Motivation is what gets you started. Habit is what keeps you going.', 'Jim Ryun'],
    ['Act as if what you do makes a difference. It does.', 'William James'],
    ['Do what you can, with what you have, where you are.', 'Theodore Roosevelt'],
    ['Energy and persistence conquer all things.', 'Benjamin Franklin'],
    ['Well done is better than well said.', 'Benjamin Franklin'],
    ['Fall seven times, stand up eight.', 'Japanese proverb'],
    ['A year from now you may wish you had started today.', 'Karen Lamb'],
    ['Small daily improvements over time lead to stunning results.', 'Robin Sharma'],
    ['What you do today can improve all your tomorrows.', 'Ralph Marston'],
    ['You miss 100% of the shots you don’t take.', 'Wayne Gretzky'],
    ['Strength does not come from physical capacity. It comes from an indomitable will.', 'Mahatma Gandhi'],
    ['Happiness is not something ready made. It comes from your own actions.', 'Dalai Lama'],
    ['The only way to do great work is to love what you do.', 'Steve Jobs'],
    ['Oefening baart kunst. — Practice makes perfect.', 'Dutch proverb'],
    ['Na regen komt zonneschijn. — After rain comes sunshine.', 'Dutch proverb'],
    ['Wie niet waagt, die niet wint. — Nothing ventured, nothing gained.', 'Dutch proverb'],
    ['Langzaam aan, dan breekt het lijntje niet. — Slow and steady keeps the line from breaking.', 'Dutch proverb'],
    ['Beter laat dan nooit. — Better late than never.', 'Dutch proverb'],
    ['It always seems impossible until it’s done.', 'Nelson Mandela (attributed)'],
    ['Whether you think you can, or you think you can’t — you’re right.', 'Henry Ford (attributed)'],
    ['Rest when you’re weary. Refresh and renew yourself, then get back to work.', 'Ralph Marston'],
    ['Your future is created by what you do today, not tomorrow.', 'Robert Kiyosaki'],
  ];
  const dayIndex = () => Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);

  let otdItems = []; let otdIdx = 0;
  async function dose() {
    const el = $('#dose');
    if (!el) return;
    const [q, a] = QUOTES[dayIndex() % QUOTES.length];
    el.innerHTML = `
      <div class="card-head"><h2>Daily dose</h2></div>
      <blockquote class="quote"><p>“${esc(q)}”</p><cite>— ${esc(a)}</cite></blockquote>
      <div id="otd" class="otd"><div class="skeleton"></div></div>`;
    const now = new Date(); const ck = `otd.${now.getMonth() + 1}-${now.getDate()}`;
    otdItems = cache(ck);
    if (!otdItems) {
      try {
        const j = await PD.fetchJSON(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${PD.pad(now.getMonth() + 1)}/${PD.pad(now.getDate())}`);
        otdItems = (j.selected || []).slice(0, 12).map((x) => ({ year: x.year, text: x.text, img: x.pages?.[0]?.thumbnail?.source || '', url: x.pages?.[0]?.content_urls?.desktop?.page || '' }));
        try { localStorage.setItem(`pd.cache.${ck}`, JSON.stringify({ t: Date.now(), v: otdItems })); } catch { /* ignore */ }
      } catch { otdItems = []; }
    }
    otdIdx = dayIndex() % Math.max(otdItems.length, 1);
    renderOtd();
  }
  function renderOtd() {
    const el = $('#otd');
    if (!el) return;
    if (!otdItems.length) { el.innerHTML = '<p class="muted small">“On this day” needs an internet connection.</p>'; return; }
    const x = otdItems[otdIdx % otdItems.length];
    el.innerHTML = `
      <div class="otd-head"><span class="pill violet small">On this day · ${esc(x.year)}</span><button class="link small" id="otdNext">Another →</button></div>
      <a class="otd-item swap-in" href="${esc(x.url)}" target="_blank" rel="noopener">
        ${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
        <span>${esc(x.text)}</span></a>`;
    $('#otdNext').onclick = () => { otdIdx++; renderOtd(); };
  }

  PD.daily = { moon, briefing, renderBriefing, speakBriefing, dose };
})(window.PD);
