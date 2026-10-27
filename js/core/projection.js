/* Projection engine. Pure functions over an account + the global settings. */
(function () {
  const FT = window.FT;
  const P = (FT.proj = {});

  FT.CADENCE_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
  FT.CADENCE_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', semiannual: 'Semi-annual', annual: 'Annual' };
  const CADENCE = FT.CADENCE_MONTHS;

  const START = FT.todayISO();
  P.start = START;
  const applyTax = () => FT.state.settings.applyTax;
  const monthDate = (m) => FT.addMonthsDate(START, m);

  // An account's balance/invested are anchored to its own asOfDate. To find its value
  // at another date we count calendar months between the two and compound forward
  // (or hold flat if the target is earlier). Interest only compounds on the account's
  // cadence; contributions land every month. Returns balances and per-step credits.
  P.schedule = function (acc, k) {
    const periodLen = CADENCE[acc.cadence] || 1;
    const periodRate = (acc.rate / 100) * (periodLen / 12);
    const taxFactor = acc.type === 'investment' || !applyTax() ? 1 : 1 - acc.tax / 100;
    const balances = [acc.balance], credits = [0];
    let bal = acc.balance;
    for (let i = 1; i <= k; i++) {
      bal += acc.monthly;
      let credit = 0;
      if (i % periodLen === 0) { credit = bal * periodRate * taxFactor; bal += credit; }
      balances.push(bal);
      credits.push(credit);
    }
    return { balances, credits };
  };
  P.offsetFor = (acc, m) => FT.monthsBetween(acc.asOfDate, FT.dateStrOf(monthDate(m)));
  P.globalMonthForOffset = (acc, k) => FT.monthsBetween(START, FT.dateStrOf(FT.addMonthsDate(acc.asOfDate, k)));

  // Contributions made so far + the original cost basis.
  P.invested = function (acc, m) {
    const base = acc.type === 'investment' && acc.invested > 0 ? acc.invested : acc.balance;
    return base + acc.monthly * Math.max(P.offsetFor(acc, m), 0);
  };
  // Projected value at global month m (0 = this month). Investment gains are taxed
  // only on the unrealised gain, as if sold at that point.
  P.value = function (acc, m) {
    const k = P.offsetFor(acc, m);
    const raw = k <= 0 ? acc.balance : P.schedule(acc, k).balances[k];
    if (acc.type !== 'investment' || !applyTax()) return raw;
    const inv = P.invested(acc, m), gain = raw - inv;
    return gain > 0 ? inv + gain * (1 - acc.tax / 100) : raw;
  };
  P.gain = (acc, m) => P.value(acc, m) - P.invested(acc, m);
  P.series = (acc, months) => Array.from({ length: months + 1 }, (_, m) => P.value(acc, m));
  // Smooth "a day's worth of growth" at today's balance, independent of credit dates.
  P.dailyGain = (acc) => (acc.rate > 0 ? (P.value(acc, 0) * acc.rate) / 100 / 365 : 0);

  P.sum = (accounts, fn) => accounts.reduce((s, a) => s + fn(a), 0);

  // Every interest/return credit between today and the horizon, chronological.
  // Investment credits are shown before tax (tax only bites on sale).
  P.creditEvents = function (accounts, horizon) {
    const events = [];
    accounts.forEach((acc) => {
      if (!(acc.rate > 0)) return;
      const periodLen = CADENCE[acc.cadence] || 1;
      const kMax = P.offsetFor(acc, horizon);
      if (kMax < periodLen) return;
      const sched = P.schedule(acc, kMax);
      for (let k = periodLen; k <= kMax; k += periodLen) {
        const gm = P.globalMonthForOffset(acc, k);
        if (gm < 0 || gm > horizon) continue;
        events.push({ date: FT.addMonthsDate(acc.asOfDate, k), acc, amount: sched.credits[k] });
      }
    });
    return events.sort((a, b) => a.date - b.date);
  };
})();
