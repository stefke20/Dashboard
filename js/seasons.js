/* Seasonal themes: autumn / winter / spring / summer palettes (or automatic by date),
   falling leaves / snow / petals / sparkles in the header, and little touches on special days. */
(function (PD) {
  const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
  const FX = { autumn: ['🍂', '🍁', '🍂', '🍃'], winter: ['❄', '❅', '❆', '❄'], spring: ['🌸', '🌼', '🌸', '🍃'], summer: ['✦', '✧', '✦', '☀'] };

  /** Meteorological seasons: Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov autumn. */
  const current = (d = new Date()) => SEASONS[Math.floor(((d.getMonth() + 1) % 12) / 3)];
  const resolve = (palette) => (palette === 'season' ? current() : palette || 'aurora');
  const isSeasonal = (palette) => palette === 'season' || SEASONS.includes(palette);

  function special(d = new Date()) {
    const md = `${PD.pad(d.getMonth() + 1)}-${PD.pad(d.getDate())}`;
    const bday = PD.store.get('settings').birthday;
    if (bday && bday.slice(5) === md) return { emoji: '🎂', text: 'Happy birthday!', fx: ['🎉', '🎈', '🎂', '✨'], burst: true };
    if (md === '12-31' || md === '01-01') return { emoji: '🎆', text: md === '01-01' ? 'Happy New Year!' : 'Happy New Year’s Eve!', fx: ['✨', '🎆', '🎇', '✦'], burst: md === '01-01' };
    if (['12-24', '12-25', '12-26'].includes(md)) return { emoji: '🎄', text: 'Merry Christmas!', fx: FX.winter };
    if (md === '12-06') return { emoji: '🎁', text: 'Happy Sinterklaas!', fx: ['🎁', '🍪', '⭐', '🎁'] };
    if (md === '02-14') return { emoji: '💕', text: 'Happy Valentine’s Day', fx: ['💕', '💗', '💖', '💕'] };
    if (md === '10-31') return { emoji: '🎃', text: 'Happy Halloween', fx: ['🍂', '🦇', '🎃', '🍁'] };
    if (md === '07-21') return { emoji: '🇧🇪', text: 'Happy National Day', fx: ['🎉', '✨', '🎊', '✨'] };
    const hol = PD.calendar?.between(PD.todayKey(), PD.todayKey()).find((e) => e.type === 'holiday' && /Easter/.test(e.title));
    if (hol) return { emoji: '🐣', text: 'Happy Easter', fx: ['🥚', '🌷', '🐣', '🌸'] };
    return null;
  }

  /** Particle layer for the header card (only for seasonal palettes or special days). */
  function heroFx() {
    if (PD.fx.reduce()) return '';
    const sp = special();
    const reward = !sp && PD.rewards?.heroFx();
    if (reward) return reward; // an equipped header effect wins over seasonal particles
    const palette = PD.store.get('settings').palette;
    const icons = sp?.fx || (isSeasonal(palette) ? FX[resolve(palette)] : null);
    if (!icons) return '';
    let html = '';
    for (let i = 0; i < 14; i++) {
      const left = (i * 37) % 100; const dur = 7 + ((i * 13) % 7); const delay = -((i * 11) % 14); const size = 12 + ((i * 7) % 12);
      html += `<i style="left:${left}%;--dur:${dur}s;--delay:${delay}s;--size:${size}px;--drift:${((i % 5) - 2) * 18}px">${icons[i % icons.length]}</i>`;
    }
    return `<div class="hero-fx" aria-hidden="true">${html}</div>`;
  }

  /** Once per special day: a little celebration when the dashboard opens. */
  function greet() {
    const sp = special();
    if (!sp?.burst) return;
    const k = `pd.seasons.burst.${PD.todayKey()}`;
    try { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); } catch { return; }
    setTimeout(() => { PD.fx.confetti({ count: 180 }); PD.toast(`${sp.emoji} ${sp.text}`); }, 900);
  }

  PD.seasons = { current, resolve, isSeasonal, special, heroFx, greet, SEASONS };
})(window.PD);
