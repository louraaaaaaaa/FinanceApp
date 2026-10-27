/* Shared helpers: formatting, dates, ids, bank icons, toast. Everything hangs off window.FT. */
(function () {
  const FT = (window.FT = window.FT || {});
  FT.views = {};

  // ---------- formatting ----------
  const eur0 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const eur2 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
  FT.fmtEUR = (n) => eur0.format(n);
  FT.fmtEUR2 = (n) => eur2.format(n);
  FT.fmtSigned = (n) => (n >= 0 ? '+' : '') + eur0.format(n);
  FT.fmtPct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
  FT.escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  FT.num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  FT.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  // ---------- dates ----------
  // "Month keys" are 'YYYY-MM' strings; they sort correctly as plain strings.
  FT.dateStrOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  FT.todayISO = () => FT.dateStrOf(new Date());
  FT.toMonthIndex = (str) => { const [y, m] = String(str).split('-'); return +y * 12 + (+m - 1); };
  FT.monthsBetween = (a, b) => FT.toMonthIndex(b) - FT.toMonthIndex(a);
  FT.addMonthsDate = (dateStr, m) => { const [y, mo] = dateStr.split('-'); return new Date(+y, +mo - 1 + m, 1); };
  FT.monthKeyOf = (idx) => `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
  FT.addMonthsKey = (key, n) => FT.monthKeyOf(FT.toMonthIndex(key) + n);
  FT.currentMonthKey = () => FT.todayISO().slice(0, 7);
  FT.isMonthKey = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s || '');
  FT.monthLabel = (key, long) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-GB', long ? { month: 'long', year: 'numeric' } : { month: 'short', year: '2-digit' });
  };
  FT.horizonLabel = (months) => {
    const years = Math.floor(months / 12), rem = months % 12, parts = [];
    if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
    if (rem) parts.push(`${rem} month${rem === 1 ? '' : 's'}`);
    return parts.join(' ') || '0 months';
  };

  // ---------- bank icons ----------
  // Stylised monogram tiles (not official logos). To use a real logo, drop an image
  // in assets/banks/ and set `logo: 'assets/banks/name.png'` on the bank (see README).
  const WALLET = '<svg viewBox="0 0 24 24" width="55%" height="55%" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h11v3"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14" r="1.1" fill="currentColor"/></svg>';
  FT.bankIcon = (bank, size = 36) => {
    const box = `width:${size}px;height:${size}px;`;
    if (bank.logo) return `<span class="bank-icon has-logo" style="${box}"><img src="${FT.escapeHtml(bank.logo)}" alt=""></span>`;
    if (bank.text) {
      const t = String(bank.text).slice(0, 3), fs = Math.round(size * (t.length > 2 ? 0.3 : t.length > 1 ? 0.4 : 0.5));
      return `<span class="bank-icon" style="${box}background:${bank.color};color:${FT.contrastInk(bank.color)};font-size:${fs}px">${FT.escapeHtml(t)}</span>`;
    }
    if (FT.isIcon && FT.isIcon(bank.icon)) return `<span class="bank-icon" style="${box}background:${bank.color};color:${FT.contrastInk(bank.color)}">${FT.iconSvg(bank.icon).replace('<svg ', `<svg style="width:58%;height:58%" `)}</span>`;
    if (bank.glyph === 'wallet') return `<span class="bank-icon" style="${box}background:${bank.color};color:#fff">${WALLET}</span>`;
    const mono = bank.mono || (bank.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const fs = Math.round(size * (mono.length > 2 ? 0.3 : 0.38));
    return `<span class="bank-icon" style="${box}background:${bank.color};color:#fff;font-size:${fs}px">${FT.escapeHtml(mono)}</span>`;
  };

  // ---------- toast (with optional Undo) ----------
  let toastTimer;
  FT.toast = (msg, actionLabel, onAction) => {
    const el = document.getElementById('toast');
    (document.querySelector('dialog[open]') || document.body).appendChild(el); // a modal dialog covers everything outside it
    el.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = msg;
    el.appendChild(span);
    if (actionLabel) {
      const b = document.createElement('button');
      b.textContent = actionLabel;
      b.addEventListener('click', () => { el.hidden = true; onAction(); });
      el.appendChild(b);
    }
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 7000);
  };
})();
