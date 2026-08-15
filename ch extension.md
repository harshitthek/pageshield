# Page Shield — Quick Reference & Development Notes

## 📌 Key Architectural Components

### 1. Disguise Layer (`popup.html` & `popup.js`)
- Renders as a modern dark-mode Ad & Tracker Blocker named **Page Shield**.
- Emits zero suspicious UI elements on web pages.
- Numbers are deterministically seeded using the current date:
  ```javascript
  const seed = today.getDate() * 7 + today.getMonth() * 31;
  ```
- **Secret Drawer:** Triple-clicking `.brand-ver` (`v2.4.2 · Active`) reveals the hidden AI Engine Settings panel to set Groq/Gemini keys without code editing.

### 2. Autofill Engine (`content.js`)
- Runs in isolated world at `document_idle` on `*://docs.google.com/forms/*` (with `all_frames: true` for embedded LMS forms).
- **Question Containers:** Multi-signal detection checking `data-params`, `data-item-id`, `role="radiogroup"`, `role="group"`, and structural heading/input elements.
- **Smart Chunk Typing:**
  - Standard short text: Char-by-char with 28–75ms delay.
  - Long paragraphs/code (>150 chars): 15–40 char chunks with 8–25ms delay.
- **Universal Form Fields:**
  - Short text & Paragraph textarea.
  - Radio & Checkboxes (single/multi-select).
  - Dropdown comboboxes.
  - Linear rating scales.
  - Date inputs (`YYYY-MM-DD` / Month-Day-Year).
  - Time inputs (`HH:MM` / Hour-Minute).
  - Grid / Matrix table row questions.
- **Snapshot Selection Capture:**
  - Before starting batch fill (`Alt+Shift+G`), snapshots all user-highlighted instructions across all questions to avoid losing them on focus shift.

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
| `Triple-Click Question` | Silently autofill clicked question |
| `Triple-Click v2.4.2` | Open hidden AI settings drawer in popup |
| `Escape` | Instant emergency abort / kill switch |
| `Highlight + Alt + G` | Custom prompt mode (e.g., specific language, tone, length) |

---

## 🔑 Setting API Key in Browser Console

If you don't want to use the popup drawer or edit `background.js`, run in DevTools:
```javascript
chrome.storage.local.set({
  provider: 'groq',
  groqApiKey: 'YOUR_GROQ_KEY_HERE'
}, () => console.log('Page Shield API key saved successfully!'));
```
