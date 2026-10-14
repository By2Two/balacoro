const COINS_KEY = "balacoro_coins";
const OWNED_KEY = "balacoro_owned";

export function getCoins() {
  try {
    return Math.max(0, parseInt(localStorage.getItem(COINS_KEY), 10) || 0);
  } catch {
    return 0;
  }
}

export function addCoins(amount) {
  const coinAmount = Math.max(0, Math.floor(amount));
  if (coinAmount === 0) {
    return;
  }
  try {
    localStorage.setItem(COINS_KEY, String(getCoins() + coinAmount));
  } catch {
    return;
  }
}

export function spendCoins(amount) {
  const currentCoins = getCoins();
  if (currentCoins < amount) {
    return false;
  }
  try {
    localStorage.setItem(COINS_KEY, String(currentCoins - amount));
  } catch {
    return false;
  }
  return true;
}

function getOwnedCosmeticsSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(OWNED_KEY)) ?? []);
  } catch {
    return new Set();
  }
}

export function isOwned(kind, cosmeticId) {
  if (cosmeticId === "none") {
    return true;
  }
  return getOwnedCosmeticsSet().has(`${kind}:${cosmeticId}`);
}

export function unlockCosmetic(kind, cosmeticId) {
  const ownedCosmetics = getOwnedCosmeticsSet();
  ownedCosmetics.add(`${kind}:${cosmeticId}`);
  try {
    localStorage.setItem(OWNED_KEY, JSON.stringify([...ownedCosmetics]));
  } catch {
    return;
  }
}
