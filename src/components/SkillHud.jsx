import React from "react";
import StatsPanel from "./StatsPanel.jsx";
import { POWER_DEFS } from "../core/powers.js";

const MULTIPLIER_SKILL_DEFS = [
  {
    id: "berserker",
    icon: "./assets/imgs/berserker.png",
    format: (s) => `+${Math.round(s.bonus * 100)}%`,
  },
  {
    id: "adrenaline",
    icon: "./assets/imgs/adrenaline.png",
    format: (s) => `+${Math.round(s.speedBonus * 100)}%`,
  },
];

const EXTRA_PASSIVE_SKILL_DEFS = [
  {
    id: "orbitalBlades",
    icon: "./assets/imgs/orbitalblades.png",
    format: (s) => `×${Math.floor(s.count)}`,
  },
  {
    id: "twinShot",
    icon: "./assets/imgs/twinshot.png",
    format: () => "",
  },
  {
    id: "overcharge",
    icon: "./assets/imgs/overcharge.png",
    format: (s) => `${s.damage.toFixed(1)}`,
  },
  {
    id: "staticField",
    icon: "./assets/imgs/staticfield.png",
    format: (s) => `${Math.round(s.chance * 100)}%`,
  },
];

function renderMiniSkillIcon(def, activeSkills) {
  const skill = activeSkills?.[def.id];
  if (!skill?.enabled) {
    return null;
  }
  return (
    <div
      key={def.id}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "3px",
      }}
    >
      <img
        src={def.icon}
        alt={def.id}
        style={{
          width: "48px",
          height: "48px",
          imageRendering: "pixelated",
        }}
      />
      <span
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "8px",
          color: "#ffee00",
          textShadow: "1px 1px #000",
        }}
      >
        {def.format(skill)}
      </span>
    </div>
  );
}

export default function SkillHud({ player, tapSkillKey }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "52px",
        left: "10px",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "min(80vw, 560px)",
      }}
    >
      <StatsPanel player={player} />
      <div
        id="hud"
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "10px",
        }}
      >
        {player.active_skills.dash?.enabled && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <div
              id="dashContainer"
              onClick={() => tapSkillKey("Space")}
              style={{
                position: "relative",
                width: "48px",
                height: "48px",
                transform:
                  player.dashCharges >= (player.active_skills.dash.charges ?? 1)
                    ? "scale(1.2)"
                    : "scale(1)",
                transition: "transform 0.2s ease",
              }}
            >
              <img
                id="dashIcon"
                src="./assets/imgs/dash.png"
                style={{
                  width: "100%",
                  height: "100%",
                  opacity: player.dashCharges > 0 ? 1 : 0.4,
                  transition: "opacity 0.2s ease",
                  imageRendering: "pixelated",
                }}
                alt="Dash Icon"
              />
              {player.dashCooldownTimer > 0 && (
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    top: 0,
                    left: 0,
                    background: `conic-gradient(
        rgba(0, 0, 0, 0.6) ${
          (player.dashCooldownTimer / player.active_skills.dash.cooldown) *
          360
        }deg,
        transparent 0deg
      )`,
                    borderRadius: "50%",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "8px",
                color: "#ffee00",
                textShadow: "1px 1px #000",
              }}
            >
              {player.dashCharges > 0
                ? player.dashCharges
                : Math.ceil(player.dashCooldownTimer)}
            </span>
          </div>
        )}

        {["q", "e"].map((slot) => {
          const powerId = player.slotPowers?.[slot];
          const def = powerId ? POWER_DEFS[powerId] : null;
          const skill = powerId ? player.active_skills?.[powerId] : null;
          if (!def || !skill?.enabled) {
            return null;
          }
          const cooldownTimer = player.powerCooldowns?.[slot] ?? 0;
          const cooldown = skill.cooldown || 1;
          const ready = cooldownTimer <= 0.05;
          const keyCode = slot === "q" ? "KeyQ" : "KeyE";

          return (
            <div
              key={slot}
              id={`power-${slot}-container`}
              onClick={() => tapSkillKey(keyCode)}
              style={{
                position: "relative",
                width: "48px",
                height: "48px",
                transform: ready ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.2s ease",
                cursor: "pointer",
              }}
            >
              {def.icon ? (
                <img
                  src={def.icon}
                  alt={powerId}
                  style={{
                    width: "100%",
                    height: "100%",
                    imageRendering: "pixelated",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "30px",
                  }}
                >
                  {def.emoji}
                </div>
              )}
              {cooldownTimer > 0 && (
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    top: 0,
                    left: 0,
                    background: `conic-gradient(
        rgba(0, 0, 0, 0.65) ${(cooldownTimer / cooldown) * 360}deg,
        transparent 0deg
      )`,
                    borderRadius: "50%",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />
              )}
              {cooldownTimer > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: "12px",
                    color: "#fff",
                    textShadow: "1px 1px #000",
                    pointerEvents: "none",
                    zIndex: 3,
                  }}
                >
                  {Math.ceil(cooldownTimer)}
                </span>
              )}
              <span
                style={{
                  position: "absolute",
                  bottom: "-4px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: "9px",
                  color: "#000",
                  background: "#ffee00",
                  padding: "1px 5px",
                  borderRadius: "5px",
                  border: "1px solid rgba(0,0,0,0.4)",
                  pointerEvents: "none",
                  zIndex: 3,
                }}
              >
                {slot.toUpperCase()}
              </span>
            </div>
          );
        })}

        {MULTIPLIER_SKILL_DEFS.map((def) =>
          renderMiniSkillIcon(def, player.active_skills),
        )}

        {player.active_skills.forceField?.enabled && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <div
              id="shieldContainer"
              style={{
                position: "relative",
                width: "48px",
                height: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform:
                  player.shieldCount >=
                  (player.active_skills.forceField.shieldCount ?? 1)
                    ? "scale(1.2)"
                    : "scale(1)",
                transition: "transform 0.2s ease",
              }}
            >
              <img
                id="shieldIcon"
                src="./assets/imgs/shield.png"
                alt="Shield Icon"
                style={{
                  width: "38px",
                  height: "38px",
                  imageRendering: "pixelated",
                }}
              />
              {player.forceFieldCooldownTimer > 0 && (
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    top: 0,
                    left: 0,
                    background: `conic-gradient(
        rgba(0, 0, 0, 0.6) ${
          (player.forceFieldCooldownTimer /
            Math.min(
              player.active_skills.forceField.cooldown,
              player.active_skills.forceField.maxCooldown,
            )) *
          360
        }deg,
        transparent 0deg
      )`,
                    borderRadius: "50%",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "8px",
                color: "#ffee00",
                textShadow: "1px 1px #000",
              }}
            >
              {player.shieldCount}
            </span>
          </div>
        )}

        {player.active_skills.thorns?.enabled && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <img
              id="thornsIcon"
              src="./assets/imgs/thorns.png"
              alt="Thorns Icon"
              style={{
                width: "48px",
                height: "48px",
                imageRendering: "pixelated",
              }}
            />
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "8px",
                color: "#ffee00",
                textShadow: "1px 1px #000",
              }}
            >
              {player.active_skills.thorns.damage.toFixed(1)}
            </span>
          </div>
        )}

        {player.active_skills.glowing?.enabled && (
          <img
            id="glowingIcon"
            src="./assets/imgs/glowing.png"
            alt="Glowing Icon"
            style={{
              width: "48px",
              height: "48px",
              imageRendering: "pixelated",
              filter: "drop-shadow(0 0 4px #f4f025 )",
            }}
          />
        )}

        {player.active_skills.projectGlowing?.enabled && (
          <img
            id="projectGlowingIcon"
            src="./assets/imgs/project_glowing.png"
            alt="Project Glowing Icon"
            style={{
              width: "48px",
              height: "48px",
              imageRendering: "pixelated",
              filter: "drop-shadow(0 0 4px #0f0)",
            }}
          />
        )}

        {EXTRA_PASSIVE_SKILL_DEFS.map((def) =>
          renderMiniSkillIcon(def, player.active_skills),
        )}

        {player.active_skills.secondWind?.enabled && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <img
              src="./assets/imgs/secondwind.png"
              alt="secondWind"
              style={{
                width: "48px",
                height: "48px",
                imageRendering: "pixelated",
                opacity: player.secondWindUsed ? 0.5 : 1,
              }}
            />
            <span
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "7px",
                color: player.secondWindUsed ? "#888" : "#88ffcc",
                textShadow: "1px 1px #000",
              }}
            >
              {player.secondWindUsed ? "USED" : "READY"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
