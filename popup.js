// popup.js — Page Shield (fake ad-blocker UI)
// All numbers are plausible but randomly seeded — looks real, means nothing

(function () {
  // ── Seed random-but-stable session numbers using date ──────────────────────
  const today = new Date();
  const seed = today.getDate() * 7 + today.getMonth() * 31;

  function seededRand(base, variance, s) {
    return base + Math.floor(((seed * s * 9301 + 49297) % 233280) / 233280 * variance);
  }

  const pageBlocked  = seededRand(14, 48, 1);
  const totalBlocked = seededRand(18400, 7000, 2);
  const fpCount      = seededRand(3, 14, 3);
  const trackCount   = seededRand(7, 31, 4);
  const dataSavedKb  = seededRand(820, 3200, 5);
  const speedBoost   = seededRand(18, 34, 6);

  function formatTotal(n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();
  }

  function formatData(kb) {
    return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
  }

  // ── Animate counter up ─────────────────────────────────────────────────────
  function animateCount(el, target, suffix = '', duration = 600) {
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── Populate UI ────────────────────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', () => {
    const blockedEl    = document.getElementById('blockedCount');
    const totalEl      = document.getElementById('totalBlocked');
    const dataSavedEl  = document.getElementById('dataSaved');
    const speedEl      = document.getElementById('pageSpeed');
    const fpEl         = document.getElementById('fpCount');
    const trackEl      = document.getElementById('trackCount');
    const statusTxt    = document.getElementById('statusTxt');
    const mainToggle   = document.getElementById('mainToggle');
    const reloadBtn    = document.getElementById('reloadBtn');
    const reportBtn    = document.getElementById('reportBtn');

    // Animate numbers in
    setTimeout(() => {
      animateCount(blockedEl, pageBlocked, '', 500);
      totalEl.textContent    = formatTotal(totalBlocked);
      dataSavedEl.textContent = formatData(dataSavedKb);
      speedEl.textContent    = '+' + speedBoost + '%';
      fpEl.textContent       = fpCount;
      trackEl.textContent    = trackCount;
    }, 120);

    // Status message variants
    const statuses = [
      'All filters up to date',
      'Protecting your browser…',
      'Blocking malicious scripts',
      'Filters synced · ' + new Date().toLocaleDateString()
    ];
    statusTxt.textContent = statuses[seed % statuses.length];

    // Toggle handler — just updates label, no real action
    mainToggle.addEventListener('change', () => {
      const isOn = mainToggle.checked;
      document.querySelector('.brand-ver').textContent =
        'v2.4.1 · ' + (isOn ? 'Active' : 'Paused');
      statusTxt.textContent = isOn ? 'Protection enabled' : 'Protection paused for this tab';
    });

    // Reload button
    reloadBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
      });
    });

    // Report button — opens a generic feedback URL (looks legit)
    reportBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com' });
    });
  });
})();
