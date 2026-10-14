import React from "react";

export default function CoinIcon({ size = 14 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 35% 35%, #ffe680, #f5b301 60%, #b97b00)",
        border: "2px solid #8a5c00",
        boxSizing: "border-box",
        verticalAlign: "middle",
      }}
    />
  );
}
