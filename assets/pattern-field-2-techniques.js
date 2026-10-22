const TAU = Math.PI * 2;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export const TECHNIQUES = [
  ["flow", "노이즈 흐름", "FLOW FIELD", "연속적인 노이즈의 방향을 따라 흐릅니다.", "Follow the directions of a continuous noise field."],
  ["vortex", "소용돌이", "VORTEX", "중심과의 거리에 따라 다른 속도로 비틀립니다.", "Twist the field at different rates around its center."],
  ["ripple", "동심 파동", "RIPPLE", "중심에서 퍼지는 파동의 간격과 속도를 바꿉니다.", "Change the spacing and speed of radial waves."],
  ["curl", "컬 노이즈", "CURL NOISE", "노이즈의 기울기를 회전시켜 작은 소용돌이가 연결되는 흐름을 만듭니다.", "Rotate the noise gradient into a connected field of eddies."],
  ["warp", "도메인 워핑", "DOMAIN WARP", "노이즈의 좌표를 다시 노이즈로 변형해 접히는 흐름을 만듭니다.", "Warp noise coordinates with more noise to create folded flows."],
  ["interference", "파동 간섭", "INTERFERENCE", "여러 진원에서 나온 파동이 겹치고 상쇄됩니다.", "Waves from multiple sources reinforce and cancel one another."],
  ["lissajous", "리사주", "LISSAJOUS", "가로·세로 진동수의 비율로 매듭 같은 궤적을 만듭니다.", "A ratio of horizontal and vertical frequencies traces knotted paths."],
  ["phyllotaxis", "식물형 나선", "PHYLLOTAXIS", "발산각과 제곱근 반경으로 씨앗처럼 배열합니다. 137.5°에서 황금각에 가까워집니다.", "Arrange motifs with a divergence angle and square-root radius. 137.5° approximates the golden angle."],
  ["boids", "군집 행동", "FLOCKING", "이웃과 떨어지고, 방향을 맞추고, 모이는 세 힘을 실제로 계산합니다.", "Simulate local separation, alignment and cohesion between neighbors."],
  ["reaction", "반응–확산", "REACTION–DIFFUSION", "두 물질의 Gray–Scott 반응을 계산해 문양의 크기와 배치에 연결합니다. 천천히 자라도록 잠시 지켜보세요.", "A Gray–Scott simulation drives motif size and displacement. Allow time for the pattern to grow."],
  ["relief", "레기스탄 입체", "REGISTAN RELIEF", "레기스탄의 정면 이미지에 건물·바닥·하늘의 깊이를 부여한 2.5D 실험입니다. 실제 건축의 뒷면을 복원한 3D 모델은 아닙니다. 형태 유지를 낮추면 문양이 나선 구체로 흩어집니다.", "A 2.5D relief of Registan: building, ground and sky depths are hand-authored, not a reconstructed 3D model. Lower formation to release the motifs into a phyllotactic sphere."],
];

// key, Korean, English, min, max, unit, step, default, applicable modes
export const PARAMETERS = [
  ["noiseScale", "노이즈 공간 밀도", "NOISE FREQUENCY", .5, 8, "", .1, 2.4, "flow curl warp"],
  ["octaves", "노이즈 중첩 층", "NOISE OCTAVES", 1, 6, "", 1, 3, "flow curl warp"],
  ["falloff", "미세 노이즈 비중", "NOISE FALLOFF", .1, .8, "", .05, .5, "flow curl warp"],
  ["drift", "노이즈 변화 속도", "NOISE DRIFT", 0, .5, "", .01, .09, "flow curl warp"],
  ["twist", "회전 폭", "TWIST", 0, 8, " rad", .1, 2.2, "vortex"],
  ["core", "중심 감김", "CORE WINDING", 0, 12, "", .1, 4, "vortex"],
  ["waveFrequency", "파동 밀도", "WAVE FREQUENCY", 2, 60, "", 1, 22, "ripple interference"],
  ["waveSpeed", "파동 진행 속도", "WAVE SPEED", 0, 6, "", .1, 1.8, "ripple interference"],
  ["curlGain", "컬 강도", "CURL GAIN", .2, 4, "", .1, 1.4, "curl"],
  ["warpAmount", "좌표 왜곡", "WARP AMOUNT", 0, 5, "", .1, 2, "warp"],
  ["warpLayers", "왜곡 반복", "WARP LAYERS", 1, 4, "", 1, 2, "warp"],
  ["sources", "파동 진원 수", "WAVE SOURCES", 2, 5, "", 1, 3, "interference"],
  ["sourceSpacing", "진원 간격", "SOURCE SPACING", .05, .5, "", .01, .28, "interference"],
  ["frequencyX", "가로 진동수", "X FREQUENCY", 1, 9, "", 1, 3, "lissajous"],
  ["frequencyY", "세로 진동수", "Y FREQUENCY", 1, 9, "", 1, 2, "lissajous"],
  ["phase", "위상차", "PHASE", 0, 180, "°", 1, 90, "lissajous"],
  ["divergence", "발산각", "DIVERGENCE ANGLE", 120, 150, "°", .1, 137.5, "phyllotaxis relief"],
  ["spread", "나선 반경", "SPIRAL SPREAD", .1, .65, "", .01, .48, "phyllotaxis relief"],
  ["spiralSpin", "나선 회전", "SPIRAL SPIN", -1, 1, "", .05, .1, "phyllotaxis relief"],
  ["separation", "개체 간 거리두기", "SEPARATION", 0, 3, "", .1, 1.5, "boids"],
  ["alignment", "이웃 방향 맞추기", "ALIGNMENT", 0, 3, "", .1, 1, "boids"],
  ["cohesion", "이웃에게 모이기", "COHESION", 0, 3, "", .1, .8, "boids"],
  ["perception", "이웃 감지 반경", "NEIGHBOR RADIUS", .025, .15, "", .005, .06, "boids"],
  ["feed", "물질 A 공급", "FEED RATE", .01, .08, "", .0005, .0365, "reaction"],
  ["kill", "물질 B 소멸", "KILL RATE", .045, .075, "", .0005, .062, "reaction"],
  ["diffusion", "B 확산 / A 확산", "DIFFUSION RATIO", .2, .8, "", .05, .5, "reaction"],
  ["reactionSpeed", "반응 계산 속도", "REACTION SPEED", 1, 12, "", 1, 6, "reaction"],
  ["reliefGrid", "입체 문양 밀도", "RELIEF DENSITY", 48, 160, "grid", 8, 96, "relief"],
  ["reliefDepth", "건축 깊이", "ARCHITECTURAL DEPTH", 0, 120, "%", 1, 75, "relief"],
  ["reliefYaw", "좌우 시점", "CAMERA YAW", -35, 35, "°", 1, -12, "relief"],
  ["reliefPitch", "위아래 시점", "CAMERA PITCH", -20, 20, "°", 1, -6, "relief"],
  ["reliefOrbit", "시점 왕복 폭", "CAMERA SWAY", 0, 20, "°", 1, 10, "relief"],
  ["reliefZoom", "화면 배율", "CAMERA ZOOM", 65, 110, "%", 1, 85, "relief"],
  ["spiralDepth", "나선 구체 두께", "SPHERE DEPTH", 0, 120, "%", 1, 100, "relief"],
  ["skyVisibility", "하늘 문양 밝기", "SKY MOTIF OPACITY", 0, 100, "%", 1, 15, "relief"],
];

export const EXPRESSIONS = [
  ["variation", "문양 크기 편차", "SIZE VARIATION", 0, 80, "%", 1, 0],
  ["rotation", "흐름 방향으로 회전", "FLOW ROTATION", 0, 100, "%", 1, 30],
  ["pulseRate", "호흡 빈도", "BREATH FREQUENCY", .1, 2, " Hz", .1, .5],
  ["pulseSync", "호흡 동기화", "BREATH SYNCHRONY", 0, 100, "%", 1, 0],
  ["trail", "잔상 길이", "TRAIL DURATION", 0, 95, "%", 1, 0],
  ["brightness", "밝기 · 잔상과 독립", "BRIGHTNESS / NO TRAIL", 50, 180, "%", 1, 100],
  ["saturation", "채도", "SATURATION", 0, 180, "%", 1, 100],
  ["paletteMix", "팔레트 혼합", "PALETTE MIX", 0, 100, "%", 1, 70],
  ["cycle", "모임 · 흩어짐 주기", "FORM / RELEASE CYCLE", 4, 60, " s", 1, 20],
  ["pointerRadius", "터치 영향 반경", "POINTER RADIUS", 5, 40, "%", 1, 18],
  ["pointerForce", "터치 밀어내기", "POINTER FORCE", 0, 40, "%", 1, 10],
];

export const PARAM_DEFAULTS = Object.fromEntries([...PARAMETERS, ...EXPRESSIONS].map(row => [row[0], row[7]]));
export const PRESETS = {
  breathing: { mode: "flow", formation: 90, pulse: 35, pulseSync: 85, pulseRate: .3, strength: 30 },
  ink: { mode: "curl", formation: 15, strength: 90, noiseScale: 3.2, curlGain: 2, trail: 65, rotation: 90 },
  folded: { mode: "warp", formation: 25, strength: 90, warpAmount: 3, warpLayers: 3, noiseScale: 2, trail: 25 },
  knots: { mode: "lissajous", formation: 0, strength: 100, frequencyX: 3, frequencyY: 2, trail: 60, scale: 65 },
  sunflower: { mode: "phyllotaxis", formation: 0, strength: 100, divergence: 137.5, spread: .48, scale: 65, pulse: 0 },
  flock: { mode: "boids", formation: 0, strength: 100, separation: 1.5, alignment: 1.2, cohesion: 1, trail: 35, scale: 65 },
  coral: { mode: "reaction", formation: 35, strength: 100, feed: .0545, kill: .062, reactionSpeed: 10, pulse: 0 },
  registan: { mode: "relief", scene: 0, formation: 100, strength: 100, reliefGrid: 96, scale: 90, pulse: 5, rotation: 0, reliefDepth: 75, reliefYaw: -12, reliefPitch: -6, reliefOrbit: 10, reliefZoom: 85, skyVisibility: 0 },
};

export function recolor(rgb, state) {
  const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  let color = rgb.map(c => luminance + (c - luminance) * state.saturation / 100);
  if (state.palette !== "source") {
    const palettes = { twilight: [[47, 58, 117], [232, 163, 201]], mineral: [[27, 106, 101], [229, 165, 87]], mono: [[35, 35, 35], [245, 241, 225]] };
    const [low, high] = palettes[state.palette];
    const mix = state.paletteMix / 100;
    color = color.map((c, i) => c * (1 - mix) + (low[i] + (high[i] - low[i]) * luminance / 255) * mix);
  }
  return color.map(c => Math.round(clamp(c * state.brightness / 100, 0, 255)));
}

export function createSimulation(grid, seed) {
  const count = grid * grid;
  let randomState = seed >>> 0;
  const random = () => { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState / 4294967296; };
  const x = new Float32Array(count), y = new Float32Array(count), vx = new Float32Array(count), vy = new Float32Array(count);
  const nx = new Float32Array(count), ny = new Float32Array(count);
  let a = new Float32Array(count).fill(1), b = new Float32Array(count), na = new Float32Array(count), nb = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    x[i] = (i % grid + .5) / grid; y[i] = (Math.floor(i / grid) + .5) / grid;
    const angle = random() * TAU; vx[i] = Math.cos(angle) * .055; vy[i] = Math.sin(angle) * .055;
  }
  for (let patch = 0; patch < 10; patch++) {
    const cx = Math.floor(random() * grid), cy = Math.floor(random() * grid);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const i = ((cy + dy + grid) % grid) * grid + (cx + dx + grid) % grid;
      a[i] = .5; b[i] = .8;
    }
  }
  const neighbors = Array.from({ length: count }, (_, i) => {
    const col = i % grid, row = Math.floor(i / grid);
    return [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => ((row + dy + grid) % grid) * grid + (col + dx + grid) % grid);
  });
  function reaction(s) {
    for (let i = 0; i < count; i++) {
      let la = -a[i], lb = -b[i];
      for (let n = 0; n < 8; n++) { const j = neighbors[i][n], w = n < 4 ? .2 : .05; la += a[j] * w; lb += b[j] * w; }
      const ab = a[i] * b[i] * b[i];
      na[i] = clamp(a[i] + la - ab + s.feed * (1 - a[i]), 0, 1);
      nb[i] = clamp(b[i] + s.diffusion * lb + ab - (s.kill + s.feed) * b[i], 0, 1);
    }
    [a, na] = [na, a]; [b, nb] = [nb, b];
  }
  function flock(s) {
    const r = s.perception, buckets = new Map(), columns = Math.ceil(1 / r) + 1;
    for (let i = 0; i < count; i++) { const key = Math.floor(y[i] / r) * columns + Math.floor(x[i] / r); if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(i); }
    for (let i = 0; i < count; i++) {
      let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, total = 0;
      const bx = Math.floor(x[i] / r), by = Math.floor(y[i] / r);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (bx + dx < 0 || by + dy < 0 || bx + dx >= columns) continue;
        for (const j of buckets.get((by + dy) * columns + bx + dx) || []) {
          if (j === i) continue;
          const ex = x[i] - x[j], ey = y[i] - y[j], d = Math.hypot(ex, ey);
          if (d >= r || d < .00001) continue;
          sx += ex / d * (1 - d / r); sy += ey / d * (1 - d / r);
          ax += vx[j]; ay += vy[j]; cx += x[j]; cy += y[j]; total++;
        }
      }
      let fx = 0, fy = 0;
      if (total) {
        fx = sx / total * s.separation + (ax / total - vx[i]) * s.alignment * 5 + (cx / total - x[i]) * s.cohesion * 6;
        fy = sy / total * s.separation + (ay / total - vy[i]) * s.alignment * 5 + (cy / total - y[i]) * s.cohesion * 6;
      }
      fx += Math.max(0, .06 - x[i]) * 3 - Math.max(0, x[i] - .94) * 3;
      fy += Math.max(0, .06 - y[i]) * 3 - Math.max(0, y[i] - .94) * 3;
      const force = Math.hypot(fx, fy), limit = force > .3 ? .3 / force : 1;
      nx[i] = vx[i] + fx * limit / 60; ny[i] = vy[i] + fy * limit / 60;
      const speed = Math.hypot(nx[i], ny[i]);
      if (speed > .1) { nx[i] *= .1 / speed; ny[i] *= .1 / speed; }
    }
    for (let i = 0; i < count; i++) {
      vx[i] = nx[i]; vy[i] = ny[i]; x[i] += vx[i] / 60; y[i] += vy[i] / 60;
      if (x[i] < .005 || x[i] > .995) { x[i] = clamp(x[i], .005, .995); vx[i] *= -1; }
      if (y[i] < .005 || y[i] > .995) { y[i] = clamp(y[i], .005, .995); vy[i] *= -1; }
    }
  }
  let flockTime = 0, reactionTime = 0;
  return {
    x, y, vx, vy,
    get chemical() { return b; },
    warm(s) { for (let n = 0; n < 80; n++) reaction(s); },
    step(dt, s, weights) {
      if (weights[8] > .001) { flockTime += dt; let steps = 0; while (flockTime >= 1 / 60 && steps++ < 8) { flock(s); flockTime -= 1 / 60; } }
      if (weights[9] > .001) { reactionTime += dt * 30 * s.reactionSpeed; let steps = 0; while (reactionTime >= 1 && steps++ < 24) { reaction(s); reactionTime--; } }
    },
  };
}

export function displacement(mode, cell, index, count, time, s, noise, simulation) {
  let x = cell.u - .5, y = cell.v - .5;
  let sx = 1, sy = 1;
  if (s.symmetry !== "none" && mode !== "boids" && mode !== "reaction" && mode !== "phyllotaxis") {
    sx = Math.sign(x) || 1; x = Math.abs(x);
    if (s.symmetry === "quad") { sy = Math.sign(y) || 1; y = Math.abs(y); }
  }
  const radius = Math.hypot(x, y), z = time * s.drift;
  let dx = 0, dy = 0, size = 1;
  if (mode === "flow") {
    const angle = noise((x + .5) * s.noiseScale, (y + .5) * s.noiseScale, z) * TAU * 2;
    dx = Math.cos(angle) * .3; dy = Math.sin(angle) * .35;
  } else if (mode === "vortex") {
    const twist = Math.sin(time * .24 - radius * s.core) * s.twist;
    dx = x * Math.cos(twist) - y * Math.sin(twist) - x; dy = x * Math.sin(twist) + y * Math.cos(twist) - y;
  } else if (mode === "ripple" || mode === "interference") {
    const sources = mode === "ripple" ? 1 : s.sources;
    for (let n = 0; n < sources; n++) {
      const angle = n / sources * TAU, offset = mode === "ripple" ? 0 : s.sourceSpacing;
      const ex = x - Math.cos(angle) * offset, ey = y - Math.sin(angle) * offset, r = Math.hypot(ex, ey);
      const wave = Math.sin(r * s.waveFrequency - time * s.waveSpeed) * .22 / Math.sqrt(sources);
      if (r > .0001) { dx += ex / r * wave; dy += ey / r * wave; }
    }
  } else if (mode === "curl") {
    const u = (x + .5) * s.noiseScale, v = (y + .5) * s.noiseScale, e = .015;
    dx = Math.tanh((noise(u, v + e, z) - noise(u, v - e, z)) / (2 * e) * s.curlGain) * .4;
    dy = -Math.tanh((noise(u + e, v, z) - noise(u - e, v, z)) / (2 * e) * s.curlGain) * .4;
  } else if (mode === "warp") {
    let u = (x + .5) * s.noiseScale, v = (y + .5) * s.noiseScale;
    for (let layer = 0; layer < s.warpLayers; layer++) {
      const a = noise(u + 5, v + 9, z + layer) - .5, b = noise(u + 17, v + 3, z + layer) - .5;
      u += a * s.warpAmount; v += b * s.warpAmount;
    }
    dx = (noise(u, v, z) - .5) * 1.5; dy = (noise(u + 12, v + 7, z) - .5) * 1.5;
  } else if (mode === "lissajous") {
    const t = index / count * TAU + time * .22;
    dx = Math.sin(t * s.frequencyX + s.phase * Math.PI / 180) * .46 - x;
    dy = Math.sin(t * s.frequencyY) * .56 - y;
  } else if (mode === "phyllotaxis") {
    const angle = index * s.divergence * Math.PI / 180 + time * s.spiralSpin;
    const r = s.spread * Math.sqrt((index + .5) / count);
    dx = Math.cos(angle) * r - x; dy = Math.sin(angle) * r - y;
  } else if (mode === "boids") {
    dx = simulation.x[index] - cell.u; dy = (simulation.y[index] - .5) * 1.2 - y;
  } else if (mode === "reaction") {
    const b = simulation.chemical[index];
    const side = Math.sqrt(count), right = simulation.chemical[index % side === side - 1 ? index - side + 1 : index + 1];
    const below = simulation.chemical[(index + side) % count];
    dx = (right - b) * .4; dy = (below - b) * .4; size = .25 + Math.min(1, b * 2.8) * 1.15;
  }
  return { dx: dx * sx, dy: dy * sy, size };
}
