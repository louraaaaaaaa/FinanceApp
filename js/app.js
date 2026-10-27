/* App shell: theme, tabs, data menu (export / import / reset), autosave pill. */
(function () {
  const FT = window.FT;
  const $ = (id) => document.getElementById(id);
  const TABS = ['projections', 'cashflow'];

  // ---------- theme ----------
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    $('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
    const meta = $('themeColor');
    if (meta) meta.content = t === 'dark' ? '#111821' : '#f3f6fb'; // colours the phone's status bar
    try { localStorage.setItem(FT.THEME_KEY, t); } catch (e) {}
    if (FT.state) Object.values(FT.views).forEach((v) => v.refreshCharts && v.refreshCharts());
  }

  // ---------- tabs ----------
  function showTab(tab, save) {
    if (!TABS.includes(tab)) tab = 'projections';
    document.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    TABS.forEach((t) => { $('view-' + t).hidden = t !== tab; });
    FT.state.ui.tab = tab;
    if (location.hash.slice(1) !== tab) history.replaceState(null, '', '#' + tab);
    if (save) FT.save();
    // charts built while hidden have no size — redraw now that the tab is visible
    FT.views[tab].refreshCharts();
  }

  // ---------- autosave pill ----------
  FT.onSaveStatus = (ok) => {
    $('autosavePill').classList.toggle('warn', !ok);
    $('autosaveText').textContent = !ok ? 'Storage unavailable — use Export to save' : 'Saved on this device only';
  };

  function renderAllViews() { FT.views.projections.render(); FT.views.cashflow.render(); }

  // ---------- data menu ----------
  function bindDataMenu() {
    const menu = $('dataMenu');
    const close = () => { menu.open = false; };
    document.addEventListener('click', (e) => { if (!menu.contains(e.target)) close(); });

    $('exportBtn').addEventListener('click', () => {
      close();
      const blob = new Blob([JSON.stringify(FT.state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance-tracker-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    $('importBtn').addEventListener('click', () => { close(); $('importFile').click(); });
    $('importFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        let next;
        try { next = FT.normalizeState(JSON.parse(ev.target.result)); } catch (err) { return alert('Could not read that file — make sure it is a JSON export from this tool.'); }
        if (!confirm(`Replace everything currently in the app with the contents of “${file.name}”? (Export first if you want a backup.)`)) return;
        // v2 exports have no cash-flow data: keep what's already logged rather than wiping it.
        if (!next.cashflow.entries.length) next.cashflow = FT.state.cashflow;
        next.ui.tab = FT.state.ui.tab;
        FT.state = next;
        renderAllViews();
        FT.save();
      };
      reader.readAsText(file);
    });
    $('resetBtn').addEventListener('click', () => {
      close();
      if (!confirm('Reset everything back to the demo data? This clears all accounts and income/expense entries in this browser.')) return;
      const tab = FT.state.ui.tab;
      FT.state = FT.demoState();
      FT.state.ui.tab = tab;
      renderAllViews();
      FT.save();
    });
  }

  // ---------- init ----------
  function init() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    $('themeBtn').addEventListener('click', () => applyTheme(FT.currentTheme() === 'dark' ? 'light' : 'dark'));
    FT.load();
    // tab icons are only shown by the phone layout's bottom bar
    const tabIcons = { projections: 'chart', cashflow: 'coins' };
    document.querySelectorAll('[data-tab]').forEach((b) => b.insertAdjacentHTML('afterbegin', `<span class="tab-ic">${FT.iconSvg(tabIcons[b.dataset.tab])}</span>`));

    FT.views.projections.mount($('view-projections'));
    FT.views.cashflow.mount($('view-cashflow'));
    document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab, true)));
    window.addEventListener('hashchange', () => showTab(location.hash.slice(1), true));
    bindDataMenu();

    showTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : FT.state.ui.tab, false);
    if (FT.state.migrated) {
      delete FT.state.migrated;
      FT.toast('Imported your accounts from the previous version. Your old data is untouched.');
    }
    FT.save();
  }
  init();
})();
