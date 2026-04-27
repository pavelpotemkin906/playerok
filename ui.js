let mutationObserver = null;
let mountTimeout = null;
const PANEL_POS_KEY = "dist_panel_position_v2";
const ICON_POS_KEY = "dist_icon_position_v2";
const SERVICES_KEY = "dist_services_v1";

const DEFAULT_SERVICES = [
  { id: "epingrid",  label: "EpinGrid",   url: "https://epingrid.com/purchase",       color: "#38bdf8" },
  { id: "giftary",   label: "Giftary",    url: "https://panel.giftery.pro/dashboard",  color: "#8b5cf6" },
  { id: "oson",      label: "OSON",       url: "https://agent.interhub.ae/shop?fixed", color: "#34d399" },
  { id: "dessly",    label: "Desslyhub",  url: "https://dbm.desslyhub.com/",           color: "#f97316" },
  { id: "fragment",  label: "Fragment ⭐", url: "https://fragment.com/stars",          color: "#ffd700" }
];

function loadServices() {
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    if (!raw) return DEFAULT_SERVICES.map(s => ({ ...s }));
    return JSON.parse(raw);
  } catch (_) { return DEFAULT_SERVICES.map(s => ({ ...s })); }
}
function saveServices(list) {
  try { localStorage.setItem(SERVICES_KEY, JSON.stringify(list)); } catch (_) {}
}

function loadPanelPosition() {
  try {
    const raw = localStorage.getItem(PANEL_POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!Number.isFinite(p?.x) || !Number.isFinite(p?.y)) return null;
    return { x: p.x, y: p.y };
  } catch (_) { return null; }
}
function savePanelPosition(x, y) {
  try { localStorage.setItem(PANEL_POS_KEY, JSON.stringify({ x, y })); } catch (_) {}
}
function loadIconPosition() {
  try {
    const raw = localStorage.getItem(ICON_POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!Number.isFinite(p?.x) || !Number.isFinite(p?.y)) return null;
    return { x: p.x, y: p.y };
  } catch (_) { return null; }
}
function saveIconPosition(x, y) {
  try { localStorage.setItem(ICON_POS_KEY, JSON.stringify({ x, y })); } catch (_) {}
}

function clampPanelPosition(x, y, panel) {
  const margin = 8;
  const maxX = Math.max(margin, window.innerWidth - panel.offsetWidth - margin);
  const maxY = Math.max(margin, window.innerHeight - panel.offsetHeight - margin);
  return { x: Math.min(Math.max(x, margin), maxX), y: Math.min(Math.max(y, margin), maxY) };
}
function applyPanelPosition(panel, x, y) {
  const c = clampPanelPosition(x, y, panel);
  panel.style.left = c.x + "px"; panel.style.top = c.y + "px";
  panel.style.right = "auto";
  
}

function enablePanelDragging(panel) {
  const handle = panel.querySelector("#dist-drag-handle");
  if (!handle) return;
  let dragging = false, startX = 0, startY = 0, baseLeft = 0, baseTop = 0;
  const onMove = e => {
    if (!dragging) return;
    applyPanelPosition(panel, baseLeft + (e.clientX - startX), baseTop + (e.clientY - startY));
  };
  const onUp = () => {
    if (!dragging) return; dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    savePanelPosition(panel.offsetLeft, panel.offsetTop);
  };
  handle.addEventListener("mousedown", e => {
    if (e.target.closest("#dist-refresh, #dist-close")) return;
    if (e.button !== 0) return;
    dragging = true; startX = e.clientX; startY = e.clientY;
    baseLeft = panel.offsetLeft; baseTop = panel.offsetTop;
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
  });
}

function enableIconDragging(icon) {
  let dragging = false;
  let moved = false;
  let startX = 0, startY = 0;

  icon.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    baseLeft = icon.offsetLeft;
    baseTop = icon.offsetTop;
    e.preventDefault();
  });

  document.addEventListener("mousemove", e => {
    if (!dragging) return;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 5 || dy > 5) moved = true;
    const margin = 8;
    const rawX = baseLeft + (e.clientX - startX);
    const rawY = baseTop + (e.clientY - startY);
    const clampedX = Math.min(Math.max(rawX, margin), window.innerWidth - icon.offsetWidth - margin);
    const clampedY = Math.min(Math.max(rawY, margin), window.innerHeight - icon.offsetHeight - margin);
    icon.style.left = clampedX + "px";
    icon.style.top = clampedY + "px";
  });

  document.addEventListener("mouseup", e => {
    if (!dragging) return;
    dragging = false;
    if (moved) {
      const margin = 8;
      const x = Math.min(Math.max(icon.offsetLeft, margin), window.innerWidth - icon.offsetWidth - margin);
      const y = Math.min(Math.max(icon.offsetTop, margin), window.innerHeight - icon.offsetHeight - margin);
      icon.style.left = x + "px";
      icon.style.top = y + "px";
      saveIconPosition(x, y);
    }
  });

  icon.addEventListener("click", e => {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    }
  });
}

function clearHighlight() {
  document.querySelectorAll(".dist-highlight").forEach(el => {
    el.classList.remove("dist-highlight");
    el.style.outline = ""; el.style.boxShadow = "";
  });
}

function clearSimpleActive() {
  if (activeSimpleBtn) {
    activeSimpleBtn.style.boxShadow = "";
    activeSimpleBtn.style.border = "1px solid transparent";
    activeSimpleBtn = null;
  }
}
function resetVisualSelection(container, stateSet) {
  stateSet.clear();
  container.querySelectorAll(".sub-btn, .sub-all").forEach(b => { b.style.boxShadow = ""; b.style.border = "1px solid transparent"; });
  currentDeals = []; clearHighlight(); updateInfo(0); updateOpenBtn();
}
function resetState(message = "Выделение снято") {
  activeCategories.clear(); activeCategory = null; currentDeals = [];
  activeStarSubs.clear(); activeUCSubs.clear(); activeTelegramSubs.clear();
  activeRobloxPromoSubs.clear(); activeRobloxSubs.clear(); activeGiftCardSubs.clear();
  activeGiftarySubs.clear(); activeDonateSubs.clear(); activeNeuralSubs.clear(); activeAccountSubs.clear(); activeDessluHubSubs.clear();
  clearHighlight(); clearSimpleActive();
  document.querySelectorAll(".dist-btn, .sub-btn, .sub-all").forEach(b => b.classList.remove("active"));
  [starContainer, ucContainer, telegramContainer, robloxPromoContainer, robloxContainer, giftCardContainer, giftaryContainer, donateContainer, neuralContainer, accountContainer, dessluhubContainer].forEach(c => { if (c) c.style.display = "none"; });
  updateInfo(0, message); updateOpenBtn();
}
function highlightDeals(deals, color) {
  clearHighlight();
  deals.forEach(d => { 
    d.classList.add("dist-highlight"); 
    d.style.outline = `2px solid ${color}`; 
    d.style.boxShadow = `0 0 20px ${color}, 0 0 8px ${color} inset`; 
    d.style.borderRadius = "14px";
    d.style.transition = "all .2s ease";
  });
}
function highlightSimpleButton(btn, color) {
  clearSimpleActive(); activeSimpleBtn = btn;
  btn.style.boxShadow = `0 0 12px ${color}`; btn.style.border = `1px solid ${color}`;
}

function distOpenDeals() { openDeals(); }

// Make function globally accessible
window.distOpenDeals = distOpenDeals;

function openDeals() {
  if (!currentDeals.length) return;
  const countInput = document.querySelector("#dist-open-count");
  const fromSelect = document.querySelector("#dist-open-from");
  const rawCount = Number(countInput?.value || currentDeals.length);
  const safeCount = Number.isFinite(rawCount) ? Math.max(1, Math.min(currentDeals.length, Math.floor(rawCount))) : currentDeals.length;
  const from = fromSelect?.value === "end" ? "end" : "start";
  const selectedDeals = from === "end"
    ? currentDeals.slice(-safeCount).reverse()
    : currentDeals.slice(0, safeCount);

  const urls = selectedDeals.map(d => {
    const href = d.href || d.getAttribute("href") || "";
    if (href.startsWith("http")) return href;
    if (href.startsWith("/")) return "https://playerok.com" + href;
    return null;
  }).filter(Boolean);

  if (!urls.length) { updateInfo(0, "Нет ссылок"); return; }

  // Открываем через background service worker
  chrome.runtime.sendMessage({ type: "OPEN_TABS", urls }, response => {
    if (chrome.runtime.lastError) {
      // Service worker недоступен — открываем напрямую
      urls.forEach((url, i) => setTimeout(() => window.open(url, "_blank"), i * 300));
    }
  });

  updateInfo(currentDeals.length, `Открыто: ${urls.length} (${from === "end" ? "с конца" : "с начала"})`);
}
function updateOpenBtn() {
  const btn = document.querySelector("#dist-open"); if (!btn) return;
  const badge = btn.querySelector("#dist-open-count-badge");
  const textEl = btn.querySelector("#dist-open-text");
  if (currentDeals.length) {
    btn.classList.add("dist-open-ready");
    if (badge) { badge.style.display = "inline-block"; badge.textContent = currentDeals.length; }
    if (textEl) textEl.textContent = "Открыть сделки";
  } else {
    btn.classList.remove("dist-open-ready");
    btn.style.background = "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.15))";
    btn.style.borderColor = "rgba(99,102,241,0.4)";
    btn.style.color = "#c7d2fe";
    if (badge) badge.style.display = "none";
    if (textEl) textEl.textContent = "Открыть сделки";
  }
}
function updateInfo(count, text) {
  const info = document.querySelector("#dist-info"); if (!info) return;
  info.textContent = text ? text : count ? `Найдено сделок: ${count}` : "Совпадений нет";
}
function highlightAllButton(allBtn, container) {
  allBtn.classList.add("active");
  container.querySelectorAll(".sub-btn").forEach(b => b.classList.remove("active"));
}
const FILTER_FUNCTIONS = {
  uc: () => typeof applyUCFilter === "function" ? applyUCFilter() : [],
  robloxpromo: () => typeof applyRobloxPromoFilter === "function" ? applyRobloxPromoFilter() : [],
  giftcard: () => typeof applyGiftCardFilter === "function" ? applyGiftCardFilter() : [],
  telegram: () => typeof applyTelegramUnifiedFilter === "function" ? applyTelegramUnifiedFilter() : [],
  roblox: () => typeof applyRobloxFilter === "function" ? applyRobloxFilter() : [],
  donate: () => typeof applyDonateFilter === "function" ? applyDonateFilter() : [],
  dessluhub: () => typeof applyDessluHubFilter === "function" ? applyDessluHubFilter() : [],
  giftary: () => typeof applyGiftaryFilter === "function" ? applyGiftaryFilter() : [],
  neural: () => typeof applyNeuralFilter === "function" ? applyNeuralFilter() : [],
  account: () => typeof applyAccountFilter === "function" ? applyAccountFilter() : []
};

function updateMergedDeals() {
  const allDeals = [...document.querySelectorAll("a[href^='/deal/']")];
  const results = new Set();
  
  if (activeCategories.size === 0) {
    currentDeals = [];
    clearHighlight();
    updateInfo(0);
    updateOpenBtn();
    return;
  }

  activeCategories.forEach(key => {
    // Если есть специальная функция фильтрации для этой категории (сложная категория)
    if (FILTER_FUNCTIONS[key]) {
      const catResults = FILTER_FUNCTIONS[key]();
      if (Array.isArray(catResults)) {
        catResults.forEach(d => results.add(d));
      }
      return;
    }

    // Обычная фильтрация по ключевым словам (простая категория)
    const cat = CATEGORIES[key];
    allDeals.forEach(c => {
      const t = c.innerText.toLowerCase();
      let match = false;
      if (cat.exclude && cat.exclude.some(k => t.includes(k))) return;
      if (typeof cat.match === "function") match = cat.match(t);
      else match = cat.keywords && cat.keywords.some(k => t.includes(k));
      
      if (match) results.add(c);
    });
  });

  currentDeals = [...results];
  // Используем цвет первой выбранной категории или дефолтный
  const firstKey = [...activeCategories][0];
  highlightDeals(currentDeals, CATEGORIES[firstKey]?.color || "#6366f1");
  updateInfo(currentDeals.length);
  updateOpenBtn();
}

function addSimple(parent, key) {
  const b = document.createElement("div");
  b.className = "dist-btn";
  b.textContent = `${CATEGORIES[key].emoji} ${CATEGORIES[key].title}`;
  b.onclick = () => {
    if (activeCategories.has(key)) {
      activeCategories.delete(key);
      b.classList.remove("active");
      b.style.boxShadow = "";
      b.style.border = "1px solid transparent";
    } else {
      activeCategories.add(key);
      b.classList.add("active");
      b.style.boxShadow = `0 0 12px ${CATEGORIES[key].color}`;
      b.style.border = `1px solid ${CATEGORIES[key].color}`;
    }
    updateMergedDeals();
  };
  parent.appendChild(b);
}
// Функции addGridBtn и остальные вынесены в builders.js
function reapplyCurrentFilter() {
  if (!activeCategory) return;
  const filters = {
    telegram: typeof applyTelegramUnifiedFilter === "function" ? applyTelegramUnifiedFilter : null,
    uc: typeof applyUCFilter === "function" ? applyUCFilter : null,
    robloxpromo: typeof applyRobloxPromoFilter === "function" ? applyRobloxPromoFilter : null,
    roblox: typeof applyRobloxFilter === "function" ? applyRobloxFilter : null,
    giftcard: typeof applyGiftCardFilter === "function" ? applyGiftCardFilter : null,
    giftary: typeof applyGiftaryFilter === "function" ? applyGiftaryFilter : null,
    dessluhub: typeof applyDessluHubFilter === "function" ? applyDessluHubFilter : null,
    donate: typeof applyDonateFilter === "function" ? applyDonateFilter : null,
    neural: typeof applyNeuralFilter === "function" ? applyNeuralFilter : null,
    account: typeof applyAccountFilter === "function" ? applyAccountFilter : null,
    promo: () => triggerSimpleFilter("promo"),
    keys: () => triggerSimpleFilter("keys"),
    steamgift: () => triggerSimpleFilter("steamgift"),
    mobilelegends: () => triggerSimpleFilter("mobilelegends"),
    arena: () => triggerSimpleFilter("arena"),
    notion: () => triggerSimpleFilter("notion"),
    chesscom: () => triggerSimpleFilter("chesscom")
  };
  if (filters[activeCategory]) filters[activeCategory]();
}

function triggerSimpleFilter(key) {
  const deals = [...document.querySelectorAll("a[href^='/deal/']")].filter(c => {
    const t = c.innerText.toLowerCase(); const cat = CATEGORIES[key];
    if (cat.exclude && cat.exclude.some(k => t.includes(k))) return false;
    if (typeof cat.match === "function") return cat.match(t);
    return cat.keywords.some(k => t.includes(k));
  });
  currentDeals = deals; 
  highlightDeals(deals, CATEGORIES[key].color); 
  updateInfo(deals.length); 
  updateOpenBtn();
}

function startOptimizedObserver() {
  const handleMutation = () => {
    clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => { 
      mountGreetingButton(); 
      refreshGreetingUi(); 
      updateMergedDeals();
    }, 500);
  };
  mutationObserver = new MutationObserver(handleMutation);
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

// СТАТИСТИКА — заглушки
const STATS_KEY = "dist_stats_v1";
function getTodayKey() { const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function loadStats() { try{return JSON.parse(localStorage.getItem(STATS_KEY)||"{}");}catch(_){return{};} }
function saveStats(d) { try{localStorage.setItem(STATS_KEY,JSON.stringify(d));}catch(_){} }
function recordDealStat(cat) { const data=loadStats(),today=getTodayKey(); if(!data[today])data[today]={}; data[today][cat||"unknown"]=(data[today][cat||"unknown"]||0)+1; saveStats(data); }
function openStatsPopup() {
  document.querySelector("#dist-stats-popup")?.remove();
  const data=loadStats(),today=getTodayKey(),todayData=data[today]||{};
  const total=Object.values(todayData).reduce((a,b)=>a+b,0);
  let week=0; for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i);const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");if(data[k])week+=Object.values(data[k]).reduce((a,b)=>a+b,0);}
  const sorted=Object.entries(todayData).sort((a,b)=>b[1]-a[1]);
  const CAT={"telegram":"📞 Telegram","uc":"🎮 PUBG UC","roblox":"🎮 Roblox","donate":"💎 Донат","giftcard":"💳 Карты","promo":"🏷️ Промо","keys":"🔑 Ключи","neural":"🧠 Нейросети","giftary":"🎁 Giftary","mobilelegends":"⚔️ MLBB","steamgift":"🎁 Steam","unknown":"❓ Другое"};
  const popup=document.createElement("div");
  popup.id="dist-stats-popup";
  popup.style.cssText="position:fixed;width:260px;background:rgba(8,12,24,0.97);backdrop-filter:blur(20px);border:1px solid rgba(99,102,241,0.22);border-radius:16px;padding:14px;z-index:9999998;font-family:Inter,sans-serif;color:#e2e8f0;box-shadow:0 20px 40px rgba(0,0,0,0.6);cursor:move;";
  let rows=sorted.length?sorted.map(([c,n])=>{const pct=Math.round(n/sorted[0][1]*100);return '<div style="margin-bottom:7px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span style="color:#cbd5e1">'+(CAT[c]||c)+'</span><span style="color:#6366f1;font-weight:700">'+n+'</span></div><div style="height:4px;background:rgba(51,65,85,0.5);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:3px"></div></div></div>';}).join(""):'<div style="font-size:11px;color:#475569;text-align:center;padding:12px 0">Сегодня сделок ещё нет</div>';
  popup.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;user-select:none"><div style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6)"></div><span style="font-size:12px;font-weight:700;color:#e2e8f0;flex:1">Статистика</span><div id="dist-stats-close" style="cursor:pointer;color:#475569;font-size:16px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(51,65,85,0.4)">×</div></div><div style="display:flex;gap:8px;margin-bottom:12px"><div style="flex:1;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:8px;text-align:center"><div style="font-size:22px;font-weight:900;color:#6366f1">'+total+'</div><div style="font-size:10px;color:#475569;margin-top:2px">сегодня</div></div><div style="flex:1;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:8px;text-align:center"><div style="font-size:22px;font-weight:900;color:#8b5cf6">'+week+'</div><div style="font-size:10px;color:#475569;margin-top:2px">за 7 дней</div></div></div><div style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#475569;margin-bottom:8px">По категориям</div><div>'+rows+'</div>';
  document.body.appendChild(popup);
  // Позиция
  const SPOS="dist_stats_pos_v1"; try{const p=JSON.parse(localStorage.getItem(SPOS)||"null");if(p&&Number.isFinite(p.x)){popup.style.left=p.x+"px";popup.style.top=p.y+"px";popup.style.right="auto";}else{popup.style.right="70px";popup.style.top="60px";}}catch(_){popup.style.right="70px";popup.style.top="60px";}
  // Drag
  let dr=false,sx=0,sy=0,bx=0,by=0;
  popup.querySelector("div").addEventListener("mousedown",e=>{if(e.target.id==="dist-stats-close")return;dr=true;sx=e.clientX;sy=e.clientY;bx=popup.offsetLeft;by=popup.offsetTop;e.preventDefault();});
  document.addEventListener("mousemove",e=>{if(!dr)return;popup.style.right="auto";popup.style.left=(bx+e.clientX-sx)+"px";popup.style.top=(by+e.clientY-sy)+"px";});
  document.addEventListener("mouseup",()=>{if(!dr)return;dr=false;try{localStorage.setItem(SPOS,JSON.stringify({x:popup.offsetLeft,y:popup.offsetTop}));}catch(_){}});
  popup.querySelector("#dist-stats-close").onclick=()=>popup.remove();
  setTimeout(()=>{document.addEventListener("click",function sc(e){if(!popup.contains(e.target)&&e.target.id!=="dist-stats-btn"){popup.remove();document.removeEventListener("click",sc);}});},0);
}

// ИЗБРАННЫЕ НОМИНАЛЫ — заглушки
const FAV_SUBS_KEY="dist_fav_subs_v1";
let favSubs=[];
function loadFavSubs(){try{favSubs=JSON.parse(localStorage.getItem(FAV_SUBS_KEY)||"[]");}catch(_){favSubs=[];}}
function saveFavSubs(){try{localStorage.setItem(FAV_SUBS_KEY,JSON.stringify(favSubs));}catch(_){}}
function isFavSub(id){return favSubs.some(f=>f.id===id);}
function toggleFavSub(id,label,category,value){if(isFavSub(id)){favSubs=favSubs.filter(f=>f.id!==id);}else{favSubs.unshift({id,label,category,value});}saveFavSubs();renderFavSubsBlock();}
function renderFavSubsBlock(){const c=document.querySelector("#dist-fav-subs");if(!c)return;c.innerHTML="";if(!favSubs.length){c.style.display="none";return;}c.style.display="block";const lbl=document.createElement("div");lbl.style.cssText="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#6366f1;margin-bottom:5px;padding:0 2px";lbl.textContent="⭐ Избранные номиналы";c.appendChild(lbl);const grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-bottom:6px";favSubs.forEach(fav=>{const btn=document.createElement("div");btn.style.cssText="padding:5px 4px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:8px;font-size:11px;text-align:center;cursor:pointer;color:#c7d2fe;transition:.15s";btn.textContent=fav.label;btn.onmouseover=()=>{btn.style.background="rgba(99,102,241,0.2)";};btn.onmouseout=()=>{btn.style.background="rgba(99,102,241,0.1)";};btn.onclick=()=>{document.querySelectorAll("#dist-buttons .dist-btn").forEach(b=>{if(b.textContent.includes(getCategoryTitle(fav.category))&&activeCategory!==fav.category)b.click();});setTimeout(()=>{document.querySelectorAll(".sub-btn").forEach(sb=>{if(sb.querySelector("span")?.textContent.trim()===fav.label||sb.textContent.trim()===fav.label)sb.click();});},50);};grid.appendChild(btn);});c.appendChild(grid);const div=document.createElement("div");div.className="dist-divider";c.appendChild(div);}
function getCategoryTitle(cat){const m={telegram:"Telegram",uc:"PUBG",roblox:"Roblox",donate:"Донат",giftcard:"Подарочная",neural:"Нейросети",giftary:"Giftary"};return m[cat]||cat;}
loadFavSubs();
function createPanel() {
  const panel = document.createElement("div");
  panel.id = "distribution-panel";
  panel.style.cssText = `
    position:fixed;right:20px;top:5%;
    width:270px;max-height:88vh;min-width:260px;min-height:200px;
    background:linear-gradient(165deg, rgba(12, 16, 32, 0.92), rgba(8, 10, 24, 0.96));
    backdrop-filter:blur(24px) saturate(160%);-webkit-backdrop-filter:blur(24px) saturate(160%);
    border:1px solid rgba(99, 102, 241, 0.25);color:#f1f5f9;border-radius:24px;
    box-shadow:0 20px 50px -12px rgba(0,0,0,0.8), 0 0 40px rgba(99,102,241,0.08), inset 0 1px 1px rgba(255,255,255,0.05);
    padding:16px;z-index:999999;font-family:'Outfit', 'Inter', system-ui, sans-serif;display:none;
    overflow:hidden;transition:transform .3s cubic-bezier(0.4, 0, 0.2, 1);
    resize: both;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
    @keyframes dist-icon-pulse{0%,100%{box-shadow:0 6px 24px rgba(0,0,0,0.5),0 0 30px rgba(99,102,241,0.2);transform:scale(1)}50%{box-shadow:0 6px 24px rgba(0,0,0,0.5),0 0 45px rgba(99,102,241,0.4);transform:scale(1.05)}}
    @keyframes dist-fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes dist-panel-in{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes dist-open-pulse{0%,100%{box-shadow:0 4px 15px rgba(34,197,94,0.2)}50%{box-shadow:0 4px 25px rgba(34,197,94,0.45),0 0 40px rgba(34,197,94,0.15)}}
    @keyframes dist-open-ripple{0%{transform:scale(0);opacity:0.5}100%{transform:scale(2.5);opacity:0}}
    @keyframes dist-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    #distribution-panel *,#dist-mot-popup *,#dist-links-popup *{box-sizing:border-box}
    #distribution-panel::-webkit-resizer { background: transparent; }
    #distribution-panel::-webkit-scrollbar,#distribution-panel *::-webkit-scrollbar{width:5px;height:5px}
    #distribution-panel::-webkit-scrollbar-track,#distribution-panel *::-webkit-scrollbar-track{background:rgba(15,23,42,0.3);border-radius:10px}
    #distribution-panel::-webkit-scrollbar-thumb,#distribution-panel *::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(99,102,241,0.4),rgba(139,92,246,0.3));border-radius:10px;border:1px solid rgba(99,102,241,0.15)}
    #distribution-panel::-webkit-scrollbar-thumb:hover,#distribution-panel *::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,rgba(99,102,241,0.6),rgba(139,92,246,0.5))}
    .dist-btn{padding:8px 10px;background:rgba(255,255,255,0.03);border-radius:12px;margin-bottom:6px;cursor:pointer;font-size:12px;font-weight:600;border:1px solid rgba(255,255,255,0.06);color:#cbd5e1;transition:all .25s cubic-bezier(0.4, 0, 0.2, 1);display:flex;align-items:center;gap:8px;letter-spacing:.2px;position:relative;overflow:hidden}
    .dist-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,transparent 40%,rgba(99,102,241,0.06) 50%,transparent 60%);background-size:200% 100%;animation:dist-shimmer 3s ease-in-out infinite;pointer-events:none}
    .dist-btn:hover{background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.4);color:#f8fafc;box-shadow:0 8px 20px -8px rgba(99,102,241,0.4);transform:translateY(-1px) scale(1.01)}
    .dist-btn:active{transform:translateY(0) scale(0.98)}
    .dist-btn.active{background:rgba(99,102,241,0.2);border-color:rgba(99,102,241,0.6);color:#fff;box-shadow:0 0 15px rgba(99,102,241,0.3)}
    .sub-all{padding:6px 10px;background:rgba(255,255,255,0.05);border-radius:10px;text-align:center;cursor:pointer;margin:6px 0;border:1px solid rgba(255,255,255,0.08);color:#94a3b8;font-size:10px;font-weight:700;transition:all .2s ease;letter-spacing:.5px;text-transform:uppercase}
    .sub-all:hover{border-color:rgba(99,102,241,0.5);color:#fff;background:rgba(99,102,241,0.15);box-shadow:0 4px 12px rgba(99,102,241,0.2)}
    .sub-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px;background:rgba(0,0,0,0.2);border-radius:14px;margin-bottom:8px;max-height:42vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.04);animation:dist-fade-in .3s ease}
    .sub-btn{padding:6px 4px;background:rgba(255,255,255,0.03);border-radius:9px;font-size:11px;font-weight:600;text-align:center;cursor:pointer;border:1px solid rgba(255,255,255,0.05);color:#94a3b8;transition:all .15s ease;display:flex;align-items:center;justify-content:center}
    .sub-btn:hover{border-color:rgba(99,102,241,0.5);color:#fff;background:rgba(99,102,241,0.1);box-shadow:0 0 12px rgba(99,102,241,0.15)}
    .sub-btn.active, .sub-all.active{border-color:#6366f1;background:rgba(99,102,241,0.2);color:#fff;box-shadow:0 0 12px rgba(99,102,241,0.3)}
    .sub-label{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:#64748b;margin:12px 0 6px 4px}
    .dist-icon{cursor:pointer;font-size:14px;transition:all .2s cubic-bezier(0.4, 0, 0.2, 1);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#94a3b8}
    .dist-icon:hover{background:rgba(99,102,241,0.15);border-color:rgba(99,102,241,0.5);color:#fff;transform:scale(1.1);box-shadow:0 0 15px rgba(99,102,241,0.3)}
    .dist-control-wrap{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}
    .dist-input{width:100%;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);color:#f1f5f9;border-radius:10px;padding:8px 12px;font-size:12px;font-family:inherit;outline:none;transition:all .2s ease}
    .dist-input:focus{border-color:rgba(99,102,241,0.6);box-shadow:0 0 0 3px rgba(99,102,241,0.15)}
    .dist-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(99,102,241,0.3),transparent);margin:12px 0;position:relative}
    .dist-badge{position:absolute;top:-4px;right:-4px;background:linear-gradient(135deg,#ef4444,#f87171);color:white;font-size:9px;font-weight:800;padding:2px 6px;border-radius:12px;box-shadow:0 2px 8px rgba(239,68,68,0.4)}
    #dist-open.dist-open-ready{animation:dist-open-pulse 2s ease-in-out infinite;background:linear-gradient(135deg,rgba(34,197,94,0.25),rgba(16,185,129,0.18))!important;border-color:rgba(34,197,94,0.5)!important;color:#86efac!important}
    #dist-open .dist-open-ripple{position:absolute;border-radius:50%;background:rgba(34,197,94,0.4);width:20px;height:20px;animation:dist-open-ripple .6s ease-out forwards;pointer-events:none}
    #dist-autocopy-toggle:checked + span {
      background: rgba(99,102,241,0.6);
    }
    #dist-autocopy-toggle:checked + span + span {
      transform: translateX(20px);
      background: #6366f1;
    }
  `;
  document.head.appendChild(style);

  panel.innerHTML = `
    <div id="dist-drag-handle" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding:6px 8px;border-radius:12px;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));border:1px solid rgba(99,102,241,0.3);cursor:move;user-select:none;box-shadow:0 2px 12px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.05)">
      <div style="display:flex;align-items:center;gap:5px">
        <div style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7)"></div>
        <span style="font-weight:700;font-size:11px;letter-spacing:.1px;color:#e2e8f0;white-space:nowrap">Распределение</span>
      </div>
      <div style="display:flex;flex-direction:row;gap:3px;align-items:center"><div id="dist-flappy-btn" class="dist-icon" title="Flappy Bird" style="width:20px;height:20px;font-size:11px">🐦</div><div id="dist-slots-btn" class="dist-icon" title="Слоты" style="width:20px;height:20px;font-size:11px">🎰</div><div id="dist-stats-btn" class="dist-icon" title="Статистика" style="width:20px;height:20px;font-size:11px">📊</div><div id="dist-motivator-btn" class="dist-icon" title="Мотиватор" style="width:20px;height:20px;font-size:11px">🏆</div><div id="dist-refresh" class="dist-icon" title="Сбросить" style="width:20px;height:20px;font-size:11px">↻</div><div id="dist-close" class="dist-icon" title="Свернуть" style="width:20px;height:20px;font-size:13px;font-weight:300">−</div></div>
      </div>
    </div>
    <div id="dist-fav-subs" style="display:none;padding:0 2px 0;"></div>
    <div id="dist-buttons" style="overflow-y:auto;max-height:50vh;padding-right:3px;margin-bottom:8px"></div>
    <div class="dist-divider"></div>
    <div id="dist-info" style="padding:10px 14px;margin:6px 0;font-size:11px;font-weight:600;color:#c7d2fe;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.08));border-radius:10px;border:1px solid rgba(99,102,241,0.25);text-align:center;box-shadow:0 2px 10px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.05);transition:all .3s ease">Выделение снято</div>
    <div class="dist-control-wrap">
      <input id="dist-open-count" class="dist-input" type="number" min="1" step="1" placeholder="Кол-во" />
      <select id="dist-open-from" class="dist-input">
        <option value="start">С начала</option>
        <option value="end">С конца</option>
      </select>
    </div>
    <div id="dist-open" class="dist-btn" style="justify-content:center;font-weight:700;font-size:12px;background:linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.15));border:1px solid rgba(99,102,241,0.4);color:#c7d2fe;margin-bottom:6px;box-shadow:0 4px 15px rgba(99,102,241,0.2);position:relative;overflow:hidden"><span id="dist-open-icon" style="font-size:14px;transition:transform .3s ease">▶</span> <span id="dist-open-text">Открыть сделки</span> <span id="dist-open-count-badge" style="display:none;margin-left:4px;padding:2px 7px;background:linear-gradient(135deg,#22c55e,#10b981);color:#fff;font-size:10px;font-weight:800;border-radius:20px;min-width:18px;text-align:center;box-shadow:0 2px 8px rgba(34,197,94,0.4)">0</span></div>
    <div class="dist-divider"></div>
    <div id="dist-autocopy-section" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;margin:6px 0;background:rgba(99,102,241,0.08);border-radius:10px;border:1px solid rgba(99,102,241,0.2)">
      <span style="font-size:11px;font-weight:600;color:#c7d2fe">Автокопирование</span>
      <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer">
        <input type="checkbox" id="dist-autocopy-toggle" style="opacity:0;width:0;height:0">
        <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(51,65,85,0.6);border-radius:24px;transition:.3s;border:1px solid rgba(99,102,241,0.3)"></span>
        <span style="position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background:#94a3b8;border-radius:50%;transition:.3s"></span>
      </label>
    </div>
    <div id="dist-template-settings" class="dist-btn" style="margin-top:6px;color:#94a3b8;font-size:11px;background:rgba(15,23,42,0.4);border:1px solid rgba(51,65,85,0.3)">✏️ <span>Имя шаблона</span></div>
    <div id="dist-template-current" style="margin-top:3px;font-size:10px;color:#475569;padding-left:4px">Имя: не задано</div>
  `;
  document.body.appendChild(panel);
  enablePanelDragging(panel);

  const savedPos = loadPanelPosition();
  if (savedPos) applyPanelPosition(panel, savedPos.x, savedPos.y);

  // Восстанавливаем масштаб и размер
  let rawScale = localStorage.getItem('dist_panel_scale_v2');
  let panelScale = parseFloat(rawScale);
  if (isNaN(panelScale) || panelScale < 0.7) panelScale = 1.0;
  
  panel.style.transform = "scale(" + panelScale + ")";
  panel.style.transformOrigin = "top right";

  try {
    const sz = JSON.parse(localStorage.getItem('dist_panel_size_v2') || 'null');
    if (sz && sz.w && sz.h && sz.w > 100 && sz.h > 100) { 
      panel.style.width = sz.w + 'px'; 
      panel.style.height = sz.h + 'px'; 
    }
  } catch(_) {}

  // Сохраняем размер при изменении
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        try { localStorage.setItem('dist_panel_size_v2', JSON.stringify({ w: Math.round(width+32), h: Math.round(height+32) })); } catch(_) {}
      }
    });
    ro.observe(panel);
  }

  const btns = panel.querySelector("#dist-buttons");
  addTelegram(btns); addUC(btns); addRoblox(btns); addDonate(btns); addGiftCard(btns);
  addSimple(btns, "promo"); addSimple(btns, "keys"); addNeural(btns); addSimple(btns, "steamgift");
  addGiftary(btns); addDessluHub(btns); addSimple(btns, "mobilelegends"); addSimple(btns, "arena");
  addAccount(btns);
  addSimple(btns, "notion"); addSimple(btns, "chesscom");

  const openCountInput = panel.querySelector("#dist-open-count");
  if (openCountInput) openCountInput.addEventListener("input", () => { const n=Number(openCountInput.value); if(!Number.isFinite(n)||n<1) return; openCountInput.value=String(Math.floor(n)); });
  panel.querySelector("#dist-template-settings").onclick = () => { if (typeof window.openGreetingNamePrompt === "function") window.openGreetingNamePrompt(); };

  // Open deals button with click ripple animation
  panel.querySelector("#dist-open").onclick = (e) => {
    // Ripple effect
    const btn = panel.querySelector("#dist-open");
    const ripple = document.createElement("span");
    ripple.className = "dist-open-ripple";
    const rect = btn.getBoundingClientRect();
    ripple.style.left = (e.clientX - rect.left - 10) + "px";
    ripple.style.top = (e.clientY - rect.top - 10) + "px";
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    // Rotate icon briefly
    const icon = btn.querySelector("#dist-open-icon");
    if (icon) { icon.style.transform = "scale(1.3)"; setTimeout(() => { icon.style.transform = ""; }, 300); }

    openDeals();
  };

  // Initialize auto-copy toggle
  const autoCopyToggle = panel.querySelector('#dist-autocopy-toggle');
  const autoCopyEnabled = localStorage.getItem('dist_autocopy_enabled');
  
  // Default to enabled if not set
  if (autoCopyEnabled === null) {
    localStorage.setItem('dist_autocopy_enabled', 'true');
    autoCopyToggle.checked = true;
  } else {
    autoCopyToggle.checked = autoCopyEnabled === 'true';
  }
  
  // Update visual state
  updateToggleVisual(autoCopyToggle);
  
  // Add change listener
  autoCopyToggle.addEventListener('change', () => {
    const isEnabled = autoCopyToggle.checked;
    localStorage.setItem('dist_autocopy_enabled', isEnabled ? 'true' : 'false');
    updateToggleVisual(autoCopyToggle);
    if (typeof showMiniStatus === 'function') {
      showMiniStatus(isEnabled ? '✅ Автокопирование включено' : '⏸️ Автокопирование выключено');
    }
  });
  
  function updateToggleVisual(toggle) {
    const slider = toggle.nextElementSibling;
    const knob = slider.nextElementSibling;
    if (toggle.checked) {
      slider.style.background = 'rgba(99,102,241,0.6)';
      knob.style.transform = 'translateX(20px)';
      knob.style.background = '#6366f1';
    } else {
      slider.style.background = 'rgba(51,65,85,0.6)';
      knob.style.transform = 'translateX(0)';
      knob.style.background = '#94a3b8';
    }
  }

  // Ctrl+scroll для масштабирования панели
  panel.addEventListener("wheel", e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    panelScale = Math.max(0.7, Math.min(2.5, panelScale + (e.deltaY < 0 ? 0.05 : -0.05)));
    panel.style.transform = "scale(" + panelScale + ")";
    panel.style.transformOrigin = "top right";
    try { localStorage.setItem('dist_panel_scale_v2', panelScale); } catch(_) {}
  }, { passive: false });
  panel.querySelector("#dist-refresh").onclick = () => resetState("Обновлено");
  panel.querySelector("#dist-stats-btn").onclick = e => { e.stopPropagation(); openStatsPopup(); };
  renderFavSubsBlock();

  // ── Иконка ⏰ ──
  const icon = document.createElement("div");
  icon.id = "dist-icon-btn";
  icon.textContent = "⏰";
  icon.style.cssText = `position:fixed;font-size:22px;cursor:grab;z-index:999999;user-select:none;width:48px;height:48px;border-radius:16px;background:linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.15));backdrop-filter:blur(16px);border:1px solid rgba(99,102,241,0.4);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(0,0,0,0.5),0 0 30px rgba(99,102,241,0.2),inset 0 1px 0 rgba(255,255,255,0.1);animation:dist-icon-pulse 3s ease-in-out infinite;`;
  document.body.appendChild(icon);

  // Устанавливаем начальную позицию без transform
  const savedIconPos = loadIconPosition();
  if (savedIconPos) {
    icon.style.left = savedIconPos.x + "px";
    icon.style.top = savedIconPos.y + "px";
  } else {
    icon.style.right = "20px";
    icon.style.top = "50%";
    // Позиционируем через JS после рендера
    requestAnimationFrame(() => {
      const y = Math.round((window.innerHeight - icon.offsetHeight) / 2);
      const x = window.innerWidth - icon.offsetWidth - 20;
      icon.style.right = "auto";
      icon.style.left = x + "px";
      icon.style.top = y + "px";
      saveIconPosition(x, y);
    });
  }

  let iconMoved = false;

  function enableIconDragging(icon) {
    let dragging = false;
    let startX = 0, startY = 0;

    icon.addEventListener("mousedown", e => {
      if (e.button !== 0) return;
      dragging = true;
      iconMoved = false;
      startX = e.clientX - icon.offsetLeft;
      startY = e.clientY - icon.offsetTop;
      e.preventDefault();
    });

    document.addEventListener("mousemove", e => {
      if (!dragging) return;
      const dx = Math.abs(e.clientX - startX - icon.offsetLeft);
      const dy = Math.abs(e.clientY - startY - icon.offsetTop);
      if (dx > 5 || dy > 5) iconMoved = true;
      icon.style.left = (e.clientX - startX) + "px";
      icon.style.top = (e.clientY - startY) + "px";
    });

    document.addEventListener("mouseup", e => {
      if (!dragging) return;
      dragging = false;
      if (iconMoved) {
        saveIconPosition(icon.offsetLeft, icon.offsetTop);
      }
    });
  }

  enableIconDragging(icon);

  icon.onclick = (e) => {
    if (iconMoved) {
      e.preventDefault();
      e.stopPropagation();
      iconMoved = false;
      return;
    }
    panel.style.opacity = "0";
    panel.style.left = "auto"; panel.style.right = "20px";
    panel.style.top = "5%"; 
    panel.style.transform = "scale(" + panelScale + ")";
    panel.style.transformOrigin = "top right";

    try { localStorage.removeItem(PANEL_POS_KEY); } catch (_) {}
    icon.style.display = "none";
    panel.style.display = "block";
    
    requestAnimationFrame(() => {
      panel.style.opacity = "1";
      panel.style.transition = "opacity .25s ease, transform .3s cubic-bezier(0.4, 0, 0.2, 1)";
    });
    if (typeof window._distShowMotivator === "function") window._distShowMotivator();
    if (typeof window._distShowLinks === "function") window._distShowLinks();
  };

  panel.querySelector("#dist-close").onclick = () => {
    panel.style.display = "none";
    icon.style.display = "flex";
    const mot = document.querySelector("#dist-mot-popup");
    if (mot) mot.style.display = "none";
    const lp = document.querySelector("#dist-links-popup");
    if (lp) lp.style.display = "none";
    const stats = document.querySelector("#dist-stats-popup");
    if (stats) stats.style.display = "none";
  };

  // ── утилита: перетаскивание плавающего попапа ──
  function makeFloatingPopup(el, posKey, defaultPos) {
    try {
      const raw = localStorage.getItem(posKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
          el.style.left = p.x + "px"; el.style.top = p.y + "px"; el.style.right = "auto";
        }
      } else {
        el.style.left = defaultPos.x + "px"; el.style.top = defaultPos.y + "px"; el.style.right = "auto";
      }
    } catch (_) { el.style.left = defaultPos.x + "px"; el.style.top = defaultPos.y + "px"; }

    const handle = el.firstElementChild; if (!handle) return;
    handle.style.cursor = "move";
    let drag = false, sx = 0, sy = 0, bx = 0, by = 0;
    handle.addEventListener("mousedown", e => {
      if (e.target.closest("button,[id$='-close']")) return;
      if (e.button !== 0) return;
      drag = true; sx = e.clientX; sy = e.clientY; bx = el.offsetLeft; by = el.offsetTop; e.preventDefault();
    });
    const onMove = e => { if (!drag) return; el.style.right="auto"; el.style.left=(bx+e.clientX-sx)+"px"; el.style.top=(by+e.clientY-sy)+"px"; };
    const onUp = () => { if (!drag) return; drag=false; try{localStorage.setItem(posKey,JSON.stringify({x:el.offsetLeft,y:el.offsetTop}));}catch(_){} };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  // ── Мотиватор (уменьшен, скрывается с панелью) ──
  (function initMotivator() {
    const MOTIVATOR_KEY = "dist_motivator_v1";
    const MOTIVATOR_POS = "dist_motivator_pos_v1";
    try { const s=JSON.parse(localStorage.getItem(MOTIVATOR_KEY)||"{}"); if(Number.isFinite(s.count)) dealCount=Math.max(0,s.count); if(Number.isFinite(s.goal)&&s.goal>=1) dealGoal=s.goal; } catch(_){}
    function saveMotivator() { try{localStorage.setItem(MOTIVATOR_KEY,JSON.stringify({count:dealCount,goal:dealGoal}));}catch(_){} }
    const MESSAGES = [[0,"Начинаем! 💪"],[25,"Хорошее начало! 🔥"],[50,"Половина пути! ⚡"],[75,"Почти у цели! 🚀"],[100,"Цель достигнута! 🏆"]];

    const popup = document.createElement("div");
    popup.id = "dist-mot-popup";
    popup.style.cssText = `position:fixed;width:190px;min-width:150px;min-height:100px;background:rgba(8,12,24,0.94);overflow:auto;backdrop-filter:blur(20px);border:1px solid rgba(99,102,241,0.22);border-radius:14px;padding:10px;z-index:9999998;font-family:Inter,sans-serif;color:#e2e8f0;box-shadow:0 16px 32px rgba(0,0,0,0.6);display:none;`;
    popup.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;user-select:none">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f59e0b);box-shadow:0 0 5px rgba(251,191,36,0.5)"></div>
          <span style="font-size:11px;font-weight:700;color:#e2e8f0">Мотиватор</span>
        </div>
        <div id="mot-pop-close" style="cursor:pointer;color:#475569;font-size:16px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(51,65,85,0.4)">×</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px">
        <div id="mot-pop-minus" style="width:28px;height:28px;background:rgba(51,65,85,0.4);border:1px solid rgba(51,65,85,0.6);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;color:#94a3b8;user-select:none">−</div>
        <div id="mot-pop-count" style="font-size:32px;font-weight:900;color:#6366f1;min-width:50px;text-align:center;text-shadow:0 0 16px rgba(99,102,241,0.4)">0</div>
        <div id="mot-pop-plus" style="width:28px;height:28px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;color:#a5b4fc;user-select:none">+</div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px">
        <span style="font-size:10px;color:#475569;white-space:nowrap">Цель</span>
        <input id="mot-pop-goal" type="number" min="1" value="10" style="width:40px;background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.5);color:#e2e8f0;border-radius:6px;padding:2px 5px;font-size:11px;outline:none;font-family:Inter,sans-serif" />
        <div style="flex:1;height:5px;background:rgba(15,23,42,0.8);border-radius:4px;overflow:hidden;border:1px solid rgba(51,65,85,0.3)">
          <div id="mot-pop-bar" style="height:100%;width:0%;border-radius:4px;transition:width .3s ease"></div>
        </div>
        <span id="mot-pop-pct" style="font-size:10px;font-weight:700;color:#6366f1;white-space:nowrap;min-width:24px;text-align:right">0%</span>
      </div>
      <div id="mot-pop-msg" style="font-size:10px;color:#86efac;text-align:center;min-height:12px"></div>
      <div id="mot-pop-reset" style="margin-top:7px;text-align:center;font-size:10px;color:#334155;cursor:pointer;padding:4px;border-radius:6px;background:rgba(15,23,42,0.5);border:1px solid rgba(51,65,85,0.3)">↺ Сбросить</div>
    `;
    document.body.appendChild(popup);
    makeFloatingPopup(popup, MOTIVATOR_POS, { x: window.innerWidth - 210, y: 60 });

    function renderPopup() {
      popup.querySelector("#mot-pop-count").textContent = dealCount;
      popup.querySelector("#mot-pop-goal").value = dealGoal;
      const pct = dealGoal > 0 ? Math.min(100, Math.round((dealCount/dealGoal)*100)) : 0;
      const bar = popup.querySelector("#mot-pop-bar");
      bar.style.width = pct + "%";
      bar.style.background = pct >= 100 ? "linear-gradient(90deg,#4ade80,#22d3ee)" : "linear-gradient(90deg,#38bdf8,#818cf8)";
      popup.querySelector("#mot-pop-pct").textContent = pct + "%";
      const msg = [...MESSAGES].reverse().find(([t]) => pct >= t);
      popup.querySelector("#mot-pop-msg").textContent = msg ? msg[1] : "";
    }
    renderPopup();

    popup.querySelector("#mot-pop-close").onclick = () => { popup.style.display = "none"; };
    popup.querySelector("#mot-pop-reset").onclick = () => { dealCount=0; renderPopup(); saveMotivator(); };
    popup.querySelector("#mot-pop-plus").onclick = () => { dealCount++; renderPopup(); saveMotivator(); };
    popup.querySelector("#mot-pop-minus").onclick = () => { if(dealCount>0){dealCount--;renderPopup();saveMotivator();} };
    popup.querySelector("#mot-pop-goal").addEventListener("change", e => { const v=parseInt(e.target.value,10); if(Number.isFinite(v)&&v>=1){dealGoal=v;renderPopup();saveMotivator();} });

    panel.querySelector("#dist-motivator-btn").onclick = e => {
      e.stopPropagation();
      popup.style.display = popup.style.display === "none" ? "block" : "none";
    };
    window._distShowMotivator = () => { popup.style.display = "block"; renderPopup(); };

    // Ctrl+scroll для масштабирования мотиватора
    let motScale = parseFloat(localStorage.getItem('dist_mot_scale_v1') || '1');
    popup.style.transform = 'scale(' + motScale + ')';
    popup.style.transformOrigin = 'top left';
    popup.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      motScale = Math.max(0.5, Math.min(3.0, motScale + (e.deltaY < 0 ? 0.05 : -0.05)));
      popup.style.transform = 'scale(' + motScale + ')';
      try { localStorage.setItem('dist_mot_scale_v1', String(motScale)); } catch(_) {}
    }, { passive: false });

    // ── Авто-счётчик: наблюдаем за текстом "покупатель проверяет товар" ──
    const TRIGGER_PHRASES = ["покупатель проверяет товар", "buyer is checking"];
    const seenNodes = new WeakSet();
    const autoObs = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1 || seenNodes.has(node)) continue;
          seenNodes.add(node);
          const text = (node.innerText || node.textContent || "").toLowerCase();
          if (TRIGGER_PHRASES.some(p => text.includes(p))) {
            dealCount++;
            renderPopup();
            saveMotivator();
            if (typeof recordDealStat === 'function') recordDealStat(typeof activeCategory !== 'undefined' ? activeCategory : 'unknown');
            // Мигание счётчика для визуального подтверждения
            const countEl = popup.querySelector("#mot-pop-count");
            if (countEl) {
              countEl.style.color = "#4ade80";
              setTimeout(() => { countEl.style.color = "#6366f1"; }, 800);
            }
          }
        }
      }
    });
    autoObs.observe(document.body, { childList: true, subtree: true });


  })();

  // ── Быстрые ссылки с редактором ──
  (function initQuickLinks() {
    const LINKS_POS = "dist_links_pos_v2";
    let services = loadServices();

    const lp = document.createElement("div");
    lp.id = "dist-links-popup";
    lp.style.cssText = `position:fixed;width:200px;right:20px;top:60%;background:rgba(8,12,24,0.94);backdrop-filter:blur(20px);border:1px solid rgba(99,102,241,0.22);border-radius:14px;padding:10px;z-index:9999998;font-family:Inter,sans-serif;box-shadow:0 16px 32px rgba(0,0,0,0.6);display:none;`;
    document.body.appendChild(lp);

    // Восстанавливаем позицию сервисов
    try {
      const sp = JSON.parse(localStorage.getItem(LINKS_POS) || 'null');
      if (sp && Number.isFinite(sp.x) && Number.isFinite(sp.y)) {
        lp.style.right = 'auto';
        lp.style.left = sp.x + 'px';
        lp.style.top = sp.y + 'px';
      }
    } catch(_) {}

    function renderLinks() {
      lp.innerHTML = "";
      const hdr = document.createElement("div");
      hdr.id = "dist-links-drag";
      hdr.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;user-select:none;cursor:move";
      hdr.innerHTML = '<div style="display:flex;align-items:center;gap:6px"><div style="width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#34d399,#10b981);box-shadow:0 0 5px rgba(52,211,153,0.5)"></div><span style="font-size:11px;font-weight:700;color:#e2e8f0">Сервисы</span></div><div style="display:flex;gap:4px;align-items:center"><div id="dist-links-edit" style="cursor:pointer;color:#475569;font-size:12px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(51,65,85,0.4)" title="Редактировать">✏️</div><div id="dist-links-close" style="cursor:pointer;color:#475569;font-size:16px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(51,65,85,0.4)">×</div></div>';
      lp.appendChild(hdr);

      // Перетаскивание попапа за заголовок
      let lpDrag = false, lpSX = 0, lpSY = 0, lpBX = 0, lpBY = 0;
      hdr.onmousedown = e => {
        if (e.target.id === "dist-links-edit" || e.target.id === "dist-links-close") return;
        if (e.button !== 0) return;
        lpDrag = true; lpSX = e.clientX; lpSY = e.clientY;
        lpBX = lp.offsetLeft; lpBY = lp.offsetTop;
        e.preventDefault();
      };

      const list = document.createElement("div");
      list.style.cssText = "display:flex;flex-direction:column;gap:4px";
      list.id = "dist-services-list";
      let dragItem = null;

      services.forEach(({ label, url, color }, i) => {
        const row = document.createElement("div");
        row.dataset.idx = i;
        row.style.cssText = "display:flex;align-items:center;gap:7px;padding:6px 8px;background:rgba(15,23,42,0.7);border:1px solid rgba(51,65,85,0.35);border-radius:8px;font-size:11px;font-weight:500;transition:all .15s ease;";
        const link = document.createElement("a");
        link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
        link.style.cssText = "display:flex;align-items:center;gap:7px;color:" + color + ";text-decoration:none;flex:1;";
        link.innerHTML = '<span style="width:5px;height:5px;border-radius:50%;background:' + color + ';flex-shrink:0;box-shadow:0 0 4px ' + color + '88"></span>' + label;
        row.appendChild(link);
        const dh = document.createElement("span");
        dh.style.cssText = "cursor:grab;font-size:10px;opacity:0.4;padding:0 2px;flex-shrink:0";
        dh.textContent = "⋮⋮";
        dh.onmousedown = e => {
          if (e.button !== 0) return;
          dragItem = row; row.style.opacity = "0.6"; e.preventDefault();
        };
        row.appendChild(dh);
        row.onmouseover = () => { if (!dragItem) { row.style.borderColor = color + "44"; row.style.background = "rgba(15,23,42,0.95)"; } };
        row.onmouseout = () => { if (!dragItem) { row.style.borderColor = "rgba(51,65,85,0.35)"; row.style.background = "rgba(15,23,42,0.7)"; } };
        list.appendChild(row);
      });

      lp.appendChild(list);
      lp.querySelector("#dist-links-close").onclick = () => { lp.style.display = "none"; };
      lp.querySelector("#dist-links-edit").onclick = () => openServicesEditor();

      // Единые обработчики drag (не накапливаются)
      lp._onMouseMove = e => {
        if (lpDrag) {
          lp.style.right = "auto";
          lp.style.left = (lpBX + e.clientX - lpSX) + "px";
          lp.style.top = (lpBY + e.clientY - lpSY) + "px";
        }
        if (!dragItem) return;
        list.querySelectorAll("[data-idx]").forEach(el => {
          el.style.borderColor = "rgba(51,65,85,0.35)";
          el.style.background = "rgba(15,23,42,0.7)";
        });
        const items = [...list.querySelectorAll("[data-idx]")];
        for (const el of items) {
          if (el === dragItem) continue;
          if (e.clientY < el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2) {
            el.style.borderColor = "#6366f1"; el.style.background = "rgba(99,102,241,0.2)"; break;
          }
        }
      };
      lp._onMouseUp = e => {
        if (lpDrag) {
          lpDrag = false;
          try { localStorage.setItem(LINKS_POS, JSON.stringify({ x: lp.offsetLeft, y: lp.offsetTop })); } catch(_) {}
        }
        if (!dragItem) return;
        const fromIdx = parseInt(dragItem.dataset.idx);
        const items = [...list.querySelectorAll("[data-idx]")];
        let toIdx = items.length;
        for (let i = 0; i < items.length; i++) {
          if (items[i] === dragItem) continue;
          if (e.clientY < items[i].getBoundingClientRect().top + items[i].getBoundingClientRect().height / 2) { toIdx = i; break; }
        }
        dragItem.style.opacity = "1";
        if (fromIdx !== toIdx) {
          const [item] = services.splice(fromIdx, 1);
          services.splice(toIdx > fromIdx ? toIdx - 1 : toIdx, 0, item);
          saveServices(services);
          renderLinks();
        }
        dragItem = null;
      };
    }

function openServicesEditor() {
      document.querySelector("#dist-svc-editor")?.remove();
      const overlay = document.createElement("div");
      overlay.id = "dist-svc-editor";
      overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999999;display:flex;align-items:center;justify-content:center;`;
      const box = document.createElement("div");
      box.style.cssText = `background:rgba(8,12,24,0.97);backdrop-filter:blur(20px);border:1px solid rgba(99,102,241,0.22);border-radius:16px;padding:14px;width:min(94vw,400px);max-height:85vh;display:flex;flex-direction:column;font-family:Inter,sans-serif;color:#e2e8f0;box-shadow:0 24px 60px rgba(0,0,0,.7);overflow:hidden;`;

      const hdr = document.createElement("div");
      hdr.style.cssText = `display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-shrink:0;`;
      hdr.innerHTML = `<div style="width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#34d399,#10b981);flex-shrink:0"></div><span style="font-size:13px;font-weight:700;color:#e2e8f0;flex:1">Редактор сервисов</span><div id="dist-svc-close" style="cursor:pointer;color:#475569;font-size:18px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(51,65,85,0.4)">×</div>`;
      box.appendChild(hdr);

      const scrollArea = document.createElement("div");
      scrollArea.style.cssText = `overflow-y:auto;flex:1;`;

      let editServices = services.map(s => ({ ...s }));

      function renderRows() {
        scrollArea.innerHTML = "";
        editServices.forEach((svc, i) => {
          const row = document.createElement("div");
          row.style.cssText = `display:flex;align-items:center;gap:6px;margin-bottom:6px;background:rgba(15,23,42,0.5);border:1px solid rgba(51,65,85,0.4);border-radius:9px;padding:7px 8px;`;
          row.innerHTML = `
            <input data-field="label" value="${svc.label}" placeholder="Название" style="flex:1;min-width:0;background:rgba(8,12,24,0.7);border:1px solid rgba(51,65,85,0.4);color:#e2e8f0;border-radius:6px;padding:4px 7px;font-size:11px;outline:none;font-family:Inter,sans-serif" />
            <input data-field="url" value="${svc.url}" placeholder="URL" style="flex:2;min-width:0;background:rgba(8,12,24,0.7);border:1px solid rgba(51,65,85,0.4);color:#e2e8f0;border-radius:6px;padding:4px 7px;font-size:11px;outline:none;font-family:Inter,sans-serif" />
            <input data-field="color" type="color" value="${svc.color}" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:5px;padding:0" />
            <div data-del="${i}" style="cursor:pointer;color:#ef4444;font-size:16px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:rgba(239,68,68,0.1);flex-shrink:0">×</div>
          `;
          row.querySelectorAll("[data-field]").forEach(inp => {
            inp.addEventListener("input", () => { editServices[i][inp.dataset.field] = inp.value; });
          });
          row.querySelector("[data-del]").onclick = () => { editServices.splice(i, 1); renderRows(); };
          scrollArea.appendChild(row);
        });
      }
      renderRows();
      box.appendChild(scrollArea);

      const footer = document.createElement("div");
      footer.style.cssText = `display:flex;gap:8px;justify-content:space-between;margin-top:10px;flex-shrink:0;padding-top:8px;border-top:1px solid rgba(99,102,241,0.12);`;
      footer.innerHTML = `
        <button id="dist-svc-add" style="padding:6px 12px;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.3);color:#6ee7b7;border-radius:9px;cursor:pointer;font-size:11px;font-family:Inter,sans-serif">+ Добавить</button>
        <div style="display:flex;gap:6px">
          <button id="dist-svc-cancel" style="padding:6px 14px;background:rgba(51,65,85,0.4);border:1px solid rgba(51,65,85,0.6);color:#94a3b8;border-radius:9px;cursor:pointer;font-size:12px;font-family:Inter,sans-serif">Отмена</button>
          <button id="dist-svc-save" style="padding:6px 14px;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;border-radius:9px;cursor:pointer;font-size:12px;font-weight:600;font-family:Inter,sans-serif">Сохранить</button>
        </div>
      `;
      box.appendChild(footer);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      hdr.querySelector("#dist-svc-close").onclick = () => overlay.remove();
      footer.querySelector("#dist-svc-cancel").onclick = () => overlay.remove();
      overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
      footer.querySelector("#dist-svc-add").onclick = () => {
        editServices.push({ id: "svc_" + Date.now(), label: "Новый", url: "https://", color: "#6366f1" });
        renderRows();
      };
      footer.querySelector("#dist-svc-save").onclick = () => {
        services = editServices.filter(s => s.label && s.url);
        saveServices(services);
        renderLinks();
        overlay.remove();
      };
    }

    renderLinks();
    window._distShowLinks = () => { lp.style.display = "block"; };

    // Ctrl+scroll для масштабирования сервисов
    let lpScale = parseFloat(localStorage.getItem('dist_lp_scale_v1') || '1');
    lp.style.transform = 'scale(' + lpScale + ')';
    lp.style.transformOrigin = 'top left';
    lp.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      lpScale = Math.max(0.5, Math.min(3.0, lpScale + (e.deltaY < 0 ? 0.05 : -0.05)));
      lp.style.transform = 'scale(' + lpScale + ')';
      try { localStorage.setItem('dist_lp_scale_v1', String(lpScale)); } catch(_) {}
    }, { passive: false });

    // ── Слоты 🎰 ──
  (function initSlots() {
  const SLOTS_KEY = "dist_slots_v1";
  const SLOTS_POS = "dist_slots_pos_v1";
  let balance = 0;
  try { const s = JSON.parse(localStorage.getItem(SLOTS_KEY)||"{}"); balance = s.balance||0; } catch(_){}
  function save() { try{localStorage.setItem(SLOTS_KEY,JSON.stringify({balance}));}catch(_){} }

  // Символы с весами и выплатами
  const SYMBOLS = [
    { s:"🍒", name:"cherry",  weight:20 },
    { s:"🍋", name:"lemon",   weight:18 },
    { s:"🍊", name:"orange",  weight:16 },
    { s:"🍇", name:"grape",   weight:14 },
    { s:"🍉", name:"melon",   weight:12 },
    { s:"🔔", name:"bell",    weight:10 },
    { s:"⭐", name:"star",    weight:7  },
    { s:"💎", name:"diamond", weight:3  }
  ];
  const PAYOUTS = { cherry:2, lemon:3, orange:4, grape:5, melon:6, bell:8, star:12, diamond:20 };
  const totalWeight = SYMBOLS.reduce((a,s)=>a+s.weight,0);

  function randSym() {
    let r = Math.random()*totalWeight, acc=0;
    for(const s of SYMBOLS){acc+=s.weight;if(r<acc)return s;}
    return SYMBOLS[0];
  }

  function calcWin(grid, bet) {
    // grid = 3x3 array [row][col]
    const lines = [
      [grid[0][0],grid[0][1],grid[0][2]], // top row
      [grid[1][0],grid[1][1],grid[1][2]], // mid row
      [grid[2][0],grid[2][1],grid[2][2]], // bot row
      [grid[0][0],grid[1][1],grid[2][2]], // diag
      [grid[0][2],grid[1][1],grid[2][0]], // diag2
    ];
    let totalWin = 0;
    const winLines = [];
    for(const line of lines){
      const counts = {};
      line.forEach(s=>{counts[s.name]=(counts[s.name]||0)+1;});
      const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      const [topName, topCount] = entries[0];
      if(topCount===3){
        const w = Math.round(bet * PAYOUTS[topName]);
        totalWin += w;
        winLines.push({line, mult:PAYOUTS[topName], win:w, type:"3x"});
      } else if(topCount===2 && line[1].name===topName){
        // 2 одинаковых в центре
        const w = Math.round(bet * 1.5);
        totalWin += w;
        winLines.push({line, mult:1.5, win:w, type:"2x"});
      }
    }
    // Бонус: любая вишня на поле
    const cherries = [].concat(...grid).filter(s=>s.name==="cherry").length;
    if(cherries===1){ totalWin += bet; winLines.push({type:"cherry1", win:bet}); }
    else if(cherries===2){ totalWin += Math.round(bet*2); winLines.push({type:"cherry2", win:Math.round(bet*2)}); }
    return {totalWin, winLines};
  }

  const popup = document.createElement("div");
  popup.id = "dist-slots-popup";
  popup.style.cssText = "position:fixed;width:360px;background:rgba(8,12,24,0.97);backdrop-filter:blur(20px);border:2px solid rgba(251,191,36,0.4);border-radius:18px;padding:16px;z-index:9999998;font-family:Inter,sans-serif;color:#e2e8f0;box-shadow:0 20px 60px rgba(0,0,0,0.8),0 0 40px rgba(251,191,36,0.1);display:none;";

  popup.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;user-select:none">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:20px">🎰</span>
        <span style="font-size:12px;font-weight:800;color:#fbbf24;letter-spacing:.5px">СЛОТЫ</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;color:#64748b">Баланс:</span>
        <span id="slots-balance" style="font-size:12px;font-weight:800;color:#4ade80">0₽</span>
        <button id="slots-add" style="padding:3px 8px;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.4);color:#4ade80;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;font-family:Inter,sans-serif">+10₽</button>
        <div id="slots-close" style="cursor:pointer;color:#475569;font-size:18px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(51,65,85,0.4)">×</div>
      </div>
    </div>

    <div id="slots-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;padding:12px;background:rgba(0,0,0,0.4);border-radius:12px;border:1px solid rgba(251,191,36,0.2)">
    </div>

    <div id="slots-result" style="text-align:center;font-size:13px;font-weight:600;min-height:20px;margin-bottom:12px;color:#94a3b8"></div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:11px;color:#64748b">Ставка:</span>
        <button id="slots-bet-minus" style="width:22px;height:22px;background:rgba(51,65,85,0.5);border:1px solid rgba(51,65,85,0.7);color:#94a3b8;border-radius:5px;cursor:pointer;font-size:12px;font-family:Inter,sans-serif">−</button>
        <span id="slots-bet" style="font-size:13px;font-weight:700;color:#fbbf24;min-width:30px;text-align:center">5₽</span>
        <button id="slots-bet-plus" style="width:22px;height:22px;background:rgba(51,65,85,0.5);border:1px solid rgba(51,65,85,0.7);color:#94a3b8;border-radius:5px;cursor:pointer;font-size:12px;font-family:Inter,sans-serif">+</button>
      </div>
      <button id="slots-spin" style="padding:10px 28px;background:linear-gradient(135deg,#d97706,#f59e0b);border:none;color:#000;border-radius:10px;cursor:pointer;font-size:12px;font-weight:800;font-family:Inter,sans-serif;letter-spacing:.3px;box-shadow:0 4px 16px rgba(251,191,36,0.4)">🎰 КРУТИТЬ</button>
    </div>

    <div style="font-size:10px;color:#334155;text-align:center">1 заказ = 10₽ • 🍒×1 = +ставка • 2 одинак. = 1.5x • 3 одинак. = 2-20x</div>
  `;

  document.body.appendChild(popup);

  // Позиция
  try { const p=JSON.parse(localStorage.getItem(SLOTS_POS)||"null"); if(p){popup.style.left=p.x+"px";popup.style.top=p.y+"px";popup.style.right="auto";}else{popup.style.right="80px";popup.style.top="80px";} } catch(_){popup.style.right="80px";popup.style.top="80px";}

  // Drag
  let dr=false,sx=0,sy=0,bx=0,by=0;
  popup.querySelector(".dist-icon, div").addEventListener("mousedown",e=>{
    if(e.target.id==="slots-close"||e.target.id==="slots-spin"||e.target.id==="slots-add"||e.target.id==="slots-bet-minus"||e.target.id==="slots-bet-plus")return;
    dr=true;sx=e.clientX;sy=e.clientY;bx=popup.offsetLeft;by=popup.offsetTop;e.preventDefault();
  });
  document.addEventListener("mousemove",e=>{if(!dr)return;popup.style.right="auto";popup.style.left=(bx+e.clientX-sx)+"px";popup.style.top=(by+e.clientY-sy)+"px";});
  document.addEventListener("mouseup",()=>{if(!dr)return;dr=false;try{localStorage.setItem(SLOTS_POS,JSON.stringify({x:popup.offsetLeft,y:popup.offsetTop}));}catch(_){}});

  let bet = 5;
  let spinning = false;
  let currentGrid = [];

  function buildGrid(grid) {
    const container = popup.querySelector("#slots-grid");
    container.innerHTML = "";
    for(let r=0;r<3;r++){
      for(let c=0;c<3;c++){
        const cell = document.createElement("div");
        cell.style.cssText = "background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:32px;height:70px;transition:transform .1s;";
        cell.textContent = grid[r][c].s;
        container.appendChild(cell);
      }
    }
  }

  function initGrid() {
    currentGrid = Array.from({length:3},()=>Array.from({length:3},()=>randSym()));
    buildGrid(currentGrid);
  }
  initGrid();

  function updateUI() {
    popup.querySelector("#slots-balance").textContent = balance+"₽";
    popup.querySelector("#slots-bet").textContent = bet+"₽";
  }
  updateUI();

  popup.querySelector("#slots-add").onclick = () => { balance += 10; save(); updateUI(); };
  popup.querySelector("#slots-close").onclick = () => { popup.style.display="none"; };
  popup.querySelector("#slots-bet-minus").onclick = () => { if(bet>5){bet-=5;updateUI();} };
  popup.querySelector("#slots-bet-plus").onclick = () => { if(bet<balance){bet+=5;updateUI();} };

  popup.querySelector("#slots-spin").onclick = () => {
    if(spinning) return;
    if(balance < bet) { popup.querySelector("#slots-result").textContent = "Недостаточно средств!"; popup.querySelector("#slots-result").style.color="#ef4444"; return; }
    spinning = true;
    balance -= bet;
    save();
    updateUI();
    popup.querySelector("#slots-result").textContent = "...";
    popup.querySelector("#slots-result").style.color="#94a3b8";

    const spinBtn = popup.querySelector("#slots-spin");
    spinBtn.disabled = true;
    spinBtn.style.opacity = "0.5";

    // Анимация — меняем символы быстро
    let frames = 0;
    const maxFrames = 18;
    const interval = setInterval(() => {
      frames++;
      const tempGrid = Array.from({length:3},()=>Array.from({length:3},()=>randSym()));
      buildGrid(tempGrid);
      if(frames >= maxFrames) {
        clearInterval(interval);
        // Финальный результат — шанс выигрыша ~17%
        const winRoll = Math.random();
        if (winRoll < 0.17) {
          // Форсируем выигрыш: одна строка с одинаковыми символами
          const winSym = randSym();
          const winRow = Math.floor(Math.random() * 3);
          currentGrid = Array.from({length:3}, (_, r) =>
            r === winRow
              ? [winSym, winSym, winSym]
              : Array.from({length:3}, () => randSym())
          );
        } else {
          // Обычный случайный результат, но гарантируем что нет 3 одинаковых
          do {
            currentGrid = Array.from({length:3},()=>Array.from({length:3},()=>randSym()));
          } while (calcWin(currentGrid, bet).totalWin > 0 && Math.random() > 0.03);
        }
        buildGrid(currentGrid);
        const {totalWin, winLines} = calcWin(currentGrid, bet);
        if(totalWin > 0) {
          balance += totalWin;
          save();
          updateUI();
          let msg = "";
          if(winLines.some(l=>l.type==="3x")) msg = `🎉 ДЖЕКПОТ! +${totalWin}₽`;
          else if(winLines.some(l=>l.type==="2x")) msg = `✨ Выигрыш! +${totalWin}₽`;
          else msg = `🍒 Бонус! +${totalWin}₽`;
          popup.querySelector("#slots-result").textContent = msg;
          popup.querySelector("#slots-result").style.color = "#4ade80";
          // Подсветим выигрышные ячейки
          winLines.forEach(wl => {
            if(wl.line) wl.line.forEach((_,i)=>{
              // подсветка — просто мигание
            });
          });
        } else {
          popup.querySelector("#slots-result").textContent = "Не повезло 😔";
          popup.querySelector("#slots-result").style.color = "#64748b";
        }
        spinning = false;
        spinBtn.disabled = false;
        spinBtn.style.opacity = "1";
      }
    }, 60);
  };

  // Ctrl+scroll для масштабирования слотов
  let slotsScale = parseFloat(localStorage.getItem("dist_slots_scale_v1") || "1");
  popup.style.transform = "scale(" + slotsScale + ")";
  popup.style.transformOrigin = "top left";
  popup.addEventListener("wheel", e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    slotsScale = Math.max(0.5, Math.min(3.0, slotsScale + (e.deltaY < 0 ? 0.05 : -0.05)));
    popup.style.transform = "scale(" + slotsScale + ")";
    try { localStorage.setItem("dist_slots_scale_v1", String(slotsScale)); } catch(_) {}
  }, { passive: false });

  panel.querySelector("#dist-slots-btn").onclick = e => {
    e.stopPropagation();
    popup.style.display = popup.style.display === "none" ? "block" : "none";
  };

  window._distAddSlotBalance = (n) => { balance += n * 10; save(); updateUI(); };
})();
// Единые глобальные обработчики для drag сервисов
    document.addEventListener("mousemove", e => { if (lp._onMouseMove) lp._onMouseMove(e); });
    document.addEventListener("mouseup", e => { if (lp._onMouseUp) lp._onMouseUp(e); });
  })();

  // ── ИГРА: FLAPPY BIRD ──
  (function initFlappy() {
    const popup = document.createElement("div");
    popup.id = "dist-flappy-popup";
    popup.style.cssText = "position:fixed;width:320px;background:rgba(8,12,24,0.97);backdrop-filter:blur(20px);border:2px solid rgba(56,189,248,0.4);border-radius:18px;padding:16px;z-index:9999998;font-family:Inter,sans-serif;color:#e2e8f0;box-shadow:0 20px 60px rgba(0,0,0,0.8),0 0 40px rgba(56,189,248,0.1);display:none;";
    popup.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;user-select:none">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">🐦</span>
          <span style="font-size:12px;font-weight:800;color:#38bdf8;letter-spacing:.5px">FLAPPY BIRD</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:#64748b">Счет:</span>
          <span id="flappy-score" style="font-size:14px;font-weight:800;color:#4ade80">0</span>
          <div id="flappy-close" style="cursor:pointer;color:#475569;font-size:18px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(51,65,85,0.4)">×</div>
        </div>
      </div>
      <div style="position:relative;width:100%;height:400px;background:#87CEEB;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">
        <canvas id="flappy-canvas" width="288" height="400" style="display:block;width:100%;height:100%"></canvas>
        <div id="flappy-overlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);border-radius:12px">
          <button id="flappy-start" style="padding:10px 24px;background:linear-gradient(135deg,#38bdf8,#818cf8);border:none;color:#fff;border-radius:10px;cursor:pointer;font-size:14px;font-weight:800;font-family:Inter,sans-serif;box-shadow:0 4px 16px rgba(56,189,248,0.4)">ИГРАТЬ</button>
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    const FLAPPY_POS = "dist_flappy_pos_v1";
    try { const p=JSON.parse(localStorage.getItem(FLAPPY_POS)||"null"); if(p){popup.style.left=p.x+"px";popup.style.top=p.y+"px";popup.style.right="auto";}else{popup.style.right="80px";popup.style.top="80px";} } catch(_){popup.style.right="80px";popup.style.top="80px";}

    let dr=false,sx=0,sy=0,bx=0,by=0;
    popup.querySelector("div").addEventListener("mousedown",e=>{
      if(e.target.closest("button") || e.target.id==="flappy-close" || e.target.tagName==="CANVAS") return;
      dr=true;sx=e.clientX;sy=e.clientY;bx=popup.offsetLeft;by=popup.offsetTop;e.preventDefault();
    });
    document.addEventListener("mousemove",e=>{if(!dr)return;popup.style.right="auto";popup.style.left=(bx+e.clientX-sx)+"px";popup.style.top=(by+e.clientY-sy)+"px";});
    document.addEventListener("mouseup",()=>{if(!dr)return;dr=false;try{localStorage.setItem(FLAPPY_POS,JSON.stringify({x:popup.offsetLeft,y:popup.offsetTop}));}catch(_){}});

    popup.querySelector("#flappy-close").onclick = () => { popup.style.display="none"; if(animReq) cancelAnimationFrame(animReq); };
    panel.querySelector("#dist-flappy-btn").onclick = e => { e.stopPropagation(); popup.style.display = popup.style.display === "none" ? "block" : "none"; };

    const canvas = popup.querySelector("#flappy-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = popup.querySelector("#flappy-score");
    const overlay = popup.querySelector("#flappy-overlay");
    const startBtn = popup.querySelector("#flappy-start");

    let bird = { x: 50, y: 150, v: 0, g: 0.25, jump: -5.5, size: 15 };
    let pipes = [];
    let pipeW = 40, gap = 120;
    let frame = 0, score = 0, state = "idle", animReq;

    function reset() {
      bird.y = 150; bird.v = 0;
      pipes = [];
      frame = 0; score = 0; scoreEl.textContent = "0";
      state = "playing";
      overlay.style.display = "none";
      loop();
    }

    startBtn.onclick = reset;
    
    function jump() {
      if (state === "playing") { bird.v = bird.jump; }
      else if (state !== "playing") { reset(); }
    }
    
    canvas.addEventListener("mousedown", jump);
    document.addEventListener("keydown", (e) => {
       if (popup.style.display === "block" && (e.code === "Space" || e.code === "ArrowUp")) {
          e.preventDefault();
          jump();
       }
    });

    function drawBird() {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(Math.min(Math.PI/4, Math.max(-Math.PI/4, (bird.v * 0.1))));
      // Body
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(0, 0, bird.size, 0, Math.PI*2); ctx.fill();
      // Eye
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(6, -4, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "black";
      ctx.beginPath(); ctx.arc(8, -4, 2, 0, Math.PI*2); ctx.fill();
      // Beak
      ctx.fillStyle = "#f97316";
      ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(18, 5); ctx.lineTo(8, 8); ctx.fill();
      // Wing
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.ellipse(-4, 2, 8, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function loop() {
      if (state !== "playing") return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bird.v += bird.g;
      bird.y += bird.v;

      if (frame % 100 === 0) {
        let topH = Math.random() * (canvas.height - gap - 60) + 30;
        pipes.push({ x: canvas.width, top: topH, passed: false });
      }

      ctx.fillStyle = "#22c55e";
      for (let i = 0; i < pipes.length; i++) {
        let p = pipes[i];
        p.x -= 2;
        // Top pipe
        ctx.fillRect(p.x, 0, pipeW, p.top);
        ctx.fillRect(p.x - 2, p.top - 15, pipeW + 4, 15);
        // Bottom pipe
        ctx.fillRect(p.x, p.top + gap, pipeW, canvas.height - p.top - gap);
        ctx.fillRect(p.x - 2, p.top + gap, pipeW + 4, 15);

        if (!p.passed && bird.x > p.x + pipeW) {
          p.passed = true; score++; scoreEl.textContent = score;
        }

        if (bird.x + bird.size > p.x && bird.x - bird.size < p.x + pipeW) {
          if (bird.y - bird.size < p.top || bird.y + bird.size > p.top + gap) {
            state = "gameover";
          }
        }
      }

      if (bird.y + bird.size > canvas.height || bird.y - bird.size < 0) state = "gameover";

      pipes = pipes.filter(p => p.x + pipeW > 0);

      drawBird();
      frame++;

      if (state === "gameover") {
        overlay.style.display = "flex";
        startBtn.textContent = "ИГРАТЬ СНОВА";
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        drawBird();
      } else {
        animReq = requestAnimationFrame(loop);
      }
    }
  })();
}
