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

  PD.settings.applyTheme();
  $('#openSettings').onclick = PD.settings.open;
  $('#modal').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]') || e.target === e.currentTarget) e.currentTarget.close();
  });
  window.addEventListener('hashchange', route);
  // Refresh the home page when coming back to the tab after a while (e.g. next morning)
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (current === 'home' && Date.now() - hiddenAt > 30 * 60e3) route();
  });

  // Finishes a Strava login redirect if there is one (synchronously rewrites the URL to #health first).
  const redirect = PD.health.handleRedirect();
  route();
  redirect.then((handled) => { if (handled) route(); });
})(window.PD);
