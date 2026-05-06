// ═══════════════════════════════════════════════════════════
// История получателей (ID/юзернеймов) для Fragment и EpinGrid
// Хранит значения за последние 5 минут — повторная отправка
// того же ID/юзернейма показывает предупреждение
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';
  if (window.__distRecipientHistoryLoaded) return;
  window.__distRecipientHistoryLoaded = true;

  const STORAGE_KEY = 'dist_recent_recipients_v1';
  const WINDOW_MS = 5 * 60 * 1000; // 5 минут

  // Кэш в памяти для синхронных проверок при перехвате клика
  let cache = [];

  function normalize(value) {
    return String(value || '').trim().toLowerCase().replace(/^@+/, '');
  }

  function pruneOld(arr) {
    const now = Date.now();
    return (arr || []).filter(e => e && e.value && (now - (e.ts || 0)) < WINDOW_MS);
  }

  function refreshCache() {
    try {
      chrome.storage.local.get([STORAGE_KEY], res => {
        if (chrome.runtime.lastError) return;
        cache = pruneOld(res && res[STORAGE_KEY]);
      });
    } catch (_) {}
  }

  // Подписываемся на изменения, чтобы между вкладками синхронизировалось мгновенно
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      cache = pruneOld(changes[STORAGE_KEY].newValue);
    });
  } catch (_) {}

  // Первоначальная загрузка + периодическое обновление
  refreshCache();
  setInterval(refreshCache, 2000);

  // Синхронная проверка по кэшу
  function checkSync(value) {
    const norm = normalize(value);
    if (!norm) return null;
    const now = Date.now();
    const fresh = cache.filter(e => (now - e.ts) < WINDOW_MS);
    return fresh.find(e => e.value === norm) || null;
  }

  // Записать использование ID/юзернейма
  function record(value, source) {
    const norm = normalize(value);
    if (!norm) return Promise.resolve();
    return new Promise(resolve => {
      try {
        chrome.storage.local.get([STORAGE_KEY], res => {
          let arr = pruneOld(res && res[STORAGE_KEY]);
          // Удаляем старую запись с тем же значением — заменяем актуальной
          arr = arr.filter(e => e.value !== norm);
          arr.push({ value: norm, ts: Date.now(), source: source || 'unknown' });
          // Ограничиваем размер
          if (arr.length > 200) arr = arr.slice(-200);
          chrome.storage.local.set({ [STORAGE_KEY]: arr }, () => {
            cache = arr;
            resolve();
          });
        });
      } catch (_) {
        resolve();
      }
    });
  }

  // Сколько секунд назад использовался
  function secondsAgo(entry) {
    if (!entry || !entry.ts) return 0;
    return Math.max(1, Math.floor((Date.now() - entry.ts) / 1000));
  }

  // Форматирование "Х секунд/минут назад"
  function formatAgo(entry) {
    const s = secondsAgo(entry);
    if (s < 60) return s + ' сек назад';
    const m = Math.floor(s / 60);
    return m + ' мин назад';
  }

  // ── Модальное предупреждение ──
  function showWarning({ value, entry, fieldLabel, sourceLabel, onConfirm, onCancel }) {
    document.querySelector('#dist-recipient-warn')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'dist-recipient-warn';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);
      z-index:2147483646;display:flex;align-items:center;justify-content:center;
      font-family:'Inter',system-ui,-apple-system,sans-serif;animation:dist-warn-in .2s ease;
    `;

    const styleId = 'dist-recipient-warn-style';
    if (!document.getElementById(styleId)) {
      const st = document.createElement('style');
      st.id = styleId;
      st.textContent = `
        @keyframes dist-warn-in { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }
      `;
      document.head.appendChild(st);
    }

    const box = document.createElement('div');
    box.style.cssText = `
      width:min(94vw,440px);background:linear-gradient(165deg,rgba(28,16,16,0.97),rgba(15,8,8,0.98));
      border:1px solid rgba(239,68,68,0.45);border-radius:18px;padding:22px;color:#fee2e2;
      box-shadow:0 30px 70px rgba(0,0,0,0.75),0 0 50px rgba(239,68,68,0.18);
    `;

    const safeValue = String(value).replace(/[<>&]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;' }[c]));
    const ago = formatAgo(entry);
    const srcText = entry?.source ? ('Где: <b style="color:#fde68a">' + entry.source + '</b>') : '';

    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        <div style="width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#ef4444,#f87171);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 4px 14px rgba(239,68,68,0.4)">⚠️</div>
        <div style="flex:1">
          <div style="font-weight:800;font-size:14px;color:#fff;letter-spacing:0.3px">${fieldLabel || 'Получатель'} уже использовался</div>
          <div style="font-size:11px;color:#fca5a5;margin-top:3px">Был отправлен <b style="color:#fff">${ago}</b> ${srcText ? '· ' + srcText : ''}</div>
        </div>
        <div id="dist-warn-close" style="cursor:pointer;color:#94a3b8;font-size:22px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(51,65,85,0.4);transition:all .15s ease">×</div>
      </div>

      <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(239,68,68,0.25);border-radius:11px;padding:12px 14px;margin-bottom:14px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#fca5a5;margin-bottom:5px">Значение</div>
        <div style="font-size:14px;font-weight:700;color:#fff;word-break:break-all;font-family:'JetBrains Mono',monospace">${safeValue}</div>
      </div>

      <div style="font-size:11.5px;color:#fecaca;margin-bottom:16px;line-height:1.5">
        Похоже, вы уже отправляли этот ${(fieldLabel || 'получатель').toLowerCase()} в течение последних 5 минут. Возможно, это случайный повтор.
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="dist-warn-cancel" style="padding:10px 18px;background:rgba(51,65,85,0.45);border:1px solid rgba(71,85,105,0.6);color:#cbd5e1;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit">Отмена</button>
        <button id="dist-warn-confirm" style="padding:10px 20px;background:linear-gradient(135deg,#ef4444,#dc2626);border:1px solid rgba(239,68,68,0.7);color:#fff;border-radius:10px;cursor:pointer;font-size:12px;font-weight:800;font-family:inherit;box-shadow:0 4px 14px rgba(239,68,68,0.4)">Всё равно отправить</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = (cancelled) => {
      overlay.remove();
      if (cancelled && typeof onCancel === 'function') onCancel();
    };

    box.querySelector('#dist-warn-close').onclick = () => close(true);
    box.querySelector('#dist-warn-cancel').onclick = () => close(true);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(true); });

    box.querySelector('#dist-warn-confirm').onclick = () => {
      overlay.remove();
      if (typeof onConfirm === 'function') onConfirm();
    };

    // Esc — отмена, Enter — подтвердить
    const keyHandler = (e) => {
      if (e.key === 'Escape') { close(true); document.removeEventListener('keydown', keyHandler, true); }
      if (e.key === 'Enter')  { box.querySelector('#dist-warn-confirm').click(); document.removeEventListener('keydown', keyHandler, true); }
    };
    document.addEventListener('keydown', keyHandler, true);
  }

  // Экспорт
  window.distRecipientHistory = {
    checkSync,
    record,
    showWarning,
    normalize,
    WINDOW_MS
  };
})();
