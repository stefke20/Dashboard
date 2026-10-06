/* Calendar: month view, events / tasks / birthdays, Belgian public holidays, .ics import. */
(function (PD) {
  const { esc, $, $$, fmt, store, keyOf, parseKey, todayKey } = PD;

  const TYPES = {
    event: { label: 'Event', cls: 'violet', icon: '📌' },
    task: { label: 'Task', cls: 'mint', icon: '✅' },
    birthday: { label: 'Birthday', cls: 'pink', icon: '🎂' },
    holiday: { label: 'Holiday', cls: 'sky', icon: '🇧🇪' },
    workout: { label: 'Workout', cls: 'peach', icon: '🏋️' },
    google: { label: 'Google', cls: 'g', icon: '📅' },
  };
  /** Google events carry their calendar's own colour. */
  const col = (o) => (o.color && o.type === 'google' ? ` style="--ev:${esc(o.color)}"` : '');

  let viewMonth = new Date(); viewMonth.setDate(1);
  let selected = todayKey();

  /* ---------- holidays ---------- */
  function easter(y) { // Anonymous Gregorian algorithm
    const a = y % 19; const b = Math.floor(y / 100); const c = y % 100; const d = Math.floor(b / 4); const e = b % 4;
    const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31); const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  const holidayCache = {};
  function holidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const e = easter(y);
    const k = (d) => keyOf(d);
    const list = [
      [`${y}-01-01`, "New Year's Day"], [k(e), 'Easter Sunday'], [k(PD.addDays(e, 1)), 'Easter Monday'],
      [`${y}-05-01`, 'Labour Day'], [k(PD.addDays(e, 39)), 'Ascension Day'], [k(PD.addDays(e, 49)), 'Whit Sunday'],
      [k(PD.addDays(e, 50)), 'Whit Monday'], [`${y}-07-11`, 'Flemish Community Day'], [`${y}-07-21`, 'Belgian National Day'],
      [`${y}-08-15`, 'Assumption Day'], [`${y}-11-01`, "All Saints' Day"], [`${y}-11-11`, 'Armistice Day'],
      [`${y}-12-25`, 'Christmas Day'], [`${y}-12-26`, 'Boxing Day'],
    ];
    holidayCache[y] = list.map(([date, title]) => ({ id: `h-${date}-${title}`, title, date, type: 'holiday', readonly: true }));
    return holidayCache[y];
  }

  /* ---------- occurrences ---------- */
  function occurrenceIn(ev, from, to) {
    const out = [];
    const start = parseKey(ev.date);
    const repeat = ev.type === 'birthday' ? 'yearly' : (ev.repeat || 'none');
    const push = (d) => { const k = keyOf(d); if (k >= from && k <= to && k >= ev.date) out.push(k); };
    if (repeat === 'none') { if (ev.date >= from && ev.date <= to) out.push(ev.date); return out; }
    const f = parseKey(from); const t = parseKey(to);
    if (repeat === 'yearly') {
      for (let y = f.getFullYear(); y <= t.getFullYear(); y++) {
        let d = new Date(y, start.getMonth(), start.getDate());
        if (d.getMonth() !== start.getMonth()) d = new Date(y, start.getMonth() + 1, 0); // Feb 29 → Feb 28
        if (ev.type === 'birthday') { const k = keyOf(d); if (k >= from && k <= to) out.push(k); } else push(d);
      }
    } else if (repeat === 'monthly') {
      for (let d = new Date(f.getFullYear(), f.getMonth(), 1); d <= t; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        const day = Math.min(start.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
        push(new Date(d.getFullYear(), d.getMonth(), day));
      }
    } else if (repeat === 'weekly') {
      let d = new Date(f); d.setDate(d.getDate() + ((start.getDay() - d.getDay() + 7) % 7));
      for (; d <= t; d = PD.addDays(d, 7)) push(d);
    }
    return out;
  }

  function display(ev, k) {
    if (ev.type === 'birthday') {
      const age = !ev.noYear ? parseKey(k).getFullYear() - parseKey(ev.date).getFullYear() : null;
      return `${ev.title}${age > 0 ? ` turns ${age}` : ''}`;
    }
    return ev.title;
  }

  function between(from, to) {
    const events = store.get('events');
    const showHol = store.get('settings').holidays !== false;
    const fy = parseKey(from).getFullYear(); const ty = parseKey(to).getFullYear();
    const hol = [];
    if (showHol) for (let y = fy; y <= ty; y++) hol.push(...holidays(y));
    const out = [];
    [...events, ...hol].forEach((ev) => occurrenceIn(ev, from, to).forEach((k) => out.push({ ...ev, occursOn: k, displayTitle: display(ev, k) })));
    // completed home workouts show up as read-only entries
    (store.get('workouts').log || []).filter((l) => l.date >= from && l.date <= to).forEach((l) => out.push({
      id: `w-${l.id}`, type: 'workout', readonly: true, done: true, date: l.date, occursOn: l.date,
      time: PD.fmt.time(new Date(l.start)), displayTitle: `✓ ${l.name} · ${Math.round(l.duration / 60)} min`, notes: `${l.kcal} kcal`,
    }));
    out.push(...PD.gcal.eventsBetween(from, to));
    out.push(...(PD.programs?.planned(from, to) || []));
    out.push(...(PD.board?.dueBetween(from, to) || []));
    const order = { holiday: 0, birthday: 1, google: 2, event: 2, workout: 3, task: 4 };
    return out.sort((a, b) => a.occursOn.localeCompare(b.occursOn) || (a.time || '').localeCompare(b.time || '') || order[a.type] - order[b.type]);
  }

  function upcoming(days = 14) {
    const t = todayKey();
    const overdue = store.get('events').filter((e) => e.type === 'task' && !e.done && e.date < t)
      .map((e) => ({ ...e, occursOn: e.date, displayTitle: `${e.title} (overdue)` }));
    const seen = new Set(); // only the next occurrence of a repeating event
    const next = between(t, PD.shiftKey(t, days)).filter((e) => {
      if (e.type === 'task' && e.done) return false;
      const k = e.gid || e.id; // multi-day Google events: show once
      if (seen.has(k) || (e.type === 'workout' && e.readonly && !e.startable)) return false;
      seen.add(k); return true;
    });
    return [...overdue, ...next];
  }

  /* ---------- rendering ---------- */
  function render() {
    const page = $('#page-calendar');
    const y = viewMonth.getFullYear(); const m = viewMonth.getMonth();
    const first = PD.startOfWeek(new Date(y, m, 1));
    const days = Array.from({ length: 42 }, (_, i) => PD.addDays(first, i));
    const occ = between(keyOf(days[0]), keyOf(days[41]));
    const byDay = {};
    occ.forEach((o) => (byDay[o.occursOn] = byDay[o.occursOn] || []).push(o));
    const t = todayKey();
    const showHol = store.get('settings').holidays !== false;

    page.innerHTML = `
      <div class="page-head">
        <div><h1>Calendar</h1><p class="muted">Events, tasks and birthdays — stored in this browser.</p></div>
        <div class="row gap">
          <label class="btn ghost" title="Import an .ics file (e.g. exported from Google Calendar)">Import .ics<input type="file" accept=".ics,text/calendar" id="icsFile" hidden></label>
          <button class="btn" id="addEvent">+ New</button>
        </div>
      </div>
      <div class="cal-layout">
        <div class="card cal-card">
          <div class="cal-toolbar">
            <button class="icon-btn" id="calPrev" aria-label="Previous month"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
            <h2>${esc(fmt.date(viewMonth, { month: 'long', year: 'numeric' }))}</h2>
            <button class="icon-btn" id="calNext" aria-label="Next month"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
            <button class="btn sm ghost" id="calToday">Today</button>
            <span class="spacer"></span>
            <label class="toggle small"><input type="checkbox" id="calHol" ${showHol ? 'checked' : ''}> Belgian holidays</label>
          </div>
          <div class="cal-grid" role="grid">
            ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="cal-dow">${d}</div>`).join('')}
            ${days.map((d) => {
              const k = keyOf(d); const items = byDay[k] || [];
              return `<button class="cal-cell${d.getMonth() !== m ? ' out' : ''}${k === t ? ' today' : ''}${k === selected ? ' sel' : ''}" data-k="${k}" aria-label="${esc(fmt.date(d))}, ${items.length} items">
                <span class="cal-num">${d.getDate()}</span>
                <span class="cal-items">${items.slice(0, 3).map((o) => `<span class="cal-chip ${TYPES[o.type].cls}${o.done && o.type === 'task' ? ' done' : ''}"${col(o)}>${esc(o.displayTitle)}</span>`).join('')}
                ${items.length > 3 ? `<span class="muted small">+${items.length - 3} more</span>` : ''}
                ${items.length ? `<span class="cal-dots">${items.slice(0, 4).map((o) => `<i class="dot ${TYPES[o.type].cls}"${col(o)}></i>`).join('')}</span>` : ''}</span>
              </button>`;
            }).join('')}
          </div>
          <div class="legend">${Object.entries(TYPES).filter(([k]) => k !== 'google' || PD.google.connected()).map(([, ty]) => `<span><i class="dot ${ty.cls}"></i>${ty.label}</span>`).join('')}</div>
        </div>
        <div class="cal-side">
          <div class="card" id="dayPanel"></div>
          <div class="card" id="upcomingPanel"></div>
        </div>
      </div>`;

    $('#calPrev').onclick = () => { viewMonth = new Date(y, m - 1, 1); render(); };
    $('#calNext').onclick = () => { viewMonth = new Date(y, m + 1, 1); render(); };
    $('#calToday').onclick = () => { viewMonth = new Date(); viewMonth.setDate(1); selected = t; render(); };
    $('#calHol').onchange = (e) => { store.get('settings').holidays = e.target.checked; store.save('settings'); render(); };
    $('#addEvent').onclick = () => editor({ date: selected });
    $('#icsFile').onchange = (e) => importICS(e.target.files[0]);
    $$('.cal-cell', page).forEach((c) => {
      c.onclick = () => { selected = c.dataset.k; render(); };
      c.ondblclick = () => editor({ date: c.dataset.k });
    });
    renderDay(byDay[selected] || between(selected, selected));
    renderUpcoming();
  }

  function itemRow(o, showDate) {
    const ty = TYPES[o.type];
    return `<li class="ev-row" data-id="${o.id}">
      ${o.type === 'task' ? `<input type="checkbox" class="ev-done" data-id="${o.id}" ${o.done ? 'checked' : ''} aria-label="Done">` : `<span class="ev-icon" aria-hidden="true">${ty.icon}</span>`}
      ${o.link ? `<a class="ev-main" href="${esc(o.link)}" target="_blank" rel="noopener">` : `<button class="ev-main" ${o.readonly ? 'disabled' : ''} data-edit="${o.id}">`}
        <span class="ev-title${o.done && o.type === 'task' ? ' strike' : ''}">${esc(o.displayTitle)}</span>
        <span class="muted small">${showDate ? esc(PD.relDay(o.occursOn)) : ty.label}${o.time ? ` · ${esc(o.time)}` : ''}${o.repeat && o.repeat !== 'none' && o.type !== 'birthday' ? ` · repeats ${esc(o.repeat)}` : ''}</span>
        ${o.notes ? `<span class="small ev-notes">${esc(o.notes)}</span>` : ''}
      ${o.link ? '</a>' : '</button>'}
      ${o.type === 'workout' && (o.startable || (o.routineId && !o.readonly)) && o.occursOn <= todayKey() ? `<button class="btn sm" data-wstart="${esc(o.routineId)}">▶ Start</button>` : `<span class="pill ${ty.cls} small"${col(o)}>${ty.label}</span>`}
    </li>`;
  }

  function bindRows(root) {
    $$('[data-wstart]', root).forEach((b) => (b.onclick = () => (b.dataset.wstart === 'program' ? PD.programs.startNext() : PD.workout.start(b.dataset.wstart))));
    $$('[data-edit]', root).forEach((b) => (b.onclick = () => {
      const ev = store.get('events').find((e) => e.id === b.dataset.edit);
      if (ev) editor(ev);
    }));
    $$('.ev-done', root).forEach((cb) => (cb.onchange = () => {
      const ev = store.get('events').find((e) => e.id === cb.dataset.id);
      if (ev) { ev.done = cb.checked; store.save('events'); render(); }
    }));
  }

  function renderDay(items) {
    const el = $('#dayPanel');
    const d = parseKey(selected);
    el.innerHTML = `
      <div class="card-head"><h2>${esc(PD.relDay(selected) === fmt.short(d) ? fmt.date(d, { weekday: 'long', day: 'numeric', month: 'long' }) : `${PD.relDay(selected)} · ${fmt.dayMonth(d)}`)}</h2>
        <button class="btn sm" id="addOnDay">+ Add</button></div>
      ${items.length ? `<ul class="ev-list">${items.map((o) => itemRow(o, false)).join('')}</ul>` : '<p class="empty">Nothing on this day.</p>'}`;
    $('#addOnDay').onclick = () => editor({ date: selected });
    bindRows(el);
  }

  function renderUpcoming() {
    const el = $('#upcomingPanel');
    const list = upcoming(30);
    const birthdays = between(todayKey(), PD.shiftKey(todayKey(), 60)).filter((e) => e.type === 'birthday');
    el.innerHTML = `
      <div class="card-head"><h2>Next 30 days</h2></div>
      ${list.length ? `<ul class="ev-list">${list.slice(0, 12).map((o) => itemRow(o, true)).join('')}</ul>` : '<p class="empty">Nothing coming up.</p>'}
      ${birthdays.length ? `<h3 class="sub">Birthdays in the next 2 months</h3><ul class="bday-list">${birthdays.map((b) => `<li>🎂 <b>${esc(b.displayTitle)}</b><span class="muted small">${esc(PD.relDay(b.occursOn))} · in ${PD.daysBetween(todayKey(), b.occursOn)} d</span></li>`).join('')}</ul>` : ''}`;
    bindRows(el);
  }

  /* ---------- editor ---------- */
  function editor(ev) {
    const isNew = !ev.id;
    const type = ev.type || 'event';
    PD.modal(isNew ? 'New item' : 'Edit item', `
      <form id="evForm" class="form">
        <div class="segmented" role="radiogroup">
          ${['event', 'task', 'birthday', 'workout'].map((ty) => `<label><input type="radio" name="type" value="${ty}" ${ty === type ? 'checked' : ''}><span>${TYPES[ty].icon} ${TYPES[ty].label}</span></label>`).join('')}
        </div>
        <label>Title<input name="title" required maxlength="120" value="${esc(ev.title || '')}" placeholder="What's happening?"></label>
        <div class="row gap">
          <label class="grow">Date<input type="date" name="date" required value="${esc(ev.date || todayKey())}"></label>
          <label class="grow" data-for="event task workout">Time<input type="time" name="time" value="${esc(ev.time || '')}"></label>
        </div>
        <label class="toggle" data-for="birthday"><input type="checkbox" name="noYear" ${ev.noYear ? 'checked' : ''}> I don't know the birth year</label>
        <label data-for="event workout">Repeat
          <select name="repeat">${['none', 'weekly', 'monthly', 'yearly'].map((r) => `<option value="${r}" ${r === (ev.repeat || 'none') ? 'selected' : ''}>${r === 'none' ? 'Does not repeat' : r[0].toUpperCase() + r.slice(1)}</option>`).join('')}</select></label>
        <label>Notes<textarea name="notes" rows="2" maxlength="500">${esc(ev.notes || '')}</textarea></label>
        <div class="row gap end">
          ${isNew ? '' : '<button type="button" class="btn ghost danger" id="evDelete">Delete</button><button type="button" class="btn ghost" id="evGoogle" title="Copy to Google Calendar">+ Google</button><span class="spacer"></span>'}
          <button type="button" class="btn ghost" data-cancel>Cancel</button>
          <button type="submit" class="btn">${isNew ? 'Add' : 'Save'}</button>
        </div>
      </form>`, (body, close) => {
      const form = $('#evForm', body);
      const sync = () => {
        const ty = form.type.value;
        $$('[data-for]', form).forEach((el) => (el.hidden = !el.dataset.for.split(' ').includes(ty)));
        form.title.placeholder = ty === 'birthday' ? 'Whose birthday?' : ty === 'task' ? 'What needs doing?' : "What's happening?";
      };
      $$('input[name=type]', form).forEach((r) => (r.onchange = sync)); sync();
      $('[data-cancel]', body).onclick = close;
      form.onsubmit = (e) => {
        e.preventDefault();
        const ty = form.type.value;
        const data = {
          title: form.title.value.trim(), type: ty, date: form.date.value,
          time: ty === 'birthday' ? '' : form.time.value, notes: form.notes.value.trim(),
          repeat: ty === 'event' || ty === 'workout' ? form.repeat.value : 'none', noYear: ty === 'birthday' && form.noYear.checked,
        };
        const events = store.get('events');
        if (isNew) events.push({ id: PD.uid(), done: false, ...data });
        else Object.assign(events.find((x) => x.id === ev.id), data);
        store.save('events'); selected = data.date;
        viewMonth = parseKey(data.date); viewMonth.setDate(1);
        close(); render(); PD.toast(isNew ? 'Added to calendar' : 'Saved');
      };
      const gl = $('#evGoogle', body);
      if (gl) gl.onclick = () => window.open(PD.gcalLink({ title: ev.title, date: ev.date, time: ev.time, details: ev.notes, allDay: ev.type === 'birthday' || !ev.time, yearly: ev.type === 'birthday' || ev.repeat === 'yearly', weekly: ev.repeat === 'weekly' }), '_blank', 'noopener');
      const del = $('#evDelete', body);
      if (del) del.onclick = () => {
        if (!confirm('Delete this item?')) return;
        store.set('events', store.get('events').filter((x) => x.id !== ev.id));
        close(); render();
      };
    });
  }

  /* ---------- .ics import ---------- */
  async function importICS(file) {
    if (!file) return;
    const text = (await PD.readFile(file)).replace(/\r?\n[ \t]/g, ''); // unfold lines
    const blocks = text.split('BEGIN:VEVENT').slice(1);
    const events = store.get('events');
    const existing = new Set(events.map((e) => e.uidIcs).filter(Boolean));
    let added = 0;
    blocks.forEach((b) => {
      const prop = (name) => { const m = b.match(new RegExp(`^${name}(;[^:\\n]*)?:(.*)$`, 'm')); return m ? { params: m[1] || '', value: m[2].trim() } : null; };
      const start = prop('DTSTART'); const summary = prop('SUMMARY'); const uidP = prop('UID');
      if (!start || !summary) return;
      if (uidP && existing.has(uidP.value)) return;
      const v = start.value;
      let date; let time = '';
      if (/^\d{8}$/.test(v)) date = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
      else {
        const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
        if (!m) return;
        let d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
        if (v.endsWith('Z')) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
        date = keyOf(d); time = `${PD.pad(d.getHours())}:${PD.pad(d.getMinutes())}`;
      }
      const rrule = prop('RRULE')?.value || '';
      const freq = (rrule.match(/FREQ=(\w+)/) || [])[1];
      const title = summary.value.replace(/\\,/g, ',').replace(/\\n/gi, ' ').replace(/\\;/g, ';');
      const isBday = /birthday|verjaardag|jarig/i.test(title) || /BIRTHDAY/i.test(b);
      events.push({
        id: PD.uid(), uidIcs: uidP?.value, title, date, time: isBday ? '' : time,
        type: isBday ? 'birthday' : 'event', noYear: isBday,
        repeat: isBday ? 'none' : ({ YEARLY: 'yearly', MONTHLY: 'monthly', WEEKLY: 'weekly' }[freq] || 'none'),
        notes: (prop('LOCATION')?.value || '').replace(/\\,/g, ','), done: false,
      });
      added++;
    });
    store.save('events'); render();
    PD.toast(`Imported ${added} event${added === 1 ? '' : 's'}`);
  }

  PD.calendar = { render, upcoming, between, TYPES, add: (prefill = {}) => editor({ date: todayKey(), ...prefill }) };
})(window.PD);
