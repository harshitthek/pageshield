<div align="center">
  <br />
  <h1>🛡️ Page Shield</h1>
  <p><b>Lightweight Privacy Defender & Intelligent Form Autofill Extension (Manifest V3)</b></p>
  <br />
</div>

---

## 🌟 Overview

**Page Shield** is a dual-layer Google Chrome extension built on **Manifest V3**:
1. **Frontend Persona:** Disguised as a clean, glassmorphic ad & privacy protection dashboard with dynamic, date-seeded threat blocking statistics.
2. **Core Automation:** An ultra-stealthy, intelligent Google Forms autofiller powered by **Groq (Llama 3.3 70B)** and **Google Gemini 2.0 Flash Lite**.

---

## ✨ Features

- **⚡ Blazing Fast Intelligence:** Powered by Groq's high-speed Llama 3.3 70B inference engine (up to 2048 tokens for deep code and essay questions).
- **🥷 100% Stealth Mode:**
  - Zero console logs, warnings, or errors output to DevTools.
  - Zero injected visible UI banners or watermarks on the form.
  - Fake ad-blocker toolbar popup interface.
- **🎓 Human-like "Average Student" Persona:** Prompted to write naturally and conversationally, avoiding rigid academic AI markers to bypass automated AI detectors.
- **🧠 Rolling Context Memory:** Retains the last 5 answered questions across the form to ensure contextually consistent multi-part answers.
- **🎯 Smart Text-Selection Instructions:** Highlight any text inside or near a question field (e.g. `"write code in Python and explain time complexity"`) and the engine will capture it as a critical priority instruction.
- **⚡ Dual-Speed Humanizer Engine:**
  - **Short Answers (< 150 chars):** Realistic human keystroke typing simulation with randomized character delays (28–75ms).
  - **Long Answers & Code (> 150 chars):** Rapid chunk-pasting in randomized blocks (15–40 chars every 8–25ms) to fill large text/code blocks in 1–2 seconds.
- **📋 Universal Input Support:**
  - Short text answers & multi-line textareas.
  - Radio button groups (single choice).
  - Checkboxes (multi-select).
  - Dropdown select menus.
  - Linear rating scales (1–5, 1–10).
- **🛑 Emergency Kill Switch:** Instant abort on `Escape` key press to stop all active typing or batch operations immediately.

---

## ⌨️ Shortcuts & Controls

| Trigger | Action | Description |
| :--- | :--- | :--- |
| `Alt + G` | **Fill Single Question** | Autofills the currently hovered, focused, or next unanswered question. |
| `Alt + Shift + G` | **Batch Fill All** | Automatically scans and fills all unanswered questions across the entire form. |
| **Triple-Click** | **Silent Fill** | Triple-click directly on any question text to silently trigger autofill. |
| `Escape` (`Esc`) | **Kill Switch** | Instantly halts active typing, network requests, or batch processing loops. |
| **Highlight Text + `Alt+G`** | **Custom Prompting** | Select instructions inside the input box to override AI behavior for that specific question. |

---

## 🚀 Setup & Installation

### 1. Configure Your API Key
Get a free API key from [Groq Console](https://console.groq.com/keys) (or [Google AI Studio](https://aistudio.google.com/app/apikey)).

You can configure the key in **either** of two ways:

#### Option A: In `background.js` (Easiest)
Open `background.js` and paste your key into the `CONFIG` block:
```javascript
const CONFIG = {
  provider: 'groq', // 'groq' or 'gemini'
  groqApiKey: 'gsk_YOUR_GROQ_API_KEY_HERE',
  geminiApiKey: ''
};
```

#### Option B: Via Chrome Storage (No code edit)
Open Chrome DevTools (`F12`) on the extension background page or console and run:
```javascript
chrome.storage.local.set({
  provider: 'groq',
  groqApiKey: 'gsk_YOUR_GROQ_API_KEY_HERE'
});
```

### 2. Load into Chrome / Brave
1. Open Google Chrome / Brave and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left menu.
4. Select the `ch extension` project folder.
5. Open any Google Form (`docs.google.com/forms/*`) and use `Alt + G` to fill questions!

---

## 📁 Repository Structure

```
├── manifest.json       # Manifest V3 extension configuration
├── background.js       # Service worker handling Groq/Gemini API calls & prompts
├── content.js          # DOM detector, human typing simulator & event listeners
├── popup.html          # Disguise UI (Ad Blocker dashboard)
├── popup.js            # Seeded realistic statistics & toggle interactions
├── icons/              # Shield theme extension icons
├── .env.example        # Environment configuration template
├── .gitignore          # Git exclusion rules
├── ch extension.md     # Quick reference & architecture notes
└── README.md           # Full project documentation
```

---

## 🔒 Security & Privacy

- **No Data Collection:** All requests are sent directly from your local browser to the Groq/Gemini API endpoint without third-party intermediate proxies.
- **Git Safety:** Always keep your repository **Private** if you hardcode personal API keys, or use `chrome.storage.local` to store keys dynamically.
