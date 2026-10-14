import * as THREE from "three";

const LAMP_ON = new THREE.Color(0xfff0b0);
const LAMP_OFF = new THREE.Color(0x3a3f47);
const WINDOW_ON = new THREE.Color(0xffe9a0);
const WINDOW_OFF = new THREE.Color(0x232b38);

export const lampBulbMaterial = new THREE.MeshBasicMaterial({
  color: LAMP_OFF,
});
export const windowLitMaterial = new THREE.MeshBasicMaterial({
  color: WINDOW_OFF,
});

export function setNightLights(on) {
  lampBulbMaterial.color.copy(on ? LAMP_ON : LAMP_OFF);
  windowLitMaterial.color.copy(on ? WINDOW_ON : WINDOW_OFF);
}
