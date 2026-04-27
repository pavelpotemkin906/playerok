let activeCategories = new Set();
let activeCategory = null; // Keep for backward compatibility if needed, but we'll try to move to Set
let currentDeals = [];
let activeSimpleBtn = null;

let activeStarSubs = new Set();
let activeUCSubs = new Set();
let activeTelegramSubs = new Set();
let activeRobloxPromoSubs = new Set();
let activeRobloxSubs = new Set();
let activeGiftCardSubs = new Set();
let activeGiftarySubs = new Set();
let activeDonateSubs = new Set();
let activeNeuralSubs = new Set();
let activeAccountSubs = new Set();
let activeDessluHubSubs = new Set();

let starContainer, ucContainer, telegramContainer, robloxPromoContainer, robloxContainer, giftCardContainer, giftaryContainer, donateContainer, neuralContainer, accountContainer, dessluhubContainer;

// Мотиватор сделок
let dealCount = 0;
let dealGoal = 10;

// 🔑 ОПТИМИЗАЦИЯ: Кэш для MutationObserver
let observerTimeout = null;
let lastDealCount = 0;