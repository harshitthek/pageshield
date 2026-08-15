// content.js — Google Forms Autofill (Page Shield internal module)

(function () {
  'use strict';

  let mouseX = 0, mouseY = 0;
  let hoveredQuestion = null;
  let isFilling = false;
  let isAborted = false;

  // ── Track previous Q&A for context ────────────────────────────────────────
  const answeredPairs = [];

  // ── Mouse tracking ────────────────────────────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, true);

  document.addEventListener('mouseover', (e) => {
    const c = findQuestionContainer(e.target);
    if (c) hoveredQuestion = c;
  }, true);

  document.addEventListener('focusin', (e) => {
    const c = findQuestionContainer(e.target);
    if (c) hoveredQuestion = c;
  }, true);

  // ── Escape, Alt+G, and Triple-Click triggers ──────────────────────────────

  // Triple-click trigger
  document.addEventListener('click', async (e) => {
    if (e.detail >= 3) {
      const c = findQuestionContainer(e.target);
      if (c && !isFilling) {
        e.preventDefault();
        e.stopImmediatePropagation();
        isFilling = true;
        isAborted = false;
        try {
          await fillSingleQuestion(c);
        } catch (err) { }
        finally {
          isFilling = false;
        }
      }
    }
  }, true);

  // Keyboard triggers
  document.addEventListener('keydown', async (e) => {
    // Emergency kill switch
    if (e.key === 'Escape' && isFilling) {
      isAborted = true;
      isFilling = false;
      return;
    }

    if (!e.altKey || (e.code !== 'KeyG' && e.key.toLowerCase() !== 'g')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (isFilling) return;
    isFilling = true;
    isAborted = false; // Reset abort flag on new run

    try {
      if (e.shiftKey) {
        await fillAllQuestions();
      } else {
        const target =
          hoveredQuestion ||
          findQuestionFromPoint(mouseX, mouseY) ||
          findFocusedQuestion() ||
          findFirstUnanswered();

        if (!target) return;
        await fillSingleQuestion(target);
      }
    } catch (err) {
      // Silently catch errors to remain stealthy
    } finally {
      isFilling = false;
    }
  }, true);

  // ── Container detection ───────────────────────────────────────────────────

  function findQuestionFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? findQuestionContainer(el) : null;
  }

  function findFocusedQuestion() {
    return findQuestionContainer(document.activeElement);
  }

  function findQuestionContainer(el) {
    if (!el || el === document || el === document.body) return null;
    let node = el;
    let depth = 0;
    while (node && node !== document.body && depth < 30) {
      if (isQuestionNode(node)) return node;
      node = node.parentElement;
      depth++;
    }
    return null;
  }

  function isQuestionNode(node) {
    if (!node || !node.tagName) return false;
    if (node.hasAttribute('data-params')) return true;
    if (node.hasAttribute('data-item-id')) return true;
    if (node.getAttribute('role') === 'radiogroup' || node.getAttribute('role') === 'group') return true;

    const hasHeading =
      !!node.querySelector('[role="heading"]') ||
      !!node.querySelector('h1,h2,h3,h4') ||
      !!node.querySelector('[role="rowheader"]');
    if (!hasHeading) return false;

    const hasInput = !!node.querySelector(
      'input[type="text"], input[type="date"], input[type="time"], textarea, ' +
      '[role="radio"], [role="checkbox"], ' +
      '[role="radiogroup"], [role="combobox"], [role="listbox"]'
    );
    if (!hasInput) return false;

    const r = node.getBoundingClientRect();
    return r.width > 50 && r.height > 20 && r.height < 800;
  }

  function getAllQuestionContainers() {
    const seen = new Set();
    const results = [];
    const add = (el) => {
      const c = findQuestionContainer(el);
      if (c && !seen.has(c)) { seen.add(c); results.push(c); }
    };
    document.querySelectorAll('[data-params]').forEach(add);
    document.querySelectorAll('[data-item-id]').forEach(add);
    document.querySelectorAll(
      'input[type="text"], input[type="date"], input[type="time"], textarea, [role="radiogroup"], [role="group"]'
    ).forEach(el => add(el));
    return results;
  }

  function findFirstUnanswered() {
    const all = getAllQuestionContainers();
    return all.find(c => !hasAnswer(c)) || all[0] || null;
  }

  function getCustomInstruction(container) {
    let instr = '';
    try {
      const sel = window.getSelection();
      if (sel.toString().trim().length > 0 && container.contains(sel.anchorNode)) {
        instr = sel.toString().trim();
      }
    } catch (e) { }

    if (!instr) {
      const inputs = container.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), textarea');
      for (const input of inputs) {
        try {
          if (input.selectionStart !== input.selectionEnd) {
            instr = input.value.substring(input.selectionStart, input.selectionEnd).trim();
            if (instr) break;
          }
        } catch (e) { }
      }
    }
    return instr;
  }

  function hasAnswer(container) {
    // If there's an active text selection in this container, it's an instruction! Do NOT skip it.
    if (getCustomInstruction(container)) return false;

    const inputs = container.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), textarea');
    for (const input of inputs) {
      if (input.value?.trim()) return true;
    }

    if (container.querySelector('[aria-checked="true"]')) return true;
    if (container.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked')) return true;
    return false;
  }

  // ── Fill logic ────────────────────────────────────────────────────────────

  async function fillAllQuestions() {
    const containers = getAllQuestionContainers();

    // Pre-calculate which questions to fill and capture selections BEFORE focus moves
    const targets = [];
    for (const c of containers) {
      const instr = getCustomInstruction(c);

      let skip = false;
      if (!instr) {
        skip = _checkIfAnswered(c);
      }

      if (!skip) {
        targets.push({ container: c, instruction: instr });
      }
    }

    for (const target of targets) {
      if (isAborted) break;
      await fillSingleQuestion(target.container, target.instruction);
      if (isAborted) break;
      await sleep(randomBetween(400, 800));
    }
  }

  function _checkIfAnswered(container) {
    const inputs = container.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), textarea');
    for (const input of inputs) {
      if (input.value?.trim()) return true;
    }
    if (container.querySelector('[aria-checked="true"]')) return true;
    if (container.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked')) return true;
    return false;
  }

  async function fillSingleQuestion(container, precomputedInstruction = null) {
    if (isAborted) return;
    const questionData = extractQuestion(container);
    if (!questionData) return;

    const customInstruction = precomputedInstruction !== null ? precomputedInstruction : getCustomInstruction(container);

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: 'FILL_QUESTION',
        payload: {
          ...questionData,
          customInstruction,
          formTitle: getFormTitle(),
          previousAnswers: answeredPairs.slice(-5)
        }
      });
    } catch (e) {
      return;
    }

    if (isAborted) return;

    if (response?.success) {
      await fillAnswer(container, questionData, response.answer);
      answeredPairs.push({
        q: questionData.questionText,
        a: response.answer.substring(0, 200)
      });
    }
  }

  // ── Question extraction ───────────────────────────────────────────────────

  function getFormTitle() {
    const el = document.querySelector(
      '[role="heading"][aria-level="1"], .freebirdFormviewerViewHeaderTitle, h1'
    );
    return el?.textContent?.trim() || '';
  }

  function extractQuestion(container) {
    let titleEl = container.querySelector(
      '[role="heading"], .freebirdFormviewerViewItemsItemItemTitle, .M7eMe, .HoXoMd'
    );
    let questionText = titleEl?.textContent?.trim();

    // Grid / Matrix row fallback: Check if this container is a row inside a grid table
    if (!questionText) {
      const parentContainer = container.closest('[data-params], [data-item-id], .freebirdFormviewerViewItemsGridGrid');
      const parentTitle = parentContainer?.querySelector('[role="heading"], .M7eMe, .HoXoMd')?.textContent?.trim();
      const rowHeader = container.querySelector('.freebirdFormviewerComponentsQuestionGridRowHeader, [role="rowheader"], td:first-child')?.textContent?.trim();
      if (parentTitle && rowHeader) {
        questionText = `${parentTitle} - ${rowHeader}`;
      } else if (parentTitle) {
        questionText = parentTitle;
      }
    }

    if (!questionText) return null;

    const lowerQ = questionText.toLowerCase();
    const looksLikeEssay = /\b(marks?|explain|describe|write|discuss|elaborate|detail|code)\b/.test(lowerQ);

    // Date questions
    const dateInput = container.querySelector('input[type="date"], input[aria-label*="Month" i], input[aria-label*="Day" i], input[aria-label*="Year" i]');
    if (dateInput) {
      return { questionText, questionType: 'date', options: [] };
    }

    // Time questions
    const timeInput = container.querySelector('input[type="time"], input[aria-label*="Hour" i], input[aria-label*="Minute" i]');
    if (timeInput) {
      return { questionText, questionType: 'time', options: [] };
    }

    // Checkboxes
    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    if (checkboxes.length > 0) {
      const options = [...checkboxes].map(c => getOptionLabel(c));
      return { questionText, questionType: 'checkbox', options };
    }

    // Radio / linear scale
    const radios = container.querySelectorAll('[role="radio"]');
    if (radios.length > 0) {
      const labels = [...radios].map(r => getOptionLabel(r));
      const allNumeric = labels.every(l => /^\d+$/.test(l.trim()));
      if (allNumeric) {
        return { questionText, questionType: 'linear_scale', options: [labels[0], labels[labels.length - 1]] };
      }
      return { questionText, questionType: 'radio', options: labels };
    }

    // Dropdown
    const combobox = container.querySelector('[role="combobox"], [role="listbox"]');
    if (combobox) {
      const opts = [...container.querySelectorAll('[role="option"]')]
        .map(o => o.textContent.trim()).filter(Boolean);
      return { questionText, questionType: 'dropdown', options: opts };
    }

    // Paragraph (textarea)
    const textarea = container.querySelector('textarea');
    if (textarea) return { questionText, questionType: 'paragraph', options: [] };

    // Short answer input
    const textInput = container.querySelector(
      'input[type="text"], input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"])'
    );
    if (textInput) {
      const type = looksLikeEssay ? 'paragraph' : 'short_answer';
      return { questionText, questionType: type, options: [] };
    }

    return { questionText, questionType: looksLikeEssay ? 'paragraph' : 'short_answer', options: [] };
  }

  function getOptionLabel(el) {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();
    const clone = el.cloneNode(true);
    clone.querySelectorAll('[aria-hidden="true"]').forEach(n => n.remove());
    return clone.textContent.trim();
  }

  // ── Fill answer by type ───────────────────────────────────────────────────

  async function fillAnswer(container, { questionType }, rawAnswer) {
    if (isAborted) return;
    switch (questionType) {
      case 'date': {
        await fillDate(container, rawAnswer.trim());
        break;
      }
      case 'time': {
        await fillTime(container, rawAnswer.trim());
        break;
      }
      case 'short_answer': {
        const input = container.querySelector(
          'input[type="text"], input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"])'
        );
        if (input) await typeInto(input, rawAnswer.split('\n')[0].trim());
        break;
      }
      case 'paragraph': {
        const ta = container.querySelector('textarea') ||
          container.querySelector('input[type="text"], input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"])');
        if (ta) await smartType(ta, rawAnswer.trim());
        break;
      }
      case 'radio': {
        await clickBestOption(container, '[role="radio"]', rawAnswer.split('\n')[0].trim());
        break;
      }
      case 'checkbox': {
        const lines = rawAnswer.split('\n').map(s => s.trim()).filter(Boolean);
        for (const line of lines) {
          if (isAborted) break;
          await clickBestOption(container, '[role="checkbox"]', line);
          if (!isAborted) await sleep(randomBetween(60, 160));
        }
        break;
      }
      case 'dropdown': {
        await fillDropdown(container, rawAnswer.split('\n')[0].trim());
        break;
      }
      case 'linear_scale': {
        const num = rawAnswer.trim().match(/\d+/)?.[0];
        if (num) await clickLinearScale(container, num);
        break;
      }
    }
  }

  // ── Smart typing: fast for long text, natural for short ───────────────────

  async function smartType(el, text) {
    if (text.length > 150) {
      await pasteInChunks(el, text);
    } else {
      await typeInto(el, text);
    }
  }

  async function pasteInChunks(el, text) {
    el.focus();
    if (!isAborted) await sleep(randomBetween(80, 200));

    setNativeValue(el, '');
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    if (!isAborted) await sleep(50);

    const chunks = [];
    let i = 0;
    while (i < text.length) {
      const size = Math.min(randomBetween(15, 40), text.length - i);
      chunks.push(text.substring(i, i + size));
      i += size;
    }

    let current = '';
    for (const chunk of chunks) {
      if (isAborted) break;
      current += chunk;
      setNativeValue(el, current);
      el.dispatchEvent(new InputEvent('input', {
        inputType: 'insertText',
        data: chunk,
        bubbles: true
      }));
      await sleep(randomBetween(8, 25));
    }

    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  async function typeInto(el, text) {
    el.focus();
    if (!isAborted) await sleep(randomBetween(80, 200));

    setNativeValue(el, '');
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    if (!isAborted) await sleep(randomBetween(40, 100));

    for (const char of text) {
      if (isAborted) break;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: 'Key' + char.toUpperCase(), bubbles: true }));
      setNativeValue(el, el.value + char);
      el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: char, bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
      await sleep(randomBetween(28, 75));
    }

    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
  }

  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc =
      Object.getOwnPropertyDescriptor(el, 'value') ||
      Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
  }

  // ── Date & Time Fillers ───────────────────────────────────────────────────

  async function fillDate(container, rawAnswer) {
    const match = rawAnswer.match(/(\d{4})-(\d{1,2})-(\d{1,2})/) || rawAnswer.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const dateInput = container.querySelector('input[type="date"]');
    if (dateInput && match) {
      const y = match[1].length === 4 ? match[1] : match[3];
      const m = (match[1].length === 4 ? match[2] : match[1]).padStart(2, '0');
      const d = (match[1].length === 4 ? match[3] : match[2]).padStart(2, '0');
      setNativeValue(dateInput, `${y}-${m}-${d}`);
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    const monthInput = container.querySelector('input[aria-label*="Month" i]');
    const dayInput = container.querySelector('input[aria-label*="Day" i]');
    const yearInput = container.querySelector('input[aria-label*="Year" i]');

    if (monthInput && dayInput && yearInput && match) {
      const y = match[1].length === 4 ? match[1] : match[3];
      const m = match[1].length === 4 ? match[2] : match[1];
      const d = match[1].length === 4 ? match[3] : match[2];

      await typeInto(monthInput, m.padStart(2, '0'));
      await typeInto(dayInput, d.padStart(2, '0'));
      await typeInto(yearInput, y);
    } else {
      const firstInput = container.querySelector('input:not([type="hidden"])');
      if (firstInput) await typeInto(firstInput, rawAnswer);
    }
  }

  async function fillTime(container, rawAnswer) {
    const match = rawAnswer.match(/(\d{1,2}):(\d{2})/);
    const timeInput = container.querySelector('input[type="time"]');
    if (timeInput && match) {
      setNativeValue(timeInput, `${match[1].padStart(2, '0')}:${match[2]}`);
      timeInput.dispatchEvent(new Event('input', { bubbles: true }));
      timeInput.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    const hourInput = container.querySelector('input[aria-label*="Hour" i]');
    const minuteInput = container.querySelector('input[aria-label*="Minute" i]');
    if (hourInput && minuteInput && match) {
      await typeInto(hourInput, match[1].padStart(2, '0'));
      await typeInto(minuteInput, match[2]);
    } else {
      const firstInput = container.querySelector('input:not([type="hidden"])');
      if (firstInput) await typeInto(firstInput, rawAnswer);
    }
  }

  // ── Option clicking ──────────────────────────────────────────────────────

  async function clickBestOption(container, selector, answer) {
    const options = [...container.querySelectorAll(selector)];
    if (!options.length) return;
    const best = bestMatch(options, answer);
    if (!best) return;
    if (!isAborted) await sleep(randomBetween(80, 250));
    if (!isAborted) humanClick(best);
  }

  function bestMatch(options, answer) {
    const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const na = norm(answer);
    return (
      options.find(o => norm(getOptionLabel(o)) === na) ||
      options.find(o => norm(getOptionLabel(o)).includes(na) || na.includes(norm(getOptionLabel(o)))) ||
      options[0]
    );
  }

  function humanClick(el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy };
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new MouseEvent('mousedown', { ...opts, button: 0 }));
    el.dispatchEvent(new MouseEvent('mouseup', { ...opts, button: 0 }));
    el.dispatchEvent(new MouseEvent('click', { ...opts, button: 0 }));
  }

  // ── Dropdown ──────────────────────────────────────────────────────────────

  async function fillDropdown(container, answer) {
    const trigger = container.querySelector('[role="combobox"], [role="listbox"]');
    if (!trigger) return;
    humanClick(trigger);
    if (isAborted) return;
    await sleep(randomBetween(250, 450));

    if (isAborted) return;
    const opts = [...document.querySelectorAll('[role="option"]')];
    const best = bestMatch(opts, answer);
    if (best) {
      await sleep(randomBetween(60, 150));
      if (!isAborted) humanClick(best);
    }
  }

  // ── Linear scale ──────────────────────────────────────────────────────────

  async function clickLinearScale(container, value) {
    const radios = [...container.querySelectorAll('[role="radio"]')];
    const target = radios.find(r => {
      const lbl = r.getAttribute('aria-label') || r.textContent.trim();
      return lbl.startsWith(value);
    });
    if (target) {
      if (!isAborted) await sleep(randomBetween(100, 280));
      if (!isAborted) humanClick(target);
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const randomBetween = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

})();
