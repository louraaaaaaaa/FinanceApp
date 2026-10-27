/* Overview panel (Projections tab): one stacked balance-over-time chart with a month scrubber.
   Everything else in the panel — headline value, split by bank/account/type, key figures —
   describes whichever month is selected. Also owns the forecast horizon and tax toggle. */
(function () {
  const FT = window.FT;
  const P = FT.proj;
  const esc = FT.escapeHtml;
  const S = () => FT.state;
  const $ = (id) => document.getElementById(id);

  const PRESETS = [[6, '6M'], [12, '1Y'], [24, '2Y'], [36, '3Y'], [60, '5Y']];
  let root, chart;
  let sel = 0;        // selected month, 0 = this month
  let mode = 'bank';  // grouping: bank | account | type
  let focus = null;   // a group key the user clicked in the split list
  let cb = {};        // { onSelect, onSettings } supplied by the Projections view

  const T = () => S().settings.horizon;
  const monthKey = (m) => FT.addMonthsKey(P.start.slice(0, 7), m);
  const bankOf = (acc) => S().banks.find((b) => b.id === acc.bankId) || S().banks[0];
  const gainClass = (v) => (v >= 0 ? 'good' : 'bad');

  const MARKUP = `
    <div class="ov-head">
      <div><h2>Overview</h2><p class="sub">Drag the dot on the chart (or click anywhere on it) to see your balance, how it is split and your returns in any month.</p></div>
      <div class="ov-controls">
        <div class="ctrl-group"><span class="ctrl-label">Horizon</span><div class="seg" id="ovHorizon" role="group" aria-label="Forecast horizon"></div></div>
        <div class="ctrl-group"><span class="ctrl-label">Group by</span>
          <select id="ovGroup" aria-label="Group by"><option value="bank">Bank</option><option value="account">Account</option><option value="type">Type</option></select></div>
        <div class="ctrl-group"><span class="ctrl-label">After tax <span class="hint" title="Applies each account's Tax %: cash interest is taxed monthly as it is earned; investment gains are taxed on the unrealised gain only, as if sold in that month. Off = everything before tax. Rough estimate, not tax advice.">?</span></span>
          <label class="switch"><input type="checkbox" id="taxToggle" aria-label="Estimate tax on gains"><span class="track"></span></label></div>
      </div>
    </div>
    <div class="ov-main">
      <div class="ov-left">
        <div class="hero-figure">
          <span class="l" id="ovLabel"></span>
          <div class="hero-value" id="ovValue">—</div>
          <div class="hero-sub" id="ovSub"></div>
        </div>
        <div class="ov-chart">
          <div class="chart-box ov-canvas"><canvas id="ovChart"></canvas></div>
        </div>
      </div>
      <div class="alloc">
        <span class="l" id="allocTitle">Where it sits</span>
        <div class="alloc-bar" id="allocBar"></div>
        <ul class="alloc-legend" id="allocLegend"></ul>
        <p class="ks" id="allocHint">Click a row to focus on it.</p>
      </div>
    </div>
    <div class="kpis">
      <div class="kpi"><span class="l">Saving per month</span><span class="kv" id="kMonthly">—</span><span class="ks" id="kAccounts"></span></div>
      <div class="kpi"><span class="l">Put in <span class="kwhen"></span> <span class="hint" title="Deposits plus the original cost of investments, up to that month.">?</span></span><span class="kv" id="kCost">—</span></div>
      <div class="kpi"><span class="l">Gain / loss <span class="kwhen"></span> <span class="hint" title="Value minus everything you put in. Your own monthly deposits are NOT counted as gain — only interest and market returns.">?</span></span><span class="kv" id="kGain">—</span></div>
      <div class="kpi"><span class="l">Return <span class="kwhen"></span> <span class="hint" title="Savings and investments only; idle checking/cash is excluded so it does not dilute the percentage.">?</span></span><span class="kv" id="kReturn">—</span></div>
      <div class="kpi"><span class="l" id="avgGainLabel">Avg. daily gain <span class="hint" title="Estimated from each account's CURRENT balance and annual rate, independent of its credit schedule.">?</span></span><span class="kv" id="kDaily">—</span>
        <select class="gain-period-select" id="gainPeriodSelect" aria-label="Average gain period"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></div>
    </div>`;

  // ---------- grouping ----------
  function groupKey(acc) {
    if (mode === 'bank') return bankOf(acc).name;
    if (mode === 'type') return FT.TYPE_LABELS[acc.type];
    return `${bankOf(acc).name} — ${acc.name || '—'}`;
  }
  function groups() {
    const order = [], map = {};
    S().accounts.forEach((a) => { const k = groupKey(a); if (!map[k]) { map[k] = []; order.push(k); } map[k].push(a); });
    const pal = FT.palette(), color = {};
    order.forEach((k, i) => {
      color[k] = mode === 'bank' ? FT.bankAccent(bankOf(map[k][0])) : mode === 'account' ? FT.accountColor(map[k][0]) : pal[i % pal.length];
    });
    return { order, map, color };
  }

  // ---------- chart (rebuilt only when the data or options change, not while scrubbing) ----------
  function build() {
    const t = T(), ink = FT.chartInk(), g = groups();
    if (focus && !g.map[focus]) focus = null;
    const labels = Array.from({ length: t + 1 }, (_, m) => FT.monthLabel(monthKey(m)));
    // With a row focused we draw only that group, so the y axis rescales to fit it.
    const shown = focus ? [focus] : g.order;
    const totals = Array(t + 1).fill(0);
    const datasets = shown.map((k, i) => {
      const data = Array(t + 1).fill(0);
      g.map[k].forEach((a) => P.series(a, t).forEach((v, j) => { data[j] += v; totals[j] += v; }));
      return {
        label: k, data, fill: i === 0 ? 'origin' : '-1',
        backgroundColor: FT.hexToRgba(g.color[k], 0.62), borderColor: g.color[k],
        borderWidth: 1.5, pointRadius: 0, tension: 0.25,
      };
    });
    const narrow = $('ovChart').parentElement.clientWidth < 520;
    if (chart) chart.destroy();
    chart = new Chart($('ovChart'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        events: [], // scrubbing is handled by our own pointer listeners
        layout: { padding: { top: 26, right: 8 } }, // room for the month tag above the dot
        plugins: {
          legend: { display: false }, tooltip: { enabled: false },
          currentMonthMarker: { index: sel, label: FT.monthLabel(monthKey(sel)), values: totals, color: ink.primary, text: ink.surface },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: ink.text, font: { size: 11 }, maxTicksLimit: narrow ? 4 : 8, maxRotation: 0 }, border: { color: ink.grid } },
          y: { stacked: true, beginAtZero: !focus, grace: focus ? '8%' : 0, grid: { color: ink.grid, drawTicks: false }, ticks: { color: ink.text, font: { size: 11 }, callback: (v) => FT.fmtEUR(v) }, border: { display: false } },
        },
      },
    });
  }

  // ---------- everything that depends on the selected month ----------
  function update() {
    const t = T(), accs = S().accounts, st = S().settings, g = groups();
    sel = Math.max(0, Math.min(sel, t));
    if (focus && !g.map[focus]) focus = null;
    const set = focus ? g.map[focus] : accs;
    const when = sel === 0 ? 'today' : FT.monthLabel(monthKey(sel));
    const has = accs.length > 0;

    // headline
    const val = P.sum(set, (a) => P.value(a, sel)), today = P.sum(set, (a) => P.value(a, 0));
    $('ovLabel').textContent = `${focus ? focus + ' · ' : ''}${sel === 0 ? 'Balance today' : 'Balance in ' + FT.monthLabel(monthKey(sel), true)}`;
    $('ovValue').textContent = has ? FT.fmtEUR(val) : '—';
    const d = val - today;
    const deposits = P.sum(set, (a) => P.invested(a, sel) - P.invested(a, 0)), growth = d - deposits;
    $('ovSub').innerHTML = !has ? '' : sel === 0 ? '<span>Where you stand right now</span>'
      : `<span class="delta-pill ${gainClass(growth)}" title="Growth from interest and returns only. Your own monthly deposits are shown separately.">${FT.fmtSigned(growth)} returns</span><span>${deposits ? `${FT.fmtSigned(deposits)} deposits · ` : ''}vs. today (${FT.fmtEUR(today)})</span>`;

    // split at the selected month
    const total = P.sum(accs, (a) => P.value(a, sel));
    const rows = g.order.map((k) => ({ key: k, accs: g.map[k], v: P.sum(g.map[k], (a) => P.value(a, sel)), gain: P.sum(g.map[k], (a) => P.gain(a, sel)) })).sort((a, b) => b.v - a.v);
    $('allocTitle').textContent = `Where it sits · ${sel === 0 ? 'today' : FT.monthLabel(monthKey(sel))}`;
    $('allocBar').innerHTML = total > 0 ? rows.filter((r) => r.v > 0).map((r) => `<span style="width:${(r.v / total) * 100}%;background:${g.color[r.key]};opacity:${focus && focus !== r.key ? 0.25 : 1}" title="${esc(r.key)}: ${FT.fmtEUR(r.v)}"></span>`).join('') : '<span class="alloc-empty"></span>';
    $('allocLegend').innerHTML = rows.map((r) => {
      const mark = mode === 'bank' ? FT.bankIcon(bankOf(r.accs[0]), 22) : mode === 'account' ? FT.accountBadge(r.accs[0], 22) : `<span class="swatch" style="background:${g.color[r.key]}"></span>`;
      return `<li><button type="button" class="alloc-row" data-key="${esc(r.key)}" aria-pressed="${focus === r.key}">
        <span class="alloc-mark">${mark}</span><span class="alloc-name">${esc(r.key)}</span>
        <span class="alloc-pct">${total > 0 ? ((r.v / total) * 100).toFixed(0) : 0}%</span><span class="alloc-val">${FT.fmtEUR(r.v)}</span>
        <span class="alloc-gain ${gainClass(r.gain)}">${FT.fmtSigned(r.gain)}</span></button></li>`;
    }).join('');
    $('allocHint').textContent = focus ? 'Showing only the focused row in the figures above. Click it again to clear.' : 'Click a row to focus on it. The last column is gain/loss.';

    // key figures
    const cost = P.sum(set, (a) => P.invested(a, sel)), gain = val - cost;
    const earning = set.filter((a) => a.type !== 'checking');
    const eCost = P.sum(earning, (a) => P.invested(a, sel)), eGain = P.sum(earning, (a) => P.gain(a, sel));
    const days = { daily: 1, weekly: 7, monthly: 365 / 12, yearly: 365 }[st.gainPeriod];
    const put = (id, txt, cls) => { const el = $(id); el.textContent = txt; el.className = ('kv ' + (cls || '')).trim(); };
    put('kMonthly', FT.fmtEUR(P.sum(set, (a) => a.monthly)));
    $('kAccounts').textContent = `across ${set.length} account${set.length === 1 ? '' : 's'}`;
    put('kCost', has ? FT.fmtEUR(cost) : '—');
    put('kGain', has ? FT.fmtSigned(gain) : '—', has ? gainClass(gain) : '');
    put('kReturn', eCost > 0 ? FT.fmtPct(eGain / eCost) : '—', eCost > 0 ? gainClass(eGain) : '');
    put('kDaily', has ? FT.fmtEUR2(P.sum(set, P.dailyGain) * days) : '—');
    $('avgGainLabel').firstChild.textContent = `Avg. ${st.gainPeriod} gain `;
    root.querySelectorAll('.kwhen').forEach((el) => { el.textContent = `· ${when}`; });

    // chart marker + accessible slider semantics on the canvas
    const canvas = $('ovChart');
    canvas.setAttribute('aria-valuemax', String(t));
    canvas.setAttribute('aria-valuenow', String(sel));
    canvas.setAttribute('aria-valuetext', sel === 0 ? 'Today' : FT.monthLabel(monthKey(sel), true));
    if (chart) {
      const m = chart.options.plugins.currentMonthMarker;
      m.index = sel;
      m.label = FT.monthLabel(monthKey(sel));
      chart.update('none');
    }
    if (cb.onSelect) cb.onSelect(sel);
  }

  function renderHorizon() {
    const h = T(), custom = PRESETS.every(([m]) => m !== h);
    $('ovHorizon').innerHTML = PRESETS.map(([m, l]) => `<button type="button" data-h="${m}" class="${m === h ? 'active' : ''}" aria-pressed="${m === h}">${l}</button>`).join('')
      + (custom ? `<button type="button" class="active" aria-pressed="true" title="Custom horizon from an earlier version">${FT.horizonLabel(h)}</button>` : '');
  }

  // ---------- events ----------
  function bind() {
    $('ovHorizon').addEventListener('click', (e) => {
      const b = e.target.closest('[data-h]');
      if (!b) return;
      S().settings.horizon = +b.dataset.h;
      sel = T(); // show the end of the new horizon
      renderHorizon(); build(); update();
      if (cb.onSettings) cb.onSettings();
    });
    $('ovGroup').addEventListener('change', (e) => { mode = e.target.value; focus = null; build(); update(); });
    $('taxToggle').addEventListener('change', (e) => { S().settings.applyTax = e.target.checked; build(); update(); if (cb.onSettings) cb.onSettings(); });
    $('gainPeriodSelect').addEventListener('change', (e) => { S().settings.gainPeriod = e.target.value; update(); FT.save(); });
    $('allocLegend').addEventListener('click', (e) => {
      const row = e.target.closest('[data-key]');
      if (!row) return;
      focus = focus === row.dataset.key ? null : row.dataset.key;
      build(); update();
    });
    // click or drag on the chart to move the selected month
    const canvas = $('ovChart');
    const scrub = (e) => {
      if (!chart) return;
      const x = e.clientX - canvas.getBoundingClientRect().left;
      sel = Math.max(0, Math.min(T(), Math.round(chart.scales.x.getValueForPixel(x))));
      update();
    };
    canvas.style.touchAction = 'pan-y';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'slider');
    canvas.setAttribute('aria-label', 'Month shown');
    canvas.setAttribute('aria-valuemin', '0');
    canvas.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -6, PageUp: 6 }[e.key];
      if (step === undefined && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      sel = e.key === 'Home' ? 0 : e.key === 'End' ? T() : Math.max(0, Math.min(T(), sel + step));
      update();
    });
    canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); scrub(e); });
    canvas.addEventListener('pointermove', (e) => { if (e.buttons & 1) scrub(e); });
  }

  FT.overview = {
    mount(el, callbacks) { root = el; cb = callbacks || {}; root.innerHTML = MARKUP; bind(); this.render(true); },
    // Rebuild from state. `resetSel` jumps to the end of the horizon (initial load / import / reset).
    render(resetSel) {
      if (resetSel) { sel = T(); focus = null; }
      $('taxToggle').checked = S().settings.applyTax;
      $('gainPeriodSelect').value = S().settings.gainPeriod;
      $('ovGroup').value = mode;
      renderHorizon(); build(); update();
    },
    refreshCharts() { build(); },
    selected: () => Math.max(0, Math.min(sel, T())),
    selectedLabel: () => (sel === 0 ? 'today' : FT.monthLabel(monthKey(sel))),
  };
})();
