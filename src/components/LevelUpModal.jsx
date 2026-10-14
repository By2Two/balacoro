import React from "react";
import { PLAYER_PASSIVES, PASSIVE_COLORS } from "../constants.js";
import { audio } from "../core/AudioEngine.js";

const INCREMENT_LABELS = {
  health: "+15 HP",
  damage: "+0.5 DMG",
  speed: "+1 SPD",
  attackSpeed: "+10% AS",
  sharpening: "+1 PIERCE",
  healthRegen: "+0.4/s",
  criticalDamage: "+5% CRIT DMG",
  criticalChance: "+3% CRIT",
  lifeSteal: "+3% STEAL",
};

const PASSIVE_ICONS = {
  health: "❤",
  damage: "⚔",
  speed: "➤",
  attackSpeed: "⚡",
  sharpening: "➹",
  healthRegen: "✚",
  criticalDamage: "✷",
  criticalChance: "✦",
  lifeSteal: "☠",
};

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

export default function LevelUpModal({ onChoose, pending = 1 }) {
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
        .upgrade-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: min(10px, 1.2vh);
          background: #181824;
          border: 2px solid #2a2a3a;
          border-radius: 8px;
          padding: min(16px, 1.8vh) min(10px, 2vw);
          cursor: pointer;
          font-family: inherit;
          color: #fff;
          transition: transform 0.12s ease, border-color 0.12s ease,
            box-shadow 0.12s ease;
        }
        .upgrade-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: 0 0 16px var(--accent);
        }
      `}</style>

      <div
        style={{
          background: "#101018",
          border: "2px solid #ffee00",
          borderRadius: "10px",
          padding: "min(28px, 3vh) min(32px, 4vw)",
          maxWidth: "min(640px, 94vw)",
          maxHeight: "94vh",
          overflowY: "auto",
        }}
      >
        <h2
          style={{
            fontSize: "min(22px, 4vh)",
            color: "#ffee00",
            textAlign: "center",
            margin: "0 0 min(10px, 1.5vh)",
            textShadow: "0 0 14px rgba(255, 238, 0, 0.6)",
          }}
        >
          LEVEL UP!{pending > 1 ? ` x${pending}` : ""}
        </h2>
        <p
          style={{
            fontSize: "10px",
            color: "#888",
            textAlign: "center",
            margin: "0 0 min(24px, 2.5vh)",
            letterSpacing: "2px",
          }}
        >
          CHOOSE A PASSIVE TO UPGRADE
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "min(12px, 1.5vh)",
          }}
        >
          {Object.keys(PLAYER_PASSIVES).map((passive) => (
            <button
              key={passive}
              className="upgrade-card"
              style={{ "--accent": PASSIVE_COLORS[passive] }}
              onMouseEnter={() => audio.play("uiHover")}
              onClick={() => {
                audio.play("skillSelect");
                onChoose(passive);
              }}
            >
              <div
                style={{
                  width: "min(42px, 6vh)",
                  height: "min(42px, 6vh)",
                  borderRadius: "8px",
                  background: PASSIVE_COLORS[passive],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "min(20px, 3vh)",
                  color: "#000",
                }}
              >
                {PASSIVE_ICONS[passive]}
              </div>
              <div style={{ fontSize: "9px", textAlign: "center" }}>
                {formatLabel(passive)}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: PASSIVE_COLORS[passive],
                }}
              >
                {INCREMENT_LABELS[passive] ??
                  `+${PLAYER_PASSIVES[passive].increment}`}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
