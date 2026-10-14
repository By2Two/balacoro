import React from "react";

export default function RotateDeviceOverlay() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#08080e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "24px",
        textAlign: "center",
        fontFamily: '"Press Start 2P", monospace',
        color: "#fff",
        zIndex: 1000,
      }}
    >
      <style>{`
        @keyframes rotate-hint {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
        }
      `}</style>
      <div
        style={{
          fontSize: "48px",
          animation: "rotate-hint 1.6s ease-in-out infinite",
        }}
      >
        📱
      </div>
      <div
        style={{
          fontSize: "14px",
          color: "#ffee00",
          letterSpacing: "2px",
          textShadow: "0 0 14px rgba(255, 238, 0, 0.5)",
        }}
      >
        ROTATE YOUR DEVICE
      </div>
      <div
        style={{
          fontSize: "9px",
          color: "#aaa",
          letterSpacing: "1px",
          lineHeight: "1.8",
          maxWidth: "260px",
        }}
      >
        BALACORO PLAYS IN LANDSCAPE. TURN YOUR PHONE SIDEWAYS TO CONTINUE.
      </div>
    </div>
  );
}
