/* Board tab: a kanban board (drag & drop with mouse or touch) and notes with checklists. Both sync. */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey } = PD;
  const B = () => store.get('board');
  const N = () => store.get('notes');
  const COLORS = ['violet', 'sky', 'mint', 'peach', 'pink'];
  let view = (() => { try { return localStorage.getItem('pd.board.view') || 'board'; } catch { return 'board'; } })();
  let noteQuery = '';

  /* =================== page =================== */
  function render() {
    const page = $('#page-board');
    page.innerHTML = `
      <div class="page-head">
        <div><h1>Board</h1><p class="muted">Plan things on the board, keep everything else in notes.</p></div>
        <div class="row gap">
          <div class="segmented" role="tablist">
            <label><input type="radio" name="bview" value="board" ${view === 'board' ? 'checked' : ''}><span>📋 Board</span></label>
            <label><input type="radio" name="bview" value="notes" ${view === 'notes' ? 'checked' : ''}><span>🗒️ Notes</span></label>
          </div>
          ${view === 'board' ? '<button class="btn" id="addCol">+ Column</button>' : '<button class="btn" id="addNote">+ Note</button>'}
        </div>
      </div>
      <div id="boardView"></div>`;
    $$('input[name=bview]', page).forEach((r) => (r.onchange = () => { view = r.value; try { localStorage.setItem('pd.board.view', view); } catch { /* ignore */ } render(); PD.fx.enter(page); }));
    if (view === 'board') { renderBoard(); $('#addCol').onclick = addColumn; } else { renderNotes(); $('#addNote').onclick = () => noteEditor(); }
  }

  /* =================== kanban =================== */
  const cardsIn = (col) => B().cards.filter((c) => c.col === col).sort((a, b) => a.order - b.order);
  const isDoneCol = (col) => { const cols = B().columns; return col === 'done' || (cols.length > 1 && cols[cols.length - 1].id === col); };

  function dueChip(c) {
    if (!c.due) return '';
    const d = PD.daysBetween(todayKey(), c.due);
    const cls = c.doneAt ? '' : d < 0 ? 'over' : d === 0 ? 'today' : '';
    return `<span class="due ${cls}">📅 ${esc(d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === -1 ? 'Yesterday' : fmt.dayMonth(PD.parseKey(c.due)))}</span>`;
  }

  function cardHtml(c) {
    const checks = (c.notes || '').match(/- \[( |x)\]/gi) || [];
    const doneChecks = checks.filter((x) => /x/i.test(x)).length;
    return `<div class="kcard${c.doneAt ? ' is-done' : ''}" data-card="${esc(c.id)}" tabindex="0" role="button" aria-label="${esc(c.title)}">
      ${c.label ? `<span class="klabel ${esc(c.label)}"></span>` : ''}
      <span class="ktitle">${c.doneAt ? '✓ ' : ''}${esc(c.title)}</span>
      <span class="kmeta">${dueChip(c)}${checks.length ? `<span class="kchk">☑ ${doneChecks}/${checks.length}</span>` : c.notes ? '<span class="kchk">📝</span>' : ''}</span>
    </div>`;
  }

  function renderBoard() {
    const el = $('#boardView');
    const cols = B().columns;
    el.innerHTML = `<div class="kboard" id="kboard">${cols.map((col) => {
      const cards = cardsIn(col.id);
      return `<section class="kcol ${esc(col.color || 'violet')}" data-col="${esc(col.id)}">
        <header class="kcol-head"><i class="dot ${esc(col.color || 'violet')}"></i><h2 data-rename="${esc(col.id)}" title="Double-click to rename">${esc(col.name)}</h2><span class="kcount">${cards.length}</span>
          <button class="icon-btn sm ghost" data-colmenu="${esc(col.id)}" aria-label="Column options"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button></header>
        <div class="klist" data-list="${esc(col.id)}">${cards.map(cardHtml).join('')}</div>
        <form class="kadd" data-add="${esc(col.id)}"><input placeholder="+ Add a card" maxlength="120" aria-label="Add a card to ${esc(col.name)}"></form>
      </section>`;
    }).join('')}</div>`;
    $$('.kadd', el).forEach((f) => (f.onsubmit = (e) => {
      e.preventDefault();
      const input = $('input', f); const title = input.value.trim(); if (!title) return;
      const col = f.dataset.add; const max = Math.max(0, ...cardsIn(col).map((c) => c.order));
      B().cards.push({ id: PD.uid(), col, title, notes: '', due: '', label: '', order: max + 1, created: new Date().toISOString(), doneAt: isDoneCol(col) ? new Date().toISOString() : null });
      store.save('board'); renderBoard(); const again = $(`.kadd[data-add="${col}"] input`); again?.focus();
    }));
    $$('.kcard', el).forEach((c) => {
      bindDrag(c);
      c.onkeydown = (e) => { if (e.key === 'Enter') cardEditor(c.dataset.card); };
    });
    $$('[data-rename]', el).forEach((h) => (h.ondblclick = () => renameColumn(h.dataset.rename)));
    $$('[data-colmenu]', el).forEach((b) => (b.onclick = () => columnMenu(b.dataset.colmenu)));
  }

  /* ---------- drag & drop (pointer for mouse, long-press for touch) ---------- */
  let drag = null;
  function bindDrag(el) {
    let downX = 0; let downY = 0; let timer = null; let pending = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button, a, input')) return;
      downX = e.clientX; downY = e.clientY; pending = true;
      if (e.pointerType === 'touch') timer = setTimeout(() => { if (pending) { pending = false; startDrag(el, downX, downY); PD.haptic?.(25); } }, 260);
    });
    el.addEventListener('pointermove', (e) => {
      if (!pending) return;
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (e.pointerType === 'touch') { if (dist > 10) { pending = false; clearTimeout(timer); } return; }
      if (dist > 6) { pending = false; startDrag(el, e.clientX, e.clientY); }
    });
    el.addEventListener('pointerup', () => {
      clearTimeout(timer);
      if (pending) { pending = false; cardEditor(el.dataset.card); } // a plain click opens the editor
    });
    el.addEventListener('pointercancel', () => { clearTimeout(timer); pending = false; });
    el.addEventListener('contextmenu', (e) => { if (drag) e.preventDefault(); });
  }

  function startDrag(el, x, y) {
    const r = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.classList.add('kghost'); ghost.style.width = `${r.width}px`;
    document.body.appendChild(ghost);
    el.classList.add('kplaceholder');
    drag = { el, ghost, dx: x - r.left, dy: y - r.top, id: el.dataset.card };
    moveGhost(x, y);
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('touchmove', blockScroll, { passive: false });
    document.addEventListener('pointerup', onUp, { once: true });
    document.addEventListener('pointercancel', onUp, { once: true });
    document.body.classList.add('dragging');
  }
  const blockScroll = (e) => { if (drag) e.preventDefault(); };
  function moveGhost(x, y) { drag.ghost.style.transform = `translate(${x - drag.dx}px, ${y - drag.dy}px) rotate(2.5deg)`; }

  function onMove(e) {
    if (!drag) return;
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
    // auto-scroll the board sideways near the edges (phones)
    const board = $('#kboard'); const br = board.getBoundingClientRect();
    if (e.clientX > br.right - 40) board.scrollLeft += 12; else if (e.clientX < br.left + 40) board.scrollLeft -= 12;
    drag.ghost.style.display = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    drag.ghost.style.display = '';
    const list = under?.closest('.kcol')?.querySelector('.klist');
    if (!list) return;
    const siblings = [...list.querySelectorAll('.kcard:not(.kplaceholder)')];
    const after = siblings.find((s) => { const r = s.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
    if (after ? after.previousElementSibling === drag.el : list.lastElementChild === drag.el && drag.el.parentElement === list) return;
    flip(() => (after ? list.insertBefore(drag.el, after) : list.appendChild(drag.el)));
  }

  /** Animate cards to their new positions (FLIP). */
  function flip(mutate) {
    const els = $$('.kcard:not(.kghost)');
    const before = new Map(els.map((x) => [x, x.getBoundingClientRect()]));
    mutate();
    els.forEach((x) => {
      const a = before.get(x); const b = x.getBoundingClientRect();
      const dx = a.left - b.left; const dy = a.top - b.top;
      if (!dx && !dy) return;
      x.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

  function onUp() {
    if (!drag) return;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('touchmove', blockScroll);
    document.body.classList.remove('dragging');
    const { el, ghost, id } = drag; drag = null;
    const list = el.parentElement; const col = list.dataset.list;
    const r = el.getBoundingClientRect();
    ghost.animate([{ transform: ghost.style.transform }, { transform: `translate(${r.left}px, ${r.top}px)` }], { duration: 180, easing: 'ease-out' }).onfinish = () => ghost.remove();
    el.classList.remove('kplaceholder');
    const card = B().cards.find((c) => c.id === id);
    const wasDone = !!card.doneAt;
    card.col = col;
    [...list.querySelectorAll('.kcard')].forEach((x, i) => { const c = B().cards.find((y) => y.id === x.dataset.card); if (c) c.order = i; });
    card.doneAt = isDoneCol(col) ? (card.doneAt || new Date().toISOString()) : null;
    store.save('board');
    if (!wasDone && card.doneAt) { PD.fx.confetti({ count: 50, origin: { x: r.left / innerWidth + 0.1, y: r.top / innerHeight } }); PD.toast('Done ✓ +3 XP'); }
    setTimeout(renderBoard, 190);
  }

  /* ---------- card & column editing ---------- */
  function cardEditor(id) {
    const c = B().cards.find((x) => x.id === id);
    if (!c) return;
    PD.modal('Card', `
      <form id="kForm" class="form">
        <label>Title<input name="title" required maxlength="120" value="${esc(c.title)}"></label>
        <div class="row gap wrap">
          <label class="grow">Column<select name="col">${B().columns.map((col) => `<option value="${esc(col.id)}" ${col.id === c.col ? 'selected' : ''}>${esc(col.name)}</option>`).join('')}</select></label>
          <label class="grow">Due date<input type="date" name="due" value="${esc(c.due || '')}"></label>
        </div>
        <label>Label</label>
        <div class="color-pick left"><button type="button" class="sw none${!c.label ? ' sel' : ''}" data-col="" aria-label="No label">∅</button>${COLORS.map((x) => `<button type="button" class="sw ${x}${c.label === x ? ' sel' : ''}" data-col="${x}" aria-label="${x}"></button>`).join('')}</div>
        <label>Notes <span class="muted small">— tip: “- [ ] item” makes a checklist</span><textarea name="notes" rows="6">${esc(c.notes || '')}</textarea></label>
        <div class="row gap end">
          <button type="button" class="btn ghost danger" id="kDel">Delete</button>
          ${c.due ? '<button type="button" class="btn ghost" id="kGoogle">+ Google Calendar</button>' : ''}
          <span class="spacer"></span><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn">Save</button>
        </div>
      </form>`, (body, close) => {
      const f = $('#kForm', body); let label = c.label || '';
      $$('.color-pick .sw', body).forEach((b) => (b.onclick = () => { label = b.dataset.col; $$('.color-pick .sw', body).forEach((x) => x.classList.toggle('sel', x === b)); }));
      $('[data-cancel]', body).onclick = close;
      $('#kDel', body).onclick = () => { B().cards = B().cards.filter((x) => x.id !== id); store.save('board'); close(); renderBoard(); };
      const g = $('#kGoogle', body); if (g) g.onclick = () => window.open(PD.gcalLink({ title: c.title, date: c.due, details: c.notes, allDay: true }), '_blank', 'noopener');
      f.onsubmit = (e) => {
        e.preventDefault();
        const wasDone = !!c.doneAt;
        Object.assign(c, { title: f.title.value.trim(), col: f.col.value, due: f.due.value, notes: f.notes.value, label });
        c.doneAt = isDoneCol(c.col) ? (c.doneAt || new Date().toISOString()) : null;
        if (!wasDone && c.doneAt) PD.toast('Done ✓ +3 XP');
        store.save('board'); close(); renderBoard();
      };
    });
  }

  function addColumn() {
    const name = prompt('Column name', 'New column');
    if (!name?.trim()) return;
    const cols = B().columns; const done = cols.findIndex((c) => c.id === 'done');
    const col = { id: `c-${PD.uid()}`, name: name.trim(), color: COLORS[cols.length % COLORS.length] };
    if (done >= 0) cols.splice(done, 0, col); else cols.push(col); // keep "Done" last
    store.save('board'); renderBoard();
  }
  function renameColumn(id) {
    const col = B().columns.find((c) => c.id === id);
    const name = prompt('Rename column', col.name);
    if (name?.trim()) { col.name = name.trim(); store.save('board'); renderBoard(); }
  }
  function columnMenu(id) {
    const cols = B().columns; const i = cols.findIndex((c) => c.id === id); const col = cols[i];
    PD.modal(col.name, `
      <div class="form">
        <label>Name<input id="cName" value="${esc(col.name)}" maxlength="40"></label>
        <label>Colour</label>
        <div class="color-pick left">${COLORS.map((x) => `<button type="button" class="sw ${x}${col.color === x ? ' sel' : ''}" data-col="${x}" aria-label="${x}"></button>`).join('')}</div>
        <div class="row gap wrap">
          <button type="button" class="btn ghost sm" id="cLeft" ${i === 0 ? 'disabled' : ''}>← Move left</button>
          <button type="button" class="btn ghost sm" id="cRight" ${i === cols.length - 1 ? 'disabled' : ''}>Move right →</button>
          <button type="button" class="btn ghost sm" id="cClear">Clear ${cardsIn(id).length} card${cardsIn(id).length === 1 ? '' : 's'}</button>
        </div>
        <div class="row gap end"><button type="button" class="btn ghost danger" id="cDel" ${cols.length <= 1 ? 'disabled' : ''}>Delete column</button><span class="spacer"></span><button type="button" class="btn" id="cSave">Save</button></div>
      </div>`, (body, close) => {
      let color = col.color;
      $$('.sw', body).forEach((b) => (b.onclick = () => { color = b.dataset.col; $$('.sw', body).forEach((x) => x.classList.toggle('sel', x === b)); }));
      const move = (d) => { cols.splice(i, 1); cols.splice(i + d, 0, col); store.save('board'); close(); renderBoard(); };
      $('#cLeft', body).onclick = () => move(-1); $('#cRight', body).onclick = () => move(1);
      $('#cClear', body).onclick = () => { if (confirm(`Delete all cards in “${col.name}”?`)) { B().cards = B().cards.filter((c) => c.col !== id); store.save('board'); close(); renderBoard(); } };
      $('#cDel', body).onclick = () => {
        if (!confirm(`Delete “${col.name}”? Its cards move to the first column.`)) return;
        cols.splice(i, 1); const first = cols[0].id;
        B().cards.forEach((c) => { if (c.col === id) c.col = first; });
        store.save('board'); close(); renderBoard();
      };
      $('#cSave', body).onclick = () => { col.name = $('#cName', body).value.trim() || col.name; col.color = color; store.save('board'); close(); renderBoard(); };
    });
  }

  /** Cards with a due date appear in the calendar and under "Up next". */
  function dueBetween(from, to) {
    return (B().cards || []).filter((c) => c.due && !c.doneAt && c.due >= from && c.due <= to).map((c) => ({
      id: `k-${c.id}`, type: 'task', readonly: true, date: c.due, occursOn: c.due, displayTitle: `📋 ${c.title}`, notes: B().columns.find((x) => x.id === c.col)?.name || '',
    }));
  }

  /* =================== notes =================== */
  /** Tiny, safe markdown: headings, checklists, bullets, bold/italic, links. */
  function md(text, interactive) {
    let n = -1;
    return esc(text).split('\n').map((line) => {
      let l = line;
      const box = l.match(/^\s*- \[( |x)\] (.*)$/i);
      if (box) { n++; return `<label class="md-check"><input type="checkbox" ${box[1].toLowerCase() === 'x' ? 'checked' : ''} ${interactive ? `data-chk="${n}"` : 'disabled'}><span>${inline(box[2])}</span></label>`; }
      if (/^#{1,3} /.test(l)) return `<b class="md-h">${inline(l.replace(/^#{1,3} /, ''))}</b>`;
      if (/^\s*[-*] /.test(l)) return `<span class="md-li">• ${inline(l.replace(/^\s*[-*] /, ''))}</span>`;
      return l ? `<span>${inline(l)}</span>` : '<span class="md-gap"></span>';
    }).join('');
  }
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|\s)\*(.+?)\*/g, '$1<i>$2</i>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  function toggleCheck(note, i) {
    let n = -1;
    note.body = note.body.split('\n').map((l) => (/^\s*- \[( |x)\] /i.test(l) && ++n === i ? l.replace(/\[( |x)\]/i, (m) => (m.toLowerCase() === '[x]' ? '[ ]' : '[x]')) : l)).join('\n');
    note.updated = new Date().toISOString(); store.save('notes');
  }

  function renderNotes() {
    const el = $('#boardView');
    const q = PD.norm(noteQuery);
    const list = N().list.filter((x) => !q || PD.norm(`${x.title} ${x.body}`).includes(q))
      .sort((a, b) => (b.pinned - a.pinned) || (b.updated || '').localeCompare(a.updated || ''));
    el.innerHTML = `
      <div class="notes-bar"><input type="search" id="noteSearch" placeholder="Search notes…" value="${esc(noteQuery)}"><span class="muted small">${N().list.length} note${N().list.length === 1 ? '' : 's'}</span></div>
      ${list.length ? `<div class="notes">${list.map((x) => `
        <article class="note ${esc(x.color || '')}" data-note="${esc(x.id)}" tabindex="0">
          ${x.pinned ? '<span class="pin" title="Pinned">📌</span>' : ''}
          ${x.title ? `<h3>${esc(x.title)}</h3>` : ''}
          <div class="note-body">${md((x.body || '').split('\n').slice(0, 14).join('\n'), true)}</div>
          <span class="muted small">${esc(fmt.ago(new Date(x.updated || x.created)))}</span>
        </article>`).join('')}</div>`
        : `<div class="empty-notes"><div style="font-size:42px">🗒️</div><p>${q ? 'No notes match your search.' : 'No notes yet — ideas, lists, anything.'}</p>${q ? '' : '<button class="btn" id="firstNote">Write your first note</button>'}</div>`}`;
    const s = $('#noteSearch', el);
    s.oninput = PD.debounce(() => { noteQuery = s.value; renderNotes(); const n = $('#noteSearch'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 200);
    $$('.note', el).forEach((n) => {
      n.onclick = (e) => { if (e.target.closest('input, a')) return; noteEditor(n.dataset.note); };
      n.onkeydown = (e) => { if (e.key === 'Enter') noteEditor(n.dataset.note); };
      $$('[data-chk]', n).forEach((cb) => (cb.onchange = () => { toggleCheck(N().list.find((x) => x.id === n.dataset.note), +cb.dataset.chk); }));
    });
    const first = $('#firstNote', el); if (first) first.onclick = () => noteEditor();
  }

  function noteEditor(id) {
    let note = N().list.find((x) => x.id === id);
    const isNew = !note;
    if (isNew) note = { id: PD.uid(), title: '', body: '', color: '', pinned: false, created: new Date().toISOString(), updated: new Date().toISOString() };
    PD.modal(isNew ? 'New note' : 'Note', `
      <div class="note-editor">
        <div class="row gap">
          <input class="note-title grow" id="nTitle" placeholder="Title" value="${esc(note.title)}" maxlength="80">
          <button type="button" class="icon-btn" id="nPin" aria-pressed="${note.pinned}" title="Pin">${note.pinned ? '📌' : '📍'}</button>
        </div>
        <div class="color-pick left"><button type="button" class="sw none${!note.color ? ' sel' : ''}" data-col="" aria-label="No colour">∅</button>${COLORS.map((x) => `<button type="button" class="sw ${x}${note.color === x ? ' sel' : ''}" data-col="${x}" aria-label="${x}"></button>`).join('')}</div>
        <div class="note-split">
          <textarea id="nBody" placeholder="Write anything…  Tips: # heading · - list · - [ ] checklist · **bold**" rows="14">${esc(note.body)}</textarea>
          <div class="note-preview" id="nPrev"></div>
        </div>
        <div class="row gap end"><button type="button" class="btn ghost danger" id="nDel">Delete</button><span class="muted small" id="nSaved"></span><span class="spacer"></span><button type="button" class="btn" id="nDone">Done</button></div>
      </div>`, (body, close) => {
      const t = $('#nTitle', body); const b = $('#nBody', body); const prev = $('#nPrev', body); const saved = $('#nSaved', body);
      let deleted = false;
      const save = () => {
        if (deleted) return;
        note.title = t.value.trim(); note.body = b.value; note.updated = new Date().toISOString();
        const list = N().list;
        if (!list.includes(note)) { if (!note.title && !note.body.trim()) return; list.push(note); }
        store.save('notes'); saved.textContent = 'Saved ✓';
      };
      const autosave = PD.debounce(save, 500);
      const preview = () => { prev.innerHTML = md(b.value, false) || '<span class="muted small">Preview</span>'; };
      t.oninput = () => { saved.textContent = '…'; autosave(); };
      b.oninput = () => { saved.textContent = '…'; preview(); autosave(); };
      preview();
      $$('.color-pick .sw', body).forEach((x) => (x.onclick = () => { note.color = x.dataset.col; $$('.color-pick .sw', body).forEach((y) => y.classList.toggle('sel', y === x)); save(); }));
      $('#nPin', body).onclick = (e) => { note.pinned = !note.pinned; e.currentTarget.textContent = note.pinned ? '📌' : '📍'; save(); };
      $('#nDel', body).onclick = () => { if (!confirm('Delete this note?')) return; deleted = true; N().list = N().list.filter((x) => x.id !== note.id); store.save('notes'); close(); };
      $('#nDone', body).onclick = () => { save(); close(); };
      $('#modal').addEventListener('close', () => { save(); if (PD.app.current() === 'board' && view === 'notes') renderNotes(); }, { once: true });
      if (isNew) t.focus();
    }, 'wide');
  }

  PD.board = { render, dueBetween, newNote: () => { view = 'notes'; location.hash = '#board'; setTimeout(() => noteEditor(), 150); } };
})(window.PD);
