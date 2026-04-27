function applyRobloxPromoFilter() {
  if (activeCategory !== "robloxpromo") return;

  const res = [];

  document.querySelectorAll("a[href^='/deal/']").forEach(c => {
    const t = c.innerText.toLowerCase();

    if (activeRobloxPromoSubs.has("premium")) {
      if (/(^|\s)роблокс\s+премиум(\s|$)/i.test(t)) {
        res.push(c);
      }
      return;
    }

    if (!t.includes("робуксов промокодом")) return;

    if (activeRobloxPromoSubs.has("all")) {
      res.push(c);
      return;
    }

    for (const v of activeRobloxPromoSubs) {
      if (v === "premium") continue;
      if (matchRobloxPromo(t, v)) {
        res.push(c);
        return;
      }
    }
  });

  currentDeals = res;
  highlightDeals(res, CATEGORIES.robloxpromo.color);
  updateInfo(res.length);
  updateOpenBtn();
}

