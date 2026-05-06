// ═══════════════════════════════════════════════
// Fragment.com Stars — Quick Denomination Panel
// ═══════════════════════════════════════════════

(function() {
  'use strict';

  // Работаем только на странице звёзд
  if (!location.href.includes('fragment.com/stars')) return;

  const STAR_DENOMINATIONS = [
    50, 75, 100, 150, 250, 350,
    500, 750, 1000, 1500,
    2500, 5000, 10000, 25000,
    35000, 50000
  ];

  const POS_KEY = 'frag_panel_pos_v1';
  const SCALE_KEY = 'frag_panel_scale_v1';
  const COLLAPSED_KEY = 'frag_panel_collapsed_v1';

  // ── Поиск поля ввода на Fragment ──
  function findStarInput() {
    // Ищем input с плейсхолдером про количество
    const inputs = document.querySelectorAll('input');
    for (const inp of inputs) {
      const ph = (inp.placeholder || '').toLowerCase();
      if (ph.includes('amount') || ph.includes('количество') || ph.includes('1,000,000') || ph.includes('1000000')) {
        return inp;
      }
    }
    // Ищем по типу number
    for (const inp of inputs) {
      if (inp.type === 'number' || inp.type === 'tel') {
        const ph = (inp.placeholder || '').toLowerCase();
        if (ph.includes('50') || ph.includes('enter')) return inp;
      }
    }
    // Ищем по контексту — input рядом с текстом "Choose quantity" или "Stars"
    const allLabels = document.querySelectorAll('label, div, span, h2, h3');
    for (const el of allLabels) {
      const txt = (el.textContent || '').toLowerCase();
      if (txt.includes('choose quantity') || txt.includes('telegram stars') || txt.includes('количество')) {
        const nearInput = el.closest('form')?.querySelector('input') ||
                          el.parentElement?.querySelector('input') ||
                          el.nextElementSibling?.querySelector('input') ||
                          el.closest('div')?.querySelector('input');
        if (nearInput) return nearInput;
      }
    }
    // Fallback: первый input на странице
    return document.querySelector('input[type="text"], input[type="number"], input:not([type])');
  }

  function setInputValue(input, value) {
    if (!input) return false;
    input.focus();

    // React/Vue совместимый способ установки значения
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, String(value));
    } else {
      input.value = String(value);
    }

    // Генерируем события для React/Vue/Svelte
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

    // Для Fragment.com — попробуем также через InputEvent
    try {
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: String(value)
      }));
    } catch (_) {}

    return true;
  }

  // ── Создаём стили ──
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    
    @keyframes frag-panel-in {
      from { opacity: 0; transform: translateY(10px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes frag-btn-glow {
      0%, 100% { box-shadow: 0 0 0 rgba(99,102,241,0); }
      50% { box-shadow: 0 0 20px rgba(99,102,241,0.3); }
    }
    @keyframes frag-success-flash {
      0% { background: rgba(34,197,94,0.4); }
      100% { background: rgba(255,255,255,0.03); }
    }
    @keyframes frag-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    
    #frag-star-panel {
      position: fixed;
      z-index: 999999;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      animation: frag-panel-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #frag-star-panel * { box-sizing: border-box; }
    
    #frag-star-panel::-webkit-scrollbar { width: 4px; }
    #frag-star-panel::-webkit-scrollbar-track { background: rgba(15,23,42,0.3); border-radius: 10px; }
    #frag-star-panel::-webkit-scrollbar-thumb { background: linear-gradient(180deg,rgba(99,102,241,0.4),rgba(139,92,246,0.3)); border-radius: 10px; }
    
    .frag-nom-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px 4px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .frag-nom-btn::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, transparent 40%, rgba(99,102,241,0.08) 50%, transparent 60%);
      background-size: 200% 100%;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .frag-nom-btn:hover::before {
      animation: frag-shimmer 2s ease-in-out;
      opacity: 1;
    }
    .frag-nom-btn:hover {
      background: rgba(99,102,241,0.15);
      border-color: rgba(99,102,241,0.5);
      color: #fff;
      transform: translateY(-1px) scale(1.03);
      box-shadow: 0 4px 16px rgba(99,102,241,0.25);
    }
    .frag-nom-btn:active {
      transform: translateY(0) scale(0.97);
    }
    .frag-nom-btn.frag-success {
      animation: frag-success-flash 0.5s ease;
      border-color: rgba(34,197,94,0.6) !important;
    }
    
    .frag-nom-btn .frag-star-icon {
      font-size: 13px;
      filter: drop-shadow(0 0 3px rgba(251,191,36,0.5));
    }
    
    .frag-section-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: rgba(99,102,241,0.6);
      padding: 6px 2px 3px;
      user-select: none;
    }
    
    .frag-status {
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      color: #475569;
      min-height: 16px;
      padding: 3px 6px;
      transition: all 0.25s ease;
      border-radius: 6px;
    }
    .frag-status.success { color: #4ade80; background: rgba(34,197,94,0.08); }
    .frag-status.error { color: #f87171; background: rgba(239,68,68,0.08); }
  `;
  document.head.appendChild(style);

  // ── Создаём панель ──
  const panel = document.createElement('div');
  panel.id = 'frag-star-panel';
  
  const isCollapsed = localStorage.getItem(COLLAPSED_KEY) === 'true';
  
  panel.style.cssText = `
    width: 220px;
    background: linear-gradient(165deg, rgba(12, 16, 32, 0.94), rgba(8, 10, 24, 0.97));
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border: 1px solid rgba(99, 102, 241, 0.25);
    border-radius: 18px;
    padding: 12px;
    box-shadow: 0 20px 50px -12px rgba(0,0,0,0.8), 0 0 40px rgba(99,102,241,0.08), inset 0 1px 1px rgba(255,255,255,0.05);
    color: #f1f5f9;
  `;

  // Восстанавливаем позицию
  try {
    const pos = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      panel.style.left = pos.x + 'px';
      panel.style.top = pos.y + 'px';
    } else {
      panel.style.right = '20px';
      panel.style.top = '120px';
    }
  } catch (_) {
    panel.style.right = '20px';
    panel.style.top = '120px';
  }

  // ── Заголовок ──
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px; padding: 6px 8px; border-radius: 12px;
    background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08));
    border: 1px solid rgba(251,191,36,0.25);
    cursor: move; user-select: none;
    box-shadow: 0 2px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05);
  `;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:16px;filter:drop-shadow(0 0 4px rgba(251,191,36,0.6))">⭐</span>
      <span style="font-weight:700;font-size:11px;letter-spacing:.2px;color:#fde68a;white-space:nowrap">Fragment Stars</span>
    </div>
    <div style="display:flex;gap:3px;align-items:center">
      <div id="frag-collapse-btn" style="cursor:pointer;color:#fbbf24;font-size:14px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);transition:all .15s" title="Свернуть/Развернуть">−</div>
      <div id="frag-close-btn" style="cursor:pointer;color:#475569;font-size:13px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(51,65,85,0.4);transition:all .15s" title="Скрыть">×</div>
    </div>
  `;
  panel.appendChild(header);

  // ── Контент (сворачиваемый) ──
  const content = document.createElement('div');
  content.id = 'frag-star-content';
  content.style.cssText = isCollapsed ? 'display:none' : '';

  // Кастомный ввод
  const customRow = document.createElement('div');
  customRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px';
  customRow.innerHTML = `
    <input id="frag-custom-input" type="number" min="50" max="1000000" placeholder="Свой номинал..."
      style="flex:1;background:rgba(0,0,0,0.3);border:1px solid rgba(251,191,36,0.2);color:#fde68a;
      border-radius:9px;padding:7px 10px;font-size:12px;font-family:inherit;outline:none;
      transition:all .2s" />
    <button id="frag-custom-btn" style="padding:7px 12px;background:linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.15));
      border:1px solid rgba(251,191,36,0.35);color:#fde68a;border-radius:9px;cursor:pointer;
      font-size:11px;font-weight:700;font-family:inherit;transition:all .15s;white-space:nowrap">
      ▶ OK
    </button>
  `;
  content.appendChild(customRow);

  // Маленькие номиналы (50-350)
  const smallLabel = document.createElement('div');
  smallLabel.className = 'frag-section-label';
  smallLabel.textContent = '🔹 МАЛЫЕ';
  content.appendChild(smallLabel);

  const smallGrid = document.createElement('div');
  smallGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:8px';
  STAR_DENOMINATIONS.filter(v => v <= 350).forEach(v => {
    smallGrid.appendChild(createNominalBtn(v));
  });
  content.appendChild(smallGrid);

  // Средние номиналы (500-1500)
  const midLabel = document.createElement('div');
  midLabel.className = 'frag-section-label';
  midLabel.textContent = '🔸 СРЕДНИЕ';
  content.appendChild(midLabel);

  const midGrid = document.createElement('div');
  midGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:8px';
  STAR_DENOMINATIONS.filter(v => v >= 500 && v <= 1500).forEach(v => {
    midGrid.appendChild(createNominalBtn(v));
  });
  content.appendChild(midGrid);

  // Крупные номиналы (2500+)
  const bigLabel = document.createElement('div');
  bigLabel.className = 'frag-section-label';
  bigLabel.textContent = '🔶 КРУПНЫЕ';
  content.appendChild(bigLabel);

  const bigGrid = document.createElement('div');
  bigGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:8px';
  STAR_DENOMINATIONS.filter(v => v >= 2500).forEach(v => {
    bigGrid.appendChild(createNominalBtn(v));
  });
  content.appendChild(bigGrid);

  // Статус
  const status = document.createElement('div');
  status.className = 'frag-status';
  status.id = 'frag-status';
  status.textContent = 'Нажми на номинал';
  content.appendChild(status);

  panel.appendChild(content);
  document.body.appendChild(panel);

  // ── Функции ──

  function createNominalBtn(value) {
    const btn = document.createElement('button');
    btn.className = 'frag-nom-btn';
    btn.type = 'button';

    const formatted = value >= 1000 ? (value / 1000) + 'K' : String(value);
    btn.innerHTML = `<span class="frag-star-icon">⭐</span> ${formatted}`;

    btn.addEventListener('click', () => {
      applyNominal(value, btn);
    });

    return btn;
  }

  function applyNominal(value, btn) {
    const input = findStarInput();
    if (!input) {
      showStatus('❌ Поле ввода не найдено', 'error');
      return;
    }

    const success = setInputValue(input, value);
    if (success) {
      showStatus(`✅ ${value.toLocaleString()} ⭐ введено`, 'success');
      if (btn) {
        btn.classList.add('frag-success');
        setTimeout(() => btn.classList.remove('frag-success'), 500);
      }
    } else {
      showStatus('❌ Ошибка ввода', 'error');
    }
  }

  let statusTimer = null;
  function showStatus(text, type) {
    status.textContent = text;
    status.className = 'frag-status' + (type ? ' ' + type : '');
    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.textContent = 'Нажми на номинал';
      status.className = 'frag-status';
    }, 3000);
  }

  // Кастомный ввод
  const customInput = panel.querySelector('#frag-custom-input');
  const customBtn = panel.querySelector('#frag-custom-btn');

  customInput.addEventListener('focus', () => {
    customInput.style.borderColor = 'rgba(251,191,36,0.5)';
    customInput.style.boxShadow = '0 0 0 3px rgba(251,191,36,0.1)';
  });
  customInput.addEventListener('blur', () => {
    customInput.style.borderColor = 'rgba(251,191,36,0.2)';
    customInput.style.boxShadow = 'none';
  });
  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') customBtn.click();
  });

  customBtn.addEventListener('click', () => {
    const val = parseInt(customInput.value, 10);
    if (!Number.isFinite(val) || val < 50 || val > 1000000) {
      showStatus('⚠️ Введи от 50 до 1,000,000', 'error');
      return;
    }
    applyNominal(val, null);
  });

  // ── Сворачивание ──
  const collapseBtn = panel.querySelector('#frag-collapse-btn');
  if (isCollapsed) collapseBtn.textContent = '+';

  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const collapsed = content.style.display === 'none';
    content.style.display = collapsed ? '' : 'none';
    collapseBtn.textContent = collapsed ? '−' : '+';
    localStorage.setItem(COLLAPSED_KEY, collapsed ? 'false' : 'true');
  });

  // ── Скрытие (с маленькой кнопкой для повторного показа) ──
  const closeBtn = panel.querySelector('#frag-close-btn');
  
  const showBtn = document.createElement('div');
  showBtn.id = 'frag-show-btn';
  showBtn.textContent = '⭐';
  showBtn.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 999998;
    width: 44px; height: 44px; border-radius: 14px;
    background: linear-gradient(135deg, rgba(251,191,36,0.3), rgba(245,158,11,0.15));
    backdrop-filter: blur(16px); border: 1px solid rgba(251,191,36,0.4);
    display: none; align-items: center; justify-content: center;
    font-size: 20px; cursor: pointer; user-select: none;
    box-shadow: 0 6px 24px rgba(0,0,0,0.5), 0 0 30px rgba(251,191,36,0.15);
    transition: all 0.2s ease;
  `;
  showBtn.addEventListener('mouseenter', () => { showBtn.style.transform = 'scale(1.1)'; });
  showBtn.addEventListener('mouseleave', () => { showBtn.style.transform = ''; });
  document.body.appendChild(showBtn);

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = 'none';
    showBtn.style.display = 'flex';
  });

  showBtn.addEventListener('click', () => {
    panel.style.display = '';
    showBtn.style.display = 'none';
    panel.style.animation = 'frag-panel-in 0.3s ease';
  });

  // ── Перетаскивание ──
  let dragging = false, startX = 0, startY = 0, baseLeft = 0, baseTop = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target.closest('#frag-collapse-btn, #frag-close-btn')) return;
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    baseLeft = panel.offsetLeft; baseTop = panel.offsetTop;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    panel.style.right = 'auto';
    panel.style.left = (baseLeft + e.clientX - startX) + 'px';
    panel.style.top = (baseTop + e.clientY - startY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({
        x: panel.offsetLeft,
        y: panel.offsetTop
      }));
    } catch (_) {}
  });

  // ── Ctrl+Scroll масштабирование ──
  let panelScale = parseFloat(localStorage.getItem(SCALE_KEY) || '1');
  if (isNaN(panelScale) || panelScale < 0.5) panelScale = 1;
  panel.style.transform = 'scale(' + panelScale + ')';
  panel.style.transformOrigin = 'top right';

  panel.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    panelScale = Math.max(0.5, Math.min(2.5, panelScale + (e.deltaY < 0 ? 0.05 : -0.05)));
    panel.style.transform = 'scale(' + panelScale + ')';
    try { localStorage.setItem(SCALE_KEY, String(panelScale)); } catch (_) {}
  }, { passive: false });

  // Hover эффекты для кнопок в header
  collapseBtn.addEventListener('mouseenter', () => {
    collapseBtn.style.background = 'rgba(251,191,36,0.2)';
    collapseBtn.style.borderColor = 'rgba(251,191,36,0.4)';
  });
  collapseBtn.addEventListener('mouseleave', () => {
    collapseBtn.style.background = 'rgba(251,191,36,0.1)';
    collapseBtn.style.borderColor = 'rgba(251,191,36,0.2)';
  });
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = 'rgba(239,68,68,0.15)';
    closeBtn.style.color = '#f87171';
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = 'rgba(51,65,85,0.4)';
    closeBtn.style.color = '#475569';
  });
  customBtn.addEventListener('mouseenter', () => {
    customBtn.style.background = 'linear-gradient(135deg,rgba(251,191,36,0.35),rgba(245,158,11,0.25))';
    customBtn.style.transform = 'scale(1.03)';
  });
  customBtn.addEventListener('mouseleave', () => {
    customBtn.style.background = 'linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.15))';
    customBtn.style.transform = '';
  });

})();

// ═══════════════════════════════════════════════════════════
// Fragment — предупреждение при повторном вводе @username
// Работает на всех страницах fragment.com, не только /stars
// ═══════════════════════════════════════════════════════════
(function () {
  'use strict';

  const HISTORY = window.distRecipientHistory;
  if (!HISTORY) {
    console.warn('[Fragment Warn] recipient-history.js не загружен');
    return;
  }

  const INLINE_WARN_ATTR = 'data-dist-frag-warn-id';

  function formatAgo(entry) {
    if (!entry || !entry.ts) return '?';
    const s = Math.max(1, Math.floor((Date.now() - entry.ts) / 1000));
    if (s < 60) return s + ' сек назад';
    return Math.floor(s / 60) + ' мин назад';
  }

  function isRecipientInput(inp) {
    if (inp.disabled || inp.readOnly) return false;
    const cs = window.getComputedStyle(inp);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const hint = ((inp.placeholder || '') + ' ' + (inp.name || '') + ' ' + (inp.id || '')).toLowerCase();
    // Поле с подсказкой про username/recipient или поиск по @
    if (hint.includes('username') || hint.includes('recipient') || hint.includes('@')) return true;
    // На Fragment поле поиска получателя — тип text/search без явного хинта
    if ((inp.type === 'text' || inp.type === 'search' || !inp.type) && inp.offsetParent !== null) return true;
    return false;
  }

  function showInlineWarn(inp, hit) {
    removeInlineWarn(inp);
    const warnId = 'dist-fw-' + Math.random().toString(36).slice(2);
    inp.setAttribute(INLINE_WARN_ATTR, warnId);

    const warn = document.createElement('div');
    warn.id = warnId;
    warn.style.cssText = [
      'display:inline-flex', 'align-items:center', 'gap:5px',
      'margin-top:4px', 'padding:4px 8px',
      'background:rgba(239,68,68,0.12)',
      'border:1px solid rgba(239,68,68,0.35)',
      'border-radius:6px',
      'font-size:11px', 'color:#fca5a5',
      'font-family:system-ui,sans-serif',
      'line-height:1', 'box-sizing:border-box',
      'pointer-events:none', 'white-space:nowrap'
    ].join(';');

    const ago = formatAgo(hit);
    warn.innerHTML = '<span style="font-size:13px">⚠️</span><span>Уже использовался <b style="color:#f87171">' + ago + '</b></span>';

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

  function attachWatcher(inp) {
    if (inp._distFragWatching) return;
    inp._distFragWatching = true;

    function check() {
      let value = (inp.value || '').trim().replace(/^@+/, '');
      if (!value || value.length < 4) { removeInlineWarn(inp); return; }
      const hit = HISTORY.checkSync(value) || HISTORY.checkSync('@' + value);
      if (hit) {
        showInlineWarn(inp, hit);
      } else {
        removeInlineWarn(inp);
      }
    }

    inp.addEventListener('input', check);
    inp.addEventListener('paste', () => setTimeout(check, 0));
    inp.addEventListener('blur', () => {
      let value = (inp.value || '').trim();
      if (value && value.length >= 4) {
        HISTORY.record(value, 'Fragment');
      }
    });
  }

  const INPUT_SELECTOR = 'input[type="text"], input[type="search"], input:not([type])';

  function scanRoot(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches?.(INPUT_SELECTOR) && isRecipientInput(root)) attachWatcher(root);
    const inputs = root.querySelectorAll?.(INPUT_SELECTOR);
    if (inputs) for (const inp of inputs) {
      if (isRecipientInput(inp)) attachWatcher(inp);
    }
  }

  scanRoot(document.body);

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

  console.log('[Fragment] Защита от повторного ввода @username активна (5 мин)');
})();
