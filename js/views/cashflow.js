/* Income & expenses tab: month-by-month log of income and rough expenses. */
(function () {
  const FT = window.FT;
  const esc = FT.escapeHtml;
  const S = () => FT.state;
  const CF = () => S().cashflow;
  const $ = (id) => document.getElementById(id);
  let root, trendChart;
  let trendShift = 0; // months the chart window is moved away from the default (6 back, current, 5 ahead)
  let emodal, emodalBody, openEmpId = null; // the employer window (pay history)

  const SKELETON = `
    <div class="time-bar month-bar">
      <div class="month-nav">
        <button class="ghost" id="cfPrev" aria-label="Previous month">‹</button>
        <input type="month" id="cfMonth" aria-label="Month">
        <button class="ghost" id="cfNext" aria-label="Next month">›</button>
        <button class="ghost small" id="cfToday">This month</button>
      </div>
      <p class="sub" id="cfMonthHint"></p>
    </div>

    <div class="panel">
      <div class="panel-head"><div><h2 id="cfSummaryTitle">Summary</h2><p class="sub">Income minus rough expenses for the selected month, compared with what you plan to move into savings and investments.</p></div></div>
      <div class="stats">
        <div class="stat-tile" style="--tile-color: var(--series-3)"><div class="icon-row"><span class="label">Income</span><span class="icon">↓</span></div><div class="value" id="cfIncome">—</div></div>
        <div class="stat-tile" style="--tile-color: var(--series-8)"><div class="icon-row"><span class="label">Expenses</span><span class="icon">↑</span></div><div class="value" id="cfExpenses">—</div></div>
        <div class="stat-tile" style="--tile-color: var(--series-1)"><div class="icon-row"><span class="label">Net</span><span class="icon">€</span></div><div class="value" id="cfNet">—</div></div>
        <div class="stat-tile" style="--tile-color: var(--series-5)"><div class="icon-row"><span class="label">Savings rate</span><span class="icon">%</span></div><div class="value" id="cfRate">—</div></div>
        <div class="stat-tile" style="--tile-color: var(--series-7)"><div class="icon-row"><span class="label">Planned saving <span class="hint" title="Sum of the 'Add / month' amounts across all accounts in the Projections tab.">?</span></span><span class="icon">→</span></div><div class="value" id="cfPlanned">—</div></div>
        <div class="stat-tile" style="--tile-color: var(--series-4)"><div class="icon-row"><span class="label">Left after plan <span class="hint" title="Net minus planned saving. Negative means your projections assume more saving than this month's cash flow supports.">?</span></span><span class="icon">=</span></div><div class="value" id="cfLeft">—</div></div>
        <div class="stat-tile" style="--tile-color: var(--series-2)"><div class="icon-row"><span class="label">Avg. net, last 6 months</span><span class="icon">Ø</span></div><div class="value" id="cfAvg">—</div></div>
      </div>
    </div>

    <div class="entries-grid">
      <div class="panel">
        <div class="panel-head"><div><h2>Income</h2><p class="sub">Pay from your employer (with its history), plus any other income. Add one-off or yearly extras (like a bonus) with “+ Other income”.</p></div><div class="head-btns"><button class="ghost small" id="addEmployerBtn">+ Add employer</button><button class="ghost small" data-add="income">+ Other income</button></div></div>
        <div class="entry-list" id="incomeList"></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Expenses</h2><p class="sub">Rough monthly amounts per category — no need to be exact.</p></div><button class="ghost small" data-add="expense">+ Add expense</button></div>
        <div class="entry-list" id="expenseList"></div>
      </div>
    </div>
    <p class="legend-note">“Every month” items apply from their start month onward (until the end month, if set). Use <b>Skip this month</b> for a one-off gap, or <b>New amount from this month</b> for a raise or price change — earlier months stay as they were.</p>

    <div class="charts-grid">
      <div class="panel">
        <div class="panel-head"><div><h2>Income, expenses &amp; returns</h2><p class="sub" id="cfTrendSub"></p></div>
          <div class="trend-nav"><button class="ghost small" id="trPrev" aria-label="Earlier months">‹</button><button class="ghost small" id="trToday">Today</button><button class="ghost small" id="trNext" aria-label="Later months">›</button></div></div>
        <div class="chart-box"><canvas id="cfTrend"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><h2>Where the money went</h2><p class="sub" id="cfBreakdownSub">Expenses by category.</p></div></div>
        <div id="cfBreakdown" class="breakdown"></div>
      </div>
    </div>`;

  // ---------- data ----------
  const inRange = (e, key) => e.month <= key && (!e.until || key <= e.until);
  const active = (e, key) => (e.recurring ? inRange(e, key) && !e.skip.includes(key) : e.month === key);
  const skippedIn = (key, kind) => CF().entries.filter((e) => e.kind === kind && e.recurring && inRange(e, key) && e.skip.includes(key));
  const forMonth = (key, kind) => CF().entries.filter((e) => e.kind === kind && active(e, key));
  const total = (list) => list.reduce((s, e) => s + e.amount, 0);
  const monthTotals = (key) => {
    const inc = total(forMonth(key, 'income')) + FT.income.monthTotal(key), exp = total(forMonth(key, 'expense'));
    return { inc, exp, net: inc - exp };
  };

  // ---------- rows ----------
  function rowHTML(e) {
    const cats = (e.kind === 'income' ? FT.INCOME_CATS : FT.EXPENSE_CATS);
    const options = (cats.includes(e.category) ? cats : [e.category, ...cats]).map((c) => `<option ${c === e.category ? 'selected' : ''}>${esc(c)}</option>`).join('');
    return `<div class="entry" data-entry="${e.id}">
      <div class="entry-cat"><button type="button" class="badge-btn" data-pick-icon title="Change icon and colour" aria-label="Change icon and colour">${FT.entryBadge(e, 32)}</button>
        <select data-f="category" aria-label="Category">${options}</select></div>
      <input type="text" data-f="label" value="${esc(e.label)}" placeholder="Description (optional)" aria-label="Description">
      <input type="number" data-f="amount" step="0.01" min="0" value="${e.amount}" aria-label="Amount in euro">
      <button class="rm-btn" data-rm title="Remove" aria-label="Remove">✕</button>
      <div class="entry-rec">
        <label class="rec"><input type="checkbox" data-f="recurring" ${e.recurring ? 'checked' : ''}> Every month</label>
        <span class="rec-dates" ${e.recurring ? '' : 'hidden'}>from <input type="month" data-f="month" value="${e.month}"> until <input type="month" data-f="until" value="${e.until}"></span>
        ${e.recurring ? `<span class="rec-actions">
          <button class="ghost small" data-skip title="Leave this item out of ${FT.monthLabel(CF().month, true)} only">Skip this month</button>
          ${e.month < CF().month ? '<button class="ghost small" data-split title="Keep the past as it was and use new values from this month onward — for a raise or price change">New amount from this month</button>' : ''}
        </span>` : ''}
      </div>
    </div>`;
  }
  function skippedHTML(kind) {
    const list = skippedIn(CF().month, kind);
    return list.map((e) => `<div class="skipped" data-entry="${e.id}"><span>Skipped this month: <b>${esc(e.label || e.category)}</b> (${FT.fmtEUR(e.amount)})</span><button class="ghost small" data-unskip>Restore</button></div>`).join('');
  }
  // ---------- employers ----------
  const empOf = (id) => CF().employers.find((e) => e.id === id);
  function empBlockHTML(emp, key) {
    const { amount, usual, overridden } = FT.income.salaryAt(emp, key);
    return `<div class="emp-block" data-emp="${emp.id}">
      <div class="emp-main">
        <button type="button" class="badge-btn" data-pick-emp title="Change icon and colour" aria-label="Change icon and colour for ${esc(emp.name)}">${FT.income.badge(emp, 40)}</button>
        <div class="emp-info"><b>${esc(emp.name)}</b><span class="ks">${overridden ? `Differs from the usual ${FT.fmtEUR2(usual)}` : 'Monthly pay'}</span></div>
        <input type="number" class="emp-pay" data-emp-pay step="0.01" min="0" value="${amount}" aria-label="Pay received from ${esc(emp.name)} in this month">
        ${overridden ? '<button class="ghost small" data-emp-reset title="Back to the usual amount">Reset</button>' : ''}
        <button class="ghost small" data-emp-manage>Pay history</button>
      </div>
    </div>`;
  }

  function renderLists() {
    const key = CF().month;
    const emps = CF().employers.filter((e) => FT.income.visible(e, key));
    const inc = forMonth(key, 'income');
    $('incomeList').innerHTML = (emps.length || inc.length ? emps.map((e) => empBlockHTML(e, key)).join('') + inc.map(rowHTML).join('') : '<div class="empty-row-note">No income logged for this month.</div>') + skippedHTML('income');
    const exp = forMonth(key, 'expense');
    $('expenseList').innerHTML = (exp.length ? exp.map(rowHTML).join('') : '<div class="empty-row-note">No expenses logged for this month.</div>') + skippedHTML('expense');
  }

  // ---------- readouts ----------
  function renderSummary() {
    const key = CF().month, t = monthTotals(key);
    const planned = S().accounts.reduce((s, a) => s + a.monthly, 0);
    const left = t.net - planned;
    let avg = 0;
    for (let i = 0; i < 6; i++) avg += monthTotals(FT.addMonthsKey(key, -i)).net;
    avg /= 6;
    const put = (id, txt, cls) => { const el = $(id); el.textContent = txt; el.className = 'value ' + (cls || ''); };
    $('cfSummaryTitle').textContent = `Summary · ${FT.monthLabel(key, true)}`;
    put('cfIncome', FT.fmtEUR(t.inc));
    put('cfExpenses', FT.fmtEUR(t.exp));
    put('cfNet', FT.fmtSigned(t.net), t.net >= 0 ? 'good' : 'bad');
    put('cfRate', t.inc > 0 ? `${((t.net / t.inc) * 100).toFixed(0)}%` : '—', t.inc > 0 ? (t.net >= 0 ? 'good' : 'bad') : '');
    put('cfPlanned', FT.fmtEUR(planned));
    put('cfLeft', FT.fmtSigned(left), left >= 0 ? 'good' : 'bad');
    put('cfAvg', FT.fmtSigned(avg), avg >= 0 ? 'good' : 'bad');
    $('cfMonth').value = key;
    $('cfMonthHint').textContent = key === FT.currentMonthKey() ? 'Current month' : key > FT.currentMonthKey() ? 'Future month — only your usual pay and “every month” items show up here.' : '';
  }

  function renderBreakdown() {
    const key = CF().month, list = forMonth(key, 'expense'), sum = total(list);
    const byCat = {};
    list.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const rows = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const pal = FT.palette(), max = rows.length ? rows[0][1] : 1;
    $('cfBreakdown').innerHTML = rows.length ? rows.map(([cat, v], i) => `
      <div class="bd-row"><div class="bd-top"><span class="bd-name">${FT.badge(FT.categoryStyle(cat).icon, FT.categoryStyle(cat).color, 22)}${esc(cat)}</span><span><b>${FT.fmtEUR(v)}</b> <em>${((v / sum) * 100).toFixed(0)}%</em></span></div>
      <div class="bd-bar"><span style="width:${(v / max) * 100}%;background:${FT.categoryStyle(cat).color}"></span></div></div>`).join('')
      : '<div class="empty-row-note">Nothing to break down yet.</div>';
  }

  // Expected returns per month, straight from the Projections tab: the interest / return credited to each
  // account in that month (so quarterly, half-yearly or yearly accounts show up in the months they pay out).
  function returnsByMonth(keys) {
    const cur = FT.currentMonthKey(), last = keys[keys.length - 1];
    const out = {};
    if (last < cur) return out;
    const events = FT.proj.creditEvents(S().accounts, FT.monthsBetween(cur, last));
    events.forEach((ev) => {
      const k = FT.dateStrOf(ev.date).slice(0, 7);
      (out[k] = out[k] || []).push({ name: ev.acc.name || 'Account', amount: ev.amount });
    });
    return out;
  }
  const faded = (hex) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + '99' : hex);

  function renderTrend() {
    const ink = FT.chartInk(), cur = FT.currentMonthKey(), sel = CF().month;
    const n = window.innerWidth <= 760 ? 6 : 12; // fewer bars on a phone
    const keys = Array.from({ length: n }, (_, i) => FT.addMonthsKey(cur, i - n / 2 + trendShift));
    const t = keys.map(monthTotals), ret = returnsByMonth(keys);
    const retTotal = keys.map((k) => (ret[k] || []).reduce((s, r) => s + r.amount, 0));
    const pal = FT.palette();
    $('cfTrendSub').textContent = `${FT.monthLabel(keys[0], true)} – ${FT.monthLabel(keys[n - 1], true)}. Months after today use your recurring items and your projections; lighter bars are forecasts. Returns are much smaller, so they use their own scale on the right. Click a month to open it.`;
    if (trendChart) trendChart.destroy();
    const bar = (label, data, color, order) => ({ type: 'bar', label, data, order, borderRadius: 4, backgroundColor: (c) => (keys[c.dataIndex] > cur ? faded(color) : color), borderColor: color, borderWidth: (c) => (keys[c.dataIndex] > cur ? 1 : 0) });
    const selectedMonth = {
      id: 'selectedMonth',
      beforeDatasetsDraw(chart) {
        const idx = keys.indexOf(CF().month), { ctx, chartArea: a } = chart;
        if (idx < 0) return;
        const w = a.width / keys.length, x = a.left + w * idx;
        ctx.save(); ctx.fillStyle = ink.grid; ctx.globalAlpha = 0.55; ctx.fillRect(x, a.top, w, a.height); ctx.restore();
      },
    };
    trendChart = new Chart($('cfTrend'), {
      data: {
        labels: keys.map((k) => (k === cur ? [FT.monthLabel(k), 'now'] : FT.monthLabel(k))),
        datasets: [
          bar('Income', t.map((x) => x.inc), pal[2], 3),
          bar('Expenses', t.map((x) => x.exp), pal[7], 4),
          { ...bar('Expected returns (right axis)', retTotal, pal[0], 5), yAxisID: 'y2' },
          { type: 'line', label: 'Net (income − expenses)', data: t.map((x) => x.net), borderColor: ink.primary, backgroundColor: ink.primary, borderWidth: 2.5, pointRadius: 3, tension: 0.25, order: 1 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        onClick: (_e, els) => { if (els.length) setMonth(keys[els[0].index]); },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 }, color: ink.text } },
          tooltip: {
            backgroundColor: ink.surface, titleColor: ink.primary, bodyColor: ink.text, borderColor: ink.grid, borderWidth: 1, padding: 10,
            callbacks: {
              title: (items) => FT.monthLabel(keys[items[0].dataIndex], true) + (keys[items[0].dataIndex] > cur ? ' (forecast)' : ''),
              label: (c) => `${c.dataset.label}: ${FT.fmtEUR2(c.parsed.y)}`,
              afterBody: (items) => {
                const list = ret[keys[items[0].dataIndex]];
                return list && list.length ? ['', 'Returns credited:', ...list.map((r) => `  ${r.name}: ${FT.fmtEUR2(r.amount)}`)] : [];
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: ink.text, font: { size: 11 } }, border: { color: ink.grid } },
          y: { grid: { color: ink.grid }, ticks: { color: ink.text, font: { size: 11 }, callback: (v) => FT.fmtEUR(v) }, border: { display: false } },
          y2: { position: 'right', beginAtZero: true, grid: { display: false }, ticks: { color: pal[0], font: { size: 11 }, callback: (v) => FT.fmtEUR(v) }, border: { display: false } },
        },
      },
      plugins: [selectedMonth],
    });
  }

  function renderLive() { renderSummary(); renderBreakdown(); renderTrend(); }
  function render() { renderLists(); renderLive(); }
  function commit(rebuild) { if (rebuild) renderLists(); renderLive(); FT.save(); }
  function setMonth(key) { if (FT.isMonthKey(key)) { CF().month = key; commit(true); } }

  // ---------- employer window ----------
  function empModalHTML(emp) {
    const salary = emp.salary.map((p, i) => `<div class="emp-grid" data-list="salary" data-i="${i}">
        <label class="fld"><span>From</span><input type="month" data-f="from" value="${p.from}"></label>
        <label class="fld"><span>Monthly pay (€)</span><input type="number" step="0.01" min="0" data-f="amount" value="${p.amount}"></label>
        <button class="rm-btn" data-del title="Remove this row" aria-label="Remove this row">✕</button></div>`).join('');
    const overrides = emp.overrides.map((o, i) => `<div class="emp-grid" data-list="ov" data-i="${i}">
        <label class="fld"><span>Month</span><input type="month" data-f="month" value="${o.month}"></label>
        <label class="fld"><span>Received (€)</span><input type="number" step="0.01" min="0" data-f="amount" value="${o.amount}"></label>
        <button class="rm-btn" data-del title="Remove this row" aria-label="Remove this row">✕</button></div>`).join('');
    return `<div class="bm" data-emp="${emp.id}">
      <header class="bm-head">
        <button type="button" class="badge-btn" data-pick-emp title="Change icon and colour" aria-label="Change icon and colour">${FT.income.badge(emp, 46)}</button>
        <div class="bank-title"><input class="emp-name" type="text" data-ef="name" value="${esc(emp.name)}" placeholder="Company / employer" aria-label="Employer name"></div>
        <button class="icon-btn" type="button" data-close aria-label="Close">✕</button>
      </header>
      <div class="bm-body">
        <section class="emp-sec">
          <h3>Monthly pay</h3>
          <p class="sub">What you usually receive each month, from the month it started. Add a row each time it changes — and earlier rows to record what you were paid in the past.</p>
          <div class="emp-rows">${salary || '<div class="empty-row-note">No pay registered yet.</div>'}</div>
          <div class="emp-actions"><button class="ghost small" data-add-salary>+ Add a change</button>
            <label class="fld inline"><span>Last month at this employer (optional)</span><input type="month" data-ef="endMonth" value="${emp.endMonth}"></label></div>
        </section>
        <section class="emp-sec">
          <h3>Months that were different</h3>
          <p class="sub">A month where you received something other than the usual amount (extra pay, deductions, holiday pay…). It replaces the usual amount for that month only.</p>
          <div class="emp-rows">${overrides || '<div class="empty-row-note">None registered.</div>'}</div>
          <div class="emp-actions"><button class="ghost small" data-add-ov>+ Add a month</button></div>
        </section>
        <div class="emp-foot"><button class="ghost small danger" data-remove-emp>Remove this employer</button></div>
      </div>
    </div>`;
  }
  // `sort` re-orders the lists chronologically; only done when rows are added/removed so typing never reshuffles.
  function renderEmpModal(sort) {
    const emp = empOf(openEmpId);
    if (!emp) { if (emodal.open) emodal.close(); return; }
    if (sort) {
      emp.salary.sort((x, y) => (x.from < y.from ? -1 : x.from > y.from ? 1 : 0));
      emp.overrides.sort((x, y) => (x.month < y.month ? -1 : x.month > y.month ? 1 : 0));
    }
    emodalBody.innerHTML = empModalHTML(emp);
  }
  function openEmployer(id) {
    openEmpId = id;
    renderEmpModal(true);
    if (!emodal.open) emodal.showModal();
  }

  function onEmpField(el) {
    const emp = empOf(openEmpId);
    if (!emp) return;
    if (el.dataset.ef) {
      if (el.dataset.ef === 'name') emp.name = el.value.slice(0, 60);
      else emp.endMonth = FT.isMonthKey(el.value) ? el.value : '';
      return commit(true);
    }
    const row = el.closest('[data-list]');
    if (!row) return;
    const list = row.dataset.list, i = +row.dataset.i, f = el.dataset.f;
    const monthOk = FT.isMonthKey(el.value);
    if (list === 'salary') {
      const p = emp.salary[i];
      if (f === 'from') { if (!monthOk) return; p.from = el.value; } else p.amount = Math.max(0, FT.num(el.value));
    } else if (list === 'ov') {
      const o = emp.overrides[i];
      if (f === 'month') { if (!monthOk) return; o.month = el.value; } else o.amount = Math.max(0, FT.num(el.value));
    }
    commit(true);
  }

  function bindEmployerModal() {
    emodal.addEventListener('close', () => { if (emodal.open) return; openEmpId = null; emodalBody.innerHTML = ''; });
    emodal.addEventListener('input', (e) => onEmpField(e.target));
    emodal.addEventListener('change', (e) => onEmpField(e.target));
    emodal.addEventListener('click', (e) => {
      if (e.target === emodal || e.target.closest('[data-close]')) return emodal.close();
      const emp = empOf(openEmpId);
      if (!emp) return;
      const key = CF().month;
      const pk = e.target.closest('[data-pick-emp]');
      if (pk) {
        return FT.pickIcon(pk, { icon: emp.icon, color: emp.color, text: emp.text }, FT.income.DEFAULT, (icon, color, text) => {
          emp.icon = icon; emp.color = color; emp.text = text;
          pk.innerHTML = FT.income.badge(emp, 46);
          commit(true);
        });
      }
      if (e.target.closest('[data-add-salary]')) {
        const last = emp.salary.reduce((m, p) => (!m || p.from >= m.from ? p : m), null);
        emp.salary.push({ from: key, amount: last ? last.amount : 0 });
        renderEmpModal(true); return commit(true);
      }
      if (e.target.closest('[data-add-ov]')) {
        emp.overrides.push({ month: key, amount: FT.income.usual(emp, key) });
        renderEmpModal(true); return commit(true);
      }
      const del = e.target.closest('[data-del]');
      if (del) {
        const row = del.closest('[data-list]'), i = +row.dataset.i;
        const arr = { salary: emp.salary, ov: emp.overrides }[row.dataset.list];
        const [removed] = arr.splice(i, 1);
        renderEmpModal(false); commit(true);
        return FT.toast('Row removed', 'Undo', () => { arr.splice(i, 0, removed); renderEmpModal(true); commit(true); });
      }
      if (e.target.closest('[data-remove-emp]')) {
        if (!confirm(`Remove “${emp.name}” and all its pay history?`)) return;
        const idx = CF().employers.indexOf(emp);
        CF().employers.splice(idx, 1);
        emodal.close();
        commit(true);
        FT.toast(`Removed “${emp.name}”`, 'Undo', () => { CF().employers.splice(idx, 0, emp); commit(true); });
      }
    });
  }

  // ---------- events ----------
  function bind() {
    $('cfPrev').addEventListener('click', () => setMonth(FT.addMonthsKey(CF().month, -1)));
    $('cfNext').addEventListener('click', () => setMonth(FT.addMonthsKey(CF().month, 1)));
    $('cfToday').addEventListener('click', () => setMonth(FT.currentMonthKey()));
    $('cfMonth').addEventListener('change', (e) => setMonth(e.target.value));
    $('trPrev').addEventListener('click', () => { trendShift -= 3; renderTrend(); });
    $('trNext').addEventListener('click', () => { trendShift += 3; renderTrend(); });
    $('trToday').addEventListener('click', () => { trendShift = 0; renderTrend(); });

    root.querySelectorAll('[data-add]').forEach((btn) => btn.addEventListener('click', () => {
      const kind = btn.dataset.add;
      CF().entries.push({ id: FT.uid(), kind, category: kind === 'income' ? FT.INCOME_CATS[0] : FT.EXPENSE_CATS[0], label: '', amount: 0, month: CF().month, recurring: false, until: '', skip: [], icon: '', color: '', text: '' });
      commit(true);
      const rows = $(kind === 'income' ? 'incomeList' : 'expenseList').querySelectorAll('input[data-f="amount"]');
      rows[rows.length - 1].focus();
    }));

    $('addEmployerBtn').addEventListener('click', () => {
      const emp = FT.income.newEmployer('New employer', CF().month);
      CF().employers.push(emp);
      commit(true);
      openEmployer(emp.id);
      const name = emodal.querySelector('.emp-name');
      if (name) { name.focus(); name.select(); }
    });

    // Typing in an employer's pay box registers what was actually received this month. If it matches the
    // usual amount the exception is removed again. The row is rebuilt on commit (change) so its label and Reset button follow.
    const setPay = (el, done) => {
      const emp = empOf(el.closest('[data-emp]').dataset.emp), key = CF().month;
      const v = Math.max(0, FT.num(el.value)), usual = FT.income.salaryAt(emp, key).usual;
      emp.overrides = emp.overrides.filter((o) => o.month !== key);
      if (Math.abs(v - usual) > 0.004) emp.overrides.push({ month: key, amount: v });
      commit(done);
    };

    const entryOf = (el) => { const row = el.closest('[data-entry]'); return row ? CF().entries.find((e) => e.id === row.dataset.entry) : null; };
    const onField = (el) => {
      const e = entryOf(el), f = el.dataset.f;
      if (!e || !f) return;
      if (f === 'amount') e.amount = Math.max(0, FT.num(el.value));
      else if (f === 'recurring') {
        e.recurring = el.checked;
        if (!e.recurring) { e.month = CF().month; e.until = ''; e.skip = []; } // becomes a one-off for the month being viewed
        return commit(true);
      }
      else if (f === 'month' || f === 'until') {
        if (f === 'month' && !FT.isMonthKey(el.value)) return;
        e[f] = FT.isMonthKey(el.value) ? el.value : '';
        // keep the edited item visible: if it no longer applies to the viewed month, jump to its start
        if (!active(e, CF().month)) return setMonth(e.month);
      } else {
        e[f] = el.value;
        if (f === 'category') { const bb = el.closest('.entry').querySelector('.badge-btn'); if (bb) bb.innerHTML = FT.entryBadge(e, 32); } // default icon follows the category
      }
      commit(false);
    };
    ['incomeList', 'expenseList'].forEach((id) => {
      const list = $(id);
      list.addEventListener('input', (ev) => {
        if (ev.target.matches('[data-emp-pay]')) return setPay(ev.target, false);
        if (ev.target.tagName !== 'SELECT' && ev.target.type !== 'checkbox' && ev.target.type !== 'month') onField(ev.target);
      });
      list.addEventListener('change', (ev) => {
        if (ev.target.matches('[data-emp-pay]')) return setPay(ev.target, true);
        if (ev.target.tagName === 'SELECT' || ev.target.type === 'checkbox' || ev.target.type === 'month') onField(ev.target);
      });
      list.addEventListener('click', (ev) => {
        const key = CF().month;
        const empEl = ev.target.closest('[data-emp]');
        if (empEl) {
          const emp = empOf(empEl.dataset.emp);
          if (ev.target.closest('[data-emp-manage]')) return openEmployer(emp.id);
          if (ev.target.closest('[data-emp-reset]')) { emp.overrides = emp.overrides.filter((o) => o.month !== key); return commit(true); }
          const pe = ev.target.closest('[data-pick-emp]');
          if (pe) return FT.pickIcon(pe, { icon: emp.icon, color: emp.color, text: emp.text }, FT.income.DEFAULT, (icon, color, text) => { emp.icon = icon; emp.color = color; emp.text = text; pe.innerHTML = FT.income.badge(emp, 40); FT.save(); });
          return;
        }
        const pk = ev.target.closest('[data-pick-icon]');
        if (pk) {
          const e = entryOf(pk);
          return FT.pickIcon(pk, { icon: e.icon, color: e.color, text: e.text }, FT.categoryStyle(e.category), (icon, color, text) => { e.icon = icon; e.color = color; e.text = text; pk.innerHTML = FT.entryBadge(e, 32); FT.save(); });
        }
        if (ev.target.closest('[data-skip]')) {
          const e = entryOf(ev.target);
          e.skip.push(key);
          commit(true);
          return FT.toast(`Skipped ${e.label || e.category} for ${FT.monthLabel(key, true)}`, 'Undo', () => { e.skip = e.skip.filter((m) => m !== key); commit(true); });
        }
        if (ev.target.closest('[data-unskip]')) { const e = entryOf(ev.target); e.skip = e.skip.filter((m) => m !== key); return commit(true); }
        if (ev.target.closest('[data-split]')) {
          // end the old item last month and start a copy this month, so history is preserved
          const e = entryOf(ev.target), copy = { ...e, id: FT.uid(), month: key, skip: e.skip.filter((m) => m >= key) };
          e.skip = e.skip.filter((m) => m < key);
          e.until = FT.addMonthsKey(key, -1);
          CF().entries.splice(CF().entries.indexOf(e) + 1, 0, copy);
          commit(true);
          const row = document.querySelector(`[data-entry="${copy.id}"] input[data-f="amount"]`);
          if (row) { row.focus(); row.select(); }
          return FT.toast(`Changes now apply from ${FT.monthLabel(key, true)} onward; earlier months are unchanged.`);
        }
        if (!ev.target.closest('[data-rm]')) return;
        const e = entryOf(ev.target), idx = CF().entries.indexOf(e);
        CF().entries.splice(idx, 1);
        commit(true);
        FT.toast(`Removed ${e.category.toLowerCase()} item${e.recurring ? ' (all months)' : ''}`, 'Undo', () => { CF().entries.splice(idx, 0, e); commit(true); });
      });
    });
  }

  FT.views.cashflow = {
    mount(el) {
      root = el;
      root.innerHTML = SKELETON;
      emodal = document.createElement('dialog');
      emodal.className = 'bank-modal emp-modal';
      emodal.setAttribute('aria-label', 'Employer pay history');
      emodalBody = document.createElement('div'); // content lives here so a toast parked in the dialog survives re-renders
      emodalBody.id = 'empModalBody';
      emodal.appendChild(emodalBody);
      document.body.appendChild(emodal);
      bindEmployerModal();
      bind();
      render();
    },
    render() { if (emodal.open) emodal.close(); render(); },
    refreshCharts: renderTrend,
  };
})();
