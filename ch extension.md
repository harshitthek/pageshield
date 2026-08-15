# Page Shield — Quick Reference & Development Notes

## 📌 Key Architectural Components

### 1. Disguise Layer (`popup.html` & `popup.js`)
- Renders as a modern dark-mode Ad & Tracker Blocker named **Page Shield**.
- Emits zero suspicious UI elements on web pages.
- Numbers are deterministically seeded using the current date:
  ```javascript
  const seed = today.getDate() * 7 + today.getMonth() * 31;
  ```

### 2. Autofill Engine (`content.js`)
- Runs in isolated world at `document_idle` on `https://docs.google.com/forms/*`.
- **Question Containers:** Multi-signal detection checking `data-params`, `data-item-id`, and structural heading/input elements.
- **Smart Chunk Typing:**
  - Standard short text: Char-by-char with 28–75ms delay.
  - Long paragraphs/code (>150 chars): 15–40 char chunks with 8–25ms delay.
- **Snapshot Selection Capture:**
  - Before starting batch fill (`Alt+Shift+G`), snapshots all user-highlighted instructions to avoid losing them on focus shift.

### 3. Service Worker & AI Pipelines (`background.js`)
- **Primary Model:** `llama-3.3-70b-versatile` on Groq (fast, generous free tier rate limits).
- **Secondary Model:** `gemini-2.0-flash-lite` on Google AI Studio.
- **Retry Mechanism:** 3-attempt exponential backoff for rate limits (`429` / quota errors).
- **Rolling Memory:** Passes up to 5 previous Q&A pairs to ensure consistent answers.

---

## ⚡ Quick Keybindings Cheat-Sheet

| Key Combination | Function |
| :--- | :--- |
| `Alt + G` | Fill hovered or currently focused question |
| `Alt + Shift + G` | Batch-fill all remaining unanswered questions |
| `Triple-Click` | Silently autofill clicked question |
| `Escape` | Instant emergency abort / kill switch |
| `Highlight + Alt + G` | Custom prompt mode (e.g., specific language, tone, length) |

---

## 🔑 Setting API Key in Browser Console

If you don't want to edit `background.js`, open DevTools on any page and execute:
```javascript
chrome.storage.local.set({
  provider: 'groq',
  groqApiKey: 'YOUR_GROQ_KEY_HERE'
}, () => console.log('Page Shield API key saved successfully!'));
```
