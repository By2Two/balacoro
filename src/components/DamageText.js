import { createFloatingText } from "./createFloatingText";
export function showDamageText(amount, worldPos, isCritical = false) {
  const text = isCritical
    ? createFloatingText(`CRIT! ${amount}`, "#ffaa00", worldPos, 75, "26px")
    : createFloatingText(`-${amount} HP`, "#f00", worldPos, 60);
  document.body.appendChild(text);
}
