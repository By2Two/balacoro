const DEBUG_STORAGE_KEY = "debug";

export function isDebugMode() {
  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function enableDebugMode() {
  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, "true");
  } catch {
    return;
  }
  console.log("Debug mode enabled. Reload if hotkeys don't respond yet.");
}

export function disableDebugMode() {
  try {
    localStorage.removeItem(DEBUG_STORAGE_KEY);
  } catch {
    return;
  }
  console.log("Debug mode disabled.");
}

if (typeof window !== "undefined") {
  window.enableDebug = enableDebugMode;
  window.disableDebug = disableDebugMode;
}
