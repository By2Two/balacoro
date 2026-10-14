export function createFloatingText(
  content,
  color,
  worldPos,
  floatAmount,
  fontSize = "18px"
) {
  const element = document.createElement("div");
  Object.assign(element.style, {
    position: "absolute",
    color,
    fontFamily: "monospace",
    fontSize,
    fontWeight: "bold",
    pointerEvents: "none",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    transition: "all 1s ease-out",
    opacity: "1",
    boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
    zIndex: 1000,
  });
  element.innerText = content;

  const { x, y } = worldToScreen(worldPos);
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;

  requestAnimationFrame(() => {
    element.style.top = `${y - floatAmount}px`;
    element.style.opacity = "0";
  });

  setTimeout(() => element.remove(), 1000);
  return element;
}

let currentCamera = null;

export function setFloatingTextCamera(camera) {
  currentCamera = camera;
}

function worldToScreen(worldPos) {
  if (!currentCamera) {
    return { x: -1000, y: -1000 };
  }

  const canvas = document.querySelector("canvas");
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  const vector = worldPos.clone().project(currentCamera);

  return {
    x: ((vector.x + 1) * width) / 2 + rect.left,
    y: ((-vector.y + 1) * height) / 2 + rect.top,
  };
}
