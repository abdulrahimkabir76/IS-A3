# The Deceptive App — Educational Ethical Hacking Project

> **Live Demo:** [https://your-username.github.io/deceptive-app/](https://your-username.github.io/deceptive-app/)
> *(Replace with your actual deployment URL)*

---

## ⚠️ Academic Disclaimer

> This project is designed **exclusively for educational use** in a supervised university/college cybersecurity course. All demonstrations are performed with **explicit, informed user consent** obtained through the official browser permission dialog. No data is captured, stored, or transmitted without that consent. The goal is to teach students *how* social engineering and permission exploitation work so they can defend against them.

---

## 👥 Group Information

| Name | Roll Number |
|---|---|
| Mian Abdul Rahim | 23F-0864 |
| Muhammad Huzaifah Babar | 23F-0688 |

**Assignment:** IS Security — Assignment A3  
**Decoy App Type:** Portfolio Website

---

## 📋 Project Description

**The Deceptive App** is a controlled, educational simulation of a **social engineering / permission-phishing attack**. It disguises itself as a convincing developer portfolio website and, after a short delay, presents a contextually believable overlay asking the user to enable their webcam for a "live video introduction."

When the user grants camera access through the browser's **official, unbypassable permission dialog**, the app:

1. Records a 10-second webcam clip via the `MediaRecorder` API.
2. Captures a still screenshot via the `ImageCapture` API (bonus).
3. Collects device fingerprint metadata (no permission required).
4. Uploads the recording to **Google Drive** via OAuth 2.0.
5. Displays a full-screen **security awareness reveal screen** explaining exactly what happened and how to stay safe.

The demo teaches students and viewers that **the browser permission dialog is the last line of defence** — and that social engineering can circumvent it not by breaking security, but by manipulating human trust.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Media Capture | `navigator.mediaDevices.getUserMedia()` |
| Video Recording | `MediaRecorder` API (WebM/VP9) |
| Screenshot (Bonus) | `ImageCapture` API |
| Cloud Storage | Google Drive REST API v3 (OAuth 2.0 implicit flow) |
| Device Fingerprinting | `navigator`, `screen`, `Intl` APIs |
| Deployment | GitHub Pages / Vercel / Netlify |

---

## 🗂️ File Structure

```
project-root/
├── index.html        # Decoy portfolio webpage + overlays + banners
├── style.css         # All styles (portfolio, overlay, reveal screen)
├── app.js            # Orchestration entry point
├── fingerprint.js    # Device fingerprinting module
├── capture.js        # Camera access, MediaRecorder, ImageCapture
├── upload.js         # Google Drive OAuth 2.0 upload module
├── reveal.js         # Security-awareness reveal screen renderer
├── assets/           # Static images & icons
└── README.md         # This file
```

---

## 🚀 Setup & Local Testing

### Prerequisites
- A modern browser (Chrome 88+ or Edge 88+ recommended).
- A local HTTP server (required for ES Modules and `getUserMedia`).

### Run Locally

**Option A — VS Code Live Server extension:**
```
Right-click index.html → "Open with Live Server"
```

**Option B — Python:**
```bash
python -m http.server 8080
# then open http://localhost:8080
```

**Option C — Node.js:**
```bash
npx serve .
```

> **Note:** `getUserMedia()` requires a **secure context** (HTTPS or `localhost`). Opening `index.html` directly as a `file://` URL will not work.

---

## ☁️ Google Drive Integration — Setup

The Phase 2 cloud upload uses Google Drive's OAuth 2.0 implicit flow.  
Follow these steps to configure it:

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com) and create a new project.
2. Enable the **Google Drive API** for your project.
3. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID → Web Application**.
4. Under **Authorised JavaScript Origins**, add:
   - `http://localhost` (for local testing)
   - `https://<your-deployment-domain>` (for production)
5. Copy your **Client ID** and replace the placeholder in `upload.js`:

```javascript
// upload.js — line ~35
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

> **Security:** The Client ID is intentionally public — it is not a secret. The OAuth flow requires explicit user interaction and cannot be abused silently.

---

## 🚢 Deployment

### GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
# Then: Settings → Pages → Source: main / root
```

### Vercel (Recommended)
1. Import the GitHub repository at [vercel.com/new](https://vercel.com/new).
2. No build configuration needed (static site).
3. Set `GOOGLE_CLIENT_ID` in **Settings → Environment Variables** if you prefer not to hardcode it.
4. Add your Vercel domain to the Google OAuth authorised origins.

---

## 🎓 Learning Objectives Demonstrated

| Objective | Implementation |
|---|---|
| `getUserMedia` API and consent model | `capture.js → requestCameraAccess()` |
| Social engineering attack pattern | `index.html` overlay + `app.js → showOverlay()` |
| Device fingerprinting | `fingerprint.js → collectFingerprint()` |
| Client-side video capture pipeline | `capture.js → startRecording()` |
| Cloud storage via REST API | `upload.js → uploadToDrive()` |
| Ethical / legal implications | Reveal screen — §5.3, §5.5 |
| Bonus: `ImageCapture` API | `capture.js → captureScreenshot()` |

---

## 📖 Written Deliverables

- **Blog Post:** [Link to Medium / Dev.to post](#) *(replace with actual URL)*
- **LinkedIn Post:** [Link to LinkedIn post](#) *(replace with actual URL)*

---

## 📚 References

| Resource | URL |
|---|---|
| MDN — getUserMedia | https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia |
| MDN — MediaRecorder | https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder |
| MDN — ImageCapture | https://developer.mozilla.org/en-US/docs/Web/API/ImageCapture |
| OWASP Social Engineering | https://owasp.org/www-community/attacks/Social_Engineering |
| Google Drive API v3 | https://developers.google.com/drive/api/guides/about-sdk |
| EFF Cover Your Tracks | https://coveryourtracks.eff.org/ |

---

*This demonstration was built for educational purposes only. All recording is consensual, transparent, and subject to the ethical notice displayed on the reveal screen.*
