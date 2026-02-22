<p align="center">
  <img src="icons/icon128.png" alt="Open in Steam logo" width="96" />
</p>

<h1 align="center">Open in Steam</h1>

<p align="center">
  <strong>Launch Steam Store &amp; Community pages directly in the Steam desktop client – one click, no hassle.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-V3-blue?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Chrome-88%2B-brightgreen?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome 88+" />
  <img src="https://img.shields.io/badge/Edge-88%2B-blue?style=flat-square&logo=microsoftedge&logoColor=white" alt="Edge 88+" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
  <img src="https://img.shields.io/badge/No_Tracking-100%25_Private-success?style=flat-square" alt="Zero Tracking" />
</p>

---

## 🚀 What It Does

**Open in Steam** (OIS) is a lightweight Chrome/Edge browser extension that bridges the gap between Steam's web pages and the desktop client. Instead of copy-pasting links or hunting through the client, just click a button and you're there.

### Two Ways to Open

| Method | Where It Works | How It Looks |
|--------|---------------|-------------|
| **🟢 In-Page Button** | App, Sub, Bundle & Workshop pages | A native-looking green button injected into Steam's header |
| **🔧 Toolbar Icon** | *Any* Steam page | Click the extension icon in your browser toolbar |

---

## ✨ Features

- 🎮 **One-Click Launch** — Open any Steam page in the desktop client instantly
- 🧩 **Native Integration** — Button seamlessly blends into Steam's UI
- 📦 **Manifest V3** — Built with the latest extension standards
- 🔒 **Zero Tracking** — No analytics, no network requests, no data collection
- ⚡ **SPA-Aware** — Handles Steam's dynamic page loads without missing a beat
- 🎯 **Smart Fallback** — Fixed-position button when header injection isn't possible
- 🛠️ **No Build Tools** — Pure JS/CSS, ready to load and go
- 📱 **Responsive** — Icon-only mode on smaller viewports

---

## 📦 Installation

> **Note:** This extension is sideloaded (not published on the Web Store). This means you load it directly from the source folder.

### Microsoft Edge

1. Navigate to `edge://extensions/`
2. Enable **Developer mode** (toggle in the bottom-left)
3. Click **Load unpacked**
4. Select the folder containing `manifest.json`
5. Visit a [Steam Store](https://store.steampowered.com/) page — the button appears automatically!

### Google Chrome

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select the folder containing `manifest.json`
5. Visit a [Steam Store](https://store.steampowered.com/) page — the button appears automatically!

---

## 🎮 Supported Pages

| Page Type | URL Pattern | Deep Link Used | In-Page Button | Toolbar |
|-----------|-------------|----------------|:--------------:|:-------:|
| **Store App** | `store.steampowered.com/app/730/...` | `steam://store/730` | ✅ | ✅ |
| **Store Sub** | `store.steampowered.com/sub/12345/` | `steam://openurl/...` | ✅ | ✅ |
| **Store Bundle** | `store.steampowered.com/bundle/12345/` | `steam://openurl/...` | ✅ | ✅ |
| **Workshop** | `steamcommunity.com/sharedfiles/filedetails/?id=...` | `steam://url/CommunityFilePage/...` | ✅ | ✅ |
| **Other Steam** | Any `store.steampowered.com` or `steamcommunity.com` page | `steam://openurl/...` | ❌ | ✅ |

---

## ⚙️ How It Works

```
┌─────────────────────────────────────────────────┐
│                   User visits                   │
│           a Steam web page in browser           │
└──────────────────────┬──────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         ▼                            ▼
┌─────────────────┐         ┌─────────────────┐
│  Content Script │         │ Background Script│
│  (content.js)   │         │ (background.js)  │
│                 │         │                  │
│ • Detects page  │         │ • Listens for    │
│   type via URL  │         │   toolbar click  │
│ • Injects green │         │ • Converts any   │
│   button into   │         │   Steam URL to   │
│   page header   │         │   steam:// link  │
│ • Watches for   │         │                  │
│   SPA nav       │         │                  │
└───────┬─────────┘         └────────┬─────────┘
        │                            │
        └────────────┬───────────────┘
                     ▼
          ┌──────────────────┐
          │  steam:// URL    │
          │  opens the Steam │
          │  desktop client  │
          └──────────────────┘
```

### Content Script Flow

1. **Injection** — Runs on `store.steampowered.com` and `steamcommunity.com` at `document_idle`
2. **Detection** — `detectPageInfo()` matches URL patterns to extract app/sub/bundle/workshop IDs
3. **Button Creation** — Builds a Steam-styled button with the official Steam logo SVG
4. **Smart Placement** — Tries multiple header selectors, falls back to fixed positioning
5. **Navigation Handling** — `MutationObserver` + periodic URL polling ensures the button updates on SPA navigation

### Background Script Flow

1. **Toolbar Click** — Intercepts `chrome.action.onClicked` events
2. **URL Mapping** — `toSteamClientUrl()` converts the current tab URL to the best `steam://` deep link
3. **Launch** — Navigates the tab to the `steam://` URL, which the OS hands off to the Steam client

---

## � Project Structure

```
open-in-steam/
├── manifest.json      # Extension config (Manifest V3)
├── background.js      # Service worker — toolbar icon handler
├── content.js         # Content script — page detection & button injection
├── content.css        # Steam-native button styles
├── icons/             # Extension icons (16, 32, 48, 128px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## 🛠️ Customization

<details>
<summary><strong>Change Button Colors</strong></summary>

Edit `content.css`:

```css
.ois-steam-button {
  /* Default: Steam green gradient */
  background: linear-gradient(135deg, #799905 0%, #536904 100%);
}
```
</details>

<details>
<summary><strong>Change Injection Points</strong></summary>

Modify `HEADER_SELECTORS` in `content.js`:

```javascript
const HEADER_SELECTORS = [
  '.apphub_OtherSiteInfo',       // Steam Store primary target
  '.workshopItemDetailsHeader',  // Workshop primary target
  // Add your own selectors here
];
```
</details>

<details>
<summary><strong>Adjust Navigation Polling</strong></summary>

Change the URL check interval in `content.js` (default: 500ms):

```javascript
const URL_CHECK_INTERVAL = 500; // ms — lower = more responsive, higher = less CPU
```
</details>

---

## 🔒 Privacy

| | |
|---|---|
| ❌ Data collection | None whatsoever |
| ❌ Network requests | Zero — runs entirely offline |
| ❌ Remote code / CDNs | None — everything is local |
| ✅ Permissions | `activeTab` only (minimal) |
| ✅ Open source | Full source code, no obfuscation |

---

## 📋 Requirements

- **Browser:** Google Chrome 88+ or Microsoft Edge 88+ (Chromium-based)
- **Steam:** Desktop client installed with [steam:// protocol registered](https://developer.valvesoftware.com/wiki/Steam_browser_protocol) (default with any Steam install)

---

## 📄 License

[MIT License](LICENSE) — free to use, modify, and distribute.

---

<p align="center">
  Built with ❤️ for the Steam community
</p>
