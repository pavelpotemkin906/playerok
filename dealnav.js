// ═══════════════════════════════════════════════════════════
// Hotkeys для быстрой навигации между открытыми сделками
//   1 = предыдущая сделка
//   2 = следующая сделка
// Работает на playerok / fragment / epingrid
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function showToast(text) {
    let toast = document.getElementById('dist-dealnav-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'dist-dealnav-toast';
      toast.style.cssText = [
        'position:fixed', 'top:20px', 'left:50%', 'transform:translateX(-50%)',
        'z-index:2147483647', 'pointer-events:none',
        'padding:10px 18px',
        'background:rgba(8,12,24,0.92)',
        'border:1px solid rgba(99,102,241,0.5)',
        'border-radius:12px',
        'color:#e2e8f0', 'font:600 13px system-ui,sans-serif',
        'box-shadow:0 8px 24px rgba(0,0,0,0.4),0 0 16px rgba(99,102,241,0.3)',
        'opacity:0', 'transition:opacity .15s ease'
      ].join(';');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 1200);
  }

  document.addEventListener('keydown', function (e) {
    // Игнорируем модификаторы (чтобы не мешать Ctrl+1, Alt+2 и т.п.)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Игнорируем когда пользователь печатает
    if (isTypingTarget(document.activeElement) || isTypingTarget(e.target)) return;
    // Игнорируем когда зажат shift (вдруг есть другие комбо)
    if (e.shiftKey) return;

    let direction = 0;
    if (e.key === '1') direction = -1;
    else if (e.key === '2') direction = +1;
    else return;

    e.preventDefault();
    e.stopPropagation();

    try {
      chrome.runtime.sendMessage({ type: 'NAV_DEAL', direction }, response => {
        if (chrome.runtime.lastError) return;
        if (response?.success) {
          showToast(`📋 Сделка ${response.index + 1}/${response.total}`);
        } else if (response?.error === 'NO_DEALS') {
          showToast('Нет открытых сделок');
        }
      });
    } catch (_) {}
  }, true);
})();
