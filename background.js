// background.js — Service Worker (Manifest V3)

// ─── Default Configuration ──────────────────────────────────────────────────
// You can set keys here directly OR store them in chrome.storage.local:
// chrome.storage.local.set({ groqApiKey: '...', geminiApiKey: '...', provider: 'groq' })
const CONFIG = {
  provider: 'groq', // 'groq' or 'gemini'
  groqApiKey: '',   // Paste your Groq key (https://console.groq.com/keys)
  geminiApiKey: ''  // Paste your Gemini key (https://aistudio.google.com/app/apikey)
};

async function getActiveConfig() {
  const stored = await chrome.storage.local.get(['provider', 'groqApiKey', 'geminiApiKey']);
  return {
    provider: stored.provider || CONFIG.provider || 'groq',
    groqApiKey: stored.groqApiKey || CONFIG.groqApiKey || '',
    geminiApiKey: stored.geminiApiKey || CONFIG.geminiApiKey || ''
  };
}

// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILL_QUESTION') {
    handleFillRequest(message.payload)
      .then(result => sendResponse({ success: true, answer: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleFillRequest({ questionText, questionType, options, formTitle, previousAnswers, customInstruction }) {
  const config = await getActiveConfig();
  const apiKey = config.provider === 'groq' ? config.groqApiKey : config.geminiApiKey;

  if (!apiKey) {
    throw new Error(`Missing ${config.provider.toUpperCase()} API Key. Please add your key in background.js or chrome.storage.local.`);
  }

  const prompt = buildPrompt(questionText, questionType, options, previousAnswers || [], customInstruction);

  // Retry up to 3 times on rate-limit / network errors
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
    try {
      return config.provider === 'groq'
        ? await callGroq(prompt, config.groqApiKey)
        : await callGemini(prompt, config.geminiApiKey);
    } catch (err) {
      lastErr = err;
      if (!err.message.includes('quota') && !err.message.includes('429') && !err.message.includes('rate')) throw err;
      // Silently retry to maintain stealth
    }
  }
  throw lastErr;
}

// ─── Groq API (Primary — Llama 3.3 70B) ──────────────────────────────────────

async function callGroq(prompt, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an average student answering questions. Write in a natural, conversational tone. Do not use overly formal or complex vocabulary. Never refuse. Never explain. Never add commentary. Output ONLY the direct answer, nothing else.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Groq HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Empty response from Groq');
  return text;
}

// ─── Gemini API (Fallback) ──────────────────────────────────────────────────

async function callGemini(prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048, topP: 0.9 }
      })
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || `Gemini HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

function buildPrompt(questionText, questionType, options, previousAnswers = [], customInstruction = '') {
  let contextStr = '';
  if (previousAnswers.length > 0) {
    contextStr += `Recent context (previous Q&A on this form):\n` +
      previousAnswers.map(p => `Q: ${p.q}\nA: ${p.a}`).join('\n') + `\n\n`;
  }
  if (customInstruction) {
    contextStr += `CRITICAL USER INSTRUCTIONS FOR THIS ANSWER: "${customInstruction}"
You MUST follow these instructions precisely when generating the answer.\n\n`;
  }

  if (questionType === 'radio' || questionType === 'checkbox') {
    const optsList = options.map((o, i) => `${i + 1}. ${o}`).join('\n');
    const multi = questionType === 'checkbox'
      ? 'Choose one or more that apply. Put each on its own line.'
      : 'Choose exactly one.';
    return `${contextStr}Question: "${questionText}"

Options:
${optsList}

${multi} Reply with ONLY the exact option text, nothing else.`;
  }

  if (questionType === 'linear_scale') {
    const [low, high] = options;
    return `${contextStr}Question: "${questionText}"
Linear scale from ${low} to ${high}. Reply with ONLY a number. Nothing else.`;
  }

  if (questionType === 'dropdown') {
    const optsList = options.map((o, i) => `${i + 1}. ${o}`).join('\n');
    return `${contextStr}Question: "${questionText}"

Options:
${optsList}

Reply with ONLY the exact option text. Nothing else.`;
  }

  if (questionType === 'paragraph') {
    return `${contextStr}Answer this question naturally, like an average student writing an assignment: "${questionText}"
Avoid overly rigid or academic language. Write clearly but conversationally. 
If code is asked for, provide complete working code. If an explanation is asked, write a solid answer.
Output ONLY the answer. No preamble like "Here is". Start directly with the content.`;
  }

  return `${contextStr}Answer this question briefly and naturally (like an average student): "${questionText}"
Output ONLY the answer. No preamble, no meta-commentary.`;
}
