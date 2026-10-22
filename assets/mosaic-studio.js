// allow: SIZE_OK — this legacy static-site route keeps its complete canvas lifecycle self-contained for one predictable lazy-loaded module.
const DEFAULT_GRID_SIZE = 32;
const TAU = Math.PI * 2;
const DEFAULT_IMAGE_URL = "assets/mosaic/palace-source-2026-08-27.png";
const DEFAULT_MOTIF_URL = "assets/mosaic/circular-dot.svg?v=20260827-filled-3";
const DANCHEONG_MOTIF_URL = "assets/mosaic/dancheong-lotus.svg?v=20260827-lotus-3";
const MOTIF_PRESET_URLS = Object.freeze({
  circle: DEFAULT_MOTIF_URL,
  lotus: DANCHEONG_MOTIF_URL,
  logoOne: "assets/mosaic/motifs/logo-sample-01.png?v=20260831-logo-1",
  logoTwo: "assets/mosaic/motifs/logo-sample-02.png?v=20260831-logo-1",
  logoThree: "assets/mosaic/motifs/logo-sample-03.png?v=20260901-logo-1",
  logoFour: "assets/mosaic/motifs/logo-sample-04.png?v=20260901-logo-1",
  samarkandOne: "assets/mosaic/motifs/samarkand-pattern-01.png?v=20260901-samarkand-1",
  samarkandTwo: "assets/mosaic/motifs/samarkand-pattern-02.png?v=20260901-samarkand-1",
  samarkandThree: "assets/mosaic/motifs/samarkand-pattern-03.png?v=20260901-samarkand-1",
});
const RECORD_SECONDS = 8;
const LEGACY_TICK_MODE = "clock" + "work";
const ORGANIC_CLUSTERS = [
  { x: 0.15, y: 0.18, radius: 0.16, rate: 0.66, phase: 0.11, weight: 1.0 },
  { x: 0.43, y: 0.18, radius: 0.19, rate: 0.44, phase: 0.67, weight: 0.92 },
  { x: 0.76, y: 0.22, radius: 0.16, rate: 0.78, phase: 0.39, weight: 0.9 },
  { x: 0.25, y: 0.48, radius: 0.2, rate: 0.37, phase: 0.84, weight: 0.88 },
  { x: 0.57, y: 0.48, radius: 0.17, rate: 0.58, phase: 0.28, weight: 0.96 },
  { x: 0.84, y: 0.58, radius: 0.2, rate: 0.71, phase: 0.58, weight: 0.82 },
  { x: 0.19, y: 0.8, radius: 0.18, rate: 0.49, phase: 0.48, weight: 0.86 },
  { x: 0.52, y: 0.79, radius: 0.21, rate: 0.33, phase: 0.02, weight: 0.9 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const loadImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
  image.src = src;
});

const hexToRgb = (hex) => {
  const value = hex.replace("#", "");
  const expanded = value.length === 3 ? value.split("").map((part) => `${part}${part}`).join("") : value;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
};

const mixColor = (source, target, amount) => source.map((value, index) =>
  Math.round(value + (target[index] - value) * amount));

const contrastColor = (color, amount) => color.map((value) =>
  clamp(128 + (value - 128) * amount, 0, 255));

const boostColor = (color, amount) => color.map((value) =>
  clamp(Math.round(value + (255 - value) * amount), 0, 255));

const quantizeColor = (color) => color.map((value) => Math.round(value / 16) * 16);

const seededNoise = (x, y, seed) => {
  const value = Math.sin((x * 12.9898 + y * 78.233 + seed * 37.719) * 0.0174533) * 43758.5453;
  return value - Math.floor(value);
};

const rgba = ([red, green, blue], alpha) => `rgba(${red}, ${green}, ${blue}, ${alpha})`;

const luminance = ([red, green, blue]) =>
  (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;

const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const loadFileAsImage = (file) => {
  const objectUrl = URL.createObjectURL(file);
  return loadImage(objectUrl)
    .then((image) => ({ image, objectUrl }))
    .catch((error) => {
      URL.revokeObjectURL(objectUrl);
      throw error;
    });
};

const sampleImage = (sourceImage, sampleCanvas, gridSize) => {
  const context = sampleCanvas.getContext("2d", { willReadFrequently: true });
  if (sampleCanvas.width !== gridSize || sampleCanvas.height !== gridSize) {
    sampleCanvas.width = gridSize;
    sampleCanvas.height = gridSize;
  }
  context.clearRect(0, 0, gridSize, gridSize);
  context.fillStyle = "#000000";
  context.fillRect(0, 0, gridSize, gridSize);
  const sourceRatio = sourceImage.naturalWidth / sourceImage.naturalHeight || 1;
  const targetRatio = 1;
  let width = gridSize;
  let height = gridSize;
  let x = 0;
  let y = 0;
  if (sourceRatio > targetRatio) width = gridSize * sourceRatio;
  else height = gridSize / sourceRatio;
  x = (gridSize - width) / 2;
  y = (gridSize - height) / 2;
  context.drawImage(sourceImage, x, y, width, height);
  return context.getImageData(0, 0, gridSize, gridSize).data;
};

const createTintedMotif = (motifImage, color) => {
  const naturalRatio = motifImage.naturalWidth / motifImage.naturalHeight || 1;
  const ratio = clamp(naturalRatio, 0.4, 2.5);
  const height = 96;
  const width = Math.max(1, Math.round(height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(motifImage, 0, 0, width, height);
  context.globalCompositeOperation = "source-in";
  context.fillStyle = rgba(color, 1);
  context.fillRect(0, 0, width, height);
  return canvas;
};

const clusterInfluenceAt = (normalizedX, normalizedY, cluster) => {
  const distance = Math.hypot(normalizedX - cluster.x, normalizedY - cluster.y);
  return Math.exp(-Math.pow(distance / cluster.radius, 2.25) * 1.25);
};

const organicMotionForCell = (cell, time, state) => {
  let clusterField = 0;
  let clusterWeight = 0;
  const delay = state.phaseDelay * (0.06 + cell.distance * 0.26);
  for (let index = 0; index < ORGANIC_CLUSTERS.length; index += 1) {
    const cluster = ORGANIC_CLUSTERS[index];
    const weightedInfluence = cell.organicClusterWeights[index] * cluster.weight;
    const phase = time - delay + cell.secondaryPhase * state.variation * 0.045;
    clusterField += Math.sin(TAU * (phase * cluster.rate + cluster.phase)) * weightedInfluence;
    clusterWeight += weightedInfluence;
  }
  const clusterCoverage = clamp(clusterWeight * 1.25, 0, 1);
  const regionalFormation = clusterWeight > 0
    ? (clusterField / clusterWeight) * clusterCoverage
    : 0;
  const localField = Math.sin(TAU * (time * cell.organicRate + cell.organicPhase - delay));
  const localPulse = (Math.sin(TAU * (time * cell.pulseRate + cell.pulsePhase - delay)) + 1) / 2;
  const softenedPulse = Math.pow(localPulse, 3.2) * 2 - 1;
  const lightBias = 0.84 + cell.light * 0.16;
  const localAmount = (0.035 + state.variation * 0.12) * cell.organicWeight;
  return clamp((regionalFormation * (0.5 + state.cohesion * 0.5)
    + localField * localAmount
    + softenedPulse * state.variation * 0.06 * cell.pulseWeight) * lightBias, -1, 1);
};

const swarmMotionForCell = (cell, time, state) => {
  let groupField = 0;
  let groupWeight = 0;
  for (let index = 0; index < ORGANIC_CLUSTERS.length; index += 1) {
    const cluster = ORGANIC_CLUSTERS[index];
    const influence = Math.pow(cell.organicClusterWeights[index], 0.55 + state.cohesion * 0.8);
    const phaseDelay = state.phaseDelay * (0.04 + (1 - influence) * 0.15);
    const beat = Math.sin(TAU * ((time - phaseDelay) * cluster.rate + cluster.phase));
    groupField += beat * influence * cluster.weight;
    groupWeight += influence * cluster.weight;
  }
  const groupBeat = groupWeight > 0 ? groupField / groupWeight : 0;
  const localBeat = Math.sin(TAU * (time * cell.pulseRate + cell.pulsePhase));
  const choreography = groupBeat * (0.72 + state.cohesion * 0.28)
    + localBeat * state.variation * 0.14;
  return clamp(choreography * (0.82 + cell.light * 0.18), -1, 1);
};

const neuralMotionForCell = (cell, time, state) => {
  let signal = 0;
  let signalWeight = 0;
  for (let index = 0; index < ORGANIC_CLUSTERS.length; index += 1) {
    const cluster = ORGANIC_CLUSTERS[index];
    const influence = Math.pow(cell.organicClusterWeights[index], 0.45 + state.cohesion * 0.9);
    const propagation = cell.distance * state.spread * (0.25 + state.phaseDelay * 0.3);
    const delay = state.phaseDelay * (0.08 + cell.secondaryPhase * 0.2);
    signal += Math.sin(TAU * ((time - delay) * cluster.rate + cluster.phase - propagation)) * influence;
    signalWeight += influence;
  }
  const localSignal = Math.sin(TAU * (time * cell.organicRate + cell.organicPhase)) * state.variation * 0.12;
  const normalizedSignal = signalWeight > 0 ? signal / signalWeight : 0;
  return clamp((normalizedSignal * (0.7 + state.cohesion * 0.3) + localSignal) * (0.84 + cell.light * 0.16), -1, 1);
};

const setMotifMotionForCell = (cell, state, time, target) => {
  if (state.motifMode === "organic") {
    target.value = organicMotionForCell(cell, time, state);
    target.rotation = 0;
    return;
  }
  if (state.motifMode === "swarm") {
    target.value = swarmMotionForCell(cell, time, state);
    target.rotation = cell.spinDirection * state.spinSpeed * Math.sin(TAU * (time + cell.spinPhase)) * 12;
    return;
  }
  if (state.motifMode === "neural") {
    target.value = neuralMotionForCell(cell, time, state);
    target.rotation = cell.spinDirection * state.spinSpeed * Math.sin(TAU * (time * 0.65 + cell.spinPhase)) * 9;
    return;
  }
  if (state.motifMode === "rotating") {
    const seconds = time * RECORD_SECONDS;
    const orbit = Math.sin(TAU * (time * cell.spinRate + cell.spinPhase));
    target.value = clamp(orbit * 0.34 + organicMotionForCell(cell, time, state) * 0.28, -1, 1);
    const rotationRate = 12 + state.spinSpeed * 150;
    target.rotation = cell.spinDirection * (seconds * rotationRate
      + cell.spinPhase * state.phaseDelay * 100 + orbit * 16);
    return;
  }
  const pulse = Math.sin(TAU * (time * 0.82 + cell.phase - state.phaseDelay * cell.secondaryPhase)) * 0.72
    + Math.sin(TAU * (time * 0.46 - cell.distance * (0.72 + state.spread * 0.4))) * 0.28;
  target.value = pulse;
  target.rotation = 0;
};

const setFieldMotionForCell = (cell, state, time, target) => {
  if (state.fieldMode === "wave") {
    const seconds = time * RECORD_SECONDS;
    const wave = Math.sin(TAU * (seconds * 0.11 - cell.normalizedY * 1.45 + cell.normalizedX * 0.18));
    const crossWave = Math.sin(TAU * (seconds * 0.06 + cell.normalizedX * 0.72 + cell.normalizedY * 0.2));
    target.value = wave * 0.7 + crossWave * 0.3;
    target.offsetX = wave * 0.14 + crossWave * 0.04;
    target.offsetY = Math.cos(TAU * (seconds * 0.08 + cell.normalizedX * 0.55)) * 0.055;
    target.rotation = wave * 1.4;
    target.alpha = wave * 0.06;
    return;
  }
  if (state.fieldMode === "flow") {
    const seconds = time * RECORD_SECONDS;
    const current = Math.sin(TAU * (seconds * 0.08 + cell.normalizedX * 0.82 + cell.normalizedY * 0.3));
    const eddy = Math.cos(TAU * (seconds * 0.05 + cell.normalizedY * 1.15 - cell.normalizedX * 0.22));
    target.value = current * 0.58 + eddy * 0.22;
    target.offsetX = current * 0.16 + eddy * 0.045;
    target.offsetY = eddy * 0.09 + current * 0.035;
    target.rotation = current * 0.75 + eddy * 0.35;
    target.alpha = current * 0.045;
    return;
  }
  if (state.fieldMode === "choreography") {
    const cluster = ORGANIC_CLUSTERS[cell.dominantClusterIndex];
    const seconds = time * RECORD_SECONDS;
    const localPhase = seconds * (0.08 + state.cohesion * 0.06)
      + cluster.phase * RECORD_SECONDS + cell.secondaryPhase * state.phaseDelay;
    const beat = Math.sin(TAU * localPhase);
    const dx = cell.normalizedX - cluster.x;
    const dy = cell.normalizedY - cluster.y;
    const distance = Math.max(0.08, Math.hypot(dx, dy));
    const tangentX = -dy / distance;
    const tangentY = dx / distance;
    const amount = (0.04 + state.spread * 0.15) * (0.5 + cell.organicClusterWeights[cell.dominantClusterIndex] * 0.5);
    target.value = beat * 0.72;
    target.offsetX = tangentX * beat * amount;
    target.offsetY = tangentY * beat * amount;
    target.rotation = beat * (0.6 + state.variation * 1.6);
    target.alpha = beat * 0.04;
    return;
  }
  if (state.fieldMode === "neural") {
    const seconds = time * RECORD_SECONDS;
    let signal = 0;
    let offsetX = 0;
    let offsetY = 0;
    let signalWeight = 0;
    for (let index = 0; index < ORGANIC_CLUSTERS.length; index += 1) {
      const cluster = ORGANIC_CLUSTERS[index];
      const distance = Math.hypot(cell.normalizedX - cluster.x, cell.normalizedY - cluster.y);
      const radius = (seconds * (0.055 + state.spread * 0.16) + cluster.phase) % 1.25;
      const width = 0.04 + state.phaseDelay * 0.05;
      const ring = Math.exp(-Math.pow((distance - radius) / width, 2));
      const weight = ring * (0.45 + cell.organicClusterWeights[index] * 0.55);
      signal += Math.sin(TAU * (seconds * 0.08 + cluster.phase)) * weight;
      offsetX += (cell.normalizedX - cluster.x) * weight;
      offsetY += (cell.normalizedY - cluster.y) * weight;
      signalWeight += weight;
    }
    const normalizedSignal = signalWeight > 0 ? signal / signalWeight : 0;
    target.value = clamp(normalizedSignal, -1, 1);
    target.offsetX = signalWeight > 0 ? (offsetX / signalWeight) * state.spread * 0.14 : 0;
    target.offsetY = signalWeight > 0 ? (offsetY / signalWeight) * state.spread * 0.14 : 0;
    target.rotation = normalizedSignal * (0.8 + state.variation * 1.8);
    target.alpha = normalizedSignal * 0.06;
    return;
  }
  if (state.fieldMode === "ripple") {
    const seconds = time * RECORD_SECONDS;
    const distance = Math.hypot(cell.normalizedX - state.dropX, cell.normalizedY - state.dropY);
    const radius = (seconds * 0.12) % 1.25;
    const ring = Math.exp(-Math.pow((distance - radius) / 0.065, 2));
    const directionX = cell.normalizedX - state.dropX;
    const directionY = cell.normalizedY - state.dropY;
    target.value = ring * 0.9 - 0.08;
    target.offsetX = directionX * ring * 0.18;
    target.offsetY = directionY * ring * 0.18;
    target.rotation = ring * 2.2;
    target.alpha = ring * 0.08;
    return;
  }
  target.value = 0;
  target.offsetX = 0;
  target.offsetY = 0;
  target.rotation = 0;
  target.alpha = 0;
};

const drawFrame = (canvas, state) => {
  const rect = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * pixelRatio));
  const height = Math.max(1, Math.round(rect.height * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  const cssWidth = width / pixelRatio;
  const cssHeight = height / pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.fillStyle = "#000000";
  context.fillRect(0, 0, cssWidth, cssHeight);
  if (!state.sourceImage || !state.motifImage) return;

  const size = Math.min(cssWidth, cssHeight);
  const cellSize = size / state.gridSize;
  const offsetX = (cssWidth - size) / 2;
  const offsetY = (cssHeight - size) / 2;
  const time = state.elapsed / RECORD_SECONDS;
  const motifMotion = { value: 0, rotation: 0 };
  const fieldMotion = { value: 0, offsetX: 0, offsetY: 0, rotation: 0, alpha: 0 };

  context.imageSmoothingEnabled = true;
  for (const cell of state.cells) {
      setMotifMotionForCell(cell, state, time, motifMotion);
      setFieldMotionForCell(cell, state, time, fieldMotion);
      const motionScale = state.motifMode === "rotating"
        ? 0.28 + cell.light * 0.25
        : state.motifMode === "neural"
          ? 0.2 + cell.light * 0.25
          : state.motifMode === "swarm"
            ? 0.24 + cell.light * 0.3
            : state.motifMode === "organic"
          ? 0.18 + cell.light * 0.28
            : 0.22 + cell.light * 0.2;
      const fieldScale = state.fieldMode === "still" ? 0 : (0.08 + state.spread * 0.12) + cell.light * 0.08;
      const scale = clamp(
        (0.58 + cell.light * 0.62) * (1 + state.breath * (motifMotion.value * motionScale + fieldMotion.value * fieldScale)),
        0.16,
        1.5,
      );
      const alpha = clamp(
        (0.38 + cell.light * .62) * Math.min(state.opacity, 1.6) * (0.96 + motifMotion.value * 0.12 + fieldMotion.alpha),
        .12,
        1,
      );
      const rotation = (
        state.rotation * (0.18 + cell.light * .82)
        + motifMotion.rotation
        + fieldMotion.rotation
      ) * Math.PI / 180;
      const drawWidth = cellSize * scale;
      const drawHeight = drawWidth / cell.motifRatio;
      const centerX = cell.x * cellSize + cellSize / 2 + fieldMotion.offsetX * cellSize;
      const centerY = cell.y * cellSize + cellSize / 2 + fieldMotion.offsetY * cellSize;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      context.setTransform(
        pixelRatio * cosine,
        pixelRatio * sine,
        -pixelRatio * sine,
        pixelRatio * cosine,
        pixelRatio * (offsetX + centerX),
        pixelRatio * (offsetY + centerY),
      );
      context.globalAlpha = alpha;
      context.drawImage(cell.motif, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.globalAlpha = 1;
};

const mountMosaicStudio = (root) => {
  const canvas = root.querySelector("#mosaic-studio-canvas");
  if (!canvas) return () => {};
  const stage = root.querySelector("[data-mosaic-stage]");
  const imageInput = root.querySelector("[data-mosaic-image-input]");
  const motifInput = root.querySelector("[data-mosaic-motif-input]");
  const imageUploadButton = root.querySelector("[data-mosaic-image-upload]");
  const motifUploadButton = root.querySelector("[data-mosaic-motif-upload]");
  const motifPresetButtons = [...root.querySelectorAll("[data-mosaic-motif-preset]")];
  const landmarkButtons = [...root.querySelectorAll("[data-mosaic-landmark]")];
  const landmarkFilterButtons = [...root.querySelectorAll("[data-mosaic-landmark-filter]")];
  const landmarkGroups = [...root.querySelectorAll("[data-mosaic-landmark-group]")];
  const imageName = root.querySelector("[data-mosaic-image-name]");
  const imagePreview = root.querySelector("[data-mosaic-image-preview]");
  const imageMeta = root.querySelector("[data-mosaic-image-meta]");
  const defaultImageName = root.dataset.mosaicDefaultImageName || "PALACE / GWANGHWAMUN";
  const defaultImageMeta = root.dataset.mosaicDefaultImageMeta || "default field · 537 × 537 px";
  const defaultMotifName = root.dataset.mosaicDefaultMotifName || "CIRCULAR DOT / MONALISA FIELD";
  const defaultMotifMeta = root.dataset.mosaicDefaultMotifMeta || "one motif · SVG vector";
  const status = root.querySelector("[data-mosaic-status]");
  const modeLabel = root.querySelector("[data-mosaic-mode-label]");
  const playButton = root.querySelector("[data-mosaic-play]");
  const resetButton = root.querySelector("[data-mosaic-reset]");
  const randomButton = root.querySelector("[data-mosaic-random]");
  const loadButton = root.querySelector("[data-mosaic-load]");
  const saveButton = root.querySelector("[data-mosaic-save]");
  const projectInput = root.querySelector("[data-mosaic-project-input]");
  const resetImageButton = root.querySelector("[data-mosaic-reset-image]");
  const fullscreenButton = root.querySelector("[data-mosaic-fullscreen]");
  const exportButton = root.querySelector("[data-mosaic-export]");
  const recordButton = root.querySelector("[data-mosaic-record]");
  const downloadLink = root.querySelector("[data-mosaic-download]");
  const countOutput = root.querySelector("[data-mosaic-count]");
  const timelineInput = root.querySelector("[data-mosaic-timeline]");
  const timeOutput = root.querySelector("[data-mosaic-time]");
  const tintSwatches = [...root.querySelectorAll("[data-mosaic-tint-swatch]")];
  const inputScrollBody = root.querySelector(".mosaic-input-column");
  const controlsScrollBody = root.querySelector(".mosaic-controls-scroll");
  const resolutionInput = root.querySelector("[data-mosaic-resolution]");
  const motifMotionInput = root.querySelector("[data-mosaic-motif-motion]");
  const fieldMotionInput = root.querySelector("[data-mosaic-field-motion]");
  const speedInput = root.querySelector("[data-mosaic-speed]");
  const breathInput = root.querySelector("[data-mosaic-breath]");
  const rotationInput = root.querySelector("[data-mosaic-rotation]");
  const opacityInput = root.querySelector("[data-mosaic-opacity]");
  const tintInput = root.querySelector("[data-mosaic-tint]");
  const colorStrengthInput = root.querySelector("[data-mosaic-color-strength]");
  const contrastInput = root.querySelector("[data-mosaic-contrast]");
  const cohesionInput = root.querySelector("[data-mosaic-cohesion]");
  const phaseDelayInput = root.querySelector("[data-mosaic-phase-delay]");
  const variationInput = root.querySelector("[data-mosaic-variation]");
  const spinSpeedInput = root.querySelector("[data-mosaic-spin-speed]");
  const spreadInput = root.querySelector("[data-mosaic-spread]");
  const setOutput = (name, value) => root.querySelectorAll(`[data-mosaic-output="${name}"]`)
    .forEach((output) => { output.textContent = value; });
  const sampleCanvas = document.createElement("canvas");
  sampleCanvas.width = DEFAULT_GRID_SIZE;
  sampleCanvas.height = DEFAULT_GRID_SIZE;
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const state = {
    sourceImage: null,
    motifImage: null,
    sampleCanvas,
    cells: [],
    motifAtlas: new Map(),
    samplePixels: null,
    gridSize: Number(resolutionInput.value),
    motifMode: motifMotionInput.value,
    fieldMode: fieldMotionInput.value,
    dropX: 0.5,
    dropY: 0.5,
    imageObjectUrl: "",
    motifObjectUrl: "",
    speed: Number(speedInput.value),
    breath: Number(breathInput.value) / 100,
    rotation: Number(rotationInput.value),
    opacity: Number(opacityInput.value) / 100,
    tint: tintInput.value,
    colorStrength: Number(colorStrengthInput.value) / 100,
    contrast: Number(contrastInput.value) / 100,
    cohesion: Number(cohesionInput.value) / 100,
    phaseDelay: Number(phaseDelayInput.value) / 100,
    variation: Number(variationInput.value) / 100,
    spinSpeed: Number(spinSpeedInput.value) / 100,
    spread: Number(spreadInput.value) / 100,
    elapsed: 0,
    playing: !reduceMotionQuery.matches,
    recording: false,
    dirty: true,
  };
  let animationFrame;
  let previousTime = performance.now();
  let lastDrawTime = 0;
  let recorder;
  let recordedChunks = [];

  const motifMotionNames = {
    organic: "ORGANIC / CLUSTERS",
    swarm: "SWARM / CHOREOGRAPHY",
    neural: "NEURAL / SIGNAL",
    rotating: "ROTATION / SPIN",
    breathing: "BREATHING / PULSE",
  };
  const fieldMotionNames = {
    still: "STILL / LOCKED",
    wave: "WAVE / SURFACE",
    flow: "FLOW / CURRENT",
    choreography: "CHOREOGRAPHY / GROUPS",
    neural: "NEURAL / SIGNAL",
    ripple: "RIPPLE / DROP",
  };
  const liveStatus = () => `LIVE / ${motifMotionNames[state.motifMode] || motifMotionNames.breathing} · ${fieldMotionNames[state.fieldMode] || fieldMotionNames.still}`;
  const currentStatus = () => reduceMotionQuery.matches ? "REDUCED MOTION / STILL" : liveStatus();
  const updateModeLabel = () => {
    modeLabel.textContent = `${motifMotionNames[state.motifMode] || motifMotionNames.breathing} · ${fieldMotionNames[state.fieldMode] || fieldMotionNames.still}`;
  };

  const setStatus = (message, isRecording = false) => {
    status.textContent = message;
    status.classList.toggle("is-recording", isRecording);
  };

  const rebuildCells = () => {
    if (!state.sourceImage || !state.motifImage) return;
    state.samplePixels = sampleImage(state.sourceImage, state.sampleCanvas, state.gridSize);
    state.motifAtlas.clear();
    const tint = hexToRgb(state.tint);
    const motifRatio = clamp(
      state.motifImage.naturalWidth / state.motifImage.naturalHeight || 1,
      0.4,
      2.5,
    );
    state.cells = [];
    for (let y = 0; y < state.gridSize; y += 1) {
      for (let x = 0; x < state.gridSize; x += 1) {
        const index = (y * state.gridSize + x) * 4;
        const sourceColor = [state.samplePixels[index], state.samplePixels[index + 1], state.samplePixels[index + 2]];
        const light = luminance(sourceColor);
        const brightnessBoost = clamp((state.opacity - 1) * 0.6, 0, 0.36);
        const liftedColor = boostColor(contrastColor(sourceColor, state.contrast), brightnessBoost);
        const color = quantizeColor(mixColor(liftedColor, tint, state.colorStrength));
        const key = color.join(",");
        let motif = state.motifAtlas.get(key);
        if (!motif) {
          motif = createTintedMotif(state.motifImage, color);
          state.motifAtlas.set(key, motif);
        }
        state.cells.push({
          x,
          y,
          light,
          distance: Math.hypot(x - (state.gridSize - 1) / 2, y - (state.gridSize - 1) / 2) / state.gridSize,
          normalizedX: x / Math.max(1, state.gridSize - 1),
          normalizedY: y / Math.max(1, state.gridSize - 1),
          phase: (x * 0.071 + y * 0.113 + light * 0.43) % 1,
          organicPhase: seededNoise(x, y, 1),
          secondaryPhase: seededNoise(x, y, 2),
          pulsePhase: seededNoise(x, y, 3),
          organicRate: 0.28 + seededNoise(x, y, 4) * 0.46,
          pulseRate: 0.52 + seededNoise(x, y, 5) * 1.05,
          organicWeight: 0.86 + seededNoise(x, y, 6) * 0.7,
          pulseWeight: 0.72 + seededNoise(x, y, 7) * 1.1,
          spinPhase: (x * 0.17 + y * 0.31 + seededNoise(x, y, 11) * 0.35) % 1,
          spinDirection: seededNoise(x, y, 12) > 0.5 ? 1 : -1,
          spinRate: 0.28 + seededNoise(x, y, 13) * 0.42,
          organicClusterWeights: ORGANIC_CLUSTERS.map((cluster) =>
            clusterInfluenceAt(x / Math.max(1, state.gridSize - 1), y / Math.max(1, state.gridSize - 1), cluster)),
          motif,
          motifRatio,
        });
      }
    }
    state.cells.forEach((cell) => {
      cell.dominantClusterIndex = cell.organicClusterWeights.reduce(
        (bestIndex, influence, index, weights) => influence > weights[bestIndex] ? index : bestIndex,
        0,
      );
    });
    state.dirty = true;
    updateOutputs();
  };

  const formatTime = (seconds) => `00:${String(Math.floor(Math.max(0, seconds))).padStart(2, "0")}`;

  const updateTimeline = () => {
    if (timelineInput && document.activeElement !== timelineInput) timelineInput.value = String(state.elapsed);
    if (timeOutput) timeOutput.textContent = `${formatTime(state.elapsed)} / 00:08`;
  };

  const updateOutputs = () => {
    const isPlaying = state.playing && !reduceMotionQuery.matches;
    setOutput("speed", `${state.speed.toFixed(1)}×`);
    setOutput("breath", `${Math.round(state.breath * 100)}%`);
    setOutput("rotation", `${Math.round(state.rotation)}°`);
    setOutput("opacity", `${Math.round(state.opacity * 100)}%`);
    setOutput("color-strength", `${Math.round(state.colorStrength * 100)}%`);
    setOutput("contrast", `${Math.round(state.contrast * 100)}%`);
    setOutput("cohesion", `${Math.round(state.cohesion * 100)}%`);
    setOutput("phase-delay", `${Math.round(state.phaseDelay * 100)}%`);
    setOutput("variation", `${Math.round(state.variation * 100)}%`);
    setOutput("spin-speed", `${Math.round(state.spinSpeed * 100)}%`);
    setOutput("spread", `${Math.round(state.spread * 100)}%`);
    setOutput("resolution", `${state.gridSize} × ${state.gridSize}`);
    countOutput.textContent = `${state.gridSize * state.gridSize} CELLS / ${state.gridSize} × ${state.gridSize}`;
    updateTimeline();
    playButton.setAttribute("aria-label", isPlaying ? "PAUSE" : "PLAY");
    playButton.setAttribute("aria-pressed", String(isPlaying));
    playButton.dataset.state = isPlaying ? "playing" : "paused";
    tintSwatches.forEach((button) => {
      const selected = button.dataset.color.toLowerCase() === state.tint.toLowerCase();
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };

  const revokeObjectUrl = (key) => {
    if (state[key]) URL.revokeObjectURL(state[key]);
    state[key] = "";
  };

  const setLandmarkSelection = (key = "") => {
    landmarkButtons.forEach((button) => {
      const selected = Boolean(key) && button.dataset.mosaicLandmark === key;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };

  const setImage = (image, name, meta, objectUrl = "", landmarkKey = "", previewUrl = "") => {
    revokeObjectUrl("imageObjectUrl");
    state.sourceImage = image;
    state.imageObjectUrl = objectUrl;
    imageName.textContent = name;
    imageMeta.textContent = meta;
    if (imagePreview) {
      imagePreview.src = objectUrl || previewUrl || DEFAULT_IMAGE_URL;
      imagePreview.alt = name;
    }
    setLandmarkSelection(landmarkKey);
    rebuildCells();
    setStatus(currentStatus());
  };

  const setMotif = (image, name, meta, objectUrl = "", presetKey = "") => {
    revokeObjectUrl("motifObjectUrl");
    state.motifImage = image;
    state.motifObjectUrl = objectUrl;
    motifPresetButtons.forEach((button) => {
      const isSelected = button.dataset.mosaicMotifPreset === presetKey;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    rebuildCells();
    setStatus(currentStatus());
  };

  const loadDefaultAssets = async () => {
    try {
      const [image, motif] = await Promise.all([loadImage(DEFAULT_IMAGE_URL), loadImage(DEFAULT_MOTIF_URL)]);
      setImage(image, defaultImageName, defaultImageMeta, "", "gwanghwamun");
      setMotif(motif, defaultMotifName, defaultMotifMeta, "", "circle");
      draw();
    } catch {
      setStatus("ASSET LOAD ERROR");
    }
  };

  const acceptFile = async (file, kind) => {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("IMAGE FILE REQUIRED");
      return;
    }
    try {
      const result = await loadFileAsImage(file);
      const meta = `${file.type.replace("image/", "")} · ${formatBytes(file.size)}`;
      if (kind === "image") setImage(result.image, file.name, meta, result.objectUrl);
      else setMotif(result.image, file.name, meta, result.objectUrl);
    } catch {
      setStatus("IMAGE COULD NOT LOAD");
    }
  };

  const setupDropzone = (zone, input, kind) => {
    if (!input) return;
    input.addEventListener("change", () => acceptFile(input.files[0], kind));
    if (!zone) return;
    ["dragenter", "dragover"].forEach((eventName) => zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("is-dragging");
    }));
    ["dragleave", "drop"].forEach((eventName) => zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("is-dragging");
    }));
    zone.addEventListener("drop", (event) => acceptFile(event.dataTransfer.files[0], kind));
    zone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      input.click();
    });
  };

  const setupPanelWheel = (element) => {
    if (!element) return () => {};
    const handleWheel = (event) => {
      if (event.deltaY === 0 || element.scrollHeight <= element.clientHeight) return;
      const delta = event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * element.clientHeight
          : event.deltaY;
      const maxScrollTop = element.scrollHeight - element.clientHeight;
      const nextScrollTop = clamp(element.scrollTop + delta, 0, maxScrollTop);
      if (nextScrollTop === element.scrollTop) return;
      element.scrollTop = nextScrollTop;
      event.preventDefault();
      event.stopPropagation();
    };
    element.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => element.removeEventListener("wheel", handleWheel, { capture: true });
  };

  const draw = () => {
    drawFrame(canvas, state);
    lastDrawTime = performance.now();
    state.dirty = false;
  };

  const loop = (now) => {
    const delta = Math.min((now - previousTime) / 1000, .1);
    previousTime = now;
    if (state.playing && !reduceMotionQuery.matches) {
      state.elapsed = (state.elapsed + delta * state.speed) % 8;
      updateTimeline();
    }
    if (state.playing && !reduceMotionQuery.matches) state.dirty = true;
    const frameInterval = state.gridSize >= 64 ? 1000 / 30 : 1000 / 60;
    if (state.dirty && (now - lastDrawTime >= frameInterval || !state.playing)) {
      draw();
      state.dirty = false;
    }
    animationFrame = window.requestAnimationFrame(loop);
  };

  const exportStill = () => canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, "arendered-mosaic-frame.png");
  }, "image/png");

  const stopRecording = () => {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const recordPreview = () => {
    if (!canvas.captureStream || !window.MediaRecorder) {
      setStatus("VIDEO RECORDING UNSUPPORTED");
      return;
    }
    if (state.recording) {
      stopRecording();
      return;
    }
    recordedChunks = [];
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    recorder = new MediaRecorder(stream, { mimeType });
    state.recording = true;
    state.playing = !reduceMotionQuery.matches;
    recordButton.textContent = recordButton.dataset.recordStop || "STOP RECORDING";
    setStatus("RECORDING / 08 SEC", true);
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    });
    recorder.addEventListener("stop", () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = "arendered-mosaic-preview.webm";
      downloadLink.classList.add("is-visible");
      state.recording = false;
      recordButton.textContent = recordButton.dataset.recordStart || "RECORD 08 SEC";
      setStatus(currentStatus());
      stream.getTracks().forEach((track) => track.stop());
    });
    recorder.start();
    window.setTimeout(stopRecording, RECORD_SECONDS * 1000);
  };

  const resizeObserver = new ResizeObserver(draw);
  resizeObserver.observe(stage);
  setupDropzone(root.querySelector("[data-mosaic-image-zone]"), imageInput, "image");
  setupDropzone(root.querySelector("[data-mosaic-motif-zone]"), motifInput, "motif");
  if (imageUploadButton) imageUploadButton.addEventListener("click", () => imageInput.click());
  if (motifUploadButton) motifUploadButton.addEventListener("click", () => motifInput.click());
  const disposeInputWheel = setupPanelWheel(inputScrollBody);
  const disposeControlsWheel = setupPanelWheel(controlsScrollBody);
  landmarkFilterButtons.forEach((button) => button.addEventListener("click", () => {
    const region = button.dataset.mosaicLandmarkFilter;
    landmarkFilterButtons.forEach((filterButton) => {
      const selected = filterButton === button;
      filterButton.classList.toggle("is-selected", selected);
      filterButton.setAttribute("aria-pressed", String(selected));
    });
    landmarkGroups.forEach((group) => {
      group.hidden = group.dataset.mosaicLandmarkGroup !== region;
    });
  }));
  landmarkButtons.forEach((button) => button.addEventListener("click", async () => {
    try {
      const image = await loadImage(button.dataset.mosaicLandmarkSrc);
      setImage(
        image,
        button.dataset.mosaicLandmarkName,
        button.dataset.mosaicLandmarkMeta,
        "",
        button.dataset.mosaicLandmark,
        button.dataset.mosaicLandmarkSrc,
      );
    } catch {
      setStatus("LANDMARK COULD NOT LOAD");
    }
  }));
  motifPresetButtons.forEach((button) => button.addEventListener("click", async () => {
    const presetKey = button.dataset.mosaicMotifPreset;
    const source = MOTIF_PRESET_URLS[presetKey] || DEFAULT_MOTIF_URL;
    try {
      const motif = await loadImage(source);
      const name = button.querySelector(".mosaic-studio-preset__name").textContent;
      const meta = button.querySelector(".mosaic-studio-preset__meta").textContent;
      setMotif(motif, name, meta, "", presetKey);
    } catch {
      setStatus("MOTIF COULD NOT LOAD");
    }
  }));
  playButton.addEventListener("click", () => {
    if (reduceMotionQuery.matches) {
      state.playing = false;
      setStatus("REDUCED MOTION / STILL");
      updateOutputs();
      return;
    }
    state.playing = !state.playing;
    setStatus(state.playing ? liveStatus() : "PAUSED");
    updateOutputs();
  });
  resetButton.addEventListener("click", () => {
    setRangeValue(speedInput, 1);
    setRangeValue(breathInput, 82);
    setRangeValue(rotationInput, 0);
    setRangeValue(opacityInput, 120);
    setRangeValue(colorStrengthInput, 12);
    setRangeValue(contrastInput, 100);
    setRangeValue(cohesionInput, 72);
    setRangeValue(phaseDelayInput, 42);
    setRangeValue(variationInput, 28);
    setRangeValue(spinSpeedInput, 32);
    setRangeValue(spreadInput, 58);
    motifMotionInput.value = "organic";
    fieldMotionInput.value = "still";
    tintInput.value = "#d8a463";
    state.speed = Number(speedInput.value);
    state.breath = Number(breathInput.value) / 100;
    state.rotation = Number(rotationInput.value);
    state.opacity = Number(opacityInput.value) / 100;
    state.colorStrength = Number(colorStrengthInput.value) / 100;
    state.contrast = Number(contrastInput.value) / 100;
    state.cohesion = Number(cohesionInput.value) / 100;
    state.phaseDelay = Number(phaseDelayInput.value) / 100;
    state.variation = Number(variationInput.value) / 100;
    state.spinSpeed = Number(spinSpeedInput.value) / 100;
    state.spread = Number(spreadInput.value) / 100;
    state.motifMode = motifMotionInput.value;
    state.fieldMode = fieldMotionInput.value;
    state.tint = tintInput.value;
    state.elapsed = 0;
    state.playing = !reduceMotionQuery.matches;
    state.gridSize = 32;
    resolutionInput.value = "32";
    state.dropX = 0.5;
    state.dropY = 0.5;
    rebuildCells();
    updateModeLabel();
    state.dirty = true;
    setStatus(state.playing ? liveStatus() : "REDUCED MOTION / STILL");
    updateOutputs();
    draw();
  });
  const setRangeValue = (input, value) => {
    if (!input) return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    const min = Number(input.min);
    const max = Number(input.max);
    input.value = String(clamp(numericValue, min, max));
  };
  const applyProjectSettings = (project) => {
    if (!project || typeof project !== "object") throw new Error("Invalid project");
    setRangeValue(speedInput, project.speed);
    setRangeValue(breathInput, Number(project.breath) * 100);
    setRangeValue(rotationInput, project.rotation);
    setRangeValue(opacityInput, Number(project.opacity) * 100);
    setRangeValue(colorStrengthInput, Number(project.colorStrength) * 100);
    setRangeValue(contrastInput, Number(project.contrast) * 100);
    setRangeValue(cohesionInput, Number(project.cohesion) * 100);
    setRangeValue(phaseDelayInput, Number(project.phaseDelay) * 100);
    setRangeValue(variationInput, Number(project.variation) * 100);
    setRangeValue(spinSpeedInput, Number(project.spinSpeed) * 100);
    setRangeValue(spreadInput, Number(project.spread) * 100);
    if (project.motifMode === LEGACY_TICK_MODE) motifMotionInput.value = "rotating";
    else if (["organic", "swarm", "neural", "rotating", "breathing"].includes(project.motifMode)) motifMotionInput.value = project.motifMode;
    if (["still", "wave", "flow", "choreography", "neural", "ripple"].includes(project.fieldMode)) fieldMotionInput.value = project.fieldMode;
    if (/^#[0-9a-f]{6}$/i.test(project.tint)) {
      tintInput.value = project.tint;
      state.tint = project.tint;
    }
    if ([16, 25, 32, 48, 64, 96, 128].includes(Number(project.gridSize))) {
      state.gridSize = Number(project.gridSize);
      resolutionInput.value = String(state.gridSize);
    }
    state.speed = Number(speedInput.value);
    state.breath = Number(breathInput.value) / 100;
    state.rotation = Number(rotationInput.value);
    state.opacity = Number(opacityInput.value) / 100;
    state.colorStrength = Number(colorStrengthInput.value) / 100;
    state.contrast = Number(contrastInput.value) / 100;
    state.cohesion = Number(cohesionInput.value) / 100;
    state.phaseDelay = Number(phaseDelayInput.value) / 100;
    state.variation = Number(variationInput.value) / 100;
    state.spinSpeed = Number(spinSpeedInput.value) / 100;
    state.spread = Number(spreadInput.value) / 100;
    state.motifMode = motifMotionInput.value;
    state.fieldMode = fieldMotionInput.value;
    state.elapsed = clamp(Number(project.elapsed) || 0, 0, RECORD_SECONDS);
    state.dropX = 0.5;
    state.dropY = 0.5;
    rebuildCells();
    updateModeLabel();
    updateOutputs();
    state.dirty = true;
    setStatus(currentStatus());
    draw();
  };
  randomButton.addEventListener("click", () => {
    const randomBetween = (min, max, step) => min + Math.floor(Math.random() * (Math.floor((max - min) / step) + 1)) * step;
    const tintOptions = tintSwatches.map((button) => button.dataset.color).filter(Boolean);
    const motifModes = ["organic", "swarm", "neural", "rotating", "breathing"];
    const fieldModes = ["still", "wave", "flow", "choreography", "neural", "ripple"];
    setRangeValue(speedInput, randomBetween(Number(speedInput.min), Number(speedInput.max), Number(speedInput.step)));
    setRangeValue(breathInput, randomBetween(Number(breathInput.min), Number(breathInput.max), Number(breathInput.step)));
    setRangeValue(rotationInput, randomBetween(Number(rotationInput.min), Number(rotationInput.max), Number(rotationInput.step)));
    setRangeValue(opacityInput, randomBetween(Number(opacityInput.min), Number(opacityInput.max), Number(opacityInput.step)));
    setRangeValue(colorStrengthInput, randomBetween(Number(colorStrengthInput.min), Number(colorStrengthInput.max), Number(colorStrengthInput.step)));
    setRangeValue(contrastInput, randomBetween(Number(contrastInput.min), Number(contrastInput.max), Number(contrastInput.step)));
    setRangeValue(cohesionInput, randomBetween(Number(cohesionInput.min), Number(cohesionInput.max), Number(cohesionInput.step)));
    setRangeValue(phaseDelayInput, randomBetween(Number(phaseDelayInput.min), Number(phaseDelayInput.max), Number(phaseDelayInput.step)));
    setRangeValue(variationInput, randomBetween(Number(variationInput.min), Number(variationInput.max), Number(variationInput.step)));
    setRangeValue(spinSpeedInput, randomBetween(Number(spinSpeedInput.min), Number(spinSpeedInput.max), Number(spinSpeedInput.step)));
    setRangeValue(spreadInput, randomBetween(Number(spreadInput.min), Number(spreadInput.max), Number(spreadInput.step)));
    state.speed = Number(speedInput.value);
    state.breath = Number(breathInput.value) / 100;
    state.rotation = Number(rotationInput.value);
    state.opacity = Number(opacityInput.value) / 100;
    state.colorStrength = Number(colorStrengthInput.value) / 100;
    state.contrast = Number(contrastInput.value) / 100;
    state.cohesion = Number(cohesionInput.value) / 100;
    state.phaseDelay = Number(phaseDelayInput.value) / 100;
    state.variation = Number(variationInput.value) / 100;
    state.spinSpeed = Number(spinSpeedInput.value) / 100;
    state.spread = Number(spreadInput.value) / 100;
    state.tint = tintOptions[Math.floor(Math.random() * tintOptions.length)] || state.tint;
    tintInput.value = state.tint;
    state.motifMode = motifModes[Math.floor(Math.random() * motifModes.length)];
    state.fieldMode = fieldModes[Math.floor(Math.random() * fieldModes.length)];
    motifMotionInput.value = state.motifMode;
    fieldMotionInput.value = state.fieldMode;
    state.elapsed = 0;
    state.playing = !reduceMotionQuery.matches;
    rebuildCells();
    updateModeLabel();
    updateOutputs();
    state.dirty = true;
    setStatus(currentStatus());
    draw();
  });
  saveButton.addEventListener("click", () => {
    const project = {
      version: 2,
      gridSize: state.gridSize,
      speed: state.speed,
      breath: state.breath,
      rotation: state.rotation,
      opacity: state.opacity,
      tint: state.tint,
      colorStrength: state.colorStrength,
      contrast: state.contrast,
      cohesion: state.cohesion,
      phaseDelay: state.phaseDelay,
      variation: state.variation,
      spinSpeed: state.spinSpeed,
      spread: state.spread,
      motifMode: state.motifMode,
      fieldMode: state.fieldMode,
      elapsed: state.elapsed,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "arendered-mosaic-settings.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus("SETTINGS SAVED");
  });
  loadButton.addEventListener("click", () => projectInput.click());
  projectInput.addEventListener("change", async () => {
    const file = projectInput.files?.[0];
    if (!file) return;
    try {
      applyProjectSettings(JSON.parse(await file.text()));
      setStatus("SETTINGS LOADED");
    } catch {
      setStatus("PROJECT FILE INVALID");
    } finally {
      projectInput.value = "";
    }
  });
  resetImageButton.addEventListener("click", async () => {
    setImage(await loadImage(DEFAULT_IMAGE_URL), defaultImageName, defaultImageMeta, "", "gwanghwamun");
  });
  fullscreenButton.addEventListener("click", () => stage.requestFullscreen?.());
  exportButton.addEventListener("click", exportStill);
  recordButton.addEventListener("click", recordPreview);
  timelineInput.addEventListener("input", () => {
    state.elapsed = clamp(Number(timelineInput.value), 0, RECORD_SECONDS);
    state.dirty = true;
    updateTimeline();
    draw();
  });
  motifMotionInput.addEventListener("change", () => {
    state.motifMode = motifMotionInput.value;
    updateModeLabel();
    state.dirty = true;
    setStatus(currentStatus());
    draw();
  });
  fieldMotionInput.addEventListener("change", () => {
    state.fieldMode = fieldMotionInput.value;
    updateModeLabel();
    state.dirty = true;
    setStatus(currentStatus());
    draw();
  });
  resolutionInput.addEventListener("change", () => {
    state.gridSize = Number(resolutionInput.value);
    state.dropX = 0.5;
    state.dropY = 0.5;
    rebuildCells();
    draw();
  });
  const rangeBindings = [
    [speedInput, "speed", (value) => Number(value)],
    [breathInput, "breath", (value) => Number(value) / 100],
    [rotationInput, "rotation", (value) => Number(value)],
    [opacityInput, "opacity", (value) => Number(value) / 100],
    [colorStrengthInput, "colorStrength", (value) => Number(value) / 100],
    [contrastInput, "contrast", (value) => Number(value) / 100],
    [cohesionInput, "cohesion", (value) => Number(value) / 100],
    [phaseDelayInput, "phaseDelay", (value) => Number(value) / 100],
    [variationInput, "variation", (value) => Number(value) / 100],
    [spinSpeedInput, "spinSpeed", (value) => Number(value) / 100],
    [spreadInput, "spread", (value) => Number(value) / 100],
  ];
  rangeBindings.forEach(([input, key, parse]) => input.addEventListener("input", () => {
    state[key] = parse(input.value);
    updateOutputs();
    if (key === "colorStrength" || key === "contrast" || key === "opacity") rebuildCells();
    state.dirty = true;
    draw();
  }));
  const setTint = (value) => {
    state.tint = value;
    tintInput.value = value;
    rebuildCells();
    draw();
    updateOutputs();
  };
  tintSwatches.forEach((button) => button.addEventListener("click", () => setTint(button.dataset.color)));
  tintInput.addEventListener("input", () => setTint(tintInput.value));
  const onReducedMotionChange = (event) => {
    state.playing = !event.matches;
    state.dirty = true;
    setStatus(event.matches ? "REDUCED MOTION / STILL" : liveStatus());
    updateOutputs();
  };
  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.dropX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    state.dropY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    if (state.fieldMode === "ripple" && !reduceMotionQuery.matches) state.playing = true;
    state.elapsed = 0;
    state.dirty = true;
    updateOutputs();
    draw();
  });
  reduceMotionQuery.addEventListener("change", onReducedMotionChange);
  updateModeLabel();
  updateOutputs();
  loadDefaultAssets();
  animationFrame = window.requestAnimationFrame(loop);

  return () => {
    window.cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    disposeInputWheel();
    disposeControlsWheel();
    reduceMotionQuery.removeEventListener("change", onReducedMotionChange);
    revokeObjectUrl("imageObjectUrl");
    revokeObjectUrl("motifObjectUrl");
    if (downloadLink.href.startsWith("blob:")) URL.revokeObjectURL(downloadLink.href);
  };
};

let disposeMosaicStudio = () => {};
const renderMosaicStudio = () => {
  disposeMosaicStudio();
  const root = document.querySelector("[data-mosaic-studio]");
  if (root) {
    const resetScroll = () => window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    resetScroll();
    window.requestAnimationFrame(resetScroll);
    window.setTimeout(resetScroll, 80);
  }
  disposeMosaicStudio = root ? mountMosaicStudio(root) : () => {};
};

document.addEventListener("arendered:rendered", renderMosaicStudio);
window.addEventListener("pageshow", () => {
  if (document.querySelector("[data-mosaic-studio]")) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
});
renderMosaicStudio();
