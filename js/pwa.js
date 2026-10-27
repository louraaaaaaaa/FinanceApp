/* Phone/PWA extras: offline service worker, "Install app", "Share backup", durable storage. */
(function () {
  const FT = window.FT;
  const $ = (id) => document.getElementById(id);
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  // ---- offline support (needs https or localhost; skipped on file:// and, to keep dev fresh, on localhost unless ?sw=1)
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && (!isLocal || location.search.includes('sw=1'))) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // ---- ask the browser not to evict our localStorage under storage pressure
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---- install button (Chrome/Edge/Android) and a hint for iPhone Safari
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('installBtn').hidden = false; });
  window.addEventListener('appinstalled', () => { deferred = null; $('installBtn').hidden = true; FT.toast('Installed — find Finance App on your home screen.'); });
  $('installBtn').addEventListener('click', async () => {
    $('dataMenu').open = false;
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    $('installBtn').hidden = true;
  });
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !standalone) $('iosNote').hidden = false;

  // ---- share a backup file through the phone's share sheet (AirDrop, Drive, email, ...)
  const backupFile = () => new File([JSON.stringify(FT.state, null, 2)], `finance-tracker-${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [backupFile()] })) $('shareBtn').hidden = false;
  } catch (e) {}
  $('shareBtn').addEventListener('click', async () => {
    $('dataMenu').open = false;
    try { await navigator.share({ files: [backupFile()], title: 'Finance App backup' }); } catch (e) { /* cancelled */ }
  });
})();
