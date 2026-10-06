/* Diet: calorie & macro log, food search (built-in + Open Food Facts), targets, history & charts. */
(function (PD) {
  const { esc, $, $$, fmt, store, todayKey, norm } = PD;

  const MEALS = [
    { id: 'breakfast', label: 'Breakfast', icon: '🥐' },
    { id: 'lunch', label: 'Lunch', icon: '🥗' },
    { id: 'dinner', label: 'Dinner', icon: '🍝' },
    { id: 'snack', label: 'Snacks', icon: '🍎' },
  ];
  const defaultMeal = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? 'breakfast' : h < 14.5 ? 'lunch' : h < 17.5 ? 'snack' : 'dinner'; };

  let day = todayKey();
  let range = 7;
  let picked = null;          // food currently being added
  let onlineResults = [];
  let historyAll = false;

  const D = () => store.get('diet');
  const entries = (k) => D().log[k] || [];
  const totals = (k) => entries(k).reduce((t, e) => ({ kcal: t.kcal + e.kcal, p: t.p + (e.p || 0), c: t.c + (e.c || 0), f: t.f + (e.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
  const r1 = (n) => Math.round(n * 10) / 10;

  /* ---------- food search ---------- */
  function localSearch(q) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const pool = [...D().myFoods.map((f) => ({ ...f, source: 'mine' })), ...PD.FOODS];
    return pool.map((f) => {
      const hay = norm(`${f.name} ${f.alias || ''} ${f.brand || ''}`);
      if (!words.every((w) => hay.includes(w))) return null;
      const score = (norm(f.name).startsWith(words[0]) ? 0 : 1) + (f.source === 'mine' ? -1 : 0);
      return { f, score };
    }).filter(Boolean).sort((a, b) => a.score - b.score).slice(0, 8).map((x) => x.f);
  }

  const offMap = (p) => {
    const n = p.nutriments || {};
    const kcal = n['energy-kcal_100g'] ?? (n.energy_100g ? n.energy_100g / 4.184 : null);
    if (kcal == null || !p.product_name) return null;
    const sq = Number(p.serving_quantity);
    return {
      id: `off-${p.code}`, name: p.product_name, brand: (p.brands || '').split(',')[0], source: 'off',
      kcal: r1(kcal), p: r1(n.proteins_100g || 0), c: r1(n.carbohydrates_100g || 0), f: r1(n.fat_100g || 0),
      portion: sq ? (p.serving_size || 'serving') : null, portionG: sq || null,
    };
  };

  async function onlineSearch(q) {
    const box = $('#onlineResults');
    box.innerHTML = '<p class="muted small">Searching Open Food Facts…</p>';
    try {
      const fields = 'code,product_name,brands,nutriments,serving_size,serving_quantity';
      if (/^\d{8,14}$/.test(q.trim())) {
        const j = await PD.fetchJSON(`https://world.openfoodfacts.org/api/v2/product/${q.trim()}.json?fields=${fields}`);
        onlineResults = j.product ? [offMap({ ...j.product, code: q.trim() })].filter(Boolean) : [];
      } else {
        const j = await PD.fetchJSON(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20&fields=${fields}&lc=nl`, {}, 20000);
        onlineResults = (j.products || []).map(offMap).filter(Boolean).slice(0, 12);
      }
      box.innerHTML = onlineResults.length ? resultList(onlineResults) : '<p class="muted small">No products found online. Try another word, or use Quick add.</p>';
      bindResults(box, onlineResults);
    } catch (e) {
      box.innerHTML = `<p class="muted small">Online search failed (${esc(e.message)}). Try again or use Quick add.</p>`;
    }
  }

  /** Barcode → product from Open Food Facts → straight into the amount picker. */
  async function lookupBarcode(code) {
    PD.toast(`Looking up ${code}…`);
    try {
      const fields = 'code,product_name,brands,nutriments,serving_size,serving_quantity';
      const j = await PD.fetchJSON(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
      const f = j.product && offMap({ ...j.product, code });
      if (f) { picked = f; renderAdd(); return; }
      throw new Error('not found');
    } catch (e) {
      const q = $('#foodQuery'); if (q) q.value = code;
      const box = $('#onlineResults');
      if (box) box.innerHTML = `<p class="muted small">${/not found|404/i.test(e.message) ? `Product ${esc(code)} isn't in Open Food Facts yet.` : `Lookup failed (${esc(e.message)}).`} Use <b>Quick add</b> with the values from the label.</p>`;
    }
  }

  const resultList = (list) => `<ul class="results">${list.map((f, i) => `
    <li><button data-i="${i}">
      <span><b>${esc(f.name)}</b>${f.brand ? ` <span class="muted small">${esc(f.brand)}</span>` : ''}
      ${f.source === 'mine' ? '<span class="pill violet small">mine</span>' : ''}${f.source === 'off' ? '<span class="pill sky small">online</span>' : ''}</span>
      <span class="muted small">${fmt.num(f.kcal)} kcal/100 g${f.portionG ? ` · ${esc(f.portion)} ${fmt.num(f.portionG)} g` : ''}</span>
    </button></li>`).join('')}</ul>`;

  function bindResults(root, list) {
    $$('button[data-i]', root).forEach((b) => (b.onclick = () => { picked = list[+b.dataset.i]; renderAdd(); }));
  }

  /* ---------- add panel ---------- */
  function renderAdd() {
    const el = $('#addPanel');
    const recent = D().recent.slice(0, 10);
    if (picked) {
      const f = picked;
      const usePortion = !!f.portionG;
      el.innerHTML = `
        <div class="card-head"><h2>Add food</h2><button class="btn sm ghost" id="backSearch">← Back</button></div>
        <div class="picked">
          <div><b>${esc(f.name)}</b>${f.brand ? `<span class="muted small"> · ${esc(f.brand)}</span>` : ''}
          <div class="muted small">per 100 g: ${fmt.num(f.kcal)} kcal · P ${fmt.num(f.p, 1)} · C ${fmt.num(f.c, 1)} · F ${fmt.num(f.f, 1)}</div></div>
        </div>
        <form id="amountForm" class="form">
          <div class="row gap wrap">
            <label class="grow">Amount<input type="number" name="qty" min="0" step="any" value="${usePortion ? 1 : 100}" required></label>
            <label class="grow">Unit<select name="unit">
              ${usePortion ? `<option value="portion">${esc(f.portion)} (${fmt.num(f.portionG)} g)</option>` : ''}
              <option value="g">gram / ml</option></select></label>
            <label class="grow">Meal<select name="meal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === defaultMeal() ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
          </div>
          <div class="preview" id="preview"></div>
          <button class="btn full" type="submit">Add to ${esc(PD.relDay(day).toLowerCase())}</button>
        </form>`;
      const form = $('#amountForm');
      const grams = () => Number(form.qty.value || 0) * (form.unit.value === 'portion' ? f.portionG : 1);
      const upd = () => {
        const g = grams();
        $('#preview').innerHTML = `<b>${fmt.num(f.kcal * g / 100)} kcal</b><span class="muted small">${fmt.num(g)} g · P ${fmt.num(f.p * g / 100, 1)} · C ${fmt.num(f.c * g / 100, 1)} · F ${fmt.num(f.f * g / 100, 1)}</span>`;
      };
      form.oninput = upd;
      form.unit.onchange = () => { form.qty.value = form.unit.value === 'portion' ? 1 : (f.portionG || 100); upd(); };
      upd();
      form.qty.focus(); form.qty.select();
      $('#backSearch').onclick = () => { picked = null; renderAdd(); };
      form.onsubmit = (e) => {
        e.preventDefault();
        const g = grams();
        if (!g) return;
        const qtyLabel = form.unit.value === 'portion' ? `${form.qty.value} × ${f.portion}` : `${fmt.num(g)} g`;
        addEntry({ meal: form.meal.value, name: f.name, amount: qtyLabel, grams: g, kcal: Math.round(f.kcal * g / 100), p: r1(f.p * g / 100), c: r1(f.c * g / 100), f: r1(f.f * g / 100) });
        rememberRecent(f);
        picked = null; renderAdd();
      };
      return;
    }

    el.innerHTML = `
      <div class="card-head"><h2>Add food</h2>
        <div class="segmented sm" role="tablist">
          <label><input type="radio" name="addMode" value="search" checked><span>Search</span></label>
          <label><input type="radio" name="addMode" value="quick"><span>Quick add</span></label>
        </div></div>
      <div id="modeSearch">
        <div class="search">
          <input id="foodQuery" type="search" placeholder="Search food or barcode — e.g. banaan, kipfilet, 5410…" autocomplete="off">
          <button type="button" class="btn scan-btn" id="scanBtn" title="Scan a barcode with your camera"><svg viewBox="0 0 24 24"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 8v8M10 8v8M13 8v8M17 8v8"/></svg><span>Scan</span></button>
        </div>
        <div id="localResults"></div>
        <div id="onlineResults"></div>
        ${recent.length ? `<h3 class="sub">Recent</h3><div class="chips wrap" id="recentChips">${recent.map((f, i) => `<button class="chip" data-r="${i}">${esc(f.name)}</button>`).join('')}</div>` : ''}
      </div>
      <form id="quickForm" class="form" hidden>
        <label>Description<input name="name" required maxlength="80" placeholder="e.g. Sandwich from the bakery"></label>
        <div class="row gap wrap">
          <label class="grow">kcal<input type="number" name="kcal" min="0" max="10000" required></label>
          <label class="grow">Protein g<input type="number" name="p" min="0" step="any"></label>
          <label class="grow">Carbs g<input type="number" name="c" min="0" step="any"></label>
          <label class="grow">Fat g<input type="number" name="f" min="0" step="any"></label>
        </div>
        <div class="row gap wrap">
          <label class="grow">Meal<select name="meal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === defaultMeal() ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
          <label class="toggle grow"><input type="checkbox" name="save"> Save to my foods (as 1 portion)</label>
        </div>
        <button class="btn full" type="submit">Add</button>
      </form>`;

    const q = $('#foodQuery');
    $('#scanBtn').onclick = () => PD.scanner.open(lookupBarcode);
    const doLocal = () => {
      const v = q.value.trim();
      const res = localSearch(v);
      const box = $('#localResults');
      $('#onlineResults').innerHTML = '';
      if (!v) { box.innerHTML = ''; return; }
      box.innerHTML = (res.length ? resultList(res) : '<p class="muted small">Not in your list.</p>')
        + `<button class="btn ghost sm full" id="goOnline">🔎 Search “${esc(v)}” on Open Food Facts</button>`;
      bindResults(box, res);
      $('#goOnline').onclick = () => onlineSearch(v);
    };
    q.oninput = PD.debounce(doLocal, 150);
    q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); onlineSearch(q.value); } };
    $$('#recentChips .chip').forEach((c) => (c.onclick = () => { picked = recent[+c.dataset.r]; renderAdd(); }));

    $$('input[name=addMode]', el).forEach((r) => (r.onchange = () => {
      $('#modeSearch').hidden = r.value !== 'search'; $('#quickForm').hidden = r.value !== 'quick';
    }));
    const qf = $('#quickForm');
    qf.onsubmit = (e) => {
      e.preventDefault();
      const n = (v) => Number(v || 0);
      const item = { meal: qf.meal.value, name: qf.name.value.trim(), amount: '1 portion', grams: null, kcal: Math.round(n(qf.kcal.value)), p: n(qf.p.value), c: n(qf.c.value), f: n(qf.f.value) };
      addEntry(item);
      if (qf.save.checked) {
        // store per-100 g values for a 100 g "portion" so the food behaves like any other
        D().myFoods.unshift({ id: PD.uid(), name: item.name, kcal: item.kcal, p: item.p, c: item.c, f: item.f, portion: 'portion', portionG: 100 });
        store.save('diet');
      }
      qf.reset(); qf.meal.value = defaultMeal();
    };
  }

  function rememberRecent(f) {
    const d = D();
    d.recent = [f, ...d.recent.filter((x) => x.name !== f.name)].slice(0, 12);
    store.save('diet');
  }

  function addEntry(item) {
    const d = D();
    (d.log[day] = d.log[day] || []).push({ id: PD.uid(), ...item });
    store.save('diet');
    PD.toast(`Added ${item.name} · ${item.kcal} kcal`);
    renderLive();
  }

  /* ---------- summary & meals ---------- */
  function renderSummary() {
    const el = $('#summary');
    const t = D().targets; const tot = totals(day);
    const left = t.kcal - tot.kcal;
    const burned = store.get('workouts').log.filter((l) => l.date === day).reduce((sum, l) => sum + l.kcal, 0);
    const macro = (label, v, target, cls) => `
      <div class="macro">
        <div class="macro-head"><span>${label}</span><span class="muted small"><b>${fmt.num(v)}</b> / ${fmt.num(target)} g</span></div>
        <span class="bar-track ${cls}"><i style="width:${Math.min(100, target ? (v / target) * 100 : 0)}%"></i></span>
      </div>`;
    el.innerHTML = `
      <div class="summary">
        ${PD.ring(tot.kcal, t.kcal, { size: 168, stroke: 16, label: fmt.num(tot.kcal), sub: `of ${fmt.num(t.kcal)} kcal` })}
        <div class="summary-side">
          <p class="remaining ${left < 0 ? 'over' : ''}"><b data-count="${Math.abs(left)}">0</b> kcal ${left < 0 ? 'over target' : 'remaining'}</p>
          ${burned ? `<p class="burned">🔥 <b>${fmt.num(burned)}</b> kcal burned in home workouts${day === todayKey() ? ' today' : ''} <a href="#workout" class="small">details</a></p>` : ''}
          ${macro('Protein', tot.p, t.protein, 'violet')}
          ${macro('Carbs', tot.c, t.carbs, 'peach')}
          ${macro('Fat', tot.f, t.fat, 'sky')}
          <div class="water-row">
            <span>💧 Water</span>
            <button class="btn sm ghost" data-w="-1" aria-label="Remove glass">−</button>
            <b>${D().water[day] || 0} / ${t.water}</b>
            <button class="btn sm ghost" data-w="1" aria-label="Add glass">+</button>
          </div>
        </div>
      </div>`;
    $$('[data-w]', el).forEach((b) => (b.onclick = () => {
      const d = D(); d.water[day] = Math.max(0, (d.water[day] || 0) + Number(b.dataset.w)); store.save('diet'); renderSummary();
    }));
    PD.fx.countUp(el);
  }

  function renderMeals() {
    const el = $('#meals');
    const list = entries(day);
    const yesterday = entries(PD.shiftKey(day, -1));
    el.innerHTML = `
      <div class="card-head"><h2>Meals</h2><span class="muted small">${list.length} item${list.length === 1 ? '' : 's'}</span></div>
      ${MEALS.map((m) => {
        const items = list.filter((e) => e.meal === m.id);
        const kcal = items.reduce((s, e) => s + e.kcal, 0);
        const yItems = yesterday.filter((e) => e.meal === m.id);
        return `<div class="meal">
          <div class="meal-head"><span>${m.icon} <b>${m.label}</b></span><span class="muted">${kcal ? `${fmt.num(kcal)} kcal` : ''}</span></div>
          ${items.length ? `<ul class="entries">${items.map((e) => `
            <li><span class="grow"><span>${esc(e.name)}</span><span class="muted small">${esc(e.amount || '')}${e.p || e.c || e.f ? ` · P ${fmt.num(e.p)} · C ${fmt.num(e.c)} · F ${fmt.num(e.f)}` : ''}</span></span>
              <b>${fmt.num(e.kcal)}</b>
              <button class="icon-btn sm ghost" data-del="${e.id}" aria-label="Remove ${esc(e.name)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`).join('')}</ul>`
            : `<p class="muted small meal-empty">Nothing logged${yItems.length ? ` · <button class="link" data-copy="${m.id}">copy from yesterday (${fmt.num(yItems.reduce((s, e) => s + e.kcal, 0))} kcal)</button>` : ''}</p>`}
        </div>`;
      }).join('')}`;
    $$('[data-del]', el).forEach((b) => (b.onclick = () => {
      const d = D(); d.log[day] = entries(day).filter((e) => e.id !== b.dataset.del);
      if (!d.log[day].length) delete d.log[day];
      store.save('diet'); renderLive();
    }));
    $$('[data-copy]', el).forEach((b) => (b.onclick = () => {
      const d = D();
      const copy = yesterday.filter((e) => e.meal === b.dataset.copy).map((e) => ({ ...e, id: PD.uid() }));
      d.log[day] = [...entries(day), ...copy];
      store.save('diet'); renderLive();
    }));
  }

  /* ---------- chart & stats ---------- */
  function renderTrend() {
    const t = D().targets;
    // window ends today, unless the selected day is older than the window — then centre it on that day
    const inWindow = day >= PD.shiftKey(todayKey(), -range + 1);
    const end = inWindow ? todayKey() : [PD.shiftKey(day, Math.floor(range / 2)), todayKey()].sort()[0];
    const days = PD.lastNDays(range, end);
    const bars = days.map((k) => {
      const tot = totals(k); const n = entries(k).length;
      const diff = tot.kcal - t.kcal;
      return {
        label: range <= 7 ? fmt.weekday(PD.parseKey(k)) : String(PD.parseKey(k).getDate()), value: tot.kcal, highlight: k === day,
        tip: `<b>${esc(fmt.short(PD.parseKey(k)))}</b><br>${n ? `${fmt.num(tot.kcal)} kcal · ${diff > 0 ? `${fmt.num(diff)} over` : `${fmt.num(-diff)} under`} target<br>P ${fmt.num(tot.p)} · C ${fmt.num(tot.c)} · F ${fmt.num(tot.f)} g` : 'Nothing logged'}`,
      };
    });
    $('#trendTitle').textContent = `Last ${range} days`;
    PD.charts.bar($('#trendChart'), bars, {
      target: t.kcal, targetLabel: 'Target', label: `Calories per day, last ${range} days`, height: 230,
      onClick: (i) => { day = days[i]; renderAll(); },
    });

    const logged = days.filter((k) => entries(k).length);
    const avg = logged.length ? logged.reduce((s, k) => s + totals(k).kcal, 0) / logged.length : 0;
    const avgP = logged.length ? logged.reduce((s, k) => s + totals(k).p, 0) / logged.length : 0;
    const under = logged.filter((k) => totals(k).kcal <= t.kcal).length;
    // consecutive logged days ending today (or yesterday, if today isn't logged yet)
    let streak = 0;
    for (let k = entries(todayKey()).length ? todayKey() : PD.shiftKey(todayKey(), -1); entries(k).length; k = PD.shiftKey(k, -1)) streak++;
    $('#trendStats').innerHTML = `
      <div class="stat"><span>Average</span><b>${logged.length ? fmt.num(avg) : '—'}</b><small class="muted">kcal / logged day</small></div>
      <div class="stat"><span>At or under target</span><b>${under} / ${logged.length}</b><small class="muted">logged days</small></div>
      <div class="stat"><span>Avg protein</span><b>${logged.length ? `${fmt.num(avgP)} g` : '—'}</b><small class="muted">target ${t.protein} g</small></div>
      <div class="stat"><span>Logging streak</span><b>${streak} 🔥</b><small class="muted">day${streak === 1 ? '' : 's'} in a row</small></div>`;
  }

  function renderHistory() {
    const el = $('#history');
    const t = D().targets;
    const keys = Object.keys(D().log).filter((k) => entries(k).length).sort().reverse();
    const shown = historyAll ? keys : keys.slice(0, 14);
    el.innerHTML = `
      <div class="card-head"><h2>History</h2><span class="muted small">${keys.length} logged day${keys.length === 1 ? '' : 's'}</span>
        <button class="btn sm ghost" id="exportCsv" ${keys.length ? '' : 'disabled'}>Export CSV</button></div>
      ${keys.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Date</th><th class="num">kcal</th><th class="num">vs target</th><th class="num">Protein</th><th class="num">Carbs</th><th class="num">Fat</th><th class="num">Items</th></tr></thead>
        <tbody>${shown.map((k) => {
          const tot = totals(k); const diff = tot.kcal - t.kcal;
          return `<tr data-k="${k}" class="${k === day ? 'sel' : ''}" tabindex="0">
            <td>${esc(fmt.short(PD.parseKey(k)))}</td><td class="num"><b>${fmt.num(tot.kcal)}</b></td>
            <td class="num"><span class="pill small ${diff > 0 ? 'peach' : 'mint'}">${diff > 0 ? '▲ +' : '▼ −'}${fmt.num(Math.abs(diff))}</span></td>
            <td class="num">${fmt.num(tot.p)} g</td><td class="num">${fmt.num(tot.c)} g</td><td class="num">${fmt.num(tot.f)} g</td><td class="num">${entries(k).length}</td></tr>`;
        }).join('')}</tbody></table></div>
        ${keys.length > 14 ? `<button class="btn ghost full" id="histMore">${historyAll ? 'Show less' : `Show all ${keys.length} days`}</button>` : ''}`
        : '<p class="empty">Your logged days will appear here.</p>'}`;
    $$('tr[data-k]', el).forEach((r) => {
      const go = () => { day = r.dataset.k; renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      r.onclick = go; r.onkeydown = (e) => { if (e.key === 'Enter') go(); };
    });
    const more = $('#histMore'); if (more) more.onclick = () => { historyAll = !historyAll; renderHistory(); };
    $('#exportCsv').onclick = () => {
      const rows = [['date', 'meal', 'food', 'amount', 'kcal', 'protein_g', 'carbs_g', 'fat_g']];
      keys.slice().reverse().forEach((k) => entries(k).forEach((e) => rows.push([k, e.meal, e.name, e.amount || '', e.kcal, e.p, e.c, e.f])));
      PD.download(`food-log-${todayKey()}.csv`, rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
    };
  }

  /* ---------- targets & my foods ---------- */
  function targetsModal() {
    const d = D(); const t = d.targets; const p = d.profile;
    PD.modal('Targets', `
      <form id="tForm" class="form">
        <div class="row gap wrap">
          <label class="grow">Calories (kcal)<input type="number" name="kcal" min="800" max="8000" value="${t.kcal}" required></label>
          <label class="grow">Water (glasses)<input type="number" name="water" min="1" max="30" value="${t.water}"></label>
        </div>
        <div class="row gap wrap">
          <label class="grow">Protein (g)<input type="number" name="protein" min="0" value="${t.protein}"></label>
          <label class="grow">Carbs (g)<input type="number" name="carbs" min="0" value="${t.carbs}"></label>
          <label class="grow">Fat (g)<input type="number" name="fat" min="0" value="${t.fat}"></label>
        </div>
        <p class="muted small" id="macroCheck"></p>
        <details class="calc" ${t.kcal === 2000 ? 'open' : ''}>
          <summary>Not sure? Calculate a target for me</summary>
          <div class="row gap wrap">
            <label class="grow">Sex<select name="sex"><option value="m" ${p.sex === 'm' ? 'selected' : ''}>Male</option><option value="f" ${p.sex === 'f' ? 'selected' : ''}>Female</option></select></label>
            <label class="grow">Age<input type="number" name="age" min="14" max="100" value="${p.age}"></label>
            <label class="grow">Height (cm)<input type="number" name="height" min="120" max="230" value="${p.height}"></label>
            <label class="grow">Weight (kg)<input type="number" name="weight" min="35" max="300" step="0.1" value="${p.weight}"></label>
          </div>
          <div class="row gap wrap">
            <label class="grow">Activity<select name="activity">
              ${[[1.2, 'Sedentary (desk job, little exercise)'], [1.375, 'Light (1–3 workouts/week)'], [1.55, 'Moderate (3–5 workouts/week)'], [1.725, 'Very active (6–7/week)'], [1.9, 'Athlete / physical job']].map(([v, l]) => `<option value="${v}" ${Number(p.activity) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="grow">Goal<select name="goal">
              ${[[-750, 'Lose ~0.75 kg/week'], [-500, 'Lose ~0.5 kg/week'], [-250, 'Lose slowly'], [0, 'Maintain'], [250, 'Gain slowly (lean bulk)']].map(([v, l]) => `<option value="${v}" ${Number(p.goal) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          </div>
          <div class="calc-out" id="calcOut"></div>
          <button type="button" class="btn ghost full" id="applyCalc">Use these numbers</button>
        </details>
        <div class="row gap end"><button type="button" class="btn ghost" data-cancel>Cancel</button><button class="btn" type="submit">Save targets</button></div>
      </form>`, (body, close) => {
      const f = $('#tForm', body);
      const check = () => {
        const fromMacros = f.protein.value * 4 + f.carbs.value * 4 + f.fat.value * 9;
        $('#macroCheck').textContent = `Macros add up to ${fmt.num(fromMacros)} kcal (${fmt.num(fromMacros - f.kcal.value)} vs calorie target).`;
      };
      let calc = null;
      const compute = () => {
        const w = +f.weight.value; const bmr = 10 * w + 6.25 * f.height.value - 5 * f.age.value + (f.sex.value === 'm' ? 5 : -161);
        const tdee = bmr * f.activity.value; const kcal = Math.round((tdee + Number(f.goal.value)) / 10) * 10;
        const protein = Math.round(w * (Number(f.goal.value) < 0 ? 2 : 1.8)); const fat = Math.round((kcal * 0.27) / 9);
        const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
        calc = { kcal, protein, fat, carbs };
        $('#calcOut').innerHTML = `<div><span class="muted small">BMR</span><b>${fmt.num(bmr)}</b></div><div><span class="muted small">Maintenance</span><b>${fmt.num(tdee)}</b></div>
          <div><span class="muted small">Target</span><b>${fmt.num(kcal)} kcal</b></div><div><span class="muted small">P / C / F</span><b>${protein} / ${carbs} / ${fat} g</b></div>`;
      };
      f.oninput = () => { check(); compute(); }; check(); compute();
      $('#applyCalc').onclick = () => { Object.entries(calc).forEach(([k, v]) => (f[k].value = v)); check(); };
      $('[data-cancel]', body).onclick = close;
      f.onsubmit = (e) => {
        e.preventDefault();
        Object.assign(d.targets, { kcal: +f.kcal.value, protein: +f.protein.value, carbs: +f.carbs.value, fat: +f.fat.value, water: +f.water.value || 8 });
        Object.assign(d.profile, { sex: f.sex.value, age: +f.age.value, height: +f.height.value, weight: +f.weight.value, activity: +f.activity.value, goal: +f.goal.value });
        store.save('diet'); close(); renderAll(); PD.toast('Targets saved');
      };
    });
  }

  function myFoodsModal() {
    const draw = (body) => {
      const foods = D().myFoods;
      body.innerHTML = `
        <p class="muted small">Foods you eat often. Values per 100 g (or 100 ml). Optionally define a portion like “bowl = 250 g”.</p>
        <form id="mfForm" class="form">
          <label>Name<input name="name" required maxlength="80" placeholder="e.g. Mum's lasagne"></label>
          <div class="row gap wrap">
            <label class="grow">kcal / 100 g<input type="number" name="kcal" min="0" step="any" required></label>
            <label class="grow">Protein<input type="number" name="p" min="0" step="any"></label>
            <label class="grow">Carbs<input type="number" name="c" min="0" step="any"></label>
            <label class="grow">Fat<input type="number" name="f" min="0" step="any"></label>
          </div>
          <div class="row gap wrap">
            <label class="grow">Portion name<input name="portion" placeholder="e.g. plate"></label>
            <label class="grow">Portion grams<input type="number" name="portionG" min="0" step="any"></label>
          </div>
          <button class="btn" type="submit">Add food</button>
        </form>
        ${foods.length ? `<ul class="entries my-foods">${foods.map((f) => `<li><span class="grow"><b>${esc(f.name)}</b><span class="muted small">${fmt.num(f.kcal)} kcal · P ${fmt.num(f.p, 1)} · C ${fmt.num(f.c, 1)} · F ${fmt.num(f.f, 1)}${f.portionG ? ` · ${esc(f.portion)} ${fmt.num(f.portionG)} g` : ''}</span></span>
          <button class="icon-btn sm ghost" data-del="${f.id}" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`).join('')}</ul>` : '<p class="empty">No custom foods yet.</p>'}`;
      const f = $('#mfForm', body);
      f.onsubmit = (e) => {
        e.preventDefault();
        foods.unshift({ id: PD.uid(), name: f.name.value.trim(), kcal: +f.kcal.value, p: +f.p.value || 0, c: +f.c.value || 0, f: +f.f.value || 0, portion: f.portion.value.trim() || (f.portionG.value ? 'portion' : null), portionG: +f.portionG.value || null });
        store.save('diet'); draw(body);
      };
      $$('[data-del]', body).forEach((b) => (b.onclick = () => { D().myFoods = foods.filter((x) => x.id !== b.dataset.del); store.save('diet'); draw(body); }));
    };
    PD.modal('My foods', '', (body) => draw(body));
  }

  /* ---------- page ---------- */
  function renderLive() { renderSummary(); renderMeals(); renderTrend(); renderHistory(); }

  function renderAll() {
    const page = $('#page-diet');
    const d = PD.parseKey(day);
    page.innerHTML = `
      <div class="page-head">
        <div><h1>Diet</h1><p class="muted">Log what you eat — calories and macros add up automatically.</p></div>
        <div class="row gap">
          <button class="btn ghost" id="myFoods">My foods</button>
          <button class="btn ghost" id="targets">🎯 Targets</button>
        </div>
      </div>
      <div class="date-nav card">
        <button class="icon-btn" id="dPrev" aria-label="Previous day"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
        <label class="date-label"><b>${esc(PD.relDay(day))}</b><span class="muted small">${esc(fmt.date(d))}</span>
          <input type="date" id="dPick" value="${day}" max="${todayKey()}" aria-label="Pick a date"></label>
        <button class="icon-btn" id="dNext" aria-label="Next day" ${day >= todayKey() ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
        ${day !== todayKey() ? '<button class="btn sm ghost" id="dToday">Back to today</button>' : ''}
      </div>
      <div class="diet-grid">
        <div class="card" id="summary"></div>
        <div class="card" id="addPanel"></div>
        <div class="card" id="meals"></div>
        <div class="card" id="fastCard"></div>
        <div class="card trend wide">
          <div class="card-head"><h2 id="trendTitle"></h2>
            <div class="segmented sm">${[7, 14, 30].map((n) => `<label><input type="radio" name="range" value="${n}" ${n === range ? 'checked' : ''}><span>${n}d</span></label>`).join('')}</div></div>
          <div class="chart-box" id="trendChart"></div>
          <div class="stat-row" id="trendStats"></div>
        </div>
        <div class="card wide" id="history"></div>
      </div>`;
    $('#dPrev').onclick = () => { day = PD.shiftKey(day, -1); renderAll(); };
    $('#dNext').onclick = () => { if (day < todayKey()) { day = PD.shiftKey(day, 1); renderAll(); } };
    $('#dPick').onchange = (e) => { if (e.target.value) { day = e.target.value; renderAll(); } };
    const tdy = $('#dToday'); if (tdy) tdy.onclick = () => { day = todayKey(); renderAll(); };
    $('#targets').onclick = targetsModal;
    $('#myFoods').onclick = myFoodsModal;
    $$('input[name=range]').forEach((r) => (r.onchange = () => { range = +r.value; renderTrend(); }));
    renderAdd(); renderLive(); PD.fasting.card($('#fastCard'));
  }

  PD.diet = { render: renderAll };
})(window.PD);
