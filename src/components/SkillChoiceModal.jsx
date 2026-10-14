import React from "react";
import { audio } from "../core/AudioEngine.js";
import { POWER_DEFS } from "../core/powers.js";

const SKILL_ICONS = {
  dash: "./assets/imgs/dash.png",
  energyExplosion: "./assets/imgs/explosion.png",
  freezeExplosion: "./assets/imgs/freeze.png",
  forceField: "./assets/imgs/shield.png",
  thorns: "./assets/imgs/thorns.png",
  glowing: "./assets/imgs/glowing.png",
  projectGlowing: "./assets/imgs/project_glowing.png",
  orbitalBlades: "./assets/imgs/orbitalblades.png",
  twinShot: "./assets/imgs/twinshot.png",
  berserker: "./assets/imgs/berserker.png",
  overcharge: "./assets/imgs/overcharge.png",
  adrenaline: "./assets/imgs/adrenaline.png",
  secondWind: "./assets/imgs/secondwind.png",
  staticField: "./assets/imgs/staticfield.png",
};

const SKILL_COLORS = {
  dash: "#ffa500",
  energyExplosion: "#ff4444",
  freezeExplosion: "#00ccff",
  forceField: "#ffff00",
  thorns: "#00ff00",
  glowing: "#90f5bc",
  projectGlowing: "#ffffff",
  orbitalBlades: "#66ccff",
  twinShot: "#ffaa55",
  berserker: "#ff3355",
  overcharge: "#ffee00",
  adrenaline: "#ff77aa",
  secondWind: "#88ffcc",
  staticField: "#66eaff",
};

const PASSIVE_EMOJI = {
  orbitalBlades: "🔮",
  twinShot: "🏹",
  berserker: "💢",
  overcharge: "✨",
  adrenaline: "🏃",
  secondWind: "🕊️",
  staticField: "🧊",
};

const SKILL_DESCRIPTIONS = {
  dash: "Press SPACE to dash forward, dodging danger.",
  forceField: "Charges shields around you that block one hit each.",
  thorns: "Reflects damage back at enemies that hit you.",
  glowing: "You shine, lighting up the night around you.",
  projectGlowing: "Your projectiles glow, lighting up wherever they fly.",
  orbitalBlades: "Blades orbit around you, slicing anything they touch.",
  twinShot: "Fires an extra projectile with every shot.",
  berserker: "Deals more damage the lower your health gets.",
  overcharge: "Critical hits trigger a small blast that hits nearby enemies.",
  adrenaline: "Killing an enemy briefly boosts your speed and attack speed.",
  secondWind: "Survive a fatal hit once, becoming briefly invincible.",
  staticField: "Enemies that hit you have a chance to get frozen.",
};

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

function skillStats(skillData, includeGrowth) {
  return Object.entries(skillData ?? {})
    .filter(
      ([key, value]) =>
        key !== "enabled" &&
        !key.toLowerCase().includes("growth") &&
        !key.toLowerCase().startsWith("max") &&
        value !== undefined
    )
    .map(([key, value]) => {
      const capitalized = key[0].toUpperCase() + key.slice(1);
      const rawGrowth = includeGrowth ? skillData[`growth${capitalized}`] : null;
      const cap = skillData[`max${capitalized}`];
      let growth = typeof rawGrowth === "number" ? rawGrowth : null;
      if (
        growth != null &&
        typeof value === "number" &&
        typeof cap === "number" &&
        (growth < 0 ? value <= cap : value >= cap)
      ) {
        growth = null;
      }
      return {
        label: formatLabel(key),
        value: typeof value === "number" ? +value.toFixed(1) : value,
        growth,
      };
    });
}

export default function SkillChoiceModal({
  skills,
  activeSkills,
  onChoose,
  isTouchDevice,
  rerolls = 0,
  onReroll,
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0, 0, 0, 0.78)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
      }}
    >
      <style>{`
        .skill-card-wrap {
          position: relative;
        }
        .skill-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 170px;
          height: 150px;
          background: #181824;
          border: 2px solid #2a2a3a;
          border-radius: 8px;
          padding: 18px 12px;
          cursor: pointer;
          font-family: inherit;
          color: #fff;
          transition: transform 0.12s ease, border-color 0.12s ease,
            box-shadow 0.12s ease;
        }
        .skill-card:hover {
          transform: translateY(-5px);
          border-color: var(--accent);
          box-shadow: 0 0 18px var(--accent);
        }
        .skill-tooltip {
          position: absolute;
          left: 50%;
          bottom: 100%;
          transform: translate(-50%, -4px);
          width: 300px;
          max-width: 90vw;
          background: #0a0a12;
          border: 2px solid var(--accent);
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 9px;
          line-height: 1.6;
          letter-spacing: 0.4px;
          color: #ddd;
          text-align: center;
          box-shadow: 0 0 14px rgba(0, 0, 0, 0.6);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.12s ease;
          z-index: 10;
        }
        .skill-tooltip-desc {
          max-width: 260px;
          margin: 0 auto;
          white-space: normal;
        }
        .skill-tooltip-divider {
          border: none;
          border-top: 1px solid var(--accent);
          opacity: 0.5;
          margin: 8px 0;
        }
        .skill-tooltip-stats {
          display: flex;
          flex-direction: column;
          gap: 6px;
          color: #aaa;
          letter-spacing: 0;
        }
        .skill-tooltip-stats div {
          white-space: nowrap;
        }
        .skill-card-wrap:hover .skill-tooltip {
          opacity: 1;
        }
        .skill-tooltip-static {
          width: 170px;
          margin-top: 10px;
          background: #0a0a12;
          border: 2px solid var(--accent);
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 8px;
          line-height: 1.5;
          letter-spacing: 0.3px;
          color: #ddd;
          text-align: center;
        }
        .skill-tooltip-static .skill-tooltip-desc {
          max-width: none;
          white-space: normal;
        }
        .skill-tooltip-static .skill-tooltip-stats div {
          white-space: normal;
        }
        .skill-reroll {
          background: rgba(89, 200, 255, 0.12);
          border: 2px solid #59c8ff;
          border-radius: 6px;
          color: #59c8ff;
          font-family: inherit;
          font-size: 11px;
          letter-spacing: 2px;
          padding: 10px 22px;
          cursor: pointer;
          transition: background 0.15s ease, box-shadow 0.15s ease;
        }
        .skill-reroll:hover {
          background: rgba(89, 200, 255, 0.26);
          box-shadow: 0 0 14px rgba(89, 200, 255, 0.55);
        }
      `}</style>

      <div
        style={{
          background: "#101018",
          border: "2px solid #00ccff",
          borderRadius: "10px",
          padding: "min(28px, 3vh) min(32px, 4vw)",
          maxWidth: "94vw",
          ...(isTouchDevice
            ? { maxHeight: "94vh", overflowY: "auto" }
            : null),
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            color: "#00ccff",
            textAlign: "center",
            margin: "0 0 10px",
            textShadow: "0 0 14px rgba(0, 204, 255, 0.6)",
          }}
        >
          SKILL FOUND!
        </h2>
        <p
          style={{
            fontSize: "10px",
            color: "#888",
            textAlign: "center",
            margin: "0 0 24px",
            letterSpacing: "2px",
          }}
        >
          UNLOCK OR UPGRADE A SKILL
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "14px",
          }}
        >
          {skills.map((skill) => {
            const data = activeSkills?.[skill];
            const isUnlocked = data?.enabled;
            const powerDef = POWER_DEFS[skill];
            const accent =
              SKILL_COLORS[skill] ?? (powerDef ? "#00e5ff" : "#aaaaaa");
            const iconSrc = SKILL_ICONS[skill] ?? powerDef?.icon;
            const description = SKILL_DESCRIPTIONS[skill] ?? powerDef?.description;
            const stats = skillStats(data, isUnlocked);
            const tooltipContent = (
              <>
                {description && (
                  <div className="skill-tooltip-desc">{description}</div>
                )}
                {description && stats.length > 0 && (
                  <hr className="skill-tooltip-divider" />
                )}
                {stats.length > 0 && (
                  <div className="skill-tooltip-stats">
                    {stats.map((stat) => (
                      <div key={stat.label}>
                        {stat.label}: {stat.value}
                        {stat.growth ? (
                          <span style={{ color: "#4dff88" }}>
                            {" "}
                            ({stat.growth > 0 ? "+" : ""}
                            {stat.growth})
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </>
            );

            return (
              <div
                key={skill}
                className="skill-card-wrap"
                style={{ "--accent": accent }}
              >
                <button
                  className="skill-card"
                  onMouseEnter={() => audio.play("uiHover")}
                  onClick={() => {
                    audio.play("skillSelect");
                    onChoose(skill);
                  }}
                >
                  {iconSrc ? (
                    <img
                      src={iconSrc}
                      alt={skill}
                      style={{
                        width: "56px",
                        height: "56px",
                        imageRendering: "pixelated",
                        filter: `drop-shadow(0 0 6px ${accent})`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "32px",
                        filter: `drop-shadow(0 0 6px ${accent})`,
                      }}
                    >
                      {powerDef?.emoji ?? PASSIVE_EMOJI[skill] ?? "✦"}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: "10px",
                      textAlign: "center",
                      color: accent,
                    }}
                  >
                    {powerDef?.label ?? formatLabel(skill)}
                  </div>
                  {!isUnlocked && (
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#ffee00",
                        textShadow: "0 0 8px rgba(255, 238, 0, 0.6)",
                      }}
                    >
                      NEW!
                    </div>
                  )}
                </button>
                {(description || stats.length > 0) &&
                  (isTouchDevice ? (
                    <div className="skill-tooltip-static">
                      {tooltipContent}
                    </div>
                  ) : (
                    <div className="skill-tooltip">{tooltipContent}</div>
                  ))}
              </div>
            );
          })}
        </div>

        {rerolls > 0 && onReroll && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "22px" }}>
            <button
              className="skill-reroll"
              onMouseEnter={() => audio.play("uiHover")}
              onClick={() => {
                audio.play("uiClick");
                onReroll();
              }}
            >
              ↻ REROLL ({rerolls})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
