const STORAGE_KEY = "balacoro_customization";

export const DEFAULT_CUSTOMIZATION = {
  color: 0xffee00,
  projectileColor: 0x00ff00,
  accessories: [],
  skin: "plain",
  eyes: "bead",
  brows: "none",
  shotShape: "box",
  killEffect: "pixels",
  dashColor: null,
  shieldColor: null,
};

export function loadCustomization() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored) {
      return { ...DEFAULT_CUSTOMIZATION };
    }
    const accessories = Array.isArray(stored.accessories)
      ? stored.accessories
      : [stored.hat, stored.glasses, stored.ears].filter(
          (id) => id && id !== "none"
        );
    const killEffect = stored.killEffect === "smoke" ? "explosion" : stored.killEffect;
    return {
      ...DEFAULT_CUSTOMIZATION,
      ...stored,
      killEffect: killEffect ?? DEFAULT_CUSTOMIZATION.killEffect,
      color: stored.color ?? DEFAULT_CUSTOMIZATION.color,
      projectileColor:
        stored.projectileColor ?? DEFAULT_CUSTOMIZATION.projectileColor,
      accessories,
    };
  } catch {
    return { ...DEFAULT_CUSTOMIZATION };
  }
}

export function saveCustomization(customization) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customization));
  } catch {
    return;
  }
}
