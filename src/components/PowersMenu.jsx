import React, { useState } from "react";
import { MENU_CSS } from "./MenuStage.jsx";
import CoinIcon from "./CoinIcon.jsx";
import {
  POWER_DEFS,
  POWER_IDS,
  loadPowerLoadout,
  savePowerLoadout,
} from "../core/powers.js";
import { getCoins, spendCoins, isOwned, unlockCosmetic } from "../core/wallet.js";
import { audio } from "../core/AudioEngine.js";
import { hasRun, clearRun } from "../core/saveGame.js";

const GRID_COLUMNS = 4;
const GRID_ROWS = 6;
const GRID_CAPACITY = GRID_COLUMNS * GRID_ROWS;

const POWERS_CSS = `
  .power-scroll {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 8px 6px 6px;
    margin: -6px -8px -6px -6px;
    display: grid;
    grid-template-columns: repeat(${GRID_COLUMNS}, 1fr);
    justify-items: center;
    align-content: start;
    row-gap: 18px;
    column-gap: 8px;
    scrollbar-width: thin;
    scrollbar-color: #ffee00 rgba(255, 255, 255, 0.08);
  }
  .power-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .power-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .power-scroll::-webkit-scrollbar-thumb {
    background: #ffee00;
    border-radius: 4px;
    box-shadow: 0 0 6px rgba(255, 238, 0, 0.6);
  }
  .power-circle {
    width: 78px;
    height: 78px;
    border-radius: 50%;
    background: rgba(20, 20, 30, 0.85);
    border: 2px solid rgba(255, 255, 255, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
  }
  .power-circle:hover {
    transform: scale(1.06);
  }
  .power-circle.selected {
    border-color: #00e5ff;
    box-shadow: 0 0 14px rgba(0, 229, 255, 0.55);
  }
  .power-circle.locked {
    opacity: 0.5;
  }
  .power-circle.empty {
    background: transparent;
    border: 2px dashed rgba(255, 255, 255, 0.15);
    cursor: default;
  }
  .power-circle.empty:hover {
    transform: none;
  }
  .slot-circle {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: rgba(20, 20, 30, 0.9);
    border: 3px solid #ffee00;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 38px;
    cursor: pointer;
    position: relative;
    box-shadow: 0 0 16px rgba(255, 238, 0, 0.35);
    transition: transform 0.1s ease, box-shadow 0.15s ease;
  }
  .slot-circle:hover {
    transform: scale(1.05);
    box-shadow: 0 0 22px rgba(255, 238, 0, 0.6);
  }
  .slot-circle.disabled {
    cursor: default;
    opacity: 0.4;
  }
  .slot-circle.disabled:hover {
    transform: none;
  }
  .slot-letter {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    font-family: "Press Start 2P", monospace;
    font-size: 11px;
    color: #000;
    background: #ffee00;
    padding: 2px 8px;
    border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, 0.4);
  }
  .buy-button {
    background: rgba(255, 238, 0, 0.14);
    border: 2px solid #ffee00;
    border-radius: 6px;
    color: #ffee00;
    font-family: inherit;
    font-size: 12px;
    letter-spacing: 2px;
    padding: 12px 26px;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .buy-button:hover:not(:disabled) {
    background: rgba(255, 238, 0, 0.28);
    box-shadow: 0 0 16px rgba(255, 238, 0, 0.55);
  }
  .buy-button:disabled {
    border-color: #555;
    color: #555;
    cursor: default;
    background: transparent;
  }
`;

export default function PowersMenu({ onBack }) {
  const [loadout, setLoadout] = useState(loadPowerLoadout);
  const [selected, setSelected] = useState(null);
  const [coins, setCoins] = useState(getCoins);
  const [pendingSlot, setPendingSlot] = useState(null);

  const isFree = (id) => (POWER_DEFS[id]?.price ?? 0) === 0;
  const ownsPower = (id) => isFree(id) || isOwned("power", id);

  const selectPower = (id) => {
    audio.play("uiClick");
    setSelected((current) => (current === id ? null : id));
  };

  const applyAssign = (slot) => {
    audio.play("uiClick");
    const next = { ...loadout, [slot]: selected };
    setLoadout(next);
    savePowerLoadout(next);
  };

  const assignSlot = (slot) => {
    if (!selected || !ownsPower(selected)) {
      return;
    }
    const otherSlot = slot === "q" ? "e" : "q";
    if (loadout[otherSlot] === selected) {
      return;
    }
    if (hasRun()) {
      setPendingSlot(slot);
      return;
    }
    applyAssign(slot);
  };

  const confirmAssign = () => {
    clearRun();
    applyAssign(pendingSlot);
    setPendingSlot(null);
  };

  const buySelected = () => {
    if (!selected) {
      return;
    }
    const def = POWER_DEFS[selected];
    if (spendCoins(def.price)) {
      audio.play("uiBuy");
      unlockCosmetic("power", selected);
      setCoins(getCoins());
    }
  };

  const selectedDef = selected ? POWER_DEFS[selected] : null;
  const selectedOwned = selected ? ownsPower(selected) : false;
  const selectedAffordable = selectedDef ? coins >= selectedDef.price : false;

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
        display: "flex",
        flexDirection: "row",
      }}
    >
      <style>{MENU_CSS}</style>
      <style>{POWERS_CSS}</style>

      <div
        style={{
          width: "50%",
          height: "100%",
          boxSizing: "border-box",
          padding: "4vh 3vw",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          overflow: "hidden",
        }}
      >
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
            POWERS
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
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#888",
            letterSpacing: "1px",
            lineHeight: "1.8",
          }}
        >
          Pick a power below, then click the Q or E circle on the right to
          equip it there.
        </div>

        <div className="power-scroll" style={{ flex: 1 }}>
          {Array.from({
            length: Math.max(GRID_CAPACITY, POWER_IDS.length),
          }).map((_, index) => {
            const id = POWER_IDS[index];
            if (!id) {
              return <div key={`empty-${index}`} className="power-circle empty" />;
            }
            const def = POWER_DEFS[id];
            const owned = ownsPower(id);
            const isSelected = selected === id;
            const equippedSlot =
              loadout.q === id ? "Q" : loadout.e === id ? "E" : null;
            return (
              <div
                key={id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  width: "100%",
                  maxWidth: "96px",
                }}
              >
                <button
                  className={`power-circle${isSelected ? " selected" : ""}${
                    owned ? "" : " locked"
                  }`}
                  onMouseEnter={() => audio.play("uiHover")}
                  onClick={() => selectPower(id)}
                >
                  {def.icon ? (
                    <img
                      src={def.icon}
                      alt={def.label}
                      style={{
                        width: "52px",
                        height: "52px",
                        imageRendering: "pixelated",
                      }}
                    />
                  ) : (
                    def.emoji
                  )}
                  {equippedSlot && (
                    <span className="slot-letter">{equippedSlot}</span>
                  )}
                </button>
                <div
                  style={{
                    fontSize: "8px",
                    color: "#ccc",
                    textAlign: "center",
                    letterSpacing: "0.5px",
                    lineHeight: "1.4",
                  }}
                >
                  {def.label}
                </div>
                {!owned && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "9px",
                      color: "#ffd23e",
                    }}
                  >
                    🔒 <CoinIcon size={10} />{" "}
                    {def.price.toLocaleString("en-US")}
                  </div>
                )}
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

      <div
        style={{
          width: "50%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "34px",
          boxSizing: "border-box",
          borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {["e", "q"].map((slot) => {
          const powerId = loadout[slot];
          const def = powerId ? POWER_DEFS[powerId] : null;
          const canAssign =
            selected != null &&
            ownsPower(selected) &&
            loadout[slot === "q" ? "e" : "q"] !== selected;
          return (
            <div
              key={slot}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                className={`slot-circle${
                  !canAssign && selected ? " disabled" : ""
                }`}
                onClick={() => assignSlot(slot)}
                title={def?.label ?? "Empty"}
              >
                {def?.icon ? (
                  <img
                    src={def.icon}
                    alt={def.label}
                    style={{
                      width: "64px",
                      height: "64px",
                      imageRendering: "pixelated",
                    }}
                  />
                ) : (
                  (def?.emoji ?? "—")
                )}
                <span className="slot-letter">{slot.toUpperCase()}</span>
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "#ccc",
                  textAlign: "center",
                  letterSpacing: "0.5px",
                }}
              >
                {def?.label ?? "EMPTY"}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDef && (
        <div
          style={{
            position: "absolute",
            bottom: "6%",
            right: "5%",
            zIndex: 60,
            maxWidth: "260px",
            padding: "14px 18px",
            background: "rgba(8, 8, 14, 0.92)",
            border: "2px solid #ffee00",
            borderRadius: "8px",
            boxShadow: "0 0 20px rgba(255, 238, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "11px", color: "#ffee00" }}>
            {selectedDef.label}
          </div>
          <div
            style={{
              fontSize: "8px",
              color: "#aaa",
              letterSpacing: "0.5px",
              lineHeight: "1.6",
            }}
          >
            {selectedDef.description}
          </div>
          {!selectedOwned && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#ffd23e",
                }}
              >
                <CoinIcon size={13} />{" "}
                {selectedDef.price.toLocaleString("en-US")}
              </div>
              <button
                className="buy-button"
                disabled={!selectedAffordable}
                onMouseEnter={() =>
                  selectedAffordable && audio.play("uiHover")
                }
                onClick={buySelected}
              >
                BUY
              </button>
            </div>
          )}
        </div>
      )}

      {pendingSlot && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "#101018",
              border: "2px solid #ffee00",
              borderRadius: "10px",
              padding: "28px 32px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "18px",
              textAlign: "center",
              maxWidth: "340px",
            }}
          >
            <div style={{ fontSize: "14px", color: "#ffee00" }}>
              THIS WILL RESTART YOUR RUN
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "#aaa",
                letterSpacing: "1px",
                lineHeight: "1.8",
              }}
            >
              YOU HAVE A SAVED RUN IN PROGRESS. CHANGING YOUR LOADOUT WILL
              ERASE IT AND START FRESH NEXT TIME YOU PLAY.
            </div>
            <div style={{ display: "flex", gap: "14px" }}>
              <button
                className="buy-button"
                onMouseEnter={() => audio.play("uiHover")}
                onClick={confirmAssign}
              >
                CONFIRM
              </button>
              <button
                className="buy-button"
                onMouseEnter={() => audio.play("uiHover")}
                onClick={() => {
                  audio.play("uiClick");
                  setPendingSlot(null);
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
