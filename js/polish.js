/* Feel-good details: haptics, swipe between tabs, pull-to-refresh, offline indicator, keyboard shortcuts. */
(function (PD) {
  const { $, $$ } = PD;
  const TABS = ['home', 'health', 'workout', 'calendar', 'diet'];

  PD.haptic = (ms = 12) => { try { if (PD.store.get('settings').haptics !== false) navigator.vibrate?.(ms); } catch { /* ignore */ } };
  const blocking = () => document.querySelector('#modal[open], #player, .story, .cmdk');

  /* ---------- offline indicator ---------- */
  const net = () => { const p = $('#offlinePill'); if (p) p.hidden = navigator.onLine; };
  window.addEventListener('online', () => { net(); PD.toast('Back online'); });
  window.addEventListener('offline', net);
  net();

  /* ---------- swipe between tabs (and months in the calendar) ---------- */
  let sx = 0; let sy = 0; let st = 0; let tracking = false;
  const NO_SWIPE = '.wx-hours, .chips, .table-wrap, .ex-grid.compact, input, textarea, select, .heatmap, .routine-figs, .pollen-days, .segmented, .st-tap, .scan-view';
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || blocking() || e.target.closest(NO_SWIPE)) { tracking = false; return; }
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); tracking = true;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (!tracking) return; tracking = false;
    const dx = e.changedTouches[0].clientX - sx; const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - st > 600) return;
    const cur = PD.app.current();
    if (cur === 'calendar' && e.target.closest('.cal-card')) { $(dx < 0 ? '#calNext' : '#calPrev')?.click(); PD.haptic(8); return; }
    const i = TABS.indexOf(cur); const n = i + (dx < 0 ? 1 : -1);
    if (n >= 0 && n < TABS.length) { PD.haptic(8); location.hash = `#${TABS[n]}`; }
  }, { passive: true });

  /* ---------- pull to refresh (Home) ---------- */
  // the indicator is created on the first pull and is sized/hidden inline, so it can never show up unstyled
  let ptr = null;
  const getPtr = () => {
    if (ptr) return ptr;
    ptr = document.createElement('div'); ptr.className = 'ptr'; ptr.setAttribute('aria-hidden', 'true');
    ptr.style.cssText = 'position:fixed;top:70px;left:50%;width:40px;height:40px;opacity:0;pointer-events:none;z-index:30;transform:translate(-50%,-50px)';
    ptr.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>';
    document.body.appendChild(ptr);
    return ptr;
  };
  let py = null; let pull = 0;
  document.addEventListener('touchstart', (e) => { py = (window.scrollY <= 0 && PD.app.current() === 'home' && !blocking()) ? e.touches[0].clientY : null; pull = 0; }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (py == null) return;
    pull = Math.max(0, Math.min(140, e.touches[0].clientY - py));
    if (pull < 8 && !ptr) return;
    const el = getPtr();
    el.style.transform = `translate(-50%, ${pull * 0.6 - 50}px) rotate(${pull * 3}deg)`;
    el.classList.toggle('ready', pull > 90); el.style.opacity = String(Math.min(pull / 90, 1));
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (py == null) return;
    if (!ptr) { py = null; return; }
    if (pull > 90) { ptr.classList.add('spin'); PD.haptic(15); PD.home.refresh(); setTimeout(() => ptr.classList.remove('spin'), 900); }
    ptr.style.transform = 'translate(-50%, -50px)'; ptr.style.opacity = '0'; ptr.classList.remove('ready'); py = null;
  }, { passive: true });

  /* ---------- keyboard shortcuts ---------- */
  let gPressed = 0;
  const KEYS = { h: 'home', e: 'health', w: 'workout', c: 'calendar', d: 'diet' };
  document.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey || blocking()) return;
    if (e.key === 'g') { gPressed = Date.now(); return; }
    if (Date.now() - gPressed < 1200 && KEYS[e.key]) { location.hash = `#${KEYS[e.key]}`; gPressed = 0; return; }
    if (e.key === '?') shortcuts();
    if (e.key === 'r' && PD.app.current() === 'home') PD.home.refresh();
  });
  function shortcuts() {
    const row = (k, t) => `<li><span>${k}</span><span>${t}</span></li>`;
    PD.modal('Keyboard shortcuts', `<ul class="shortcuts">
      ${row('<kbd>Ctrl</kbd> <kbd>K</kbd> or <kbd>/</kbd>', 'Quick actions &amp; search')}
      ${row('<kbd>g</kbd> then <kbd>h</kbd> <kbd>e</kbd> <kbd>w</kbd> <kbd>c</kbd> <kbd>d</kbd>', 'Home, hEalth, Workout, Calendar, Diet')}
      ${row('<kbd>r</kbd>', 'Refresh the home page')}
      ${row('<kbd>Space</kbd> / <kbd>←</kbd> <kbd>→</kbd>', 'Pause / previous / next in the workout player')}
      ${row('<kbd>?</kbd>', 'This list')}</ul>
      <p class="muted small">On your phone: swipe left/right to switch tabs (or months in the calendar) and pull down on Home to refresh.</p>`);
  }

  // sunset theme: re-evaluate every few minutes
  setInterval(() => { if (PD.store.get('settings').theme === 'sun') PD.settings.applyTheme(); }, 5 * 60e3);

  PD.polish = { shortcuts };
})(window.PD);
