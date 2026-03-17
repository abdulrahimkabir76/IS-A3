/**
 * capture.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages camera permission requests, webcam stream recording via MediaRecorder,
 * and still-frame screenshot capture via the ImageCapture API (bonus feature).
 *
 * SOLID: Single responsibility — all media capture logic is isolated here.
 * DRY  : Stream lifecycle (start/stop) handled in one place via stopStream().
 * KISS : Public surface is three named exports; internals remain private.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

/** Recording duration in milliseconds before the reveal fires automatically. */
const RECORD_DURATION_MS = 10_000;

/** Preferred MIME type for the recording. Falls back gracefully. */
const PREFERRED_MIME = 'video/webm;codecs=vp9';
const FALLBACK_MIME  = 'video/webm';

/** @type {MediaStream|null} Active camera stream. */
let _stream = null;

/** @type {MediaRecorder|null} Active recorder instance. */
let _recorder = null;

/** @type {Blob[]} Accumulated data chunks from MediaRecorder. */
let _chunks = [];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Request camera access from the user via the native browser permission dialog.
 *
 * @param {function(MediaStream): void} onGranted - Called when the user clicks "Allow".
 * @param {function(Error): void}       onDenied  - Called when the user clicks "Block" or no camera found.
 */
export async function requestCameraAccess(onGranted, onDenied) {
  if (!window.isSecureContext) {
    onDenied(new DOMException(
      'Camera access requires a secure context (HTTPS or localhost).',
      'SecurityError',
    ));
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    onDenied(new DOMException(
      'This browser does not support MediaDevices.getUserMedia().',
      'NotSupportedError',
    ));
    return;
  }

  try {
    _stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });
    onGranted(_stream);
  } catch (err) {
    onDenied(err);
  }
}

/**
 * Capture a still screenshot from the active stream using the ImageCapture API.
 * Falls back gracefully when ImageCapture is unavailable (e.g., Firefox).
 *
 * @returns {Promise<string|null>} A PNG data URL, or null on failure.
 */
export async function captureScreenshot() {
  if (!_stream) return null;

  const videoTrack = _stream.getVideoTracks()[0];
  if (!videoTrack) return null;

  // ImageCapture API path (Chrome, Edge, Opera)
  if (typeof ImageCapture !== 'undefined') {
    try {
      const imageCapture = new ImageCapture(videoTrack);
      const bitmap = await imageCapture.grabFrame();
      return _bitmapToDataUrl(bitmap);
    } catch {
      // Fall through to canvas fallback
    }
  }

  // Canvas fallback: draw current video frame
  return _captureViaCanvas();
}

/**
 * Begin recording the active stream.
 * Automatically stops after RECORD_DURATION_MS and calls onComplete.
 *
 * @param {function(Blob, string|null): void} onComplete
 *   Called with (recordedBlob, screenshotDataUrl) when recording ends.
 */
export function startRecording(onComplete) {
  if (!_stream) {
    console.warn('[capture] startRecording called with no active stream.');
    return;
  }

  _chunks = [];

  const mimeType = MediaRecorder.isTypeSupported(PREFERRED_MIME)
    ? PREFERRED_MIME
    : FALLBACK_MIME;

  _recorder = new MediaRecorder(_stream, { mimeType });

  _recorder.ondataavailable = (event) => {
    if (event.data.size > 0) _chunks.push(event.data);
  };

  _recorder.onstop = async () => {
    const blob = new Blob(_chunks, { type: FALLBACK_MIME });
    const screenshot = await captureScreenshot();
    stopStream();
    onComplete(blob, screenshot);
  };

  _recorder.start(200); // collect chunks every 200 ms

  // Auto-stop after the configured duration
  setTimeout(() => {
    if (_recorder?.state === 'recording') {
      _recorder.stop();
    }
  }, RECORD_DURATION_MS);
}

/**
 * Stop and release all tracks on the active media stream.
 * Safe to call multiple times.
 */
export function stopStream() {
  _stream?.getTracks().forEach((track) => track.stop());
  _stream = null;
}

/**
 * Trigger a browser download of the recorded blob as a .webm file.
 * Used in Phase 1 (local save) as a fallback or for testing.
 *
 * @param {Blob} blob - The video blob to download.
 */
export function saveLocally(blob) {
  const url = URL.createObjectURL(blob);
  const anchor = Object.assign(document.createElement('a'), {
    href:     url,
    download: `capture_${Date.now()}.webm`,
  });
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke after a short delay to ensure the download initiates
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Convert an ImageBitmap to a PNG data URL via an off-screen canvas.
 * @param {ImageBitmap} bitmap
 * @returns {string}
 */
function _bitmapToDataUrl(bitmap) {
  const canvas = Object.assign(document.createElement('canvas'), {
    width:  bitmap.width,
    height: bitmap.height,
  });
  canvas.getContext('2d').drawImage(bitmap, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Fallback: capture a frame by drawing into a canvas from the live video element.
 * Looks for a <video> element currently displaying the stream.
 * @returns {string|null}
 */
function _captureViaCanvas() {
  const video = document.querySelector('video.live-preview');
  if (!video || video.readyState < 2) return null;

  const canvas = Object.assign(document.createElement('canvas'), {
    width:  video.videoWidth  || 640,
    height: video.videoHeight || 480,
  });
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
