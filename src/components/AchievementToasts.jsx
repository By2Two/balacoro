import React from "react";

const TOAST_CSS = `
  @keyframes achievement-toast {
    0% { transform: translateX(120%); opacity: 0; }
    8% { transform: translateX(-6px); opacity: 1; }
    12% { transform: translateX(0); }
    86% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(120%); opacity: 0; }
  }
  @keyframes achievement-trophy {
    0%, 100% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.12) rotate(-6deg); }
  }
  @keyframes achievement-shine {
    0% { left: -60%; }
    100% { left: 130%; }
  }
`;

export const ACHIEVEMENT_TOAST_DURATION = 5000;

export default function AchievementToasts({ toasts }) {
  if (toasts.length === 0) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        top: "58px",
        right: "12px",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "flex-end",
        pointerEvents: "none",
        fontFamily: '"Press Start 2P", monospace',
      }}
    >
      <style>{TOAST_CSS}</style>
      {toasts.map((toast) => (
        <div
          key={toast.key}
          style={{
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            width: "min(290px, 70vw)",
            boxSizing: "border-box",
            padding: "10px 14px 10px 10px",
            background: "linear-gradient(135deg, rgba(40, 28, 6, 0.95), rgba(12, 10, 18, 0.95))",
            border: "2px solid #ffd23e",
            borderRadius: "8px",
            boxShadow: "0 0 18px rgba(255, 210, 62, 0.45), 0 4px 14px rgba(0, 0, 0, 0.6)",
            animation: `achievement-toast ${ACHIEVEMENT_TOAST_DURATION}ms ease-out forwards`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "40%",
              background: "linear-gradient(90deg, transparent, rgba(255, 240, 180, 0.25), transparent)",
              animation: "achievement-shine 1.2s ease-in-out 0.4s 1 both",
            }}
          />
          <div
            style={{
              flexShrink: 0,
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "radial-gradient(circle at 40% 35%, #fff1a8, #ffb31a 60%, #a86a00)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              boxShadow: "0 0 12px rgba(255, 190, 40, 0.8)",
              animation: "achievement-trophy 0.9s ease-in-out 2",
            }}
          >
            🏆
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
            <span style={{ fontSize: "7px", color: "#ffd23e", letterSpacing: "1px" }}>
              ACHIEVEMENT UNLOCKED
            </span>
            <span style={{ fontSize: "11px", color: "#ffffff", textShadow: "2px 2px #000" }}>
              {toast.label}
            </span>
            {toast.reward && (
              <span style={{ fontSize: "7px", color: toast.reward.color, lineHeight: "1.5" }}>
                NEW: {toast.reward.label}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
