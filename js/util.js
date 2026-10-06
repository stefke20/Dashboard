/* Shared helpers: DOM, dates, formatting, networking. */
window.PD = window.PD || {};

(function (PD) {
  const LOCALE = 'en-GB';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- dates (local "YYYY-MM-DD" keys) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayKey = () => keyOf(new Date());
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const shiftKey = (k, n) => keyOf(addDays(parseKey(k), n));
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
  const lastNDays = (n, endKey = todayKey()) =>
    Array.from({ length: n }, (_, i) => shiftKey(endKey, i - n + 1));

  const isoWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 864e5 + 1) / 7);
  };
  const startOfWeek = (d) => { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); x.setHours(0, 0, 0, 0); return x; };

  // Intl formatters are slow to create, so make each kind once and reuse it
  const formatters = new Map();
  const cached = (Kind, opts) => {
    const key = Kind.name + JSON.stringify(opts);
    if (!formatters.has(key)) formatters.set(key, new Kind(LOCALE, opts));
    return formatters.get(key);
  };
  const dateFmt = (opts) => cached(Intl.DateTimeFormat, opts);
  const fmt = {
    date: (d, opts) => dateFmt(opts || { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d),
    short: (d) => dateFmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(d),
    dayMonth: (d) => dateFmt({ day: 'numeric', month: 'short' }).format(d),
    weekday: (d, style = 'short') => dateFmt({ weekday: style }).format(d),
    time: (d) => dateFmt({ hour: '2-digit', minute: '2-digit' }).format(d),
    num: (n, digits = 0) => cached(Intl.NumberFormat, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(n || 0)),
    duration: (sec) => {
      const h = Math.floor(sec / 3600); const m = Math.round((sec % 3600) / 60);
      return h ? `${h}h ${pad(m)}m` : `${m}m`;
    },
    ago: (date) => {
      const s = (Date.now() - date) / 1000;
      if (s < 60) return 'just now';
      if (s < 3600) return `${Math.floor(s / 60)} min ago`;
      if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
      return `${Math.floor(s / 86400)} d ago`;
    },
  };

  const relDay = (k) => {
    const n = daysBetween(todayKey(), k);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n > 1 && n < 7) return fmt.weekday(parseKey(k), 'long');
    return fmt.short(parseKey(k));
  };

  /* ---------- network ---------- */
  async function fetchJSON(url, opts = {}, timeout = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally { clearTimeout(t); }
  }
  async function fetchText(url, timeout = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally { clearTimeout(t); }
  }

  /* ---------- UI bits ---------- */
  let toastTimer;
  /** Short message at the bottom; optionally with one action button (e.g. Undo). */
  function toast(msg, { action, onAction, ms } = {}) {
    const el = $('#toast');
    // dialogs live in the browser's top layer: put the toast inside an open one so it (and its button) stays on top
    const host = document.querySelector('dialog[open]') || document.body;
    if (el.parentElement !== host) host.appendChild(el);
    el.textContent = msg; el.hidden = false;
    if (action) {
      const b = document.createElement('button'); b.className = 'toast-action'; b.textContent = action;
      b.onclick = () => { hide(); onAction?.(); };
      el.append(' ', b);
    }
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(toastTimer);
    const hide = () => { clearTimeout(toastTimer); el.classList.remove('show'); setTimeout(() => (el.hidden = true), 250); };
    toastTimer = setTimeout(hide, ms || (action ? 6000 : 2600));
  }

  /** Make a change that can be undone: snapshot the data keys, apply the change, offer Undo for a few seconds. */
  function undoable(keys, msg, change) {
    const before = keys.map((k) => structuredClone(PD.store.get(k)));
    change();
    toast(msg, {
      action: 'Undo',
      onAction: () => { keys.forEach((k, i) => PD.store.set(k, before[i])); PD.app.renderCurrent(); toast('Restored ↩️'); },
    });
  }

  function modal(title, html, onMount, cls = '') {
    const dlg = $('#modal');
    dlg.className = `modal ${cls}`;
    $('#modalTitle').textContent = title;
    $('#modalBody').innerHTML = html;
    if (!dlg.open) dlg.showModal();
    if (onMount) onMount($('#modalBody'), () => dlg.close());
    return () => dlg.close();
  }

  /** Progress ring as inline SVG. value/max, colour via CSS var name. */
  function ring(value, max, { size = 120, stroke = 12, color = 'var(--accent-violet-ink)', label = '', sub = '' } = {}) {
    const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
    const pct = max > 0 ? Math.min(value / max, 1) : 0;
    const over = max > 0 && value > max;
    return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(label)} ${esc(sub)}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
      <circle class="ring-prog" style="--c:${c.toFixed(1)}" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${over ? 'var(--warn-ink)' : color}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c * pct} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="${sub ? '47%' : '53%'}" text-anchor="middle" class="ring-label">${esc(label)}</text>
      ${sub ? `<text x="50%" y="64%" text-anchor="middle" class="ring-sub">${esc(sub)}</text>` : ''}
    </svg>`;
  }

  function download(filename, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  const readFile = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result); r.onerror = reject; r.readAsText(file);
  });

  /** Minimal RFC4180-ish CSV parser. */
  function parseCSV(text) {
    const rows = []; let row = []; let cur = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); rows.push(row); row = []; cur = '';
      } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => c !== ''));
  }

  const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /** A Google Calendar "create event" link with everything pre-filled (no login or API needed). */
  function gcalLink({ title, date, time, minutes = 60, details = '', allDay = false, weekly = false, yearly = false }) {
    const d = date.replace(/-/g, '');
    let dates;
    if (allDay || !time) { const next = keyOf(addDays(parseKey(date), 1)).replace(/-/g, ''); dates = `${d}/${next}`; } else {
      const [h, m] = time.split(':').map(Number); const end = new Date(parseKey(date)); end.setHours(h, m + minutes);
      dates = `${d}T${pad(h)}${pad(m)}00/${keyOf(end).replace(/-/g, '')}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
    }
    const q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates, details, ctz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (weekly) q.set('recur', 'RRULE:FREQ=WEEKLY'); if (yearly) q.set('recur', 'RRULE:FREQ=YEARLY');
    return `https://calendar.google.com/calendar/render?${q}`;
  }

  Object.assign(PD, { gcalLink,
    esc, $, $$, uid, pad, keyOf, todayKey, parseKey, addDays, shiftKey, daysBetween, lastNDays,
    isoWeek, startOfWeek, fmt, relDay, fetchJSON, fetchText, toast, undoable, modal, ring, download, readFile,
    parseCSV, debounce, norm,
  });
})(window.PD);
