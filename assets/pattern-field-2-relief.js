const radians = value => value * Math.PI / 180;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function inside(x, y, polygon) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) hit = !hit;
  }
  return hit;
}

const LEFT_WING = [[.084, .312], [.134, .312], [.244, .377], [.244, .678], [.134, .688], [.084, .679]];
const RIGHT_WING = [[.75, .377], [.862, .306], [.974, .306], [.974, .684], [.862, .688], [.75, .673]];
const CENTRAL_PORTAL = [[.397, .414], [.614, .414], [.614, .665], [.397, .665]];

export function registanDepth(u, v) {
  if (v >= .668) return { z: .08 + (v - .668) / .332 * .8, sky: false };
  for (const center of [.058, .941]) {
    if (Math.abs(u - center) < .034 && v > .248 && v < .69) {
      const round = Math.sqrt(Math.max(0, 1 - ((u - center) / .034) ** 2));
      return { z: .52 + round * .1, sky: false };
    }
  }
  if (inside(u, v, LEFT_WING)) return { z: .12 + clamp((.244 - u) / .16, 0, 1) * .42, sky: false };
  if (inside(u, v, RIGHT_WING)) return { z: .12 + clamp((u - .75) / .2, 0, 1) * .42, sky: false };
  if (inside(u, v, CENTRAL_PORTAL)) {
    const archTop = .469 + Math.abs(u - .504) * .7;
    const recessed = u > .447 && u < .565 && v > archTop;
    return { z: recessed ? -.10 : .10, sky: false };
  }
  for (const [cx, cy, rx, ry] of [[.315, .49, .045, .064], [.698, .516, .036, .052]]) {
    const radius = ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2;
    if (radius <= 1) return { z: -.01 + Math.sqrt(1 - radius) * .1, sky: false };
  }
  if (u > .242 && u < .751 && v > .532) return { z: -.08, sky: false };
  return { z: -.58, sky: true };
}

export function reliefCamera(s, time) {
  const yaw = radians(s.reliefYaw + Math.sin(time * .23) * s.reliefOrbit);
  const pitch = radians(s.reliefPitch + Math.sin(time * .17) * s.reliefOrbit * .25);
  return { cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), distance: 2.6, zoom: s.reliefZoom / 100 };
}

export function projectRelief(cell, index, count, formation, time, s, camera, output) {
  const depth = cell.depth.z * s.reliefDepth / 100;
  const photoScale = (camera.distance - depth) / camera.distance;
  let x = (cell.u - .5) * photoScale;
  let y = (cell.v - .5) * photoScale;
  let z = depth;
  const free = (1 - formation) * s.strength / 100;
  const latitude = 1 - 2 * (index + .5) / count;
  const radius = Math.sqrt(Math.max(0, 1 - latitude * latitude));
  const angle = radians(index * s.divergence) + time * s.spiralSpin;
  const sphereX = Math.cos(angle) * radius * s.spread;
  const sphereY = latitude * s.spread * 1.15;
  const sphereZ = Math.sin(angle) * radius * s.spread * s.spiralDepth / 100;
  x += (sphereX - x) * free; y += (sphereY - y) * free; z += (sphereZ - z) * free;
  const rx = x * camera.cy + z * camera.sy;
  const rz = -x * camera.sy + z * camera.cy;
  const ry = y * camera.cp - rz * camera.sp;
  const depthRotated = y * camera.sp + rz * camera.cp;
  const perspective = camera.distance / (camera.distance - depthRotated);
  output.x = .5 + rx * perspective * camera.zoom;
  output.y = .625 + ry * perspective * camera.zoom;
  output.z = depthRotated;
  output.scale = perspective * camera.zoom;
  output.alpha = cell.depth.sky ? s.skyVisibility / 100 + (1 - s.skyVisibility / 100) * free : 1;
  return output;
}

export function drawRelief(p, field, alpha, formation, time, elapsed, state, pointer) {
  const camera = reliefCamera(state, time);
  const count = field.cells.length;
  const baseSize = p.width / Math.sqrt(count) * state.scale / 100;
  const free = (1 - formation) * state.strength / 100;
  for (const point of field.projected) projectRelief(field.cells[point.index], point.index, count, formation, time, state, camera, point);
  field.projected.sort((a, b) => a.z - b.z);
  const ctx = p.drawingContext;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const rotates = free * state.rotation !== 0;
  for (const point of field.projected) {
    if (point.alpha < .005) continue;
    const cell = field.cells[point.index], sprite = cell.sprite;
    let x = point.x, y = point.y;
    if (pointer) {
      const dx = x - pointer.x, dy = y - pointer.y, distance = Math.hypot(dx, dy);
      const force = Math.max(0, 1 - distance / (state.pointerRadius / 100)) ** 2 * state.pointerForce / 100;
      if (distance > .001) { x += dx / distance * force; y += dy / distance * force; }
    }
    const pulse = 1 + Math.sin(elapsed * Math.PI * 2 * state.pulseRate + cell.phase * (1 - state.pulseSync / 100)) * state.pulse / 100 * .5;
    const size = baseSize * point.scale * pulse * (1 + Math.sin(cell.phase * 7.31) * state.variation / 100);
    ctx.globalAlpha = alpha * point.alpha;
    if (rotates) {
      const angle = Math.sin(cell.phase + time * .15) * free * state.rotation / 100;
      const c = Math.cos(angle), sn = Math.sin(angle);
      ctx.setTransform(c, sn, -sn, c, x * p.width, y * p.width);
      ctx.drawImage(sprite.atlas.canvas, sprite.sx, sprite.sy, sprite.tile, sprite.tile, -size / 2, -size / 2, size, size);
    } else ctx.drawImage(sprite.atlas.canvas, sprite.sx, sprite.sy, sprite.tile, sprite.tile, x * p.width - size / 2, y * p.width - size / 2, size, size);
  }
  ctx.restore();
}
