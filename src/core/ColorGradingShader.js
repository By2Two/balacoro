import * as THREE from "three";

export const ColorGradingShader = {
  name: "ColorGradingShader",
  uniforms: {
    tDiffuse: { value: null },
    uSaturation: { value: 1 },
    uContrast: { value: 1 },
    uVignette: { value: 0 },
    uShadowTint: { value: new THREE.Vector3(1, 1, 1) },
    uHighlightTint: { value: new THREE.Vector3(1, 1, 1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uVignette;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, uSaturation);
      color = (color - 0.5) * uContrast + 0.5;
      color *= mix(uShadowTint, uHighlightTint, smoothstep(0.0, 1.0, luma));

      float edge = length(vUv - 0.5) * 1.35;
      color *= 1.0 - uVignette * smoothstep(0.45, 1.0, edge);

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), texel.a);
    }
  `,
};
