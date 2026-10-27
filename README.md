# Finance Tracker

Local-only personal finance app: forecast your savings/investments per bank, and log monthly income and expenses.
Nothing leaves your browser — data is stored in `localStorage`.

## Run it
Double-click `index.html`. No install, no build, no server.

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
| `js/views/overview.js` | Overview panel: chart + month slider + split + key figures, horizon, tax toggle |
| `js/views/projections.js` | Projections tab: bank sections/account cards, upcoming credits |
| `js/views/cashflow.js` | Income & expenses tab |
| `js/app.js` | Tabs, theme, Data menu |
| `js/pwa.js` | Offline service-worker registration, install button, share backup |
| `sw.js`, `manifest.webmanifest`, `assets/icons/` | PWA files |
| `legacy/` | Earlier single-file versions (kept as a fallback) |
| `CHANGELOG.md` | **Update this with every relevant change** |

Add a new tab: create `js/views/<name>.js` registering `FT.views.<name> = { mount, render, refreshCharts }`, add a `<section id="view-<name>">` and a tab button in `index.html`, and add the name to `TABS` in `js/app.js`.

## Using it on your phone (installable app)
The app is a PWA: after the first visit it installs to the home screen, runs full-screen and works offline. Installing needs the files to be served over **https**, so put the project folder (everything except `legacy/` and `.claude/`) on any static host. Free options: Netlify Drop (drag the folder onto app.netlify.com/drop), Cloudflare Pages, or GitHub Pages. The host only serves the files; your data stays on each device.
- **Android (Chrome/Edge):** open the site, then Data → *Install app on this device* (or the browser menu → Install app).
- **iPhone (Safari):** open the site → Share → *Add to Home Screen*.
- **Move your data between devices:** on one device Data → *Share backup…* / *Export backup*, on the other Data → *Import backup…*.
- When you ship a new version, bump `VERSION` in `sw.js` so phones refresh their cached copy.

## Privacy and sharing with friends
- Everything is stored in the browser/app on **your own device** (localStorage). There is no account, no database and no analytics, and a Content-Security-Policy stops the page from contacting any other server.
- To give it to a friend, send the folder/zip or host it on any static host (Netlify Drop, GitHub Pages…). The host only serves the app files; each person's data stays in their own browser and is invisible to you and to the host.
- Data is per device and per browser. To move it to another device use Data ▾ → Export backup / Import backup (or *Share backup…* on a phone).
- Clearing the browser data deletes the data — keep an occasional Export backup.

## Backups
Data → **Export backup (JSON)** regularly. Clearing browser site data erases the app's data.

## Bank logos
Official logos are trademarked and aren't bundled. On the Projections tab, use **Change logo** on any bank to upload your own image; it is saved with your data.

## Preview server (only needed for automated testing)
`node .claude/serve.js` → http://localhost:5173
