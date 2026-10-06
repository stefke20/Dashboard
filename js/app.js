/* App shell: hash routing between tabs. */
(function (PD) {
  const { $, $$ } = PD;
  const PAGES = { home: PD.home, health: PD.health, workout: PD.workout, calendar: PD.calendar, diet: PD.diet };
  const TITLES = { workout: 'My workout' };
  let current = null;

  function route() {
    const name = (location.hash.slice(1) || 'home').split('?')[0];
    const page = PAGES[name] ? name : 'home';
    current = page;
    $$('.page').forEach((p) => (p.hidden = p.dataset.page !== page));
    $$('.tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === page));
    document.title = page === 'home' ? 'Daily Dashboard' : `${TITLES[page] || page[0].toUpperCase() + page.slice(1)} · Daily Dashboard`;
    PD.charts.tip.hide();
    const el = $(`#page-${page}`);
    PAGES[page].render();
    PD.fx.enter(el); PD.fx.countUp(el);
    moveIndicator();
    window.scrollTo({ top: 0 });
  }

  function moveIndicator() {
    const a = $('.tabs a.active'); const ind = $('.tab-ind');
    if (!a || !ind) return;
    ind.style.width = `${a.offsetWidth}px`; ind.style.transform = `translateX(${a.offsetLeft}px)`;
    ind.dataset.tab = a.dataset.tab;
  }
  window.addEventListener('resize', PD.debounce(moveIndicator, 100));
  document.fonts?.ready.then(moveIndicator);

  PD.app = {
    current: () => current,
    renderCurrent: () => { const el = $(`#page-${current}`); PAGES[current].render(); PD.fx.countUp(el); },
  };

  PD.store.migrate();
  PD.settings.applyTheme();
  $('#openSettings').onclick = () => PD.settings.open();
  // live Google Calendar results arrive asynchronously: refresh what shows them
  PD.gcal.onUpdate = () => {
    if (current === 'calendar' && !$('#modal').open) PD.calendar.render();
    if (current === 'home') PD.home.renderAgenda();
  };
  $('#modal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === e.currentTarget) e.currentTarget.close();
  });
  // animated page transitions where supported
  window.addEventListener('hashchange', () => {
    if (document.startViewTransition && !PD.fx.reduce()) document.startViewTransition(route); else route();
  });
  // Refresh the home page when coming back to the tab after a while (e.g. next morning)
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (current === 'home' && Date.now() - hiddenAt > 30 * 60e3) route();
  });

  // Finishes a Strava or Google login redirect if there is one (each rewrites the URL synchronously first).
  const redirects = [PD.health.handleRedirect(), PD.google.handleRedirect()];
  route();
  Promise.all(redirects).then((handled) => { if (handled.some(Boolean)) route(); });
  PD.sync.init();
})(window.PD);

/* Installable app (PWA): service worker + install prompt. */
(function (PD) {
  let deferred = null;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ }));
    // when an update takes over, reload once so all files come from the same version
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded || document.querySelector('#player, .story, #modal[open]')) return;
      reloaded = true; location.reload();
    });
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; PD.toast('Installed — find Daily on your home screen 🎉'); });
  if (standalone()) document.documentElement.classList.add('standalone');

  PD.pwa = {
    standalone,
    status() {
      if (standalone()) return 'installed';
      if (deferred) return 'prompt';
      return ios() ? 'ios' : 'manual';
    },
    async install() {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      return outcome === 'accepted';
    },
  };
})(window.PD);
