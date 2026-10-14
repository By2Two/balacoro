import React from "react";

export default function MobilePauseButton({ onPress }) {
  return (
    <button
      onClick={onPress}
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        zIndex: 30,
        width: "38px",
        height: "38px",
        borderRadius: "50%",
        background: "rgba(0, 0, 0, 0.45)",
        border: "2px solid rgba(255, 255, 255, 0.5)",
        color: "#fff",
        fontSize: "14px",
        letterSpacing: "2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "manipulation",
      }}
    >
      ❚❚
    </button>
  );
}
