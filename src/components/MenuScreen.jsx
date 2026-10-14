import React from "react";
import MainMenu from "./MainMenu.jsx";
import { audio } from "../core/AudioEngine.js";
import { formatDuration } from "../core/history.js";

export default function MenuScreen({
  onPlay,
  onCustomize,
  onMonsterLab,
  onOptions,
  onPowers,
  onUpgrades,
  continuePrompt,
  savedGame,
  onContinueGame,
  onNewGame,
  isTouchDevice,
  onRequestFullscreen,
}) {
  return (
    <>
      <MainMenu
        onPlay={onPlay}
        onCustomize={onCustomize}
        onMonsterLab={onMonsterLab}
        onOptions={onOptions}
        onPowers={onPowers}
        onUpgrades={onUpgrades}
        isTouchDevice={isTouchDevice}
        onRequestFullscreen={onRequestFullscreen}
      />
      {continuePrompt && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            fontFamily: '"Press Start 2P", monospace',
            color: "#fff",
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
            }}
          >
            <div style={{ fontSize: "16px", color: "#ffee00" }}>
              SAVED RUN FOUND
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "#aaa",
                letterSpacing: "1px",
                lineHeight: "1.8",
              }}
            >
              LEVEL {savedGame?.scene?.player?.level ?? "?"} •{" "}
              {formatDuration(savedGame?.scene?.elapsedTime ?? 0)} •{" "}
              {Math.floor(savedGame?.scene?.coinsEarned ?? 0)} COINS
            </div>
            <div style={{ display: "flex", gap: "14px" }}>
              <button
                onMouseEnter={() => audio.play("uiHover")}
                onClick={() => {
                  audio.play("uiClick");
                  onContinueGame();
                }}
                style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: "12px",
                  padding: "12px 20px",
                  background: "#ffee00",
                  color: "#000",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "4px",
                  letterSpacing: "2px",
                }}
              >
                CONTINUE
              </button>
              <button
                onMouseEnter={() => audio.play("uiHover")}
                onClick={() => {
                  audio.play("uiClick");
                  onNewGame();
                }}
                style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: "12px",
                  padding: "12px 20px",
                  background: "transparent",
                  color: "#fff",
                  border: "2px solid #fff",
                  cursor: "pointer",
                  borderRadius: "4px",
                  letterSpacing: "2px",
                }}
              >
                NEW GAME
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
