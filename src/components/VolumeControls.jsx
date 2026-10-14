import React, { useState } from "react";
import { audio } from "../core/AudioEngine.js";

const SLIDERS = [
  { key: "music", label: "MUSIC" },
  { key: "effects", label: "EFFECTS" },
];

export default function VolumeControls() {
  const [volumes, setVolumes] = useState(() => ({ ...audio.userVolumes }));

  const changeVolume = (key, value) => {
    if (key === "master") {
      audio.setMasterVolume(value);
    } else if (key === "music") {
      audio.setMusicVolume(value);
    } else {
      audio.setEffectsVolume(value);
    }
    setVolumes({ ...audio.userVolumes });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {SLIDERS.map(({ key, label }) => (
        <label
          key={key}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "11px",
            letterSpacing: "2px",
            color: "#ccc",
          }}
        >
          <span>
            {label}: {Math.round(volumes[key] * 100)}%
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volumes[key]}
            onChange={(event) => changeVolume(key, Number(event.target.value))}
            style={{ accentColor: "#ffee00", width: "100%" }}
          />
        </label>
      ))}
    </div>
  );
}
