import React from "react";

export default function BootScreen() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#08080e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "48px",
        fontFamily: '"Press Start 2P", monospace',
        cursor: "pointer",
      }}
    >
      <style>{`
        @keyframes boot-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
      `}</style>
      <h1
        style={{
          fontSize: "min(7vw, 80px)",
          letterSpacing: "10px",
          color: "#ffee00",
          textShadow: "0 0 24px rgba(255, 238, 0, 0.5), 5px 5px 0 #7a5c00",
          margin: 0,
        }}
      >
        BALACORO
      </h1>
      <div
        style={{
          fontSize: "14px",
          letterSpacing: "4px",
          color: "#fff",
          textShadow: "2px 2px #000",
          animation: "boot-blink 1.6s steps(1) infinite",
        }}
      >
        PRESS ANY KEY
      </div>
    </div>
  );
}
