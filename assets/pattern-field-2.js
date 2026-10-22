import { TECHNIQUES, PARAMETERS, EXPRESSIONS, PARAM_DEFAULTS, PRESETS, createSimulation, displacement, recolor } from "./pattern-field-2-techniques.js?v=20260908-relief-1";
import { registanDepth, drawRelief } from "./pattern-field-2-relief.js?v=20260908-1";

const LANDMARKS = [
  ["registan", "레기스탄", "Registan", "Samarkand_Registan", "Samarkand_9"],
  ["gwanghwamun", "광화문", "Gwanghwamun", "Korea_Gwanghwamun", "Korea_9"],
  ["gur-e-amir", "구르 아미르", "Gur-e Amir", "Samarkand_Gur-e-Amir", "Samarkand_14"],
  ["hwaseong", "화성", "Hwaseong", "Korea_Hwaseong", "Korea_12"],
  ["shah-i-zinda", "샤히진다", "Shah-i-Zinda", "Samarkand_Shah-i-Zinda", "Samarkand_13"],
  ["changdeokgung", "창덕궁", "Changdeokgung", "Korea_Changdeokgung", "Korea_7"],
  ["bibi-khanym", "비비하눔", "Bibi-Khanym", "Samarkand_Bibi-Khanym", "Samarkand_8"],
  ["bulguksa", "불국사", "Bulguksa", "Korea_Bulguksa", "Korea_5"],
  ["ulugh-beg", "울루그베크 천문대", "Ulugh Beg", "Samarkand_Ulugh-Beg", "Samarkand_2"],
  ["sungnyemun", "숭례문", "Sungnyemun", "Korea_Sungnyemun", "Korea_10"],
];
const KOREA = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14].map(n => `Korea_${n}`);
const SAMARKAND = [1, 2, "3-2", 5, 6, 8, 9, 10, 12, 13, 14].map(n => `Samarkand_${n}`);
const MOTIFS = [...KOREA, ...SAMARKAND];
const DEFAULTS = { ...PARAM_DEFAULTS, scene: 0, version: "night", motif: "auto", mode: "flow", grid: 48, formation: 60, strength: 80, speed: 65, scale: 100, pulse: 12, seed: 1, auto: false, pointer: false, symmetry: "none", palette: "source" };
const RANGES = [
  ["formation", "형태 유지", "FORMATION", 0, 100, "%"],
  ["strength", "흐름의 세기", "STRENGTH", 0, 100, "%"],
  ["speed", "움직임 속도", "SPEED", 0, 150, "%"],
  ["grid", "그리드 밀도", "GRID DENSITY", 16, 64, "grid"],
  ["scale", "문양 크기", "MOTIF SCALE", 40, 140, "%"],
  ["pulse", "수축 · 팽창", "PULSE", 0, 60, "%"],
];
const MODES = TECHNIQUES.map(row => row[0]);
const ALL_RANGES = [...RANGES, ...PARAMETERS, ...EXPRESSIONS];
const COLOR_KEYS = ["brightness", "saturation", "paletteMix"];
const motifPath = key => `assets/mosaic/motifs/${key === "Samarkand_1" ? "samarkand-pattern-01" : key === "Samarkand_2" ? "samarkand-pattern-02" : key}.png`;
const scenePath = (scene, version) => version === "night"
  ? `assets/mosaic/landmarks/evening/${LANDMARKS[scene][3]}_evening.png?v=20260908-sky-clean-1`
  : scene === 1 ? "assets/mosaic/palace-source-2026-08-27.png"
    : `assets/mosaic/landmarks/flat/landmark-${LANDMARKS[scene][0]}-flat.webp`;
let libraryPromise;

function loadP5() {
  if (!libraryPromise) libraryPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "assets/vendor/p5-2.3.3.min.js";
    script.onload = () => resolve(window.p5);
    script.onerror = () => { libraryPromise = undefined; script.remove(); reject(new Error("p5.js load failed")); };
    document.head.append(script);
  });
  return libraryPromise;
}

export function mountPatternField2(root) {
  const ko = document.documentElement.lang === "ko";
  const text = (kr, en) => ko ? kr : en;
  const state = { ...DEFAULTS };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const life = new AbortController();
  const listen = (node, event, fn) => node.addEventListener(event, fn, { signal: life.signal });
  const descriptions = Object.fromEntries(TECHNIQUES.map(row => [row[0], text(row[3], row[4])]));
  const format = (key, suffix) => suffix === "grid" ? `${state[key]} × ${state[key]}` : `${state[key]}${suffix}`;
  const range = ([key, kr, en, min, max, suffix, step = key === "grid" ? 4 : 1, , modes]) => `<label class="pattern-field-range" ${modes ? `data-lab-for="${modes}"` : ""}><span><span>${text(kr, en)}</span><output data-lab-output="${key}">${format(key, suffix)}</output></span><input data-lab-range="${key}" type="range" min="${min}" max="${max}" value="${state[key]}" step="${step}" aria-label="${text(kr, en)}"></label>`;
  root.innerHTML = `
    <section class="pattern-field-stage-panel" aria-label="${text("작품 미리보기", "Artwork preview")}">
      <div class="pattern-field-stage" data-lab-stage></div>
      <footer class="pattern-field-stage-footer"><div>
        <button class="pattern-field-play" data-lab-play type="button" disabled>PLAY</button>
        <button class="pattern-field-quiet-button" data-lab-full type="button">FULLSCREEN</button>
      </div><span><output data-lab-stats>p5.js / LOADING</output><small data-lab-frame>1080 × 1350 px</small></span></footer>
    </section>
    <button class="pattern-field-quiet-button lab-exit" data-lab-exit type="button">${text("전체 화면 나가기", "EXIT FULLSCREEN")}</button>
    <aside class="pattern-field-control-panel" aria-label="${text("패턴 필드 2 실험 컨트롤", "Pattern Field 2 controls")}">
      <header class="pattern-field-control-header"><a href="#home">ARENDERED</a><a href="#pattern-field">${text("원래 패턴필드 ↗", "ORIGINAL FIELD ↗")}</a></header>
      <section class="pattern-field-control-section"><h1>PATTERN FIELD 2</h1><p class="pattern-field-size-hint">p5.js / MOTION LAB</p>
        <p class="pattern-field-size-hint lab-hint">${text("문양의 움직임을 실험하는 별도 작업실입니다. 기존 패턴필드의 설정에는 영향을 주지 않습니다.", "A separate studio for movement experiments. Your original Pattern Field stays unchanged.")}</p>
        <p class="pattern-field-size-hint lab-status" data-lab-status role="status">${text("문양과 p5.js를 불러오는 중…", "Loading motifs and p5.js…")}</p>
        <button class="pattern-field-quiet-button" data-lab-retry type="button" hidden>${text("다시 시도", "RETRY")}</button>
      </section>
      <fieldset data-lab-controls disabled><legend class="sr-only">${text("표현 실험 설정", "Experiment settings")}</legend>
      <section class="pattern-field-control-section"><div class="pattern-field-section-heading"><span>01</span><div><h2>${text("움직임 실험", "EXPERIMENT")}</h2></div></div>
        <label class="pattern-field-select-label"><span>${text("빠른 시작 · 프리셋", "QUICK START / PRESET")}</span><select data-lab-preset><option value="">${text("직접 조절", "CUSTOM")}</option>${Object.keys(PRESETS).map((key, i) => `<option value="${key}">${text(["고요한 호흡", "잉크 같은 흐름", "접히는 풍경", "빛의 매듭", "씨앗의 나선", "문양의 군집", "자라나는 산호", "레기스탄 · 입체 문양"][i], key.toUpperCase())}</option>`).join("")}</select></label>
        <div class="lab-presets" role="group" aria-label="${text("움직임 실험", "Movement experiments")}">${TECHNIQUES.map(([mode, kr, en], i) => `<button class="pattern-field-quiet-button" type="button" data-lab-mode="${mode}" aria-pressed="${i === 0}">${text(kr, en)}</button>`).join("")}</div>
        <p class="pattern-field-size-hint" data-lab-description>${descriptions.flow}</p>
        <div data-lab-relief-actions hidden><div class="lab-presets"><button class="pattern-field-quiet-button" type="button" data-lab-assemble>${text("풍경으로 모으기", "FORM LANDMARK")}</button><button class="pattern-field-quiet-button" type="button" data-lab-scatter>${text("나선 구체로 흩뜨리기", "RELEASE SPHERE")}</button></div><button class="pattern-field-quiet-button" type="button" data-lab-front>${text("정면 시점 · 카메라 고정", "FRONT VIEW / FIX CAMERA")}</button><p class="pattern-field-size-hint lab-hint" data-lab-density-hint>${text("이 모드의 장소는 레기스탄으로 고정됩니다. 밀도 96 × 96 = 문양 9,216개. 모바일은 64 또는 80부터 권장합니다.", "This depth study is specific to Registan. 96 × 96 = 9,216 motifs. Start at 64 or 80 on mobile.")}</p></div>
        <div class="lab-technique-ranges">${PARAMETERS.map(range).join("")}</div>
        <button class="pattern-field-quiet-button" data-lab-restart type="button">${text("현재 기법 처음부터", "RESTART TECHNIQUE")}</button>
        <label class="lab-check"><input type="checkbox" data-lab-auto>${text("자동으로 모이고 흩어지기", "AUTO FORM / RELEASE")}</label>
        <label class="lab-check"><input type="checkbox" data-lab-pointer>${text("마우스 · 터치로 문양 밀어내기", "POINTER / TOUCH DISTURBANCE")}</label>
      </section>
      <section class="pattern-field-control-section pattern-field-control-section--ranges">${RANGES.map(range).join("")}<p class="pattern-field-size-hint">${text("형태 유지 100%에서는 풍경으로 모입니다. 입체 모드는 시점에 따라 투영 비율이 달라지며, 나머지 모드는 중앙 1:1로 모입니다. 값을 낮추면 흩어집니다.", "100% formation assembles the landscape. Relief is perspective-projected; other modes form a central square. Lower the value to release the motifs.")}</p></section>
      <details class="pattern-field-control-section lab-details"><summary>${text("02 / 표현 · 색 · 상호작용", "02 / EXPRESSION · COLOR · INTERACTION")}</summary>
        <label class="pattern-field-select-label"><span>${text("흐름장의 대칭", "MOTION FIELD SYMMETRY")}</span><select data-lab-symmetry><option value="none">${text("없음", "NONE")}</option><option value="mirror">${text("좌우 거울", "MIRROR X")}</option><option value="quad">${text("상하좌우 거울", "MIRROR X + Y")}</option></select></label>
        <p class="pattern-field-size-hint">${text("대칭은 흐름장에 적용되며 풍경 자체를 복제하지 않습니다. 나선·군집·반응–확산은 고유 구조를 사용합니다.", "Symmetry mirrors the motion field, not the source image. Spiral, flocking and reaction–diffusion use their own structures.")}</p>
        <label class="pattern-field-select-label"><span>${text("색상 팔레트", "COLOR PALETTE")}</span><select data-lab-palette><option value="source">${text("원본 색상", "SOURCE")}</option><option value="twilight">${text("보라 · 분홍", "TWILIGHT")}</option><option value="mineral">${text("청록 · 황토", "MINERAL")}</option><option value="mono">${text("따뜻한 모노톤", "WARM MONO")}</option></select></label>
        ${EXPRESSIONS.map(range).join("")}
        <p class="pattern-field-size-hint">${text("밝기와 잔상은 별개입니다. 잔상 0%는 매 프레임 깨끗하게 그립니다. 반응·군집은 느린 기기에서 그리드를 낮춰 실험하세요.", "Brightness is independent of trails. At 0% trail, every frame is clean. Try a lower grid for simulations on slower devices.")}</p>
      </details>
      <section class="pattern-field-control-section"><div class="pattern-field-section-heading"><span>03</span><div><h2>${text("풍경과 문양", "SOURCE / MOTIF")}</h2></div></div>
        <label class="pattern-field-select-label"><span>${text("장소", "LANDMARK")}</span><select data-lab-scene>${LANDMARKS.map((s, i) => `<option value="${i}">${String(i + 1).padStart(2, "0")} / ${s[ko ? 1 : 2]}</option>`).join("")}</select></label>
        <label class="pattern-field-select-label"><span>${text("낮 · 밤", "DAY / NIGHT")}</span><select data-lab-version><option value="night">NIGHT</option><option value="day">DAY</option></select></label>
        <img class="lab-preview" data-lab-preview alt="${text("선택한 장소의 원본 이미지", "Selected landmark source")}">
        <label class="pattern-field-select-label"><span>${text("문양 선택", "MOTIF")}</span><select data-lab-motif><option value="auto">${text("장소별 추천 문양", "CURATED / SCENE")}</option><option value="korea">KOREA / MIX</option><option value="samarkand">SAMARKAND / MIX</option><option value="all">KOREA + SAMARKAND / MIX</option>${MOTIFS.map(key => `<option value="${key}">${key}</option>`).join("")}</select></label>
      </section>
      <p class="pattern-field-size-hint lab-seed">SEED <output data-lab-seed-value>1</output></p>
      <footer class="pattern-field-actions"><button data-lab-seed type="button">${text("새 흐름", "NEW SEED")}</button><button data-lab-reset type="button">RESET</button><button data-lab-png type="button">SAVE PNG</button></footer>
      </fieldset><section class="pattern-field-control-section"><p class="pattern-field-size-hint">${text("이 페이지는 실시간 표현 실험용입니다. PNG는 현재 프레임을 저장하며, MP4 출력은 원래 패턴필드에서 사용하세요.", "Live preview experiments. PNG saves this frame; MP4 production remains in the original Pattern Field.")}</p></section>
      <details class="pattern-field-control-section lab-details"><summary>${text("기법 리서치 · 참고", "TECHNIQUE REFERENCES")}</summary><p class="pattern-field-size-hint">${text("아래 자료의 원리를 문양 기반 p5.js 2D 실험으로 구현했습니다. 다른 작가의 작품이나 코드를 복제한 것은 아닙니다.", "Principles adapted into original motif-based p5.js 2D experiments, not reproductions of the referenced artworks.")}</p><ul class="lab-references"><li><a href="https://www.tylerxhobbs.com/words/flow-fields" target="_blank" rel="noopener">Tyler Hobbs / Flow Fields ↗</a></li><li><a href="https://thebookofshaders.com/13/" target="_blank" rel="noopener">The Book of Shaders / fBm & Domain Warping ↗</a></li><li><a href="https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf" target="_blank" rel="noopener">Bridson et al. / Curl-Noise ↗</a></li><li><a href="https://natureofcode.com/autonomous-agents/" target="_blank" rel="noopener">The Nature of Code / Flocking ↗</a></li><li><a href="https://www.karlsims.com/rd.html" target="_blank" rel="noopener">Karl Sims / Reaction–Diffusion ↗</a></li><li><a href="https://thecodingtrain.com/challenges/116-lissajous-curve-table" target="_blank" rel="noopener">The Coding Train / Lissajous ↗</a></li><li><a href="https://thecodingtrain.com/challenges/lang/all/topic/phyllotaxis/" target="_blank" rel="noopener">The Coding Train / Phyllotaxis ↗</a></li></ul></details>
    </aside>`;
  const get = name => root.querySelector(`[data-lab-${name}]`);
  let disposed = false;
  let instance;
  let ready = false;
  let playing = !reducedMotion.matches;
  let time = 0;
  let elapsed = 0;
  let formation = state.formation / 100;
  let revision = 0;
  let current;
  let previous;
  let blend = 1;
  let measuredFps = null;
  let fpsStarted = performance.now();
  let fpsFrames = 0;
  let modeWeights = MODES.map((_, i) => Number(i === 0));
  let simulation;
  let simulationKey;
  let clearFrame = true;
  let pointer;
  let pointerActive = false;
  const images = new Map();
  const masks = new Map();
  const release = field => field?.atlases.forEach(atlas => atlas.remove());
  const status = message => { get("status").textContent = message; };
  const density = () => state.mode === "relief" ? state.reliefGrid : state.grid;
  const densityLabel = () => `${density()} × ${density()}${state.mode === "relief" ? ` / ${(density() ** 2).toLocaleString()} MOTIFS` : ""}`;
  const updatePlay = () => {
    fpsStarted = performance.now(); fpsFrames = 0; measuredFps = null;
    get("play").textContent = playing ? "PAUSE" : "PLAY";
    get("play").setAttribute("aria-pressed", String(playing));
    get("stats").textContent = `${densityLabel()} / ${playing ? "RUNNING" : "PAUSED"}`;
  };
  const updateControls = () => {
    ALL_RANGES.forEach(([key, , , , , suffix]) => {
      root.querySelector(`[data-lab-range="${key}"]`).value = state[key];
      root.querySelector(`[data-lab-output="${key}"]`).textContent = format(key, suffix);
    });
    root.querySelectorAll("[data-lab-for]").forEach(label => { label.hidden = !label.dataset.labFor.split(" ").includes(state.mode); });
    get("symmetry").value = state.symmetry;
    get("symmetry").disabled = ["boids", "reaction", "phyllotaxis", "relief"].includes(state.mode);
    get("relief-actions").hidden = state.mode !== "relief";
    get("density-hint").textContent = text(
      `레기스탄 전용 · ${state.reliefGrid} × ${state.reliefGrid} = 문양 ${(state.reliefGrid ** 2).toLocaleString()}개. ${state.reliefGrid > 112 ? "고밀도에서는 재생이 느려질 수 있습니다. 정지 화면으로 디테일을 비교해보세요." : "모바일은 밀도 64 또는 80부터 실험해보세요."}`,
      `Registan only · ${state.reliefGrid} × ${state.reliefGrid} = ${(state.reliefGrid ** 2).toLocaleString()} motifs. ${state.reliefGrid > 112 ? "High density may slow playback. Pause to compare detail." : "Try density 64 or 80 on mobile."}`,
    );
    get("scene").disabled = state.mode === "relief";
    root.querySelector('[data-lab-range="grid"]').closest("label").hidden = state.mode === "relief";
    get("palette").value = state.palette;
    get("seed-value").textContent = state.seed;
    get("scene").value = state.scene;
    get("version").value = state.version;
    get("motif").value = state.motif;
    get("auto").checked = state.auto;
    get("pointer").checked = state.pointer;
    get("stage").classList.toggle("is-interactive", state.pointer);
    root.querySelectorAll("[data-lab-mode]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.labMode === state.mode)));
    get("description").textContent = descriptions[state.mode];
  };

  async function fetchImage(p, src) {
    if (!images.has(src)) images.set(src, p.loadImage(src).catch(error => { images.delete(src); throw error; }));
    return images.get(src);
  }

  function buildField(p, source) {
    const grid = density();
    const sample = p.createGraphics(grid, grid);
    sample.pixelDensity(1);
    const ratio = source.width / source.height;
    const sw = ratio > 1 ? grid * ratio : grid;
    const sh = ratio > 1 ? grid : grid / ratio;
    sample.image(source, (grid - sw) / 2, (grid - sh) / 2, sw, sh);
    sample.loadPixels();
    const pool = state.motif === "all" ? MOTIFS : state.motif === "korea" ? KOREA : state.motif === "samarkand" ? SAMARKAND : [state.motif === "auto" ? LANDMARKS[state.scene][4] : state.motif];
    const field = { cells: [], atlases: [], relief: state.mode === "relief", projected: [] };
    const cache = new Map();
    const tile = 48, stride = 50, columns = 20, capacity = columns * columns;
    p.randomSeed(state.seed);
    for (let i = 0; i < grid * grid; i++) {
      const key = pool[Math.floor(p.random(pool.length))];
      const rgb = recolor([0, 1, 2].map(channel => Math.min(255, Math.round(sample.pixels[i * 4 + channel] / 12) * 12)), state);
      const cacheKey = `${key}/${rgb.join(",")}`;
      let sprite = cache.get(cacheKey);
      if (!sprite) {
        const index = cache.size;
        const page = Math.floor(index / capacity);
        if (!field.atlases[page]) {
          const atlas = p.createGraphics(columns * stride, columns * stride);
          atlas.pixelDensity(1);
          field.atlases.push(atlas);
        }
        const atlas = field.atlases[page];
        const sx = (index % columns) * stride + 1;
        const sy = Math.floor((index % capacity) / columns) * stride + 1;
        const ctx = atlas.drawingContext;
        ctx.save();
        ctx.beginPath(); ctx.rect(sx, sy, tile, tile); ctx.clip();
        ctx.drawImage(masks.get(key).canvas, sx, sy, tile, tile);
        ctx.globalCompositeOperation = "source-in";
        ctx.fillStyle = `rgb(${rgb.join(",")})`; ctx.fillRect(sx, sy, tile, tile);
        ctx.restore();
        sprite = { atlas, sx, sy, tile };
        cache.set(cacheKey, sprite);
      }
      const u = (i % grid + .5) / grid, v = (Math.floor(i / grid) + .5) / grid;
      field.cells.push({ u, v, phase: p.random(Math.PI * 2), sprite, depth: field.relief ? registanDepth(u, v) : undefined });
      if (field.relief) field.projected.push({ index: i, x: 0, y: 0, z: 0, scale: 1, alpha: 1 });
    }
    sample.remove();
    return field;
  }

  async function rebuild(p) {
    const ticket = ++revision;
    const src = scenePath(state.scene, state.version);
    status(text("풍경을 읽는 중…", "Reading the landscape…"));
    try {
      const source = await fetchImage(p, src);
      if (disposed || ticket !== revision) return;
      const next = buildField(p, source);
      release(previous);
      if (current?.cells.length === next.cells.length && current.relief === next.relief && playing) { previous = current; blend = 0; }
      else { release(current); previous = undefined; blend = 1; }
      current = next;
      const key = `${state.grid}/${state.seed}`;
      if (!next.relief && simulationKey !== key) { simulation = createSimulation(state.grid, state.seed); simulation.warm(state); simulationKey = key; }
      clearFrame = true;
      get("preview").src = src;
      get("controls").disabled = false;
      get("play").disabled = false;
      ready = true;
      root.dataset.ready = "true";
      get("retry").hidden = true;
      status(text("준비 완료 · 값을 바꾸며 실험해보세요.", "Ready · adjust the controls to explore."));
      if (playing && !p.isLooping()) p.loop();
      else if (!playing) p.redraw();
    } catch (error) {
      if (disposed || ticket !== revision) return;
      status(text("이미지를 불러오지 못했습니다. 다른 장소를 선택하거나 다시 시도해주세요.", "Image load failed. Select another source or retry."));
      get("retry").hidden = false;
      console.error("Pattern Field 2 asset:", error);
    }
  }

  function drawField(p, field, alpha) {
    if (!field || alpha <= 0) return;
    if (field.relief) {
      drawRelief(p, field, alpha, formation, time, elapsed, state, state.pointer && pointerActive ? { x: pointer.x / p.width, y: pointer.y / p.width } : null);
      return;
    }
    const free = 1 - formation;
    const amplitude = free * state.strength / 100;
    const cellSize = p.width / Math.sqrt(field.cells.length) * state.scale / 100;
    const pointerX = pointer.x / p.width;
    const pointerY = pointer.y / p.width;
    const active = modeWeights.map((weight, i) => ({ weight, mode: MODES[i] })).filter(item => item.weight > .001);
    for (let i = 0; i < field.cells.length; i++) {
      const cell = field.cells[i];
      let dx = 0, dy = 0, sizeFactor = 1;
      for (const { mode, weight } of active) {
        const d = displacement(mode, cell, i, field.cells.length, time, state, p.noise, simulation);
        dx += d.dx * weight; dy += d.dy * weight; sizeFactor += (d.size - 1) * weight * free;
      }
      let px = cell.u + amplitude * dx;
      let py = .125 + cell.v + amplitude * dy;
      if (state.pointer && pointerActive) {
        const dx = px - pointerX, dy = py - pointerY;
        const distance = Math.hypot(dx, dy);
        const force = Math.max(0, 1 - distance / (state.pointerRadius / 100)) ** 2 * state.pointerForce / 100;
        if (distance > .001) { px += dx / distance * force; py += dy / distance * force; }
      }
      const pulse = 1 + Math.sin(elapsed * Math.PI * 2 * state.pulseRate + cell.phase * (1 - state.pulseSync / 100)) * state.pulse / 100 * .5;
      const variation = 1 + Math.sin(cell.phase * 7.31) * state.variation / 100;
      const size = cellSize * pulse * variation * sizeFactor;
      const inset = size / p.width / 2;
      px = p.constrain(px, inset, 1 - inset);
      py = p.constrain(py, inset, 1.25 - inset);
      const rotation = dy * 6 * amplitude * state.rotation / 100;
      const sprite = cell.sprite;
      p.push();
      p.translate(px * p.width, py * p.width); p.rotate(rotation);
      p.drawingContext.globalAlpha = alpha;
      p.image(sprite.atlas, -size / 2, -size / 2, size, size, sprite.sx, sprite.sy, sprite.tile, sprite.tile);
      p.pop();
    }
  }

  function attach(p) {
    const restart = () => {
      time = 0; elapsed = 0; clearFrame = true;
      if (state.mode !== "relief") { simulation = createSimulation(state.grid, state.seed); simulation.warm(state); simulationKey = `${state.grid}/${state.seed}`; }
      p.noiseSeed(state.seed);
      if (!playing) p.redraw();
    };
    listen(get("restart"), "click", restart);
    for (const [control, value] of [["assemble", 100], ["scatter", 0]]) listen(get(control), "click", () => {
      state.formation = value; state.auto = false; get("preset").value = ""; updateControls();
      if (!playing) { formation = value / 100; clearFrame = true; p.redraw(); }
    });
    listen(get("front"), "click", () => {
      state.reliefYaw = 0; state.reliefPitch = 0; state.reliefOrbit = 0;
      get("preset").value = ""; clearFrame = true; updateControls(); if (!playing) p.redraw();
    });
    listen(get("preset"), "change", () => {
      const preset = PRESETS[get("preset").value];
      if (!preset) return;
      const { scene, version, motif, grid, seed } = state;
      Object.assign(state, DEFAULTS, { scene, version, motif, grid, seed }, preset);
      formation = state.formation / 100; modeWeights = MODES.map(mode => Number(mode === state.mode));
      pointerActive = false; restart(); updateControls(); rebuild(p);
    });
    listen(get("play"), "click", () => { playing = !playing; updatePlay(); if (playing) p.loop(); else p.noLoop(); });
    root.querySelectorAll("[data-lab-mode]").forEach(button => listen(button, "click", () => {
      const wasRelief = state.mode === "relief";
      state.mode = button.dataset.labMode; get("preset").value = ""; clearFrame = true; updateControls();
      if (state.mode === "relief") {
        Object.assign(state, PRESETS.registan); formation = state.formation / 100;
        modeWeights = MODES.map(mode => Number(mode === state.mode)); time = 0; elapsed = 0; updateControls();
      }
      if (wasRelief || state.mode === "relief") rebuild(p);
      if (!playing) { modeWeights = MODES.map(mode => Number(mode === state.mode)); p.redraw(); }
    }));
    root.querySelectorAll("[data-lab-range]").forEach(input => listen(input, "input", () => {
      const key = input.dataset.labRange;
      state[key] = Number(input.value);
      get("preset").value = ""; clearFrame = true;
      if (key === "formation") state.auto = false;
      updateControls();
      if (key === "grid" || key === "reliefGrid" || COLOR_KEYS.includes(key)) rebuild(p);
      else if (!playing) { formation = state.formation / 100; p.redraw(); }
    }));
    ["scene", "version", "motif"].forEach(key => listen(get(key), "change", () => { state[key] = key === "scene" ? Number(get(key).value) : get(key).value; rebuild(p); }));
    ["symmetry", "palette"].forEach(key => listen(get(key), "change", () => {
      state[key] = get(key).value; get("preset").value = ""; clearFrame = true;
      if (key === "palette") rebuild(p); else if (!playing) p.redraw();
    }));
    listen(get("auto"), "change", () => { state.auto = get("auto").checked; });
    listen(get("pointer"), "change", () => { state.pointer = get("pointer").checked; pointerActive = false; updateControls(); if (!playing) p.redraw(); });
    const movePointer = event => {
      if (!state.pointer) return;
      const bounds = get("stage").getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * p.width, (event.clientY - bounds.top) / bounds.height * p.height);
      pointerActive = true;
      if (!playing) p.redraw();
    };
    listen(get("stage"), "pointermove", movePointer);
    listen(get("stage"), "pointerdown", movePointer);
    listen(get("stage"), "pointercancel", () => { pointerActive = false; if (!playing) p.redraw(); });
    listen(get("stage"), "pointerleave", () => { pointerActive = false; if (!playing) p.redraw(); });
    listen(get("stage"), "pointerup", event => { if (event.pointerType !== "mouse") { pointerActive = false; if (!playing) p.redraw(); } });
    listen(get("seed"), "click", () => { state.seed++; time = 0; elapsed = 0; p.noiseSeed(state.seed); updateControls(); rebuild(p); });
    listen(get("reset"), "click", () => {
      Object.assign(state, DEFAULTS); time = 0; elapsed = 0; formation = state.formation / 100; modeWeights = MODES.map((_, i) => Number(i === 0));
      simulationKey = undefined; get("preset").value = "";
      pointerActive = false; p.noiseSeed(state.seed); updateControls(); rebuild(p);
    });
    listen(get("png"), "click", () => { p.saveCanvas(`PatternField2_${state.mode}_${LANDMARKS[state.scene][0]}_${state.version}`, "png"); });
    listen(get("retry"), "click", () => { get("retry").hidden = true; rebuild(p); });
    listen(reducedMotion, "change", () => { if (reducedMotion.matches) { playing = false; updatePlay(); p.noLoop(); } });
    listen(document, "visibilitychange", () => { if (document.hidden) p.noLoop(); else if (playing) p.loop(); });
  }

  async function exitFullscreen() {
    if (document.fullscreenElement === root) await document.exitFullscreen();
    root.classList.remove("is-fullscreen-fallback"); get("full").focus();
  }
  listen(get("full"), "click", async () => {
    try { if (root.requestFullscreen) await root.requestFullscreen(); else root.classList.add("is-fullscreen-fallback"); }
    catch { root.classList.add("is-fullscreen-fallback"); }
    get("exit").focus();
  });
  listen(get("exit"), "click", exitFullscreen);
  listen(document, "keydown", event => { if (event.key === "Escape") root.classList.remove("is-fullscreen-fallback"); });

  updateControls();
  loadP5().then(P5 => {
    if (disposed) return;
    instance = new P5(p => {
      p.setup = async () => {
        p.pixelDensity(1);
        const canvas = p.createCanvas(1080, 1350);
        canvas.attribute("aria-label", text("문양이 흐름과 파동을 이루는 패턴필드 2", "Pattern Field 2: motifs forming flows and waves"));
        canvas.attribute("role", "img");
        p.frameRate(60); p.noiseSeed(state.seed); p.background(0); p.noLoop();
        pointer = p.createVector(-1000, -1000);
        try {
          await Promise.all(MOTIFS.map(async key => {
            const source = await fetchImage(p, motifPath(key));
            if (disposed) return;
            const white = p.createImage(48, 48);
            white.copy(source, 0, 0, source.width, source.height, 0, 0, 48, 48);
            white.loadPixels();
            for (let i = 0; i < white.pixels.length; i += 4) { white.pixels[i] = 255; white.pixels[i + 1] = 255; white.pixels[i + 2] = 255; }
            white.updatePixels(); masks.set(key, white);
          }));
          if (disposed) return;
          attach(p); updatePlay(); await rebuild(p);
          if (!disposed && playing && ready) p.loop();
        } catch (error) {
          if (disposed) return;
          status(text("문양 로딩 오류입니다. 페이지를 새로고침해주세요.", "Motif loading failed. Please reload this page."));
          console.error("Pattern Field 2 setup:", error);
        }
      };
      p.draw = () => {
        if (!ready || disposed) return;
        const dt = playing ? Math.min(p.deltaTime / 1000, .06) : 0;
        elapsed += dt;
        time += dt * state.speed / 100;
        const target = state.auto ? .5 + .5 * Math.cos(elapsed * Math.PI * 2 / state.cycle) : state.formation / 100;
        const ease = 1 - Math.exp(-dt * 4);
        formation += (target - formation) * ease;
        modeWeights = modeWeights.map((weight, i) => weight + (Number(MODES[i] === state.mode) - weight) * ease);
        blend = Math.min(1, blend + dt * 1.3);
        p.noiseDetail(state.octaves, state.falloff);
        if (!current.relief) simulation.step(dt * state.speed / 100, state, modeWeights);
        const fade = clearFrame || !playing || state.trail === 0 ? 255 : 255 * (1 - Math.exp(-dt / (state.trail / 100 * 1.5)));
        p.background(0, fade); clearFrame = false;
        drawField(p, previous, 1 - blend); drawField(p, current, previous ? blend : 1);
        if (previous && blend === 1) { release(previous); previous = undefined; }
        const now = performance.now();
        if (playing) fpsFrames++;
        if (now - fpsStarted >= 500 || !playing) {
          if (playing) measuredFps = fpsFrames * 1000 / (now - fpsStarted);
          fpsStarted = now; fpsFrames = 0;
          get("stats").textContent = `${densityLabel()} / ${playing ? `${Math.round(measuredFps)} FPS` : "PAUSED"}`;
          get("frame").textContent = `p5.js · ${p.width} × ${p.height} px`;
          if (state.auto) root.querySelector('[data-lab-output="formation"]').textContent = `${Math.round(formation * 100)}% / AUTO`;
        }
      };
    }, get("stage"));
  }).catch(error => {
    if (!disposed) status(text("p5.js를 불러오지 못했습니다. 페이지를 새로고침해주세요.", "p5.js failed to load. Please reload this page."));
    console.error("Pattern Field 2 library:", error);
  });

  return () => {
    disposed = true; revision++; life.abort(); release(previous); release(current);
    instance?.remove(); masks.clear(); images.clear();
    if (document.fullscreenElement === root) document.exitFullscreen().catch(() => {});
  };
}
