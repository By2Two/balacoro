import React, { useRef, useState } from "react";

const OUTER_SIZE = 132;
const KNOB_SIZE = 58;
const MAX_OFFSET = (OUTER_SIZE - KNOB_SIZE) / 2;

export default function TouchJoystick({
  onChange,
  side = "left",
  knobColor = "rgba(255, 238, 0, 0.85)",
  knobGlow = "rgba(255, 238, 0, 0.55)",
}) {
  const baseRef = useRef(null);
  const activePointerId = useRef(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const updateFromClient = (clientX, clientY) => {
    const base = baseRef.current;
    if (!base) {
      return;
    }
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_OFFSET) {
      dx = (dx / dist) * MAX_OFFSET;
      dy = (dy / dist) * MAX_OFFSET;
    }
    setKnobOffset({ x: dx, y: dy });
    onChange(dx / MAX_OFFSET, dy / MAX_OFFSET);
  };

  const onPointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerId.current = event.pointerId;
    updateFromClient(event.clientX, event.clientY);
  };

  const onPointerMove = (event) => {
    if (activePointerId.current !== event.pointerId) {
      return;
    }
    updateFromClient(event.clientX, event.clientY);
  };

  const endDrag = (event) => {
    if (activePointerId.current !== event.pointerId) {
      return;
    }
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      ref={baseRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      style={{
        position: "absolute",
        bottom: "28px",
        [side]: "28px",
        width: `${OUTER_SIZE}px`,
        height: `${OUTER_SIZE}px`,
        borderRadius: "50%",
        background: "rgba(0, 0, 0, 0.35)",
        border: "2px solid rgba(255, 255, 255, 0.35)",
        touchAction: "none",
        zIndex: 25,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: `${KNOB_SIZE}px`,
          height: `${KNOB_SIZE}px`,
          marginTop: `${-KNOB_SIZE / 2}px`,
          marginLeft: `${-KNOB_SIZE / 2}px`,
          borderRadius: "50%",
          background: knobColor,
          boxShadow: `0 0 14px ${knobGlow}`,
          transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
