// ═══════════════════════════════════════════════════════════
// EpinGrid — предупреждение при повторном вводе ID/юзернейма
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  const HISTORY = window.distRecipientHistory;
  if (!HISTORY) {
    console.warn('[EpinGrid] recipient-history.js не загружен');
    return;
  }

  // Метки полей, которые нас интересуют
  const RECIPIENT_FIELD_HINTS = [
    'id', 'айди',
    'username', 'юзернейм', 'ник', 'nickname',
    '@username',
    'pubg', 'genshin', 'roblox', 'mlbb', 'mobile legends',
    'player', 'игрок',
    'uid', 'zone',
    'email', 'почт',
    'recipient', 'получател'
  ];

  // Кнопки, при нажатии которых записываем значение в историю
  const SUBMIT_BUTTON_TEXTS = [
    'в корзину', 'купить', 'оформить', 'к оплате',
    'оплатить', 'продолжить', 'заказать', 'далее',
    'подтвердить', 'continue', 'confirm', 'buy', 'proceed'
  ];

  const INLINE_WARN_ATTR = 'data-dist-warn-id';

  // ── Вспомогательные ──────────────────────────────────────

  function getLabel(inp) {
    if (!inp) return '';
    const id = inp.id;
    if (id) {
      const lbl = document.querySelector('label[for="' + id + '"]');
      if (lbl) return (lbl.textContent || '').trim().toLowerCase();
    }
    let p = inp.parentElement;
    for (let i = 0; i < 4 && p; i++) {
      if (p.tagName === 'LABEL') return (p.textContent || '').trim().toLowerCase();
      p = p.parentElement;
    }
    let prev = inp.previousElementSibling;
    for (let i = 0; i < 3 && prev; i++) {
      const t = (prev.textContent || '').trim().toLowerCase();
      if (t && t.length < 60) return t;
      prev = prev.previousElementSibling;
    }
    const block = inp.closest('div, section, form, label');
    if (block) {
      const head = block.querySelector('label,h1,h2,h3,h4,b,strong,[class*="label"],[class*="title"]');
      if (head) return (head.textContent || '').trim().toLowerCase();
    }
    return (inp.placeholder || inp.name || '').toLowerCase();
  }

  function isRecipientField(inp) {
    const hint = (
      getLabel(inp) + ' ' +
      (inp.placeholder || '') + ' ' +
      (inp.name || '') + ' ' +
      (inp.id || '')
    ).toLowerCase();
    return RECIPIENT_FIELD_HINTS.some(h => hint.includes(h));
  }

  function isVisible(inp) {
    if (inp.disabled || inp.readOnly) return false;
    const cs = window.getComputedStyle(inp);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function formatAgo(entry) {
    if (!entry || !entry.ts) return '?';
    const s = Math.max(1, Math.floor((Date.now() - entry.ts) / 1000));
    if (s < 60) return s + ' сек назад';
    return Math.floor(s / 60) + ' мин назад';
  }

  // ── Inline-предупреждение ─────────────────────────────────

  function showInlineWarn(inp, hit) {
    removeInlineWarn(inp);
    const warnId = 'dist-ew-' + Math.random().toString(36).slice(2);
    inp.setAttribute(INLINE_WARN_ATTR, warnId);

    const warn = document.createElement('div');
    warn.id = warnId;
    warn.setAttribute('data-dist-epingrid-warn', '1');
    warn.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:5px',
      'margin-top:4px', 'padding:4px 8px',
      'background:rgba(239,68,68,0.12)',
      'border:1px solid rgba(239,68,68,0.35)',
      'border-radius:6px',
      'font-size:11px', 'color:#fca5a5',
      'font-family:system-ui,sans-serif',
      'line-height:1', 'box-sizing:border-box',
      'pointer-events:none', 'white-space:nowrap',
      'max-width:100%', 'overflow:hidden', 'text-overflow:ellipsis'
    ].join(';');

    const ago = formatAgo(hit);
    warn.innerHTML = '<span style="font-size:13px">⚠️</span><span>Уже использовался <b style="color:#f87171">' + ago + '</b></span>';

    // Вставляем сразу после поля
    if (inp.parentNode) {
      inp.parentNode.insertBefore(warn, inp.nextSibling);
    }
  }

  function removeInlineWarn(inp) {
    const warnId = inp.getAttribute && inp.getAttribute(INLINE_WARN_ATTR);
    if (warnId) {
      document.getElementById(warnId)?.remove();
      inp.removeAttribute(INLINE_WARN_ATTR);
    }
  }

  // ── Слежение за полями ────────────────────────────────────

  function attachWatcher(inp) {
    if (inp._distWatching) return;
    inp._distWatching = true;

    function check() {
      const value = (inp.value || '').trim();
      if (!value || value.length < 3 || value.length > 100) {
        removeInlineWarn(inp);
        return;
      }
      const hit = HISTORY.checkSync(value);
      if (hit) {
        showInlineWarn(inp, hit);
      } else {
        removeInlineWarn(inp);
      }
    }

    function recordValue() {
      const value = (inp.value || '').trim();
      if (value && value.length >= 3 && value.length <= 100) {
        HISTORY.record(value, 'EpinGrid');
      }
    }

    let _recordTimer;
    inp.addEventListener('input', () => {
      check();
      // Записываем через 800мс после остановки ввода — чтобы при следующем открытии уже знали
      clearTimeout(_recordTimer);
      _recordTimer = setTimeout(recordValue, 800);
    });
    inp.addEventListener('paste', () => setTimeout(() => { check(); clearTimeout(_recordTimer); _recordTimer = setTimeout(recordValue, 800); }, 0));
    inp.addEventListener('blur', recordValue);
  }

  const INPUT_SELECTOR = 'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), textarea';

  function scanRoot(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches?.(INPUT_SELECTOR)) {
      if (isVisible(root)) attachWatcher(root);
    }
    const inputs = root.querySelectorAll?.(INPUT_SELECTOR);
    if (inputs) for (const inp of inputs) {
      if (isVisible(inp)) attachWatcher(inp);
    }
  }

  // Первичный скан всего документа — один раз
  scanRoot(document.body);

  // Дальше следим только за РЕАЛЬНО добавленными узлами (а не пересканируем весь DOM)
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'IFRAME', 'IMG', 'SVG', 'PATH', 'NOSCRIPT']);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (SKIP_TAGS.has(node.tagName)) continue;
        scanRoot(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ── Дополнительно: запись при клике на submit-кнопку ──────
  // (резервный механизм — на случай если blur не сработал)
  document.addEventListener('click', function (e) {
    let el = e.target;
    for (let i = 0; i < 6 && el && el !== document.body; i++) {
      const tag = (el.tagName || '').toLowerCase();
      const role = (el.getAttribute && el.getAttribute('role')) || '';
      if (tag === 'button' || role === 'button') {
        const txt = (el.textContent || '').trim().toLowerCase();
        if (SUBMIT_BUTTON_TEXTS.some(t => txt.includes(t))) {
          // Ищем все видимые заполненные инпуты на странице
          const inputs = [...document.querySelectorAll('input, textarea')]
            .filter(i => isVisible(i) && (i.value || '').trim().length >= 3);
          // Берём поле с совпадением по хинту, иначе первое подходящее
          const target = inputs.find(i => isRecipientField(i)) || inputs.find(i => (i.value || '').trim().length <= 100);
          if (target) {
            const value = target.value.trim();
            HISTORY.record(value, 'EpinGrid');
          }
        }
        break;
      }
      el = el.parentElement;
    }
  }, true);

  console.log('[EpinGrid] Защита от повторного ввода ID/юзернейма активна (5 мин)');
})();
