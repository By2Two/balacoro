import React, { useState } from "react";
import { MENU_CSS } from "./MenuStage.jsx";
import CoinIcon from "./CoinIcon.jsx";
import { getCoins } from "../core/wallet.js";
import { audio } from "../core/AudioEngine.js";
import {
  UPGRADE_DEFS,
  UPGRADE_IDS,
  loadUpgradeLevels,
  getUpgradePrice,
  getUpgradeValue,
  purchaseUpgrade,
} from "../core/upgrades.js";

const UPGRADES_CSS = `
  .upgrade-list {
    min-height: 0;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
    align-content: start;
    padding: 4px 8px 4px 4px;
    scrollbar-width: thin;
    scrollbar-color: #ffee00 rgba(255, 255, 255, 0.08);
  }
  .upgrade-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: rgba(20, 20, 30, 0.85);
    border: 2px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 16px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .upgrade-row:hover {
    border-color: var(--accent);
    box-shadow: 0 0 14px var(--accent);
  }
  .upgrade-pips {
    display: flex;
    gap: 5px;
  }
  .upgrade-pip {
    width: 16px;
    height: 8px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.12);
  }
  .upgrade-pip.filled {
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
  }
  .upgrade-buy {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(255, 238, 0, 0.14);
    border: 2px solid #ffee00;
    border-radius: 6px;
    color: #ffee00;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 1px;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .upgrade-buy:hover:not(:disabled) {
    background: rgba(255, 238, 0, 0.28);
    box-shadow: 0 0 14px rgba(255, 238, 0, 0.55);
  }
  .upgrade-buy:disabled {
    border-color: #555;
    color: #666;
    cursor: default;
    background: transparent;
  }
`;

export default function UpgradesMenu({ onBack }) {
  const [levels, setLevels] = useState(loadUpgradeLevels);
  const [coins, setCoins] = useState(getCoins);

  const buy = (id) => {
    if (purchaseUpgrade(id)) {
      audio.play("uiBuy");
      setLevels(loadUpgradeLevels());
      setCoins(getCoins());
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "#08080e",
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
        zIndex: 50,
        boxSizing: "border-box",
        padding: "4vh 4vw",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <style>{MENU_CSS}</style>
      <style>{UPGRADES_CSS}</style>

      <div>
        <h1
          style={{
            fontSize: "min(3.4vw, 36px)",
            letterSpacing: "6px",
            color: "#ffee00",
            textShadow: "0 0 24px rgba(255, 238, 0, 0.5), 4px 4px 0 #7a5c00",
            margin: 0,
          }}
        >
          UPGRADES
        </h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "10px",
            fontSize: "13px",
            color: "#ffd23e",
            textShadow: "2px 2px #000",
          }}
        >
          <CoinIcon size={14} /> {coins.toLocaleString("en-US")}
        </div>
        <div
          style={{
            fontSize: "9px",
            color: "#888",
            letterSpacing: "1px",
            lineHeight: "1.8",
            marginTop: "10px",
          }}
        >
          Permanent bonuses. They apply to every new run.
        </div>
      </div>

      <div className="upgrade-list" style={{ flex: 1 }}>
        {UPGRADE_IDS.map((id) => {
          const def = UPGRADE_DEFS[id];
          const level = levels[id];
          const price = getUpgradePrice(id, level);
          const maxed = price == null;
          const affordable = !maxed && coins >= price;
          return (
            <div
              key={id}
              className="upgrade-row"
              style={{ "--accent": def.color }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: def.color,
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    flexShrink: 0,
                  }}
                >
                  {def.icon}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "11px", color: def.color }}>{def.label}</div>
                  <div className="upgrade-pips">
                    {Array.from({ length: def.maxLevel }).map((_, index) => (
                      <div
                        key={index}
                        className={`upgrade-pip${index < level ? " filled" : ""}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: "8px", color: "#aaa", lineHeight: "1.7" }}>
                {def.description}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "#ddd",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ visibility: level > 0 ? "visible" : "hidden" }}>
                  <span style={{ color: "#777" }}>NOW </span>
                  {def.format(getUpgradeValue(id, Math.max(level, 1)))}
                </div>
                <div style={{ visibility: maxed ? "hidden" : "visible" }}>
                  <span style={{ color: "#777" }}>NEXT </span>
                  <span style={{ color: "#4dff88" }}>
                    {def.format(getUpgradeValue(id, Math.min(level + 1, def.maxLevel)))}
                  </span>
                </div>
              </div>
              <button
                className="upgrade-buy"
                style={{ marginTop: "auto" }}
                disabled={!affordable}
                onMouseEnter={() => affordable && audio.play("uiHover")}
                onClick={() => buy(id)}
              >
                {maxed ? (
                  "MAXED"
                ) : (
                  <>
                    BUY <CoinIcon size={11} /> {price.toLocaleString("en-US")}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <button
        className="menu-button"
        style={{ fontSize: "14px", width: "220px" }}
        onMouseEnter={() => audio.play("uiHover")}
        onClick={() => {
          audio.play("uiClick");
          onBack();
        }}
      >
        &lt; BACK
      </button>
    </div>
  );
}
