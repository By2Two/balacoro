import React from "react";
import { audio } from "../core/AudioEngine.js";
import VolumeControls from "./VolumeControls.jsx";

export default function PauseOverlay({ onResume, onSaveQuit, onBackToMenu }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.7)",
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
          fontSize: "40px",
          marginBottom: "20px",
          textShadow: "0 0 20px #ffffff",
        }}
      >
        PAUSED
      </h1>
      <button
        onMouseEnter={() => audio.play("uiHover")}
        onClick={() => {
          audio.play("uiClick");
          onResume();
        }}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "14px",
          padding: "14px 28px",
          marginBottom: "16px",
          background: "#fff",
          color: "#000",
          border: "none",
          cursor: "pointer",
          borderRadius: "4px",
          letterSpacing: "2px",
        }}
      >
        RESUME
      </button>
      <button
        onMouseEnter={() => audio.play("uiHover")}
        onClick={() => {
          audio.play("uiClick");
          onSaveQuit();
        }}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "14px",
          padding: "14px 28px",
          marginBottom: "16px",
          background: "#ffee00",
          color: "#000",
          border: "none",
          cursor: "pointer",
          borderRadius: "4px",
          letterSpacing: "2px",
        }}
      >
        SAVE &amp; QUIT
      </button>
      <button
        onMouseEnter={() => audio.play("uiHover")}
        onClick={() => {
          audio.play("uiClick");
          onBackToMenu();
        }}
        style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "14px",
          padding: "14px 28px",
          background: "transparent",
          color: "#fff",
          border: "2px solid #fff",
          cursor: "pointer",
          borderRadius: "4px",
          letterSpacing: "2px",
        }}
      >
        BACK TO MENU
      </button>

      <div
        style={{
          marginTop: "40px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "280px",
          padding: "20px 24px",
          background: "rgba(255, 255, 255, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.25)",
          borderRadius: "6px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            letterSpacing: "3px",
            color: "#ffee00",
            textAlign: "center",
          }}
        >
          OPTIONS
        </div>
        <VolumeControls />
      </div>
    </div>
  );
}
