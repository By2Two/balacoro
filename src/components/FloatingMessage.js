export function showMessage(text, color = "#fff", top = "50px") {
  const msg = document.createElement("div");
  Object.assign(msg.style, {
    position: "absolute",
    top,
    left: "50%",
    transform: "translateX(-50%)",
    color,
    fontFamily: "monospace",
    fontSize: "16px",
    padding: "6px 10px",
    background: "rgba(0, 0, 0, 0.6)",
    borderRadius: "4px",
    zIndex: 1000,
    textShadow: "1px 1px 2px #000",
    boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
  });

  msg.innerText = text;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 2500);
}
