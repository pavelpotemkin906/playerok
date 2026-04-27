// =========================
// FILTERS (все здесь)
// =========================

function applyUCFilter() {
  const res = [];
  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();
    if (activeUCSubs.has("all")) {
      if (t.includes("uc") || t.includes("elite pass") || t.includes("элит пасс")) return res.push(c);
      return;
    }
    for (const v of activeUCSubs) {
      if (v === "elite") {
        if (t.includes("elite pass") || t.includes("элит пасс") || t.includes("elite")) return res.push(c);
      } else {
        if (!t.includes("uc")) return;
        if (matchUC(t, v)) return res.push(c);
      }
    }
  });
  return res;
}

function applyRobloxPromoFilter() {
  const res = [];
  const hasPremium = activeRobloxPromoSubs.has("premium");

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();

    // 🟣 PREMIUM — приоритетный режим
    if (hasPremium) {
      if (t.includes("роблокс премиум")) {
        res.push(c);
      }
      return;
    }

    // 🎟 обычные промокоды
    if (!t.includes("робуксов промокодом")) return;

    // "all" работает ТОЛЬКО если premium НЕ выбран
    if (activeRobloxPromoSubs.has("all")) {
      res.push(c);
      return;
    }

    for (const v of activeRobloxPromoSubs) {
      if (v === "premium" || v === "all") continue;
      if (matchRobloxPromo(t, v)) {
        res.push(c);
        return;
      }
    }
  });

  return res;
}



function isGiftCardDealText(t) {
  return (
    t.includes("подарочн") ||
    t.includes("gift card") ||
    t.includes("giftcard")
  );
}

function applyGiftCardFilter() {
  const res = [];

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();

    if (activeGiftCardSubs.has("all")) {
      if (isGiftCardDealText(t)) {
        res.push(c);
        return;
      }

      for (const type of GIFTCARD_VALUES) {
        const keywords = GIFTCARD_KEYWORDS[type];
        if (keywords && keywords.some(k => t.includes(k))) {
          res.push(c);
          return;
        }
      }
      return;
    }

    for (const selectedType of activeGiftCardSubs) {
      const keywords = GIFTCARD_KEYWORDS[selectedType];
      if (keywords && keywords.some(k => t.includes(k))) {
        res.push(c);
        return;
      }
    }
  });

  return res;
}

// =========================
// CATEGORY BUILDERS
// =========================

function addTelegram(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.telegram.emoji} ${CATEGORIES.telegram.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  // --- Звёзды ---
  const starsLabel = document.createElement("div");
  starsLabel.className = "sub-label";
  starsLabel.textContent = "⭐ Звёзды";

  const starsAllBtn = document.createElement("div");
  starsAllBtn.className = "sub-all";
  starsAllBtn.textContent = "Все звёзды";

  const starsGrid = document.createElement("div");
  starsGrid.className = "sub-grid";

  starsAllBtn.onclick = () => {
    if (!activeCategories.has("telegram")) return;
    activeTelegramSubs.clear();
    activeStarSubs.clear();
    activeStarSubs.add("all");
    highlightAllButton(starsAllBtn, container);
    updateMergedDeals();
  };

  STAR_VALUES.forEach(v => {
    const b = document.createElement("div");
    b.className = "sub-btn";
    b.style.position = "relative";
    b.innerHTML = `<span>${v} ⭐</span>`;
    
    const favId = `fav_telegram_star_${String(v)}`;
    const star = document.createElement("span");
    star.style.cssText = "position:absolute;top:2px;right:2px;font-size:9px;cursor:pointer;opacity:0;transition:.15s;line-height:1";
    star.textContent = "⭐";
    star.title = "Добавить в избранное";
    star.onclick = e => {
      e.stopPropagation();
      const id = `fav_telegram_star_${String(v)}`;
      const label = `${v} ⭐`;
      if (isFavSub(id)) {
        favSubs = favSubs.filter(f => f.id !== id);
      } else {
        favSubs.unshift({ id, label, category: "telegram", value: v, subcategory: "star" });
      }
      saveFavSubs();
      renderFavSubsBlock();
      star.style.opacity = isFavSub(id) ? "1" : "0";
    };
    b.appendChild(star);

    b.onclick = () => {
      if (!activeCategories.has("telegram")) return;
      activeTelegramSubs.clear();
      activeStarSubs.delete("all");
      if (activeStarSubs.has(v)) {
        activeStarSubs.delete(v);
        b.classList.remove("active");
      } else {
        activeStarSubs.add(v);
        b.classList.add("active");
      }
      container.querySelectorAll(".sub-all").forEach(a => a.classList.remove("active"));
      updateMergedDeals();
    };
    
    b.addEventListener("mouseenter", () => { star.style.opacity = "1"; });
    b.addEventListener("mouseleave", () => { star.style.opacity = isFavSub(favId) ? "1" : "0"; });
    setTimeout(() => { if (isFavSub(favId)) star.style.opacity = "1"; }, 0);
    
    starsGrid.appendChild(b);
  });

  // --- Premium ---
  const premLabel = document.createElement("div");
  premLabel.className = "sub-label";
  premLabel.textContent = "🟣 Premium";

  const premAllBtn = document.createElement("div");
  premAllBtn.className = "sub-all";
  premAllBtn.textContent = "Все подписки";

  const premGrid = document.createElement("div");
  premGrid.className = "sub-grid";

  premAllBtn.onclick = () => {
    if (!activeCategories.has("telegram")) return;
    activeStarSubs.clear();
    activeTelegramSubs.clear();
    activeTelegramSubs.add("all");
    highlightAllButton(premAllBtn, container);
    updateMergedDeals();
  };

  TG_PREMIUM_VALUES.forEach(v => {
    const b = document.createElement("div");
    b.className = "sub-btn";
    b.style.position = "relative";
    b.innerHTML = `<span>${v} мес</span>`;
    
    const favId = `fav_telegram_prem_${String(v)}`;
    const star = document.createElement("span");
    star.style.cssText = "position:absolute;top:2px;right:2px;font-size:9px;cursor:pointer;opacity:0;transition:.15s;line-height:1";
    star.textContent = "⭐";
    star.title = "Добавить в избранное";
    star.onclick = e => {
      e.stopPropagation();
      const id = `fav_telegram_prem_${String(v)}`;
      const label = `${v} мес`;
      if (isFavSub(id)) {
        favSubs = favSubs.filter(f => f.id !== id);
      } else {
        favSubs.unshift({ id, label, category: "telegram", value: v, subcategory: "premium" });
      }
      saveFavSubs();
      renderFavSubsBlock();
      star.style.opacity = isFavSub(id) ? "1" : "0";
    };
    b.appendChild(star);

    b.onclick = () => {
      if (!activeCategories.has("telegram")) return;
      activeStarSubs.clear();
      activeTelegramSubs.delete("all");
      if (activeTelegramSubs.has(v)) {
        activeTelegramSubs.delete(v);
        b.classList.remove("active");
      } else {
        activeTelegramSubs.add(v);
        b.classList.add("active");
      }
      container.querySelectorAll(".sub-all").forEach(a => a.classList.remove("active"));
      updateMergedDeals();
    };
    
    b.addEventListener("mouseenter", () => { star.style.opacity = "1"; });
    b.addEventListener("mouseleave", () => { star.style.opacity = isFavSub(favId) ? "1" : "0"; });
    setTimeout(() => { if (isFavSub(favId)) star.style.opacity = "1"; }, 0);
    
    premGrid.appendChild(b);
  });

  // Row with both "all" buttons side by side
  const allRow = document.createElement("div");
  allRow.style.cssText = "display:flex;gap:7px;margin:8px 0";
  starsAllBtn.style.flex = "1";
  premAllBtn.style.flex = "1";
  allRow.appendChild(starsAllBtn);
  allRow.appendChild(premAllBtn);

  container.appendChild(starsLabel);
  container.appendChild(allRow);
  container.appendChild(starsGrid);
  container.appendChild(premLabel);
  container.appendChild(premGrid);

  btn.onclick = () => {
    if (activeCategories.has("telegram")) {
      activeCategories.delete("telegram");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("telegram");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.telegram.color}`;
      btn.style.border = `1px solid ${CATEGORIES.telegram.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  telegramContainer = container;
  starContainer = container;
}

function applyTelegramUnifiedFilter() {
  const res = [];
  const isStarMode = activeStarSubs.size > 0;
  const isPremMode = activeTelegramSubs.size > 0;

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();
    if (isStarMode) {
      if (!t.includes("зв")) return;
      if (activeStarSubs.has("all")) { res.push(c); return; }
      for (const v of activeStarSubs) {
        if (matchStars(t, v)) { res.push(c); return; }
      }
      return;
    }
    if (isPremMode) {
      if (!t.includes("telegram") || !t.includes("премиум")) return;
      if (activeTelegramSubs.has("all")) { res.push(c); return; }
      for (const m of activeTelegramSubs) {
        if (matchTelegramPremiumMonth(t, m)) { res.push(c); return; }
      }
    }
  });
  return res;
}


function addUC(parent) {
  buildComplexCategory(
    parent,
    "uc",
    "Все номиналы",
    UC_VALUES,
    activeUCSubs,
    applyUCFilter,
    v => v === "elite" ? "Elite Pass" : `${v} UC`
  );
}

const PUBG_VALUES = ["elite", "rp", "weapon"];
const PUBG_LABELS = {
  elite: "Elite Pass",
  rp: "RP",
  weapon: "Weapon"
};

function applyPubgFilter() {
  const res = [];
  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();
    if (!t.includes("pubg") && !t.includes("пабг") && !t.includes("pubg mobile")) return;
    if (activePubgSubs.has("all")) { res.push(c); return; }
    for (const v of activePubgSubs) {
      if (v === "all") continue;
      if (v === "elite" && (t.includes("elite pass") || t.includes("элит пасс") || t.includes("элитпасс"))) { res.push(c); return; }
      if (v === "rp" && t.includes("rp")) { res.push(c); return; }
      if (v === "weapon" && (t.includes("weapon") || t.includes("оружие"))) { res.push(c); return; }
    }
  });
  return res;
}

function addPubg(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.pubg.emoji} ${CATEGORIES.pubg.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  allBtn.textContent = "Все";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("pubg")) return;
    if (activePubgSubs.has("all")) {
      resetVisualSelection(container, activePubgSubs);
      return;
    }
    activePubgSubs.clear();
    activePubgSubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  PUBG_VALUES.forEach(v =>
    addGridBtn(grid, activePubgSubs, PUBG_LABELS[v], v, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (activeCategories.has("pubg")) {
      activeCategories.delete("pubg");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("pubg");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.pubg.color}`;
      btn.style.border = `1px solid ${CATEGORIES.pubg.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  pubgContainer = container;
}

function addRobloxPromo(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.robloxpromo.emoji} ${CATEGORIES.robloxpromo.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  allBtn.textContent = "Все номиналы";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  const brlLabel = document.createElement("div");
  brlLabel.className = "sub-label";
  brlLabel.textContent = "BRL";

  const brlGrid = document.createElement("div");
  brlGrid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("robloxpromo")) return;
    if (activeRobloxPromoSubs.has("all")) {
      resetVisualSelection(container, activeRobloxPromoSubs);
      return;
    }
    activeRobloxPromoSubs.clear();
    activeRobloxPromoSubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  [800, 1600, 2000, 4500, 10000, "premium"].forEach(v =>
    addGridBtn(
      grid,
      activeRobloxPromoSubs,
      v === "premium" ? "Премиум" : `${v}`,
      v,
      () => updateMergedDeals(),
      container
    )
  );




  ROBLOX_PROMO_BRL.forEach(v =>
    addGridBtn(brlGrid, activeRobloxPromoSubs, `${v}`, v, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);
  container.appendChild(brlLabel);
  container.appendChild(brlGrid);

  btn.onclick = () => {
    if (activeCategories.has("robloxpromo")) {
      activeCategories.delete("robloxpromo");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("robloxpromo");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.robloxpromo.color}`;
      btn.style.border = `1px solid ${CATEGORIES.robloxpromo.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  robloxPromoContainer = container;
}

function applyRobloxFilter() {
  const res = [];
  const isGamepass = activeRobloxSubs.has("gamepass");
  const hasPremium = activeRobloxSubs.has("premium");

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();
    if (isGamepass) {
      if (t.includes("геймпас") || t.includes("game pass")) res.push(c);
      return;
    }
    if (hasPremium) {
      if (t.includes("роблокс премиум")) res.push(c);
      return;
    }
    if (!t.includes("робуксов промокодом") && !t.includes("роблокс премиум")) return;
    if (activeRobloxSubs.has("all")) { res.push(c); return; }
    for (const v of activeRobloxSubs) {
      if (v === "all" || v === "gamepass" || v === "premium") continue;
      if (matchRobloxPromo(t, v)) { res.push(c); return; }
    }
  });
  return res;
}

function addRoblox(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.roblox.emoji} ${CATEGORIES.roblox.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  // --- Промокоды ---
  const promoLabel = document.createElement("div");
  promoLabel.className = "sub-label";
  promoLabel.textContent = "🎟 Промокоды";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  allBtn.textContent = "Все номиналы";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  const brlLabel = document.createElement("div");
  brlLabel.className = "sub-label";
  brlLabel.textContent = "BRL";

  const brlGrid = document.createElement("div");
  brlGrid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("roblox")) return;
    if (activeRobloxSubs.has("all")) {
      resetVisualSelection(container, activeRobloxSubs);
      return;
    }
    activeRobloxSubs.clear();
    activeRobloxSubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  [800, 1600, 2000, 4500, 10000, "premium"].forEach(v =>
    addGridBtn(
      grid,
      activeRobloxSubs,
      v === "premium" ? "Премиум" : `${v}`,
      v,
      () => updateMergedDeals(),
      container
    )
  );

  ROBLOX_PROMO_BRL.forEach(v =>
    addGridBtn(brlGrid, activeRobloxSubs, `${v}`, v, () => updateMergedDeals(), container)
  );

  // --- Геймпас ---
  const gamepassLabel = document.createElement("div");
  gamepassLabel.className = "sub-label";
  gamepassLabel.textContent = "📦 Геймпас";

  const gamepassBtn = document.createElement("div");
  gamepassBtn.className = "sub-all";
  gamepassBtn.textContent = "Геймпас";

  gamepassBtn.onclick = () => {
    if (!activeCategories.has("roblox")) return;
    activeRobloxSubs.clear();
    activeRobloxSubs.add("gamepass");
    highlightAllButton(gamepassBtn, container);
    updateMergedDeals();
  };
  gamepassBtn.id = "roblox-gamepass-btn";

  container.appendChild(promoLabel);
  container.appendChild(allBtn);
  container.appendChild(grid);
  container.appendChild(brlLabel);
  container.appendChild(brlGrid);
  container.appendChild(gamepassLabel);
  container.appendChild(gamepassBtn);

  btn.onclick = () => {
    if (activeCategories.has("roblox")) {
      activeCategories.delete("roblox");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("roblox");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.roblox.color}`;
      btn.style.border = `1px solid ${CATEGORIES.roblox.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  robloxContainer = container;
}

function applyArenaFilter() {
  const res = [];
  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();
    if (!t.includes("arena") && !t.includes("арена") && !t.includes("bonds")) return;
    if (activeArenaSubs.has("all")) { res.push(c); return; }
    for (const v of activeArenaSubs) {
      if (matchArena(t, v)) { res.push(c); return; }
    }
  });
  return res;
}

function addArena(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.arena.emoji} ${CATEGORIES.arena.title}`;

  const container = document.createElement("div");
  container.style.display = "none";
  const allBtn = document.createElement("div");
  const grid = document.createElement("div");

  allBtn.className = "sub-all";
  allBtn.textContent = "Все облигации";
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("arena")) return;
    if (activeArenaSubs.has("all")) {
      resetVisualSelection(container, activeArenaSubs);
      return;
    }
    activeArenaSubs.clear();
    activeArenaSubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  ARENA_VALUES.forEach(item =>
    addGridBtn(grid, activeArenaSubs, item.label, item.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (activeCategories.has("arena")) {
      activeCategories.delete("arena");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("arena");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.arena.color}`;
      btn.style.border = `1px solid ${CATEGORIES.arena.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  arenaContainer = container;
}

function addGiftCard(parent) {
  buildComplexCategory(
    parent,
    "giftcard",
    "Все карты",
    GIFTCARD_VALUES,
    activeGiftCardSubs,
    applyGiftCardFilter,
    v => GIFTCARD_LABELS[v] || v
  );
}




function applyDonateFilter() {
  const res = [];
  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();
    if (GIFTARY_ALL_KEYWORDS.some(k => t.includes(k))) return;
    if (t.includes("mlbb") || t.includes("алмазный пропуск") || t.includes("алмазы")) return;
    if (/(^|\s)(uc|уc)(\s|$)/i.test(t)) return;
    if (t.includes("elite pass") || t.includes("элит пасс") || t.includes("elite")) return;
    if (t.includes("bonds") || t.includes("arena")) return;
    if (t.includes("g-coin") || t.includes("gcoin") || t.includes("pubg")) return;
    const hasId = t.includes("по айди") || / id(\s|$|[^a-z])/i.test(t);
    const isSpecificGame = activeDonateSubs.size > 0 && !activeDonateSubs.has("all");
    if (isSpecificGame) {
      for (const sel of activeDonateSubs) {
        const kws = DONATE_KEYWORDS[sel];
        if (kws && kws.some(k => t.includes(k))) { res.push(c); return; }
      }
      return;
    }
    if (t.includes("pubg") || t.includes("пабг") || t.includes("elite pass") || t.includes("элит пасс") || t.includes("rp")) {
      res.push(c);
      return;
    }
    if (!hasId) return;
    res.push(c);
  });
  return res;
}

function addDonate(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.donate.emoji} ${CATEGORIES.donate.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  allBtn.textContent = "Все игры";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("donate")) return;
    if (activeDonateSubs.has("all")) {
      resetVisualSelection(container, activeDonateSubs);
      return;
    }
    activeDonateSubs.clear();
    activeDonateSubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  DONATE_VALUES.forEach(game =>
    addGridBtn(grid, activeDonateSubs, game.label, game.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (activeCategories.has("donate")) {
      activeCategories.delete("donate");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("donate");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.donate.color}`;
      btn.style.border = `1px solid ${CATEGORIES.donate.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  donateContainer = container;
}

function applyGiftaryFilter() {
  const res = [];

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();

    if (activeGiftarySubs.has("all")) {
      for (const game of GIFTARY_VALUES) {
        const keywords = GIFTARY_KEYWORDS[game.value];
        if (keywords.some(k => {
          if (k.includes("\\b")) return new RegExp(k, "i").test(t);
          return t.includes(k);
        })) {
          res.push(c);
          return;
        }
      }
      return;
    }

    for (const selectedGame of activeGiftarySubs) {
      const keywords = GIFTARY_KEYWORDS[selectedGame];
      if (keywords && keywords.some(k => {
        if (k.includes("\\b")) return new RegExp(k, "i").test(t);
        return t.includes(k);
      })) {
        res.push(c);
        return;
      }
    }
  });

  return res;
}

function applyDessluHubFilter() {
  const res = [];
  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();
    if (activeDessluHubSubs.has("all")) {
      for (const game of DESSLUHUB_VALUES) {
        const keywords = DESSLUHUB_KEYWORDS[game.value];
        if (keywords.some(k => {
          if (k.includes("\\b")) return new RegExp(k, "i").test(t);
          return t.includes(k);
        })) { res.push(c); return; }
      }
      return;
    }
    for (const selectedGame of activeDessluHubSubs) {
      const keywords = DESSLUHUB_KEYWORDS[selectedGame];
      if (keywords && keywords.some(k => {
        if (k.includes("\\b")) return new RegExp(k, "i").test(t);
        return t.includes(k);
      })) { res.push(c); return; }
    }
  });
  return res;
}

function addDessluHub(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.dessluhub.emoji} ${CATEGORIES.dessluhub.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  allBtn.textContent = "Все игры";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("dessluhub")) return;
    if (activeDessluHubSubs.has("all")) {
      resetVisualSelection(container, activeDessluHubSubs);
      return;
    }
    activeDessluHubSubs.clear();
    activeDessluHubSubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  DESSLUHUB_VALUES.forEach(game =>
    addGridBtn(grid, activeDessluHubSubs, game.label, game.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (activeCategories.has("dessluhub")) {
      activeCategories.delete("dessluhub");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("dessluhub");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.dessluhub.color}`;
      btn.style.border = `1px solid ${CATEGORIES.dessluhub.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  dessluhubContainer = container;
}

function addGiftary(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.giftary.emoji} ${CATEGORIES.giftary.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  allBtn.textContent = "Все игры";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("giftary")) return;
    if (activeGiftarySubs.has("all")) {
      resetVisualSelection(container, activeGiftarySubs);
      return;
    }
    activeGiftarySubs.clear();
    activeGiftarySubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  GIFTARY_VALUES.forEach(game =>
    addGridBtn(grid, activeGiftarySubs, game.label, game.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (activeCategories.has("giftary")) {
      activeCategories.delete("giftary");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("giftary");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.giftary.color}`;
      btn.style.border = `1px solid ${CATEGORIES.giftary.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  giftaryContainer = container;
}

function applyNeuralFilter() {
  const res = [];

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();

    if (activeNeuralSubs.has("all")) {
      const anyMatch = Object.values(NEURAL_KEYWORDS).some(kws => kws.some(k => t.includes(k)));
      if (anyMatch) res.push(c);
      return;
    }

    for (const sel of activeNeuralSubs) {
      const kws = NEURAL_KEYWORDS[sel];
      if (kws && kws.some(k => t.includes(k))) { res.push(c); return; }
    }
  });

  return res;
}

function addNeural(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.neural.emoji} ${CATEGORIES.neural.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  allBtn.textContent = "Все нейросети";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("neural")) return;
    if (activeNeuralSubs.has("all")) {
      resetVisualSelection(container, activeNeuralSubs);
      return;
    }
    activeNeuralSubs.clear();
    activeNeuralSubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  NEURAL_VALUES.forEach(item =>
    addGridBtn(grid, activeNeuralSubs, item.label, item.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (activeCategories.has("neural")) {
      activeCategories.delete("neural");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("neural");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.neural.color}`;
      btn.style.border = `1px solid ${CATEGORIES.neural.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  neuralContainer = container;
}

function applyAccountFilter() {
  const res = [];
  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();
    if (activeAccountSubs.has("all")) {
      const anyMatch = Object.values(ACCOUNT_KEYWORDS).some(kws => kws.some(k => t.includes(k)));
      if (anyMatch) res.push(c);
      return;
    }
    for (const sel of activeAccountSubs) {
      const kws = ACCOUNT_KEYWORDS[sel];
      if (kws && kws.some(k => t.includes(k))) { res.push(c); return; }
    }
  });
  return res;
}

function addAccount(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.account.emoji} ${CATEGORIES.account.title}`;

  const container = document.createElement("div");
  container.style.display = "none";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  allBtn.textContent = "Все игры";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("account")) return;
    if (activeAccountSubs.has("all")) { resetVisualSelection(container, activeAccountSubs); return; }
    activeAccountSubs.clear();
    activeAccountSubs.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  ACCOUNT_VALUES.forEach(item =>
    addGridBtn(grid, activeAccountSubs, item.label, item.value, applyAccountFilter, container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (activeCategories.has("account")) {
      activeCategories.delete("account");
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add("account");
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES.account.color}`;
      btn.style.border = `1px solid ${CATEGORIES.account.color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  accountContainer = container;
}

function addGridBtn(parent, stateSet, label, value, applyFn, container) {
  const b = document.createElement("div");
  b.className = "sub-btn";
  b.textContent = label;
  b.onclick = () => {
    if (stateSet.has(value)) {
      stateSet.delete(value);
      b.classList.remove("active");
    } else {
      stateSet.add(value);
      b.classList.add("active");
      const allBtn = container.querySelector(".sub-all");
      if (allBtn) {
        allBtn.classList.remove("active");
        stateSet.delete("all");
      }
    }
    applyFn();
  };
  parent.appendChild(b);
}

function highlightAllButton(allBtn, container) {
  allBtn.classList.add("active");
  container.querySelectorAll(".sub-btn").forEach(b => b.classList.remove("active"));
}

function resetVisualSelection(container, stateSet) {
  container.querySelectorAll(".sub-btn, .sub-all").forEach(b => b.classList.remove("active"));
  stateSet.clear();
  updateMergedDeals();
}

function buildComplexCategory(parent, key, allLabel, values, stateSet, applyFn, labelFn) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES[key].emoji} ${CATEGORIES[key].title}`;

  const container = document.createElement("div");
  container.style.display = "none";
  const allBtn = document.createElement("div");
  const grid = document.createElement("div");

  allBtn.className = "sub-all";
  allBtn.textContent = allLabel;
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has(key)) return;
    if (stateSet.has("all")) {
      resetVisualSelection(container, stateSet);
      return;
    }
    stateSet.clear();
    stateSet.add("all");
    highlightAllButton(allBtn, container);
    updateMergedDeals();
  };

  values.forEach(v =>
    addGridBtn(grid, stateSet, labelFn(v), v, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (activeCategories.has(key)) {
      activeCategories.delete(key);
      container.style.display = "none";
      btn.classList.remove("active");
      btn.style.boxShadow = "";
      btn.style.border = "1px solid transparent";
    } else {
      activeCategories.add(key);
      container.style.display = "block";
      btn.classList.add("active");
      btn.style.boxShadow = `0 0 12px ${CATEGORIES[key].color}`;
      btn.style.border = `1px solid ${CATEGORIES[key].color}`;
    }
    updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);

  if (key === "stars") starContainer = container;
  if (key === "uc") ucContainer = container;
  if (key === "telegram") telegramContainer = container;
  if (key === "giftcard") giftCardContainer = container;
}
