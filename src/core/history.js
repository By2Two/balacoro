const HISTORY_KEY = "balacoro_history";
const MAX_RUNS = 50;

export function formatDuration(seconds) {
  const totalSeconds = Math.max(Math.floor(seconds), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const rest = totalSeconds % 60;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

export function getRunHistory() {
  try {
    const runs = JSON.parse(localStorage.getItem(HISTORY_KEY));
    return Array.isArray(runs) ? runs : [];
  } catch {
    return [];
  }
}

export function addRunToHistory(run) {
  const runs = [run, ...getRunHistory()].slice(0, MAX_RUNS);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(runs));
  } catch {
    return runs;
  }
  return runs;
}

export function getBestRun(runs = getRunHistory()) {
  if (runs.length === 0) {
    return null;
  }
  return runs.reduce((best, run) => (run.time > best.time ? run : best));
}
