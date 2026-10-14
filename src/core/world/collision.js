export function makeCircleCollider(x, z, radius) {
  return {
    type: "circle",
    x,
    z,
    r: radius,
    minX: x - radius,
    maxX: x + radius,
    minZ: z - radius,
    maxZ: z + radius,
  };
}

export function makeBoxCollider(x, z, halfWidth, halfDepth, angle = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const extentX = Math.abs(cos) * halfWidth + Math.abs(sin) * halfDepth;
  const extentZ = Math.abs(sin) * halfWidth + Math.abs(cos) * halfDepth;
  return {
    type: "box",
    x,
    z,
    hw: halfWidth,
    hd: halfDepth,
    cos,
    sin,
    minX: x - extentX,
    maxX: x + extentX,
    minZ: z - extentZ,
    maxZ: z + extentZ,
  };
}

function toLocal(collider, x, z) {
  const dx = x - collider.x;
  const dz = z - collider.z;
  return [dx * collider.cos + dz * collider.sin, -dx * collider.sin + dz * collider.cos];
}

export function circleOverlaps(collider, x, z, radius) {
  if (
    x + radius < collider.minX ||
    x - radius > collider.maxX ||
    z + radius < collider.minZ ||
    z - radius > collider.maxZ
  ) {
    return false;
  }
  if (collider.type === "circle") {
    const reach = collider.r + radius;
    return (x - collider.x) ** 2 + (z - collider.z) ** 2 < reach * reach;
  }
  const [localX, localZ] = toLocal(collider, x, z);
  const closestX = Math.max(-collider.hw, Math.min(collider.hw, localX));
  const closestZ = Math.max(-collider.hd, Math.min(collider.hd, localZ));
  return (localX - closestX) ** 2 + (localZ - closestZ) ** 2 < radius * radius;
}

export function circlePushOut(collider, position, radius) {
  if (collider.type === "circle") {
    const dx = position.x - collider.x;
    const dz = position.z - collider.z;
    const distance = Math.hypot(dx, dz);
    const reach = collider.r + radius;
    if (distance >= reach) {
      return false;
    }
    if (distance < 1e-5) {
      position.x += reach;
      return true;
    }
    const push = (reach - distance) / distance;
    position.x += dx * push;
    position.z += dz * push;
    return true;
  }

  const [localX, localZ] = toLocal(collider, position.x, position.z);
  const closestX = Math.max(-collider.hw, Math.min(collider.hw, localX));
  const closestZ = Math.max(-collider.hd, Math.min(collider.hd, localZ));
  let offsetX = localX - closestX;
  let offsetZ = localZ - closestZ;
  const distance = Math.hypot(offsetX, offsetZ);
  if (distance >= radius) {
    return false;
  }

  let pushX;
  let pushZ;
  if (distance > 1e-5) {
    pushX = (offsetX / distance) * (radius - distance);
    pushZ = (offsetZ / distance) * (radius - distance);
  } else {
    const exitX = collider.hw - Math.abs(localX) + radius;
    const exitZ = collider.hd - Math.abs(localZ) + radius;
    if (exitX < exitZ) {
      pushX = Math.sign(localX || 1) * exitX;
      pushZ = 0;
    } else {
      pushX = 0;
      pushZ = Math.sign(localZ || 1) * exitZ;
    }
  }
  position.x += pushX * collider.cos - pushZ * collider.sin;
  position.z += pushX * collider.sin + pushZ * collider.cos;
  return true;
}

export function aabbOverlaps(collider, minX, maxX, minZ, maxZ) {
  if (
    maxX < collider.minX ||
    minX > collider.maxX ||
    maxZ < collider.minZ ||
    minZ > collider.maxZ
  ) {
    return false;
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const halfX = (maxX - minX) / 2;
  const halfZ = (maxZ - minZ) / 2;

  if (collider.type === "circle") {
    const closestX = Math.max(minX, Math.min(maxX, collider.x));
    const closestZ = Math.max(minZ, Math.min(maxZ, collider.z));
    return (closestX - collider.x) ** 2 + (closestZ - collider.z) ** 2 < collider.r * collider.r;
  }

  const dx = collider.x - centerX;
  const dz = collider.z - centerZ;
  const axes = [
    [1, 0],
    [0, 1],
    [collider.cos, collider.sin],
    [-collider.sin, collider.cos],
  ];
  for (const [axisX, axisZ] of axes) {
    const boxExtent = Math.abs(axisX) * halfX + Math.abs(axisZ) * halfZ;
    const colliderExtent =
      collider.hw * Math.abs(axisX * collider.cos + axisZ * collider.sin) +
      collider.hd * Math.abs(-axisX * collider.sin + axisZ * collider.cos);
    if (Math.abs(dx * axisX + dz * axisZ) > boxExtent + colliderExtent) {
      return false;
    }
  }
  return true;
}
