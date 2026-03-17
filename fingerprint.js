/**
 * fingerprint.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Device fingerprinting module.
 * Collects read-only browser/device metadata. No user permission required.
 *
 * SOLID: Single responsibility — only fingerprint collection lives here.
 * DRY  : All data sources centralised in one declarative list.
 * KISS : Pure functions, zero dependencies.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/**
 * Parse a human-readable browser name and version from the User-Agent string.
 * @returns {{ name: string, version: string }}
 */
function parseBrowser() {
  const ua = navigator.userAgent;

  const PATTERNS = [
    { name: 'Edge',    pattern: /Edg\/([^\s]+)/ },
    { name: 'Opera',   pattern: /OPR\/([^\s]+)/ },
    { name: 'Chrome',  pattern: /Chrome\/([^\s]+)/ },
    { name: 'Firefox', pattern: /Firefox\/([^\s]+)/ },
    { name: 'Safari',  pattern: /Version\/([^\s]+).*Safari/ },
  ];

  for (const { name, pattern } of PATTERNS) {
    const match = ua.match(pattern);
    if (match) return { name, version: match[1] };
  }

  return { name: 'Unknown', version: 'Unknown' };
}

/**
 * Derive the OS name from the User-Agent string.
 * @returns {string}
 */
function parseOS() {
  const ua = navigator.userAgent;
  if (/Windows NT 10/.test(ua)) return 'Windows 10 / 11';
  if (/Windows NT/.test(ua))    return 'Windows';
  if (/Mac OS X/.test(ua))      return 'macOS';
  if (/Android/.test(ua))       return 'Android';
  if (/iPhone|iPad/.test(ua))   return 'iOS';
  if (/Linux/.test(ua))         return 'Linux';
  return navigator.platform || 'Unknown';
}

/**
 * Collect all available device fingerprint data points.
 * Runs immediately at page load; results are safe to display without consent.
 *
 * @returns {Object.<string, string|number|boolean>} Key-value fingerprint map.
 */
export function collectFingerprint() {
  const browser = parseBrowser();

  return {
    'Browser':             `${browser.name} ${browser.version}`,
    'Operating System':    parseOS(),
    'Screen Resolution':   `${screen.width} × ${screen.height}`,
    'Viewport Size':       `${window.innerWidth} × ${window.innerHeight}`,
    'Colour Depth':        `${screen.colorDepth}-bit`,
    'Timezone':            Intl.DateTimeFormat().resolvedOptions().timeZone,
    'Language':            navigator.language,
    'CPU Cores':           navigator.hardwareConcurrency ?? 'Unknown',
    'Device Memory':       navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'Not disclosed',
    'Touch Support':       navigator.maxTouchPoints > 0
                             ? `Yes (${navigator.maxTouchPoints} touch points)`
                             : 'No',
    'Connection Type':     navigator.connection?.effectiveType ?? 'Not available',
    'Do Not Track':        navigator.doNotTrack === '1' ? 'Enabled' : 'Disabled',
    'Cookies Enabled':     navigator.cookieEnabled ? 'Yes' : 'No',
    'Page Visit Time':     new Date().toISOString(),
    'User Agent':          navigator.userAgent,
  };
}
