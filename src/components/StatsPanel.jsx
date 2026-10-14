import React, { useState } from "react";

const ROW_STYLE = { display: "flex", justifyContent: "space-between", gap: "10px" };

const STATS_CSS = `
  .stats-scroll {
    scrollbar-width: thin;
    scrollbar-color: #ffee00 rgba(255, 255, 255, 0.08);
  }
  .stats-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .stats-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .stats-scroll::-webkit-scrollbar-thumb {
    background: #ffee00;
    border-radius: 4px;
    box-shadow: 0 0 6px rgba(255, 238, 0, 0.6);
  }
`;

function formatSkillName(id) {
  return id
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase());
}

function genericStats(data) {
  const parts = Object.entries(data ?? {})
    .filter(
      ([key, value]) =>
        key !== "enabled" &&
        typeof value === "number" &&
        !key.toLowerCase().includes("growth") &&
        !key.toLowerCase().startsWith("max")
    )
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${Number.isInteger(value) ? value : value.toFixed(2)}`);
  return parts.join(" · ");
}

function formatSkillDetail(id, data, player) {
  switch (id) {
    case "orbitalBlades":
      return (
        <div style={ROW_STYLE}>
          <span>Blades ×{Math.floor(data.count)}</span>
          <span>{data.damage.toFixed(1)} dmg</span>
        </div>
      );
    case "twinShot":
      return (
        <div style={ROW_STYLE}>
          <span>2nd shot</span>
          <span style={{ color: "#ffaa55" }}>ACTIVE</span>
        </div>
      );
    case "berserker":
      return (
        <div style={ROW_STYLE}>
          <span>Max bonus</span>
          <span>+{Math.round(data.bonus * 100)}%</span>
        </div>
      );
    case "overcharge":
      return (
        <div style={ROW_STYLE}>
          <span>Burst</span>
          <span>
            {data.damage.toFixed(1)} / {data.range.toFixed(1)}u
          </span>
        </div>
      );
    case "adrenaline":
      return (
        <div style={ROW_STYLE}>
          <span>On kill</span>
          <span>
            +{Math.round(data.speedBonus * 100)}% {data.duration.toFixed(1)}s
          </span>
        </div>
      );
    case "secondWind":
      return (
        <div style={ROW_STYLE}>
          <span>Status</span>
          <span style={{ color: player.secondWindUsed ? "#888" : "#88ffcc" }}>
            {player.secondWindUsed ? "USED" : "READY"}
          </span>
        </div>
      );
    case "staticField":
      return (
        <div style={ROW_STYLE}>
          <span>Freeze chance</span>
          <span>{Math.round(data.chance * 100)}%</span>
        </div>
      );
    case "dash":
      return (
        <div style={ROW_STYLE}>
          <span>Cooldown</span>
          <span>{data.cooldown.toFixed(1)}s</span>
        </div>
      );
    case "forceField":
      return (
        <div style={ROW_STYLE}>
          <span>Shields</span>
          <span>{data.shieldCount}</span>
        </div>
      );
    case "thorns":
      return (
        <div style={ROW_STYLE}>
          <span>Reflect</span>
          <span>{data.damage.toFixed(1)}</span>
        </div>
      );
    default: {
      const info = genericStats(data);
      return info ? (
        <div style={{ fontSize: "8px", color: "#aaa" }}>{info}</div>
      ) : null;
    }
  }
}

export default function StatsPanel({ player }) {
  const [expanded, setExpanded] = useState(false);

  const activePassives = Object.entries(player.active_skills ?? {}).filter(
    ([, data]) => data?.enabled
  );

  return (
    <div
      style={{
        fontFamily: '"Press Start 2P", monospace',
        pointerEvents: "auto",
      }}
    >
      <style>{STATS_CSS}</style>
      <button
        onClick={() => setExpanded((value) => !value)}
        style={{
          fontFamily: "inherit",
          fontSize: "10px",
          padding: "6px 10px",
          background: "rgba(8, 8, 14, 0.85)",
          color: "#ffee00",
          border: "1px solid rgba(255, 238, 0, 0.4)",
          borderRadius: "6px",
          cursor: "pointer",
          letterSpacing: "1px",
        }}
      >
        {expanded ? "▾ STATS" : "▸ STATS"}
      </button>
      {expanded && (
        <div
          className="stats-scroll"
          style={{
            marginTop: "6px",
            width: "200px",
            maxHeight: "38vh",
            overflowY: "auto",
            padding: "12px 14px",
            background: "rgba(8, 8, 14, 0.9)",
            border: "1px solid rgba(255, 238, 0, 0.35)",
            borderRadius: "8px",
            color: "#fff",
            fontSize: "9px",
            lineHeight: "1.9",
          }}
        >
          <div
            style={{ color: "#ffee00", marginBottom: "6px", letterSpacing: "1px" }}
          >
            CORE
          </div>
          <div style={ROW_STYLE}>
            <span>Damage</span>
            <span>{(player.damage ?? 0).toFixed(1)}</span>
          </div>
          <div style={ROW_STYLE}>
            <span>Speed</span>
            <span>{(player.speed ?? 0).toFixed(1)}</span>
          </div>
          <div style={ROW_STYLE}>
            <span>Atk Speed</span>
            <span>{(player.attackSpeed ?? 0).toFixed(2)}</span>
          </div>
          <div style={ROW_STYLE}>
            <span>Pierce</span>
            <span>{player.sharpening ?? 0}</span>
          </div>
          <div style={ROW_STYLE}>
            <span>Crit Chance</span>
            <span>{Math.round((player.criticalChance ?? 0) * 100)}%</span>
          </div>
          <div style={ROW_STYLE}>
            <span>Crit Damage</span>
            <span>+{Math.round((player.criticalDamage ?? 0) * 100)}%</span>
          </div>
          <div style={ROW_STYLE}>
            <span>Life Steal</span>
            <span>{Math.round((player.lifeSteal ?? 0) * 100)}%</span>
          </div>
          <div style={ROW_STYLE}>
            <span>HP Regen</span>
            <span>{(player.healthRegen ?? 0).toFixed(1)}/s</span>
          </div>

          {activePassives.length > 0 && (
            <>
              <div
                style={{
                  color: "#ffee00",
                  margin: "10px 0 6px",
                  letterSpacing: "1px",
                }}
              >
                PASSIVES
              </div>
              {activePassives.map(([id, data]) => (
                <div key={id} style={{ marginBottom: "6px" }}>
                  <div style={{ color: "#00e5ff" }}>{formatSkillName(id)}</div>
                  {formatSkillDetail(id, data, player)}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
