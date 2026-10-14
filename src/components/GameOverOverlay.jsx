import React from "react";
import CoinIcon from "./CoinIcon.jsx";
import { audio } from "../core/AudioEngine.js";
import { formatDuration } from "../core/history.js";

export default function GameOverOverlay({ stats, onRestart }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.88)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
      }}
    >
      <h1
        style={{
          fontSize: "48px",
          marginBottom: "32px",
          color: "#ff3333",
          textShadow: "0 0 20px #ff0000",
        }}
      >
        GAME OVER
      </h1>
      <p style={{ fontSize: "16px", marginBottom: "12px" }}>
        Level: {stats.level}
      </p>
      <p style={{ fontSize: "16px", marginBottom: "12px" }}>
        Time: {formatDuration(stats.elapsedTime ?? 0)}
      </p>
      <p style={{ fontSize: "16px", marginBottom: "12px" }}>
        Difficulty: {stats.power ?? 0}
      </p>
      <p
        style={{
          fontSize: "16px",
          marginBottom: "40px",
          color: "#ffd23e",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <CoinIcon size={16} /> +{stats.coins ?? 0}
      </p>
      <button
        onMouseEnter={() => audio.play("uiHover")}
        onClick={onRestart}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "14px",
          padding: "14px 28px",
          background: "#fff",
          color: "#000",
          border: "none",
          cursor: "pointer",
          borderRadius: "4px",
          letterSpacing: "2px",
        }}
      >
        RESTART
      </button>
    </div>
  );
}
