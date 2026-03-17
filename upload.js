/**
 * upload.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Google Drive API integration using OAuth 2.0 implicit (token) flow.
 * Uploads the recorded WebM blob to the authorised user's Google Drive.
 *
 * ┌─ SETUP INSTRUCTIONS ───────────────────────────────────────────────────────
 * │ 1. Visit https://console.cloud.google.com and create a new project.
 * │ 2. Enable the "Google Drive API" for that project.
 * │ 3. Navigate to APIs & Services → Credentials → Create Credentials
 * │    → OAuth 2.0 Client ID → Web Application.
 * │ 4. Under "Authorised JavaScript origins" add:
 * │       http://localhost        (for local testing)
 * │       https://<your-domain>   (for deployment)
 * │ 5. Copy the generated Client ID into GOOGLE_CLIENT_ID below.
 * │
 * │ SECURITY NOTE:
 * │   The Client ID is NOT a secret. It is safe to include in client-side code.
 * │   The OAuth flow requires explicit user interaction and consent in a popup.
 * │   No tokens are persisted to localStorage or cookies.
 * └────────────────────────────────────────────────────────────────────────────
 *
 * SOLID: Single responsibility — all Drive upload logic is isolated here.
 * DRY  : Token management centralised in _getToken(); callers never touch it.
 * KISS : Three public exports with minimal required parameters.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Replace with your OAuth 2.0 Client ID from Google Cloud Console.
 * This value is intentionally public; it is not a secret.
 */
const GOOGLE_CLIENT_ID = '60850688422-ua267mqtm0ls2nor4uv96vf7aiput5c6.apps.googleusercontent.com';

/** OAuth scope: access only to files created by this app. */
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** Drive multipart upload endpoint. */
const UPLOAD_ENDPOINT =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/** Drive permissions endpoint template. */
const PERMISSIONS_ENDPOINT = (fileId) =>
  `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;

/** Drive file metadata endpoint template. */
const FILE_META_ENDPOINT = (fileId) =>
  `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,webViewLink,name`;

// ─── Private State ───────────────────────────────────────────────────────────

/** @type {string|null} In-memory access token; never persisted. */
let _accessToken = null;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check whether the module is configured with a real Client ID.
 * Returns false when the placeholder value is still in place.
 * @returns {boolean}
 */
export function isDriveConfigured() {
  return (
    typeof GOOGLE_CLIENT_ID === 'string' &&
    GOOGLE_CLIENT_ID.length > 0 &&
    !GOOGLE_CLIENT_ID.startsWith('YOUR_')
  );
}

/**
 * Upload a Blob to Google Drive.
 * Triggers the OAuth popup automatically if no token is held in memory.
 *
 * @param {Blob}   blob     - The video blob to upload (video/webm).
 * @param {string} filename - Desired filename on Google Drive.
 * @returns {Promise<{ id: string, webViewLink: string, name: string }>}
 *   Resolves to the Drive file metadata including the shareable view link.
 * @throws {Error} On authorisation failure or network error.
 */
export async function uploadToDrive(blob, filename) {
  const token = await _getToken();

  // ── 1. Upload the file ────────────────────────────────────────────────────
  const metadata = JSON.stringify({ name: filename, mimeType: 'video/webm' });

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([metadata], { type: 'application/json' }),
  );
  form.append('file', blob);

  const uploadRes = await fetch(UPLOAD_ENDPOINT, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  });

  if (!uploadRes.ok) {
    const detail = await uploadRes.json().catch(() => ({}));
    throw new Error(`Drive upload failed: ${detail?.error?.message ?? uploadRes.statusText}`);
  }

  const file = await uploadRes.json();

  // ── 2. Make the file readable by anyone with the link ─────────────────────
  await fetch(PERMISSIONS_ENDPOINT(file.id), {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });

  // ── 3. Retrieve the shareable web-view link ───────────────────────────────
  const metaRes = await fetch(FILE_META_ENDPOINT(file.id), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!metaRes.ok) {
    // Return partial success — upload worked, just no link
    return { id: file.id, webViewLink: null, name: filename };
  }

  return metaRes.json();
}

/**
 * Revoke the held access token and clear it from memory.
 * Call this if the user explicitly signs out of the demo flow.
 */
export async function revokeToken() {
  if (!_accessToken) return;
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${_accessToken}`, {
      method: 'POST',
    });
  } finally {
    _accessToken = null;
  }
}

/**
 * Ensure OAuth token is acquired from a direct user gesture.
 * Useful to avoid popup blockers before starting long async flows.
 * @returns {Promise<string>}
 */
export function ensureDriveAuthorised() {
  return _getToken();
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Return the cached token or trigger the OAuth popup to obtain a fresh one.
 * @returns {Promise<string>} A valid Google OAuth2 access token.
 */
function _getToken() {
  if (_accessToken) return Promise.resolve(_accessToken);
  return _authoriseViaPopup();
}

/**
 * Open the Google OAuth 2.0 implicit-flow popup and extract the access token
 * from the redirect URL fragment once the user consents.
 *
 * @returns {Promise<string>} Resolves to the access token string.
 */
function _authoriseViaPopup() {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin + window.location.pathname;

    const params = new URLSearchParams({
      client_id:             GOOGLE_CLIENT_ID,
      redirect_uri:          redirectUri,
      response_type:         'token',
      scope:                 DRIVE_SCOPE,
      include_granted_scopes:'true',
      prompt:                'select_account',
    });

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'google-oauth',
      'width=520,height=640,left=200,top=100',
    );

    if (!popup) {
      reject(new Error('Popup was blocked. Please allow popups for this site.'));
      return;
    }

    /** @type {number} Polling interval handle. */
    const poll = setInterval(() => {
      try {
        // Cross-origin check — will throw until the redirect completes
        const url = popup.location.href;

        if (url.startsWith(redirectUri)) {
          clearInterval(poll);
          const hash    = new URLSearchParams(popup.location.hash.slice(1));
          const error   = hash.get('error');
          const errorDescription = hash.get('error_description');

          if (error) {
            popup.close();
            reject(new Error(`OAuth failed: ${errorDescription ?? error}`));
            return;
          }

          const token   = hash.get('access_token');
          const expires = parseInt(hash.get('expires_in') ?? '3600', 10);
          popup.close();

          if (!token) {
            reject(new Error('No access token in OAuth response.'));
            return;
          }

          _accessToken = token;

          // Auto-clear token when it expires (conservative: 60 s early)
          setTimeout(() => { _accessToken = null; }, (expires - 60) * 1_000);

          resolve(token);
        }
      } catch {
        // Still on accounts.google.com — keep waiting
      }

      if (popup.closed) {
        clearInterval(poll);
        reject(new Error('Authorisation cancelled — the sign-in window was closed.'));
      }
    }, 400);
  });
}
