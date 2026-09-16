// App-Installation (PWA "Add to Home Screen"): erkennt Plattform/Browser
// und zeigt passende Hinweise, da sich Chrome/Edge/Android, der Samsung
// Internet Browser und iOS Safari hier alle unterschiedlich verhalten.
//
// - Chrome/Edge/die meisten Android-Browser (inkl. neuere Samsung-Internet-
//   Versionen): feuern "beforeinstallprompt" - wir fangen das Event ab und
//   zeigen einen eigenen Button, der bei Klick event.prompt() aufruft.
// - Samsung Internet: "beforeinstallprompt" wird nicht zuverlässig auf allen
//   Versionen/Einstellungen ausgelöst. Deshalb zusätzlich IMMER eine manuelle
//   Anleitung (Menü -> "Seite zu" -> "Startbildschirm hinzufügen") anzeigen.
// - iOS Safari: kein "beforeinstallprompt" - nur der Nutzer selbst kann über
//   das Teilen-Menü "Zum Home-Bildschirm" installieren. Wir zeigen eine
//   Schritt-für-Schritt-Anleitung. In anderen iOS-Browsern (Chrome/Firefox
//   auf iOS, die technisch alle WebKit/Safari nutzen) geht das gar nicht -
//   dort weisen wir darauf hin, die Seite in Safari zu öffnen.

let deferredPrompt = null;
let dismissed = false;
const listeners = [];

function notify() {
  listeners.forEach((cb) => cb());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  dismissed = true;
  notify();
});

export function onInstallStateChange(cb) {
  listeners.push(cb);
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isSafari() {
  const ua = navigator.userAgent;
  return /^((?!chrome|android|crios|fxios|edgios|opios).)*safari/i.test(ua);
}

export function isSamsungInternet() {
  return /SamsungBrowser/i.test(navigator.userAgent);
}

function isMobileish() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function dismissInstallBanner() {
  dismissed = true;
  notify();
}

export function canPromptInstall() {
  return !!deferredPrompt;
}

export async function triggerInstallPrompt() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
}

/** Liefert das HTML für den Installationsbereich im Startmenü, oder '' wenn nichts zu zeigen ist. */
export function renderInstallSection() {
  if (dismissed || isStandalone()) return '';

  const ios = isIOS();
  const safari = isSafari();
  const samsung = isSamsungInternet();

  let body = '';

  if (canPromptInstall()) {
    body += `<button class="choice-btn install-btn" id="pwa-install-btn">📲 App installieren</button>`;
    if (samsung) {
      body += `<div class="install-hint">Falls sich kein Fenster öffnet: Menü (☰) unten rechts &rarr; "Seite zu" &rarr; "Startbildschirm hinzufügen".</div>`;
    }
  } else if (ios && safari) {
    body += `<div class="install-hint install-hint-steps">
      <div>So installierst du Watten als App:</div>
      <ol>
        <li>Unten auf <b>Teilen</b> tippen (Symbol: Quadrat mit Pfeil nach oben ⬆️)</li>
        <li><b>"Zum Home-Bildschirm"</b> auswählen</li>
        <li>Mit <b>"Hinzufügen"</b> bestätigen</li>
      </ol>
    </div>`;
  } else if (ios && !safari) {
    body += `<div class="install-hint">Auf dem iPhone/iPad geht die Installation nur über <b>Safari</b> - bitte diese Seite in Safari öffnen und dort über "Teilen &rarr; Zum Home-Bildschirm" installieren.</div>`;
  } else if (samsung) {
    body += `<div class="install-hint">Menü (☰) unten rechts antippen &rarr; "Seite zu" &rarr; "Startbildschirm hinzufügen".</div>`;
  } else if (isMobileish()) {
    body += `<div class="install-hint">Über das Browser-Menü lässt sich diese Seite meist zum Startbildschirm hinzufügen.</div>`;
  } else {
    return '';
  }

  return `
    <div class="field install-field">
      <label>App installieren</label>
      <div class="install-box">
        ${body}
        <button class="install-dismiss" id="install-dismiss" title="Ausblenden">✕</button>
      </div>
    </div>`;
}

export function wireInstallSection(container, onChange) {
  const btn = container.querySelector('#pwa-install-btn');
  if (btn) {
    btn.addEventListener('click', async () => {
      await triggerInstallPrompt();
      onChange();
    });
  }
  const dismissBtn = container.querySelector('#install-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      dismissInstallBanner();
      onChange();
    });
  }
}
