// allow: SIZE_OK — this self-contained canvas study keeps sampling, motion, and export-free preview logic on one lazy-loaded route.
import { mountPatternSound } from "./pattern-field-audio.js?v=20261001-pulse-depth-v21b";
import { mountVideoExport } from "./pattern-field-export.js?v=20261001-pulse-depth-v21b";

import { daySkyGain, matchDayTone } from "./pattern-field-tone.js?v=20260915-tone-1";

import { detailBlend, detailPose, createDetailTiming, createEdgeFeather } from "./pattern-field-detail.js?v=20261005-density-128-1";
import { fineGridBounds, detailDensity, DEFAULT_DETAIL_DENSITY, scatterMotifScale } from "./pattern-field-density.js?v=20261007-scatter-size-1";
import { createExteriorInfill } from "./pattern-field-infill.js?v=20260919-infill-1";
import { updateProjectionLuts, applyProjectionColor, projectionPigmentGain } from "./pattern-field-projection.js?v=20260930-depth-light-1";
import { createFrameCoverage } from "./pattern-field-coverage.js?v=20260930-mid-coverage-1";

const TAU = Math.PI * 2;
const OUTPUT_FPS = 30;
const OUTPUT_PROFILES = Object.freeze({
  fhd: { label: "FHD / 4:5", width: 1080, height: 1350, artworkWidth: 1080, bitrate: 16000000 },
  uhd: { label: "4K / 4:5", width: 2160, height: 2700, artworkWidth: 2160, bitrate: 30000000 },
});
const DEFAULT_MOTIF = "assets/mosaic/motifs/Samarkand_9.png?v=20260906-motif-1";
const MOTIFS = {
  circle: "assets/mosaic/circular-dot.svg?v=20260827-filled-3",
  koreaThree: "assets/mosaic/motifs/Korea_3.png?v=20260902-motif-1",
  koreaFour: "assets/mosaic/motifs/Korea_4.png?v=20260902-motif-1",
  koreaFive: "assets/mosaic/motifs/Korea_5.png?v=20260902-motif-1",
  koreaSix: "assets/mosaic/motifs/Korea_6.png?v=20260902-motif-1",
  koreaSeven: "assets/mosaic/motifs/Korea_7.png?v=20260903-motif-1",
  koreaEight: "assets/mosaic/motifs/Korea_8.png?v=20260903-motif-1",
  koreaNine: "assets/mosaic/motifs/Korea_9.png?v=20260905-motif-1",
  koreaTen: "assets/mosaic/motifs/Korea_10.png?v=20260905-motif-1",
  koreaTwelve: "assets/mosaic/motifs/Korea_12.png?v=20260905-motif-1",
  samarkandOne: "assets/mosaic/motifs/samarkand-pattern-01.png?v=20260901-samarkand-1",
  samarkandEight: "assets/mosaic/motifs/Samarkand_8.png?v=20260906-motif-1",
  samarkandNine: DEFAULT_MOTIF,
  samarkandThirteen: "assets/mosaic/motifs/Samarkand_13.png?v=20260906-motif-2",
  samarkandFourteen: "assets/mosaic/motifs/Samarkand_14.png?v=20260906-motif-2",
  samarkandTwo: "assets/mosaic/motifs/samarkand-pattern-02.png?v=20260901-samarkand-1",
  samarkandThreeTwo: "assets/mosaic/motifs/Samarkand_3-2.png?v=20260902-motif-1",
  samarkandFour: "assets/mosaic/motifs/Samarkand_4.png?v=20260903-motif-1",
  samarkandFive: "assets/mosaic/motifs/Samarkand_5.png?v=20260903-motif-1",
  square: "assets/mosaic/square-motif.svg?v=20260902-square-1",
};
const LIBRARIES = window.PATTERN_FIELD_LIBRARY;
const CURATED_MOTIFS = window.PATTERN_FIELD_MOTIFS;
const NODES = [
  { x: .18, y: .2, rate: .18, phase: .1 }, { x: .52, y: .2, rate: .13, phase: .64 },
  { x: .82, y: .28, rate: .2, phase: .3 }, { x: .28, y: .58, rate: .11, phase: .82 },
  { x: .67, y: .58, rate: .16, phase: .44 }, { x: .48, y: .86, rate: .1, phase: .18 },
];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0, edge1, value) => { const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1); return progress * progress * (3 - 2 * progress); };
const hash = (x, y, salt) => {
  const value = Math.sin((x * 12.9898 + y * 78.233 + salt * 37.719) * .0174533) * 43758.5453;
  return value - Math.floor(value);
};
const load = (src) => new Promise((resolve, reject) => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src;
});
const colorMix = (a, b, amount) => a.map((v, i) => Math.round(v + (b[i] - v) * amount));
const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;

const mountPatternField = (root) => {
  if (!root) return () => {};
  let canvas = root.querySelector("[data-pattern-field-canvas]");
  const stage = root.querySelector("[data-pattern-field-stage]");
  let context = canvas.getContext("2d");
  let exporting = false; let disposed = false; let videoExport; let pendingAssets = 0;
  const motifInput = root.querySelector("[data-pattern-field-motif-input]");
  const controlPanel = root.querySelector(".pattern-field-control-panel");
  const motifSequenceList = root.querySelector("[data-pattern-field-motif-sequence-list]");
  const landmarkSequenceList = root.querySelector("[data-pattern-field-sequence-list]");
  const motifLibrarySelect = root.querySelector("[data-pattern-field-motif-library]");
  const motifMixSelect = root.querySelector("[data-pattern-field-motif-mix]");
  const motifArrangementSelect = root.querySelector("[data-pattern-field-motif-arrangement]");
  const landmarkModeButtons = root.querySelectorAll("[data-pattern-field-landmark-mode]");
  let internalStatus = "LOADING ASSETS";
  let defaultSequence = LIBRARIES.main.map((landmark) => landmark.evening);
  let defaultMotifSequence = LIBRARIES.main.map((landmark) => MOTIFS[landmark.motif]);
  const librarySelect = root.querySelector("[data-pattern-field-library]");
  let sequenceRevision = 0; let motifRevision = 0; let sequenceLoading = false; let motifLoading = false;
  const setDefaults = (library, mode) => {
    defaultSequence = LIBRARIES[library].map((landmark) => landmark[mode]);
    defaultMotifSequence = LIBRARIES[library].map((landmark) => MOTIFS[landmark.motif]);
  };
  const state = { grid: 48, outputProfile: "fhd", scale: 1, sizeCounts: { 2: 40, 3: 10, 4: 0 }, sizeSeed: 1, tension: 0, pulse: .07, opacity: 1, brightnessBoost: 3, toneMatch: 1, edgeFeather: .06, landmarkDetail: 1, detailDensity: DEFAULT_DETAIL_DENSITY, contrast: 1.15, projectionLift: .65, speed: 1, cohesion: .72, delay: .42, turbulence: 0, manualTurbulence: .24, spread: .7, colorMix: .08, surfaceVariation: .26, tint: [216, 164, 99], mode: "flock", field: "source", time: 0, playing: true, autoSequence: true, ramp: 0, rampDuration: 30, transitionDuration: 5, transition: 0, sequenceIndex: 0, sequence: [...defaultSequence], landmarkLibrary: "main", landmarkMode: "evening", motifAuto: true, motifMorphEnd: .55, motifTransition: 0, motifIndex: 0, motifSequence: [...defaultMotifSequence], motifLibrary: "main", motifMix: "single", motifArrangement: "balanced" };
  let cells = []; let nextCells = []; let sequenceImages = []; let motifSequenceImages = []; const imageCache = new Map(); const motifPoolImages = new Map(); const tintCache = new Map(); let image; let motif; let nextMotif; let motifKey = DEFAULT_MOTIF; let nextMotifKey = ""; let imageUrl = ""; let motifUrl = ""; let dpr = 1; let width = 1; let height = 1; let raf = 0; let last = performance.now(); let needsDraw = true; let disposeFullscreen = () => {};
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const outputs = new Map();
  const write = (key, value) => {
    if (exporting) return;
    if (!outputs.has(key)) outputs.set(key, root.querySelectorAll(`[data-pattern-field-output="${key}"]`));
    outputs.get(key).forEach((output) => { if (output.textContent !== value) output.textContent = value; });
  };
  const setStatus = (value) => { needsDraw = true; internalStatus = value; videoExport?.refresh(); };
  const loadAsset = (src) => { pendingAssets += 1; videoExport?.refresh(); return load(src).finally(() => { pendingAssets -= 1; videoExport?.refresh(); }); };
  const updateAutoButton = () => { const button = root.querySelector("[data-pattern-field-auto]"); if (!button) return; button.setAttribute("aria-pressed", String(state.autoSequence)); button.textContent = `AUTO SEQUENCE / ${state.autoSequence ? "ON" : "OFF"}`; };
  const updateMotifCycle = () => { const select = root.querySelector("[data-pattern-field-motif-cycle]"); if (select) select.value = state.motifAuto ? "cycle" : "fixed"; const morphInput = root.querySelector("[data-pattern-field-control=\"motifMorphEnd\"]"); if (morphInput) { morphInput.value = Math.round(state.motifMorphEnd * 100); write("motifMorphEnd", `${Math.round(state.motifMorphEnd * 100)}%`); } };
  const landmarkSrc = (src, mode = state.landmarkMode) => { const landmark = LIBRARIES[state.landmarkLibrary].find((item) => item.day === src || item.evening === src); return landmark ? landmark[mode] : src; };
  const updateLandmarkMode = () => { landmarkModeButtons.forEach((button) => { const selected = button.dataset.patternFieldLandmarkMode === state.landmarkMode; button.classList.toggle("is-selected", selected); button.setAttribute("aria-pressed", String(selected)); }); };
  const updateMotifMix = () => { if (motifMixSelect) motifMixSelect.value = state.motifMix; if (motifArrangementSelect) motifArrangementSelect.value = state.motifArrangement; };
  const motifPools = Object.fromEntries([...root.querySelectorAll("[data-pattern-field-motif-group]")].map((group) => [group.dataset.patternFieldMotifGroup, [...group.querySelectorAll("[data-pattern-field-motif]")].map((button) => button.dataset.patternFieldSrc)]));
  const sceneLandmark = (sceneIndex) => LIBRARIES[state.landmarkLibrary].find((item) => item.day === state.sequence[sceneIndex] || item.evening === state.sequence[sceneIndex]);
  const ruleForScene = (sceneIndex) => state.motifLibrary === "main" ? CURATED_MOTIFS.rules[sceneLandmark(sceneIndex)?.key] : null;
  const sizeCountsForScene = (sceneIndex = state.sequenceIndex) => state.motifLibrary === "main" ? CURATED_MOTIFS.counts(ruleForScene(sceneIndex)) : state.sizeCounts;
  const updateMotifLibrary = () => {
    motifLibrarySelect.value = state.motifLibrary;
    root.querySelector("[data-pattern-field-main-motifs]").hidden = state.motifLibrary !== "main";
    root.querySelector("[data-pattern-field-sample-motifs]").hidden = state.motifLibrary !== "sample";
    root.querySelector("[data-pattern-field-motif-upload]").hidden = state.motifLibrary === "main";
  };
  const updateRuleStatus = () => {
    const rule = ruleForScene(state.sequenceIndex);
    const status = root.querySelector("[data-pattern-field-rule-status]");
    if (state.motifLibrary !== "main") return;
    const items = rule?.motifs || [{ label: "기존 문양", src: cells[0]?.motifSrc }];
    const counts = items.map((item) => {
      const tally = { 1: 0, 2: 0, 3: 0 };
      for (const cell of cells) if (cell.motifSrc === item.src && cell.span in tally) tally[cell.span] += 1;
      return `${item.label}: 3×3 ${tally[3]} / 2×2 ${tally[2]} / 1×1 ${tally[1]}`;
    }).join(" · ");
    status.textContent = `${rule?.label || sceneLandmark(state.sequenceIndex)?.label || "CUSTOM IMAGE"} · ${counts}`;
  };
  const motifPoolSources = () => state.motifMix === "single" ? [] : state.motifMix === "all" ? [...motifPools.korea, ...motifPools.samarkand] : motifPools[state.motifMix] || motifPools.korea;
  const loadMotifPool = async () => { const sources = state.motifLibrary === "main" ? [...CURATED_MOTIFS.sources, ...new Set(Object.values(LIBRARIES).flat().map((item) => MOTIFS[item.motif]))] : motifPoolSources(); await Promise.all(sources.map(async (src) => { if (!imageCache.has(src)) imageCache.set(src, loadAsset(src)); motifPoolImages.set(src, await imageCache.get(src)); })); };
  const maxSequenceLength = 12;
  const renderMotifSequence = () => { if (!motifSequenceList) return; root.querySelector("[data-pattern-field-motif-add]").disabled = state.motifSequence.length >= maxSequenceLength; root.querySelector("[data-pattern-field-motif-remove]").disabled = state.motifSequence.length <= 1; const options = motifSequenceList.querySelector("select")?.innerHTML || ""; motifSequenceList.innerHTML = state.motifSequence.map((src, index) => `<label class="pattern-field-sequence-row"><span>${String(index + 1).padStart(2, "0")}</span><select data-pattern-field-motif-sequence="${index}" aria-label="MOTIF ${index + 1}">${options}</select></label>`).join(""); motifSequenceList.querySelectorAll("[data-pattern-field-motif-sequence]").forEach((select, index) => { select.value = state.motifSequence[index]; }); };
  const renderLandmarkSequence = () => { if (!landmarkSequenceList) return; root.querySelector("[data-pattern-field-sequence-add]").disabled = state.sequence.length >= maxSequenceLength; root.querySelector("[data-pattern-field-sequence-remove]").disabled = state.sequence.length <= 1; const options = LIBRARIES[state.landmarkLibrary].map((landmark) => ({ value: landmark[state.landmarkMode], label: landmark.label, key: landmark.key })); const optionMarkup = (selectedSrc) => options.map(({ value, label, key }) => `<button type="button" role="option" aria-selected="${value === selectedSrc}" data-pattern-field-sequence-option="${value}" data-pattern-field-sequence-label="${label}" data-pattern-field-sequence-key="${key}"><span>${label}</span><img src="${value}" alt="" loading="lazy"></button>`).join(""); landmarkSequenceList.innerHTML = state.sequence.map((src, index) => { const selected = options.find((option) => option.value === src) || options[0]; const selectMarkup = options.map(({ value, label, key }) => `<option value="${value}" data-landmark-key="${key}"${value === selected?.value ? " selected" : ""}>${label}</option>`).join(""); return `<label class="pattern-field-sequence-row pattern-field-sequence-row--landmark"><span>${String(index + 1).padStart(2, "0")}</span><div class="pattern-field-landmark-picker" data-pattern-field-sequence-picker><select class="pattern-field-sequence-native" data-pattern-field-sequence="${index}" aria-label="LANDMARK ${index + 1}" tabindex="-1" aria-hidden="true">${selectMarkup}</select><button type="button" class="pattern-field-sequence-trigger" data-pattern-field-sequence-trigger aria-haspopup="listbox" aria-expanded="false"><span data-pattern-field-sequence-trigger-label>${selected?.label || `Landmark ${index + 1}`}</span><span aria-hidden="true">⌄</span></button><div class="pattern-field-sequence-options" role="listbox" aria-label="LANDMARK ${index + 1}">${optionMarkup(selected?.value || src)}</div></div><img src="${selected?.value || src}" data-pattern-field-sequence-preview alt="${selected?.label || `Landmark ${index + 1}`}"></label>`; }).join(""); landmarkSequenceList.querySelectorAll("[data-pattern-field-sequence]").forEach((select, index) => { select.value = state.sequence[index]; }); };
  const resetMotifState = () => { state.motifAuto = true; state.motifMorphEnd = .55; state.motifTransition = 0; state.motifIndex = 0; state.motifSequence = [...defaultMotifSequence]; if (motifSequenceImages.length) { motif = motifSequenceImages[0]; nextMotif = motifSequenceImages[1]; motifKey = state.motifSequence[0]; nextMotifKey = state.motifSequence[1]; } root.querySelectorAll("[data-pattern-field-motif]").forEach((button) => { const selected = button.dataset.patternFieldSrc === DEFAULT_MOTIF; button.classList.toggle("is-selected", selected); button.setAttribute("aria-pressed", String(selected)); }); renderMotifSequence(); updateMotifCycle(); };
  const landmarkHoverPreview = root.querySelector("[data-pattern-field-landmark-hover-preview]");
  const showLandmarkPreview = (src, label) => { if (!landmarkHoverPreview) return; const imagePreview = landmarkHoverPreview.querySelector("[data-pattern-field-landmark-hover-image]"); const labelPreview = landmarkHoverPreview.querySelector("[data-pattern-field-landmark-hover-label]"); if (imagePreview) imagePreview.src = src; if (labelPreview) labelPreview.textContent = label; landmarkHoverPreview.classList.add("is-visible"); landmarkHoverPreview.setAttribute("aria-hidden", "false"); };
  const hideLandmarkPreview = () => { if (!landmarkHoverPreview) return; landmarkHoverPreview.classList.remove("is-visible"); landmarkHoverPreview.setAttribute("aria-hidden", "true"); };
  const closeLandmarkPickers = (except = null) => { landmarkSequenceList?.querySelectorAll("[data-pattern-field-sequence-picker].is-open").forEach((picker) => { if (picker !== except) { picker.classList.remove("is-open"); picker.querySelector("[data-pattern-field-sequence-trigger]")?.setAttribute("aria-expanded", "false"); } }); };
  let sizeLayout = []; let sizeLayoutKey = "";
  const motifLayout = (sceneIndex = state.sequenceIndex) => {
    const seed = state.sizeSeed + sceneIndex * 1009;
    const requestedCounts = sizeCountsForScene(sceneIndex);
    const key = `${state.grid}|${Object.values(requestedCounts).join(",")}|${seed}`;
    if (key === sizeLayoutKey) return sizeLayout;
    const tiles = []; const occupied = new Uint8Array(state.grid * state.grid);
    for (const span of [4, 3, 2]) {
      const requested = requestedCounts[span];
      if (requested <= 0) continue;
      const candidates = [];
      for (let y = 0; y <= state.grid - span; y += 1) for (let x = 0; x <= state.grid - span; x += 1) {
        candidates.push({ x, y, rank: (x % span || y % span ? 1 : 0) + hash(x, y, seed * 97 + span * 17) });
      }
      candidates.sort((a, b) => a.rank - b.rank);
      let placed = 0;
      for (const { x, y } of candidates) {
        if (placed >= requested) break;
        let free = true;
        for (let row = y; row < y + span && free; row += 1) for (let column = x; column < x + span; column += 1) {
          if (occupied[row * state.grid + column]) { free = false; break; }
        }
        if (!free) continue;
        for (let row = y; row < y + span; row += 1) for (let column = x; column < x + span; column += 1) occupied[row * state.grid + column] = 1;
        tiles.push({ x, y, span, index: y * state.grid + x }); placed += 1;
      }
    }
    for (let index = 0; index < occupied.length; index += 1) if (!occupied[index]) tiles.push({ x: index % state.grid, y: Math.floor(index / state.grid), span: 1, index });
    tiles.sort((a, b) => a.index - b.index);
    sizeLayout = tiles; sizeLayoutKey = key; return sizeLayout;
  };
  const updateSizeCounts = () => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 }; motifLayout().forEach(({ span }) => { counts[span] += 1; });
    const requestedCounts = sizeCountsForScene();
    root.querySelectorAll("[data-pattern-field-size-count]").forEach((input) => {
      const span = Number(input.dataset.patternFieldSizeCount);
      input.readOnly = state.motifLibrary === "main"; input.value = requestedCounts[span];
    });
    write("cells", `${Object.values(counts).reduce((sum, count) => sum + count, 0).toLocaleString()} ${Object.values(requestedCounts).some(Boolean) ? "MOTIFS" : "CELLS"}`);
    let missing = 0;
    for (const span of [2, 3, 4]) { write(`sizeCount${span}`, `${counts[span]} / ${requestedCounts[span]}`); missing += requestedCounts[span] - counts[span]; }
    const summary = root.querySelector("[data-pattern-field-size-summary]");
    if (summary) {
      const language = document.documentElement.lang;
      summary.textContent = language === "ko" ? `1×1 문양 ${counts[1].toLocaleString()}개 · ${missing ? `공간 부족으로 ${missing}개 미배치` : "모두 배치됨"}` : language === "ja" ? `1×1: ${counts[1].toLocaleString()}個 · ${missing ? `${missing}個は空き不足` : "配置完了"}` : `1×1: ${counts[1].toLocaleString()} · ${missing ? `${missing} NOT PLACED / NO ROOM` : "ALL PLACED"}`;
      summary.classList.toggle("is-limited", missing > 0);
    }
  };
  const sample = (source = image, sceneIndex = state.sequenceIndex) => {
    if (!source) return [];
    const sampleCanvas = document.createElement("canvas"); sampleCanvas.width = state.grid; sampleCanvas.height = state.grid;
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true }); const ratio = source.naturalWidth / source.naturalHeight || 1;
    const sw = ratio > 1 ? state.grid * ratio : state.grid; const sh = ratio > 1 ? state.grid : state.grid / ratio;
    sampleContext.drawImage(source, (state.grid - sw) / 2, (state.grid - sh) / 2, sw, sh);
    const data = sampleContext.getImageData(0, 0, state.grid, state.grid).data; const sampled = [];
    const toneAmount = state.landmarkLibrary === "main" && state.landmarkMode === "day" && sceneLandmark(sceneIndex) ? state.toneMatch : 0;
    const skyGain = toneAmount ? daySkyGain(data, state.grid) : 1;
    let detailData;
    const detailGrid = state.detailDensity;
    const detailRatio = detailGrid / state.grid;
    if (state.landmarkDetail) {
      sampleCanvas.width = detailGrid; sampleCanvas.height = detailGrid;
      sampleContext.drawImage(source, (state.grid - sw) * detailRatio / 2, (state.grid - sh) * detailRatio / 2, sw * detailRatio, sh * detailRatio);
      detailData = sampleContext.getImageData(0, 0, detailGrid, detailGrid).data;
    }
    for (const { x, y, span, index } of motifLayout(sceneIndex)) {
      let color = [0, 0, 0];
      for (let row = y; row < y + span; row += 1) for (let column = x; column < x + span; column += 1) {
        const at = (row * state.grid + column) * 4;
        color[0] += data[at]; color[1] += data[at + 1]; color[2] += data[at + 2];
      }
      for (let channel = 0; channel < 3; channel += 1) color[channel] /= span * span;
      color = matchDayTone(color, (y + span / 2) / state.grid, skyGain, toneAmount);
      const bounds = span === 1 && detailData ? fineGridBounds(x, y, 1, state.grid, detailGrid) : null;
      const details = bounds ? Array.from({ length: bounds.columns * bounds.rows }, (_, quadrant) => {
        const dx = quadrant % bounds.columns, dy = Math.floor(quadrant / bounds.columns);
        const fineX = bounds.left + dx, fineY = bounds.top + dy;
        const at = (fineY * detailGrid + fineX) * 4;
        const color = matchDayTone([detailData[at], detailData[at + 1], detailData[at + 2]], (fineY + .5) / detailGrid, skyGain, toneAmount);
        const seed = hash(fineX, fineY, 71);
        const offsetX = detailRatio === 2 ? (dx - .5) / state.grid / 2 : (fineX + .5) / detailGrid - (x + .5) / state.grid;
        const offsetY = detailRatio === 2 ? (dy - .5) / state.grid / 2 : (fineY + .5) / detailGrid - (y + .5) / state.grid;
        return { offsetX, offsetY, color, light: (color[0] * .2126 + color[1] * .7152 + color[2] * .0722) / 255, seed, timing: createDetailTiming(seed) };
      }) : null;
      sampled.push({ x: (x + span / 2) / state.grid, y: (y + span / 2) / state.grid, span, index, details, color, light: (color[0] * .2126 + color[1] * .7152 + color[2] * .0722) / 255, group: Math.floor(hash(x, y, 5) * NODES.length), phase: hash(x, y, 7), drift: hash(x, y, 11) - .5, spin: hash(x, y, 13) > .5 ? 1 : -1 });
    }
    if (state.motifLibrary === "main") CURATED_MOTIFS.assign(sampled, ruleForScene(sceneIndex), state.sizeSeed + sceneIndex * 1009, MOTIFS[sceneLandmark(sceneIndex)?.motif] || motifKey);
    for (const cell of sampled) cell.scatterKeep = true;
    if (state.grid === 48) {
      const singles = sampled.filter((cell) => cell.span === 1).map((cell) => ({ cell, rank: hash(cell.index % state.grid, Math.floor(cell.index / state.grid), state.sizeSeed + 419) }));
      singles.sort((a, b) => a.rank - b.rank);
      for (const { cell } of singles.slice(0, 48 * 48 - 40 * 40)) cell.scatterKeep = false;
    }
    const infillPool = ruleForScene(sceneIndex)?.motifs;
    if (detailData && infillPool) for (const cell of sampled) if (cell.span > 1) {
      const baseX = cell.index % state.grid, baseY = Math.floor(cell.index / state.grid);
      const { left, top, columns, rows } = fineGridBounds(baseX, baseY, cell.span, state.grid, detailGrid);
      cell.infill = Array.from({ length: columns * rows }, (_, index) => {
        const x = left + index % columns, y = top + Math.floor(index / columns);
        const at = (y * detailGrid + x) * 4;
        const color = matchDayTone([detailData[at], detailData[at + 1], detailData[at + 2]], (y + .5) / detailGrid, skyGain, toneAmount);
        const seed = hash(x, y, 197);
        return { x: (x + .5) / detailGrid, y: (y + .5) / detailGrid, color, light: (color[0] * .2126 + color[1] * .7152 + color[2] * .0722) / 255, seed, timing: createDetailTiming(seed), motifSrc: infillPool[Math.floor(hash(x, y, state.sizeSeed + 211) * infillPool.length)].src };
      });
    }
    if (source === image) { write("grid", `${state.grid} × ${state.grid}`); write("cells", `${sampled.length.toLocaleString()} ${Object.values(state.sizeCounts).some(Boolean) ? "MOTIFS" : "CELLS"}`); updateSizeCounts(); }
    return sampled;
  };
  const resampleSizes = () => {
    root.querySelectorAll("[data-pattern-field-size-count]").forEach((input) => {
      const span = Number(input.dataset.patternFieldSizeCount); const max = Math.floor(state.grid / span) ** 2;
      state.sizeCounts[span] = clamp(state.sizeCounts[span], 0, max); input.min = 0; input.max = max;
    });
    cells = sample(image);
    nextCells = sequenceImages.length ? sample(sequenceImages[(state.sequenceIndex + 1) % sequenceImages.length], (state.sequenceIndex + 1) % sequenceImages.length) : [];
    pulseValues = []; updateRuleStatus();
    const shuffle = root.querySelector("[data-pattern-field-size-shuffle]");
    if (shuffle) shuffle.disabled = !Object.values(sizeCountsForScene()).some(Boolean);
  };
  const loadSequence = async () => {
    const revision = ++sequenceRevision; sequenceLoading = true;
    try {
    const loaded = await Promise.all(state.sequence.map((src) => {
      if (!imageCache.has(src)) imageCache.set(src, loadAsset(src));
      return imageCache.get(src);
    }));
    if (revision !== sequenceRevision || disposed) return;
    sequenceImages = loaded;
    image = sequenceImages[state.sequenceIndex]; cells = sample(image); updateRuleStatus(); nextCells = sample(sequenceImages[(state.sequenceIndex + 1) % state.sequence.length], (state.sequenceIndex + 1) % state.sequence.length);
    } finally { if (revision === sequenceRevision) { sequenceLoading = false; needsDraw = true; videoExport?.refresh(); } }
  };
  const loadMotifSequence = async () => {
    const revision = ++motifRevision; motifLoading = true;
    try {
    const loaded = await Promise.all(state.motifSequence.map((src) => {
      if (!imageCache.has(src)) imageCache.set(src, loadAsset(src));
      return imageCache.get(src);
    }));
    if (revision !== motifRevision || disposed) return;
    motifSequenceImages = loaded;
    motif = motifSequenceImages[state.motifIndex]; nextMotif = motifSequenceImages[(state.motifIndex + 1) % state.motifSequence.length]; motifKey = state.motifSequence[state.motifIndex]; nextMotifKey = state.motifSequence[(state.motifIndex + 1) % state.motifSequence.length];
    } finally { if (revision === motifRevision) { motifLoading = false; needsDraw = true; videoExport?.refresh(); } }
  };
  let pairedSource; let pairedTarget; let sizePairs = [];
  const layoutPairs = () => {
    if (pairedSource === cells && pairedTarget === nextCells) return sizePairs;
    pairedSource = cells; pairedTarget = nextCells;
    const available = new Map(nextCells.map((cell) => [cell.index, cell]));
    const targets = new Map();
    for (const cell of cells) {
      const target = available.get(cell.index);
      if (target?.span === cell.span) { targets.set(cell, target); available.delete(cell.index); }
    }
    const buckets = [[], [], [], [], []];
    for (const target of available.values()) buckets[target.span].push(target);
    const offsets = [0, 0, 0, 0, 0];
    sizePairs = cells.map((cell) => {
      const target = targets.get(cell) || buckets[cell.span][offsets[cell.span]++];
      return { cell, target: target || cell, entering: false, leaving: !target && nextCells.length > 0 };
    });
    for (const span of [1, 2, 3, 4]) for (const target of buckets[span].slice(offsets[span])) sizePairs.push({ cell: target, target, entering: true, leaving: false });
    return sizePairs;
  };
  const carryLayoutPulse = () => {
    const carried = [];
    for (const { cell, target, entering, leaving } of layoutPairs()) if (!leaving) carried[target.index] = pulseValues[entering ? state.grid * state.grid + target.index : cell.index];
    pulseValues = carried;
  };
  const advanceSequence = (delta) => {
    if (!state.autoSequence) { state.turbulence = state.manualTurbulence; return; }
    if (!sequenceImages.length || !nextCells.length) return;
    const previousTransition = state.transition;
    const transitionStart = .2;
    const transitionEnd = clamp(.8 + (state.transitionDuration - 5) * .015, .72, .92);
    const nextRamp = state.ramp + delta / state.rampDuration;
    state.ramp = nextRamp >= 1 - 1e-10 ? 1 : nextRamp;
    state.transition = state.ramp <= transitionStart ? 0 : state.ramp >= transitionEnd ? 1 : (state.ramp - transitionStart) / (transitionEnd - transitionStart);
    state.transition = smoothstep(0, 1, state.transition);
    state.turbulence = smoothstep(0, .8, state.ramp) * (1 - smoothstep(.60, 1, state.ramp));
    state.motifTransition = state.motifAuto && nextMotif ? smoothstep(.2, state.motifMorphEnd, state.ramp) : 0;
    if (!previousTransition && state.transition > 0) setStatus(`CROSSFADE ${state.sequenceIndex + 1} → ${(state.sequenceIndex + 1) % state.sequence.length + 1}`);
    if (state.ramp >= 1) { carryLayoutPulse(); state.sequenceIndex = (state.sequenceIndex + 1) % state.sequence.length; image = sequenceImages[state.sequenceIndex]; cells = sample(image); updateRuleStatus(); nextCells = sample(sequenceImages[(state.sequenceIndex + 1) % state.sequence.length], (state.sequenceIndex + 1) % state.sequence.length); if (state.motifAuto && motifSequenceImages.length) { state.motifIndex = (state.motifIndex + 1) % state.motifSequence.length; motif = nextMotif; motifKey = nextMotifKey; nextMotif = motifSequenceImages[(state.motifIndex + 1) % state.motifSequence.length]; nextMotifKey = state.motifSequence[(state.motifIndex + 1) % state.motifSequence.length]; } state.transition = 0; state.motifTransition = 0; state.ramp = 0; state.turbulence = 0; write("ramp", "0%"); write("landmark", `${state.sequenceIndex + 1} / ${state.sequence.length}`); setStatus(`LANDMARK ${state.sequenceIndex + 1} / RAMP 0%`); return; }
    write("ramp", `${Math.round(state.ramp * 100)}%`); write("landmark", `${state.sequenceIndex + 1} / ${state.sequence.length}`);
  };
  const tintPools = new Map(); let preparedCells = []; const dirtyTintPages = new Set(); let tintFrame = 0;
  let loopPoses = null; let loopClosure = 0;
  const poseKeys = ["x", "y", "size", "alpha", "rotationCos", "rotationSin"];
  const capturePose = (pose) => Object.fromEntries(poseKeys.map((key) => [key, pose[key]]));
  const closePose = (pose, first) => { if (first) for (const key of poseKeys) pose[key] += (first[key] - pose[key]) * loopClosure; };
  const contrastLut = new Uint8Array(256); const projectionAlphaLut = new Uint8Array(256); const projectionGainLut = new Float64Array(256); const pigmentGainLut = new Float64Array(256); let lutContrast = 0; let atlasBoost = -1; let atlasProjection = -1;
  const tinted = (color, source = motif, sourceKey = motifKey, tileSize = 48) => {
    if (lutContrast !== state.contrast || atlasBoost !== state.brightnessBoost || atlasProjection !== state.projectionLift) {
      updateProjectionLuts(contrastLut, projectionAlphaLut, projectionGainLut, state.contrast, state.projectionLift);
      for (let value = 0; value < 256; value += 1) pigmentGainLut[value] = projectionPigmentGain([value, value, value], state.brightnessBoost, state.projectionLift);
      lutContrast = state.contrast;
      atlasBoost = state.brightnessBoost;
      atlasProjection = state.projectionLift;
      tintCache.clear();
      dirtyTintPages.clear();
      for (const pool of tintPools.values()) {
        pool.pageIndex = 0;
        for (const page of pool.pages) { page.used = 0; page.keys.length = 0; page.dirtyTop = 800; page.dirtyBottom = 0; }
      }
    }
    const gain = pigmentGainLut[Math.max(color[0], color[1], color[2])];
    const quantized = color.map((value) => clamp(Math.round(value * gain), 0, 255)); const key = `${sourceKey}|${quantized.join(",")}|${Math.round(state.surfaceVariation * 100)}|${tileSize}|${state.contrast}`; const cached = tintCache.get(key); if (cached) { cached.page.hits = (cached.page.frame === tintFrame ? cached.page.hits : 0) + 1; cached.page.frame = tintFrame; return cached; }
    let pool = tintPools.get(tileSize);
    if (!pool) {
      const work = document.createElement("canvas"); work.width = tileSize; work.height = tileSize;
      const workContext = work.getContext("2d", { willReadFrequently: true });
      const pixels = workContext.createImageData(tileSize, tileSize);
      pool = { context: workContext, pixels, words: new Uint32Array(pixels.data.buffer), materials: new WeakMap(), pages: [], pageIndex: 0, limit: tileSize <= 48 ? 16 : tileSize === 96 ? 4 : 2 };
      tintPools.set(tileSize, pool);
    }
    let material = pool.materials.get(source);
    if (!material) {
      pool.context.clearRect(0, 0, tileSize, tileSize); pool.context.drawImage(source, 0, 0, tileSize, tileSize);
      const original = pool.context.getImageData(0, 0, tileSize, tileSize); const tones = new Float64Array(tileSize * tileSize);
      for (let pixel = 0; pixel < tones.length; pixel += 1) {
        const x = (pixel % tileSize) * 47 / (tileSize - 1); const y = Math.floor(pixel / tileSize) * 47 / (tileSize - 1); const directional = ((x / 47) - .5) * .72 + ((y / 47) - .5) * .28; const region = hash(Math.floor(x / 6), Math.floor(y / 6), sourceKey.length + 17) - .5; const grain = hash(x, y, sourceKey.length + 31) - .5;
        tones[pixel] = directional * .72 + region * .2 + grain * .08;
      }
      const active = []; for (let index = 0; index < original.data.length; index += 4) if (original.data[index + 3]) active.push(index);
      material = { original, tones, active: new Uint32Array(active), factors: new Float64Array(active.length * 4), variation: -1 }; pool.materials.set(source, material);
    }
    if (material.variation !== state.surfaceVariation) {
      material.active.forEach((index, pixel) => {
        const tone = material.tones[index / 4] * state.surfaceVariation * 2.1;
        material.factors[pixel * 4] = tone; material.factors[pixel * 4 + 1] = 1 + tone * .34; material.factors[pixel * 4 + 2] = 1 + tone * .28; material.factors[pixel * 4 + 3] = 1 + tone * .2;
      });
      material.variation = state.surfaceVariation;
    }
    const pixels = pool.pixels; pixels.data.set(material.original.data); const pigmentWeight = .38 + .62 * smoothstep(-16, 16, quantized[0] - quantized[2]);
    for (let pixel = 0; pixel < material.active.length; pixel += 1) {
      const index = material.active[pixel]; const factor = pixel * 4; const paint = quantized; const pigment = material.factors[factor] * pigmentWeight * 18;
      pixels.data[index] = clamp(Math.round(paint[0] * material.factors[factor + 1] + pigment), 0, 255); pixels.data[index + 1] = clamp(Math.round(paint[1] * material.factors[factor + 2] + pigment * .3), 0, 255); pixels.data[index + 2] = clamp(Math.round(paint[2] * material.factors[factor + 3] - pigment * .22), 0, 255);
      if (state.contrast !== 1) {
        pixels.data[index] = contrastLut[pixels.data[index]];
        pixels.data[index + 1] = contrastLut[pixels.data[index + 1]];
        pixels.data[index + 2] = contrastLut[pixels.data[index + 2]];
      }
      if (state.projectionLift > 0) {
        applyProjectionColor(pixels.data, index, projectionGainLut, state.projectionLift);
        pixels.data[index + 3] = projectionAlphaLut[pixels.data[index + 3]];
      }
    }
    const stride = tileSize + 2; const columns = Math.floor(800 / stride); const capacity = columns * columns;
    let page = pool.pages[pool.pageIndex];
    if (!page || page.used === capacity) {
      if (page) {
        let available = -1;
        if (pool.pages.length >= pool.limit) for (let offset = 1; offset <= pool.pages.length; offset += 1) {
          const candidate = (pool.pageIndex + offset) % pool.pages.length;
          if (pool.pages[candidate].frame !== tintFrame) { available = candidate; break; }
        }
        pool.pageIndex = available < 0 ? pool.pages.length : available;
      }
      page = pool.pages[pool.pageIndex];
      if (page) {
        page.keys.forEach((oldKey) => { if (tintCache.get(oldKey)?.canvas === page.canvas) tintCache.delete(oldKey); });
        page.words.fill(0); page.used = 0; page.keys.length = 0; page.dirtyTop = 0; page.dirtyBottom = 800;
      } else {
        const atlas = document.createElement("canvas"); atlas.width = 800; atlas.height = 800;
        const atlasContext = atlas.getContext("2d"); const pixels = atlasContext.createImageData(800, 800);
        page = { canvas: atlas, context: atlasContext, pixels, words: new Uint32Array(pixels.data.buffer), dirtyTop: 800, dirtyBottom: 0, used: 0, keys: [] }; pool.pages[pool.pageIndex] = page;
      }
    }
    page.hits = (page.frame === tintFrame ? page.hits : 0) + 1; page.frame = tintFrame;
    const tile = { page, canvas: page.canvas, x: (page.used % columns) * stride + 1, y: Math.floor(page.used / columns) * stride + 1, size: tileSize };
    for (let row = 0; row < tileSize; row += 1) page.words.set(pool.words.subarray(row * tileSize, (row + 1) * tileSize), (tile.y + row) * 800 + tile.x);
    page.dirtyTop = Math.min(page.dirtyTop, tile.y); page.dirtyBottom = Math.max(page.dirtyBottom, tile.y + tileSize); dirtyTintPages.add(page);
    page.used += 1; page.keys.push(key); tintCache.set(key, tile); return tile;
  };
  let variationGrid = 0; let variationSeeds;
  const tileVariation = (index) => {
    if (variationGrid !== state.grid) {
      variationGrid = state.grid;
      variationSeeds = Float64Array.from({ length: state.grid * state.grid }, (_, i) => hash(i % state.grid, Math.floor(i / state.grid), 43) - .5);
    }
    return 1 + variationSeeds[index] * state.surfaceVariation * .55;
  };
  const selectMotif = (cell, index) => {
    if (state.motifLibrary === "main") return { source: motifPoolImages.get(cell.motifSrc) || motif, key: cell.motifSrc || motifKey };
    const sources = motifPoolSources();
    if (!sources.length) return { source: motif, key: motifKey };
    const position = state.motifArrangement === "luminance"
      ? clamp(cell.light, 0, .9999)
      : state.motifArrangement === "radial"
        ? (Math.atan2(cell.y - .5, cell.x - .5) / TAU + .5 + Math.hypot(cell.x - .5, cell.y - .5) * .72) % 1
        : hash(index % state.grid, Math.floor(index / state.grid), 31);
    const src = sources[Math.floor(position * sources.length) % sources.length];
    return { source: motifPoolImages.get(src) || motif, key: src };
  };
  const motion = (cell) => {
    const node = NODES[cell.group]; const distance = Math.hypot(cell.x - node.x, cell.y - node.y); const groupBeat = Math.sin(TAU * (state.time * node.rate + node.phase - distance * state.delay));
    const localBeat = Math.sin(TAU * (state.time * (.16 + cell.phase * .12) + cell.phase));
    if (state.mode === "nerve") { const wave = Math.sin(TAU * (state.time * .18 + cell.phase - distance * state.spread * 1.9)); return { value: wave * (.72 + state.cohesion * .28) + localBeat * state.turbulence * .12, dx: Math.cos(state.time * .4 + cell.phase) * wave * .05, dy: Math.sin(state.time * .35 + cell.phase) * wave * .05, rotation: wave * cell.spin * .22 }; }
    if (state.mode === "tide") { const wave = Math.sin(TAU * (state.time * .09 - cell.y * 1.7 + cell.x * .28)); return { value: wave * .8 + localBeat * .12, dx: wave * .1, dy: Math.cos(TAU * (state.time * .07 + cell.x)) * .07, rotation: wave * .12 }; }
    if (state.mode === "rotate") return { value: groupBeat * .35, dx: Math.cos(state.time * .2 + cell.phase) * .035, dy: Math.sin(state.time * .2 + cell.phase) * .035, rotation: state.time * cell.spin * (.25 + state.speed * .7) + cell.phase * state.delay * 4 };
    const flock = groupBeat * (.72 + state.cohesion * .28) + localBeat * state.turbulence * .18; return { value: flock, dx: (groupBeat * cell.drift + localBeat * .12) * state.turbulence * .12, dy: (groupBeat * (cell.phase - .5)) * state.turbulence * .12, rotation: cell.drift * state.turbulence * .18 };
  };
  let pulseFrameDelta = 1 / 60; let pulseValues = [];
  const applyTension = (move, cell) => {
    if (!state.tension || !state.turbulence) return;
    const delay = (cell.x * .65 + cell.y * .35) * state.delay * .6 + (cell.phase - .5) * (1 - state.cohesion) * .12;
    const cycle = state.time / 7.5 - delay;
    const whole = Math.floor(cycle); const phase = cycle - whole;
    const progress = phase < .36 ? .08 * smoothstep(0, .36, phase)
      : phase < .53 ? .08
        : phase < .73 ? .08 + .82 * smoothstep(.53, .73, phase)
          : .9 + .1 * smoothstep(.73, 1, phase);
    const flowTime = (whole + progress + delay) * 7.5;
    const bend = 1 + state.spread * 3;
    const flowX = Math.sin(flowTime * .7 + cell.y * bend) + .35 * Math.cos(flowTime * .31 - cell.x * 2);
    const flowY = Math.cos(flowTime * .53 + cell.x * bend) + .3 * Math.sin(flowTime * .37 + cell.y * 2);
    const amount = state.tension * smoothstep(0, .15, state.turbulence);
    move.dx += (flowX * .065 * state.turbulence - move.dx) * amount;
    move.dy += (flowY * .065 * state.turbulence - move.dy) * amount;
  };
  const motifPulse = (cell, index) => { const phase = cell.phase * (.35 + state.delay * .65) + state.motifIndex * .17; const target = 1 + Math.sin(TAU * (state.time * .46 + phase)) * state.pulse * .32; const previous = pulseValues[index] ?? target; const smoothing = 1 - Math.exp(-pulseFrameDelta / .22); const smoothed = previous + (target - previous) * smoothing; pulseValues[index] = smoothed; return smoothed; };
  // Approximate Trail-1% brightness without retaining frames; tint gain compensates for thin-edge coverage.
  const brightAlpha = (alpha) => { const boost = state.brightnessBoost; const fade = (1 - Math.min(boost, 1) * .8412) / (1 + Math.max(0, boost - 1)); return alpha / (fade + (1 - fade) * alpha); };
  const edgeFeather = createEdgeFeather();
  const exteriorInfill = createExteriorInfill();
  const frameCoverage = createFrameCoverage();
  const detailStatus = root.querySelector("[data-pattern-field-detail-status]");
  const gridFooter = root.querySelector('.pattern-field-stage-footer [data-pattern-field-output="grid"]');
  const countFooter = root.querySelector('.pattern-field-stage-footer [data-pattern-field-output="cells"]');
  const densityCounts = new WeakMap();
  const pigmentColor = (sourceColor) => {
    const fieldTint = state.field === "warm" ? [205, 135, 78] : state.field === "cool" ? [75, 140, 174] : state.field === "mono" ? [205, 198, 183] : sourceColor;
    return colorMix(colorMix(sourceColor, fieldTint, state.field === "source" ? 0 : .66), state.tint, state.colorMix);
  };
  const draw = () => {
    needsDraw = false; tintFrame += 1;
    if (!image || !motif || !cells.length) return; context.setTransform(dpr, 0, 0, dpr, 0, 0); context.fillStyle = state.trail ? `rgba(0,0,0,${.16 - state.trail * .12})` : "#000"; context.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    const detail = detailBlend(state.turbulence, state.landmarkDetail, state.autoSequence ? state.ramp : null);
    const sparseDensity = state.grid === 48 && state.landmarkLibrary === "main" && state.motifLibrary === "main" && state.landmarkDetail > 0;
    const scatterGrid = sparseDensity ? 40 : state.grid;
    const densityProgress = sparseDensity ? 1 - detailBlend(state.turbulence, 1, state.autoSequence ? state.ramp : null) : 0;
    const scatterSize = scatterMotifScale(densityProgress);
    const detailTileSize = canvas.width / state.grid <= 24 ? 24 : 48;
    const settledScale = state.grid / state.detailDensity;
    if (detailStatus && !exporting) {
      const displayed = state.transition === 1 && nextCells.length ? nextCells : cells;
      if (!densityCounts.has(displayed)) densityCounts.set(displayed, {
        detail: displayed.reduce((count, cell) => count + (cell.details?.length || 1), 0),
        scatter: displayed.reduce((count, cell) => count + Number(cell.scatterKeep), 0),
      });
      const counts = densityCounts.get(displayed);
      const detailCount = counts.detail;
      const scatterCount = sparseDensity ? counts.scatter : displayed.length;
      const text = `SCATTER ${scatterGrid}×${scatterGrid} DENSITY · DETAIL ${state.detailDensity}×${state.detailDensity} / ${Math.round(detail * 100)}% · ${scatterCount.toLocaleString()} → ${detailCount.toLocaleString()} MOTIFS${sparseDensity ? " · 해체 시 문양 추가 +20%" : ""}`;
      const infillNote = state.motifLibrary === "main" && detail > 0 ? " + EXTERIOR INFILL / 내부 여백 보호" : "";
      if (detailStatus.textContent !== text + infillNote) detailStatus.textContent = text + infillNote;
      const densityText = detail === 1 ? `${state.detailDensity} × ${state.detailDensity} DETAIL` : detail === 0 ? `${scatterGrid} × ${scatterGrid} ${sparseDensity ? "SCATTER DENSITY" : "BASE"}` : `${scatterGrid} → ${state.detailDensity} / ${Math.round(detail * 100)}%`;
      const countText = detail === 0 ? `${scatterCount.toLocaleString()} TARGET MOTIFS` : detail === 1 ? `${detailCount.toLocaleString()} MOTIFS` : `${scatterCount.toLocaleString()} ↔ ${detailCount.toLocaleString()} MOTIFS`;
      if (gridFooter.textContent !== densityText) gridFooter.textContent = densityText;
      if (countFooter.textContent !== countText + infillNote) countFooter.textContent = countText + infillNote;
    }
    const frameProgress = clamp(state.turbulence, 0, 1); const frameHeight = width + (height - width) * frameProgress; const frameTop = (height - frameHeight) / 2; const base = Math.min(width / state.grid, frameHeight / state.grid); layoutPairs().forEach(({ cell, target, entering, leaving }, index) => {
      const t = state.transition; const weight = entering ? t : leaving ? 1 - t : 1;
      const targetCell = t ? target : cell;
      const visual = t ? { ...cell, x: cell.x + (targetCell.x - cell.x) * t, y: cell.y + (targetCell.y - cell.y) * t, phase: cell.phase + (targetCell.phase - cell.phase) * t, color: colorMix(cell.color, targetCell.color, t), light: cell.light + (targetCell.light - cell.light) * t } : cell;
      const fromMotion = motion(cell); const toMotion = t ? motion(targetCell) : fromMotion;
      const move = t ? { value: fromMotion.value + (toMotion.value - fromMotion.value) * t, dx: fromMotion.dx + (toMotion.dx - fromMotion.dx) * t, dy: fromMotion.dy + (toMotion.dy - fromMotion.dy) * t, rotation: fromMotion.rotation + (toMotion.rotation - fromMotion.rotation) * t } : fromMotion; const brightness = clamp(.22 + visual.light * 1.03, .16, 1); const color = pigmentColor(visual.color); const size = base * cell.span * (.42 + state.scale * .72) * motifPulse(visual, entering ? state.grid * state.grid + target.index : cell.index) * (1 + move.value * .13); const alpha = brightAlpha(clamp(brightness * state.opacity * (tileVariation(cell.index) + (tileVariation(targetCell.index) - tileVariation(cell.index)) * t), .04, 1)) * weight; const selectedMotif = selectMotif(cell, cell.index); const targetMotif = (state.motifLibrary === "main" || state.motifMix !== "single") && t ? selectMotif(targetCell, targetCell.index) : null; const tileSize = Math.min(384, 48 * cell.span); const split = cell.span === 1 && cell.details && detail > 0 ? detail : 0; const tile = split ? null : tinted(color, selectedMotif.source, selectedMotif.key, tileSize);
      applyTension(move, visual);
      const prepared = preparedCells[index] || (preparedCells[index] = {});
      Object.assign(prepared, { tile, nextTile: !tile ? null : targetMotif ? tinted(color, targetMotif.source, targetMotif.key, tileSize) : state.motifLibrary === "sample" && state.motifMix === "single" && state.motifTransition > 0 && nextMotif ? tinted(color, nextMotif, nextMotifKey, tileSize) : null, tileMix: targetMotif ? t : state.motifLibrary === "main" ? 0 : state.motifTransition, size, alpha, split, rotationCos: Math.cos(move.rotation) * dpr, rotationSin: Math.sin(move.rotation) * dpr, x: (visual.x * width + move.dx * width) * dpr, y: (frameTop + (visual.y + move.dy) * frameHeight) * dpr });
      prepared.infillActive = Boolean(detail > 0 && cell.infill && state.motifLibrary === "main");
      prepared.infillSource = prepared.infillActive ? selectedMotif.source : null;
      prepared.infillTarget = prepared.infillActive ? targetMotif?.source : null;
      if (prepared.infillActive) {
        prepared.infill ||= [];
        prepared.infill.length = Math.max(cell.infill.length, targetCell.infill?.length || 0);
        for (let i = 0; i < prepared.infill.length; i += 1) {
          const from = cell.infill[i] || targetCell.infill[i], to = targetCell.infill?.[i] || from;
          const childWeight = !cell.infill[i] ? t : !targetCell.infill?.[i] ? 1 - t : 1;
          const child = prepared.infill[i] || (prepared.infill[i] = {});
          const seed = from.seed + (to.seed - from.seed) * t;
          detailPose(detail, seed, 1, child, state.time, from.timing, to.timing, t, from.seed, to.seed, settledScale);
          const light = from.light + (to.light - from.light) * t;
          const color = pigmentColor(t ? colorMix(from.color, to.color, t) : from.color);
          const childAlpha = brightAlpha(clamp(clamp(.22 + light * 1.03, .16, 1) * state.opacity, .04, 1)) * weight * child.visibility * .7 * childWeight;
          const source = motifPoolImages.get(from.motifSrc), destination = motifPoolImages.get(to.motifSrc);
          Object.assign(child, {
            tile: childAlpha > 0 && source ? tinted(color, source, from.motifSrc, detailTileSize) : null,
            nextTile: childAlpha > 0 && t && destination ? tinted(color, destination, to.motifSrc, detailTileSize) : null,
            alpha: childAlpha, size: base * (.42 + state.scale * .72) * (1 + child.pulse * state.pulse * .32) * child.scale,
            x: (from.x + (to.x - from.x) * t + child.dx) * width * dpr,
            y: (frameTop + (from.y + (to.y - from.y) * t + child.dy) * frameHeight) * dpr,
            rotationCos: Math.cos(child.rotation) * dpr, rotationSin: Math.sin(child.rotation) * dpr,
          });
        }
      }
      if (split) {
        prepared.children ||= [];
        prepared.children.length = Math.max(cell.details.length, targetCell.details?.length || 0);
        const variation = tileVariation(cell.index) + (tileVariation(targetCell.index) - tileVariation(cell.index)) * t;
        for (let quadrant = 0; quadrant < prepared.children.length; quadrant += 1) {
          const child = prepared.children[quadrant] || (prepared.children[quadrant] = {});
          const from = cell.details[quadrant] || targetCell.details[quadrant], to = targetCell.details?.[quadrant] || from;
          const childWeight = !cell.details[quadrant] ? t : !targetCell.details?.[quadrant] ? 1 - t : 1;
          const seed = from.seed + (to.seed - from.seed) * t;
          detailPose(split, seed, quadrant, child, state.time, from.timing, to.timing, t, from.seed, to.seed, settledScale);
          const sampledColor = t ? colorMix(from.color, to.color, t) : from.color;
          const childColor = pigmentColor(quadrant === 0 ? colorMix(visual.color, sampledColor, child.arrival) : sampledColor);
          const sampledLight = from.light + (to.light - from.light) * t;
          const light = quadrant === 0 ? visual.light + (sampledLight - visual.light) * child.arrival : sampledLight;
          const ownVariation = 1 + (seed - .5) * state.surfaceVariation * .55;
          const childVariation = quadrant === 0 ? variation + (ownVariation - variation) * child.arrival : ownVariation;
          const childAlpha = brightAlpha(clamp(clamp(.22 + light * 1.03, .16, 1) * state.opacity * childVariation, .04, 1)) * weight * child.visibility * childWeight;
          const spriteSize = quadrant === 0 ? tileSize : detailTileSize;
          const inherited = quadrant === 0 ? 1 - child.arrival : 0;
          const ownSize = base * (.42 + state.scale * .72) * (1 + child.pulse * state.pulse * .32);
          const rotation = move.rotation * inherited + child.rotation;
          Object.assign(child, {
            tile: childAlpha > 0 ? tinted(childColor, selectedMotif.source, selectedMotif.key, spriteSize) : null,
            nextTile: childAlpha <= 0 ? null : targetMotif ? tinted(childColor, targetMotif.source, targetMotif.key, spriteSize) : state.motifLibrary === "sample" && state.motifMix === "single" && state.motifTransition > 0 && nextMotif ? tinted(childColor, nextMotif, nextMotifKey, spriteSize) : null,
            alpha: childAlpha, size: (size * inherited + ownSize * (1 - inherited)) * child.scale,
            x: (visual.x + move.dx * inherited + child.dx + (from.offsetX + (to.offsetX - from.offsetX) * t) * child.offset) * width * dpr,
            y: (frameTop + (visual.y + move.dy * inherited + child.dy + (from.offsetY + (to.offsetY - from.offsetY) * t) * child.offset) * frameHeight) * dpr,
            rotationCos: Math.cos(rotation) * dpr, rotationSin: Math.sin(rotation) * dpr,
          });
        }
      }
      if (densityProgress > 0 && cell.span === 1) {
        const fromFade = smoothstep(.15 + cell.phase * .15, .75 + cell.phase * .15, densityProgress);
        const toFade = smoothstep(.15 + targetCell.phase * .15, .75 + targetCell.phase * .15, densityProgress);
        const fade = fromFade + (toFade - fromFade) * t;
        const fromOpacity = cell.scatterKeep ? 1 : 1 - fromFade;
        const toOpacity = targetCell.scatterKeep ? 1 : 1 - toFade;
        const pose = prepared.split ? prepared.children[0] : prepared;
        pose.alpha *= fromOpacity + (toOpacity - fromOpacity) * t;
        pose.size *= 1 + .12 * fade;
      }
      if (scatterSize !== 1) {
        prepared.size *= scatterSize;
        if (prepared.split) for (const child of prepared.children) child.size *= scatterSize;
        if (prepared.infillActive) for (const child of prepared.infill) child.size *= scatterSize;
      }
    });
    preparedCells.length = sizePairs.length;
    const scatterScale = 1 + .20 * smoothstep(.08, .65, state.turbulence);
    const forming = state.autoSequence && state.ramp > .60;
    if (scatterScale > 1 || forming) {
      const centerX = width * dpr / 2, centerY = height * dpr / 2;
      const outward = smoothstep(0, .8, state.ramp);
      const spreadPosition = (pose, seed) => {
        const turbulence = forming ? outward * (1 - smoothstep(.60 + seed * .08, .92 + seed * .08, state.ramp)) : state.turbulence;
        const scale = forming ? 1 + .20 * smoothstep(.08, .65, turbulence) : scatterScale;
        const frameRatio = forming ? (width + (height - width) * turbulence) / frameHeight : 1;
        pose.x = centerX + (pose.x - centerX) * scale;
        pose.y = centerY + (pose.y - centerY) * scale * frameRatio;
      };
      for (let index = 0; index < preparedCells.length; index += 1) {
        const prepared = preparedCells[index], target = sizePairs[index].target;
        spreadPosition(prepared, target.phase);
        if (prepared.split) prepared.children.forEach((child, quadrant) => spreadPosition(child, target.details?.[quadrant]?.seed ?? target.phase));
        if (prepared.infillActive) prepared.infill.forEach((child, i) => spreadPosition(child, target.infill?.[i]?.seed ?? target.phase));
      }
    }
    if (loopClosure && loopPoses) preparedCells.forEach((prepared, index) => {
      const pair = sizePairs[index];
      const first = !pair.leaving && loopPoses.get(pair.target.index);
      if (!first || pair.target.span !== first.span) return;
      closePose(prepared, first);
      if (prepared.split) prepared.children.forEach((child, quadrant) => closePose(child, first.children?.[quadrant]));
      if (prepared.infillActive) prepared.infill.forEach((child, i) => closePose(child, first.infill?.[i]));
    });
    // Upload each changed atlas once, after preparing every tile and before drawing any of them.
    for (const page of dirtyTintPages) {
      page.context.putImageData(page.pixels, 0, 0, 0, page.dirtyTop, 800, page.dirtyBottom - page.dirtyTop);
      page.dirtyTop = 800; page.dirtyBottom = 0;
    }
    dirtyTintPages.clear();
    context = frameCoverage.begin(context, canvas.width, canvas.height, state.projectionLift, state.trail);
    const paintTile = (tile, nextTile, mix, size, alpha, x = 0, y = 0) => {
      if (!tile || alpha <= 0) return;
      if (nextTile) {
        context.globalAlpha = alpha * (1 - mix); context.drawImage(tile.canvas, tile.x, tile.y, tile.size, tile.size, x - size / 2, y - size / 2, size, size);
        context.globalAlpha = alpha * mix; context.drawImage(nextTile.canvas, nextTile.x, nextTile.y, nextTile.size, nextTile.size, x - size / 2, y - size / 2, size, size);
      } else { context.globalAlpha = alpha; context.drawImage(tile.canvas, tile.x, tile.y, tile.size, tile.size, x - size / 2, y - size / 2, size, size); }
    };
    const paintDetail = (child, mix) => {
      if (!child.tile || child.alpha <= 0) return;
      context.setTransform(child.rotationCos, child.rotationSin, -child.rotationSin, child.rotationCos, child.x, child.y);
      paintTile(child.tile, child.nextTile, mix, child.size, child.alpha);
    };
    for (const prepared of preparedCells) if (prepared.split) {
      for (let quadrant = prepared.children.length - 1; quadrant >= 1; quadrant -= 1) paintDetail(prepared.children[quadrant], prepared.tileMix);
    }
    if (detail > 0 && state.motifLibrary === "main") {
      exteriorInfill.begin(canvas.width, canvas.height);
      for (const prepared of preparedCells) if (prepared.infillActive) for (const child of prepared.infill) exteriorInfill.paint(child, prepared.tileMix);
      for (const prepared of preparedCells) if (prepared.infillActive) exteriorInfill.protect(prepared);
      exteriorInfill.composite(context);
    }
    preparedCells.forEach(({ tile, nextTile, tileMix, size, alpha, rotationCos, rotationSin, x, y, split, children }) => {
      context.setTransform(rotationCos, rotationSin, -rotationSin, rotationCos, x, y);
      paintTile(tile, nextTile, tileMix, size, alpha);
      if (split) paintDetail(children[0], tileMix);
    });
    context = frameCoverage.finish();
    context.globalAlpha = 1;
    edgeFeather(context, canvas.width, canvas.height, state.edgeFeather);
    // Overflow pages are reusable frame scratch, not additional long-lived cache entries.
    for (const pool of tintPools.values()) {
      if (pool.pages.length > pool.limit) {
        const current = pool.pages[pool.pageIndex];
        pool.pages.sort((a, b) => (b.frame === tintFrame ? b.hits : 0) - (a.frame === tintFrame ? a.hits : 0));
        pool.pageIndex = pool.pages.indexOf(current);
      }
      for (let index = pool.limit; index < pool.pages.length; index += 1) {
        const page = pool.pages[index]; if (!page.used) continue;
        page.keys.forEach((key) => { if (tintCache.get(key)?.canvas === page.canvas) tintCache.delete(key); });
        page.words.fill(0); page.used = 0; page.keys.length = 0; page.frame = -1; page.dirtyTop = 0; page.dirtyBottom = 800;
      }
      if (pool.pageIndex >= pool.limit) pool.pageIndex = 0;
    }
  };
  const updateOutput = () => {
    const profile = OUTPUT_PROFILES[state.outputProfile];
    root.querySelector("[data-pattern-field-resolution]").value = state.outputProfile;
    write("outputFrame", `${profile.width} × ${profile.height} px`);
    write("outputFps", `${OUTPUT_FPS} fps`);
    write("outputBitrate", `${profile.bitrate / 1000000} Mbps`);
    write("outputSummary", `${profile.label} · ${profile.width} × ${profile.height} px · ${OUTPUT_FPS} fps`);
  };
  const resize = () => {
    if (exporting || disposed) return;
    const rect = stage.getBoundingClientRect(); width = Math.max(1, rect.width); height = width * 5 / 4;
    const profile = OUTPUT_PROFILES[state.outputProfile]; dpr = profile.artworkWidth / width;
    if (canvas.width !== profile.artworkWidth || canvas.height !== profile.height) { canvas.width = profile.artworkWidth; canvas.height = profile.height; }
    updateOutput(); draw();
  };
  const setImage = async (src, file, isMotif) => { const next = await loadAsset(src); if (isMotif) { state.motifLibrary = "sample"; updateMotifLibrary(); motif = next; motifKey = src; nextMotif = null; nextMotifKey = ""; state.motifAuto = false; state.motifTransition = 0; state.motifMix = "single"; updateMotifCycle(); updateMotifMix(); tintCache.clear(); if (motifUrl) URL.revokeObjectURL(motifUrl); motifUrl = file ? src : ""; } else { image = next; cells = sample(image, -1); nextCells = []; state.autoSequence = false; state.transition = 0; state.ramp = 0; state.turbulence = state.manualTurbulence; if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = file ? src : ""; updateAutoButton(); } setStatus(isMotif ? "MOTIF READY" : "IMAGE READY / AUTO SEQUENCE OFF"); draw(); };
  const setPreset = async (button) => { root.querySelectorAll("[data-pattern-field-motif]").forEach((item) => { const selected = item === button; item.classList.toggle("is-selected", selected); item.setAttribute("aria-pressed", String(selected)); }); await setImage(button.dataset.patternFieldSrc, null, true); };
  const randomize = () => { state.mode = ["flock", "nerve", "tide", "rotate"][Math.floor(Math.random() * 4)]; root.querySelector("[data-pattern-field-mode]").value = state.mode; ["scale", "pulse", "cohesion", "delay", "turbulence", "spread", "trail"].forEach((key) => { state[key] = key === "scale" ? .3 + Math.random() * .7 : .18 + Math.random() * .7; const input = root.querySelector(`[data-pattern-field-control="${key}"]`); if (input) input.value = Math.round(state[key] * 100); write(key, `${Math.round(state[key] * 100)}%`); }); setStatus("NEW CHOREOGRAPHY"); };
  const reset = async () => { sound.rewind(); root.querySelector("[data-pattern-field-detail-density]").value = String(DEFAULT_DETAIL_DENSITY); setDefaults("main", "evening"); state.landmarkLibrary = "main"; state.landmarkMode = "evening"; librarySelect.value = "main"; updateLandmarkMode(); setStatus("LOADING RESET"); Object.assign(state, { grid: 48, outputProfile: "fhd", scale: 1, sizeCounts: { 2: 40, 3: 10, 4: 0 }, sizeSeed: 1, tension: 0, pulse: .07, opacity: 1, brightnessBoost: 3, toneMatch: 1, edgeFeather: .06, landmarkDetail: 1, detailDensity: DEFAULT_DETAIL_DENSITY, contrast: 1.15, projectionLift: .65, speed: 1, cohesion: .72, delay: .42, turbulence: 0, manualTurbulence: .24, spread: .7, colorMix: .08, surfaceVariation: .26, trail: 0, mode: "flock", field: "source", time: 0, autoSequence: true, ramp: 0, rampDuration: 30, transitionDuration: 5, transition: 0, sequenceIndex: 0, sequence: [...defaultSequence], motifLibrary: "main", motifMix: "single", motifArrangement: "balanced" }); resetMotifState(); if (imageUrl) { URL.revokeObjectURL(imageUrl); imageUrl = ""; } try { await Promise.all([loadSequence(), loadMotifSequence(), loadMotifPool()]); } catch { setStatus("RESET / ASSET LOAD ERROR"); return; } const values = { grid: "48 × 48", scale: "100%", tension: "0%", pulse: "7%", opacity: "100%", brightnessBoost: "300%", toneMatch: "100%", edgeFeather: "6%", landmarkDetail: "100%", contrast: "115%", projectionLift: "65%", speed: "1.00×", rampDuration: "30s", transitionDuration: "5s", motifMorphEnd: "55%", cohesion: "72%", delay: "42%", turbulence: "24%", spread: "70%", colorMix: "8%", surfaceVariation: "26%", trail: "0%" }; root.querySelectorAll("[data-pattern-field-control]").forEach((input) => { const key = input.dataset.patternFieldControl; input.value = key === "grid" ? 48 : key === "opacity" ? 100 : key === "edgeFeather" ? 6 : key === "landmarkDetail" ? 100 : key === "toneMatch" ? 100 : key === "brightnessBoost" ? 300 : key === "contrast" ? 115 : key === "projectionLift" ? 65 : key === "speed" ? 100 : key === "scale" ? 100 : key === "pulse" ? 7 : key === "rampDuration" ? 30 : key === "transitionDuration" ? 5 : key === "motifMorphEnd" ? 55 : key === "cohesion" ? 72 : key === "delay" ? 42 : key === "turbulence" ? 24 : key === "spread" ? 70 : key === "colorMix" ? 8 : key === "surfaceVariation" ? 26 : 0; write(key, values[key]); }); renderLandmarkSequence(); root.querySelector("[data-pattern-field-mode]").value = "flock"; root.querySelector("[data-pattern-field-field]").value = "source"; updateMotifMix(); write("ramp", "0%"); write("landmark", `1 / ${defaultSequence.length}`); updateAutoButton(); updateMotifLibrary(); resampleSizes(); tintCache.clear(); resize(); setStatus("RESET / FIELD READY"); };
  let libraryChangeRevision = 0;
  const reloadLandmarks = async () => {
    const revision = ++libraryChangeRevision;
    state.sequenceIndex = 0; state.ramp = 0; state.transition = 0; state.turbulence = 0;
    state.autoSequence = true; state.motifIndex = 0; state.motifTransition = 0;
    closeLandmarkPickers(); hideLandmarkPreview();
    renderLandmarkSequence(); updateLandmarkMode(); updateAutoButton();
    write("landmark", `1 / ${state.sequence.length}`); write("ramp", "0%");
    setStatus("LOADING LANDMARKS");
    try {
      await Promise.all([loadSequence(), state.motifAuto ? loadMotifSequence() : Promise.resolve()]);
      if (revision !== libraryChangeRevision || disposed) return;
      tintCache.clear(); draw(); setStatus(`${state.landmarkLibrary.toUpperCase()} / ${state.landmarkMode === "day" ? "DAY" : "NIGHT"} READY`);
    } catch { if (revision === libraryChangeRevision) setStatus("SEQUENCE ASSET ERROR"); }
  };
  const switchLandmarkMode = async (mode) => {
    if (mode === state.landmarkMode) return;
    state.sequence = state.sequence.map((src) => landmarkSrc(src, mode));
    state.landmarkMode = mode;
    setDefaults(state.landmarkLibrary, mode);
    await reloadLandmarks();
  };
  const switchLandmarkLibrary = async (library) => {
    if (!LIBRARIES[library] || library === state.landmarkLibrary) return;
    state.landmarkLibrary = library;
    setDefaults(library, state.landmarkMode);
    state.sequence = [...defaultSequence];
    resetMotifState();
    await reloadLandmarks();
  };
  const bind = () => {
    motifLibrarySelect.addEventListener("change", async () => {
      state.motifLibrary = motifLibrarySelect.value;
      state.motifMix = "single"; state.motifTransition = 0;
      if (state.motifLibrary === "main") { state.motifAuto = true; updateMotifCycle(); }
      updateMotifLibrary(); updateMotifMix(); resampleSizes(); tintCache.clear();
      setStatus("LOADING MOTIF SET");
      try { await loadMotifPool(); resampleSizes(); draw(); setStatus(`MOTIF SET / ${state.motifLibrary.toUpperCase()}`); }
      catch { setStatus("MOTIF SET ASSET ERROR"); }
    });
    root.querySelector("[data-pattern-field-resolution]").addEventListener("change", (event) => { state.outputProfile = event.target.value; resize(); });
    root.querySelector("[data-pattern-field-detail-density]").addEventListener("change", (event) => {
      state.detailDensity = detailDensity(event.target.value);
      resampleSizes(); preparedCells = []; draw();
    });
    root.querySelectorAll("[data-pattern-field-size-count]").forEach((input) => {
      const update = (event) => {
        if (event.type === "input" && input.value === "") return;
        const value = Number(input.value); const span = Number(input.dataset.patternFieldSizeCount);
        state.sizeCounts[span] = Number.isFinite(value) ? clamp(Math.floor(value), 0, Math.floor(state.grid / span) ** 2) : 0;
        resampleSizes(); draw();
      };
      input.addEventListener("input", update); input.addEventListener("change", update);
    });
    root.querySelector("[data-pattern-field-size-shuffle]")?.addEventListener("click", () => { state.sizeSeed += 1; resampleSizes(); draw(); setStatus("SIZE LAYOUT / RESHUFFLED"); });
    landmarkModeButtons.forEach((button) => button.addEventListener("click", () => switchLandmarkMode(button.dataset.patternFieldLandmarkMode)));
    librarySelect.addEventListener("change", (event) => switchLandmarkLibrary(event.target.value));
    root.querySelectorAll("[data-pattern-field-control]").forEach((input) => input.addEventListener("input", () => { const key = input.dataset.patternFieldControl; state[key] = Number(input.value) / (key === "opacity" ? 100 : 100); if (key === "grid") { state.grid = Number(input.value); resampleSizes(); } if (key === "toneMatch" || key === "landmarkDetail") resampleSizes(); if (key === "turbulence") state.manualTurbulence = state[key]; if (key === "rampDuration") state.rampDuration = Number(input.value); if (key === "transitionDuration") state.transitionDuration = Number(input.value); write(key, key === "grid" ? `${state.grid} × ${state.grid}` : key === "speed" ? `${(Number(input.value) / 100).toFixed(2)}×` : key === "rampDuration" || key === "transitionDuration" ? `${input.value}s` : `${input.value}%`); draw(); }));
    root.querySelector("[data-pattern-field-mode]").addEventListener("change", (event) => { state.mode = event.target.value; setStatus(`${state.mode.toUpperCase()} / LIVE`); }); root.querySelector("[data-pattern-field-field]").addEventListener("change", (event) => { state.field = event.target.value; tintCache.clear(); draw(); });
    motifSequenceList?.addEventListener("change", async (event) => { const select = event.target.closest("[data-pattern-field-motif-sequence]"); if (!select) return; const index = Number(select.dataset.patternFieldMotifSequence); state.motifSequence[index] = select.value; state.motifIndex = 0; state.motifTransition = 0; if (state.motifAuto) { setStatus("LOADING MOTIF CYCLE"); try { await loadMotifSequence(); setStatus("MOTIF CYCLE READY"); } catch { state.motifAuto = false; updateMotifCycle(); setStatus("MOTIF ASSET ERROR"); } } });
    root.querySelector("[data-pattern-field-motif-cycle]")?.addEventListener("change", async (event) => { state.motifAuto = event.target.value === "cycle"; state.motifIndex = 0; state.motifTransition = 0; if (state.motifAuto) { try { await loadMotifSequence(); } catch { state.motifAuto = false; } } updateMotifCycle(); setStatus(state.motifAuto ? "MOTIF MORPH / READY" : "MOTIF FIXED / SELECTED"); });
    motifMixSelect?.addEventListener("change", async (event) => { state.motifMix = event.target.value; state.motifTransition = 0; tintCache.clear(); setStatus(state.motifMix === "single" ? "MOTIF SINGLE / SELECTED" : `MOTIF MIX / ${state.motifMix.toUpperCase()}`); try { await loadMotifPool(); draw(); } catch { setStatus("MOTIF MIX ASSET ERROR"); } });
    motifArrangementSelect?.addEventListener("change", (event) => { state.motifArrangement = event.target.value; tintCache.clear(); draw(); setStatus(`MOTIF ARRANGEMENT / ${state.motifArrangement.toUpperCase()}`); });
    landmarkSequenceList?.addEventListener("change", async (event) => { const select = event.target.closest("[data-pattern-field-sequence]"); if (!select) return; const index = Number(select.dataset.patternFieldSequence); const label = select.selectedOptions[0]?.textContent || `Landmark ${index + 1}`; const row = select.closest(".pattern-field-sequence-row--landmark"); const preview = row?.querySelector("[data-pattern-field-sequence-preview]"); const picker = select.closest("[data-pattern-field-sequence-picker]"); if (preview) { preview.src = select.value; preview.alt = label; } picker?.querySelector("[data-pattern-field-sequence-trigger-label]")?.replaceChildren(document.createTextNode(label)); picker?.querySelectorAll("[data-pattern-field-sequence-option]").forEach((option) => option.setAttribute("aria-selected", String(option.dataset.patternFieldSequenceOption === select.value))); state.sequence[index] = select.value; state.ramp = 0; state.transition = 0; state.turbulence = 0; state.sequenceIndex = 0; state.autoSequence = true; updateAutoButton(); setStatus("LOADING SEQUENCE"); try { await loadSequence(); write("ramp", "0%"); write("landmark", `${state.sequenceIndex + 1} / ${state.sequence.length}`); setStatus("SEQUENCE READY / RAMP 0%"); } catch { setStatus("SEQUENCE ASSET ERROR"); } });
    landmarkSequenceList?.addEventListener("click", (event) => { const trigger = event.target.closest("[data-pattern-field-sequence-trigger]"); if (trigger) { const picker = trigger.closest("[data-pattern-field-sequence-picker]"); if (!picker) return; const open = picker.classList.contains("is-open"); closeLandmarkPickers(picker); picker.classList.toggle("is-open", !open); trigger.setAttribute("aria-expanded", String(!open)); const select = picker.querySelector("[data-pattern-field-sequence]"); const selected = select?.selectedOptions[0]; if (!open && selected) showLandmarkPreview(select.value, selected.textContent); return; } const option = event.target.closest("[data-pattern-field-sequence-option]"); if (!option) return; event.preventDefault(); const picker = option.closest("[data-pattern-field-sequence-picker]"); const select = picker?.querySelector("[data-pattern-field-sequence]"); if (select) { select.value = option.dataset.patternFieldSequenceOption; select.dispatchEvent(new Event("change", { bubbles: true })); } closeLandmarkPickers(); });
    landmarkSequenceList?.addEventListener("pointerover", (event) => { const option = event.target.closest("[data-pattern-field-sequence-option]"); if (option) { showLandmarkPreview(option.dataset.patternFieldSequenceOption, option.dataset.patternFieldSequenceLabel); return; } const trigger = event.target.closest("[data-pattern-field-sequence-trigger]"); if (trigger) { const select = trigger.closest("[data-pattern-field-sequence-picker]")?.querySelector("[data-pattern-field-sequence]"); const selected = select?.selectedOptions[0]; if (selected) showLandmarkPreview(select.value, selected.textContent); } });
    landmarkSequenceList?.addEventListener("pointerout", (event) => { if (!event.relatedTarget?.closest?.("[data-pattern-field-sequence-picker]")) hideLandmarkPreview(); });
    landmarkSequenceList?.addEventListener("focusin", (event) => { const option = event.target.closest("[data-pattern-field-sequence-option]"); if (option) showLandmarkPreview(option.dataset.patternFieldSequenceOption, option.dataset.patternFieldSequenceLabel); });
    landmarkSequenceList?.addEventListener("wheel", (event) => { const options = event.target.closest(".pattern-field-sequence-options"); if (!options || options.scrollHeight <= options.clientHeight || event.deltaY === 0) return; event.preventDefault(); event.stopPropagation(); options.scrollTop = clamp(options.scrollTop + event.deltaY, 0, options.scrollHeight - options.clientHeight); }, { passive: false });
    root.querySelector("[data-pattern-field-motif-add]")?.addEventListener("click", async () => { if (state.motifSequence.length >= maxSequenceLength) return; const index = state.motifSequence.length; state.motifSequence.push(defaultMotifSequence[index % defaultMotifSequence.length]); state.motifIndex = 0; state.motifTransition = 0; renderMotifSequence(); if (state.motifAuto) { await loadMotifSequence(); } });
    root.querySelector("[data-pattern-field-motif-remove]")?.addEventListener("click", async () => { if (state.motifSequence.length <= 1) return; state.motifSequence.pop(); state.motifIndex = 0; state.motifTransition = 0; renderMotifSequence(); if (state.motifAuto) { await loadMotifSequence(); } });
    root.querySelector("[data-pattern-field-sequence-add]")?.addEventListener("click", async () => { if (state.sequence.length >= maxSequenceLength) return; state.sequence.push(defaultSequence[state.sequence.length % defaultSequence.length]); state.sequenceIndex = 0; state.ramp = 0; state.transition = 0; state.turbulence = 0; state.autoSequence = true; renderLandmarkSequence(); updateAutoButton(); write("landmark", `1 / ${state.sequence.length}`); setStatus("LOADING SEQUENCE"); try { await loadSequence(); setStatus("SEQUENCE READY / RAMP 0%"); } catch { setStatus("SEQUENCE ASSET ERROR"); } });
    root.querySelector("[data-pattern-field-sequence-remove]")?.addEventListener("click", async () => { if (state.sequence.length <= 1) return; state.sequence.pop(); state.sequenceIndex = 0; state.ramp = 0; state.transition = 0; state.turbulence = 0; state.autoSequence = true; renderLandmarkSequence(); updateAutoButton(); write("landmark", `1 / ${state.sequence.length}`); setStatus("LOADING SEQUENCE"); try { await loadSequence(); setStatus("SEQUENCE READY / RAMP 0%"); } catch { setStatus("SEQUENCE ASSET ERROR"); } });
    root.querySelector("[data-pattern-field-auto]")?.addEventListener("click", async () => { state.autoSequence = !state.autoSequence; state.ramp = 0; state.transition = 0; state.turbulence = state.autoSequence ? 0 : state.manualTurbulence; if (state.autoSequence) { try { await loadSequence(); } catch { state.autoSequence = false; setStatus("SEQUENCE ASSET ERROR"); } } updateAutoButton(); setStatus(state.autoSequence ? "AUTO SEQUENCE / RAMP 0%" : "MANUAL TURBULENCE"); });
    controlPanel?.addEventListener("wheel", (event) => { if (event.deltaY === 0 || controlPanel.scrollHeight <= controlPanel.clientHeight || (event.target.closest("input[type=range]"))) return; event.preventDefault(); controlPanel.scrollTop = clamp(controlPanel.scrollTop + event.deltaY, 0, controlPanel.scrollHeight - controlPanel.clientHeight); }, { passive: false });
    document.addEventListener("click", closePickerOnDocumentClick);
    root.querySelector("[data-pattern-field-play]").addEventListener("click", () => { setPlaying(!state.playing); sound.update(previewActive()); });
    const fullscreenButton = root.querySelector("[data-pattern-field-fullscreen]");
    const setFullscreenFallback = (active) => { root.classList.toggle("is-fullscreen-fallback", active); fullscreenButton?.setAttribute("aria-pressed", String(active)); };
    fullscreenButton?.addEventListener("click", async () => {
      if (document.fullscreenElement) { await document.exitFullscreen?.(); return; }
      if (typeof root.requestFullscreen === "function") { try { await root.requestFullscreen(); } catch { setFullscreenFallback(true); } } else setFullscreenFallback(!root.classList.contains("is-fullscreen-fallback"));
    });
    const onFullscreenChange = () => setFullscreenFallback(false);
    const onFullscreenEscape = (event) => { if (event.key === "Escape") setFullscreenFallback(false); };
    document.addEventListener("fullscreenchange", onFullscreenChange); document.addEventListener("keydown", onFullscreenEscape);
    disposeFullscreen = () => { document.removeEventListener("fullscreenchange", onFullscreenChange); document.removeEventListener("keydown", onFullscreenEscape); };
    root.querySelector("[data-pattern-field-random]").addEventListener("click", randomize); root.querySelector("[data-pattern-field-reset]").addEventListener("click", reset);
    root.querySelector("[data-pattern-field-motif-upload]").addEventListener("click", () => motifInput.click());
    motifInput.addEventListener("change", () => { const file = motifInput.files?.[0]; if (file) setImage(URL.createObjectURL(file), file, true); });
    root.querySelectorAll("[data-pattern-field-motif]").forEach((button) => button.addEventListener("click", () => setPreset(button)));
    root.querySelectorAll("[data-pattern-field-tint]").forEach((button) => button.addEventListener("click", () => { const hex = button.dataset.patternFieldTint.match(/\w{2}/g).map((v) => Number.parseInt(v, 16)); state.tint = hex; tintCache.clear(); draw(); }));
  };
  const setPlaying = (playing) => { state.playing = playing; const button = root.querySelector("[data-pattern-field-play]"); button.textContent = playing ? "PAUSE" : "PLAY"; button.setAttribute("aria-pressed", String(playing)); setStatus(playing ? "LIVE / PLAYING" : "PAUSED / STILL"); };
  const previewActive = () => state.playing && !exporting && !disposed && !sequenceLoading && !motifLoading && pendingAssets === 0 && !document.hidden;
  const rewindPreview = () => {
    state.time = 0; state.ramp = 0; state.transition = 0; state.motifTransition = 0; state.sequenceIndex = 0; state.motifIndex = 0;
    state.turbulence = state.autoSequence ? 0 : state.manualTurbulence;
    if (state.autoSequence) { image = sequenceImages[0]; cells = sample(image); nextCells = sample(sequenceImages[1 % sequenceImages.length], 1 % sequenceImages.length); }
    if (state.motifAuto) { motif = motifSequenceImages[0]; nextMotif = motifSequenceImages[1 % motifSequenceImages.length]; motifKey = state.motifSequence[0]; nextMotifKey = state.motifSequence[1 % state.motifSequence.length]; }
    pulseValues = []; last = performance.now(); frameElapsed = 0; updateRuleStatus(); draw();
  };
  const sound = mountPatternSound(root, { play: () => setPlaying(true), active: previewActive, restart: rewindPreview });
  let frameElapsed = 0;
  const loop = (now) => {
    sound.update(previewActive());
    frameElapsed += Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    const step = 1 / OUTPUT_FPS;
    if (frameElapsed + 1e-6 >= step) {
      const delta = Math.floor((frameElapsed + 1e-6) / step) * step; frameElapsed = Math.max(0, frameElapsed - delta); pulseFrameDelta = delta;
      if (previewActive()) { state.time += delta * state.speed; advanceSequence(delta); draw(); }
      else if (needsDraw && !exporting && !disposed && !document.hidden && !sequenceLoading && !motifLoading && pendingAssets === 0) draw();
    }
    raf = requestAnimationFrame(loop);
  };
  const closePickerOnDocumentClick = (event) => { if (!event.target.closest?.("[data-pattern-field-sequence-picker]")) closeLandmarkPickers(); };
  videoExport = mountVideoExport(root, {
    config: () => ({ ...OUTPUT_PROFILES[state.outputProfile], fps: OUTPUT_FPS, library: state.landmarkLibrary.toUpperCase(), mode: state.landmarkMode === "day" ? "DAY" : "NIGHT", soundtrack: sound.selection(), autoSequence: state.autoSequence, scenes: state.sequence.length, cycleSeconds: state.sequence.length * state.rampDuration, assetError: internalStatus.includes("ERROR"), assetsReady: pendingAssets === 0 && !sequenceLoading && !motifLoading && !/^LOADING|^LANDMARKS \/ (DAY|EVENING)$|ERROR/.test(internalStatus) }),
    begin: (fromStart, { seamless = false, length, frames } = {}) => {
      exporting = true; sound.update(false); cancelAnimationFrame(raf); closeLandmarkPickers(); hideLandmarkPreview();
      const saved = { state: structuredClone(state), canvas, context, width, height, dpr, image, motif, nextMotif, motifKey, nextMotifKey, cells, nextCells, pulseValues, pulseFrameDelta, preparedCells, status: internalStatus };
      preparedCells = []; loopPoses = null; loopClosure = 0;
      canvas = document.createElement("canvas");
      const profile = OUTPUT_PROFILES[state.outputProfile]; canvas.width = profile.width; canvas.height = profile.height;
      context = canvas.getContext("2d"); width = profile.width; height = profile.height; dpr = 1;
      if (fromStart) {
        state.time = 0; state.ramp = 0; state.transition = 0; state.motifTransition = 0; state.sequenceIndex = 0; state.motifIndex = 0;
        state.turbulence = state.autoSequence ? 0 : state.manualTurbulence;
        if (state.autoSequence) { image = sequenceImages[0]; cells = sample(image); nextCells = sample(sequenceImages[1 % sequenceImages.length], 1 % sequenceImages.length); }
        if (state.motifAuto) { motif = motifSequenceImages[0]; nextMotif = motifSequenceImages[1 % motifSequenceImages.length]; motifKey = state.motifSequence[0]; nextMotifKey = state.motifSequence[1 % state.motifSequence.length]; }
        pulseValues = [];
      } else {
        context.drawImage(saved.canvas, 0, 0, width, height); pulseValues = [...saved.pulseValues];
      }
      pulseFrameDelta = 1 / OUTPUT_FPS;
      let elapsed = 0; let firstFrame;
      return {
        canvas, soundtrack: sound.exportTrack(fromStart),
        render: (frame) => {
          if (seamless && frame === frames - 1) {
            context.setTransform(1, 0, 0, 1, 0, 0); context.globalAlpha = 1;
            context.globalCompositeOperation = "copy"; context.drawImage(firstFrame, 0, 0); context.globalCompositeOperation = "source-over";
            return;
          }
          if (frame > 0) {
            const nextElapsed = seamless ? frame * length / (frames - 1) : frame / OUTPUT_FPS;
            let delta = nextElapsed - elapsed;
            state.time += delta * state.speed; pulseFrameDelta = delta;
            while (delta > 1e-10) {
              const step = state.autoSequence ? Math.min(delta, (1 - state.ramp) * state.rampDuration) : delta;
              advanceSequence(step); delta -= step;
            }
            elapsed = nextElapsed;
          }
          loopClosure = seamless ? smoothstep(length - 2, length, elapsed) : 0;
          draw();
          if (seamless && frame === 0) {
            firstFrame = document.createElement("canvas"); firstFrame.width = canvas.width; firstFrame.height = canvas.height;
            firstFrame.getContext("2d").drawImage(canvas, 0, 0);
            loopPoses = new Map(preparedCells.map((prepared, index) => [sizePairs[index].cell.index, { ...capturePose(prepared), span: sizePairs[index].cell.span, children: prepared.split ? prepared.children.map(capturePose) : null, infill: prepared.infillActive ? prepared.infill.map(capturePose) : null }]));
          }
        },
        restore: () => {
          canvas.width = 1; canvas.height = 1;
          if (firstFrame) firstFrame.width = firstFrame.height = 1;
          loopPoses = null; loopClosure = 0;
          Object.assign(state, saved.state);
          ({ canvas, context, width, height, dpr, image, motif, nextMotif, motifKey, nextMotifKey, cells, nextCells, pulseValues, pulseFrameDelta, preparedCells } = saved);
          exporting = false;
          if (!disposed) { write("ramp", `${Math.round(state.ramp * 100)}%`); write("landmark", `${state.sequenceIndex + 1} / ${state.sequence.length}`); updateSizeCounts(); updateRuleStatus(); setStatus(saved.status); last = performance.now(); frameElapsed = 0; resize(); raf = requestAnimationFrame(loop); }
        },
      };
    },
  });
  renderMotifSequence(); renderLandmarkSequence(); updateLandmarkMode(); updateMotifLibrary();
  const observer = new ResizeObserver(resize); observer.observe(stage); bind();
  Promise.all([loadSequence(), loadMotifSequence(), loadMotifPool()]).then(() => { resampleSizes(); resize(); videoExport.ready(); root.querySelector("[data-pattern-field-sound]").disabled = false; root.querySelector("[data-pattern-field-sound-restart]").disabled = false; root.querySelector("[data-pattern-field-sound-version]").disabled = false; root.querySelector("[data-pattern-field-detail-density]").disabled = false; setStatus(reducedMotion.matches ? "REDUCED MOTION / STILL" : "LIVE / FLOCK READY"); }).catch(() => setStatus("ASSET LOAD ERROR"));
  if (reducedMotion.matches) setPlaying(false); raf = requestAnimationFrame(loop);
  return () => { disposed = true; frameCoverage.dispose(); exteriorInfill.dispose(); sound.dispose(); videoExport.dispose(); disposeFullscreen(); for (const pool of tintPools.values()) for (const page of pool.pages) { page.canvas.width = 1; page.canvas.height = 1; } tintCache.clear(); tintPools.clear(); dirtyTintPages.clear(); preparedCells.length = 0; cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener("click", closePickerOnDocumentClick); if (imageUrl) URL.revokeObjectURL(imageUrl); if (motifUrl) URL.revokeObjectURL(motifUrl); };
};

let disposePatternField = () => {};
const renderPatternField = () => { disposePatternField(); disposePatternField = mountPatternField(document.querySelector("[data-pattern-field]")); };
document.addEventListener("arendered:rendered", renderPatternField);
renderPatternField();
