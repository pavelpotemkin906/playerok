createPanel();

const GREETING_NAME_KEY = "dist_greeting_name";
const LAST_CODE_KEY = "lastCode";
const LAST_CODES_KEY = "lastCodes";
const LAST_INSERTED_CODE_KEY = "lastInsertedCode";
const LAST_INSERTED_CODES_SIGNATURE_KEY = "lastInsertedCodesSignature";
const INSERTED_CODES_HISTORY_KEY = "insertedCodesHistory";
const CUSTOM_TEMPLATES_KEY = "dist_custom_templates_v1";
const PINNED_KEY = "dist_pinned_templates_v1";
const TEMPLATE_ORDER_KEY = "dist_template_order_v1";
let miniStatusTimer = null;
let insertedCodesCache = new Set();
let pinnedTemplates = [];
let templateOrder = [];

function loadPinnedTemplates() {
  try { pinnedTemplates = JSON.parse(localStorage.getItem(PINNED_KEY) || "[]"); } catch (_) { pinnedTemplates = []; }
}
function savePinnedTemplates() {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify(pinnedTemplates)); } catch (_) {}
}
function isPinned(key) { return pinnedTemplates.includes(key); }
function togglePin(key) {
  if (isPinned(key)) pinnedTemplates = pinnedTemplates.filter(k => k !== key);
  else pinnedTemplates.unshift(key);
  savePinnedTemplates();
  refreshPinnedButtons();
}
loadPinnedTemplates();

function loadTemplateOrder() {
  try { templateOrder = JSON.parse(localStorage.getItem(TEMPLATE_ORDER_KEY) || "[]"); } catch (_) { templateOrder = []; }
}
function saveTemplateOrder() {
  try { localStorage.setItem(TEMPLATE_ORDER_KEY, JSON.stringify(templateOrder)); } catch (_) {}
}
loadTemplateOrder();

const DEFAULT_TEMPLATES = {
  greeting: `👋 Здравствуйте, меня зовут {name}!\n\nУже занимаюсь вашим заказом, ожидайте 🤝`,
  id: `✅ Благодарю за покупку! В скором времени вы увидите строку в нашем чате "Playerok выполнил заказ" — это значит, что товар был отправлен на ваш аккаунт.\n\n🟠 Время доставки товара может затянуться до 60 минут, не переживайте 😊`,
  promo: `✅ Благодарю за покупку! Инструкция активации промокода находится в описании и данных товара.\n\n👉 Ваш промокод: "{code}"`,
  key: `✅ Благодарю за покупку! Инструкция активации находится в описании и данных товара.\n\n🔴 Пожалуйста, обратите внимание: если вы получили ключ для другого региона, не совпадающего с вашей покупкой, пожалуйста, не пытайтесь активировать его в случае ошибки. Иначе может возникнуть необходимость оплатить его стоимость — мы хотим уберечь вас от лишних расходов 😊\n\n👉 Ваш ключ: "{code}"`,
  giftcard: `✅ Благодарю за покупку! Подарочную карту нужно активировать в приложении, чтобы пополнить баланс. Инструкция находится в описании и данных товара.\n\n🔴 Пожалуйста, обратите внимание: если вам выдали подарочную карту для другого региона, не совпадающего с вашей покупкой, пожалуйста, не пытайтесь активировать её в случае ошибки. Иначе может возникнуть необходимость оплатить её стоимость — мы хотим уберечь вас от лишних расходов\n\n👉 Ваша подарочная карта: "{code}"`,
  robloxpremium: `✅ Благодарим за покупку! Предоставляю вам промокоды для покупки Премиум:\n\n1. {code1}\n2. {code2}\n3. {code3}\n\n💡 Инструкция активации:\n\n1. Перейдите на страницу активации: https://plrk.co/p/roblox_redeem\n2. Войдите в свой аккаунт Roblox (если еще не вошли)\n3. Введите промокод из вашего заказа\n4. Нажмите "Redeem" и валюта вашего региона мгновенно зачислится на баланс\n5. Повторить процедуру для всех переданных вам промокодов`,
  brazil: `✅ Благодарим за покупку!\n\n💡 Инструкция активации и конвертации:\n\n1. Перейдите на страницу активации: https://plrk.co/p/roblox_redeem\n2. Войдите в свой аккаунт Roblox (если еще не вошли)\n3. Скопируйте и введите промокод из этого сообщения\n4. Нажмите "Redeem" и валюта вашего региона мгновенно зачислится на баланс\n5. Нажмите "Convert remaining credit to robux"\n6. Во всплывающем окне, нажмите "Convert To Robux" – робуксы поступят на баланс\n\n👉 Ваш промокод: "{code}"`
};

let customTemplates = {};
function loadCustomTemplates() {
  return new Promise(resolve => { chrome.storage.local.get([CUSTOM_TEMPLATES_KEY], result => { customTemplates = (result && result[CUSTOM_TEMPLATES_KEY]) || {}; resolve(); }); });
}
function saveCustomTemplates() {
  return new Promise(resolve => { chrome.storage.local.set({ [CUSTOM_TEMPLATES_KEY]: customTemplates }, () => resolve()); });
}
function getTemplate(key) {
  // Приоритет: 1) кастомный текст → 2) DEFAULT_TEMPLATES → 3) text из QUICK_TEMPLATES item
  if (customTemplates[key] !== undefined) return customTemplates[key];
  if (DEFAULT_TEMPLATES[key]) return DEFAULT_TEMPLATES[key];
  // Fallback: ищем text в определении шаблона (QUICK_TEMPLATES и customGroups)
  const item = typeof getTemplateItem === 'function' ? getTemplateItem(key) : null;
  return item?.text || "";
}

async function refreshInsertedCodesCache() { insertedCodesCache = new Set(await getInsertedCodesHistory()); }
function textMatchesUsedCode(text) {
  const raw = String(text || "").trim(); if (!raw) return false;
  const full = normalizeCode(raw);
  if (full.length >= 3 && insertedCodesCache.has(full)) return true;
  return raw.split(/[\r\n,;]+/g).map(s => normalizeCode(s)).filter(c => c.length >= 3).some(c => insertedCodesCache.has(c));
}
function installUsedCodeClipboardGuards() {
  // Мы убрали блокировку вставки и копирования (e.preventDefault),
  // чтобы не мешать пользователю работать с буфером обмена.
  // Оставляем только обновление кэша для работы кнопок шаблонов.
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[INSERTED_CODES_HISTORY_KEY]) return;
      const nv = changes[INSERTED_CODES_HISTORY_KEY].newValue;
      if (Array.isArray(nv)) insertedCodesCache = new Set(nv.map(v => normalizeCode(v)).filter(Boolean));
    });
  } catch (_) {}
  refreshInsertedCodesCache().catch(() => {});
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function getSavedGreetingName() { return new Promise(resolve => { chrome.storage.local.get([GREETING_NAME_KEY], r => resolve((r && r[GREETING_NAME_KEY]) || "")); }); }
function saveGreetingName(name) { return new Promise(resolve => { chrome.storage.local.set({ [GREETING_NAME_KEY]: name }, () => resolve()); }); }
function buildGreetingText(name) { return getTemplate("greeting").replace("{name}", name); }
function getChatTextarea() { 
  return document.querySelector('textarea[name="text"]') || 
         document.querySelector('textarea[placeholder*="сообщение"]') ||
         document.querySelector('textarea[placeholder*="message"]') ||
         document.querySelector('.chat-input textarea') ||
         document.querySelector('textarea') || 
         document.querySelector('[role="textbox"]') ||
         document.querySelector('[contenteditable="true"]'); 
}
function getChatForm() { const t = getChatTextarea(); return t ? t.closest("form") : null; }
function setNativeTextareaValue(textarea, value) {
  const d = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
  if (d && d.set) d.set.call(textarea, value); else textarea.value = value;
}
function insertTextIntoChat(text) {
  const textarea = getChatTextarea(); if (!textarea) return;
  textarea.focus(); 
  // Если это не стандартный textarea (например, div contenteditable), пробуем через execCommand
  if (textarea.tagName !== 'TEXTAREA') {
    document.execCommand('insertText', false, text);
    return;
  }
  setNativeTextareaValue(textarea, text);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  try { textarea.setSelectionRange(text.length, text.length); } catch (_) {}
}

function isPlayerokErrorNode(el) {
  if (el.id && el.id.startsWith("dist-")) return false;
  if (el.closest && el.closest("[id^='dist-']")) return false;
  const role = el.getAttribute("role");
  if (role === "alert") {
    const t = (el.innerText || el.textContent || "").toLowerCase();
    if (["слишком много","too many","подождите","попытк","лимит","не удалось","failed","запрещено","ошибка отправки","повторите","попробуйте"].some(k => t.includes(k))) return true;
    const cls = el.getAttribute("class") || "";
    if (cls.includes("error") || cls.includes("Error")) return true;
  }
  return false;
}
function autoCopyDeliveryData() {
  if (!location.href.includes('/deal/')) return;
  // КРИТИЧНО: копируем ТОЛЬКО если эта вкладка активна (видна пользователю)
  if (document.visibilityState !== 'visible') return;
  
  // NEW: Check auto-copy toggle state (Bug 3 fix)
  const autoCopyEnabled = localStorage.getItem('dist_autocopy_enabled');
  if (autoCopyEnabled === 'false') return; // Skip if disabled

  // 1. Ищем заголовок "Получение" — ищем маленькие элементы, чей текст содержит это слово
  let poluchenieBlock = null;
  const allElements = document.querySelectorAll('div, span, h2, h3, h4, p');
  for (const el of allElements) {
    if (el.closest('[id^="dist-"]')) continue;
    const ownText = el.textContent.trim();
    // Ищем элемент, который содержит "Получение" и при этом достаточно маленький (заголовок, не весь блок)
    if (ownText.includes('Получение') && ownText.length < 40 && el.offsetParent !== null) {
      // Поднимаемся вверх от заголовка, чтобы найти контейнер с данными
      let container = el.parentElement;
      for (let i = 0; i < 5; i++) {
        if (!container || container === document.body) break;
        const containerText = container.innerText || "";
        // Контейнер должен содержать "Получение" + ещё какой-то контент (данные или кнопку Показать/Скрыть)
        if (containerText.includes('Получение') && 
            (containerText.includes('Показать') || containerText.includes('Скрыть') || container.querySelector('svg'))) {
          poluchenieBlock = container;
          break;
        }
        container = container.parentElement;
      }
      if (poluchenieBlock) break;
    }
  }

  if (!poluchenieBlock) return;

  // 2. Клик на "Показать" если данные скрыты
  let clickedShow = false;
  poluchenieBlock.querySelectorAll('div, span, a, button').forEach(el => {
    const t = el.textContent.trim();
    if (t === 'Показать' && el.offsetParent !== null && el.children.length === 0) {
      el.click();
      clickedShow = true;
    }
  });
  // Если кликнули "Показать" — данные появятся через мгновение, MutationObserver вызовет нас снова
  if (clickedShow) return;

  // 3. Парсим текст блока "Получение" строка за строкой
  const blockText = poluchenieBlock.innerText || "";
  const lines = blockText.split('\n').map(l => l.trim()).filter(Boolean);
  const foundValues = [];

  // Bug 1 fix: Add username labels to recognition list
  const labels = [
    'id игрока', 'игровой id', 'player id', 'user id', 'uid', 
    'zone id', 'id сервера', 'server id', 'сервер',
    'username', 'юзернейм', 'telegram username', '@username', 'имя пользователя', 'введите @username'
  ];
  const skipWords = ['получение', 'показать', 'скрыть', 'комментарий'];

  // Bug 2 fix: Detect game context for region filtering
  const pageText = document.body.innerText.toLowerCase();
  const isGenshinFamily = 
    pageText.includes('genshin') || pageText.includes('геншин') ||
    pageText.includes('honkai') || pageText.includes('хонкай') ||
    pageText.includes('zenless') || pageText.includes('зенлесс');

  let grabNext = false;
  for (const line of lines) {
    const low = line.toLowerCase();

    // Пропускаем заголовки и служебные слова
    if (skipWords.some(w => low === w)) continue;

    // Bug 2 fix: Skip region/server labels for Genshin family games
    const isRegionLabel = ['регион', 'region'].some(lbl => 
      low === lbl || low === lbl + ':' || low.startsWith(lbl + ' ') || low.startsWith(lbl + ':')
    );
    const isServerLabel = low === 'сервер' || low === 'сервер:' || low.startsWith('сервер ') || low.startsWith('сервер:');
    
    if (isGenshinFamily && (isRegionLabel || isServerLabel)) {
      grabNext = false; // Don't grab next line as value
      continue;
    }

    // Если предыдущая строка была меткой — эта строка = значение
    if (grabNext) {
      // Bug 1 fix: Update regex to accept "@" symbol
      if (/^\d{3,}$/.test(line) || /^@?[A-Za-z0-9\-_]{4,}$/.test(line)) {
        foundValues.push(line);
      }
      grabNext = false;
      continue;
    }

    // Проверяем, является ли строка меткой
    if (labels.some(lbl => low === lbl || low === lbl + ':' || low.startsWith(lbl + ' ') || low.startsWith(lbl + ':'))) {
      // Может быть значение на той же строке: "Игровой ID 522261411591"
      let cleaned = line;
      labels.forEach(lbl => {
        cleaned = cleaned.replace(new RegExp('^' + lbl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':?\\s*', 'i'), '').trim();
      });
      if (cleaned && (/^\d{3,}$/.test(cleaned) || /^@?[A-Za-z0-9\-_]{4,}$/.test(cleaned))) {
        foundValues.push(cleaned);
      } else {
        grabNext = true; // Значение на следующей строке
      }
      continue;
    }

    // Если строка — просто число (ID без метки), тоже берём
    if (/^\d{5,}$/.test(line)) {
      foundValues.push(line);
    }
  }

  // 4. Копируем
  if (foundValues.length > 0) {
    // Фильтруем значения: если есть ключи (с дефисами), не копируем просто числа
    const hasKeys = foundValues.some(v => /[A-Za-z0-9]+-[A-Za-z0-9]+/.test(v));
    const hasUsernames = foundValues.some(v => /^@?[A-Za-z0-9_-]{4,}$/.test(v) && !/^\d+$/.test(v));
    
    let valuesToCopy = foundValues;
    
    // Если есть ключи или username - копируем только их, без чистых чисел
    if (hasKeys || hasUsernames) {
      valuesToCopy = foundValues.filter(v => {
        // Оставляем ключи (с дефисами)
        if (/[A-Za-z0-9]+-[A-Za-z0-9]+/.test(v)) return true;
        // Оставляем username (с @ или без, но содержащие буквы)
        if (/^@?[A-Za-z0-9_-]{4,}$/.test(v) && /[A-Za-z]/.test(v)) return true;
        // Не копируем просто числа если есть ключи/username
        return false;
      });
    }
    
    const textToCopy = valuesToCopy.join(' ');
    const dealId = (location.href.match(/\/deal\/([^\/\?#]+)/) || [])[1] || "";
    const signature = dealId + ":" + textToCopy;

    const now = Date.now();
    if (window._lastAutoCopiedSig === signature && (now - (window._lastAutoCopiedTime || 0)) < 15000) return;

    window._lastAutoCopiedSig = signature;
    window._lastAutoCopiedTime = now;

    navigator.clipboard.writeText(textToCopy).then(() => {
      showMiniStatus("📦 ID скопирован: " + textToCopy);
    }).catch(() => {
      chrome.runtime.sendMessage({ type: "COPY_TO_CLIPBOARD", text: textToCopy });
      showMiniStatus("📦 ID скопирован: " + textToCopy);
    });
  }
}

// Запуск при загрузке
setTimeout(() => { autoCopyDeliveryData(); autoInsertGreeting(); }, 500);
setTimeout(() => { autoCopyDeliveryData(); autoInsertGreeting(); }, 2000);

const deliveryObserver = new MutationObserver(() => {
  const currentDealId = (location.href.match(/\/(deal|chats)\/([^\/\?#]+)/) || [])[2] || "";
  if (window._lastObservedDealId !== currentDealId) {
    window._lastObservedDealId = currentDealId;
    window._greetingInsertedForDeal = null;
    window._lastAutoCopiedSig = null;
  }
  autoCopyDeliveryData(); 
  autoInsertGreeting();
});
deliveryObserver.observe(document.body, { childList: true, subtree: true });

// При возврате на вкладку — сбрасываем подпись и копируем заново
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && (location.href.includes('/deal/') || location.href.includes('/chats/'))) {
    window._lastAutoCopiedSig = null;
    autoCopyDeliveryData();
  }
});

async function autoInsertGreeting() {
  if (!location.href.includes('/deal/') && !location.href.includes('/chats/')) return;
  
  const dealId = (location.href.match(/\/(deal|chats)\/([^\/\?#]+)/) || [])[2] || "";
  if (window._greetingInsertedForDeal === dealId) return;
  
  const textarea = getChatTextarea();
  if (!textarea) return;
  
  // Вставляем только если поле пустое или содержит только пробелы
  const currentVal = textarea.value || textarea.innerText || "";
  if (currentVal.trim() !== "") return;
  
  let name = await getSavedGreetingName();
  // Если имя не задано, используем пустую строку, чтобы buildGreetingText выдал стандартный текст
  if (!name) name = ""; 
  
  const text = buildGreetingText(name);
  if (text) {
    insertTextIntoChat(text);
    window._greetingInsertedForDeal = dealId;
    showMiniStatus("📝 Приветствие подставлено");
  }
}


function watchForInsertError(savedText) {
  let timer = null, triggered = false;
  const trigger = () => {
    if (triggered) return; triggered = true; obs.disconnect(); clearTimeout(timer);
    navigator.clipboard.writeText(savedText).catch(() => {});
    showMiniStatus("⚠️ Ошибка на экране — текст сохранён, нажми Ctrl+V");
  };
  const obs = new MutationObserver(mutations => {
    for (const m of mutations) for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (isPlayerokErrorNode(node)) { trigger(); return; }
      node.querySelectorAll("[role='alert']").forEach(c => { if (isPlayerokErrorNode(c)) trigger(); });
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  timer = setTimeout(() => obs.disconnect(), 4000);
}
function getStorageValue(key) { return new Promise(resolve => { chrome.storage.local.get([key], r => resolve((r && r[key]) || "")); }); }
function normalizeCode(code) { return String(code || "").trim().replace(/\s+/g, "").toUpperCase(); }
function isPlayerokDealLink(v) { return /^https?:\/\/(?:www\.)?playerok\.com\/deal\/[a-z0-9-]+$/i.test(String(v||"").trim()); }
function isDiscordGiftLink(v) { return /^https?:\/\/(?:www\.)?discord\.gift\/[A-Za-z0-9]+$/i.test(String(v||"").trim()); }
function isDiscordCode(v) { 
  const trimmed = String(v||"").trim();
  // Проверяем, является ли это Discord кодом (16-24 символа, буквы и цифры)
  return /^[A-Za-z0-9]{16,24}$/.test(trimmed) && !trimmed.match(/^\d+$/);
}
function formatDiscordCode(code) {
  const trimmed = String(code||"").trim();
  // Если уже ссылка - возвращаем как есть
  if (isDiscordGiftLink(trimmed)) return trimmed;
  // Если похоже на Discord код - добавляем префикс
  if (isDiscordCode(trimmed)) return `https://discord.gift/${trimmed}`;
  // Иначе возвращаем как есть
  return trimmed;
}
function validateInsertValue(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return { ok: false, reason: "Код не найден" };
  if (isDiscordGiftLink(value)) return { ok: true };
  if (isPlayerokDealLink(value)) return { ok: false, reason: "Ссылка сделки запрещена" };
  return { ok: true };
}
async function getInsertedCodesHistory() {
  return new Promise(resolve => {
    chrome.storage.local.get([INSERTED_CODES_HISTORY_KEY], result => {
      resolve((Array.isArray(result?.[INSERTED_CODES_HISTORY_KEY]) ? result[INSERTED_CODES_HISTORY_KEY] : []).map(v => normalizeCode(v)).filter(Boolean));
    });
  });
}
async function getLastCode() { return String((await getStorageValue(LAST_CODE_KEY)) || "").trim(); }
async function getLastCodes() {
  return new Promise(resolve => {
    chrome.storage.local.get([LAST_CODES_KEY], r => resolve((Array.isArray(r?.[LAST_CODES_KEY]) ? r[LAST_CODES_KEY] : []).map(v => String(v||"").trim()).filter(Boolean)));
  });
}
async function saveLastCodes(codes) { return new Promise(resolve => { chrome.storage.local.set({ [LAST_CODES_KEY]: codes }, () => resolve()); }); }
async function pushCodeToLastCodes(code) {
  const clean = String(code||"").trim(); if (!clean) return;
  const current = await getLastCodes();
  if (current[current.length-1] === clean) return;
  current.push(clean); await saveLastCodes(current.slice(-3));
}
async function resolveCurrentCode() {
  const fromStorage = await getLastCode();
  if (fromStorage) { await pushCodeToLastCodes(fromStorage); return fromStorage; }
  const fromClipboard = await getClipboardValue("");
  const resolved = String(fromClipboard||"").trim();
  if (resolved) await pushCodeToLastCodes(resolved);
  return resolved;
}
async function getClipboardValue(fallback) { try { return (await navigator.clipboard.readText()||"").trim()||fallback; } catch(_){return fallback;} }
async function getClipboardRawText() { try { return await navigator.clipboard.readText(); } catch(_){return "";} }
async function canInsertCode(code) {
  if (!code) return false;
  const normalized = normalizeCode(code); if (!normalized) return false;
  const [last, history] = await Promise.all([getStorageValue(LAST_INSERTED_CODE_KEY), getInsertedCodesHistory()]);
  if (normalizeCode(last) === normalized) return false;
  return !history.includes(normalized);
}
async function markCodeAsInserted(code) {
  const normalized = normalizeCode(code);
  return new Promise(resolve => {
    chrome.storage.local.get([INSERTED_CODES_HISTORY_KEY], result => {
      const history = (Array.isArray(result?.[INSERTED_CODES_HISTORY_KEY]) ? result[INSERTED_CODES_HISTORY_KEY] : []).map(v => normalizeCode(v)).filter(Boolean);
      if (normalized && !history.includes(normalized)) history.push(normalized);
      chrome.storage.local.set({ [LAST_INSERTED_CODE_KEY]: code, [INSERTED_CODES_HISTORY_KEY]: history.slice(-500) }, () => { if (normalized) insertedCodesCache.add(normalized); resolve(); });
    });
  });
}
function buildCodesSignature(codes) { return codes.map(c => String(c||"").trim()).filter(Boolean).join("||"); }
function extractCodesFromText(text) {
  const raw = String(text||""); if (!raw.trim()) return [];
  return [...new Set(raw.split(/[\r\n,;]+/g).map(v=>v.trim()).filter(Boolean))];
}
async function canInsertCodes(codes) {
  const sig = buildCodesSignature(codes); if (!sig) return false;
  return String((await getStorageValue(LAST_INSERTED_CODES_SIGNATURE_KEY))||"").trim() !== sig;
}
async function markCodesAsInserted(codes) {
  const sig = buildCodesSignature(codes);
  return new Promise(resolve => {
    chrome.storage.local.get([INSERTED_CODES_HISTORY_KEY], result => {
      const history = (Array.isArray(result?.[INSERTED_CODES_HISTORY_KEY]) ? result[INSERTED_CODES_HISTORY_KEY] : []).map(v=>normalizeCode(v)).filter(Boolean);
      for (const c of codes) { const n=normalizeCode(c); if(n&&!history.includes(n)) history.push(n); if(n) insertedCodesCache.add(n); }
      chrome.storage.local.set({ [LAST_INSERTED_CODES_SIGNATURE_KEY]: sig, [INSERTED_CODES_HISTORY_KEY]: history.slice(-500) }, () => resolve());
    });
  });
}
function showMiniStatus(text) {
  const el = document.querySelector("#dist-chat-mini-status"); if (!el) return;
  el.textContent = text; el.style.opacity = "1";
  if (miniStatusTimer) clearTimeout(miniStatusTimer);
  miniStatusTimer = setTimeout(() => { el.style.opacity = "0"; el.textContent = ""; }, 2600);
}
function buildPromoTemplate(p) { return getTemplate("promo").replace("{code}", p); }
function buildKeyTemplate(k) { return getTemplate("key").replace("{code}", k); }
function buildIdTemplate() { return getTemplate("id"); }
function buildGiftCardTemplate(c) { return getTemplate("giftcard").replace("{code}", c); }
function buildRobloxPremiumTemplate(codes) { return getTemplate("robloxpremium").replace("{code1}",codes[0]).replace("{code2}",codes[1]).replace("{code3}",codes[2]); }
function buildBrazilTemplate(c) { return getTemplate("brazil").replace("{code}", c); }
function updateGreetingUi(name) {
  const cur = document.querySelector("#dist-template-current");
  if (cur) cur.textContent = name ? `Имя: ${name}` : "Имя: не задано";
  const btn = document.querySelector("#dist-template-settings span");
  if (btn) btn.textContent = name ? `Имя шаблона: ${name}` : "Имя шаблона";
}
async function refreshGreetingUi() { updateGreetingUi(await getSavedGreetingName()); }
async function openGreetingNamePrompt() {
  const cur = await getSavedGreetingName();
  const entered = prompt("Введите ваше имя в шаблон", cur || "");
  if (!entered || !entered.trim()) return "";
  const clean = entered.trim(); await saveGreetingName(clean); updateGreetingUi(clean); return clean;
}
window.openGreetingNamePrompt = openGreetingNamePrompt;

function showUsedCodeWarning(code, onConfirm) {
  document.querySelector("#dist-used-warn")?.remove();
  const wrap = document.createElement("div");
  wrap.id = "dist-used-warn";
  wrap.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(8,12,24,0.95);backdrop-filter:blur(16px);border:1px solid rgba(239,68,68,0.35);border-radius:14px;padding:12px 16px;z-index:9999999;font-size:12px;color:#fca5a5;box-shadow:0 8px 32px rgba(0,0,0,0.6);min-width:260px;max-width:340px;font-family:Inter,sans-serif;`;
  const shortCode = String(code||"").slice(0,20)+(String(code||"").length>20?"…":"");
  wrap.innerHTML = `<div style="display:flex;align-items:center;gap:7px;margin-bottom:8px"><div style="width:7px;height:7px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px rgba(239,68,68,0.6);flex-shrink:0"></div><span style="font-weight:700;font-size:12px;color:#fca5a5">Код уже использован</span></div><div style="color:#fde68a;font-size:11px;margin-bottom:10px;word-break:break-all;padding:5px 8px;background:rgba(253,230,138,0.06);border-radius:7px;border:1px solid rgba(253,230,138,0.12)">${shortCode}</div><div style="display:flex;gap:6px;justify-content:flex-end"><button id="dist-used-cancel" style="padding:5px 12px;background:rgba(51,65,85,0.4);border:1px solid rgba(51,65,85,0.6);color:#94a3b8;border-radius:8px;cursor:pointer;font-size:11px;font-family:Inter,sans-serif">Отмена</button><button id="dist-used-confirm" style="padding:5px 12px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;font-family:Inter,sans-serif">Вставить</button></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector("#dist-used-cancel").onclick = () => wrap.remove();
  wrap.querySelector("#dist-used-confirm").onclick = () => { wrap.remove(); onConfirm(); };
  setTimeout(() => {
    function oc(e) { if (!wrap.contains(e.target)) { wrap.remove(); document.removeEventListener("click", oc, true); } }
    document.addEventListener("click", oc, true);
  }, 0);
}

async function insertWithCodeCheck(tpl, type, templateKey) {
  if (type === "code") {
    const codes = await resolveCurrentCodes();
    if (codes.length === 0) { showMiniStatus("Коды не найдены"); return; }
    
    const history = await getInsertedCodesHistory();
    const newCodes = [];
    const usedCodes = [];
    
    for (const code of codes) {
      // Если это Discord Nitro шаблон, форматируем код
      const formattedCode = (templateKey === 'discordnitro') ? formatDiscordCode(code) : code;
      
      const v = validateInsertValue(formattedCode);
      if (!v.ok) continue;
      
      const norm = normalizeCode(formattedCode);
      if (history.includes(norm)) {
        usedCodes.push(formattedCode);
      } else {
        newCodes.push(formattedCode);
      }
    }

    if (newCodes.length > 0) {
      // Склеиваем все новые коды через пробел
      const codesString = newCodes.join(' ');
      const finalText = tpl.replace(/\{code\}/g, codesString);
      
      insertTextIntoChat(finalText);
      watchForInsertError(finalText);
      
      for (const c of newCodes) await markCodeAsInserted(c);
      showMiniStatus(newCodes.length > 1 ? `${newCodes.length} кода вставлено` : "Вставлено");
    } else if (usedCodes.length > 0) {
      // Предлагаем вставить использованные коды
      const firstCode = usedCodes[0];
      showUsedCodeWarning(firstCode, async () => {
        const codesString = usedCodes.join(' ');
        const finalText = tpl.replace(/\{code\}/g, codesString);
        
        insertTextIntoChat(finalText);
        for (const c of usedCodes) await markCodeAsInserted(c);
        showMiniStatus("Вставлено (повтор)");
      });
    } else {
      showMiniStatus("Коды не найдены");
    }
  } else if (type === "roblox") {
    // Roblox Premium по-прежнему ожидает ровно 3 кода
    let codes = (await getLastCodes()).slice(-3);
    if (codes.length < 3) { const p = extractCodesFromText(await getClipboardRawText()); if (p.length>=3) { codes=p.slice(0,3); await saveLastCodes(codes); } }
    if (codes.length < 3) { showMiniStatus("Нужно 3 кода"); return; }
    const text = tpl.replace("{code1}",codes[0]).replace("{code2}",codes[1]).replace("{code3}",codes[2]);
    const used = !(await canInsertCodes(codes));
    if (used) { showUsedCodeWarning(codes[0], async () => { insertTextIntoChat(text); navigator.clipboard.writeText(text).catch(()=>{}); await markCodesAsInserted(codes); showMiniStatus("Вставлено (повтор)"); }); return; }
    insertTextIntoChat(text); await markCodesAsInserted(codes); watchForInsertError(text); showMiniStatus("Вставлено");
  } else if (type === "greeting") {
    const name = await getSavedGreetingName();
    const text = tpl.replace(/\{name\}/g, name || "");
    insertTextIntoChat(text); watchForInsertError(text); showMiniStatus("Вставлено");
  } else {
    insertTextIntoChat(tpl); watchForInsertError(tpl); showMiniStatus("Вставлено");
  }
}

async function resolveCurrentCodes() {
  // Получаем данные из хранилища и из буфера одновременно
  const res = await new Promise(resolve => {
    chrome.storage.local.get(["lastCodes", "lastCodeTime"], resolve);
  });
  
  const fromStorage = res.lastCodes || [];
  const storageTime = res.lastCodeTime ? new Date(res.lastCodeTime).getTime() : 0;
  const now = Date.now();
  
  const fromClipboardRaw = await getClipboardRawText();
  const fromClipboard = extractCodesFromText(fromClipboardRaw);
  
  // Если в буфере что-то есть, проверяем, не новее ли это
  if (fromClipboard.length > 0) {
    const storageSig = fromStorage.join('|');
    const clipSig = fromClipboard.join('|');
    
    // Если буфер отличается от стораджа ИЛИ сторадж старее 5 минут — берем буфер
    if (storageSig !== clipSig || (now - storageTime > 300000)) {
      return fromClipboard;
    }
  }
  
  return fromStorage.length > 0 ? fromStorage : fromClipboard;
}

async function onPromoTemplateClick() {
  const codes = await resolveCurrentCodes();
  if (codes.length === 0) { showMiniStatus("Коды не найдены"); return; }
  
  const texts = [];
  let insertedCount = 0;
  for (const code of codes) {
    const v = validateInsertValue(code);
    if (!v.ok) continue;
    const used = !(await canInsertCode(code));
    if (used) continue;
    
    texts.push(buildPromoTemplate(code));
    await markCodeAsInserted(code);
    insertedCount++;
  }

  if (texts.length > 0) {
    const finalSelection = texts.join('\n\n'); // Добавим двойной перенос для красоты между шаблонами
    insertTextIntoChat(finalSelection);
    watchForInsertError(finalSelection);
    showMiniStatus(insertedCount > 1 ? `${insertedCount} кода вставлено` : "Код вставлен");
  } else {
    showMiniStatus("Нет новых кодов");
  }
}

async function onKeyTemplateClick() {
  const codes = await resolveCurrentCodes();
  if (codes.length === 0) { showMiniStatus("Ключи не найдены"); return; }
  
  const texts = [];
  let insertedCount = 0;
  for (const code of codes) {
    const v = validateInsertValue(code);
    if (!v.ok) continue;
    const used = !(await canInsertCode(code));
    if (used) continue;
    
    texts.push(buildKeyTemplate(code));
    await markCodeAsInserted(code);
    insertedCount++;
  }

  if (texts.length > 0) {
    const finalSelection = texts.join('\n');
    insertTextIntoChat(finalSelection);
    watchForInsertError(finalSelection);
    showMiniStatus(insertedCount > 1 ? `${insertedCount} ключа вставлено` : "Ключ вставлен");
  } else {
    showMiniStatus("Нет новых ключей");
  }
}

function onIdTemplateClick() { const t=buildIdTemplate(); insertTextIntoChat(t); watchForInsertError(t); showMiniStatus("Шаблон вставлен"); }

async function onGiftCardTemplateClick() {
  const codes = await resolveCurrentCodes();
  if (codes.length === 0) { showMiniStatus("Коды не найдены"); return; }
  
  const texts = [];
  let insertedCount = 0;
  for (const code of codes) {
    const v = validateInsertValue(code);
    if (!v.ok) continue;
    const used = !(await canInsertCode(code));
    if (used) continue;
    
    texts.push(buildGiftCardTemplate(code));
    await markCodeAsInserted(code);
    insertedCount++;
  }

  if (texts.length > 0) {
    const finalSelection = texts.join('\n');
    insertTextIntoChat(finalSelection);
    watchForInsertError(finalSelection);
    showMiniStatus(insertedCount > 1 ? `${insertedCount} кода вставлено` : "Код вставлен");
  } else {
    showMiniStatus("Нет новых кодов");
  }
}
async function onRobloxPremiumTemplateClick() {
  let codes = (await getLastCodes()).slice(-3);
  if (codes.length<3) { const p=extractCodesFromText(await getClipboardRawText()); if(p.length>=3){codes=p.slice(0,3);await saveLastCodes(codes);} }
  if (codes.length<3) { showMiniStatus("Нужно 3 кода"); return; }
  const used = !(await canInsertCodes(codes));
  if (used) { showUsedCodeWarning(codes[0], async () => { const t=buildRobloxPremiumTemplate(codes); insertTextIntoChat(t); navigator.clipboard.writeText(t).catch(()=>{}); await markCodesAsInserted(codes); showMiniStatus("Вставлено (повтор)"); }); return; }
  const text = buildRobloxPremiumTemplate(codes); insertTextIntoChat(text); await markCodesAsInserted(codes); watchForInsertError(text); showMiniStatus("3 кода вставлены");
}
async function onBrazilTemplateClick() {
  const code = await resolveCurrentCode(); const v = validateInsertValue(code); if (!v.ok) { showMiniStatus(v.reason); return; }
  const used = !(await canInsertCode(code));
  if (used) { showUsedCodeWarning(code, async () => { const t=buildBrazilTemplate(code); insertTextIntoChat(t); navigator.clipboard.writeText(t).catch(()=>{}); await markCodeAsInserted(code); showMiniStatus("Вставлено (повтор)"); }); return; }
  const text = buildBrazilTemplate(code); insertTextIntoChat(text); await markCodeAsInserted(code); watchForInsertError(text); showMiniStatus("Код вставлен");
}

// ── Все шаблоны ──
const QUICK_TEMPLATES = [
  { group: "🔹 Основные", items: [
    { label: "👋 Приветствие", key: "greeting", type: "greeting" },
    { label: "🔑 Ключ активации", key: "key", type: "code" },
    { label: "🎟 Промокод", key: "promo", type: "code" },
    { label: "💳 Подарочная карта", key: "giftcard", type: "code" },
    { label: "🆔 Донат по ID / TG", key: "id", type: "plain" },
    { label: "💎 Roblox Premium", key: "robloxpremium", type: "roblox" },
    { label: "🇧🇷 BRL промокод", key: "brazil", type: "code" },
  ]},
  { group: "🔹 Специальные", items: [
    { label: "🎮 ExitLag промокод", key: "exitlag", type: "code", text: "✅ Благодарю за покупку! Промокод нужно активировать в сервисе, чтобы получить подписку.\n\n💡 Как активировать промокод:\n1️⃣ Скопируйте промокод ниже и перейдите на https://plrk.co/p/exitlag_redeem\n2️⃣ Вставьте промокод — подписка сразу активируется на ваш аккаунт\n\n👉 Ваш промокод: \"{code}\"" },
    { label: "💬 Discord Nitro", key: "discordnitro", type: "code", text: "✅ Благодарю за покупку! Инструкция по активации находится в описании и данных товара. Активировать Nitro можно прямо в браузере или открыть ссылку в приложении.\n\n👉 Ссылка для активации Discord Nitro — \"{code}\"" },
  ]},
  { group: "🟥 Проблемы", items: [
    { label: "🟥 Создана проблема", key: "problem", type: "greeting", text: "👋 Здравствуйте, меня зовут {name}. Вижу, у вас появилась проблема с товаром 🤔\n\n✍️ Я передаю заявку специалистам, они свяжутся с вами в течение 24 часов\n\nРасскажите, пожалуйста, какая проблема у вас возникла?\n1️⃣ Опишите проблему, как можно подробнее\n2️⃣ Пришлите соответствующие скриншоты\n\n💡 Эта информация поможет нам в случае разбирательств" },
    { label: "🆘 Кардинг", key: "carding", type: "plain", text: "😞 Возникла ошибка с выдачей, товар будет предоставлен в течение 30 минут. Ожидайте обратной связи 🙏" },
    { label: "🆘 Мошенник", key: "scammer", type: "plain", text: "😞 К сожалению, возникли ошибки с выдачей, товар будет предоставлен в течение 15 минут. Приносим извинения за задержку, ожидайте обратной связи 🙏" },
  ]},
  { group: "🔁 Возвраты", items: [
    { label: "🔁 Неизвестная ошибка", key: "refund_error", type: "plain", text: "😞 Мы попробовали совершить донат, но транзакция не проходит — валюта не зачисляется на баланс\n\nЭто может быть связано с ограничениями аккаунта или регионом, поэтому мы возвращаем вам средства. Извините за неудобства 🙏\n\n👉 Рекомендуем попробовать оформить заказ у других продавцов на нашем маркетплейсе:\n🔗 ССЫЛКА" },
    { label: "🔙 Пользователь попросил", key: "refund_user", type: "plain", text: "Жаль, что вы решили отказаться от получения товара. Мы уважаем ваше решение и уже оформляем возврат средств.\n\nБудем рады видеть вас снова, если решите оформить покупку 😊\n\n👉 Кстати, у нас есть другие продавцы, которые доставляют товар быстрее — можете посмотреть здесь:\n🔗 ССЫЛКА" },
    { label: "😴 Товар закончился", key: "refund_outofstock", type: "plain", text: "😞 К сожалению, мы временно приостановили продажу этого товара\n\nНе переживайте, это не навсегда, мы продолжим продажу чуть позже! 😀\n\n✅ Но вы можете оформить заказ у других продавцов на нашем маркетплейсе с наличием и более быстрой доставкой:\n🔗 ССЫЛКА" },
    { label: "💎 MLBB не RU-регион", key: "refund_mlbb", type: "plain", text: "😀 Благодарим за покупку нашего товара. Но, как указано в описании товара — пополнение доступно только для RU-аккаунтов. Поэтому, мы возвращаем средства.\n\n✅ Мы уже работаем над расширением ассортимента товаров, чтобы вы могли совершать покупки без ограничений по региону.\n\n👉 Советуем оформить заказ у других продавцов на нашем маркетплейсе с большим наличием регионов и более быстрой доставкой\n🔗 ССЫЛКА" },
    { label: "📣 Возврат / АФК 3+ дня", key: "refund_afk", type: "greeting", text: "👋 Здравствуйте, меня зовут {name}!\n\nК сожалению, вы долгое время игнорировали наши сообщения, мы не можем выполнить заказ без вашего участия. В связи с этим, возвращаем вам средства 🙏\n\nЕсли вы вернетесь к покупке — будем рады выполнить заказ 😊\n\n👉 Чтобы не ждать, можно выбрать других продавцов с более быстрым выполнением:\n🔗 ССЫЛКА" },
    { label: "🔵 Steam не RU-регион", key: "refund_steam", type: "plain", text: "✅ Благодарим за покупку нашего товара.\n\n😞 К сожалению, ваш Steam-аккаунт имеет не российский регион, в связи с этим мы возвращаем вам средства, так как в описании товара указана следующая информация:\n\n\"Игра доступна только для аккаунтов Steam с регионом РФ\"\n\n👉 Рекомендуем вам приобрести этот товар у других продавцов на нашем маркетплейсе с большим наличием регионов и более быстрой доставкой:\n🔗 ССЫЛКА" },
  ]},
  { group: "⌛ Задержки", items: [
    { label: "⛔ Проблема с сервисом", key: "delay_service", type: "plain", text: "😞 Приносим извинения за столь долгое ожидание ответа. К сожалению, возникли технические проблемы с выдачей заказа. В связи с этим, время на получение товара незначительно увеличено до 12 часов.\n\nНе переживайте, мы делаем всё возможное, чтобы предоставить вам товар 🙏" },
    { label: "⛔ Закончился товар", key: "delay_stock", type: "plain", text: "🙁 Произошла ошибка…\n\n🕐 Выдача товара временно задерживается по причине отсутствия в наличии. Товар будет предоставлен в течение 24 часов. Приносим извинения за задержку 🙏\n\n⛔ Если за 24 часа мы не предоставим товар – вы можете запросить возврат средств, для этого вам нужно перейти на страницу сделки и сообщить о проблеме" },
    { label: "🔴 Ещё +24 часа", key: "delay_24h", type: "greeting", text: "👋 Здравствуйте, меня зовут {name}!\n\n😞 К сожалению, возникли технические проблемы с выдачей заказа, в связи с чем время получения товара увеличено — выдача задерживается ещё на 24 часа. Приносим извинения за неудобства, мы делаем всё возможное, чтобы как можно скорее предоставить вам товар.\n\n👉 Если вы хотите оформить возврат, пожалуйста, сообщите нам. Благодарим за терпение!" },
  ]},
  { group: "🔴 Уточнение данных", items: [
    { label: "🔴 Неверный ID", key: "wrong_id", type: "plain", text: "😟 Похоже, что вы указали неверный ID или оставили поле пустым. Для передачи товара нам требуется ваш ID.\n\n💡 Ознакомьтесь с данными или описанием товара, там находится инструкция \"🔎 Как найти свой ID\"\n\nПожалуйста, пришлите ваш игровой ID в чат сделки 👇" },
    { label: "🔴 Неверный TG-юзернейм", key: "wrong_tg", type: "plain", text: "😟 Похоже, что вы указали неверный @username или оставили поле пустым. Без корректного юзернейма мы не сможем выполнить заказ.\n\n🔎 Как найти свой @username:\n1️⃣ Откройте Telegram\n2️⃣ Перейдите в настройки и нажмите \"Мой профиль\"\n3️⃣ Скопируйте свой @username и пришлите в чат сделки 👇" },
    { label: "🔴 Премиум уже есть", key: "tg_has_premium", type: "plain", text: "😟 Похоже на вашем аккаунте уже есть Telegram-премиум, поэтому мы не можем совершить передачу товара.\n\n👉 Мы можем приобрести премиум для вашего любого другого телеграм-аккаунта или вернуть средства.\n\nУведомите нас, после того, как примите решение. Будем ждать 😊" },
  ]},
  { group: "💎 Mobile Legends", items: [
    { label: "💎 Донат выполнен", key: "mlbb_done", type: "plain", text: "😀 Благодарим за покупку нашего товара. Как сообщалось ранее — валюта поступит в течение 60 минут.\n\n🔴 Если вам не поступила валюта:\n1) Пришлите скриншот вашего ID и Zone_ID в наш чат;\n2) Перейдите на страницу сделки и сообщите о проблеме. Мы свяжемся с вами для решения в случае проблемы 🤝" },
    { label: "💎 ZoneID не с цифры 6", key: "mlbb_zone", type: "plain", text: "😀 Благодарим за покупку нашего товара. Как указано в описании товара — донат выполняется только на аккаунты RU-региона. Zone_ID должен начинаться с цифры \"6\".\n\n🔴 Мы не можем совершить донат на ваш аккаунт, в связи с этим возвращаем средства.\n\n🔗 Наш актуальный ассортимент — https://playerok.com/official" },
    { label: "💎 Нет ID/ZoneID", key: "mlbb_noid", type: "plain", text: "😒 Похоже, вы не указали \"ID, Zone_ID\" своего аккаунта или данные оказались не верны, поэтому мы не можем выполнить заказ.\n\n💡 Краткая инструкция, где найти ID и Zone_ID\n1️⃣ Войдите в игру и нажмите на свой аватар в левом верхнем углу экрана.\n2️⃣ Скопируйте User ID и запомните ваш Zone-ID, он находится рядом с User ID\n3️⃣ Без ошибки пришлите ID и Zone-ID в наш с вами чат сделки 👇" },
  ]},
  { group: "🈹 PUBG Mobile", items: [
    { label: "🈹 Донат выполнен", key: "pubg_done", type: "plain", text: "✅ Готово!\n\nМы зачислили UC на ID вашего аккаунта. Не забудьте проверить наличие валюты в игре.\n\nЖдём вас снова 😀" },
    { label: "🟥 Нет ID", key: "pubg_noid", type: "plain", text: "😒 К сожалению, вы не указали ID своего аккаунта или он оказался не верным, поэтому мы не можем выполнить заказ.\n\n💡 Краткая инструкция, где найти ваш ID\n1️⃣ Войдите в игру и нажмите на аватарку своего аккаунта\n2️⃣ Над никнеймом скопируйте свой ID\n3️⃣ Без ошибки пришлите ID в наш с вами чат сделки 👇" },
  ]},
  { group: "🏈 Zenless Zone Zero", items: [
    { label: "🏈 Не указан сервер", key: "zzz_server", type: "plain", text: "😊 Для выполнение заказа нам требуется название вашего сервера в Zenless Zone Zero:\n\nВыберите ваш сервер:\nAmerica, Asia, Europe или TW/HK/MO?" },
  ]},
  { group: "🎭 Fortnite", items: [
    { label: "🎭 Minty Legends набор", key: "fn_minty", type: "code", text: "✅ Благодарю за покупку! Инструкция по активации находится в описании и данных товара.\n\n🕔 После активации кода набор может прийти с задержкой до 30 минут 😊\n\n👉 Ваш промокод на игровой набор: \"{code}\"" },
    { label: "🎭 Боевой пропуск", key: "fn_bp", type: "code", text: "✅ Благодарю за покупку! Для получения боевого пропуска вам необходимо активировать промокод и получить 1000 В-баксов, после чего приобрести боевой пропуск перейдя в игре во вкладку \"Боевой пропуск\".\n\n💡 Подробную инструкцию по активации вы сможете найти в описании и данных товара.\n\n👉 Ваш промокод: \"{code}\"" },
  ]},
  { group: "🧿 Steam", items: [
    { label: "🧿 Подарок передан", key: "steam_done", type: "plain", text: "✅ Благодарим за покупку, мы отправили товар на ваш Steam аккаунт!\n\n🔗 Наш актуальный ассортимент — https://playerok.com/official\n\nЖдём вас снова! 😊" },
    { label: "🧿 Добавить в друзья", key: "steam_add", type: "plain", text: "Для получения товара прошу вас добавить в друзья наш профиль Playerok в Steam\n\n🔗 Профиль: ССЫЛКА\n\nПосле добавления в друзья обязательно уведомите об этом в нашем чате и укажите ваш никнейм Steam 😊\n\n⚠️Ссылки на профили:\n🔗 https://plrk.co/p/steam_one\n🔗 https://plrk.co/p/steam_two\n🔗 https://plrk.co/p/steam_three\n🔗 https://plrk.co/p/steam_four" },
    { label: "🧿 Покупатель АФК", key: "steam_afk", type: "plain", text: "😞 К сожалению, мы не получили ответа от вас и вынуждены перейти к следующему заказу\n\nКак будете готовы получить товар – обязательно добавьте наши аккаунты в друзья:\n1. 🔗 https://plrk.co/p/steam_one\n2. 🔗 https://plrk.co/p/steam_two\n3. 🔗 https://plrk.co/p/steam_three\n4. 🔗 https://plrk.co/p/steam_four\n\nУкажите свой никнейм Steam-аккаунта и мы отправим вам товар 😊" },
    { label: "🔵 DBD нет основной игры", key: "steam_dbd", type: "plain", text: "😞 Похоже, на вашем аккаунте отсутствует оригинальная игра Dead By Daylight!\n\nНам не удалось отправить вам DLC подарком, но мы советуем приобрести ключ для оригинальной игры Dead By Daylight на нашем маркетплейсе, чтобы мы предоставили вам DLC подарком.\n\n👉 Выберите нужный ключ и купите его, чтобы у нас появилась возможность передать DLC. Не забудьте уведомить нас, как будете готовы получить товар 😀\n\n🔗 https://playerok.com/games/dead-by-daylight/keys" },
  ]},
  { group: "🧈 Roblox", items: [
    { label: "🧈 Premium + инструкция", key: "robloxpremium", type: "roblox" },
    { label: "🧈 BRL промокод", key: "brazil", type: "code" },
  ]},
];

// Получить item по key из QUICK_TEMPLATES
// ── Кастомные группы и шаблоны ──
const CUSTOM_GROUPS_KEY = "dist_custom_groups_v2";
let customGroups = [];

function loadCustomGroups() {
  try { customGroups = JSON.parse(localStorage.getItem(CUSTOM_GROUPS_KEY) || "[]"); } catch(_) { customGroups = []; }
}
function saveCustomGroups() {
  try {
    localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(customGroups));
    
    // Синхронизируем customTemplates, чтобы getTemplate всегда видел актуальные тексты
    customGroups.forEach(g => {
      g.items.forEach(it => {
        if (it.text !== undefined) customTemplates[it.key] = it.text;
      });
    });
    saveCustomTemplates();
  } catch(_) {}
}

// Возвращает все группы: встроенные + кастомные
function getAllTemplateGroups() {
  return [...QUICK_TEMPLATES, ...customGroups];
}

loadCustomGroups();
function getTemplateItem(key) {
  for (const { items } of getAllTemplateGroups()) {
    const found = items.find(i => i.key === key);
    if (found) return found;
  }
  return null;
}

function getOrderedTemplates() {
  if (templateOrder.length === 0) return QUICK_TEMPLATES;
  
  const orderedGroups = [];
  const groupOrder = templateOrder.filter(g => g && g.group).map(g => g.group);
  const keyOrder = templateOrder.filter(g => g && g.key).map(g => g.key);
  
  groupOrder.forEach(groupName => {
    const orig = QUICK_TEMPLATES.find(g => g.group === groupName);
    if (!orig) return;
    const filteredItems = orig.items.filter(item => keyOrder.includes(item.key));
    const sortedItems = [...filteredItems].sort((a, b) => keyOrder.indexOf(a.key) - keyOrder.indexOf(b.key));
    if (sortedItems.length > 0) {
      orderedGroups.push({ group: orig.group, items: sortedItems });
    }
  });
  
  QUICK_TEMPLATES.forEach(({ group, items }) => {
    if (!groupOrder.includes(group)) {
      orderedGroups.push({ group, items });
    }
  });
  
  return orderedGroups;
}

function openTemplateEditor() {
  document.querySelector("#dist-tpl-editor")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "dist-tpl-editor";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999999;display:flex;align-items:center;justify-content:center;";
  const box = document.createElement("div");
  box.style.cssText = "background:rgba(8,12,24,0.97);backdrop-filter:blur(20px);border:1px solid rgba(99,102,241,0.22);border-radius:16px;padding:14px;width:min(94vw,680px);max-height:90vh;display:flex;flex-direction:column;font-family:Inter,sans-serif;color:#e2e8f0;box-shadow:0 24px 60px rgba(0,0,0,.7);overflow:hidden;";

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-shrink:0;";
  hdr.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);flex-shrink:0"></div><span style="font-size:13px;font-weight:700;color:#e2e8f0;flex:1">✏️ Редактор шаблонов</span><input id="dist-tpl-ed-search" placeholder="🔍 Поиск..." style="background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.25);color:#e2e8f0;border-radius:8px;padding:4px 9px;font-size:11px;outline:none;font-family:Inter,sans-serif;width:140px;" /><div id="dist-tpl-close" style="cursor:pointer;color:#475569;font-size:18px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(51,65,85,0.4);">×</div>';
  box.appendChild(hdr);

  const scrollArea = document.createElement("div");
  scrollArea.style.cssText = "overflow-y:auto;flex:1;padding-right:2px;";

  function renderEditorItems(query) {
    scrollArea.innerHTML = "";
    const q = (query || "").toLowerCase().trim();
    const allGroups = getAllTemplateGroups();

    // Закреплённые
    const pinnedItems = allGroups.flatMap(g => g.items).filter(it => isPinned(it.key) && (!q || it.label.toLowerCase().includes(q)));
    if (pinnedItems.length) {
      const ph = document.createElement("div");
      ph.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#6366f1;padding:4px 2px 3px;";
      ph.textContent = "📌 Закреплённые";
      scrollArea.appendChild(ph);
      pinnedItems.forEach(item => renderEditorRow(item, false));
    }

    allGroups.forEach(({ group, items }, groupIdx) => {
      const filtered = items.filter(it => !q || it.label.toLowerCase().includes(q));
      const isCustomGroup = groupIdx >= QUICK_TEMPLATES.length;

      const gEl = document.createElement("div");
      gEl.style.cssText = "display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#475569;padding:6px 2px 3px;";

      const gText = document.createElement("span");
      gText.style.flex = "1";
      gText.textContent = group;
      gEl.appendChild(gText);

      // Кнопка добавить шаблон в группу
      const addItemBtn = document.createElement("span");
      addItemBtn.textContent = "+ шаблон";
      addItemBtn.style.cssText = "cursor:pointer;color:#6366f1;font-size:10px;padding:2px 6px;border-radius:5px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);text-transform:none;letter-spacing:0;font-weight:600;";
      addItemBtn.onclick = () => openAddItemDialog(group, isCustomGroup, groupIdx);
      gEl.appendChild(addItemBtn);

      // Кнопка удалить группу (только для кастомных)
      if (isCustomGroup) {
        const delGroupBtn = document.createElement("span");
        delGroupBtn.textContent = "🗑";
        delGroupBtn.title = "Удалить группу";
        delGroupBtn.style.cssText = "cursor:pointer;font-size:12px;padding:2px 4px;border-radius:5px;background:rgba(239,68,68,0.1);";
        delGroupBtn.onclick = () => {
          if (!confirm(`Удалить группу "${group}" со всеми шаблонами?`)) return;
          const ci = groupIdx - QUICK_TEMPLATES.length;
          customGroups.splice(ci, 1);
          saveCustomGroups();
          renderEditorItems(hdr.querySelector("#dist-tpl-ed-search")?.value || "");
        };
        gEl.appendChild(delGroupBtn);
      }

      scrollArea.appendChild(gEl);
      if (!filtered.length && !q) {
        const empty = document.createElement("div");
        empty.style.cssText = "font-size:11px;color:#334155;padding:4px 6px;font-style:italic;";
        empty.textContent = "Нет шаблонов";
        scrollArea.appendChild(empty);
      }
      filtered.forEach(item => renderEditorRow(item, isCustomGroup, group, groupIdx));
    });
  }

  function renderEditorRow(item, isCustom, groupName, groupIdx) {
    const pinned = isPinned(item.key);
    const defaultText = item.text || DEFAULT_TEMPLATES[item.key] || "";
    const current = customTemplates[item.key] !== undefined ? customTemplates[item.key] : defaultText;

    const wrap = document.createElement("div");
    wrap.style.cssText = "margin-bottom:8px;background:rgba(15,23,42,0.5);border:1px solid " + (pinned ? "rgba(99,102,241,0.35)" : "rgba(51,65,85,0.4)") + ";border-radius:10px;padding:8px 10px;";

    const labelRow = document.createElement("div");
    labelRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:5px;";

    const labelEl = document.createElement("span");
    labelEl.style.cssText = "font-size:11px;color:#94a3b8;flex:1;";
    let hint = item.type === "code" ? " · {code}" : item.type === "greeting" ? " · {name}" : item.type === "roblox" ? " · {code1}{code2}{code3}" : "";
    labelEl.textContent = item.label + hint;

    const pinBtn = document.createElement("button");
    pinBtn.type = "button"; pinBtn.textContent = pinned ? "📌" : "📍"; pinBtn.title = pinned ? "Открепить" : "Закрепить";
    pinBtn.style.cssText = "background:none;border:none;cursor:pointer;font-size:13px;padding:0 2px;opacity:" + (pinned ? "1" : "0.35") + ";transition:.15s;";
    pinBtn.onclick = () => { togglePin(item.key); renderEditorItems(hdr.querySelector("#dist-tpl-ed-search")?.value || ""); };

    const resetBtn = document.createElement("span");
    resetBtn.textContent = "↺"; resetBtn.title = "Сбросить";
    resetBtn.style.cssText = "font-size:11px;color:#334155;cursor:pointer;padding:0 3px;";
    resetBtn.onclick = () => { const ta = wrap.querySelector("textarea"); if (ta) ta.value = defaultText; };

    // Удалить кастомный шаблон
    if (isCustom) {
      const delBtn = document.createElement("span");
      delBtn.textContent = "🗑"; delBtn.title = "Удалить шаблон";
      delBtn.style.cssText = "font-size:12px;cursor:pointer;padding:0 3px;color:#ef4444;";
      delBtn.onclick = () => {
        const ci = groupIdx - QUICK_TEMPLATES.length;
        if (ci >= 0 && customGroups[ci]) {
          customGroups[ci].items = customGroups[ci].items.filter(it => it.key !== item.key);
          saveCustomGroups();
          renderEditorItems(hdr.querySelector("#dist-tpl-ed-search")?.value || "");
        }
      };
      labelRow.appendChild(labelEl); labelRow.appendChild(pinBtn); labelRow.appendChild(resetBtn); labelRow.appendChild(delBtn);
    } else {
      labelRow.appendChild(labelEl); labelRow.appendChild(pinBtn); labelRow.appendChild(resetBtn);
    }

    const ta = document.createElement("textarea");
    ta.dataset.tplKey = item.key; ta.value = current;
    ta.style.cssText = "width:100%;box-sizing:border-box;height:75px;background:rgba(8,12,24,0.7);border:1px solid rgba(51,65,85,0.4);color:#e2e8f0;border-radius:7px;padding:6px 8px;font-size:11px;font-family:Inter,sans-serif;resize:vertical;outline:none;";
    ta.onfocus = () => { ta.style.borderColor = "rgba(99,102,241,0.5)"; };
    ta.onblur = () => { ta.style.borderColor = "rgba(51,65,85,0.4)"; };

    wrap.appendChild(labelRow); wrap.appendChild(ta); scrollArea.appendChild(wrap);
  }

  function openAddItemDialog(groupName, isCustom, groupIdx) {
    document.querySelector("#dist-add-item-dialog")?.remove();
    const dlg = document.createElement("div");
    dlg.id = "dist-add-item-dialog";
    dlg.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999999999;display:flex;align-items:center;justify-content:center;";
    const inner = document.createElement("div");
    inner.style.cssText = "background:rgba(8,12,24,0.98);border:1px solid rgba(99,102,241,0.3);border-radius:14px;padding:16px;width:min(92vw,460px);font-family:Inter,sans-serif;color:#e2e8f0;";
    inner.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:12px">➕ Новый шаблон в "${groupName}"</div>
      <div style="margin-bottom:8px"><div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Название</div><input id="new-tpl-label" placeholder="Например: Мой шаблон" style="width:100%;box-sizing:border-box;background:rgba(8,12,24,0.7);border:1px solid rgba(51,65,85,0.4);color:#e2e8f0;border-radius:7px;padding:6px 8px;font-size:12px;outline:none;font-family:Inter,sans-serif;" /></div>
      <div style="margin-bottom:8px"><div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Тип</div><select id="new-tpl-type" style="width:100%;box-sizing:border-box;background:rgba(8,12,24,0.7);border:1px solid rgba(51,65,85,0.4);color:#e2e8f0;border-radius:7px;padding:6px 8px;font-size:12px;outline:none;font-family:Inter,sans-serif;"><option value="plain">Обычный текст</option><option value="greeting">С именем {name}</option><option value="code">С кодом {code}</option></select></div>
      <div style="margin-bottom:12px"><div style="font-size:11px;color:#94a3b8;margin-bottom:4px">Текст шаблона</div><textarea id="new-tpl-text" rows="5" style="width:100%;box-sizing:border-box;background:rgba(8,12,24,0.7);border:1px solid rgba(51,65,85,0.4);color:#e2e8f0;border-radius:7px;padding:6px 8px;font-size:11px;font-family:Inter,sans-serif;resize:vertical;outline:none;" placeholder="Введите текст шаблона..."></textarea></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="new-tpl-cancel" style="padding:6px 14px;background:rgba(51,65,85,0.4);border:1px solid rgba(51,65,85,0.6);color:#94a3b8;border-radius:8px;cursor:pointer;font-size:12px;font-family:Inter,sans-serif;">Отмена</button>
        <button id="new-tpl-save" style="padding:6px 14px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;font-family:Inter,sans-serif;">Добавить</button>
      </div>
    `;
    dlg.appendChild(inner);
    document.body.appendChild(dlg);
    inner.querySelector("#new-tpl-cancel").onclick = () => dlg.remove();
    inner.querySelector("#new-tpl-save").onclick = () => {
      const label = inner.querySelector("#new-tpl-label").value.trim();
      const type = inner.querySelector("#new-tpl-type").value;
      const text = inner.querySelector("#new-tpl-text").value.trim();
      if (!label || !text) { alert("Заполните название и текст"); return; }
      const key = "custom_" + Date.now();
      const newItem = { key, label, type, text };
      if (isCustom) {
        const ci = groupIdx - QUICK_TEMPLATES.length;
        customGroups[ci].items.push(newItem);
      } else {
        // Добавляем в кастомную копию встроенной группы
        let cg = customGroups.find(g => g.group === groupName);
        if (!cg) { cg = { group: groupName, items: [] }; customGroups.push(cg); }
        cg.items.push(newItem);
      }
      saveCustomGroups();
      dlg.remove();
      renderEditorItems(hdr.querySelector("#dist-tpl-ed-search")?.value || "");
    };
  }

  renderEditorItems("");
  box.appendChild(scrollArea);

  // Кнопка добавить новую группу
  const addGroupRow = document.createElement("div");
  addGroupRow.style.cssText = "display:flex;gap:8px;margin-top:8px;flex-shrink:0;padding-top:8px;border-top:1px solid rgba(99,102,241,0.12);";
  addGroupRow.innerHTML = '<input id="dist-new-group-name" placeholder="Название новой группы..." style="flex:1;background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.4);color:#e2e8f0;border-radius:8px;padding:6px 10px;font-size:12px;outline:none;font-family:Inter,sans-serif;" /><button id="dist-add-group-btn" style="padding:6px 12px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);color:#6ee7b7;border-radius:8px;cursor:pointer;font-size:11px;font-weight:600;font-family:Inter,sans-serif;white-space:nowrap;">+ Группа</button>';
  box.appendChild(addGroupRow);

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-shrink:0;";
  footer.innerHTML = '<button id="dist-tpl-cancel" style="padding:6px 16px;background:rgba(51,65,85,0.4);border:1px solid rgba(51,65,85,0.6);color:#94a3b8;border-radius:9px;cursor:pointer;font-size:12px;font-family:Inter,sans-serif;">Отмена</button><button id="dist-tpl-save" style="padding:6px 16px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;border-radius:9px;cursor:pointer;font-size:12px;font-weight:600;font-family:Inter,sans-serif;">Сохранить</button>';
  box.appendChild(footer);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  hdr.querySelector("#dist-tpl-ed-search").addEventListener("input", e => renderEditorItems(e.target.value));

  addGroupRow.querySelector("#dist-add-group-btn").onclick = () => {
    const name = addGroupRow.querySelector("#dist-new-group-name").value.trim();
    if (!name) return;
    customGroups.push({ group: name, items: [] });
    saveCustomGroups();
    addGroupRow.querySelector("#dist-new-group-name").value = "";
    renderEditorItems(hdr.querySelector("#dist-tpl-ed-search")?.value || "");
  };

  const close = () => overlay.remove();
  hdr.querySelector("#dist-tpl-close").onclick = close;
  footer.querySelector("#dist-tpl-cancel").onclick = close;
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

  footer.querySelector("#dist-tpl-save").onclick = async () => {
    scrollArea.querySelectorAll("[data-tpl-key]").forEach(ta => {
      const k = ta.dataset.tplKey; const val = ta.value.trim();
      const def = getTemplateItem(k)?.text || DEFAULT_TEMPLATES[k] || "";
      if (val === def) delete customTemplates[k]; else customTemplates[k] = val;
      
      // Также обновляем текст в самих объектах customGroups для консистентности
      customGroups.forEach(g => {
        const it = g.items.find(i => i.key === k);
        if (it) it.text = val;
      });
    });
    saveCustomGroups(); // Это также вызовет saveCustomTemplates
    close(); 
    showMiniStatus("Шаблоны сохранены");
  };
}
window.openTemplateEditor = openTemplateEditor;
window.openTemplateEditor = openTemplateEditor;

function openAddTemplateForm(parentOverlay, groups, itemOrder, saveItemOrder, renderList) {
  document.querySelector("#dist-add-tpl-form")?.remove();

  const modal = document.createElement("div");
  modal.id = "dist-add-tpl-form";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999999999;display:flex;align-items:center;justify-content:center;";

  const box = document.createElement("div");
  box.style.cssText = "background:rgba(8,12,24,0.98);backdrop-filter:blur(20px);border:1px solid rgba(99,102,241,0.3);border-radius:16px;padding:16px;width:min(94vw,460px);font-family:Inter,sans-serif;color:#e2e8f0;box-shadow:0 24px 60px rgba(0,0,0,0.8);";

  // Список групп для выбора
  const allGroups = [...groups.map(g => g.group), "➕ Новая группа"];

  box.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <div style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6)"></div>
      <span style="font-size:13px;font-weight:700;color:#e2e8f0;flex:1">Новый шаблон</span>
      <div id="dist-add-close" style="cursor:pointer;color:#475569;font-size:18px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(51,65,85,0.4)">×</div>
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">Название шаблона</div>
      <input id="dist-add-label" placeholder="Например: Мой шаблон" style="width:100%;box-sizing:border-box;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.25);color:#e2e8f0;border-radius:8px;padding:7px 10px;font-size:12px;outline:none;font-family:Inter,sans-serif;" />
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">Группа</div>
      <select id="dist-add-group" style="width:100%;box-sizing:border-box;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.25);color:#e2e8f0;border-radius:8px;padding:7px 10px;font-size:12px;outline:none;font-family:Inter,sans-serif;">
        ${allGroups.map(g => `<option value="${g}">${g}</option>`).join("")}
      </select>
    </div>
    <div id="dist-add-newgroup-wrap" style="margin-bottom:10px;display:none">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">Название новой группы</div>
      <input id="dist-add-newgroup" placeholder="Например: Мои шаблоны" style="width:100%;box-sizing:border-box;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.25);color:#e2e8f0;border-radius:8px;padding:7px 10px;font-size:12px;outline:none;font-family:Inter,sans-serif;" />
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:#64748b;margin-bottom:4px">Текст шаблона <span style="color:#475569">(можно использовать {name}, {code})</span></div>
      <textarea id="dist-add-text" placeholder="Введите текст шаблона..." style="width:100%;box-sizing:border-box;height:120px;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.25);color:#e2e8f0;border-radius:8px;padding:7px 10px;font-size:12px;outline:none;font-family:Inter,sans-serif;resize:vertical;"></textarea>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button id="dist-add-cancel" style="padding:6px 16px;background:rgba(51,65,85,0.4);border:1px solid rgba(51,65,85,0.6);color:#94a3b8;border-radius:9px;cursor:pointer;font-size:12px;font-family:Inter,sans-serif;">Отмена</button>
      <button id="dist-add-save" style="padding:6px 16px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;border-radius:9px;cursor:pointer;font-size:12px;font-weight:600;font-family:Inter,sans-serif;">Добавить</button>
    </div>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  const groupSelect = box.querySelector("#dist-add-group");
  const newGroupWrap = box.querySelector("#dist-add-newgroup-wrap");
  groupSelect.addEventListener("change", () => {
    newGroupWrap.style.display = groupSelect.value === "➕ Новая группа" ? "block" : "none";
  });

  const close = () => modal.remove();
  box.querySelector("#dist-add-close").onclick = close;
  box.querySelector("#dist-add-cancel").onclick = close;
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  box.querySelector("#dist-add-save").onclick = () => {
    const label = box.querySelector("#dist-add-label").value.trim();
    const text = box.querySelector("#dist-add-text").value.trim();
    if (!label || !text) { showMiniStatus("Заполни название и текст"); return; }

    let groupName = groupSelect.value;
    if (groupName === "➕ Новая группа") {
      groupName = box.querySelector("#dist-add-newgroup").value.trim() || "Мои шаблоны";
    }

    // Определяем тип по наличию плейсхолдеров
    let type = "plain";
    if (text.includes("{code1}") || text.includes("{code2}")) type = "roblox";
    else if (text.includes("{code}")) type = "code";
    else if (text.includes("{name}")) type = "greeting";

    const key = "custom_" + Date.now();
    const newItem = { label, key, type, text };

    // Добавляем в customGroups
    const existing = customGroups.find(g => g.group === groupName);
    if (existing) {
      existing.items.push(newItem);
    } else {
      customGroups.push({ group: groupName, items: [newItem] });
    }
    saveCustomGroups();

    // Обновляем groups в попапе
    const existingInGroups = groups.find(g => g.group === groupName);
    if (existingInGroups) {
      existingInGroups.items.push(newItem);
    } else {
      groups.push({ group: groupName, items: [newItem] });
    }

    close();
    renderList(document.querySelector("#dist-tpl-search")?.value || "");
    showMiniStatus("Шаблон добавлен");
  };

  box.querySelector("#dist-add-label").focus();
}
async function openTemplateList() {
  document.querySelector("#dist-tpl-list")?.remove();
  const name = await getSavedGreetingName();

  // Порядок групп из localStorage
  const ORDER_KEY = "dist_tpl_group_order_v1";
  function loadGroupOrder() { try { return JSON.parse(localStorage.getItem(ORDER_KEY) || "null"); } catch(_) { return null; } }
  function saveGroupOrder(order) { try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch(_) {} }

  // Порядок шаблонов внутри групп
  const ITEM_ORDER_KEY = "dist_tpl_item_order_v1";
  function loadItemOrder() { try { return JSON.parse(localStorage.getItem(ITEM_ORDER_KEY) || "{}"); } catch(_) { return {}; } }
  function saveItemOrder(data) { try { localStorage.setItem(ITEM_ORDER_KEY, JSON.stringify(data)); } catch(_) {} }

  // Применяем сохранённый порядок групп
  let groupOrder = loadGroupOrder();
  let groups = getAllTemplateGroups().map((g, i) => ({ ...g, origIdx: i }));
  if (groupOrder) {
    const ordered = [];
    groupOrder.forEach(name => { const g = groups.find(x => x.group === name); if (g) ordered.push(g); });
    groups.forEach(g => { if (!ordered.find(x => x.group === g.group)) ordered.push(g); });
    groups = ordered;
  }

  // Применяем сохранённый порядок шаблонов
  const itemOrder = loadItemOrder();
  groups = groups.map(g => {
    const order = itemOrder[g.group];
    if (!order) return g;
    const items = [...g.items];
    const sorted = [];
    order.forEach(lbl => { const it = items.find(x => x.label === lbl); if (it) sorted.push(it); });
    items.forEach(it => { if (!sorted.find(x => x.label === it.label)) sorted.push(it); });
    return { ...g, items: sorted };
  });

  const overlay = document.createElement("div");
  overlay.id = "dist-tpl-list";
  overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999999;display:flex;align-items:flex-end;justify-content:center;padding-bottom:80px;";

  const box = document.createElement("div");
  box.style.cssText = "background:rgba(8,12,24,0.97);backdrop-filter:blur(20px);border:1px solid rgba(99,102,241,0.22);border-radius:18px;width:min(96vw,680px);max-height:80vh;display:flex;flex-direction:column;font-family:Inter,sans-serif;color:#e2e8f0;box-shadow:0 24px 60px rgba(0,0,0,0.7);overflow:hidden;";

  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(99,102,241,0.15);flex-shrink:0;";
  header.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 0 8px rgba(99,102,241,0.6);flex-shrink:0"></div><span style="font-size:13px;font-weight:700;color:#e2e8f0;flex:1">Шаблоны</span><input id="dist-tpl-search" placeholder="🔍 Поиск..." style="flex:1;background:rgba(15,23,42,0.8);border:1px solid rgba(99,102,241,0.25);color:#e2e8f0;border-radius:9px;padding:5px 10px;font-size:12px;outline:none;font-family:Inter,sans-serif;" /><div id="dist-tpl-sort-toggle" title="Режим сортировки" style="cursor:pointer;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(51,65,85,0.4);border:1px solid rgba(51,65,85,0.5);font-size:14px;transition:.15s;flex-shrink:0">↕</div><div id="dist-tpl-add-btn" title="Добавить шаблон" style="cursor:pointer;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;font-size:16px;flex-shrink:0;transition:.15s">+</div><div id="dist-tpl-list-close" style="cursor:pointer;color:#475569;font-size:18px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:7px;background:rgba(51,65,85,0.4);flex-shrink:0;">×</div>`;

  const list = document.createElement("div");
  list.style.cssText = "overflow-y:auto;padding:8px;flex:1;";

  let sortMode = false;
  let dragItem = null, dragType = null, dragGroup = null;

  function appendRow(item, grpName) {
    const row = document.createElement("div");
    row.style.cssText = "padding:8px 10px;border-radius:10px;cursor:pointer;border:1px solid transparent;margin-bottom:3px;font-size:12px;color:#cbd5e1;transition:all .13s ease;display:flex;align-items:center;gap:8px;";
    row.dataset.label = item.label;
    row.dataset.group = grpName;

    if (sortMode) {
      const handle = document.createElement("span");
      handle.textContent = "⠿";
      handle.style.cssText = "cursor:grab;color:#475569;font-size:14px;flex-shrink:0;padding:0 2px";
      row.appendChild(handle);
      row.style.cursor = "default";

      handle.addEventListener("mousedown", e => {
        if (e.button !== 0) return;
        dragItem = row; dragType = "item"; dragGroup = grpName;
        row.style.opacity = "0.5";
        e.preventDefault();
      });
    }

    const lbl = document.createElement("span");
    lbl.style.cssText = "flex:1";
    lbl.innerHTML = `${isPinned(item.key) ? '<span style="font-size:11px">📌</span> ' : ""}${item.label}`;
    row.appendChild(lbl);

    if (!sortMode) {
      const ins = document.createElement("span");
      ins.style.cssText = "font-size:10px;color:#334155";
      ins.textContent = "вставить";
      row.appendChild(ins);
      row.addEventListener("mouseenter", () => { row.style.background="rgba(99,102,241,0.1)"; row.style.borderColor="rgba(99,102,241,0.25)"; row.style.color="#e2e8f0"; });
      row.addEventListener("mouseleave", () => { row.style.background=""; row.style.borderColor="transparent"; row.style.color="#cbd5e1"; });
      row.onclick = async () => {
        overlay.remove();
        await insertWithCodeCheck(getTemplate(item.key), item.type, item.key);
      };
    }
    return row;
  }

  function renderList(query) {
    list.innerHTML = "";
    const q = query.toLowerCase().trim();

    // Закреплённые (только в режиме просмотра)
    if (!sortMode) {
      const pinnedItems = groups.flatMap(g => g.items).filter(it => isPinned(it.key) && (!q || it.label.toLowerCase().includes(q)));
      if (pinnedItems.length) {
        const ph = document.createElement("div");
        ph.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#6366f1;padding:6px 6px 3px;";
        ph.textContent = "📌 Закреплённые";
        list.appendChild(ph);
        pinnedItems.forEach(item => list.appendChild(appendRow(item, "pinned")));
      }
    }

    groups.forEach(({ group, items }) => {
      const filtered = items.filter(it => !q || it.label.toLowerCase().includes(q));
      if (!filtered.length) return;

      // Заголовок группы
      const gWrap = document.createElement("div");
      gWrap.dataset.groupName = group;
      gWrap.style.cssText = "margin-bottom:2px;";

      const gEl = document.createElement("div");
      gEl.style.cssText = "font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#475569;padding:6px 6px 3px;display:flex;align-items:center;gap:6px;";

      if (sortMode) {
        const gh = document.createElement("span");
        gh.textContent = "⠿";
        gh.style.cssText = "cursor:grab;color:#6366f1;font-size:14px;padding:0 2px";
        gh.addEventListener("mousedown", e => {
          if (e.button !== 0) return;
          dragItem = gWrap; dragType = "group"; dragGroup = group;
          gWrap.style.opacity = "0.5";
          e.preventDefault();
        });
        gEl.appendChild(gh);
      }

      const gText = document.createElement("span");
      gText.textContent = group;
      gEl.appendChild(gText);
      gWrap.appendChild(gEl);

      filtered.forEach(item => gWrap.appendChild(appendRow(item, group)));
      list.appendChild(gWrap);
    });
  }

  // Drag-and-drop
  document.addEventListener("mousemove", function onDragMove(e) {
    if (!dragItem) return;
    const els = [...list.querySelectorAll(dragType === "group" ? "[data-group-name]" : `[data-group="${dragGroup}"][data-label]`)];
    els.forEach(el => { el.style.borderColor = "transparent"; });
    for (const el of els) {
      if (el === dragItem) continue;
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        el.style.borderColor = "#6366f1";
        break;
      }
    }
  });

  document.addEventListener("mouseup", function onDragUp(e) {
    if (!dragItem) return;
    dragItem.style.opacity = "1";

    if (dragType === "group") {
      const els = [...list.querySelectorAll("[data-group-name]")];
      let insertBefore = null;
      for (const el of els) {
        if (el === dragItem) continue;
        const r = el.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { insertBefore = el; break; }
      }
      const fromName = dragItem.dataset.groupName;
      const fromIdx = groups.findIndex(g => g.group === fromName);
      const toName = insertBefore?.dataset.groupName;
      const toIdx = toName ? groups.findIndex(g => g.group === toName) : groups.length;
      if (fromIdx !== -1 && fromIdx !== toIdx) {
        const [g] = groups.splice(fromIdx, 1);
        groups.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, g);
        saveGroupOrder(groups.map(g => g.group));
        renderList(document.querySelector("#dist-tpl-search")?.value || "");
      }
    } else if (dragType === "item") {
      const els = [...list.querySelectorAll(`[data-group="${dragGroup}"][data-label]`)];
      let insertBefore = null;
      for (const el of els) {
        if (el === dragItem) continue;
        const r = el.getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { insertBefore = el; break; }
      }
      const grp = groups.find(g => g.group === dragGroup);
      if (grp) {
        const fromLabel = dragItem.dataset.label;
        const fromIdx = grp.items.findIndex(it => it.label === fromLabel);
        const toLabel = insertBefore?.dataset.label;
        const toIdx = toLabel ? grp.items.findIndex(it => it.label === toLabel) : grp.items.length;
        if (fromIdx !== -1 && fromIdx !== toIdx) {
          const [item] = grp.items.splice(fromIdx, 1);
          grp.items.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, item);
          const io = loadItemOrder();
          io[dragGroup] = grp.items.map(it => it.label);
          saveItemOrder(io);
          renderList(document.querySelector("#dist-tpl-search")?.value || "");
        }
      }
    }

    dragItem = null; dragType = null; dragGroup = null;
  });

  renderList("");
  box.appendChild(header);
  box.appendChild(list);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const searchInput = overlay.querySelector("#dist-tpl-search");
  searchInput.focus();
  searchInput.addEventListener("input", e => renderList(e.target.value));

  const sortToggle = overlay.querySelector("#dist-tpl-sort-toggle");
  sortToggle.onclick = () => {
    sortMode = !sortMode;
    sortToggle.style.background = sortMode ? "rgba(99,102,241,0.3)" : "rgba(51,65,85,0.4)";
    sortToggle.style.borderColor = sortMode ? "rgba(99,102,241,0.6)" : "rgba(51,65,85,0.5)";
    sortToggle.style.color = sortMode ? "#a5b4fc" : "";
    searchInput.disabled = sortMode;
    searchInput.style.opacity = sortMode ? "0.4" : "1";
    renderList(sortMode ? "" : searchInput.value);
  };

  // Кнопка добавить шаблон
  const addBtn = overlay.querySelector("#dist-tpl-add-btn");
  if (addBtn) addBtn.onclick = () => openAddTemplateForm(overlay, groups, itemOrder, saveItemOrder, renderList);

  overlay.querySelector("#dist-tpl-list-close").onclick = () => overlay.remove();
}

function createTemplateButton(id, text, title, onClick) {
  const btn = document.createElement("button");
  btn.type = "button"; btn.id = id; btn.textContent = text; btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.style.cssText = `height:32px;min-width:32px;border:1px solid rgba(99,102,241,0.15);outline:none;background:rgba(8,12,24,0.7);color:#e2e8f0;display:inline-flex;align-items:center;justify-content:center;border-radius:9px;cursor:pointer;font-size:15px;line-height:1;flex:0 0 auto;margin:0;padding:0 7px;transition:all .14s ease;backdrop-filter:blur(4px);`;
  btn.addEventListener("mouseenter", () => { btn.style.background="rgba(99,102,241,0.18)"; btn.style.borderColor="rgba(99,102,241,0.5)"; btn.style.boxShadow="0 0 10px rgba(99,102,241,0.2)"; btn.style.transform="translateY(-1px)"; });
  btn.addEventListener("mouseleave", () => { btn.style.background="rgba(8,12,24,0.7)"; btn.style.borderColor="rgba(99,102,241,0.15)"; btn.style.boxShadow="none"; btn.style.transform="scale(1)"; });
  btn.addEventListener("mousedown", () => { btn.style.transform="scale(0.9)"; });
  btn.addEventListener("mouseup", () => { btn.style.transform="translateY(-1px)"; });
  btn.addEventListener("click", onClick);
  return btn;
}

// Обновляет закреплённые кнопки в тулбаре без пересоздания всего тулбара
function refreshPinnedButtons() {
  const toolbar = document.querySelector("#dist-chat-template-bar");
  if (!toolbar) return;

  // Удаляем старые закреплённые кнопки
  toolbar.querySelectorAll(".dist-pinned-btn").forEach(b => b.remove());

  // Добавляем новые — между 📋 и ✏️
  const editBtn = toolbar.querySelector("#dist-chat-edit-btn");
  pinnedTemplates.forEach(key => {
    const item = getTemplateItem(key);
    if (!item) return;
    // Короткий label: первый эмодзи или первые 2 символа
    const emoji = item.label.match(/^\p{Emoji}/u)?.[0] || item.label.slice(0, 2);
    const btn = createTemplateButton(`dist-pinned-${key}`, emoji, item.label, async () => {
      await insertWithCodeCheck(getTemplate(item.key), item.type, item.key);
    });
    btn.classList.add("dist-pinned-btn");
    btn.style.borderColor = "rgba(99,102,241,0.3)";
    toolbar.insertBefore(btn, editBtn);
  });
}

function mountGreetingButton() {
  // Убираем тулбар с шаблонами на странице сделки, чтобы не мешал
  if (location.href.includes('/deal/')) {
    const existing = document.querySelector("#dist-chat-template-wrap");
    if (existing) existing.remove();
    return;
  }

  const textarea = getChatTextarea(); if (!textarea) return;
  
  // Ищем контейнер формы или обертку ввода
  const form = textarea.closest('form') || textarea.closest('div[class*="input"]') || textarea.parentElement; 
  if (!form) return;

  // Ищем место для вставки (рядом с кнопкой отправки, скрепкой или в конце строки)
  let actionsWrap = form.querySelector('button[type="submit"]')?.parentElement || 
                    form.querySelector('input[type="file"]')?.closest('[role="button"]')?.parentElement ||
                    form.querySelector('[class*="actions"]') ||
                    form.querySelector('[class*="footer"]');
  
  if (!actionsWrap) {
    // Если не нашли через селекторы, берем родителя textarea или саму форму
    const sendBtn = form.querySelector('button[type="submit"]') || form.querySelector('button svg')?.closest('button');
    actionsWrap = sendBtn ? sendBtn.parentElement : (form.tagName === 'FORM' ? form : textarea.parentElement);
  }

  if (!actionsWrap) return;

  let toolbarWrap = document.querySelector("#dist-chat-template-wrap");
  if (toolbarWrap && toolbarWrap.parentElement === actionsWrap) return;
  if (toolbarWrap) toolbarWrap.remove();

  toolbarWrap = document.createElement("div");
  toolbarWrap.id = "dist-chat-template-wrap";
  toolbarWrap.style.cssText = `display:inline-flex;flex-direction:column;align-items:stretch;gap:3px;margin-right:6px;`;

  const toolbar = document.createElement("div");
  toolbar.id = "dist-chat-template-bar";
  toolbar.style.cssText = `display:inline-flex;align-items:center;gap:3px;padding:4px 6px;border-radius:12px;background:rgba(8,12,24,0.82);border:1px solid rgba(99,102,241,0.18);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 2px 12px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.03) inset;`;

  toolbar.appendChild(createTemplateButton("dist-chat-list-btn", "📋", "Шаблоны", () => openTemplateList()));
  toolbar.appendChild(createTemplateButton("dist-chat-edit-btn", "✏️", "Редактировать шаблоны", () => openTemplateEditor()));
  


  const miniStatus = document.createElement("div");
  miniStatus.id = "dist-chat-mini-status";
  miniStatus.style.cssText = `min-height:13px;font-size:10px;font-weight:500;font-family:Inter,sans-serif;color:#a5b4fc;opacity:0;transition:opacity .18s ease;padding-left:6px;letter-spacing:.2px;user-select:none;pointer-events:none;`;

  toolbarWrap.appendChild(toolbar);
  toolbarWrap.appendChild(miniStatus);

  // Масштабирование тулбара
  let toolbarScale = parseFloat(localStorage.getItem('dist_toolbar_scale') || '1');
  toolbar.style.transform = 'scale(' + toolbarScale + ')';
  toolbar.style.transformOrigin = 'left center';
  toolbar.addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    toolbarScale = Math.max(0.6, Math.min(2.0, toolbarScale + (e.deltaY < 0 ? 0.1 : -0.1)));
    toolbar.style.transform = 'scale(' + toolbarScale + ')';
    try { localStorage.setItem('dist_toolbar_scale', toolbarScale); } catch(_) {}
  }, { passive: false });

  // Вставляем перед кнопкой отправки или просто в конец обертки
  const sendButton = actionsWrap.querySelector('button[type="submit"]') || actionsWrap.querySelector('button svg')?.closest('button');
  if (sendButton) actionsWrap.insertBefore(toolbarWrap, sendButton);
  else actionsWrap.appendChild(toolbarWrap);

  refreshPinnedButtons();
}

async function startGreetingFeature() {
  await Promise.all([refreshGreetingUi(), loadCustomTemplates()]);
  
  // Первая попытка монтажа
  for (let i = 0; i < 40; i++) {
    mountGreetingButton();
    if (document.querySelector("#dist-chat-list-btn")) break;
    await delay(300);
  }

  // Периодическая проверка (для SPA переходов между чатами)
  setInterval(() => {
    if (location.href.includes('/deal/')) {
      const existing = document.querySelector("#dist-chat-template-wrap");
      if (existing) existing.remove();
      autoInsertGreeting();
    } else if (location.href.includes('/chats/')) {
      mountGreetingButton();
      autoInsertGreeting();
    }
  }, 2000);

  startOptimizedObserver();
}

startGreetingFeature();
setTimeout(() => installUsedCodeClipboardGuards(), 0);