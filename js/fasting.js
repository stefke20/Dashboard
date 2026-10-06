/* Intermittent fasting timer (Diet tab). Synced, so a fast started on your phone shows on your laptop. */
(function (PD) {
  const { esc, $, $$, fmt, store } = PD;
  const F = () => store.get('fasting');
  const GOALS = [12, 14, 16, 18, 20, 24];
  const STAGES = [[0, 'Digesting', '🍽️'], [4, 'Settling', '🌗'], [12, 'Fasting', '🔥'], [16, 'Deep fast', '⚡'], [24, 'Extended', '🏔️']];
  const R = 70; const C = 2 * Math.PI * R;
  const hm = (ms) => { const m = Math.floor(ms / 60e3); return `${Math.floor(m / 60)}:${PD.pad(m % 60)}`; };

  function start(atIso) {
    const f = F();
    f.active = { start: atIso || new Date().toISOString(), goal: f.goal };
    store.save('fasting'); PD.haptic?.(20); PD.reminders?.ask?.();
  }
  function end(quiet) {
    const f = F(); const a = f.active;
    if (!a) return;
    const hours = (Date.now() - new Date(a.start)) / 3600e3;
    f.history = [...(f.history || []), { id: PD.uid(), start: a.start, end: new Date().toISOString(), goal: a.goal }].slice(-120);
    f.active = null; store.save('fasting');
    if (hours >= a.goal) PD.fx.confetti();
    if (!quiet) PD.toast(hours >= a.goal ? `Fast complete: ${hours.toFixed(1)} h 🎉` : `Fast ended after ${hours.toFixed(1)} h`);
    return hours;
  }

  function card(el) {
    if (!el) return;
    const f = F(); const a = f.active;
    const hist = (f.history || []).slice(-7);
    if (a) {
      const ms = Date.now() - new Date(a.start); const h = ms / 3600e3;
      const stage = [...STAGES].reverse().find(([t]) => h >= t);
      const goalAt = new Date(new Date(a.start).getTime() + a.goal * 3600e3);
      el.innerHTML = `
        <div class="card-head"><h2>Fasting</h2><span class="pill small peach">${a.goal}:${24 - Math.min(a.goal, 24)} plan</span></div>
        <div class="fast">
          <div class="fast-ring">
            <svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="${R}" class="track"/><circle cx="85" cy="85" r="${R}" class="prog" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.min(h / a.goal, 1))}"/></svg>
            <div class="fast-time"><b>${hm(ms)}</b><span>of ${a.goal} h</span></div>
          </div>
          <div class="fast-side">
            <span class="fast-stage">${stage[2]} ${esc(stage[1])}</span>
            <span class="muted small">Started ${esc(PD.relDay(PD.keyOf(new Date(a.start))).toLowerCase())} at ${fmt.time(new Date(a.start))}</span>
            <span class="small">${h >= a.goal ? '✅ Goal reached — end whenever you like.' : `Goal at <b>${fmt.time(goalAt)}</b>${PD.keyOf(goalAt) !== PD.todayKey() ? ` ${esc(PD.relDay(PD.keyOf(goalAt)).toLowerCase())}` : ''} · ${hm(goalAt - Date.now())} to go`}</span>
            <div class="fast-stages">${STAGES.slice(0, 4).map(([t, n]) => `<i class="${h >= t ? 'on' : ''}" title="${t} h+: ${n}"></i>`).join('')}</div>
            <div class="row gap"><button class="btn" id="fastEnd">End fast</button><button class="btn ghost" id="fastCancel" title="Started by mistake? Remove it without saving">Cancel</button></div>
          </div>
        </div>`;
      $('#fastEnd', el).onclick = () => {
        const h = (Date.now() - new Date(a.start)) / 3600e3;
        PD.undoable(['fasting'], h >= a.goal ? `Fast complete: ${h.toFixed(1)} h 🎉` : `Fast ended after ${h.toFixed(1)} h`, () => end(true)); card(el);
      };
      $('#fastCancel', el).onclick = () => { PD.undoable(['fasting'], 'Fast cancelled — not saved', () => { F().active = null; store.save('fasting'); }); card(el); };
    } else {
      el.innerHTML = `
        <div class="card-head"><h2>Fasting</h2><span class="muted small">intermittent fasting timer</span></div>
        <div class="chips wrap">${GOALS.map((g) => `<button class="chip${f.goal === g ? ' active' : ''}" data-goal="${g}">${g}:${24 - Math.min(g, 24)}${g === 16 ? ' ⭐' : ''}</button>`).join('')}</div>
        <div class="row gap wrap">
          <button class="btn" id="fastStart">▶ Start ${f.goal}-hour fast</button>
          <label class="small muted row gap">or started at <input type="time" id="fastAt" style="width:auto"></label>
        </div>
        ${hist.length ? `<h3 class="sub row gap">Recent fasts <span class="spacer"></span><button class="link small" id="fastHist">history &amp; delete ›</button></h3><div class="fast-hist">${hist.map((x) => {
          const hrs = (new Date(x.end) - new Date(x.start)) / 3600e3;
          return `<div title="${esc(fmt.short(new Date(x.start)))}: ${hrs.toFixed(1)} h (goal ${x.goal} h)"><i style="height:${Math.min(hrs / 24, 1) * 100}%" class="${hrs >= x.goal ? 'ok' : ''}"></i><span>${esc(fmt.weekday(new Date(x.end)).slice(0, 2))}</span></div>`;
        }).join('')}</div>` : '<p class="muted small">Popular: 16:8 — fast 16 hours (e.g. 20:00 → 12:00), eat within 8.</p>'}`;
      $$('[data-goal]', el).forEach((b) => (b.onclick = () => { f.goal = +b.dataset.goal; store.save('fasting'); card(el); }));
      const hb = $('#fastHist', el); if (hb) hb.onclick = () => history(el);
      $('#fastStart', el).onclick = () => {
        const t = $('#fastAt', el).value;
        let at;
        if (t) { const d = new Date(); const [hh, mm] = t.split(':').map(Number); d.setHours(hh, mm, 0, 0); if (d > new Date()) d.setDate(d.getDate() - 1); at = d.toISOString(); }
        start(at); card(el);
      };
    }
  }

  /** All fasts, newest first, each removable (with Undo). */
  function history(cardEl) {
    const draw = (body) => {
      const list = (F().history || []).slice().reverse();
      body.innerHTML = list.length ? `<ul class="sessions">${list.map((x) => {
        const hrs = (new Date(x.end) - new Date(x.start)) / 3600e3;
        return `<li><span class="act-icon" aria-hidden="true">${hrs >= x.goal ? '✅' : '⏳'}</span>
          <span class="act-main"><b>${hrs.toFixed(1)} h</b><span class="muted small">${esc(fmt.short(new Date(x.start)))} ${fmt.time(new Date(x.start))} → ${esc(fmt.short(new Date(x.end)))} ${fmt.time(new Date(x.end))} · goal ${x.goal} h</span></span>
          <button class="icon-btn sm ghost" data-del="${esc(x.id)}" aria-label="Delete fast"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`;
      }).join('')}</ul>` : '<p class="empty">No fasts yet.</p>';
      $$('[data-del]', body).forEach((b) => (b.onclick = () => {
        PD.undoable(['fasting'], 'Fast deleted', () => { const f = F(); f.history = f.history.filter((x) => x.id !== b.dataset.del); store.save('fasting'); });
        draw(body); if (cardEl) card(cardEl);
      }));
    };
    PD.modal('⏳ Fasting history', '', draw);
  }

  setInterval(() => { const el = $('#fastCard'); if (el && F().active && !document.hidden) card(el); }, 30e3);

  PD.fasting = { card, start, end, history };
})(window.PD);
