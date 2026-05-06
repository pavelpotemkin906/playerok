// ── Держим service worker живым ──
chrome.runtime.onInstalled.addListener(() => { ensurePortConnected().catch(() => {}); });
chrome.runtime.onStartup.addListener(() => { ensurePortConnected().catch(() => {}); });

// ── Offscreen для копирования в буфер ──
let offscreenPort = null;
const CSV_RETRY_DELAYS_MS = [50, 150, 300, 500];

async function ensureOffscreenCreated() {
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Copy to clipboard from background'
    });
  } catch (e) {
    // уже существует
  }
  await new Promise(resolve => setTimeout(resolve, 300));
}

async function ensurePortConnected() {
  if (offscreenPort) return;
  await ensureOffscreenCreated();
  try {
    offscreenPort = chrome.runtime.connect({ name: 'offscreen-port' });
    offscreenPort.onDisconnect.addListener(() => { offscreenPort = null; });
  } catch (e) {}
}

async function copyToSystemClipboard(text) {
  try {
    await ensurePortConnected();
    if (offscreenPort) {
      offscreenPort.postMessage({ type: 'COPY_TO_CLIPBOARD', text });
    }
  } catch (error) {}
}

// ── CSV парсер ──
function cleanCode(value) {
  return String(value || '').replace(/"/g,'').replace(/'/g,'').replace(/\r/g,'').replace(/\n/g,'').trim();
}

function isValidCode(code) {
  if (!code || code.length < 3) return false;
  if (!/^[A-Z0-9\-]+$/i.test(code)) return false;
  if (code.startsWith('-') || code.endsWith('-')) return false;
  if (code.includes('--')) return false;
  const hasLetter = /[A-Z]/i.test(code);
  const digitCount = (code.match(/\d/g) || []).length;
  if (!hasLetter && digitCount < 3) return false;
  return true;
}

function extractCodesFromCsv(csvContent) {
  // Разделяем по любым вариантам переноса строки
  const lines = csvContent.split(/\r\n|\r|\n/);
  const uniqueCodes = new Set();

  // 1. Сначала ищем ссылки Discord Gift
  for (const line of lines) {
    const discordMatch = line.match(/https:\/\/discord\.gift\/[A-Za-z0-9_-]+/g);
    if (discordMatch) discordMatch.forEach(url => uniqueCodes.add(cleanCode(url)));
  }

  // 2. Пытаемся определить, есть ли заголовок
  const keywordFields = ['PIN', 'CODE', 'PROMO', 'KEY', 'SERIAL', 'PASSWORD'];
  const headerLine = lines[0] ? lines[0].toUpperCase() : "";
  const hasHeader = keywordFields.some(k => headerLine.includes(k));
  
  // Если заголовок есть, начинаем со второй строки, если нет — с первой
  const startIdx = hasHeader ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Формат: Pin,SerialNumber (извлекаем PIN=...)
    const pinMatch = line.match(/PIN=([A-Za-z0-9\-_]+)/i);
    if (pinMatch && pinMatch[1]) {
      const code = cleanCode(pinMatch[1]);
      if (code && isValidCode(code)) uniqueCodes.add(code);
    }

    // Разбиваем по запятой, табуляции или точке с запятой
    const fields = line.split(/[,\t;]/);
    for (const field of fields) {
      const code = cleanCode(field);
      if (code && isValidCode(code)) {
        uniqueCodes.add(code);
        break; // Берем только ПЕРВЫЙ найденный код в строке
      }
    }
  }

  // 3. Если ничего не нашли через колонки, пробуем regex по всей строке
  if (uniqueCodes.size === 0) {
    for (const line of lines) {
      const matches = line.match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+|[A-Za-z0-9]{8,}/g) || [];
      for (const match of matches) {
        const code = cleanCode(match);
        if (code && isValidCode(code)) uniqueCodes.add(code);
      }
    }
  }

  const result = [...uniqueCodes].filter(Boolean);
  if (result.length > 0) {
    console.log('✅ Коды извлечены из CSV:', result);
  } else {
    console.log('⚠️ Коды не найдены в CSV content');
  }
  return result;
}

function extractCodeFromCSV(csvContent) {
  const codes = extractCodesFromCsv(csvContent);
  return codes.length > 0 ? codes.join('\n') : null;
}

async function processCSVFile(filePath) {
  try {
    const response = await fetch('file://' + filePath);
    if (!response.ok) return false;
    const csvContent = await response.text();
    const codes = extractCodesFromCsv(csvContent);
    if (codes.length > 0) {
      const lastCode = codes[codes.length - 1];
      const lastCodes = codes; // Копируем ВСЕ коды
      const clipboardText = lastCodes.join('\n');
      chrome.storage.local.set({
        lastCode,
        lastCodes,
        lastCodeTime: new Date().toISOString()
      });
      await copyToSystemClipboard(clipboardText);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function processCSVFileWithRetry(filePath) {
  for (let i = 0; i < CSV_RETRY_DELAYS_MS.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, CSV_RETRY_DELAYS_MS[i]));
    if (await processCSVFile(filePath)) return;
  }
}

const TAB_GROUPS_STORAGE_KEY = "dist_tab_groups_v1";
const VALID_TAB_GROUP_COLORS = new Set(["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"]);

async function loadTabGroupMap() {
  const data = await chrome.storage.local.get(TAB_GROUPS_STORAGE_KEY);
  const map = data?.[TAB_GROUPS_STORAGE_KEY];
  return map && typeof map === "object" ? map : {};
}

async function saveTabGroupMap(map) {
  await chrome.storage.local.set({ [TAB_GROUPS_STORAGE_KEY]: map });
}

function normalizeTabGroupColor(color) {
  return VALID_TAB_GROUP_COLORS.has(color) ? color : "grey";
}

async function resolveExistingGroupId(groupKey, groupTitle, windowId) {
  const groupMap = await loadTabGroupMap();
  const groups = await chrome.tabGroups.query(typeof windowId === "number" ? { windowId } : {});
  const storedGroupId = groupMap[groupKey];

  if (Number.isInteger(storedGroupId) && groups.some(group => group.id === storedGroupId)) {
    return storedGroupId;
  }

  const titleMatch = groups.find(group => group.title === groupTitle);
  if (titleMatch) {
    groupMap[groupKey] = titleMatch.id;
    await saveTabGroupMap(groupMap);
    return titleMatch.id;
  }

  if (groupKey in groupMap) {
    delete groupMap[groupKey];
    await saveTabGroupMap(groupMap);
  }

  return null;
}

async function rememberGroupId(groupKey, groupId) {
  const groupMap = await loadTabGroupMap();
  groupMap[groupKey] = groupId;
  await saveTabGroupMap(groupMap);
}

async function openTabsWithOptionalGroup(validUrls, options = {}) {
  const { groupKey, groupTitle, groupColor, windowId } = options;
  const createdTabIds = [];

  for (let i = 0; i < validUrls.length; i++) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 150));
    const createOptions = { url: validUrls[i], active: false };
    if (Number.isInteger(windowId)) createOptions.windowId = windowId;
    const tab = await chrome.tabs.create(createOptions);
    if (Number.isInteger(tab?.id)) createdTabIds.push(tab.id);
  }

  if (!groupKey || !groupTitle || !createdTabIds.length) {
    return { count: createdTabIds.length, groupId: null };
  }

  const existingGroupId = await resolveExistingGroupId(groupKey, groupTitle, windowId);
  const groupId = Number.isInteger(existingGroupId)
    ? await chrome.tabs.group({ groupId: existingGroupId, tabIds: createdTabIds })
    : await chrome.tabs.group({ tabIds: createdTabIds });

  await chrome.tabGroups.update(groupId, {
    title: groupTitle,
    color: normalizeTabGroupColor(groupColor)
  });
  await rememberGroupId(groupKey, groupId);

  return { count: createdTabIds.length, groupId };
}

// ── Слушатель загрузок CSV ──
chrome.downloads.onChanged.addListener(downloadDelta => {
  if (downloadDelta.state && downloadDelta.state.current === 'complete') {
    chrome.downloads.search({ id: downloadDelta.id }, async downloads => {
      if (downloads.length > 0) {
        const filename = downloads[0].filename.toLowerCase();
        if (filename.endsWith('.csv')) {
          processCSVFileWithRetry(downloads[0].filename);
        }
      }
    });
  }
});

// ── Обработчик сообщений ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_TABS") {
    const urls = Array.isArray(msg.urls) ? msg.urls : [];
    const validUrls = [...new Set(
      urls.filter(u => u && typeof u === "string")
          .map(u => {
            if (u.startsWith("http")) return u;
            if (u.startsWith("/")) return "https://playerok.com" + u;
            return null;
          })
          .filter(Boolean)
    )];

    (async () => {
      const result = await openTabsWithOptionalGroup(validUrls, {
        groupKey: typeof msg.groupKey === "string" ? msg.groupKey : null,
        groupTitle: typeof msg.groupTitle === "string" ? msg.groupTitle : null,
        groupColor: typeof msg.groupColor === "string" ? msg.groupColor : null,
        windowId: sender?.tab?.windowId
      });
      sendResponse({ success: true, count: result.count, groupId: result.groupId });
    })().catch(error => {
      sendResponse({ success: false, error: String(error) });
    });

    return true;
  }

  if (msg.type === "PARSE_CSV") {
    const codes = extractCodesFromCsv(msg.content || "");
    sendResponse({ codes });
    return true;
  }

  if (msg.type === "COPY_TO_CLIPBOARD") {
    copyToSystemClipboard(msg.text);
    sendResponse({ success: true });
    return true;
  }
});
