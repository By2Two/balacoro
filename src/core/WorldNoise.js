
export function hash2D(x, z, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 144665);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

export function valueNoise2D(x, z, seed) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = smoothstep(x - x0);
  const tz = smoothstep(z - z0);

  const v00 = hash2D(x0, z0, seed);
  const v10 = hash2D(x0 + 1, z0, seed);
  const v01 = hash2D(x0, z0 + 1, seed);
  const v11 = hash2D(x0 + 1, z0 + 1, seed);

  const top = v00 + (v10 - v00) * tx;
  const bottom = v01 + (v11 - v01) * tx;
  return top + (bottom - top) * tz;
}

export function fractalNoise2D(x, z, seed, octaves = 2) {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    total += valueNoise2D(x * frequency, z * frequency, seed + i * 1013) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / maxAmplitude;
}

export function createTileRng(chunkX, chunkZ, seed) {
  let state =
    (Math.imul(chunkX, 374761393) ^
      Math.imul(chunkZ, 668265263) ^
      Math.imul(seed, 1274126177)) >>>
    0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
  };
}
