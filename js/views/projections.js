/* Projections tab: overview panel (see overview.js), per-bank account cards, upcoming credits. */
(function () {
  const FT = window.FT;
  const P = FT.proj;
  const esc = FT.escapeHtml;
  const S = () => FT.state;
  const $ = (id) => document.getElementById(id);

  let root, banksRoot, modal, modalBody; // the toast may be parked inside `modal`, so content lives in `modalBody`
  let openBankId = null; // the bank whose window is open
  let dragId = null;
  let dragBankId = null; // a whole bank being dragged to a new position

  const bankOf = (acc) => S().banks.find((b) => b.id === acc.bankId) || S().banks[0];
  const accountsOf = (bank) => S().accounts.filter((a) => a.bankId === bank.id);
  const H = () => S().settings.horizon;
  const gainClass = (v) => (v >= 0 ? 'good' : 'bad');

  // ---------- skeleton ----------
  const SKELETON = `
    <div class="panel overview" id="overviewRoot"></div>

    <div id="banksRoot"></div>

    <div class="panel">
      <div class="panel-head">
        <div><h2>Upcoming interest &amp; returns</h2><p class="sub">What your savings and investments are expected to pay out, month by month. Pick a month to see where it comes from.</p></div>
        <button class="icon-btn collapse-btn" type="button" aria-expanded="true" aria-controls="creditsContent" aria-label="Collapse upcoming credits"><span aria-hidden="true"></span></button>
      </div>
      <div class="collapsible-content" id="creditsContent">
        <div class="credit-kpis" id="creditKpis"></div>
        <div id="creditsBody" aria-live="polite"></div>
      </div>
    </div>
    `;

  // ---------- bank tiles, bank window, account cards ----------
  function numField(acc, field, text, step) {
    return `<label class="fld"><span>${text}</span><input type="number" step="${step || 0.01}" data-field="${field}" value="${acc[field]}"></label>`;
  }
  function cardHTML(acc) {
    const t = acc.type;
    const opts = (map, sel) => Object.entries(map).map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${l}</option>`).join('');
    const bankOpts = S().banks.map((b) => `<option value="${b.id}" ${b.id === acc.bankId ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
    return `<article class="acc-card" data-acc="${acc.id}">
      <header class="acc-head">
        <span class="drag-handle" draggable="true" title="Drag to reorder">⠿</span>
        <button type="button" class="badge-btn" data-pick-icon title="Change icon and colour" aria-label="Change icon and colour">${FT.accountBadge(acc, 32)}</button>
        <input class="acc-name" type="text" data-field="name" value="${esc(acc.name)}" placeholder="Account name" aria-label="Account name">
        <select data-field="type" aria-label="Account type">${opts(FT.TYPE_LABELS, t)}</select>
        <button class="rm-btn" data-remove title="Remove account" aria-label="Remove account">✕</button>
      </header>
      <div class="fld-grid">
        <label class="fld"><span>Bank / app</span><select data-field="bankId">${bankOpts}</select></label>
        ${numField(acc, 'balance', t === 'investment' ? 'Current value (€)' : 'Balance (€)')}
        ${t === 'investment' ? numField(acc, 'invested', 'Invested (€)') : ''}
        <label class="fld"><span>As of</span><input type="date" data-field="asOfDate" value="${acc.asOfDate}"></label>
        ${numField(acc, 'monthly', 'Add / month (€)')}
        ${t !== 'checking' ? numField(acc, 'rate', t === 'investment' ? 'Expected return (%/yr)' : 'Interest (%/yr)', 0.1) + numField(acc, 'tax', 'Tax (%)', 0.1)
          + `<label class="fld"><span title="How often interest/return is actually credited">Cadence</span><select data-field="cadence">${opts(FT.CADENCE_LABELS, acc.cadence)}</select></label>` : ''}
      </div>
      <footer class="acc-foot">
        <div><span class="l" data-sel-label>At horizon</span><span class="v" data-r="proj">—</span></div>
        <div><span class="l">Gain / loss</span><span class="v" data-r="gain">—</span></div>
        ${t !== 'checking' ? '<div><span class="l">Daily gain</span><span class="v" data-r="daily">—</span></div>' : ''}
      </footer>
    </article>`;
  }
  const figuresHTML = `<div class="bank-figures">
          <div><span class="l">Now</span><span class="v" data-b="now">—</span></div>
          <div><span class="l" data-sel-label>At horizon</span><span class="v" data-b="proj">—</span></div>
          <div><span class="l">Gain</span><span class="v" data-b="gain">—</span></div>
        </div>`;

  // A compact tile per bank. Click it (or the arrow) to open the details window.
  function tileHTML(bank) {
    return `<section class="panel bank collapsed" data-bank="${bank.id}">
      <div class="bank-head">
        <span class="drag-handle bank-handle" draggable="true" title="Drag to reorder banks">⠿</span>
        ${FT.bankIcon(bank, 46)}
        <div class="bank-title"><h2>${esc(bank.name)}</h2><span class="bank-meta" data-b="meta"></span></div>
        ${figuresHTML}
        <button class="icon-btn collapse-btn" type="button" data-open-bank aria-haspopup="dialog" aria-expanded="false" aria-label="Open ${esc(bank.name)} accounts"><span aria-hidden="true"></span></button>
      </div>
    </section>`;
  }
  function renderBanks() {
    banksRoot.innerHTML = S().banks.map(tileHTML).join('') +
      '<div class="add-bank-row"><button class="ghost" id="addBankBtn">+ Add bank / app</button></div>';
  }

  // The overlapping window with one bank's accounts and actions.
  function modalHTML(bank) {
    const accs = accountsOf(bank);
    return `<div class="bm" data-bank="${bank.id}">
      <header class="bm-head">
        <button type="button" class="badge-btn" data-pick-bank title="Change icon and colour" aria-label="Change icon and colour for ${esc(bank.name)}">${FT.bankIcon(bank, 46)}</button>
        <div class="bank-title"><h2>${esc(bank.name)}</h2><span class="bank-meta" data-b="meta"></span></div>
        ${figuresHTML}
        <button class="icon-btn" type="button" data-close aria-label="Close">✕</button>
      </header>
      <div class="bm-body">
        ${accs.length ? `<div class="acc-list">${accs.map(cardHTML).join('')}</div>` : '<div class="empty-row-note">No accounts here yet.</div>'}
        <div class="bank-actions">
          <button class="ghost small" data-add-acc>+ Add account</button>
          <button class="ghost small" data-logo title="Upload an image to use as this bank's icon">Change logo</button>
          ${bank.logo ? '<button class="ghost small" data-logo-clear>Remove logo</button>' : ''}
          ${accs.length === 0 ? '<button class="ghost small danger" data-del-bank>Remove bank</button>' : ''}
          <span class="bank-move-group"><button class="ghost small" data-bank-move="-1" aria-label="Move ${esc(bank.name)} earlier">← Earlier</button><button class="ghost small" data-bank-move="1" aria-label="Move ${esc(bank.name)} later">Later →</button></span>
        </div>
      </div>
    </div>`;
  }
  function renderModal() {
    if (!openBankId) return;
    const bank = S().banks.find((b) => b.id === openBankId);
    if (!bank) { if (modal.open) modal.close(); return; }
    modalBody.innerHTML = modalHTML(bank);
  }
  function openBank(id) {
    openBankId = id;
    renderModal();
    if (!modal.open) modal.showModal();
    updateBankReadouts();
  }

  // ---------- live readouts (no DOM rebuild, so inputs keep focus) ----------
  const areas = () => [banksRoot, modal];
  const qa = (sel) => areas().flatMap((a) => [...a.querySelectorAll(sel)]);
  function updateBankReadouts() {
    const T = FT.overview.selected();
    const when = T === 0 ? 'Today' : `In ${FT.overview.selectedLabel()}`;
    qa('[data-sel-label]').forEach((el) => { el.textContent = when; });
    S().banks.forEach((bank) => {
      const accs = accountsOf(bank);
      const now = P.sum(accs, (a) => P.value(a, 0)), proj = P.sum(accs, (a) => P.value(a, T)), gain = P.sum(accs, (a) => P.gain(a, T));
      qa(`[data-bank="${bank.id}"]`).forEach((sec) => {
        const set = (k, txt, cls) => { const el = sec.querySelector(`[data-b="${k}"]`); if (!el) return; el.textContent = txt; if (cls !== undefined) el.className = 'v ' + cls; };
        set('now', FT.fmtEUR(now));
        set('proj', FT.fmtEUR(proj));
        set('gain', accs.length ? FT.fmtSigned(gain) : '—', accs.length ? gainClass(gain) : '');
        set('meta', `${accs.length} account${accs.length === 1 ? '' : 's'}`);
      });
    });
    S().accounts.forEach((acc) => {
      const g = P.gain(acc, T);
      qa(`[data-acc="${acc.id}"]`).forEach((card) => {
        const set = (k, txt, cls) => { const el = card.querySelector(`[data-r="${k}"]`); if (el) { el.textContent = txt; if (cls) el.className = 'v ' + cls; } };
        set('proj', FT.fmtEUR(P.value(acc, T)));
        set('gain', FT.fmtSigned(g), gainClass(g));
        set('daily', acc.rate > 0 ? FT.fmtEUR2(P.dailyGain(acc)) : '—');
      });
    });
  }

  // ---------- credits ----------
  // A strip of monthly bars (stacked by bank) from this month to the horizon, a few headline
  // numbers, and a breakdown of whichever month is selected.
  function renderCredits() {
    const T = H(), base = P.start.slice(0, 7);
    const events = P.creditEvents(S().accounts, T);
    const kpis = $('creditKpis'), body = $('creditsBody');
    if (!events.length) {
      kpis.innerHTML = '';
      body.innerHTML = '<div class="credit-empty">No interest or return credits fall in this window. Add an interest rate to a savings or investment account to see them here.</div>';
      body.dataset.selectedMonth = '';
      return;
    }
    const byMonth = new Map();
    events.forEach((ev) => {
      const key = FT.dateStrOf(ev.date).slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, { sum: 0, events: [], banks: {} });
      const g = byMonth.get(key);
      g.sum += ev.amount;
      g.events.push(ev);
      g.banks[ev.acc.bankId] = (g.banks[ev.acc.bankId] || 0) + ev.amount;
    });
    const keys = Array.from({ length: T + 1 }, (_, i) => FT.addMonthsKey(base, i));
    const totalAll = events.reduce((s, e) => s + e.amount, 0);
    const max = Math.max(...Array.from(byMonth.values(), (g) => g.sum));
    const first = events[0], firstKey = FT.dateStrOf(first.date).slice(0, 7);
    const prev = body.dataset.selectedMonth || '';
    const selected = keys.includes(prev) ? prev : firstKey;
    body.dataset.selectedMonth = selected;

    kpis.innerHTML = `
      <div class="ckpi"><span class="l">Expected in ${FT.horizonLabel(T)}</span><span class="kv">${FT.fmtEUR2(totalAll)}</span></div>
      <div class="ckpi"><span class="l">Average per month</span><span class="kv">${FT.fmtEUR2(totalAll / T)}</span></div>
      <div class="ckpi"><span class="l">Next credit</span><span class="kv">${FT.fmtEUR2(first.amount)}</span><span class="ks">${esc(first.acc.name || 'Unnamed account')} · ${FT.monthLabel(firstKey, true)}</span></div>`;

    const usedBanks = S().banks.filter((b) => events.some((e) => e.acc.bankId === b.id));
    // Breakdown for the selected month: only banks and accounts that actually pay something that month.
    const detail = (key) => {
      const g = byMonth.get(key), paid = {};
      (g ? g.events : []).forEach((ev) => { paid[ev.acc.id] = (paid[ev.acc.id] || 0) + ev.amount; });
      const groups = S().banks.map((b) => {
        const rows = accountsOf(b).map((a) => ({ a, v: paid[a.id] || 0 })).filter((r) => r.v > 0).sort((p, q) => q.v - p.v);
        return { bank: b, rows, sum: rows.reduce((t, r) => t + r.v, 0) };
      }).filter((x) => x.rows.length);
      return `<div class="credit-month-details-head"><span class="credit-month-details-title">${FT.monthLabel(key, true)}</span><span class="credit-month-details-total">${FT.fmtEUR2(g ? g.sum : 0)}</span></div>
        ${groups.length ? groups.map((x) => `<div class="cb-group">
          <div class="cb-head">${FT.bankIcon(x.bank, 24)}<span class="cb-name">${esc(x.bank.name)}</span><span class="cb-total">${FT.fmtEUR2(x.sum)}</span></div>
          <div class="credit-contributors">${x.rows.map((r) => `<div class="credit-contributor">
            <div class="credit-contributor-account">${FT.accountBadge(r.a, 26)}<div>
              <div class="credit-contributor-name">${esc(r.a.name || 'Unnamed account')}</div>
              <div class="credit-contributor-meta">${FT.CADENCE_LABELS[r.a.cadence]} · ${r.a.rate}%/yr</div></div></div>
            <div class="credit-contributor-amount">${FT.fmtEUR2(r.v)}</div></div>`).join('')}</div></div>`).join('') : '<div class="credit-empty">No account pays interest or returns this month.</div>'}`;
    };
    body.innerHTML = `
      <div class="cm-strip" role="group" aria-label="Expected credits per month">${keys.map((key) => {
        const g = byMonth.get(key);
        if (!g) return `<button type="button" class="cm-col empty" data-month="${key}" aria-pressed="${key === selected}" title="${FT.monthLabel(key, true)}: no credits"><span class="cm-amt">·</span><span class="cm-bar"></span><span class="cm-label">${FT.monthLabel(key)}</span></button>`;
        const segs = usedBanks.filter((b) => g.banks[b.id]).map((b) => `<i style="height:${(g.banks[b.id] / max) * 100}%;background:${FT.bankAccent(b)}"></i>`).join('');
        return `<button type="button" class="cm-col" data-month="${key}" aria-pressed="${key === selected}" title="${FT.monthLabel(key, true)}: ${FT.fmtEUR2(g.sum)}">
          <span class="cm-amt">${FT.fmtEUR(g.sum)}</span><span class="cm-bar">${segs}</span><span class="cm-label">${FT.monthLabel(key)}</span></button>`;
      }).join('')}</div>
      <div class="cm-legend">${usedBanks.map((b) => `<span><i style="background:${FT.bankAccent(b)}"></i>${esc(b.name)}</span>`).join('')}</div>
      <section class="credit-month-details" aria-live="polite">${detail(selected)}</section>`;
    body.querySelectorAll('.cm-col[data-month]').forEach((btn) => btn.addEventListener('click', () => {
      body.dataset.selectedMonth = btn.dataset.month;
      body.querySelectorAll('.cm-col[data-month]').forEach((t) => t.setAttribute('aria-pressed', String(t === btn)));
      body.querySelector('.credit-month-details').innerHTML = detail(btn.dataset.month);
    }));
  }

  // ---------- orchestration ----------
  // The overview calls back into updateBankReadouts whenever its selected month changes.
  function commit(rebuild) {
    if (rebuild) { renderBanks(); renderModal(); }
    FT.overview.render();
    updateBankReadouts();
    renderCredits();
    FT.save();
  }
  function render() {
    if (modal.open) modal.close();
    renderBanks();
    FT.overview.render(true);
    updateBankReadouts();
    renderCredits();
  }

  // ---------- events ----------
  function accFromEl(el) {
    const card = el.closest('[data-acc]');
    return card ? S().accounts.find((a) => a.id === card.dataset.acc) : null;
  }
  function handleField(t) {
    const acc = accFromEl(t), field = t.dataset.field;
    if (!acc || !field) return;
    if (field === 'type') {
      if (t.value === 'investment' && acc.type !== 'investment' && !(acc.invested > 0)) acc.invested = acc.balance;
      if (t.value === 'checking' && acc.rate > 0 && !confirm('Checking accounts earn no interest. Clear this account\'s interest rate?')) { t.value = acc.type; return; }
      if (t.value === 'checking') acc.rate = 0;
      acc.type = t.value;
      return commit(true);
    }
    if (field === 'bankId') {
      const to = S().banks.find((b) => b.id === t.value);
      if (!to) return;
      acc.bankId = to.id;
      commit(true); // the card leaves this bank's window
      return FT.toast(`Moved “${acc.name || 'Unnamed account'}” to ${to.name}`);
    }
    if (field === 'name' || field === 'cadence') acc[field] = t.value;
    else if (field === 'asOfDate') { if (!t.value) return; acc.asOfDate = t.value; }
    else acc[field] = FT.num(t.value); // a half-typed "-" counts as 0 instead of poisoning every total with NaN
    commit(false);
  }
  function removeAccount(acc) {
    const idx = S().accounts.indexOf(acc);
    S().accounts.splice(idx, 1);
    commit(true);
    FT.toast(`Removed “${acc.name || 'Unnamed account'}”`, 'Undo', () => { S().accounts.splice(idx, 0, acc); commit(true); });
  }

  // Logos are stored inside the saved data as a small PNG data-URL, so they survive export/import.
  function pickLogo(bank) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const size = 96, c = document.createElement('canvas');
        c.width = c.height = size;
        const k = Math.min(size / img.width, size / img.height), w = img.width * k, h = img.height * k;
        c.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        URL.revokeObjectURL(url);
        bank.logo = c.toDataURL('image/png');
        commit(true);
      };
      img.onerror = () => { URL.revokeObjectURL(url); alert('Could not read that image.'); };
      img.src = url;
    });
    input.click();
  }

  // Is the pointer over the first half of a bank tile? (tiles sit side by side, so use x)
  function bankBefore(e, sec) {
    const r = sec.getBoundingClientRect();
    return e.clientX - r.left < r.width / 2;
  }

  // Events inside the bank window: editing accounts and the bank's own actions.
  function bindModal() {
    modal.addEventListener('close', () => { if (modal.open) return; /* reopened before this event fired */ openBankId = null; modalBody.innerHTML = ''; });
    modal.addEventListener('input', (e) => { if (e.target.tagName !== 'SELECT') handleField(e.target); });
    modal.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') handleField(e.target); });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) return modal.close(); // click on the dimmed backdrop
      if (e.target.closest('[data-close]')) return modal.close();
      const wrap = e.target.closest('[data-bank]');
      if (!wrap) return;
      const bank = S().banks.find((b) => b.id === wrap.dataset.bank);
      if (!bank) return;
      const bp = e.target.closest('[data-pick-bank]');
      if (bp) {
        const def = FT.defaultBanks().find((b) => b.id === bank.id);
        const defColor = def ? def.color : bank.color;
        const startColor = bank.color.toLowerCase() === defColor.toLowerCase() ? '' : bank.color;
        const defs = { icon: '', color: defColor, preview: (icon, color, size, text) => FT.bankIcon({ ...bank, icon, text, color: color || defColor, logo: undefined }, size) };
        return FT.pickIcon(bp, { icon: bank.icon, color: startColor, text: bank.text }, defs, (icon, color, text) => {
          bank.icon = icon;
          bank.text = text;
          bank.color = color || defColor;
          bank.accent = color || (def ? def.accent : defColor);
          if ((icon || text) && bank.logo) { delete bank.logo; const rm = modal.querySelector('[data-logo-clear]'); if (rm) rm.remove(); } // a chosen icon replaces an uploaded logo
          bp.innerHTML = FT.bankIcon(bank, 46);
          renderBanks(); // refresh the tile behind the window
          commit(false); // charts and lists use the bank colour too
        });
      }
      const pick = e.target.closest('[data-pick-icon]');
      if (pick) {
        const acc = accFromEl(pick), pal = FT.palette();
        return FT.pickIcon(pick, { icon: acc.icon, color: acc.color, text: acc.text }, { icon: FT.accountIcon({ ...acc, icon: '' }), color: pal[acc.colorIdx % pal.length] }, (icon, color, text) => {
          acc.icon = icon; acc.color = color; acc.text = text;
          pick.innerHTML = FT.accountBadge(acc, 32);
          commit(false); // charts use the account colour too
        });
      }
      if (e.target.closest('[data-remove]')) return removeAccount(accFromEl(e.target));
      if (e.target.closest('[data-add-acc]')) {
        S().accounts.push(FT.newAccount(bank.id, bank.id === 'cash' ? 'checking' : 'savings'));
        commit(true);
        const names = modal.querySelectorAll('.acc-name');
        return names[names.length - 1].focus();
      }
      if (e.target.closest('[data-logo]')) return pickLogo(bank);
      if (e.target.closest('[data-logo-clear]')) { delete bank.logo; return commit(true); }
      if (e.target.closest('[data-del-bank]')) {
        if (!confirm(`Remove “${bank.name}”?`)) return;
        S().banks = S().banks.filter((b) => b.id !== bank.id);
        modal.close();
        return commit(true);
      }
      const mv = e.target.closest('[data-bank-move]');
      if (mv) {
        const banks = S().banks, i = banks.indexOf(bank), j = i + (+mv.dataset.bankMove);
        if (j < 0 || j >= banks.length) return;
        [banks[i], banks[j]] = [banks[j], banks[i]];
        commit(true);
        const again = modal.querySelector(`[data-bank-move="${mv.dataset.bankMove}"]`);
        if (again) again.focus();
      }
    });

    // reorder accounts inside the window by dragging their ⠿ handle
    const clearDrag = () => modal.querySelectorAll('.drag-over-top,.drag-over-bottom').forEach((el) => el.classList.remove('drag-over-top', 'drag-over-bottom'));
    modal.addEventListener('dragstart', (e) => {
      const card = e.target.closest && e.target.closest('.acc-card');
      if (!card || !e.target.classList.contains('drag-handle')) return;
      dragId = card.dataset.acc;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.setDragImage(card, 12, 12); } catch (err) {}
      card.classList.add('dragging');
    });
    modal.addEventListener('dragend', () => { dragId = null; clearDrag(); modal.querySelectorAll('.dragging').forEach((c) => c.classList.remove('dragging')); });
    modal.addEventListener('dragover', (e) => {
      if (!dragId) return;
      e.preventDefault();
      clearDrag();
      const card = e.target.closest('.acc-card');
      if (card && card.dataset.acc !== dragId) {
        const r = card.getBoundingClientRect();
        card.classList.add(e.clientY - r.top < r.height / 2 ? 'drag-over-top' : 'drag-over-bottom');
      }
    });
    modal.addEventListener('drop', (e) => {
      if (!dragId) return;
      e.preventDefault();
      const accs = S().accounts, from = accs.findIndex((a) => a.id === dragId), card = e.target.closest('.acc-card');
      if (from === -1 || !card || card.dataset.acc === dragId) { dragId = null; clearDrag(); return; }
      const [moved] = accs.splice(from, 1);
      const target = accs.find((a) => a.id === card.dataset.acc), r = card.getBoundingClientRect();
      accs.splice(accs.indexOf(target) + (e.clientY - r.top < r.height / 2 ? 0 : 1), 0, moved);
      dragId = null;
      commit(true);
    });
  }

  // Events on the bank tiles: open the window, add a bank, reorder banks by dragging.
  function bindTiles() {
    banksRoot.addEventListener('click', (e) => {
      if (e.target.closest('#addBankBtn')) return $('bankDialog').showModal();
      const sec = e.target.closest('.bank');
      if (sec && !e.target.closest('.bank-handle')) openBank(sec.dataset.bank);
    });
    const clearDrag = () => banksRoot.querySelectorAll('.drag-over-left,.drag-over-right').forEach((el) => el.classList.remove('drag-over-left', 'drag-over-right'));
    banksRoot.addEventListener('dragstart', (e) => {
      if (!(e.target.classList && e.target.classList.contains('bank-handle'))) return;
      const sec = e.target.closest('.bank');
      dragBankId = sec.dataset.bank;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', dragBankId); e.dataTransfer.setDragImage(sec.querySelector('.bank-head'), 12, 12); } catch (err) {}
      sec.classList.add('dragging');
    });
    banksRoot.addEventListener('dragend', () => { dragBankId = null; clearDrag(); banksRoot.querySelectorAll('.dragging').forEach((c) => c.classList.remove('dragging')); });
    banksRoot.addEventListener('dragover', (e) => {
      if (!dragBankId) return;
      e.preventDefault();
      clearDrag();
      const sec = e.target.closest('.bank');
      if (sec && sec.dataset.bank !== dragBankId) sec.classList.add(bankBefore(e, sec) ? 'drag-over-left' : 'drag-over-right');
    });
    banksRoot.addEventListener('drop', (e) => {
      if (!dragBankId) return;
      e.preventDefault();
      const sec = e.target.closest('.bank'), banks = S().banks, from = banks.findIndex((b) => b.id === dragBankId);
      if (!sec || sec.dataset.bank === dragBankId || from === -1) { dragBankId = null; clearDrag(); return; }
      const [moved] = banks.splice(from, 1);
      const to = banks.findIndex((b) => b.id === sec.dataset.bank);
      banks.splice(to + (bankBefore(e, sec) ? 0 : 1), 0, moved);
      dragBankId = null;
      commit(true);
    });
  }

  function bindEvents() {
    bindTiles();
    bindModal();
    root.querySelector('.collapse-btn[aria-controls]').addEventListener('click', (e) => {
      const btn = e.currentTarget, open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      $(btn.getAttribute('aria-controls')).hidden = open;
    });

    // "Add bank" dialog lives in index.html
    $('bankForm').addEventListener('submit', (e) => {
      const name = $('bankName').value.trim();
      if (e.submitter && e.submitter.value === 'cancel') return;
      if (!name) return;
      S().banks.push(FT.newBank(name, $('bankColor').value));
      $('bankName').value = '';
      commit(true);
    });
  }

  FT.views.projections = {
    mount(el) {
      root = el;
      root.innerHTML = SKELETON;
      banksRoot = $('banksRoot');
      modal = document.createElement('dialog');
      modal.id = 'bankModal';
      modal.className = 'bank-modal';
      modal.setAttribute('aria-label', 'Bank accounts');
      modalBody = document.createElement('div');
      modalBody.id = 'bankModalBody';
      modal.appendChild(modalBody);
      document.body.appendChild(modal);
      bindEvents();
      FT.overview.mount($('overviewRoot'), {
        onSelect: updateBankReadouts,
        onSettings: () => { updateBankReadouts(); renderCredits(); FT.save(); },
      });
      renderBanks();
      updateBankReadouts();
      renderCredits();
    },
    render,
    refreshCharts() { FT.overview.refreshCharts(); },
  };
})();
