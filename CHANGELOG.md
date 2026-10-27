# Changelog

Newest first. Each entry says what changed, why, and how to fall back if needed.
Convention: add an entry for every relevant change (new feature, data-model change, bug fix, removal).
Bump the data `version` and note it here whenever the saved-data shape changes.

---

## [3.14.0] — 2026-10-27 — App identity refresh and documentation

### Changed
- Refreshed the installed-app icon artwork for standard, maskable, and Apple touch sizes.
- Expanded the README with current feature, data, privacy, and code-flow details.
- Service-worker cache bumped to `v3.14.0`; saved data shape unchanged.

## [3.13.0] — 2026-10-16 — Income/expense chart with past, future and expected returns; bonuses removed

**Fallback:** `FinanceApp-v3.12.0.zip`. Saved data: employers no longer have `bonuses` (see below); everything else unchanged.

### Changed
- **Income, expenses & returns chart** (Income & expenses tab) replaces "Last 12 months":
  - shows 6 months back, the current month and 5 ahead (3 + now + 2 on a phone); **‹ ›** move the window by 3 months, **Today** resets it;
  - future months are drawn as lighter bars (forecast from your "every month" items and employer pay);
  - new **Expected returns** bars come straight from the Projections tab — the interest/return credited in each month — on their own right-hand axis (they are much smaller than income); hovering a month lists which accounts pay out;
  - the month you are viewing is highlighted, and **clicking a month** opens it; the current month is labelled "now".
- Chart bars/line: Income, Expenses, Expected returns, and Net (income − expenses) as a line. Returns are not part of Net.

### Removed
- **Employer bonuses.** Use *+ Other income* (one-off, or "Every month"-style items as you prefer) for a yearly bonus.
- Existing bonuses are **not lost**: on first load each registered bonus year becomes a one-off income item ("<employer> bonus <year>", category Salary) in the month it was paid.

### Notes
- Months before today show no returns bars (projections only look forward).
- Service-worker cache bumped to `v3.13.0`.

---

## [3.12.0] — 2026-10-15 — Privacy by design: no accounts, no servers (cloud sync removed)

**Fallback:** `FinanceApp-v3.11.0.zip` still contains the optional Firebase sync if you ever want it back. Saved data shape unchanged.

### Why
The app is meant to be shared with friends, each running their own private copy. Nobody (including the author) should be able to see anyone's finances, and nothing should be stored on any server. Cloud sync needs an account database, so it was removed.

### Changed
- **Removed** the Firebase sync (`sync.js`, sync window, config, `SYNC.md`, mock server) and its Data-menu entry.
- **Content-Security-Policy** added to `index.html`: the page may only load its own files and `connect-src 'self'` means it **cannot send data to any other site**, even by mistake. (Verified: a request to an outside address is blocked.)
- Footer / save pill now say the data lives only on this device.
- Moving data between your own devices is done with Export/Import backup (or *Share backup…* on phones), which never touches a server.
- Service-worker cache bumped to `v3.12.0`.

---

## [3.11.0] — 2026-10-14 — Cloud sync between devices (Firebase)

**Fallback:** v3.10.0 zip. Saved data shape unchanged. Sync is off until `js/firebase-config.js` is filled in (see SYNC.md), so nothing changes for local-only use.

### New
- **Sync between phone and computer** with a Firebase account you own (Auth + Firestore through their REST API — no SDK, nothing vendored). Data ▾ → *Sign in to sync…* (create account / sign in / forgot password / sign out / sync now).
- Local-first and offline-safe: changes upload ~2 s after saving, are fetched on open/focus and every ~45 s; works offline and catches up.
- **Automatic merge** of edits made on two devices (3-way, item by item for banks, accounts, entries, employers; settings too) using a Firestore update-time precondition so nothing is silently overwritten.
- First sign-in on a device when the cloud already has data asks whether to load the cloud copy or overwrite it.
- Sync state shown in the autosave pill (desktop) and as a coloured dot on the Data menu (phone).
- New files: `js/core/sync.js`, `js/views/sync-ui.js`, `js/firebase-config.js`, `SYNC.md`, `.claude/mock-firebase.js` (fake Firebase for testing).
- Footer text updated (data can now leave the device if you opt in).

### Notes
- Only the synced part of the state is uploaded (not the open tab / viewed month).
- Sync is not a backup — keep exporting JSON backups.

---

## [3.10.0] — 2026-10-13 — Employers: pay history and quarterly bonuses

**Fallback:** v3.9.0 zip. Saved data gains `cashflow.employers` (empty by default); existing income items are untouched and keep working.

### New
- **Add an employer / company** (Income & expenses → Income → *+ Add employer*), e.g. INESC TEC, with its own icon/letters and colour. Each month it shows as a row with the pay received that month.
- **Monthly pay with history:** in *Pay history & bonuses* you list what you usually receive and from which month. Add a row for every change — and earlier rows to record what you were paid in the past. The amount for any month is the latest row starting on or before it.
- **Months that were different:** register a month where you received something other than the usual amount. You can also do this directly: go to that month and type the amount in the employer's pay box (it shows "Differs from the usual …" with a Reset button; typing the usual amount removes the exception).
- **Quarterly bonuses paid later:** for each year enter the Q1–Q4 bonus values and the month they are paid — it defaults to **January of the following year**, follows the year if you change it, and can be changed. The total counts as income **in the payout month** (shown as a "Bonus for 2025 (Q1–Q4), paid this month" line), not in the quarters they were earned.
- Optional **last month at this employer**, after which the pay stops (past months and bonuses already registered still count).
- Employer income feeds the monthly Income total, savings rate, the 12-month chart and the 6-month average, like any other income. Remove an employer (with confirmation and Undo).

### Notes
- Pay is the amount you actually receive (net). Other income (freelance, gifts, …) still uses *+ Other income*.
- Employers are included in Export/Import backups.

---

## [3.9.0] — 2026-10-13 — Bank details open in an overlapping window

**Fallback:** v3.8.0 zip. No saved-data change (the old per-bank "collapsed" flag is simply no longer used).

### Changed
- **Banks are now always compact tiles.** Click a tile (or its arrow) to open a **window over the page** with that bank's accounts and actions; close it with ✕, Esc or a click on the dimmed backdrop. Nothing expands inline any more, so the page stays short. On a phone the window is a full-screen sheet.
- Everything that used to be in the expanded bank is in the window: edit accounts (changes update the tile, Overview and credits live), add/remove accounts (with Undo), the bank's icon/colour picker, Change/Remove logo, Remove bank (when empty) and the ← Earlier / Later → buttons for touch screens.
- Reordering **banks** is still by dragging a tile's ⠿ handle. Reordering **accounts** inside a window is by dragging their ⠿ handle.

### New
- Each account card has a **Bank / app** selector, to move an account to another bank (accounts can no longer be dragged between banks since only one bank is visible at a time).

### Fixed / internal
- The icon picker and the toast now render inside an open window (a modal dialog covers everything outside it); the picker closes on scroll instead of drifting, and Esc closes the picker before the window.

---

## [3.8.0] — 2026-10-13 — Collapsed banks become compact tiles

**Fallback:** v3.7.1 zip. Layout only; no data change.

### Changed
- **Collapsed banks now sit side by side as compact tiles** (3 per row on a wide screen, 2 on a laptop, 1 on a phone) showing icon, name, account count and Now / In <month> / Gain. Expanded banks still take the full width. Collapsing every bank gives a one-screen overview of all of them.
- **Reordering banks works with the tiles:** drop on the left or right half of a tile (blue bar on that side) to place the bank before or after it; for full-width banks it is still the top or bottom half.

---

## [3.7.1] — 2026-10-13 — Credits breakdown shows only contributing accounts

**Fallback:** v3.7.0 zip (listed every account, dimming those that paid nothing).

### Changed
- The month breakdown in **Upcoming interest & returns** now shows only banks and accounts that actually pay something in the selected month; banks with nothing that month are hidden. An empty month shows "No account pays interest or returns this month." (Months with no credits can still be selected.)

---

## [3.7.0] — 2026-10-13 — Credits listed by bank/account for any month; reorder banks

**Fallback:** v3.6.0 zip. No data-shape change (bank order was already saved as the order of the `banks` list).

### Changed
- **Upcoming interest & returns → month breakdown now lists every bank and every account**, grouped by bank (in your bank order) with a subtotal per bank. Accounts with nothing paid that month are shown dimmed with "—" and a reason: when they next pay ("Semi-annual · next in Apr 27"), "none in this window", or "No interest or return set" for plain checking/cash.
- Months with no credits at all can now be selected too (the strip no longer skips them), which is handy for seeing when each account next pays.

### New
- **Reorder banks:** drag a bank by its ⠿ handle (left of its icon) and drop it above or below another bank. The order is saved and also used by the credits breakdown. On touch screens, where drag-and-drop doesn't work, each bank has **↑ Up / ↓ Down** buttons instead.

---

## [3.6.0] — 2026-10-13 — Mobile app (installable PWA) + phone layout

**Fallback:** v3.5.0 zip. No saved-data change. Everything below is additive; opening `index.html` from a folder on a computer works exactly as before.

### New
- **Installable app (PWA):** `manifest.webmanifest`, generated icons (`assets/icons/`: any, maskable, Apple touch icon) and a service worker (`sw.js`) that caches the app so it opens instantly and **works fully offline**. Your data is stored in the phone's localStorage, never in the cache and never sent anywhere.
- **Data menu additions:** *Install app on this device* (Android/Chrome/Edge; shows when the browser offers it), an iPhone hint ("Share → Add to Home Screen"), and *Share backup…* (opens the phone's share sheet to send the JSON to Drive, AirDrop, email, …). The app also asks the browser to treat its storage as persistent.
- **Phone layout (≤ 760 px wide):** bottom tab bar with icons, safe-area padding for notches/home bar, 16 px form fields (no iOS zoom-on-focus), bigger touch targets, account cards with a two-row header, income/expense rows stacked (category + remove, description, amount, recurrence), and the icon picker as a bottom sheet. Drag-and-drop reordering is hidden on touch screens. Status-bar colour follows the light/dark theme.

### How to get it on a phone
An installable app must be served over **https** (or localhost). See "Using it on your phone" in the README — the short version is to put this folder on any free static host (e.g. Netlify Drop, Cloudflare Pages, GitHub Pages). The host only ever sees the app's files, not your finances.

### Notes
- Service worker updates: it serves the cached copy and refreshes it in the background, so a new version appears the **next** time you open the app. Bump `VERSION` in `sw.js` on each release.
- On `localhost` the service worker is off (to keep development fresh) unless you add `?sw=1` to the URL.
- Data does not sync between devices yet: use Share/Export on one and Import on the other.

---

## [3.5.0] — 2026-10-13 — Letters or acronyms instead of an icon

**Fallback:** v3.4.1 zip. Accounts, cash-flow items and banks gain an optional `text` field (1–3 characters); empty = show the icon as before.

### New
- The icon picker now has a **Letters** box: type 1–3 characters (e.g. "TR", "212", "€") and the badge shows them instead of an icon. Picking an icon again clears the letters; "Use default" clears both. Works for accounts, income/expense items and banks.
- Letters are shown in dark or light ink automatically depending on the background colour.
- For banks, setting letters (like choosing an icon) replaces an uploaded logo.

### Changed
- The picker no longer rebuilds itself on every change, so typing in the Letters box keeps its focus. Enter in the box closes the picker.

---

## [3.4.1] — 2026-10-13 — Bank icons are editable too

**Fallback:** v3.4.0 zip. Banks gain an optional `icon` field; empty = the original letter tile / wallet.

### New
- **Click a bank's icon in the Projections tab** (Cash, Montepio, …) to pick any library icon and background colour with the same picker used for accounts. "Use default" restores the original letter tile and colour.
- The bank colour is used everywhere that bank appears (split list, charts, the stacked bar).
- Choosing an icon replaces an uploaded logo (and removes the "Remove logo" button); "Change logo" still works if you prefer your own image.

---

## [3.4.0] — 2026-10-13 — Custom icons and colours for accounts and income/expense items

**Fallback:** v3.3.0 zip. Saved data gains optional `icon` and `color` fields on accounts and cash-flow items; both default to empty ("use the default"), so older saves and the older version both keep working.

### New
- **Pick an icon and background colour for every account** (click the badge at the left of the account name) **and every income/expense item** (badge next to the category). The picker offers 26 icons, 12 colour swatches plus a free colour input, a live preview, and "Use default". Esc or Done closes it.
- Defaults: accounts get an icon by type (wallet / piggy bank / chart); items get one by category (e.g. Housing = house, Food = cart, Salary = briefcase) and keep following the category until you pick your own.
- **An account's colour is now its identity everywhere**: the badge, its area/line in the Overview chart, the split list (when grouped by account) and the credits breakdown.
- The "Where the money went" breakdown now shows each category's icon and colour.

### Notes
- Icons are built-in inline SVGs (`js/core/icons.js`), so there are no image files and they work offline. To add an icon, add one line to the `ICONS` map there.
- Banks keep their own logo/colour (Change logo), unchanged.

---

## [3.3.0] — 2026-10-13 — Overview: focus rescales, honest "returns" headline, dot instead of slider

**Fallback:** v3.2.0 (zip sent earlier) has the bottom slider and the combined "+€ · %" pill. No saved-data change.

### Changed
- **Focusing a row now redraws the chart for just that bank/account/type**, so the y axis rescales to fit it (and no longer starts at zero, so its growth is visible). Click the row again to go back to the full stack.
- **Headline change no longer mixes deposits with returns.** It used to show e.g. "+€13,381 · +17.2%", most of which was your own monthly saving. It now reads "+€1,381 returns" (interest/market growth only) followed by "+€12,000 deposits · vs. today (€77,796)". The Gain / loss figure gets a tooltip clarifying that deposits are not counted as gain (it was already value minus everything put in).
- **The bottom slider is gone.** A dot rides on top of the plotted total at the selected month with a month tag above it; drag it, or click/drag anywhere on the chart. Keyboard: focus the chart and use ←/→ (PgUp/PgDn = 6 months, Home/End).

### Housekeeping
- Removed the now-unneeded slider alignment code and styles.

---

## [3.2.0] — 2026-10-13 — One merged Overview panel

**Fallback:** `legacy/` holds the single-file versions; for this change specifically, the pre-merge layout is v3.1.0 (separate Summary, "Balance over time" and "Where your money sits"). No saved-data change — existing data loads as before.

### Changed
- **Summary + Balance over time + Where your money sits are now one "Overview" panel** (`js/views/overview.js`). A stacked area chart shows the balance over the horizon, split by bank/account/type. A **month slider** under the chart (or click/drag on the chart) picks any month, and everything in the panel follows it: the headline balance and change vs. today, the split list (share, value, gain/loss per group) and the key figures (saving per month, put in, gain/loss, return, avg. gain).
- **Click a row in the split list to focus on it** — the headline and key figures then describe just that bank/account/type and the rest of the chart dims.
- **The bank sections also follow the selected month** ("Today" / "In Jan 27" instead of a fixed "At horizon").
- **Forecast horizon is now a compact selector** (6M / 1Y / 2Y / 3Y / 5Y) next to the chart instead of a full-width slider; the tax toggle ("After tax") sits beside it. Horizons saved by earlier versions (e.g. 18 months) still load and show as an extra chip.
- Credits section still uses the horizon (not the selected month).

### Removed
- Donut/bar view and the Value / Return % / Return € metric switch of the old "Where your money sits" panel. Per-group gain/loss is now shown in the split list instead, and return % for the selection is in the key figures. Tell me if you want the donut or a return-% view back.
- Unused chart plugins (doughnut centre text, bar value labels).

### Fixed
- Scrubber track stays aligned with the plot area on resize and on phones (it re-aligns after every Chart.js layout).

---

## [3.1.0] — 2026-10-12 — Redesigned Summary & Credits, bank logos, skip/split recurring items

**Fallback:** v3.0.0 behaviour is described below; no data-shape break (only an optional `skip[]` on cash-flow items and an optional `logo` on banks, both defaulting safely when absent).

### Changed
- **Summary** rebuilt around one headline: today's total balance, the projected total at the horizon with the gain, and a trend line between them. Beside it, a stacked bar and legend show how the money splits by bank. The eight equal tiles became five quiet key figures (saving per month, put in, gain/loss, return, avg. gain). Design reference: net-worth apps such as Monarch, Copilot and Ghostfolio lead with a single net-worth figure and trend rather than a grid of boxes.
- **Upcoming interest & returns** rebuilt: headline numbers (expected in the horizon, average per month, next credit) and a per-month bar strip stacked by bank, so you can see the rhythm (e.g. semi-annual / annual payouts) at a glance. Click a month for its breakdown. The old row of month tiles is gone.
- Credit breakdown no longer shows a day-of-month (it was always the 1st, which was misleading) — month only.

### New
- **Bank logos:** "Change logo" on each bank uploads any image (resized to 96 px and stored inside your saved data, so it survives export/import); "Remove logo" reverts to the letter tile.
- **Recurring income/expenses:** *Skip this month* (with a "Skipped — Restore" line and Undo) and *New amount from this month* (ends the old item last month and starts a copy this month, so history is preserved — use for raises/price changes).

### Housekeeping
- Kept the `.claude/serve.js` preview helper (only needed for automated browser testing; safe to delete).

---

## [3.0.0] — 2026-10-12 — Multi-file app, two tabs, bank-grouped projections

**Fallback:** the previous single-file versions are untouched in `legacy/` (`Finance_App_1.html` = Aug, `Finance_App_2.html` = Oct 10). They still open and work on their own.

### Structure
- Split the single HTML file into a plain multi-file project. **No build step, no server needed** — open `index.html` directly.
  - `index.html` — shell, tab bar, dialogs
  - `css/styles.css` — all styling and light/dark tokens
  - `js/core/` — `utils.js` (formatting, dates, bank icons, toast), `projection.js` (forecast maths), `store.js` (state, localStorage, migration, demo data), `chart-plugins.js`
  - `js/views/` — `projections.js`, `cashflow.js` (one file per tab)
  - `js/app.js` — theme, tab routing, Data menu (export / import / reset)
  - `js/vendor/chart.umd.min.js` — Chart.js 4.5.1, pulled out of the old inline copy
  - `.claude/serve.js` + `launch.json` — optional tiny local server used only for preview/testing
- Scripts are classic `<script>` tags sharing a `window.FT` namespace (ES modules are blocked on `file://`).

### New
- **Two tabs:** *Projections* and *Income & expenses* (URL hash `#projections` / `#cashflow`, last tab remembered).
- **Projections grouped by bank/app:** Cash, Montepio, Trade Republic, Trading 212, Revolut. Each has an icon, collapsible section, "Now / At horizon / Gain" totals and its accounts as cards (savings/investment details per account).
  - Icons are stylised monogram tiles, not official logos. Custom logos: put an image in `assets/banks/` and set `logo` on the bank (see README).
- **Add your own bank/app** ("+ Add bank / app"); remove a bank when it is empty.
- **Drag & drop** an account to reorder it or move it to another bank.
- **Income & expenses tab:** month navigator; income and expense items with category, description, amount; "Every month" items with from/until months; summary (income, expenses, net, savings rate, planned saving from Projections, left after plan, 6-month average net); 12-month income-vs-expense chart; expense breakdown by category.
- **Undo toast** after removing an account or a cash-flow item.

### Fixed (issues found in the v2 review)
- Typing `-` or clearing a number field no longer turns every total into `€NaN` (now counts as 0 until valid).
- Donut can no longer show a loss as a positive slice: choosing *Return %/€* switches to bars (donut only for *Value*).
- "Return" no longer diluted by idle cash: it now covers savings + investments only.
- "Avg. daily gain" is now based on **current** balances (as its tooltip always claimed), not the balance at the horizon.
- Deleting an account no longer happens silently (undo); import and reset ask for confirmation; changing an interest-bearing account to *Checking* asks before clearing its rate.
- Bank list is no longer hardcoded.
- Upcoming-credit amounts are explicitly before tax for investments (stated in the tax note).

### Data model (version 3)
- New localStorage key `finance-tracker-v3`: `{ version, settings, banks[], accounts[] (with bankId), cashflow{ entries[], month }, ui }`.
- **Migration:** on first load, if no v3 data exists, the app imports from the old `finance-tracker-data-v2` key (bank names are mapped to banks; unknown names become new banks). The old key is **never modified or deleted**, so the legacy files keep working. Imported v2 data comes with demo income/expenses to replace.
- Import accepts v3, v2 and v1 exports. Importing an older file with no cash-flow data keeps your logged income/expenses.
- Export is now the full v3 state (accounts, banks, income/expenses).

### Known limitations / next candidates
- Accounts hold one balance snapshot — no dated balance history yet, so no "projected vs actual".
- Data lives in one browser; use Data → Export backup regularly.
