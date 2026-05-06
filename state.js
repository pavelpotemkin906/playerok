let activeCategories = new Set();
let activeCategory = null; // Keep for backward compatibility if needed, but we'll try to move to Set
let currentDeals = [];
let activeSimpleBtn = null;
let activeCategoryStreams = new Set();

let activeStarSubs = new Set();
let activeUCSubs = new Set();
let activeTelegramSubs = new Set();
let activePubgSubs = new Set();
let activeRobloxPromoSubs = new Set();
let activeRobloxSubs = new Set();
let activeArenaSubs = new Set();
let activeGiftCardSubs = new Set();
let activeGiftarySubs = new Set();
let activeDonateSubs = new Set();
let activeNeuralSubs = new Set();
let activeAccountSubs = new Set();
let activeDessluHubSubs = new Set();
let autoReloadEnabled = false;

let starContainer, ucContainer, telegramContainer, pubgContainer, robloxPromoContainer, robloxContainer, arenaContainer, giftCardContainer, giftaryContainer, donateContainer, neuralContainer, accountContainer, dessluhubContainer;

// Мотиватор сделок
let dealCount = 0;
let dealGoal = 10;

// 🔑 ОПТИМИЗАЦИЯ: Кэш для MutationObserver
let observerTimeout = null;
let lastDealCount = 0;

function getCategoryContainers() {
  return [
    starContainer,
    ucContainer,
    telegramContainer,
    pubgContainer,
    robloxPromoContainer,
    robloxContainer,
    arenaContainer,
    giftCardContainer,
    giftaryContainer,
    donateContainer,
    neuralContainer,
    accountContainer,
    dessluhubContainer
  ].filter(Boolean);
}

function clearCategoryButtonStyles() {
  document.querySelectorAll(".dist-btn").forEach(btn => {
    btn.classList.remove("active");
    btn.style.boxShadow = "";
    btn.style.border = "1px solid transparent";
  });
}

function resetAllSubs() {
  activeStarSubs.clear();
  activeUCSubs.clear();
  activeTelegramSubs.clear();
  activePubgSubs.clear();
  activeRobloxPromoSubs.clear();
  activeRobloxSubs.clear();
  activeArenaSubs.clear();
  activeGiftCardSubs.clear();
  activeGiftarySubs.clear();
  activeDonateSubs.clear();
  activeNeuralSubs.clear();
  activeAccountSubs.clear();
  activeDessluHubSubs.clear();
}

function deactivateAllCategories() {
  activeCategories.clear();
  activeCategory = null;
  resetAllSubs();
  clearCategoryButtonStyles();
  getCategoryContainers().forEach(container => {
    container.style.display = "none";
  });
  saveActiveState();
}

const STATE_KEY = "dist_active_filter_v3";

function saveActiveState() {
  const data = {
    activeCategories: [...activeCategories],
    activeCategory,
    activeStarSubs: [...activeStarSubs],
    activeUCSubs: [...activeUCSubs],
    activeTelegramSubs: [...activeTelegramSubs],
    activePubgSubs: [...activePubgSubs],
    activeRobloxPromoSubs: [...activeRobloxPromoSubs],
    activeRobloxSubs: [...activeRobloxSubs],
    activeArenaSubs: [...activeArenaSubs],
    activeGiftCardSubs: [...activeGiftCardSubs],
    activeGiftarySubs: [...activeGiftarySubs],
    activeDonateSubs: [...activeDonateSubs],
    activeNeuralSubs: [...activeNeuralSubs],
    activeAccountSubs: [...activeAccountSubs],
    activeDessluHubSubs: [...activeDessluHubSubs]
  };
  try { localStorage.setItem(STATE_KEY, JSON.stringify(data)); } catch(_) {}
}

function loadActiveState() {
  // Намеренно не восстанавливаем выбранную категорию и подкатегории между сессиями.
  // Пользователь должен выбирать категорию заново при каждом заходе.
}

function toggleSingleCategory(key, btn, container) {
  const isSameCategory = activeCategories.has(key);
  deactivateAllCategories();

  if (isSameCategory) {
    saveActiveState();
    return false;
  }

  activeCategories.add(key);
  activeCategory = key;

  if (btn) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES[key].color}`;
    btn.style.border = `1px solid ${CATEGORIES[key].color}`;
  }

  if (container) {
    container.style.display = "block";
  }

  // Автоматически ставим "all" для сложных категорий при первом включении
  if (key === "stars") activeStarSubs.add("all");
  if (key === "uc") activeUCSubs.add("all");
  if (key === "telegram") { activeTelegramSubs.add("all"); activeStarSubs.add("all"); }
  if (key === "pubg") activePubgSubs.add("all");
  if (key === "robloxpromo") activeRobloxPromoSubs.add("all");
  if (key === "roblox") activeRobloxSubs.add("all");
  if (key === "arena") activeArenaSubs.add("all");
  if (key === "giftcard") activeGiftCardSubs.add("all");
  if (key === "giftary") activeGiftarySubs.add("all");
  if (key === "donate") activeDonateSubs.add("all");
  if (key === "neural") activeNeuralSubs.add("all");
  if (key === "account") activeAccountSubs.add("all");
  if (key === "dessluhub") activeDessluHubSubs.add("all");

  saveActiveState();
  return true;
}
