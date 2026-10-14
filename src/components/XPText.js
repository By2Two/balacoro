import { createFloatingText } from "./createFloatingText";

export function showXPText(amount, worldPos) {
  const text = createFloatingText(`+${amount} XP`, "#0f0", worldPos, 40);
  document.body.appendChild(text);
}
