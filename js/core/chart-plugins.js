/* Chart.js helpers shared by the views: theme ink, plugins. */
(function () {
  const FT = window.FT;
  const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

  FT.currentTheme = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  FT.palette = () => (FT.currentTheme() === 'dark' ? FT.PALETTE_DARK : FT.PALETTE);
  // an account's colour: the one the user picked, else its slot in the palette
  FT.accountColor = (acc) => (FT.isColor(acc.color) ? acc.color : FT.palette()[acc.colorIdx % FT.palette().length]);
  FT.hexToRgba = (hex, a) => {
    const h = hex.replace('#', '');
    return `rgba(${parseInt(h.substr(0, 2), 16)},${parseInt(h.substr(2, 2), 16)},${parseInt(h.substr(4, 2), 16)},${a})`;
  };
  FT.chartInk = () => {
    const cs = getComputedStyle(document.documentElement);
    const g = (v) => cs.getPropertyValue(v).trim();
    return { text: g('--text-secondary'), grid: g('--grid'), surface: g('--surface-1'), primary: g('--text-primary'), muted: g('--text-muted'), good: g('--good'), bad: g('--critical') };
  };
  FT.chartFont = FONT;

  // The scrubber: dashed vertical line at the selected month, a dot riding on top of the
  // plotted total, and a small month tag. Options: { index, label, values[], color, text }.
  Chart.register({
    id: 'currentMonthMarker',
    afterDatasetsDraw(chart, args, opts) {
      if (!opts || opts.index == null) return;
      const x = chart.scales.x, y = chart.scales.y, area = chart.chartArea;
      if (!x || !y) return;
      const px = x.getPixelForValue(Math.max(0, Math.min(opts.index, chart.data.labels.length - 1)));
      const v = opts.values ? opts.values[opts.index] : null;
      const py = v == null ? null : Math.max(area.top, Math.min(area.bottom, y.getPixelForValue(v)));
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = opts.color || '#999';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, area.top); ctx.lineTo(px, area.bottom); ctx.stroke();
      ctx.setLineDash([]);
      if (py !== null) {
        ctx.fillStyle = opts.color || '#999';
        ctx.strokeStyle = opts.text || '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (opts.label) {
        ctx.font = `700 11px ${FONT}`;
        const w = ctx.measureText(opts.label).width + 14, h = 20;
        const bx = Math.max(area.left, Math.min(area.right - w, px - w / 2)), by = area.top - h - 4;
        ctx.fillStyle = opts.color || '#999';
        ctx.beginPath(); ctx.roundRect(bx, by, w, h, 6); ctx.fill();
        ctx.fillStyle = opts.text || '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(opts.label, bx + w / 2, by + h / 2 + 0.5);
      }
      ctx.restore();
    },
  });
})();
