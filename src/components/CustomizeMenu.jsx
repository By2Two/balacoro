import React, { useEffect, useMemo, useState } from "react";
import MenuStage, { MENU_CSS } from "./MenuStage.jsx";
import CoinIcon from "./CoinIcon.jsx";
import {
  loadCustomization,
  saveCustomization,
} from "../core/customization.js";
import { PLAYER_COLORS } from "../core/cosmetics.js";
import { getCoins, spendCoins, unlockCosmetic } from "../core/wallet.js";
import {
  SHOP_TABS,
  RARITIES,
  CONFIRM_PRICE_THRESHOLD,
  getItemLock,
  getRarityColor,
  isItemOwned,
  isItemEquipped,
  isToggleItem,
  equipItem,
  unequipItem,
} from "../core/shopCatalog.js";
import { requestItemThumbnail } from "../core/thumbnails.js";
import { audio } from "../core/AudioEngine.js";

const CUSTOMIZE_CSS = `
  .cosmetic-scroll {
    max-height: min(300px, 40vh);
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 8px 6px 6px;
    margin: -6px -8px -6px -6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    scrollbar-width: thin;
    scrollbar-color: #ffee00 rgba(255, 255, 255, 0.08);
  }
  .cosmetic-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .cosmetic-scroll::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .cosmetic-scroll::-webkit-scrollbar-thumb {
    background: #ffee00;
    border-radius: 4px;
    box-shadow: 0 0 6px rgba(255, 238, 0, 0.6);
  }
  .shop-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin-bottom: 16px;
  }
  .shop-tabs .tab-button {
    font-size: 11px;
    padding: 6px 1px;
  }
  .shop-section-label {
    font-size: 9px;
    color: #777;
    letter-spacing: 2px;
    margin: 8px 0 2px;
  }
  .shop-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    flex-shrink: 0;
    box-sizing: border-box;
    padding: 5px 8px 5px 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid transparent;
    border-left: 4px solid var(--rarity);
    border-radius: 6px;
    color: #ddd;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 1px;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease, transform 0.12s ease;
  }
  .shop-row:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(4px);
  }
  .shop-row.equipped {
    border-color: rgba(255, 238, 0, 0.55);
    border-left-color: var(--rarity);
    background: rgba(255, 238, 0, 0.07);
  }
  .shop-row.previewed {
    box-shadow: 0 0 0 2px #00e5ff, 0 0 12px rgba(0, 229, 255, 0.45);
  }
  .shop-thumb {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 5px;
    background: radial-gradient(circle at 50% 40%, #2a2a3a, #101018);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .shop-thumb img {
    width: 100%;
    height: 100%;
  }
  .shop-row-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .shop-row-rarity {
    font-size: 7px;
    opacity: 0.75;
  }
  .shop-row-status {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    white-space: nowrap;
  }
  .color-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    max-width: 360px;
  }
  .color-row .swatch {
    width: 24px;
    height: 24px;
    border-width: 2px;
  }
  .swatch.custom {
    position: relative;
    background: conic-gradient(#ff3b3b, #ffd23e, #5bff6b, #3bd8ff, #7b5bff, #ff3bd2, #ff3b3b);
    overflow: hidden;
  }
  .swatch.custom input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .swatch.auto {
    background: repeating-linear-gradient(45deg, #333 0 4px, #555 4px 8px);
    color: #fff;
    font-family: inherit;
    font-size: 8px;
  }
  .buy-button {
    background: rgba(255, 238, 0, 0.14);
    border: 2px solid #ffee00;
    border-radius: 6px;
    color: #ffee00;
    font-family: inherit;
    font-size: 12px;
    letter-spacing: 2px;
    padding: 12px 22px;
    cursor: pointer;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }
  .buy-button:hover:not(:disabled) {
    background: rgba(255, 238, 0, 0.28);
    box-shadow: 0 0 16px rgba(255, 238, 0, 0.55);
  }
  .buy-button:disabled {
    border-color: #663333;
    color: #ff7777;
    cursor: default;
    background: rgba(255, 60, 60, 0.08);
    font-size: 9px;
  }
  .buy-button.secondary {
    border-color: #666;
    color: #aaa;
    background: transparent;
  }
  .progress-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ffb31a, #ffe27a);
  }
`;

const PANEL_STYLE = {
  position: "absolute",
  bottom: "6%",
  right: "4%",
  zIndex: 60,
  width: "min(340px, 44vw)",
  boxSizing: "border-box",
  padding: "14px 18px",
  background: "rgba(8, 8, 14, 0.92)",
  border: "2px solid #ffee00",
  borderRadius: "8px",
  boxShadow: "0 0 20px rgba(255, 238, 0, 0.35)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  fontFamily: '"Press Start 2P", monospace',
};

function formatPrice(price) {
  return price.toLocaleString("en-US");
}

function toHex(color) {
  return `#${(color ?? 0).toString(16).padStart(6, "0")}`;
}

function Thumb({ entry, color, projectileColor }) {
  const [url, setUrl] = useState(null);

  useEffect(
    () => requestItemThumbnail(entry, { color, projectileColor }, setUrl),
    [entry, color, projectileColor]
  );

  return (
    <div className="shop-thumb">{url && <img src={url} alt="" draggable={false} />}</div>
  );
}

function ColorRow({ label, value, onChange, allowAuto = false }) {
  const isCustom = value != null && !PLAYER_COLORS.includes(value);
  return (
    <div style={{ marginBottom: "12px" }}>
      <div className="shop-section-label">{label}</div>
      <div className="color-row">
        {allowAuto && (
          <button
            className={`swatch auto${value == null ? " selected" : ""}`}
            title="AUTO"
            onClick={() => {
              audio.play("uiClick");
              onChange(null);
            }}
          >
            A
          </button>
        )}
        {PLAYER_COLORS.map((color) => (
          <button
            key={color}
            className={`swatch${value === color ? " selected" : ""}`}
            style={{ background: toHex(color) }}
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => {
              audio.play("uiClick");
              onChange(color);
            }}
          />
        ))}
        <label
          className={`swatch custom${isCustom ? " selected" : ""}`}
          title="CUSTOM COLOR"
          style={isCustom ? { background: toHex(value) } : undefined}
        >
          <input
            type="color"
            value={toHex(value ?? 0xffffff)}
            onChange={(event) =>
              onChange(parseInt(event.target.value.slice(1), 16))
            }
          />
        </label>
      </div>
    </div>
  );
}

export default function CustomizeMenu({ onBack }) {
  const [customization, setCustomization] = useState(loadCustomization);
  const [tab, setTab] = useState("color");
  const [coins, setCoins] = useState(getCoins);
  const [preview, setPreview] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const update = (next) => {
    setCustomization(next);
    saveCustomization(next);
  };

  const patch = (fields) => update({ ...customization, ...fields });

  const previewLook = useMemo(
    () => (preview ? equipItem(customization, preview) : customization),
    [customization, preview]
  );

  const onItemClick = (entry) => {
    audio.play("uiClick");
    if (isItemOwned(entry)) {
      if (isToggleItem(entry) && isItemEquipped(entry, customization)) {
        update(unequipItem(customization, entry));
      } else {
        update(equipItem(customization, entry));
      }
      setPreview(null);
      return;
    }
    setPreview((current) => (current === entry ? null : entry));
  };

  const previewPrice = preview?.price ?? 0;
  const previewLock = preview ? getItemLock(preview) : null;
  const affordable = coins >= previewPrice;

  const completePurchase = () => {
    setConfirmOpen(false);
    if (!preview || !spendCoins(previewPrice)) {
      return;
    }
    audio.play("uiBuy");
    unlockCosmetic(preview.kind, preview.id);
    update(equipItem(customization, preview));
    setCoins(getCoins());
    setPreview(null);
  };

  const attemptPurchase = () => {
    if (!preview || !affordable || previewLock) {
      return;
    }
    if (previewPrice >= CONFIRM_PRICE_THRESHOLD) {
      audio.play("uiClick");
      setConfirmOpen(true);
      return;
    }
    completePurchase();
  };

  const renderStatus = (entry) => {
    const equipped = isItemEquipped(entry, customization);
    if (isItemOwned(entry)) {
      return equipped ? (
        <span style={{ color: "#ffee00" }}>{isToggleItem(entry) ? "ON" : "✔"}</span>
      ) : (
        <span style={{ color: "#666" }}>{isToggleItem(entry) ? "OFF" : ""}</span>
      );
    }
    const lock = getItemLock(entry);
    if (lock) {
      return (
        <span style={{ color: "#ffb31a" }}>
          🏆 {lock.current}/{lock.target}
        </span>
      );
    }
    return (
      <span style={{ color: "#ffd23e" }}>
        <CoinIcon size={11} /> {formatPrice(entry.price)}
      </span>
    );
  };

  const renderItemRow = (entry) => {
    const rarityColor = getRarityColor(entry.rarity);
    const equipped = isItemOwned(entry) && isItemEquipped(entry, customization);
    const previewed = preview === entry;
    return (
      <button
        key={`${entry.kind}:${entry.id}`}
        className={`shop-row${equipped ? " equipped" : ""}${
          previewed ? " previewed" : ""
        }`}
        style={{ "--rarity": rarityColor }}
        onMouseEnter={() => audio.play("uiHover")}
        onClick={() => onItemClick(entry)}
      >
        <Thumb
          entry={entry}
          color={customization.color}
          projectileColor={customization.projectileColor}
        />
        <span className="shop-row-text">
          <span style={{ color: rarityColor }}>{entry.label}</span>
          <span className="shop-row-rarity" style={{ color: rarityColor }}>
            {RARITIES[entry.rarity]?.label}
          </span>
        </span>
        <span className="shop-row-status">{renderStatus(entry)}</span>
      </button>
    );
  };

  const activeTab = SHOP_TABS.find((entry) => entry.id === tab);
  const previewName = preview?.label;
  const previewRarity = preview?.rarity;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
        zIndex: 50,
      }}
    >
      <style>{MENU_CSS}</style>
      <style>{CUSTOMIZE_CSS}</style>

      <MenuStage customization={previewLook} showcase />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "18px",
          paddingLeft: "6%",
          pointerEvents: "none",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "min(4vw, 44px)",
              letterSpacing: "6px",
              color: "#ffee00",
              textShadow: "0 0 24px rgba(255, 238, 0, 0.5), 4px 4px 0 #7a5c00",
              margin: 0,
            }}
          >
            CUSTOMIZE
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "12px",
              fontSize: "14px",
              color: "#ffd23e",
              textShadow: "2px 2px #000",
            }}
          >
            <CoinIcon size={15} /> {formatPrice(coins)}
          </div>
        </div>

        <div
          style={{
            pointerEvents: "auto",
            width: "min(400px, 48vw)",
            alignSelf: "flex-start",
          }}
        >
          <div className="shop-tabs">
            {SHOP_TABS.map((entry) => (
              <button
                key={entry.id}
                className={`tab-button${tab === entry.id ? " active" : ""}`}
                onMouseEnter={() => audio.play("uiHover")}
                onClick={() => {
                  audio.play("uiClick");
                  setTab(entry.id);
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>

          {tab === "color" && (
            <div className="cosmetic-scroll">
              <ColorRow
                label="BODY"
                value={customization.color}
                onChange={(color) => patch({ color })}
              />
              <ColorRow
                label="SHOT"
                value={customization.projectileColor}
                onChange={(projectileColor) => patch({ projectileColor })}
              />
              <ColorRow
                label="DASH GHOST"
                value={customization.dashColor}
                allowAuto
                onChange={(dashColor) => patch({ dashColor })}
              />
              <ColorRow
                label="SHIELD AURA"
                value={customization.shieldColor}
                allowAuto
                onChange={(shieldColor) => patch({ shieldColor })}
              />
            </div>
          )}

          {activeTab?.sections && (
            <div className="cosmetic-scroll">
              {activeTab.sections.map((section) => (
                <React.Fragment key={section.label}>
                  <div className="shop-section-label">{section.label}</div>
                  {section.items.map(renderItemRow)}
                </React.Fragment>
              ))}
            </div>
          )}

          <button
            className="menu-button"
            style={{ marginTop: "18px", fontSize: "14px" }}
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => {
              audio.play("uiClick");
              onBack();
            }}
          >
            &lt; BACK
          </button>
        </div>
      </div>

      {preview && (
        <div style={PANEL_STYLE}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: getRarityColor(previewRarity) }}>
              {previewName}
            </span>
            <span style={{ fontSize: "8px", color: getRarityColor(previewRarity) }}>
              {RARITIES[previewRarity]?.label}
            </span>
          </div>

          {previewLock ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "9px", color: "#ffb31a", lineHeight: "1.6" }}>
                🏆 {previewLock.label}
              </span>
              <span style={{ fontSize: "8px", color: "#bbb", lineHeight: "1.6" }}>
                {previewLock.description}
              </span>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(previewLock.current / previewLock.target) * 100}%`,
                  }}
                />
              </div>
              <span style={{ fontSize: "8px", color: "#888" }}>
                {previewLock.current} / {previewLock.target}
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#ffd23e",
                }}
              >
                <CoinIcon size={13} /> {formatPrice(previewPrice)}
              </span>
              <button
                className="buy-button"
                disabled={!affordable}
                onMouseEnter={() => affordable && audio.play("uiHover")}
                onClick={attemptPurchase}
              >
                {affordable
                  ? "BUY"
                  : `NEED ${formatPrice(previewPrice - coins)} MORE`}
              </button>
            </div>
          )}
        </div>
      )}

      {confirmOpen && preview && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 80,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: '"Press Start 2P", monospace',
          }}
        >
          <div
            style={{
              ...PANEL_STYLE,
              position: "static",
              width: "min(420px, 90vw)",
              alignItems: "center",
              textAlign: "center",
              gap: "18px",
            }}
          >
            <span style={{ fontSize: "12px", lineHeight: "1.8" }}>
              BUY{" "}
              <span style={{ color: getRarityColor(previewRarity) }}>{previewName}</span>?
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                color: "#ffd23e",
              }}
            >
              <CoinIcon size={15} /> {formatPrice(previewPrice)}
            </span>
            <div style={{ display: "flex", gap: "14px" }}>
              <button
                className="buy-button"
                onMouseEnter={() => audio.play("uiHover")}
                onClick={completePurchase}
              >
                YES, BUY
              </button>
              <button
                className="buy-button secondary"
                onMouseEnter={() => audio.play("uiHover")}
                onClick={() => {
                  audio.play("uiClick");
                  setConfirmOpen(false);
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
