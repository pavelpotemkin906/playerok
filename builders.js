// =========================
// FILTERS (все здесь)
// =========================

function applyUCFilter() {
  const res = [];
  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = getDealText(c);
    if (activeUCSubs.has("all") || activeUCSubs.size === 0) {
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
    const t = getDealText(c);

    // 🟣 PREMIUM — приоритетный режим
    if (hasPremium) {
      if (t.includes("роблокс премиум")) {
        res.push(c);
      }
      return;
    }

    // 🎟 обычные промокоды
    if (!t.includes("робуксов промокодом")) return;

    // "all" работает ТОЛЬКО если premium НЕ выбран. Или если вообще ничего не выбрано
    if (activeRobloxPromoSubs.has("all") || activeRobloxPromoSubs.size === 0) {
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
    const t = getDealText(c);
    if (activeGiftCardSubs.has("all") || activeGiftCardSubs.size === 0) {
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

  if (activeCategories.has("telegram")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.telegram.color}`;
    btn.style.border = `1px solid ${CATEGORIES.telegram.color}`;
    container.style.display = "block";
  }
  btn.onclick = () => {
    if (toggleSingleCategory("telegram", btn, container)) updateMergedDeals();
    else updateMergedDeals();
  };

  // --- Звёзды ---
  const starsLabel = document.createElement("div");
  starsLabel.className = "sub-label";
  starsLabel.textContent = "⭐ Звёзды";

  const starsAllBtn = document.createElement("div");
  starsAllBtn.className = "sub-all";
  if (activeStarSubs.has("all")) starsAllBtn.classList.add("active");
  starsAllBtn.textContent = "Все звёзды";

  const starsGrid = document.createElement("div");
  starsGrid.className = "sub-grid";

  starsAllBtn.onclick = () => {
    if (!activeCategories.has("telegram")) return;
    activeTelegramSubs.clear();
    activeStarSubs.clear();
    activeStarSubs.add("all");
    highlightAllButton(starsAllBtn, container);
    saveActiveState();
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

    if (activeStarSubs.has(v)) b.classList.add("active");
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
      saveActiveState();
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
  if (activeTelegramSubs.has("all")) premAllBtn.classList.add("active");
  premAllBtn.textContent = "Все подписки";

  const premGrid = document.createElement("div");
  premGrid.className = "sub-grid";

  premAllBtn.onclick = () => {
    if (!activeCategories.has("telegram")) return;
    activeStarSubs.clear();
    activeTelegramSubs.clear();
    activeTelegramSubs.add("all");
    highlightAllButton(premAllBtn, container);
    saveActiveState();
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

    if (activeTelegramSubs.has(v)) b.classList.add("active");
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
      saveActiveState();
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
    const t = getDealText(c);
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
      return;
    }
    // Fallback: если выбрана категория Telegram, но не выбраны подкатегории
    if (t.includes("telegram") || t.includes("премиум") || t.includes("зв")) {
      res.push(c);
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
    const t = getDealText(c);
    if (!t.includes("pubg") && !t.includes("пабг") && !t.includes("pubg mobile")) return;
    if (activePubgSubs.has("all") || activePubgSubs.size === 0) { res.push(c); return; }
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

  if (activeCategories.has("pubg")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.pubg.color}`;
    btn.style.border = `1px solid ${CATEGORIES.pubg.color}`;
    container.style.display = "block";
  }
  
  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  if (activePubgSubs.has("all")) allBtn.classList.add("active");
  allBtn.textContent = "Все";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("pubg")) return;
    if (activePubgSubs.has("all")) {
      resetVisualSelection(container, activePubgSubs);
      saveActiveState();
      return;
    }
    activePubgSubs.clear();
    activePubgSubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
    updateMergedDeals();
  };

  PUBG_VALUES.forEach(v =>
    addGridBtn(grid, activePubgSubs, PUBG_LABELS[v], v, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (toggleSingleCategory("pubg", btn, container)) updateMergedDeals();
    else updateMergedDeals();
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

  if (activeCategories.has("robloxpromo")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.robloxpromo.color}`;
    btn.style.border = `1px solid ${CATEGORIES.robloxpromo.color}`;
    container.style.display = "block";
  }

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  if (activeRobloxPromoSubs.has("all")) allBtn.classList.add("active");
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
      saveActiveState();
      return;
    }
    activeRobloxPromoSubs.clear();
    activeRobloxPromoSubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
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
    if (toggleSingleCategory("robloxpromo", btn, container)) updateMergedDeals();
    else updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  robloxPromoContainer = container;
}

function applyRobloxFilter() {
  const res = [];
  const isGamepass = activeRobloxSubs.has("gamepass");
  const hasPremium = activeRobloxSubs.has("premium");
  const isLinkAll = activeRobloxSubs.has("link-all");
  const linkValues = [...activeRobloxSubs]
    .filter(v => typeof v === "string" && v.startsWith("link-") && v !== "link-all")
    .map(v => Number(v.slice(5)))
    .filter(n => Number.isFinite(n));

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = getDealText(c);
    if (isGamepass) {
      if (t.includes("геймпас") || t.includes("game pass")) res.push(c);
      return;
    }
    if (hasPremium) {
      if (t.includes("роблокс премиум")) res.push(c);
      return;
    }
    // По ссылке — все номиналы
    if (isLinkAll) {
      if (t.includes("по ссылке") && (t.includes("робукс") || t.includes("robux"))) res.push(c);
      return;
    }
    // По ссылке — конкретные номиналы
    if (linkValues.length) {
      if (t.includes("по ссылке") && linkValues.some(n => matchRobloxLink(t, n))) res.push(c);
      return;
    }

    const hasRobuxByLink = (t.includes("робукс") || t.includes("robux")) && t.includes("по ссылке");
    if (!t.includes("робуксов промокодом") && !t.includes("роблокс премиум") && !t.includes("геймпас") && !t.includes("game pass") && !hasRobuxByLink) return;
    if (activeRobloxSubs.has("all") || activeRobloxSubs.size === 0) { res.push(c); return; }
    for (const v of activeRobloxSubs) {
      if (v === "all" || v === "gamepass" || v === "premium") continue;
      if (typeof v === "string" && v.startsWith("link-")) continue;
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

  if (activeCategories.has("roblox")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.roblox.color}`;
    btn.style.border = `1px solid ${CATEGORIES.roblox.color}`;
    container.style.display = "block";
  }

  // --- Промокоды ---
  const promoLabel = document.createElement("div");
  promoLabel.className = "sub-label";
  promoLabel.textContent = "🎟 Промокоды";

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  if (activeRobloxSubs.has("all")) allBtn.classList.add("active");
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
      saveActiveState();
      return;
    }
    activeRobloxSubs.clear();
    activeRobloxSubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
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

  // --- По ссылке ---
  const linkLabel = document.createElement("div");
  linkLabel.className = "sub-label";
  linkLabel.textContent = "🔗 По ссылке";

  const linkAllBtn = document.createElement("div");
  linkAllBtn.className = "sub-all";
  if (activeRobloxSubs.has("link-all")) linkAllBtn.classList.add("active");
  linkAllBtn.textContent = "Все по ссылке";

  const linkGrid = document.createElement("div");
  linkGrid.className = "sub-grid";

  linkAllBtn.onclick = () => {
    if (!activeCategories.has("roblox")) return;
    if (activeRobloxSubs.has("link-all")) {
      activeRobloxSubs.delete("link-all");
      linkAllBtn.classList.remove("active");
      saveActiveState();
      updateMergedDeals();
      return;
    }
    activeRobloxSubs.clear();
    activeRobloxSubs.add("link-all");
    container.querySelectorAll(".sub-all,.sub-btn").forEach(b => b.classList.remove("active"));
    linkAllBtn.classList.add("active");
    saveActiveState();
    updateMergedDeals();
  };

  ROBLOX_LINK_VALUES.forEach(v => {
    const key = `link-${v}`;
    const b = document.createElement("div");
    b.className = "sub-btn";
    if (activeRobloxSubs.has(key)) b.classList.add("active");
    b.textContent = `${v}`;
    b.onclick = () => {
      if (activeRobloxSubs.has(key)) {
        activeRobloxSubs.delete(key);
        b.classList.remove("active");
      } else {
        activeRobloxSubs.add(key);
        b.classList.add("active");
        // Снимаем все "all"-режимы и promo-номиналы — выбран конкретный link-номинал
        activeRobloxSubs.delete("all");
        activeRobloxSubs.delete("link-all");
        ROBLOX_PROMO_VALUES.forEach(pv => activeRobloxSubs.delete(pv));
        ROBLOX_PROMO_BRL.forEach(pv => activeRobloxSubs.delete(pv));
        container.querySelectorAll(".sub-all").forEach(a => a.classList.remove("active"));
        // Снимаем визуально и promo-номиналы
        container.querySelectorAll(".sub-btn").forEach(sb => {
          if (sb !== b && !sb.textContent.match(new RegExp(`^${ROBLOX_LINK_VALUES.join("|")}$`))) sb.classList.remove("active");
        });
      }
      saveActiveState();
      updateMergedDeals();
    };
    linkGrid.appendChild(b);
  });

  // --- Геймпас ---
  const gamepassLabel = document.createElement("div");
  gamepassLabel.className = "sub-label";
  gamepassLabel.textContent = "📦 Геймпас";

  const gamepassBtn = document.createElement("div");
  gamepassBtn.className = "sub-all";
  if (activeRobloxSubs.has("gamepass")) gamepassBtn.classList.add("active");
  gamepassBtn.textContent = "Геймпас";

  gamepassBtn.onclick = () => {
    if (!activeCategories.has("roblox")) return;
    activeRobloxSubs.clear();
    activeRobloxSubs.add("gamepass");
    highlightAllButton(gamepassBtn, container);
    saveActiveState();
    updateMergedDeals();
  };
  gamepassBtn.id = "roblox-gamepass-btn";

  container.appendChild(promoLabel);
  container.appendChild(allBtn);
  container.appendChild(grid);
  container.appendChild(brlLabel);
  container.appendChild(brlGrid);
  container.appendChild(linkLabel);
  container.appendChild(linkAllBtn);
  container.appendChild(linkGrid);
  container.appendChild(gamepassLabel);
  container.appendChild(gamepassBtn);

  btn.onclick = () => {
    if (toggleSingleCategory("roblox", btn, container)) updateMergedDeals();
    else updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  robloxContainer = container;
}

function applyArenaFilter() {
  const res = [];
  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = getDealText(c);
    if (!t.includes("arena") && !t.includes("арена") && !t.includes("bonds")) return;
    if (activeArenaSubs.has("all") || activeArenaSubs.size === 0) { res.push(c); return; }
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
  if (activeCategories.has("arena")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.arena.color}`;
    btn.style.border = `1px solid ${CATEGORIES.arena.color}`;
    container.style.display = "block";
  }

  const allBtn = document.createElement("div");
  const grid = document.createElement("div");

  allBtn.className = "sub-all";
  if (activeArenaSubs.has("all")) allBtn.classList.add("active");
  allBtn.textContent = "Все облигации";
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("arena")) return;
    if (activeArenaSubs.has("all")) {
      resetVisualSelection(container, activeArenaSubs);
      saveActiveState();
      return;
    }
    activeArenaSubs.clear();
    activeArenaSubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
    updateMergedDeals();
  };

  ARENA_VALUES.forEach(item =>
    addGridBtn(grid, activeArenaSubs, item.label, item.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (toggleSingleCategory("arena", btn, container)) updateMergedDeals();
    else updateMergedDeals();
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
    const t = getDealText(c);
    if (GIFTARY_ALL_KEYWORDS.some(k => t.includes(k))) return;
    if (t.includes("mlbb") || t.includes("алмазный пропуск") || t.includes("алмазы")) return;
    if (/(^|\s)(uc|уc)(\s|$)/i.test(t)) return;
    if (t.includes("elite pass") || t.includes("элит пасс") || t.includes("elite")) return;
    if (t.includes("bonds") || t.includes("arena")) return;
    if (t.includes("g-coin") || t.includes("gcoin") || t.includes("pubg")) return;
    // Исключаем сделки "со входом в аккаунт" — они принадлежат категории Account
    if (t.includes("со входом в аккаунт") || t.includes("с входом в аккаунт")) return;
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
  if (activeCategories.has("donate")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.donate.color}`;
    btn.style.border = `1px solid ${CATEGORIES.donate.color}`;
    container.style.display = "block";
  }

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  if (activeDonateSubs.has("all")) allBtn.classList.add("active");
  allBtn.textContent = "Все игры";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("donate")) return;
    if (activeDonateSubs.has("all")) {
      resetVisualSelection(container, activeDonateSubs);
      saveActiveState();
      return;
    }
    activeDonateSubs.clear();
    activeDonateSubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
    updateMergedDeals();
  };

  DONATE_VALUES.forEach(game =>
    addGridBtn(grid, activeDonateSubs, game.label, game.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (toggleSingleCategory("donate", btn, container)) updateMergedDeals();
    else updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  donateContainer = container;
}

function applyGiftaryFilter() {
  const res = [];

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = getDealText(c);

    if (activeGiftarySubs.has("all") || activeGiftarySubs.size === 0) {
      for (const game of GIFTARY_VALUES) {
        const keywords = GIFTARY_KEYWORDS[game.value];
        if (keywords.some(k => testKeywordWithBoundary(k, t))) {
          res.push(c);
          return;
        }
      }
      return;
    }

    for (const selectedGame of activeGiftarySubs) {
      const keywords = GIFTARY_KEYWORDS[selectedGame];
      if (keywords && keywords.some(k => testKeywordWithBoundary(k, t))) {
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
    const t = getDealText(c);
    if (activeDessluHubSubs.has("all") || activeDessluHubSubs.size === 0) {
      for (const game of DESSLUHUB_VALUES) {
        const keywords = DESSLUHUB_KEYWORDS[game.value];
        if (keywords.some(k => testKeywordWithBoundary(k, t))) { res.push(c); return; }
      }
      return;
    }
    for (const selectedGame of activeDessluHubSubs) {
      const keywords = DESSLUHUB_KEYWORDS[selectedGame];
      if (keywords && keywords.some(k => testKeywordWithBoundary(k, t))) {
        res.push(c);
        return;
      }
    }
  });
  return res;
}

function addDessluHub(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.dessluhub.emoji} ${CATEGORIES.dessluhub.title}`;

  const container = document.createElement("div");
  container.style.display = activeCategories.has("dessluhub") ? "block" : "none";
  if (activeCategories.has("dessluhub")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.dessluhub.color}`;
    btn.style.border = `1px solid ${CATEGORIES.dessluhub.color}`;
  }

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  if (activeDessluHubSubs.has("all")) allBtn.classList.add("active");
  allBtn.textContent = "Все игры";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("dessluhub")) return;
    if (activeDessluHubSubs.has("all")) {
      resetVisualSelection(container, activeDessluHubSubs);
      saveActiveState();
      return;
    }
    activeDessluHubSubs.clear();
    activeDessluHubSubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
    updateMergedDeals();
  };

  DESSLUHUB_VALUES.forEach(game =>
    addGridBtn(grid, activeDessluHubSubs, game.label, game.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (toggleSingleCategory("dessluhub", btn, container)) updateMergedDeals();
    else updateMergedDeals();
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
  container.style.display = activeCategories.has("giftary") ? "block" : "none";
  if (activeCategories.has("giftary")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.giftary.color}`;
    btn.style.border = `1px solid ${CATEGORIES.giftary.color}`;
  }

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  if (activeGiftarySubs.has("all")) allBtn.classList.add("active");
  allBtn.textContent = "Все игры";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("giftary")) return;
    if (activeGiftarySubs.has("all")) {
      resetVisualSelection(container, activeGiftarySubs);
      saveActiveState();
      return;
    }
    activeGiftarySubs.clear();
    activeGiftarySubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
    updateMergedDeals();
  };

  GIFTARY_VALUES.forEach(game =>
    addGridBtn(grid, activeGiftarySubs, game.label, game.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (toggleSingleCategory("giftary", btn, container)) updateMergedDeals();
    else updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  giftaryContainer = container;
}

function applyNeuralFilter() {
  const res = [];

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = getDealText(c);

    if (activeNeuralSubs.has("all") || activeNeuralSubs.size === 0) {
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
  container.style.display = activeCategories.has("neural") ? "block" : "none";
  if (activeCategories.has("neural")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.neural.color}`;
    btn.style.border = `1px solid ${CATEGORIES.neural.color}`;
  }

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  if (activeNeuralSubs.has("all")) allBtn.classList.add("active");
  allBtn.textContent = "Все нейросети";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("neural")) return;
    if (activeNeuralSubs.has("all")) {
      resetVisualSelection(container, activeNeuralSubs);
      saveActiveState();
      return;
    }
    activeNeuralSubs.clear();
    activeNeuralSubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
    updateMergedDeals();
  };

  NEURAL_VALUES.forEach(item =>
    addGridBtn(grid, activeNeuralSubs, item.label, item.value, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (toggleSingleCategory("neural", btn, container)) updateMergedDeals();
    else updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  neuralContainer = container;
}

function applyAccountFilter() {
  const res = [];
  // Ключевые слова Standoff — исключаем из категории "Вход в аккаунт"
  const standoffExclude = ["standoff", "стандофф", "dice", "куб", "кубов", "кубы", "fable", "тикет"];

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = getDealText(c);

    // Не захватываем сделки Standoff в категорию "Вход в аккаунт"
    if (standoffExclude.some(k => t.includes(k))) return;

    if (activeAccountSubs.has("all") || activeAccountSubs.size === 0) {
      // Проверяем специфичные ключевые слова каждой игры
      const gameMatch = Object.values(ACCOUNT_KEYWORDS).some(kws => kws.some(k => t.includes(k)));
      // Проверяем общие ключевые слова ("со входом в аккаунт" и т.д.)
      const genericMatch = typeof ACCOUNT_GENERIC_KEYWORDS !== 'undefined' &&
                           ACCOUNT_GENERIC_KEYWORDS.some(k => t.includes(k));
      if (gameMatch || genericMatch) res.push(c);
      return;
    }
    for (const sel of activeAccountSubs) {
      const kws = ACCOUNT_KEYWORDS[sel];
      if (kws && kws.some(k => t.includes(k))) { res.push(c); return; }
    }
    // Также проверяем общие ключевые слова при выборе конкретной подкатегории
    if (typeof ACCOUNT_GENERIC_KEYWORDS !== 'undefined' &&
        ACCOUNT_GENERIC_KEYWORDS.some(k => t.includes(k))) {
      res.push(c);
    }
  });
  return res;
}

function addAccount(parent) {
  const btn = document.createElement("div");
  btn.className = "dist-btn";
  btn.textContent = `${CATEGORIES.account.emoji} ${CATEGORIES.account.title}`;

  const container = document.createElement("div");
  container.style.display = activeCategories.has("account") ? "block" : "none";

  if (activeCategories.has("account")) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES.account.color}`;
    btn.style.border = `1px solid ${CATEGORIES.account.color}`;
  }

  const allBtn = document.createElement("div");
  allBtn.className = "sub-all";
  if (activeAccountSubs.has("all")) allBtn.classList.add("active");
  allBtn.textContent = "Все аккаунты";

  const grid = document.createElement("div");
  grid.className = "sub-grid";

  allBtn.onclick = () => {
    if (!activeCategories.has("account")) return;
    if (activeAccountSubs.has("all")) {
      resetVisualSelection(container, activeAccountSubs);
      saveActiveState();
      return;
    }
    activeAccountSubs.clear();
    activeAccountSubs.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
    updateMergedDeals();
  };

  ACCOUNT_VALUES.forEach(item =>
    addGridBtn(grid, activeAccountSubs, item.label, item.value, applyAccountFilter, container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (toggleSingleCategory("account", btn, container)) updateMergedDeals();
    else updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);
  accountContainer = container;
}

function addGridBtn(parent, stateSet, label, value, applyFn, container) {
  const b = document.createElement("div");
  b.className = "sub-btn";
  if (stateSet.has(value)) b.classList.add("active");
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
    saveActiveState();
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
  saveActiveState();
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

  if (activeCategories.has(key)) {
    btn.classList.add("active");
    btn.style.boxShadow = `0 0 12px ${CATEGORIES[key].color}`;
    btn.style.border = `1px solid ${CATEGORIES[key].color}`;
    container.style.display = "block";
  }
  if (stateSet.has("all")) allBtn.classList.add("active");

  allBtn.onclick = () => {
    if (!activeCategories.has(key)) return;
    if (stateSet.has("all")) {
      resetVisualSelection(container, stateSet);
      saveActiveState();
      return;
    }
    stateSet.clear();
    stateSet.add("all");
    highlightAllButton(allBtn, container);
    saveActiveState();
    updateMergedDeals();
  };

  values.forEach(v =>
    addGridBtn(grid, stateSet, labelFn(v), v, () => updateMergedDeals(), container)
  );

  container.appendChild(allBtn);
  container.appendChild(grid);

  btn.onclick = () => {
    if (toggleSingleCategory(key, btn, container)) updateMergedDeals();
    else updateMergedDeals();
  };

  parent.appendChild(btn);
  parent.appendChild(container);

  if (key === "stars") starContainer = container;
  if (key === "uc") ucContainer = container;
  if (key === "telegram") telegramContainer = container;
  if (key === "giftcard") giftCardContainer = container;
}
