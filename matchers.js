const matchStars = (t, v) =>
  new RegExp(`(^|\\D)${v}\\s*(зв|звёзд|звезд)`, "i").test(t);

const matchUC = (t, v) =>
  new RegExp(`(^|\\D)${v}\\s*(uc|уc)`, "i").test(t);

const matchRobloxPromo = (t, v) =>
  t.includes("робуксов промокодом") &&
  new RegExp(`(^|\\D)${v}(\\D|$)`).test(t);

const matchTelegramPremiumMonth = (t, m) =>
  new RegExp(`telegram\\s+премиум\\s+${m}\\s*(месяц|месяца|месяцев)`, "i").test(t);
  
  const matchRobloxPremium = (t) =>
  /\bроблокс\s+премиум\b/i.test(t);

