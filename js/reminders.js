/* Reminders via system notifications (while the app is open or running in the background):
   water, planned workouts, upcoming events, fasting goal. Focus/break ends always notify when allowed. */
(function (PD) {
  const { store, todayKey } = PD;
  const FIRED = 'pd.reminders.fired';
  const cfg = () => ({ water: false, waterEvery: 2, workouts: true, events: true, fasting: true, ...(store.get('settings').reminders || {}) });

  const allowed = () => 'Notification' in window && Notification.permission === 'granted';
  async function ask() {
    if (!('Notification' in window) || Notification.permission !== 'default') return allowed();
    try { return (await Notification.requestPermission()) === 'granted'; } catch { return false; }
  }

  async function notify(title, body, tag) {
    PD.toast(`${title}${body ? ` — ${body}` : ''}`);
    if (!allowed() || (!document.hidden && document.hasFocus())) return; // the toast is enough when you're looking
    const opts = { body, tag: tag || title, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', vibrate: [80, 40, 80] };
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) { await reg.showNotification(title, opts); return; }
    } catch { /* fall back */ }
    try { new Notification(title, opts); } catch { /* ignore */ }
  }

  function once(key) {
    let f = {};
    try { f = JSON.parse(localStorage.getItem(FIRED)) || {}; } catch { f = {}; }
    const t = todayKey();
    Object.keys(f).forEach((k) => { if (f[k] !== t) delete f[k]; });
    if (f[key]) return false;
    f[key] = t; localStorage.setItem(FIRED, JSON.stringify(f));
    return true;
  }

  function check() {
    const c = cfg(); const now = new Date(); const t = todayKey(); const hm = now.getHours() * 60 + now.getMinutes();
    // events starting in the next 15 minutes
    if (c.events) {
      PD.calendar.between(t, t).filter((e) => e.time && ['event', 'google', 'task'].includes(e.type)).forEach((e) => {
        const [h, m] = e.time.split(':').map(Number); const diff = h * 60 + m - hm;
        if (diff > 0 && diff <= 15 && once(`ev:${e.id}`)) notify(`📅 ${e.displayTitle}`, `Starts at ${e.time} (in ${diff} min)`, e.id);
      });
    }
    // planned workout today (at its time, or 18:00) if nothing logged yet
    if (c.workouts && !store.get('workouts').log.some((l) => l.date === t)) {
      const w = PD.calendar.between(t, t).find((e) => e.type === 'workout' && (e.startable || (e.routineId && !e.readonly)));
      if (w) {
        const [h, m] = (w.time || '18:00').split(':').map(Number);
        if (hm >= h * 60 + m && once(`wo:${w.id}`)) notify('🏋️ Time to train', w.displayTitle, 'workout');
      }
    }
    // water: between 9:00 and 21:00, every N hours, when behind schedule
    if (c.water && now.getHours() >= 9 && now.getHours() < 21) {
      const d = store.get('diet'); const had = d.water[t] || 0; const goal = d.targets.water || 8;
      const expected = Math.floor(goal * ((hm - 540) / 720));
      const slot = Math.floor((now.getHours() - 9) / (c.waterEvery || 2));
      if (had < expected && once(`water:${slot}`)) notify('💧 Drink some water', `${had}/${goal} glasses so far today`, 'water');
    }
    // fasting goal reached
    const f = store.get('fasting').active;
    if (c.fasting && f && Date.now() - new Date(f.start) >= f.goal * 3600e3 && once(`fast:${f.start}`)) notify('✅ Fasting goal reached', `${f.goal} hours done — nice work!`, 'fast');
  }

  setInterval(check, 60e3);
  setTimeout(check, 5000);

  PD.reminders = { ask, notify, check, cfg, allowed };
})(window.PD);
