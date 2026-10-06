/* Motion & feedback: entrance stagger, count-up numbers, confetti, beeps and voice cues. */
(function (PD) {
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Stagger-in the cards of a freshly rendered page. */
  function enter(root) {
    if (reduce()) return;
    const els = PD.$$('.page-head, .card, .tile, .routine, .ex-card', root).filter((el) => !el.closest('.player'));
    els.forEach((el, i) => { el.style.setProperty('--i', Math.min(i, 14)); el.classList.add('enter'); });
    setTimeout(() => els.forEach((el) => el.classList.remove('enter')), 1400);
  }

  /** Animate any [data-count] number from 0 to its value. */
  function countUp(root = document) {
    PD.$$('[data-count]', root).forEach((el) => {
      const to = Number(el.dataset.count); const digits = Number(el.dataset.digits || 0);
      if (reduce() || !Number.isFinite(to) || el.dataset.counted) { el.textContent = PD.fmt.num(to, digits); return; }
      el.dataset.counted = '1';
      const t0 = performance.now(); const dur = 900;
      const step = (now) => {
        const u = Math.min((now - t0) / dur, 1); const e = 1 - Math.pow(1 - u, 3);
        el.textContent = PD.fmt.num(to * e, digits);
        if (u < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /** Confetti burst on a full-screen canvas. */
  function confetti({ count = 140, origin = { x: 0.5, y: 0.35 } } = {}) {
    if (reduce()) return;
    const c = document.createElement('canvas');
    c.className = 'confetti'; document.body.appendChild(c);
    const ctx = c.getContext('2d'); const dpr = window.devicePixelRatio || 1;
    const W = (c.width = innerWidth * dpr); const H = (c.height = innerHeight * dpr);
    const css = getComputedStyle(document.documentElement);
    const colors = ['--accent-violet-ink', '--accent-mint-ink', '--accent-peach-ink', '--accent-sky-ink', '--accent-pink-ink'].map((v) => css.getPropertyValue(v).trim() || '#888');
    const parts = Array.from({ length: count }, () => {
      const a = Math.random() * Math.PI * 2; const v = (4 + Math.random() * 9) * dpr;
      return { x: origin.x * W, y: origin.y * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6 * dpr, r: (3 + Math.random() * 4) * dpr,
        rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)], shape: Math.random() > 0.5 };
    });
    const t0 = performance.now();
    const tick = (now) => {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.vy += 0.28 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - t / 2600);
        if (p.shape) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.7, 0, 7); ctx.fill(); }
        ctx.restore();
      });
      if (t < 2700) requestAnimationFrame(tick); else c.remove();
    };
    requestAnimationFrame(tick);
  }

  /* ---------- audio ---------- */
  let audio;
  function beep(freq = 880, dur = 0.12, vol = 0.18) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator(); const g = audio.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, audio.currentTime);
      g.gain.linearRampToValueAtTime(vol, audio.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur + 0.02);
    } catch { /* audio not available */ }
  }
  const chime = () => { beep(660, 0.14); setTimeout(() => beep(990, 0.22), 140); };
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.25, 0.2), i * 140));

  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-GB'; u.rate = 1.05;
      speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }

  PD.fx = { enter, countUp, confetti, beep, chime, fanfare, speak, reduce };
})(window.PD);
