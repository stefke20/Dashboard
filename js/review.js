/* "Your week": a story-style weekly review across every tab, with sharing. */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey } = PD;
  const DUR = 6500;

  function data() {
    const days = PD.lastNDays(7); const from = days[0]; const to = days[6];
    const inWeek = (k) => k >= from && k <= to;
    const d = {};
    // workouts + strava
    const logs = store.get('workouts').log.filter((l) => inWeek(l.date));
    const acts = (store.get('strava').activities || []).filter((a) => inWeek(a.start?.slice(0, 10) || ''));
    d.move = {
      workouts: logs.length, min: Math.round(logs.reduce((s, l) => s + l.duration, 0) / 60 + acts.reduce((s, a) => s + a.moving_time, 0) / 60),
      kcal: logs.reduce((s, l) => s + l.kcal, 0), km: acts.reduce((s, a) => s + a.distance / 1000, 0), acts: acts.length,
      top: Object.entries(logs.reduce((m, l) => ({ ...m, [l.name]: (m[l.name] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0]?.[0],
    };
    // food
    const diet = store.get('diet');
    const logged = days.filter((k) => (diet.log[k] || []).length);
    const kcal = (k) => (diet.log[k] || []).reduce((s, e) => s + e.kcal, 0);
    d.food = {
      days: logged.length, avg: logged.length ? Math.round(logged.reduce((s, k) => s + kcal(k), 0) / logged.length) : 0,
      onTarget: logged.filter((k) => kcal(k) <= diet.targets.kcal).length, target: diet.targets.kcal,
      protein: logged.length ? Math.round(logged.reduce((s, k) => s + (diet.log[k] || []).reduce((a, e) => a + (e.p || 0), 0), 0) / logged.length) : 0,
      water: Math.round(days.reduce((s, k) => s + (diet.water[k] || 0), 0) / 7 * 10) / 10,
    };
    // body
    const h = store.get('health');
    const steps = days.map((k) => h.daily[k]?.steps).filter(Boolean);
    const sleep = days.map((k) => h.daily[k]?.sleep).filter(Boolean);
    const wk = Object.keys(h.weight).filter(inWeek).sort();
    d.body = {
      steps: steps.length ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : 0,
      sleep: sleep.length ? Math.round(sleep.reduce((a, b) => a + b, 0) / sleep.length * 10) / 10 : 0,
      weight: wk.length >= 2 ? Math.round((h.weight[wk[wk.length - 1]] - h.weight[wk[0]]) * 10) / 10 : null,
    };
    // habits
    const list = store.get('habits').list;
    const grid = list.map((x) => ({ ...x, days: days.map((k) => PD.habits.isDone(x, k)) }));
    const total = grid.reduce((s, x) => s + x.days.filter(Boolean).length, 0);
    d.habits = { grid, pct: list.length ? Math.round(total / (list.length * 7) * 100) : 0, best: [...grid].sort((a, b) => PD.habits.streak(b) - PD.habits.streak(a))[0] };
    // mind
    const j = store.get('journal');
    const moods = days.map((k) => j[k]?.mood || 0);
    const focus = store.get('focus').sessions.filter((s) => inWeek(s.date));
    const fasts = (store.get('fasting').history || []).filter((x) => inWeek(x.end.slice(0, 10)));
    d.mind = {
      moods, avg: moods.filter(Boolean).length ? moods.filter(Boolean).reduce((a, b) => a + b, 0) / moods.filter(Boolean).length : 0,
      focusMin: focus.reduce((s, x) => s + x.minutes, 0), focusN: focus.length,
      fastH: Math.round(fasts.reduce((s, x) => s + (new Date(x.end) - new Date(x.start)) / 3600e3, 0)), fastN: fasts.length,
    };
    // next week
    const next = PD.calendar.between(PD.shiftKey(todayKey(), 1), PD.shiftKey(todayKey(), 7));
    d.next = { events: next.filter((e) => ['event', 'google', 'task'].includes(e.type)).length, workouts: next.filter((e) => e.type === 'workout').length, bdays: next.filter((e) => e.type === 'birthday') };
    d.range = `${fmt.dayMonth(PD.parseKey(from))} – ${fmt.dayMonth(PD.parseKey(to))}`;
    return d;
  }

  const big = (v, unit = '', digits = 0) => `<b class="st-big"><span data-count="${v}" data-digits="${digits}">0</span>${unit ? `<small>${unit}</small>` : ''}</b>`;

  function slides(d) {
    const S = [];
    S.push({ cls: 's-intro', html: `<div class="st-emoji">✨</div><h2>Your week</h2><p>${esc(d.range)}</p><p class="st-sub">Tap to continue</p>` });
    if (d.move.workouts || d.move.acts) {
      S.push({ cls: 's-move', html: `<div class="st-emoji">💪</div><p>You were active for</p>${big(d.move.min, 'min')}
        <div class="st-row"><div>${big(d.move.workouts)}<span>home workouts</span></div>${d.move.acts ? `<div>${big(d.move.km, 'km', 1)}<span>on Strava</span></div>` : ''}<div>${big(d.move.kcal)}<span>kcal burned</span></div></div>
        ${d.move.top ? `<p class="st-sub">Favourite: ${esc(d.move.top)}</p>` : ''}` });
    } else S.push({ cls: 's-move', html: '<div class="st-emoji">🛋️</div><h2>A quiet week</h2><p>No workouts logged. A 7-minute workout is a great restart!</p>' });
    if (d.food.days) {
      S.push({ cls: 's-food', html: `<div class="st-emoji">🥗</div><p>On average you ate</p>${big(d.food.avg, 'kcal')}
        <div class="st-row"><div>${big(d.food.onTarget)}<span>of ${d.food.days} days on target</span></div><div>${big(d.food.protein, 'g')}<span>protein / day</span></div><div>${big(d.food.water, '', 1)}<span>glasses of water / day</span></div></div>` });
    }
    if (d.body.steps || d.body.sleep || d.body.weight != null) {
      S.push({ cls: 's-body', html: `<div class="st-emoji">❤️</div><p>Your body this week</p>
        <div class="st-row">${d.body.steps ? `<div>${big(d.body.steps)}<span>steps / day</span></div>` : ''}${d.body.sleep ? `<div>${big(d.body.sleep, 'h', 1)}<span>sleep / night</span></div>` : ''}
        ${d.body.weight != null ? `<div><b class="st-big">${d.body.weight > 0 ? '+' : ''}${fmt.num(d.body.weight, 1)}<small>kg</small></b><span>weight change</span></div>` : ''}</div>` });
    }
    if (d.habits.grid.length) {
      S.push({ cls: 's-habits', html: `<div class="st-emoji">✅</div><p>You completed</p>${big(d.habits.pct, '%')}<p>of your habits</p>
        <div class="st-habits">${d.habits.grid.map((x) => `<div><span>${esc(x.emoji)}</span>${x.days.map((v, i) => `<i class="${v ? 'on' : ''}" style="--i:${i}"></i>`).join('')}</div>`).join('')}</div>
        ${d.habits.best && PD.habits.streak(d.habits.best) ? `<p class="st-sub">Longest streak: ${esc(d.habits.best.emoji)} ${esc(d.habits.best.name)} — ${PD.habits.streak(d.habits.best)} days 🔥</p>` : ''}` });
    }
    if (d.mind.avg || d.mind.focusN || d.mind.fastN) {
      S.push({ cls: 's-mind', html: `<div class="st-emoji">🧠</div><p>Mind &amp; focus</p>
        ${d.mind.avg ? `<div class="st-moods">${d.mind.moods.map((m, i) => `<span style="--i:${i}">${m ? PD.habits.MOODS[m - 1][0] : '·'}</span>`).join('')}</div>` : ''}
        <div class="st-row">${d.mind.focusN ? `<div>${big(d.mind.focusMin, 'min')}<span>focused (${d.mind.focusN} 🍅)</span></div>` : ''}${d.mind.fastN ? `<div>${big(d.mind.fastH, 'h')}<span>fasted (${d.mind.fastN}×)</span></div>` : ''}</div>` });
    }
    S.push({ cls: 's-next', html: `<div class="st-emoji">🚀</div><h2>Next 7 days</h2>
      <div class="st-row"><div>${big(d.next.events)}<span>events &amp; tasks</span></div><div>${big(d.next.workouts)}<span>planned workouts</span></div></div>
      ${d.next.bdays.length ? `<p>🎂 ${d.next.bdays.map((b) => esc(b.displayTitle)).join(', ')}</p>` : ''}
      <button class="btn light" data-share>Share my week</button>` });
    return S;
  }

  function shareText(d) {
    return [`My week (${d.range}) 📊`,
      `💪 ${d.move.min} active minutes · ${d.move.workouts} workouts${d.move.km ? ` · ${d.move.km.toFixed(1)} km` : ''}`,
      d.food.days ? `🥗 ${d.food.avg} kcal/day avg · ${d.food.onTarget}/${d.food.days} days on target` : '',
      d.body.steps ? `👟 ${d.body.steps} steps/day` : '',
      d.habits.grid.length ? `✅ ${d.habits.pct}% of habits done` : '',
      d.mind.focusN ? `🍅 ${d.mind.focusMin} min focused` : ''].filter(Boolean).join('\n');
  }

  function open() {
    const d = data(); const list = slides(d);
    let i = 0; let timer = null; let t0 = 0; let paused = 0; let pausedAt = 0;
    const el = document.createElement('div');
    el.className = 'story'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Your week in review');
    el.innerHTML = `<div class="st-bars">${list.map(() => '<i><b></b></i>').join('')}</div>
      <button class="pl-icon st-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <div class="st-slide"></div><div class="st-tap st-prev"></div><div class="st-tap st-next"></div>`;
    document.body.appendChild(el); document.body.classList.add('no-scroll');
    const bars = $$('.st-bars b', el);
    const show = () => {
      const s = list[i];
      el.dataset.slide = s.cls;
      const box = $('.st-slide', el); box.innerHTML = `<div class="st-inner ${s.cls}">${s.html}</div>`;
      PD.fx.countUp(box);
      bars.forEach((b, k) => { b.style.transition = 'none'; b.style.width = k < i ? '100%' : '0%'; });
      t0 = performance.now(); paused = 0;
      const sh = $('[data-share]', box);
      if (sh) sh.onclick = async (e) => {
        e.stopPropagation();
        const text = shareText(d);
        try { if (navigator.share) await navigator.share({ title: 'My week', text }); else { await navigator.clipboard.writeText(text); PD.toast('Copied to clipboard'); } } catch { /* cancelled */ }
      };
      if (i === list.length - 1) PD.fx.confetti({ count: 90 });
    };
    const loop = (now) => {
      if (!el.isConnected) return;
      if (!pausedAt) {
        const p = Math.min((now - t0 - paused) / DUR, 1);
        bars[i].style.width = `${p * 100}%`;
        if (p >= 1) { if (i < list.length - 1) { i++; show(); } }
      }
      timer = requestAnimationFrame(loop);
    };
    const go = (dir) => { const n = i + dir; if (n < 0) return; if (n >= list.length) { close(); return; } i = n; show(); };
    const close = () => { cancelAnimationFrame(timer); el.remove(); document.body.classList.remove('no-scroll'); document.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight' || e.key === ' ') go(1); if (e.key === 'ArrowLeft') go(-1); };
    $('.st-close', el).onclick = close;
    $('.st-next', el).onclick = () => go(1);
    $('.st-prev', el).onclick = () => go(-1);
    // hold to pause
    el.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) pausedAt = performance.now(); });
    el.addEventListener('pointerup', () => { if (pausedAt) { paused += performance.now() - pausedAt; pausedAt = 0; } });
    document.addEventListener('keydown', key);
    show(); timer = requestAnimationFrame(loop);
  }

  PD.review = { open, data };
})(window.PD);
