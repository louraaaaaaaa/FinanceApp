/* State, persistence (localStorage), migration from the single-file v2 app, demo data. */
(function () {
  const FT = window.FT;
  const KEY = 'finance-tracker-v3';
  const OLD_KEY = 'finance-tracker-data-v2'; // left untouched so the legacy files keep working
  FT.THEME_KEY = 'finance-tracker-theme-v1';
  FT.PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
  FT.PALETTE_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

  FT.INCOME_CATS = ['Salary', 'Freelance / side income', 'Benefits', 'Investments', 'Gifts', 'Other'];
  FT.EXPENSE_CATS = ['Housing', 'Food & groceries', 'Transport', 'Utilities', 'Subscriptions', 'Health', 'Leisure & dining', 'Shopping', 'Travel', 'Taxes & fees', 'Other'];
  FT.TYPE_LABELS = { checking: 'Checking / cash', savings: 'Savings', investment: 'Investment' };

  FT.state = null;
  FT.storageOK = true;
  FT.onSaveStatus = () => {};

  FT.defaultBanks = () => [
    { id: 'cash', name: 'Cash', color: '#1baf7a', accent: '#1baf7a', glyph: 'wallet' },
    { id: 'montepio', name: 'Montepio', color: '#d7282f', accent: '#e34948', mono: 'M' },
    { id: 'trade-republic', name: 'Trade Republic', color: '#141414', accent: '#4a3aa7', mono: 'TR' },
    { id: 'trading-212', name: 'Trading 212', color: '#00a3a1', accent: '#00a3a1', mono: '212' },
    { id: 'revolut', name: 'Revolut', color: '#0666eb', accent: '#2a78d6', mono: 'R' },
  ];
  FT.bankAccent = (b) => b.accent || b.color;

  const DEMO_ACCOUNTS = [
    { bankId: 'cash', type: 'checking', name: 'Wallet', balance: 150, monthly: 0 },
    { bankId: 'montepio', type: 'checking', name: 'Checking account', balance: 1200, monthly: 100 },
    { bankId: 'montepio', type: 'savings', name: 'Savings account', balance: 4000, monthly: 50, rate: 1.5, cadence: 'semiannual' },
    { bankId: 'revolut', type: 'savings', name: 'Instant Savings', balance: 2500, monthly: 150, rate: 2.5, cadence: 'monthly' },
    { bankId: 'trade-republic', type: 'savings', name: 'Cash interest', balance: 800, monthly: 50, rate: 3, cadence: 'monthly' },
    { bankId: 'trade-republic', type: 'investment', name: 'ETFs (VWCE)', invested: 2200, balance: 2400, monthly: 150, rate: 6, cadence: 'annual' },
    { bankId: 'trading-212', type: 'investment', name: 'Invest pie', invested: 1500, balance: 1800, monthly: 100, rate: 7, cadence: 'quarterly' },
  ];
  function demoEntries() {
    const from = FT.addMonthsKey(FT.currentMonthKey(), -5);
    const mk = (kind, category, label, amount) => ({ id: FT.uid(), kind, category, label, amount, month: from, recurring: true, until: '', skip: [], icon: '', color: '' });
    return [
      mk('income', 'Salary', 'Day job', 1800),
      mk('expense', 'Housing', 'Rent', 600),
      mk('expense', 'Food & groceries', 'Groceries', 250),
      mk('expense', 'Transport', 'Pass + fuel', 60),
      mk('expense', 'Subscriptions', 'Streaming, phone', 35),
      mk('expense', 'Leisure & dining', '', 120),
    ];
  }

  // ---------- normalisation (also used for import) ----------
  function normalizeAccount(a, bankIds) {
    let type = a.type;
    if (type === 'cash') type = (+a.rate || 0) > 0 ? 'savings' : 'checking'; // v1 legacy
    if (!['checking', 'savings', 'investment'].includes(type)) type = 'checking';
    return {
      id: a.id || FT.uid(),
      bankId: bankIds.includes(a.bankId) ? a.bankId : 'cash',
      colorIdx: Number.isFinite(a.colorIdx) ? a.colorIdx : null, // assigned below
      type,
      name: a.name || '',
      icon: FT.isIcon(a.icon) ? a.icon : '',   // '' = default for the account type
      color: FT.isColor(a.color) ? a.color : '', // '' = palette colour
      text: FT.cleanText(a.text),               // 1-3 letters shown instead of the icon
      invested: +a.invested || 0,
      balance: +a.balance || 0,
      monthly: +a.monthly || 0,
      rate: type === 'checking' ? 0 : +a.rate || 0,
      tax: a.tax === undefined ? 28 : +a.tax || 0,
      cadence: FT.CADENCE_MONTHS[a.cadence] ? a.cadence : 'monthly',
      asOfDate: /^\d{4}-\d{2}-\d{2}$/.test(a.asOfDate || '') ? a.asOfDate : FT.todayISO(),
    };
  }
  function assignColors(accounts) {
    let next = accounts.reduce((m, a) => Math.max(m, a.colorIdx === null ? -1 : a.colorIdx), -1) + 1;
    accounts.forEach((a) => { if (a.colorIdx === null) a.colorIdx = next++; });
  }
  function normalizeEmployer(e) {
    const mk = (v) => (FT.isMonthKey(v) ? v : '');
    const byFrom = (a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0);
    return {
      id: e.id || FT.uid(),
      name: String(e.name || 'Employer').slice(0, 60),
      icon: FT.isIcon(e.icon) ? e.icon : '',
      color: FT.isColor(e.color) ? e.color : '',
      text: FT.cleanText(e.text),
      salary: (Array.isArray(e.salary) ? e.salary : []).filter((p) => p && FT.isMonthKey(p.from)).map((p) => ({ from: p.from, amount: Math.max(0, +p.amount || 0) })).sort(byFrom),
      overrides: (Array.isArray(e.overrides) ? e.overrides : []).filter((o) => o && FT.isMonthKey(o.month)).map((o) => ({ month: o.month, amount: Math.max(0, +o.amount || 0) })),
      endMonth: mk(e.endMonth),
    };
  }
  function normalizeEntry(e) {
    return {
      id: e.id || FT.uid(),
      kind: e.kind === 'income' ? 'income' : 'expense',
      category: e.category || 'Other',
      label: e.label || '',
      icon: FT.isIcon(e.icon) ? e.icon : '',   // '' = default for the category
      color: FT.isColor(e.color) ? e.color : '',
      text: FT.cleanText(e.text),
      amount: Math.max(0, +e.amount || 0),
      month: FT.isMonthKey(e.month) ? e.month : FT.currentMonthKey(),
      recurring: !!e.recurring,
      until: FT.isMonthKey(e.until) ? e.until : '',
      skip: Array.isArray(e.skip) ? e.skip.filter(FT.isMonthKey) : [], // months a recurring item is paused
    };
  }
  function normalizeSettings(s) {
    s = s || {};
    const h = Number.isFinite(s.horizon) ? s.horizon : Number.isFinite(s.horizonMonths) ? s.horizonMonths : 12;
    return {
      horizon: Math.max(1, Math.min(60, Math.round(h))),
      applyTax: !!s.applyTax,
      gainPeriod: ['daily', 'weekly', 'monthly', 'yearly'].includes(s.gainPeriod) ? s.gainPeriod : 'daily',
    };
  }
  // Accepts a v3 state, a v2 export ({accounts with bank names}) or a v1 bare array.
  FT.normalizeState = function (raw) {
    if (!raw || typeof raw !== 'object') throw new Error('bad data');
    const isV3 = raw.version === 3 && Array.isArray(raw.banks);
    const list = Array.isArray(raw) ? raw : raw.accounts;
    if (!Array.isArray(list)) throw new Error('no accounts');
    let banks = isV3
      ? raw.banks.filter((b) => b && b.id && b.name).map((b) => ({ ...b, color: b.color || '#2a78d6' }))
      : FT.defaultBanks();
    if (!isV3) {
      // v2 stored the bank as a free-text name; map it onto a bank, creating one if new.
      list.forEach((a) => {
        const name = String(a.bank || '').trim();
        if (!name) { a.bankId = 'cash'; return; }
        let b = banks.find((x) => x.name.toLowerCase() === name.toLowerCase());
        if (!b) { b = FT.newBank(name, FT.PALETTE[banks.length % FT.PALETTE.length]); banks.push(b); }
        a.bankId = b.id;
      });
    }
    const ids = banks.map((b) => b.id);
    const accounts = list.map((a) => normalizeAccount(a, ids));
    assignColors(accounts);
    const cf = (isV3 && raw.cashflow) || {};
    // 3.13.0 removed employer bonuses: keep any that were registered as one-off income items in the month they were paid.
    const bonusEntries = [];
    (Array.isArray(cf.employers) ? cf.employers : []).forEach((emp) => {
      (emp && Array.isArray(emp.bonuses) ? emp.bonuses : []).forEach((b) => {
        const amount = (Array.isArray(b.q) ? b.q : []).reduce((t, v) => t + (+v || 0), 0);
        const y = Math.round(+b.year) || new Date().getFullYear();
        if (amount > 0) bonusEntries.push({ kind: 'income', category: 'Salary', label: `${emp.name || 'Employer'} bonus ${y}`, amount, month: FT.isMonthKey(b.payMonth) ? b.payMonth : `${y + 1}-01`, recurring: false });
      });
    });
    return {
      version: 3,
      settings: normalizeSettings(raw.settings || raw),
      banks,
      accounts,
      cashflow: {
        entries: (Array.isArray(cf.entries) ? cf.entries : []).concat(bonusEntries).map(normalizeEntry),
        month: FT.isMonthKey(cf.month) ? cf.month : FT.currentMonthKey(),
        employers: (Array.isArray(cf.employers) ? cf.employers : []).filter(Boolean).map(normalizeEmployer),
      },
      ui: { tab: ['projections', 'cashflow'].includes((raw.ui || {}).tab) ? raw.ui.tab : 'projections' },
    };
  };

  FT.newBank = (name, color) => ({ id: 'b-' + FT.uid(), name, color, accent: color });
  FT.newAccount = function (bankId, type) {
    const a = normalizeAccount({ bankId, type, tax: 28 }, [bankId]);
    a.colorIdx = FT.state.accounts.reduce((m, x) => Math.max(m, x.colorIdx), -1) + 1;
    return a;
  };

  FT.demoState = function () {
    const st = FT.normalizeState({ version: 3, banks: FT.defaultBanks(), accounts: DEMO_ACCOUNTS.map((a) => ({ tax: 28, ...a })) });
    st.cashflow.entries = demoEntries();
    return st;
  };

  // ---------- persistence ----------
  FT.testStorage = function () {
    try { localStorage.setItem('__ft__', '1'); localStorage.removeItem('__ft__'); return true; } catch (e) { return false; }
  };
  FT.load = function () {
    FT.storageOK = FT.testStorage();
    let st = null;
    if (FT.storageOK) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) st = FT.normalizeState(JSON.parse(raw));
        else {
          const old = localStorage.getItem(OLD_KEY);
          if (old) { st = FT.normalizeState(JSON.parse(old)); st.cashflow.entries = demoEntries(); st.migrated = true; }
        }
      } catch (e) { st = null; }
    }
    FT.state = st && st.accounts.length ? st : FT.demoState();
    FT.onSaveStatus(FT.storageOK);
  };
  FT.save = function () {
    if (!FT.storageOK) return FT.onSaveStatus(false);
    try { localStorage.setItem(KEY, JSON.stringify(FT.state)); FT.onSaveStatus(true); } catch (e) { FT.onSaveStatus(false); }
  };
})();
