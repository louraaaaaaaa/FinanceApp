/* Icon library, coloured icon "badges", defaults per account type / category, and the icon picker popover.
   Icons are simple inline SVG (24x24, stroke) so they inherit colour and need no files. */
(function () {
  const FT = window.FT;
  const esc = FT.escapeHtml;

  const ICONS = {
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h11v3"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="16.5" cy="14" r="1.1" fill="currentColor"/>',
    bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 20h18"/>',
    piggy: '<path d="M4 12.5C4 9.5 7 7.5 11 7.5h2c3 0 5.5 1.5 6.2 3.8L21 11.5v3l-1.8.3c-.4.9-1.1 1.7-2 2.3V19h-3v-1.3h-4V19H7.2v-2.2C5.3 16 4 14.4 4 12.5z"/><circle cx="15.5" cy="11.5" r=".8" fill="currentColor"/><path d="M10 7.5c0-1.2 1-2 2-2"/>',
    chart: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    coins: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/><path d="M6 15h4"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6l8-3z"/>',
    star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9L12 3z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
    laptop: '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M2.5 19h19"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><path d="M12 8c-1.5-3-5-3.5-5-1.5S10 8 12 8zM12 8c1.5-3 5-3.5 5-1.5S14 8 12 8z"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    car: '<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16"/><rect x="3" y="16" width="18" height="4" rx="1.5"/><circle cx="7.5" cy="18" r=".9" fill="currentColor"/><circle cx="16.5" cy="18" r=".9" fill="currentColor"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.7 12.4a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L21 7H6"/>',
    utensils: '<path d="M6 3v7a2 2 0 0 0 2 2v9"/><path d="M10 3v7"/><path d="M6 3v7"/><path d="M17 3c-2 1.5-3 4-3 7h3v11"/>',
    coffee: '<path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9z"/><path d="M17 11h2a2 2 0 0 1 0 4h-2"/><path d="M8 3v3M12 3v3"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    plane: '<path d="M21 3L3 10.5l6.5 2.5L12 20l2.5-6.5L21 3z"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
    graduation: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2" fill="currentColor"/>',
  };
  FT.ICON_NAMES = Object.keys(ICONS);
  FT.isIcon = (n) => Object.prototype.hasOwnProperty.call(ICONS, n);
  FT.isColor = (c) => /^#[0-9a-f]{6}$/i.test(c || '');

  FT.iconSvg = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.tag}</svg>`;
  // Dark glyph on light backgrounds, white on dark ones.
  FT.contrastInk = (hex) => {
    const h = (hex || '#888888').replace('#', '');
    const lum = (0.299 * parseInt(h.substr(0, 2), 16) + 0.587 * parseInt(h.substr(2, 2), 16) + 0.114 * parseInt(h.substr(4, 2), 16)) / 255;
    return lum > 0.62 ? '#14181f' : '#ffffff';
  };
  // A coloured tile showing either a library icon or 1-3 letters (`text` wins when set).
  FT.badge = (icon, color, size = 34, text = '') => {
    const base = `width:${size}px;height:${size}px;background:${color};color:${FT.contrastInk(color)}`;
    if (text) {
      const fs = Math.round(size * (text.length > 2 ? 0.3 : text.length > 1 ? 0.4 : 0.5));
      return `<span class="badge badge-text" style="${base};font-size:${fs}px">${esc(text)}</span>`;
    }
    return `<span class="badge" style="${base}">${FT.iconSvg(icon)}</span>`;
  };
  FT.cleanText = (t) => (typeof t === 'string' ? t.trim().slice(0, 3) : '');

  // ---------- defaults ----------
  const ACCOUNT_ICON = { checking: 'wallet', savings: 'piggy', investment: 'chart' };
  FT.accountIcon = (acc) => (FT.isIcon(acc.icon) ? acc.icon : ACCOUNT_ICON[acc.type] || 'wallet');
  FT.accountBadge = (acc, size) => FT.badge(FT.accountIcon(acc), FT.accountColor(acc), size, acc.text);

  FT.CATEGORY_STYLE = {
    'Salary': { icon: 'briefcase', color: '#1baf7a' },
    'Freelance / side income': { icon: 'laptop', color: '#00a3a1' },
    'Benefits': { icon: 'shield', color: '#2a78d6' },
    'Investments': { icon: 'chart', color: '#4a3aa7' },
    'Gifts': { icon: 'gift', color: '#e87ba4' },
    'Housing': { icon: 'home', color: '#2a78d6' },
    'Food & groceries': { icon: 'cart', color: '#eb6834' },
    'Transport': { icon: 'car', color: '#00a3a1' },
    'Utilities': { icon: 'bolt', color: '#eda100' },
    'Subscriptions': { icon: 'repeat', color: '#4a3aa7' },
    'Health': { icon: 'heart', color: '#e34948' },
    'Leisure & dining': { icon: 'film', color: '#e87ba4' },
    'Shopping': { icon: 'bag', color: '#8b5cf6' },
    'Travel': { icon: 'plane', color: '#1baf7a' },
    'Taxes & fees': { icon: 'receipt', color: '#6b7280' },
    'Other': { icon: 'tag', color: '#6b7280' },
  };
  FT.categoryStyle = (cat) => FT.CATEGORY_STYLE[cat] || FT.CATEGORY_STYLE.Other;
  FT.entryStyle = (e) => {
    const d = FT.categoryStyle(e.category);
    return { icon: FT.isIcon(e.icon) ? e.icon : d.icon, color: FT.isColor(e.color) ? e.color : d.color, text: e.text || '' };
  };
  FT.entryBadge = (e, size) => { const s = FT.entryStyle(e); return FT.badge(s.icon, s.color, size, s.text); };

  // ---------- picker ----------
  const SWATCHES = ['#2a78d6', '#4a3aa7', '#8b5cf6', '#e87ba4', '#e34948', '#eb6834', '#eda100', '#1baf7a', '#008300', '#00a3a1', '#6b7280', '#141414'];
  let pop = null, anchorEl = null, state = null, onChange = null, defaults = null;

  function close(returnFocus) {
    if (!pop) return;
    pop.remove();
    pop = null;
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('scroll', onScroll, true);
    if (returnFocus && anchorEl && document.contains(anchorEl)) anchorEl.focus();
    anchorEl = null;
  }
  function onOutside(e) { if (pop && !pop.contains(e.target) && !(anchorEl && anchorEl.contains(e.target))) close(false); }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); } } // preventDefault keeps a surrounding dialog open
  function onScroll(e) { if (pop && !pop.contains(e.target)) close(false); } // it is positioned against the viewport, so close rather than drift

  const previewHtml = (size) => (defaults.preview
    ? defaults.preview(state.icon, state.color || defaults.color, size, state.text)
    : FT.badge(state.icon || defaults.icon, state.color || defaults.color, size, state.text));

  // Built once per open; later changes only repaint the bits that change so typing keeps its focus.
  function build() {
    pop.innerHTML = `
      <div class="ip-head">${previewHtml(40)}<div><b>Icon, letters &amp; colour</b><div class="ks">Pick an icon, or type 1&ndash;3 letters.</div></div></div>
      <label class="ip-text"><span class="ip-label">Letters (instead of an icon)</span>
        <input type="text" data-text maxlength="3" placeholder="e.g. TR" autocomplete="off" spellcheck="false" aria-label="Letters or acronym" value="${esc(state.text)}"></label>
      <div class="ip-grid" role="group" aria-label="Icon">${FT.ICON_NAMES.map((n) => `<button type="button" class="ip-icon" data-icon="${n}" aria-label="${n}" title="${n}">${FT.iconSvg(n)}</button>`).join('')}</div>
      <div class="ip-label">Colour</div>
      <div class="ip-colors" role="group" aria-label="Colour">${SWATCHES.map((c) => `<button type="button" class="ip-sw" data-color="${c}" aria-label="${c}" style="background:${c}"></button>`).join('')}
        <label class="ip-custom" title="Custom colour"><input type="color" aria-label="Custom colour"></label></div>
      <div class="ip-foot"><button type="button" class="ghost small" data-reset>Use default</button><button type="button" class="primary small" data-done>Done</button></div>`;
    paint();
  }
  function paint() {
    const col = state.color || defaults.color, ic = state.icon || defaults.icon;
    pop.querySelector('.ip-head').firstElementChild.outerHTML = previewHtml(40);
    pop.querySelectorAll('.ip-icon').forEach((btn) => {
      const on = !state.text && btn.dataset.icon === ic;
      btn.setAttribute('aria-pressed', String(on));
      btn.style.background = on ? col : '';
      btn.style.color = on ? FT.contrastInk(col) : '';
    });
    pop.querySelectorAll('.ip-sw').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.color.toLowerCase() === col.toLowerCase())));
    const ci = pop.querySelector('input[type="color"]');
    if (FT.isColor(col) && ci.value !== col.toLowerCase()) ci.value = col;
    const ti = pop.querySelector('[data-text]');
    if (document.activeElement !== ti) ti.value = state.text;
  }
  function apply(next) {
    state = { ...state, ...next };
    onChange(state.icon, state.color, state.text);
    paint();
  }

  // anchor: the clicked element. initial: { icon, color, text } ('' = use default / none).
  // defs: { icon, color, preview? } defaults. onchg(icon, color, text) is called live on every change.
  FT.pickIcon = function (anchor, initial, defs, onchg) {
    const same = anchorEl === anchor && pop;
    close(false);
    if (same) return;
    anchorEl = anchor; defaults = defs; onChange = onchg;
    state = { icon: initial.icon || '', color: initial.color || '', text: FT.cleanText(initial.text) };
    pop = document.createElement('div');
    pop.id = 'iconPicker';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Choose icon, letters and colour');
    (anchor.closest('dialog') || document.body).appendChild(pop); // inside an open dialog, or it would be hidden behind it
    build();
    pop.addEventListener('click', (e) => {
      const i = e.target.closest('[data-icon]'), c = e.target.closest('[data-color]');
      if (i) apply({ icon: i.dataset.icon, text: '' }); // picking an icon replaces any letters
      else if (c) apply({ color: c.dataset.color });
      else if (e.target.closest('[data-reset]')) apply({ icon: '', color: '', text: '' });
      else if (e.target.closest('[data-done]')) close(true);
    });
    pop.addEventListener('input', (e) => {
      if (e.target.type === 'color') apply({ color: e.target.value });
      else if (e.target.matches('[data-text]')) apply({ text: FT.cleanText(e.target.value) });
    });
    pop.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-text]')) { e.preventDefault(); close(true); } });
    // position under the anchor, flipping above / clamping to the viewport when needed
    const r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.max(8, Math.min(r.left, innerWidth - w - 8));
    let top = r.bottom + 6;
    if (top + h > innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', onScroll, true);
    const first = pop.querySelector('.ip-icon[aria-pressed="true"]') || pop.querySelector('[data-text]');
    if (first) first.focus({ preventScroll: true });
  };
})();
