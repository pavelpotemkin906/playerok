const SALES_URL_REGEX = /^https:\/\/playerok\.com\/profile\/[^/]+\/sales/;

const STAR_VALUES = [
  50, 75, 100, 150, 250, 350, 500, 750,
  1000, 1500, 2500, 2900,
  5000, 10000, 25000, 35000, 50000
];

const UC_VALUES = [
  60, 325, 660, 1800, 3850, 8100,
  16200, 24300, 32400, 40500, "elite"
];

const TG_PREMIUM_VALUES = [3, 6, 12];

const ROBLOX_PROMO_VALUES = [800, 1600, 2000, 4500, 10000];
const ROBLOX_PROMO_BRL = [340, 550];
const GIFTARY_VALUES = [
  { value: "likee",           label: "Likee" },
  { value: "watcher",         label: "Watcher of Realms" },
  { value: "stumble",         label: "Stumble Guys" },
  { value: "identityv",       label: "Identity V" },
  { value: "honorofkings",    label: "Honor of Kings" },
  { value: "doomsday",        label: "Doomsday: Last Survivors" },
  { value: "wuthering",       label: "Wuthering Waves" },
  { value: "destiny",         label: "Destiny: Rising" },
  { value: "deltaforce",      label: "Delta Force" },
  { value: "rainbowsix",      label: "Rainbow Six" }
];

const DESSLUHUB_VALUES = [
  { value: "callofduty",   label: "Call of Duty" }
];

const GIFTARY_KEYWORDS = {
  likee:        ["likee"],
  watcher:      ["w-gold", "wgold"],
  stumble:      ["stumble guys"],
  identityv:    ["echoes", "inspirations", "package"],
  honorofkings: ["жетонов"],
  doomsday:     ["doomsday"],
  wuthering:    ["луниты", "лунитов", "lunite subscription", "lunite"],
  destiny:      ["destiny: rising", "destiny rising"],
  deltaforce:   ["delta coins"],
  rainbowsix:   ["rainbow six", "r6", "platinum r6", "platinum rainbow", "platinum"]
};

const DESSLUHUB_KEYWORDS = {
  callofduty:    ["\\bcp\\b", "\\bin\\b", "\\bkz\\b", "call of duty", "cod"]
};

const DONATE_VALUES = [
  { value: "freefiremax",  label: "Free Fire" },
  { value: "genshin",      label: "Genshin Impact" },
  { value: "honkaisr",     label: "Honkai: Star Rail" },
  { value: "zzzero",       label: "Zenless Zone Zero" },
  { value: "marvelrivals", label: "Marvel Rivals" },
  { value: "standoff2",    label: "Standoff 2" },
  { value: "callofduty",   label: "Call of Duty" }
];

const DONATE_KEYWORDS = {
  freefiremax:   ["free fire", "freefire", "фри фаер", "алмаз"],
  genshin:       ["genshin", "геншин", "genesis crystal", "primogem", "примогем", "благословение луны", "blessing of the welkin", "гранул", "granul"],
  honkaisr:      ["honkai: star rail", "honkai star rail", "stellar jade", "хонкай", "supply pass", "древних снов", "ancient dreams"],
  zzzero:        ["zenless zone zero", "zzz", "polychrome", "поликром", "монохром", "monochrome", "inter-knot membership", "inter knot membership", "интер-кнот", "интер кнот"],
  marvelrivals:  ["marvel rivals", "марвел", "marvel", "rivals", "lattice"],
  standoff2:     ["standoff 2", "standoff2", "стандофф", "fable", "тикет", "голда", "голды", "голд", "gold standoff", "standoff", "уровень standoff", "gold pass", "пропуск standoff", "уровень по айди", "+1 уровень по айди", "+10 уровней по айди", "gold pass по айди", "gold pass +10 уровней по айди", "+25 уровней по айди", "+75 уровней по айди"],
  callofduty:    ["call of duty", "cod", "колда", " cp ", "cp по", "warzone", "modern warfare", "black ops", "кодпоинт", "cod points"]
};

// Все ключевые слова Giftary и DessluHub — для исключения из доната
const GIFTARY_ALL_KEYWORDS = Object.values(GIFTARY_KEYWORDS).flat();
const DESSLUHUB_ALL_KEYWORDS = Object.values(DESSLUHUB_KEYWORDS).flat();

const GIFTCARD_VALUES = [
  "appstore",
  "playstation",
  "xbox",
  "nintendo",
  "razergold",
  "battlenet",
  "discordnitro",
  "spotify",
  "ea",
  "riot"
];
const GIFTCARD_LABELS = {
  appstore: "App Store (iTunes)",
  playstation: "PlayStation (PS)",
  xbox: "XBOX",
  nintendo: "Nintendo",
  razergold: "Razer Gold",
  battlenet: "Battle.net",
  discordnitro: "Discord Nitro",
  spotify: "Spotify Premium",
  ea: "EA Gift Card",
  riot: "Riot Cash Card"
};
const GIFTCARD_KEYWORDS = {
  appstore: ["app store", "itunes", "itune", "айтьюнс", "эппл"],
  playstation: ["playstation", "psn", "ps ", "ps)"],
  xbox: ["xbox", "иксбокс"],
  nintendo: ["nintendo"],
  razergold: ["razer gold", "razer"],
  battlenet: ["battle.net", "battle net", "battlenet"],
  discordnitro: ["discord nitro", "nitro"],
  spotify: ["spotify premium", "spotify"],
  ea: ["ea gift card", "ea gift", "electronic arts", "ea play"],
  riot: ["riot cash card", "riot points", "rp card"]
};

const NEURAL_VALUES = [
  { value: "chatgpt",    label: "ChatGPT" },
  { value: "midjourney", label: "Midjourney" },
  { value: "grok",       label: "Grok" },
  { value: "gemini",     label: "Gemini" },
  { value: "figma",      label: "Figma" },
  { value: "zoom",       label: "Zoom" }
];

const NEURAL_KEYWORDS = {
  chatgpt:    ["чатгпт", "chatgpt", "chat gpt", "чат гпт", "gpt-4", "gpt4", "openai", "опенаи"],
  midjourney: ["midjourney", "midjorney"],
  grok:       ["grok"],
  gemini:     ["gemini"],
  figma:      ["figma", "figms"],
  zoom:       ["zoom"]
};

const ACCOUNT_VALUES = [
  { value: "brawlstars", label: "Brawl Stars" }
];

const ACCOUNT_KEYWORDS = {
  brawlstars: ["brawl stars", "brawlstars", "брол старс", "со входом в аккаунт", "с входом в аккаунт", "вход в аккаунт"]
};

const CATEGORIES = {
  stars: { title: "Telegram Звёзды", emoji: "⭐", color: "#ffd700" },
  uc: { title: "PUBG Mobile UC", emoji: "🎮", color: "#00ffd5" },
  telegram: { title: "Telegram", emoji: "📞", color: "#229ed9" },
  robloxpromo: { title: "Roblox Промокод", emoji: "🎟", color: "#22c55e" },

  roblox: {
    title: "Roblox",
    emoji: "🎮",
    color: "#22c55e"
  },

  giftary: {
    title: "Giftary по ID",
    emoji: "🎁",
    color: "#8b5cf6",
    match: t => {
      return Object.values(GIFTARY_KEYWORDS).some(kws => kws.some(k => {
        if (k.includes("\\b")) return new RegExp(k, "i").test(t);
        return t.includes(k);
      }));
    }
  },

  dessluhub: {
    title: "DessluHub",
    emoji: "🔥",
    color: "#f97316",
    match: t => {
      return Object.values(DESSLUHUB_KEYWORDS).some(kws => kws.some(k => {
        if (k.includes("\\b")) return new RegExp(k, "i").test(t);
        return t.includes(k);
      }));
    }
  },

  mobilelegends: {
    title: "Mobile Legends",
    emoji: "⚔️",
    color: "#ff4444",
    keywords: ["mlbb", "алмазы", "алмазный пропуск"]
  },

  gamepass: {
    title: "Roblox Геймпас",
    emoji: "📦",
    color: "#ff9f0a",
    keywords: ["геймпас", "game pass"]
  },

  promo: {
    title: "Промокоды",
    emoji: "🏷️",
    color: "#a855f7",
    keywords: ["промокод"],
    exclude: ["робуксов промокодом", "roblox", "роблокс"]
  },

  keys: {
    title: "Ключи",
    emoji: "🔑",
    color: "#facc15",
    keywords: ["ключ"]
  },

  pubg: {
    title: "PUBG Mobile",
    emoji: "🎮",
    color: "#f59e0b"
  },

  donate: {
    title: "Донат по Айди",
    emoji: "💎",
    color: "#38bdf8",
    match: t => {
      if (GIFTARY_ALL_KEYWORDS.some(k => t.includes(k))) return false;
      if (DESSLUHUB_ALL_KEYWORDS.some(k => {
          if (k.includes("\\b")) return new RegExp(k, "i").test(t);
          return t.includes(k);
      })) return false;
      if (t.includes("mlbb") || t.includes("алмазный пропуск") || t.includes("алмазы")) return false;
      if (/(^|\s)(uc|уc)(\s|$)/i.test(t)) return false;
      if (t.includes("elite pass") || t.includes("элит пасс") || t.includes("elite")) return false;
      if (t.includes("bonds") || t.includes("arena") || t.includes("breakout") || t.includes("боевой пропуск")) return false;
      if (t.includes("g-coin") || t.includes("gcoin") || t.includes("pubg")) return false;
      if (t.includes("elite pass") || t.includes("элит пасс")) return false;
      return t.includes("по айди") || / id(\s|$|[^a-z])/i.test(t);
    }
  },

  giftcard: {
    title: "Подарочная карта",
    emoji: "💳",
    color: "#f97316",
    keywords: ["подарочн", "gift card", "giftcard", "spotify"]
  },

  neural: {
    title: "Нейросети",
    emoji: "🧠",
    color: "#6366f1"
  },

  arena: {
    title: "Arena mob/pc",
    emoji: "⚡",
    color: "#14b8a6",
    keywords: ["bonds", "arena breakout", "breakout", "боевой пропуск"]
  },

  figma: {
    title: "Figma",
    emoji: "🎨",
    color: "#a855f7",
    keywords: ["figma", "figms"]
  },

  zoom: {
    title: "Zoom",
    emoji: "📹",
    color: "#0ea5e9",
    keywords: ["zoom"]
  },

  notion: {
    title: "Notion",
    emoji: "📝",
    color: "#e5e7eb",
    keywords: ["notion"]
  },

  chesscom: {
    title: "Chess.com",
    emoji: "♟️",
    color: "#22c55e",
    keywords: ["chess.com", "chess com", "шахмат"]
  },

  steamgift: {
    title: "Steam Подарки",
    emoji: "🎁",
    color: "#ef4444",
    keywords: ["подарок steam"]
  },

  account: {
    title: "Вход в аккаунт",
    emoji: "🔐",
    color: "#f43f5e"
  },

  chatgpt: {
    title: "ЧатГПТ",
    emoji: "🤖",
    color: "#10b981",
    keywords: ["чатгпт", "chatgpt", "chat gpt", "чат гпт", "gpt-4", "gpt4", "openai", "опенаи", "chatgpt plus", "chatgpt pro", "чатгпт плюс", "чатгпт про"]
  }
};