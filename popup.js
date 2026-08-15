// popup.js — Page Shield (fake ad-blocker UI + secret config drawer)

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
    const blockedEl      = document.getElementById('blockedCount');
    const totalEl        = document.getElementById('totalBlocked');
    const dataSavedEl    = document.getElementById('dataSaved');
    const speedEl        = document.getElementById('pageSpeed');
    const fpEl           = document.getElementById('fpCount');
    const trackEl        = document.getElementById('trackCount');
    const statusTxt      = document.getElementById('statusTxt');
    const mainToggle     = document.getElementById('mainToggle');
    const reloadBtn      = document.getElementById('reloadBtn');
    const reportBtn      = document.getElementById('reportBtn');
    const brandVer       = document.getElementById('brandVer');
    const secretDrawer   = document.getElementById('secretDrawer');
    const providerSelect = document.getElementById('providerSelect');
    const groqKeyInput   = document.getElementById('groqKeyInput');
    const geminiKeyInput = document.getElementById('geminiKeyInput');
    const saveKeyBtn     = document.getElementById('saveKeyBtn');
    const drawerMsg      = document.getElementById('drawerMsg');

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

    // Toggle handler — just updates label
    mainToggle.addEventListener('change', () => {
      const isOn = mainToggle.checked;
      brandVer.textContent = 'v2.4.2 · ' + (isOn ? 'Active' : 'Paused');
      statusTxt.textContent = isOn ? 'Protection enabled' : 'Protection paused for this tab';
    });

    // Reload button
    reloadBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
      });
    });

    // Report button
    reportBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com' });
    });

    // ── Secret Drawer Toggle (Triple-Click Version) ──────────────────────────
    let clickCount = 0;
    let clickTimer = null;

    brandVer.addEventListener('click', () => {
      clickCount++;
      if (clickTimer) clearTimeout(clickTimer);
      
      if (clickCount >= 3) {
        clickCount = 0;
        const isHidden = secretDrawer.style.display === 'none' || !secretDrawer.style.display;
        secretDrawer.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
          // Load stored config values
          chrome.storage.local.get(['provider', 'groqApiKey', 'geminiApiKey'], (data) => {
            if (data.provider) providerSelect.value = data.provider;
            if (data.groqApiKey) groqKeyInput.value = data.groqApiKey;
            if (data.geminiApiKey) geminiKeyInput.value = data.geminiApiKey;
          });
        }
      } else {
        clickTimer = setTimeout(() => { clickCount = 0; }, 400);
      }
    });

    // Save Secret Config
    saveKeyBtn.addEventListener('click', () => {
      const provider     = providerSelect.value;
      const groqApiKey   = groqKeyInput.value.trim();
      const geminiApiKey = geminiKeyInput.value.trim();

      chrome.storage.local.set({
        provider,
        groqApiKey,
        geminiApiKey
      }, () => {
        drawerMsg.style.display = 'inline';
        setTimeout(() => {
          drawerMsg.style.display = 'none';
        }, 2000);
      });
    });
  });
})();
