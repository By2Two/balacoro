import React from "react";
import CoinIcon from "./CoinIcon.jsx";

const LOW_HEALTH_THRESHOLD = 0.4;

export default function VitalsHud({ player, coins, clock }) {
  const healthRatio =
    player.maxHealth > 0 ? player.health / player.maxHealth : 1;
  const lowHealthIntensity =
    player.health > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (LOW_HEALTH_THRESHOLD - healthRatio) / LOW_HEALTH_THRESHOLD,
          ),
        )
      : 0;
  const berserkerLowHealthActive =
    player.active_skills?.berserker?.enabled && lowHealthIntensity > 0;
  const lowHealthBoost = berserkerLowHealthActive ? 1.35 : 1;
  const lowHealthInnerClear =
    70 - Math.min(lowHealthIntensity * 42 * lowHealthBoost, 55);
  const lowHealthOuterOpacity = Math.min(
    0.18 + lowHealthIntensity * 0.62 * lowHealthBoost,
    0.92,
  );
  const lowHealthPulseDuration =
    (1.5 - lowHealthIntensity * 0.85) / (berserkerLowHealthActive ? 1.4 : 1);

  return (
    <>
      {lowHealthIntensity > 0 && (
        <>
          <style>{`
            @keyframes low-health-pulse {
              0%, 100% { opacity: 0.7; }
              50% { opacity: 1; }
            }
          `}</style>
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 12,
              pointerEvents: "none",
              background: `radial-gradient(ellipse at center, transparent ${lowHealthInnerClear}%, rgba(200, 0, 0, ${lowHealthOuterOpacity}) 100%)`,
              animation: `low-health-pulse ${lowHealthPulseDuration}s ease-in-out infinite`,
            }}
          />
        </>
      )}

      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          width: "min(220px, 40vw)",
          height: "14px",
          background: "#111",
          border: "2px solid #fff",
          boxShadow: "0 0 0 2px #444, 0 0 6px #b3b1b3",
          imageRendering: "pixelated",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(player.health / player.maxHealth) * 100}%`,
            height: "100%",
            background: "#ff3333",
            transition: "width 0.3s ease-in-out",
            imageRendering: "pixelated",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: "34px",
          left: "10px",
          width: "min(220px, 40vw)",
          height: "8px",
          background: "#111",
          border: "2px solid #fff",
          boxShadow: "0 0 0 2px #444, 0 0 6px #b3b1b3",
          imageRendering: "pixelated",
          borderRadius: "3px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(player.currentXP / player.xpToLevelUp) * 100}%`,
            height: "100%",
            background: "#00ff6e",
            transition: "width 0.3s ease-in-out",
            imageRendering: "pixelated",
          }}
        ></div>
      </div>

      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "16px",
          color: "#ffd23e",
          textShadow: "2px 2px #000",
          pointerEvents: "none",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <CoinIcon size={16} />
        {coins}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "232px",
          right: "20px",
          width: "200px",
          textAlign: "center",
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "13px",
          color: "#fff",
          textShadow: "2px 2px #000",
          pointerEvents: "none",
          zIndex: 20,
        }}
      >
        {clock}
      </div>
    </>
  );
}
