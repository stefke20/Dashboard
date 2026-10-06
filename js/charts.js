/* Small dependency-free SVG charts: single-series bars & line, with hover tooltips. */
(function (PD) {
  const { esc } = PD;
  const NS = 'http://www.w3.org/2000/svg';

  /** Round axis: a 1/2/2.5/5 × 10^n step and a max that is a whole number of steps. */
  function niceScale(v, divisions = 4) {
    if (v <= 0) return { max: 1, ticks: [0, 1] };
    const raw = v / divisions;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    const max = Math.ceil(v / step) * step;
    return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
  }

  const tip = {
    show(html, evt) {
      const el = PD.$('#tooltip');
      el.innerHTML = html; el.hidden = false;
      const pad = 12; const r = el.getBoundingClientRect();
      let x = evt.clientX + pad; let y = evt.clientY - r.height - pad;
      if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
      if (y < 8) y = evt.clientY + pad;
      el.style.left = `${x}px`; el.style.top = `${y}px`;
    },
    hide() { PD.$('#tooltip').hidden = true; },
  };

  const observers = new WeakMap();
  function observe(el, render) {
    render();
    if (observers.has(el)) observers.get(el).disconnect();
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 4) { w = el.clientWidth; render(); } });
    ro.observe(el); observers.set(el, ro);
  }

  const fmtTick = (v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : PD.fmt.num(v, v < 10 && v % 1 ? 1 : 0));

  /**
   * bars: [{label, value, tip, highlight}]
   * opts: {target, targetLabel, height, color, onClick(i)}
   */
  // animate only the first draw into a container (not every resize / data refresh)
  const firstDraw = (el) => { const f = !el.dataset.drawn; el.dataset.drawn = '1'; return f && !PD.fx.reduce(); };

  function bar(el, bars, opts = {}) {
    const animate = firstDraw(el);
    let drawn = false;
    observe(el, () => {
      const anim = animate && !drawn; drawn = true;
      const W = Math.max(el.clientWidth, 240); const H = opts.height || 220;
      const m = { t: 16, r: 8, b: 28, l: 40 };
      const iw = W - m.l - m.r; const ih = H - m.t - m.b;
      const { max, ticks } = niceScale(Math.max(opts.target || 0, ...bars.map((b) => b.value || 0)) * 1.08);
      const y = (v) => m.t + ih - (v / max) * ih;
      const band = iw / bars.length; const bw = Math.min(Math.max(band - 2, 4) * 0.62, 44);
      const color = opts.color || 'var(--accent-violet-ink)';
      const every = Math.ceil(bars.length / Math.floor(iw / 42));

      let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="chart" role="img" aria-label="${esc(opts.label || 'Bar chart')}">`;
      ticks.forEach((t) => {
        s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/>`;
        s += `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">${fmtTick(t)}</text>`;
      });
      bars.forEach((b, i) => {
        const cx = m.l + band * i + band / 2;
        const v = Math.max(b.value || 0, 0);
        const h = Math.max(ih - (y(v) - m.t), 0);
        const r = Math.min(4, bw / 2, h);
        const x0 = cx - bw / 2; const y0 = y(v); const yb = m.t + ih;
        if (h > 0) {
          s += `<path class="bar${b.highlight ? ' hl' : ''}${anim ? ' grow' : ''}" style="--i:${i}" fill="${b.color || color}" d="M${x0},${yb} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${yb} Z"/>`;
        }
        if (i % every === 0 || (i === bars.length - 1 && i % every >= every * 0.6)) {
          s += `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="axis${b.highlight ? ' strong' : ''}">${esc(b.label)}</text>`;
        }
        s += `<rect class="hit" data-i="${i}" x="${m.l + band * i}" y="${m.t}" width="${band}" height="${ih}" fill="transparent"/>`;
      });
      if (opts.target) {
        const ty = y(opts.target);
        s += `<line x1="${m.l}" x2="${W - m.r}" y1="${ty}" y2="${ty}" class="target"/>`;
        s += `<text x="${W - m.r}" y="${ty - 6}" text-anchor="end" class="axis target-label">${esc(opts.targetLabel || 'Target')} ${fmtTick(opts.target)}</text>`;
      }
      s += '</svg>';
      el.innerHTML = s;

      el.querySelectorAll('.hit').forEach((hit) => {
        const b = bars[+hit.dataset.i];
        hit.addEventListener('mousemove', (e) => tip.show(b.tip || `${esc(b.label)}: ${PD.fmt.num(b.value)}`, e));
        hit.addEventListener('mouseleave', tip.hide);
        if (opts.onClick) { hit.style.cursor = 'pointer'; hit.addEventListener('click', () => { tip.hide(); opts.onClick(+hit.dataset.i); }); }
      });
    });
  }

  /**
   * points: [{label, value (null = gap), tip}] equally spaced.
   * opts: {goal, goalLabel, height, color, unit}
   */
  function line(el, points, opts = {}) {
    const animate = firstDraw(el);
    let drawn = false;
    observe(el, () => {
      const anim = animate && !drawn; drawn = true;
      const W = Math.max(el.clientWidth, 240); const H = opts.height || 220;
      const m = { t: 16, r: 12, b: 28, l: 40 };
      const iw = W - m.l - m.r; const ih = H - m.t - m.b;
      const vals = points.map((p) => p.value).filter((v) => v != null);
      if (opts.goal) vals.push(opts.goal);
      if (!vals.length) { el.innerHTML = '<p class="empty">No data yet.</p>'; return; }
      let lo = Math.min(...vals); let hi = Math.max(...vals);
      const padV = Math.max((hi - lo) * 0.15, 0.5); lo = Math.floor(lo - padV); hi = Math.ceil(hi + padV);
      if (opts.yMin != null) lo = opts.yMin; if (opts.yMax != null) hi = opts.yMax; // fixed scales (e.g. mood 1–5)
      const x = (i) => m.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
      const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
      const color = opts.color || 'var(--accent-sky-ink)';
      const every = Math.ceil(points.length / Math.floor(iw / 56));

      let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="chart" role="img" aria-label="${esc(opts.label || 'Line chart')}">`;
      [lo, (lo + hi) / 2, hi].forEach((t) => {
        s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/>`;
        s += `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end" class="axis">${fmtTick(Math.round(t * 10) / 10)}</text>`;
      });
      points.forEach((p, i) => {
        if (i % every === 0 || (i === points.length - 1 && i % every >= every * 0.6)) s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" class="axis">${esc(p.label)}</text>`;
      });
      if (opts.goal) {
        s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(opts.goal)}" y2="${y(opts.goal)}" class="target"/>`;
        s += `<text x="${W - m.r}" y="${y(opts.goal) - 6}" text-anchor="end" class="axis target-label">${esc(opts.goalLabel || 'Goal')}</text>`;
      }
      // path with gaps bridged (sparse data like weight is still a trend)
      const pts = points.map((p, i) => (p.value == null ? null : [x(i), y(p.value)])).filter(Boolean);
      if (pts.length) {
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        s += `<path d="${d} L${pts[pts.length - 1][0]},${m.t + ih} L${pts[0][0]},${m.t + ih} Z" class="area${anim ? ' fade' : ''}" fill="${color}"/>`;
        s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" pathLength="1" class="${anim ? 'draw' : ''}"/>`;
        if (pts.length <= 40) pts.forEach((p, i) => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${color}" class="dot${anim ? ' pop' : ''}" style="--i:${i}"/>`; });
      }
      s += `<line class="cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>`;
      s += `<circle class="cross-dot" r="5" fill="${color}" visibility="hidden"/>`;
      s += `<rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>`;
      s += '</svg>';
      el.innerHTML = s;

      const svg = el.querySelector('svg'); const cross = svg.querySelector('.cross'); const cd = svg.querySelector('.cross-dot');
      const hit = svg.querySelector('.hit');
      hit.addEventListener('mousemove', (e) => {
        const r = svg.getBoundingClientRect();
        const mx = ((e.clientX - r.left) / r.width) * W;
        // nearest point that has a value
        let best = -1; let bd = Infinity;
        points.forEach((p, i) => { if (p.value != null) { const dd = Math.abs(x(i) - mx); if (dd < bd) { bd = dd; best = i; } } });
        if (best < 0) return;
        const p = points[best];
        cross.setAttribute('x1', x(best)); cross.setAttribute('x2', x(best)); cross.setAttribute('visibility', 'visible');
        cd.setAttribute('cx', x(best)); cd.setAttribute('cy', y(p.value)); cd.setAttribute('visibility', 'visible');
        tip.show(p.tip || `${esc(p.label)}: ${PD.fmt.num(p.value, 1)}${opts.unit ? ` ${esc(opts.unit)}` : ''}`, e);
      });
      hit.addEventListener('mouseleave', () => { cross.setAttribute('visibility', 'hidden'); cd.setAttribute('visibility', 'hidden'); tip.hide(); });
    });
  }

  PD.charts = { bar, line, tip };
})(window.PD);
