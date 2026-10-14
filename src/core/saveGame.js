const SAVE_KEY = "balacoro_save";
const AUTO_SAVE_KEY = "balacoro_autosave";

export function isAutoSaveEnabled() {
  try {
    return localStorage.getItem(AUTO_SAVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAutoSaveEnabled(enabled) {
  try {
    localStorage.setItem(AUTO_SAVE_KEY, enabled ? "1" : "0");
  } catch {
    return;
  }
}

export function saveRun(snapshot) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function loadRun() {
  try {
    return JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    return;
  }
}

export function hasRun() {
  return loadRun() != null;
}
