import React, { useState } from "react";
import MenuStage, { MENU_CSS } from "./MenuStage.jsx";
import { loadCustomization } from "../core/customization.js";
import { audio } from "../core/AudioEngine.js";
import { isDebugMode } from "../core/debug.js";
import {
  getRunHistory,
  getBestRun,
  formatDuration,
} from "../core/history.js";
import { version } from "../../package.json";

const MENU_ITEMS = [
  { id: "play", label: "PLAY" },
  { id: "customize", label: "CUSTOMIZE" },
  { id: "powers", label: "POWERS" },
  { id: "upgrades", label: "UPGRADES" },
  { id: "monsterlab", label: "MONSTER LAB", debugOnly: true },
  { id: "options", label: "OPTIONS" },
];

export default function MainMenu({
  onPlay,
  onCustomize,
  onMonsterLab,
  onOptions,
  onPowers,
  onUpgrades,
  isTouchDevice,
  onRequestFullscreen,
}) {
  const [customization] = useState(loadCustomization);
  const [runs] = useState(getRunHistory);
  const bestRun = getBestRun(runs);
  const [viewMode, setViewMode] = useState("recent");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [debugMode] = useState(isDebugMode);
  const visibleMenuItems = MENU_ITEMS.filter((item) => !item.debugOnly || debugMode);

  const topRuns = [...runs].sort((a, b) => b.time - a.time).slice(0, 3);
  const visibleRuns = viewMode === "top" ? topRuns : runs.slice(0, 5);

  const handleSelect = (item) => {
    if (item.disabled) {
      return;
    }
    audio.play("uiClick");
    if (item.id === "play") {
      onPlay();
    }
    if (item.id === "customize") {
      onCustomize();
    }
    if (item.id === "monsterlab") {
      onMonsterLab();
    }
    if (item.id === "options") {
      onOptions();
    }
    if (item.id === "powers") {
      onPowers();
    }
    if (item.id === "upgrades") {
      onUpgrades();
    }
  };

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

      <MenuStage customization={customization} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "40px",
          paddingLeft: "8%",
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            fontSize: "min(7vw, 80px)",
            letterSpacing: "10px",
            color: "#ffee00",
            textShadow:
              "0 0 24px rgba(255, 238, 0, 0.5), 5px 5px 0 #7a5c00",
            margin: 0,
          }}
        >
          BALACORO
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "14px",
            pointerEvents: "auto",
          }}
        >
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              className="menu-button"
              disabled={item.disabled}
              onMouseEnter={() => !item.disabled && audio.play("uiHover")}
              onClick={() => handleSelect(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {runs.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "24px",
            right: "24px",
            width: "300px",
            padding: "18px 20px",
            background: "rgba(8, 8, 14, 0.82)",
            border: "1px solid rgba(255, 238, 0, 0.35)",
            borderRadius: "8px",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "3px",
              color: "#ffee00",
              marginBottom: "12px",
            }}
          >
            ☠ BEST RUN
          </div>
          <div
            style={{
              fontSize: "9px",
              color: "#fff",
              letterSpacing: "1px",
              lineHeight: "2",
              marginBottom: "14px",
            }}
          >
            TIME {formatDuration(bestRun.time)} • LVL {bestRun.level}
            <br />
            DIFFICULTY {bestRun.power} • {bestRun.coins} COINS
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "2px",
                color: "#888",
              }}
            >
              {viewMode === "top" ? "TOP 3" : "LAST RUNS"}
            </div>
            <button
              onMouseEnter={() => audio.play("uiHover")}
              onClick={() => {
                audio.play("uiClick");
                setViewMode((mode) => (mode === "top" ? "recent" : "top"));
              }}
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "7px",
                letterSpacing: "1px",
                padding: "4px 8px",
                background: "transparent",
                color: "#ffee00",
                border: "1px solid #ffee00",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {viewMode === "top" ? "RECENT" : "TOP 3"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "8px",
              color: "#aaa",
              letterSpacing: "1px",
              marginBottom: "12px",
            }}
          >
            {visibleRuns.map((run, index) => (
              <div key={run.date ?? index}>
                {formatDuration(run.time)} • LVL {run.level} • DIF {run.power}{" "}
                • {run.coins}c
              </div>
            ))}
          </div>

          <button
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => {
              audio.play("uiClick");
              setHistoryOpen(true);
            }}
            style={{
              width: "100%",
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "10px",
              letterSpacing: "3px",
              padding: "8px 0",
              background: "transparent",
              color: "#888",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            •••
          </button>
        </div>
      )}

      {historyOpen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            style={{
              width: "min(560px, 86vw)",
              maxHeight: "78vh",
              display: "flex",
              flexDirection: "column",
              background: "#101018",
              border: "2px solid #ffee00",
              borderRadius: "10px",
              padding: "24px 26px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  letterSpacing: "3px",
                  color: "#ffee00",
                  textShadow: "0 0 14px rgba(255, 238, 0, 0.5)",
                }}
              >
                RUN HISTORY
              </div>
              <button
                onMouseEnter={() => audio.play("uiHover")}
                onClick={() => {
                  audio.play("uiClick");
                  setHistoryOpen(false);
                }}
                style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: "12px",
                  padding: "6px 12px",
                  background: "transparent",
                  color: "#fff",
                  border: "2px solid #fff",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                X
              </button>
            </div>

            <div
              style={{
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "9px",
                color: "#ccc",
                letterSpacing: "0.5px",
              }}
            >
              {runs.map((run, index) => (
                <div
                  key={run.date ?? index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    background:
                      run === bestRun
                        ? "rgba(255, 238, 0, 0.08)"
                        : "rgba(255, 255, 255, 0.04)",
                    border:
                      run === bestRun
                        ? "1px solid rgba(255, 238, 0, 0.4)"
                        : "1px solid transparent",
                    borderRadius: "4px",
                  }}
                >
                  <span style={{ color: "#666", minWidth: "24px" }}>
                    #{index + 1}
                  </span>
                  <span>{formatDuration(run.time)}</span>
                  <span>LVL {run.level}</span>
                  <span>DIF {run.power}</span>
                  <span style={{ color: "#ffd23e" }}>{run.coins}c</span>
                  <span style={{ color: "#666" }}>
                    {run.date
                      ? new Date(run.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "24px",
          fontSize: "9px",
          letterSpacing: "2px",
          color: "#ffee00",
          opacity: 0.6,
          textShadow: "0 0 10px rgba(255, 238, 0, 0.35)",
          pointerEvents: "none",
        }}
      >
        v{version}
      </div>

      {isTouchDevice && (
        <button
          onMouseEnter={() => audio.play("uiHover")}
          onClick={() => {
            audio.play("uiClick");
            onRequestFullscreen?.();
          }}
          style={{
            position: "absolute",
            bottom: "16px",
            right: "16px",
            fontFamily: '"Press Start 2P", monospace',
            fontSize: "9px",
            letterSpacing: "1px",
            padding: "10px 14px",
            background: "rgba(8, 8, 14, 0.82)",
            color: "#ffee00",
            border: "1px solid rgba(255, 238, 0, 0.35)",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ⛶ FULLSCREEN
        </button>
      )}
    </div>
  );
}
