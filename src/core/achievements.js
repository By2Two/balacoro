const STATS_KEY = "balacoro_achievement_stats";

export const ACHIEVEMENTS = {
  bossHunter: {
    label: "BOSS HUNTER",
    description: "Kill 10 bosses",
    stat: "bossKills",
    target: 10,
  },
  unstoppable: {
    label: "UNSTOPPABLE",
    description: "Reach power 20",
    stat: "maxPower",
    target: 20,
  },
  bloodSurvivor: {
    label: "BLOOD SURVIVOR",
    description: "Survive a blood moon",
    stat: "bloodMoonsSurvived",
    target: 1,
  },
  untouchable: {
    label: "UNTOUCHABLE",
    description: "Reach the first night without taking damage",
    stat: "flawlessDays",
    target: 1,
  },
};

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    return;
  }
}

function completedIds(stats) {
  return Object.entries(ACHIEVEMENTS)
    .filter(([, achievement]) => (stats[achievement.stat] ?? 0) >= achievement.target)
    .map(([id]) => id);
}

function applyStat(stat, compute) {
  const stats = loadStats();
  const before = new Set(completedIds(stats));
  stats[stat] = compute(stats[stat] ?? 0);
  saveStats(stats);
  return completedIds(stats).filter((id) => !before.has(id));
}

export function incrementStat(stat, amount = 1) {
  return applyStat(stat, (current) => current + amount);
}

export function raiseStat(stat, value) {
  return applyStat(stat, (current) => Math.max(current, value));
}

export function getAchievementProgress(id) {
  const achievement = ACHIEVEMENTS[id];
  if (!achievement) {
    return { current: 0, target: 1, done: false };
  }
  const current = Math.min(loadStats()[achievement.stat] ?? 0, achievement.target);
  return { current, target: achievement.target, done: current >= achievement.target };
}

export function isAchievementDone(id) {
  return getAchievementProgress(id).done;
}
