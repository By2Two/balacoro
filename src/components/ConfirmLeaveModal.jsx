import React from "react";
import { audio } from "../core/AudioEngine.js";

export default function ConfirmLeaveModal({
  onSaveLeave,
  onLeaveWithoutSaving,
  onCancel,
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 150,
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
          maxWidth: "340px",
        }}
      >
        <div style={{ fontSize: "15px", color: "#ffee00" }}>
          PROGRESS NOT SAVED
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "#aaa",
            letterSpacing: "1px",
            lineHeight: "1.8",
          }}
        >
          LEAVING WILL LOSE THIS RUN UNLESS YOU SAVE IT FIRST.
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
          }}
        >
          <button
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => {
              audio.play("uiClick");
              onSaveLeave();
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
            SAVE &amp; LEAVE
          </button>
          <button
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => {
              audio.play("uiClick");
              onLeaveWithoutSaving();
            }}
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: "12px",
              padding: "12px 20px",
              background: "transparent",
              color: "#ff6666",
              border: "2px solid #ff6666",
              cursor: "pointer",
              borderRadius: "4px",
              letterSpacing: "2px",
            }}
          >
            LEAVE WITHOUT SAVING
          </button>
          <button
            onMouseEnter={() => audio.play("uiHover")}
            onClick={() => {
              audio.play("uiClick");
              onCancel();
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
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
}
