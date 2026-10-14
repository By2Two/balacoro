import React, { useEffect, useState } from "react";
import { BANNER_DURATION } from "../constants.js";

export default function Banner({ banner }) {
  const [phase, setPhase] = useState("in");

  useEffect(() => {
    if (!banner) {
      return undefined;
    }
    setPhase("in");
    const holdTimeoutId = setTimeout(
      () => setPhase("out"),
      BANNER_DURATION * 1000 - 800
    );
    const endTimeoutId = setTimeout(
      () => setPhase("done"),
      BANNER_DURATION * 1000
    );
    return () => {
      clearTimeout(holdTimeoutId);
      clearTimeout(endTimeoutId);
    };
  }, [banner]);

  if (!banner || phase === "done") {
    return null;
  }

  const { color, icon, text, sub } = banner;

  return (
    <div
      key={banner.key}
      style={{
        position: "absolute",
        top: "26%",
        left: 0,
        right: 0,
        zIndex: 40,
        pointerEvents: "none",
        opacity: phase === "in" ? 1 : 0,
        transition: "opacity 0.8s ease",
      }}
    >
      <style>{`
        @keyframes banner-band-in {
          from { opacity: 0; transform: scaleY(0.4); }
          to { opacity: 1; transform: scaleY(1); }
        }
        @keyframes banner-title-spread {
          from { letter-spacing: 2px; opacity: 0; }
          15% { opacity: 1; }
          to { letter-spacing: 12px; opacity: 1; }
        }
        @keyframes banner-icon-pop {
          from { opacity: 0; transform: scale(0.3) rotate(-20deg); }
          60% { transform: scale(1.25) rotate(6deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes banner-line-grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
      <div
        style={{
          width: "100%",
          padding: "26px 0 22px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.82) 20%, rgba(0,0,0,0.82) 80%, rgba(0,0,0,0) 100%)",
          animation: "banner-band-in 0.45s ease-out",
          fontFamily: '"Press Start 2P", monospace',
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "min(70vw, 560px)",
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            animation: "banner-line-grow 0.6s ease-out",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <span
            style={{
              fontSize: "30px",
              filter: `drop-shadow(0 0 14px ${color})`,
              animation: "banner-icon-pop 0.5s ease-out",
            }}
          >
            {icon}
          </span>
          <span
            style={{
              fontSize: "min(4vw, 30px)",
              color,
              textShadow: `0 0 22px ${color}, 0 0 6px #000, 3px 3px 0 #000`,
              animation: `banner-title-spread ${BANNER_DURATION}s linear forwards`,
            }}
          >
            {text}
          </span>
        </div>
        {sub && (
          <div
            style={{
              fontSize: "10px",
              letterSpacing: "4px",
              color: "#c8c8c8",
              textShadow: "2px 2px 0 #000",
            }}
          >
            {sub}
          </div>
        )}
        <div
          style={{
            width: "min(70vw, 560px)",
            height: "2px",
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            animation: "banner-line-grow 0.6s ease-out",
          }}
        />
      </div>
    </div>
  );
}
