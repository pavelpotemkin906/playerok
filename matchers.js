// Извлекает текст сделки без никнеймов/юзернеймов продавцов
// Ищет внутри карточки ссылки на профили и исключает их текст
function getDealText(el) {
  const fullText = (el.innerText || '').toLowerCase();
  const excludeTexts = [];
  // Исключаем текст из ссылок на профили пользователей
  el.querySelectorAll(
    'a[href*="/profile/"], a[href*="/user/"], a[href*="/seller/"], ' +
    '[class*="username"], [class*="seller"], [class*="user-name"], ' +
    '[class*="nick"], [data-seller], [data-username], [data-user]'
  ).forEach(userEl => {
    const ut = (userEl.textContent || '').trim().toLowerCase();
    if (ut && ut.length > 1) excludeTexts.push(ut);
  });
  if (!excludeTexts.length) return fullText;
  let text = fullText;
  for (const ut of excludeTexts) {
    text = text.replaceAll(ut, ' ');
  }
  return text;
}

// 🔑 ОПТИМИЗАЦИЯ: Кэшируем RegExp объекты — не пересоздаём на каждый вызов
const _matchStarsCache = new Map();
const matchStars = (t, v) => {
  let re = _matchStarsCache.get(v);
  if (!re) {
    re = new RegExp(`(^|\\D)${v}\\s*(зв|звёзд|звезд)`, "i");
    _matchStarsCache.set(v, re);
  }
  return re.test(t);
};

const _matchUCCache = new Map();
const matchUC = (t, v) => {
  let re = _matchUCCache.get(v);
  if (!re) {
    re = new RegExp(`(^|\\D)${v}\\s*(uc|уc)`, "i");
    _matchUCCache.set(v, re);
  }
  return re.test(t);
};

const _matchRobloxPromoCache = new Map();
const matchRobloxPromo = (t, v) => {
  if (!t.includes("робуксов промокодом")) return false;
  let re = _matchRobloxPromoCache.get(v);
  if (!re) {
    re = new RegExp(`(^|\\D)${v}(\\D|$)`);
    _matchRobloxPromoCache.set(v, re);
  }
  return re.test(t);
};

// Roblox "по ссылке" — конкретный номинал
const _matchRobloxLinkCache = new Map();
const matchRobloxLink = (t, v) => {
  if (!t.includes("по ссылке")) return false;
  let re = _matchRobloxLinkCache.get(v);
  if (!re) {
    re = new RegExp(`(^|\\D)${v}(\\D|$)`);
    _matchRobloxLinkCache.set(v, re);
  }
  return re.test(t);
};

const _matchTgPremCache = new Map();
const matchTelegramPremiumMonth = (t, m) => {
  let re = _matchTgPremCache.get(m);
  if (!re) {
    re = new RegExp(`telegram\\s+премиум\\s+${m}\\s*(месяц|месяца|месяцев)`, "i");
    _matchTgPremCache.set(m, re);
  }
  return re.test(t);
};

const _matchRobloxPremiumRe = /\bроблокс\s+премиум\b/i;
const matchRobloxPremium = (t) => _matchRobloxPremiumRe.test(t);

// Проверяет наличие ключевых слов Arena в тексте
const matchArena = (t, v) => {
  if (v === "bonds") return t.includes("bonds");
  if (v === "breakout") return t.includes("breakout") || t.includes("arena breakout");
  if (v === "bp") return t.includes("боевой пропуск");
  return t.includes(v);
};

// 🔑 Кэшируем RegExp для GIFTARY/DESSLUHUB/DONATE/ARENA ключевых слов с \b
const _regexBoundaryCache = new Map();
function testKeywordWithBoundary(keyword, text) {
  if (!keyword.includes("\\b")) return text.includes(keyword);
  let re = _regexBoundaryCache.get(keyword);
  if (!re) {
    re = new RegExp(keyword, "i");
    _regexBoundaryCache.set(keyword, re);
  }
  return re.test(text);
}
