# Finance Tracker

Local-only personal finance app for forecasting savings and investments by account, and tracking monthly income and expenses. Your data stays in this browser's `localStorage`; there are no accounts, analytics, or cloud services.

## Run it
Double-click `index.html` for the core app. There is no build step or dependency installation. To test service-worker behavior locally, serve the folder from `localhost` and open `http://localhost:8000/?sw=1` (for example, run `python -m http.server 8000` from the project folder). Installable PWA behavior requires HTTPS or localhost.

## Features
- **Projections:** group accounts by bank or app; set balances, as-of dates, monthly contributions, rates, credit cadence, and tax assumptions; compare current values with a selectable forecast horizon.
- **Expected credits:** inspect projected interest and investment returns by month and account.
- **Income and expenses:** track employer pay histories and month-specific amounts alongside recurring or one-off entries. Skip a recurring item for a month or start a new amount without changing earlier months.
- **Cash-flow charts:** compare income, expenses, net cash flow, and expected returns across past, current, and forecast months.
- **Backups:** export or import a JSON snapshot, or share one through the device's share sheet where supported.

## Where things are
| Path | What |
| --- | --- |
| `index.html` | Page shell, tab bar, "add bank" dialog |
| `css/styles.css` | Styling + light/dark theme tokens |
| `js/core/store.js` | State shape, localStorage, migration, demo data, categories |
| `js/core/projection.js` | Forecast maths (interest cadence, tax estimate, credits) |
| `js/core/utils.js` | Formatting, date helpers, bank icons, toast |
| `js/core/chart-plugins.js` | Chart.js helpers/plugins |
| `js/core/income.js` | Employer income maths: pay history and month exceptions |
| `js/core/icons.js` | Icon library, badges, defaults per type/category, icon & colour picker |
| `js/views/overview.js` | Projection overview: chart, month slider, account split, horizon, and tax toggle |
| `js/views/projections.js` | Projections tab: bank sections/account cards, upcoming credits |
| `js/views/cashflow.js` | Income & expenses tab |
| `js/app.js` | Tabs, theme, Data menu |
| `js/pwa.js` | Offline service-worker registration, install button, share backup |
| `sw.js`, `manifest.webmanifest`, `assets/icons/` | PWA files |
| `legacy/` | Earlier single-file versions (kept as a fallback) |
| `CHANGELOG.md` | **Update this with every relevant change** |

Add a new tab: create `js/views/<name>.js` registering `FT.views.<name> = { mount, render, refreshCharts }`, add a `<section id="view-<name>">` and a tab button in `index.html`, and add the name to `TABS` in `js/app.js`.

## Using it on your phone (installable app)
The app is a PWA: after the first visit it can be installed to the home screen, run full-screen, and work offline. Install it from an **HTTPS** host; publish the app files at the site root and omit `legacy/`. Static hosts such as Netlify, Cloudflare Pages, or GitHub Pages are suitable. The host serves the app but does not receive your financial data.
- **Android (Chrome/Edge):** open the site, then Data → *Install app on this device* (or the browser menu → Install app).
- **iPhone (Safari):** open the site → Share → *Add to Home Screen*.
- **Move your data between devices:** on one device Data → *Share backup…* / *Export backup*, on the other Data → *Import backup…*.
- When you ship a new version, bump `VERSION` in `sw.js` so phones refresh their cached copy.

## Data and privacy
- Data is stored per browser and device. It is not synchronized or sent to a server; the Content Security Policy restricts network connections to the app's own origin.
- Use **Data → Export backup (JSON)** regularly. Import replaces the current data after confirmation; export first if you need a restore point.
- Clearing browser or app storage deletes local data. To move data between devices, export on one and import on the other, or use **Share backup…** on supported phones.
- To share the app with someone else, send the project folder or host a copy. Each person's data remains in their own browser.

## Bank logos
Official logos are trademarked and aren't bundled. On the Projections tab, use **Change logo** on any bank to upload your own image; it is saved with your data.

The app identity icons are in `assets/icons/`: standard 192px and 512px icons, a maskable Android icon, and an Apple touch icon. The interface's category and account icons are inline SVGs defined in `js/core/icons.js`.

## Code flow
`index.html` loads the classic scripts in dependency order, which share the `window.FT` namespace. `js/core/store.js` validates, migrates, and persists state; `js/core/projection.js` computes forecasts; and `js/views/` renders the tabs. `js/app.js` coordinates navigation and data actions, while `js/pwa.js` and `sw.js` provide install and offline support. Chart.js is bundled locally in `js/vendor/`.
