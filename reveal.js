/**
 * reveal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Security-awareness reveal screen — the educational payoff of the simulation.
 *
 * Responsibilities:
 *   • Build and inject the full-screen reveal overlay into the DOM.
 *   • Display the captured device fingerprint in a readable table.
 *   • Show the recorded video and the bonus screenshot side-by-side.
 *   • Display the Google Drive sharing link (Phase 2).
 *   • Explain what happened, why it worked, and how to stay safe.
 *   • Render an optional matrix-rain canvas effect in the background.
 *
 * SOLID: Single responsibility — only reveal-screen rendering lives here.
 * DRY  : DOM construction helpers (_el, _row) eliminate repetition.
 * KISS : No third-party libraries; pure DOM & CSS.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build and display the reveal screen.
 *
 * @param {Object} options
 * @param {Blob}         options.videoBlob      - The recorded webcam video.
 * @param {string|null}  options.screenshotUrl  - PNG data URL from ImageCapture (bonus).
 * @param {Object}       options.fingerprint    - Key-value fingerprint map.
 * @param {string|null}  [options.driveLink]    - Google Drive shareable link (Phase 2).
 */
export function showReveal({ videoBlob, screenshotUrl, fingerprint, driveLink = null }) {
  // Prevent double-mounting
  if (document.getElementById('reveal-screen')) return;

  const overlay = _buildOverlay(videoBlob, screenshotUrl, fingerprint, driveLink);
  document.body.appendChild(overlay);

  // Lock scroll on the main page while reveal is visible
  document.body.style.overflow = 'hidden';

  // Animate entrance
  requestAnimationFrame(() => overlay.classList.add('reveal--visible'));

  // Start the matrix rain background effect
  _startMatrixRain(overlay.querySelector('#reveal-canvas'));
}

// ─── DOM Builder ─────────────────────────────────────────────────────────────

/**
 * Compose the complete reveal overlay element.
 * @returns {HTMLElement}
 */
function _buildOverlay(videoBlob, screenshotUrl, fingerprint, driveLink) {
  const overlay = _el('div', { id: 'reveal-screen', class: 'reveal' });

  // Matrix rain canvas (background)
  overlay.appendChild(_el('canvas', { id: 'reveal-canvas', class: 'reveal__canvas' }));

  // Scrollable content wrapper
  const content = _el('div', { class: 'reveal__content' });
  overlay.appendChild(content);

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = _el('div', { class: 'reveal__header' });
  header.appendChild(_el('div', { class: 'reveal__icon' }, '⚠️'));
  header.appendChild(_el('h1',  { class: 'reveal__title' }, "You've just been Social Engineered."));
  header.appendChild(_el('p',   { class: 'reveal__subtitle' },
    'This was a controlled educational demonstration. Here is everything we captured about you in the last 30 seconds.'));
  content.appendChild(header);

  // ── Media Section  ──────────────────────────────────────────────────────────
  content.appendChild(_buildMediaSection(videoBlob, screenshotUrl));

  // ── Fingerprint Table ───────────────────────────────────────────────────────
  content.appendChild(_buildFingerprintSection(fingerprint));

  // ── Drive Link ──────────────────────────────────────────────────────────────
  if (driveLink) {
    content.appendChild(_buildDriveSection(driveLink));
  }

  // ── Explanation ─────────────────────────────────────────────────────────────
  content.appendChild(_buildExplanationSection());

  // ── Security Guidance ───────────────────────────────────────────────────────
  content.appendChild(_buildSecuritySection());

  // ── Ethical Notice ──────────────────────────────────────────────────────────
  content.appendChild(_buildEthicalSection(driveLink));

  return overlay;
}

/** Build the video preview + screenshot section. */
function _buildMediaSection(videoBlob, screenshotUrl) {
  const section = _el('div', { class: 'reveal__section reveal__media-grid' });
  section.appendChild(_el('h2', { class: 'reveal__section-title' }, '📹 What We Captured'));

  const grid = _el('div', { class: 'reveal__grid' });

  // Video preview
  const videoCard = _el('div', { class: 'reveal__card' });
  videoCard.appendChild(_el('h3', { class: 'reveal__card-title' }, '🎥 Recorded Video (10 s)'));
  const video = _el('video', {
    class:    'reveal__video live-preview',
    autoplay: '',
    muted:    '',
    loop:     '',
    controls: '',
    playsinline: '',
  });
  video.src = URL.createObjectURL(videoBlob);
  videoCard.appendChild(video);
  grid.appendChild(videoCard);

  // Screenshot (bonus)
  if (screenshotUrl) {
    const shotCard = _el('div', { class: 'reveal__card' });
    shotCard.appendChild(_el('h3', { class: 'reveal__card-title' }, '📸 Captured Screenshot'));
    const img = _el('img', {
      class: 'reveal__screenshot',
      src:   screenshotUrl,
      alt:   'Webcam screenshot captured via ImageCapture API',
    });
    shotCard.appendChild(img);
    shotCard.appendChild(_el('p', { class: 'reveal__card-note' },
      'Captured using the ImageCapture API — a still frame taken silently while you read this.'));
    grid.appendChild(shotCard);
  }

  section.appendChild(grid);
  return section;
}

/** Build the fingerprint data table section. */
function _buildFingerprintSection(fingerprint) {
  const section = _el('div', { class: 'reveal__section' });
  section.appendChild(_el('h2', { class: 'reveal__section-title' }, '🖥️ Your Device Fingerprint'));
  section.appendChild(_el('p', { class: 'reveal__section-desc' },
    'All of the following data was collected the moment you loaded this page — no permission was needed.'));

  const table = _el('table', { class: 'reveal__table', role: 'table' });
  const thead = _el('thead');
  const hrow  = _el('tr');
  hrow.appendChild(_el('th', { scope: 'col' }, 'Data Point'));
  hrow.appendChild(_el('th', { scope: 'col' }, 'Value'));
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = _el('tbody');
  for (const [key, value] of Object.entries(fingerprint)) {
    const row = _el('tr');
    row.appendChild(_el('td', { class: 'reveal__table-key' }, key));
    row.appendChild(_el('td', { class: 'reveal__table-val' }, String(value)));
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  section.appendChild(table);
  return section;
}

/** Build the Google Drive link section. */
function _buildDriveSection(driveLink) {
  const section = _el('div', { class: 'reveal__section reveal__drive' });
  section.appendChild(_el('h2', { class: 'reveal__section-title' }, '☁️ Cloud Upload'));
  section.appendChild(_el('p', { class: 'reveal__section-desc' },
    'Your recording was uploaded to Google Drive and is accessible at:'));
  const link = _el('a', { class: 'reveal__drive-link', href: driveLink, target: '_blank', rel: 'noopener noreferrer' }, driveLink);
  section.appendChild(link);
  return section;
}

/** Build the plain-English attack explanation section. */
function _buildExplanationSection() {
  const section = _el('div', { class: 'reveal__section' });
  section.appendChild(_el('h2', { class: 'reveal__section-title' }, '🔍 What Just Happened?'));

  const items = [
    ['What we did',
     'We built a convincing portfolio website to establish trust. After a short delay, we displayed a contextually plausible popup — "Enable webcam for a live video introduction". When you clicked Allow on your browser\'s native permission dialog, we silently started recording your webcam for 10 seconds and collected device metadata — all without installing any software.'],
    ['Why it worked',
     'Social engineering exploits human psychology, not software flaws. The browser permission system is robust — we could not bypass it. But we could craft a believable context that made granting access feel reasonable. You trusted the interface, so you clicked Allow.'],
    ['What a real attacker would do differently',
     'A malicious actor would stream the video to a remote server in real time, never show the reveal screen, and return to the decoy app as if nothing happened. They might also combine the webcam feed with audio, location, and clipboard data.'],
  ];

  for (const [title, body] of items) {
    const card = _el('div', { class: 'reveal__explain-card' });
    card.appendChild(_el('h3', { class: 'reveal__explain-title' }, title));
    card.appendChild(_el('p',  {}, body));
    section.appendChild(card);
  }

  return section;
}

/** Build the security guidance section. */
function _buildSecuritySection() {
  const section = _el('div', { class: 'reveal__section' });
  section.appendChild(_el('h2', { class: 'reveal__section-title' }, '🛡️ How to Protect Yourself'));

  const tips = [
    'Always question why a website needs camera access — legitimate services almost never need it just to display content.',
    'Verify the URL in your browser\'s address bar matches the site you intended to visit.',
    'You can revoke camera permissions at any time: browser Settings → Privacy → Site Permissions → Camera.',
    'The browser permission dialog is your last line of defence — it cannot be bypassed by any website.',
    'If a permission request feels unexpected or out of place, deny it and leave the site immediately.',
    'Keep your browser and OS up to date to benefit from the latest security mitigations.',
  ];

  const list = _el('ul', { class: 'reveal__tips' });
  for (const tip of tips) {
    list.appendChild(_el('li', { class: 'reveal__tip' }, tip));
  }
  section.appendChild(list);
  return section;
}

/** Build the ethical notice section. */
function _buildEthicalSection(driveLink) {
  const storage = driveLink
    ? 'to a private Google Drive folder accessible only to the course instructor'
    : 'locally in your browser (it was offered as a download)';

  const section = _el('div', { class: 'reveal__section reveal__ethical' });
  section.appendChild(_el('h2', { class: 'reveal__section-title' }, '⚖️ Ethical Notice'));
  section.appendChild(_el('p', {},
    `This demonstration was conducted ethically and with your informed consent. Your webcam access was granted voluntarily through your browser's official permission dialog — we did not bypass any security control. The recording has been saved ${storage}. No data from this demonstration will be shared, published, or used for any purpose other than this educational exercise. You may request deletion at any time by contacting your course instructor.`));
  section.appendChild(_el('p', { class: 'reveal__disclaimer' },
    '⚠️ Academic Disclaimer: This project is designed exclusively for educational use in a supervised university cybersecurity course. All demonstrations require explicit, informed user consent obtained through the official browser permission dialog.'));
  return section;
}

// ─── Matrix Rain Effect ──────────────────────────────────────────────────────

/**
 * Render a subtle falling-character (matrix rain) animation on the given canvas.
 * Runs in the background of the reveal screen for visual impact.
 * @param {HTMLCanvasElement|null} canvas
 */
function _startMatrixRain(canvas) {
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const chars  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()アイウエオカキクケコ';
  const fontSize = 14;
  let cols, drops;

  /** Resize canvas to fill window. */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    cols  = Math.floor(canvas.width / fontSize);
    drops = Array.from({ length: cols }, () => Math.random() * -50);
  }

  /** Draw one animation frame. */
  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff4180';
    ctx.font      = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.5;
    }
  }

  resize();
  window.addEventListener('resize', resize);
  const handle = setInterval(draw, 50);

  // Stop and clean up if the reveal screen is ever removed
  const observer = new MutationObserver(() => {
    if (!document.getElementById('reveal-screen')) {
      clearInterval(handle);
      window.removeEventListener('resize', resize);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true });
}

// ─── DOM Utility ─────────────────────────────────────────────────────────────

/**
 * Create a DOM element with optional attributes and a single text child.
 *
 * @param {string}          tag   - HTML tag name.
 * @param {Object}          [attrs] - Attribute key-value pairs.
 * @param {string}          [text]  - Optional text content.
 * @returns {HTMLElement}
 */
function _el(tag, attrs = {}, text) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === '') {
      el.setAttribute(key, '');   // Boolean attributes (e.g. autoplay)
    } else {
      el.setAttribute(key, value);
    }
  }
  if (text !== undefined) el.textContent = text;
  return el;
}
