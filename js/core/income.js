/* Employer income: a salary history (what you usually receive, from which month) and the months that
   differed. Pure helpers over FT.state.cashflow.employers. */
(function () {
  const FT = window.FT;
  const I = (FT.income = {});

  I.DEFAULT = { icon: 'briefcase', color: '#1baf7a' };
  I.badge = (emp, size) => FT.badge(FT.isIcon(emp.icon) ? emp.icon : I.DEFAULT.icon, FT.isColor(emp.color) ? emp.color : I.DEFAULT.color, size, emp.text);

  // The usual monthly pay in `key`: the period with the latest start month that is <= key.
  I.usual = (emp, key) => {
    let best = null;
    emp.salary.forEach((p) => { if (p.from <= key && (!best || p.from >= best.from)) best = p; });
    return best ? best.amount : 0;
  };
  I.override = (emp, key) => emp.overrides.find((o) => o.month === key);
  I.ended = (emp, key) => !!emp.endMonth && key > emp.endMonth;

  // What is received in `key`: a registered month wins over the usual amount.
  I.salaryAt = (emp, key) => {
    const usual = I.ended(emp, key) ? 0 : I.usual(emp, key);
    const o = I.override(emp, key);
    return { amount: o ? o.amount : usual, usual, overridden: !!o };
  };

  // Should this employer appear in the list for `key`?
  I.visible = (emp, key) => {
    const started = emp.salary.some((p) => p.from <= key) && !I.ended(emp, key);
    return started || !!I.override(emp, key);
  };
  I.monthTotal = (key) => FT.state.cashflow.employers.reduce((s, e) => s + I.salaryAt(e, key).amount, 0);

  I.newEmployer = (name, month) => ({
    id: FT.uid(), name, icon: '', color: '', text: '',
    salary: [{ from: month, amount: 0 }], overrides: [], endMonth: '',
  });
})();
