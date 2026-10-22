import * as pc from "playcanvas";

let disposeViewer;
let activeViewerElement;

const parseFiniteNumber = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp01 = (value) => Math.max(0, Math.min(1, value));

const smoothstep01 = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

const damp = (current, target, lambda, deltaSeconds) =>
  pc.math.lerp(current, target, 1 - Math.exp(-lambda * deltaSeconds));

const dampAngle = (current, target, lambda, deltaSeconds) => {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * deltaSeconds));
};

const smoothDamp = (current, target, velocity, smoothTime, maxSpeed, deltaSeconds) => {
  const safeSmoothTime = Math.max(0.001, smoothTime);
  const omega = 2 / safeSmoothTime;
  const x = omega * deltaSeconds;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = Math.max(0, maxSpeed) * safeSmoothTime;
  let change = current - target;
  change = Math.max(-maxChange, Math.min(maxChange, change));
  const adjustedTarget = current - change;
  const temp = (velocity + omega * change) * deltaSeconds;
  const nextVelocity = (velocity - omega * temp) * exp;
  let value = adjustedTarget + (change + temp) * exp;
  if ((target - current > 0) === (value > target)) {
    value = target;
    return { value, velocity: 0 };
  }
  return { value, velocity: nextVelocity };
};

const addScaledVector = (target, vector, scale) => {
  target.x += vector.x * scale;
  target.y += vector.y * scale;
  target.z += vector.z * scale;
  return target;
};

const copyVec3 = (target, source) => {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
  return target;
};

const setVec3 = (target, x, y, z) => {
  target.x = x;
  target.y = y;
  target.z = z;
  return target;
};

const vec3ToArray = (vector) => [vector.x, vector.y, vector.z];

const GLB_JSON_CHUNK = 0x4e4f534a;
const GLB_BIN_CHUNK = 0x004e4942;
const GLB_COMPONENT_FLOAT = 5126;
const GLB_COMPONENT_UNSIGNED_SHORT = 5123;
const GLB_COMPONENT_UNSIGNED_INT = 5125;

const getThemeClearColor = () =>
  document.documentElement.dataset.theme === "light"
    ? new pc.Color(0.945, 0.941, 0.929, 1)
    : new pc.Color(0.039, 0.039, 0.039, 1);

const disposeActiveViewer = () => {
  const dispose = disposeViewer;
  disposeViewer = undefined;
  activeViewerElement = undefined;
  dispose?.();
};

const setupViewer = (viewer) => {
  if (viewer && viewer === activeViewerElement) return;
  disposeActiveViewer();
  if (!viewer) return;
  activeViewerElement = viewer;

  const stage = viewer.querySelector("[data-splat-stage]");
  const canvas = viewer.querySelector("[data-splat-canvas]");
  const progressWrap = viewer.querySelector("[data-splat-progress-wrap]");
  const progress = viewer.querySelector("[data-splat-progress]");
  const progressText = viewer.querySelector("[data-splat-progress-text]");
  const joystickPad = viewer.querySelector("[data-joystick-pad]");
  const joystickKnob = viewer.querySelector("[data-joystick-knob]");
  const videoOpen = viewer.querySelector("[data-video-open]");
  const videoPanel = viewer.querySelector("[data-video-panel]");
  const videoFrame = viewer.querySelector("[data-video-frame]");
  const videoClose = viewer.querySelector("[data-video-close]");
  const artistPanel = viewer.querySelector(".lounge-viewer__artist-panel");
  const artworkLayer = viewer.querySelector("[data-splat-artwork-layer]");
  const artworkPanel = viewer.querySelector("[data-splat-artwork-panel]");
  const artworkPanelTitle = viewer.querySelector("[data-splat-artwork-title]");
  const artworkPanelCaption = viewer.querySelector("[data-splat-artwork-caption]");
  const artworkPanelImage = viewer.querySelector("[data-splat-artwork-image]");
  const artworkPanelClose = viewer.querySelector("[data-splat-artwork-close]");
  const viewpointButtons = [...viewer.querySelectorAll("[data-splat-viewpoint]")];
  const artworkHotspots = [...viewer.querySelectorAll("[data-splat-artwork-hotspot]")].map((element) => ({
    element,
    position: new pc.Vec3(
      parseFiniteNumber(element.dataset.artworkX, 0),
      parseFiniteNumber(element.dataset.artworkY, 0),
      parseFiniteNumber(element.dataset.artworkZ, 0),
    ),
    width: parseFiniteNumber(element.dataset.artworkWidth, 50),
    height: parseFiniteNumber(element.dataset.artworkHeight, 50),
  }));
  const defaultUrl = viewer.dataset.splatUrl;
  const collisionUrl = viewer.dataset.splatCollisionUrl;
  const isWalkMode = viewer.dataset.splatMode === "walk";
  const allowAuxiliaryMouseMove = viewer.dataset.splatAuxMouseMove !== "false";
  const allowWheelMove = viewer.dataset.splatWheelMove !== "false";
  const locale = document.documentElement.lang;
  const isKorean = locale === "ko";
  const isJapanese = locale === "ja";
  const viewerText = {
    preparing: isJapanese ? "PlayCanvasで空間を準備中" : isKorean ? "PlayCanvas로 공간을 준비하는 중" : "Preparing PlayCanvas space",
    ready: isJapanese ? "準備完了" : isKorean ? "준비됨" : "Ready",
    loadError: isJapanese ? "空間ファイルを読み込めませんでした。" : isKorean ? "공간 파일을 불러오지 못했습니다." : "The space file could not be loaded.",
    webglError: isJapanese
      ? "WebGLを利用できません。ブラウザのハードウェアアクセラレーションを確認してください。"
      : isKorean
        ? "WebGL을 사용할 수 없습니다. 브라우저의 그래픽 가속을 확인하세요."
        : "WebGL is unavailable. Check browser hardware acceleration.",
  };

  let app;
  let cameraEntity;
  let splatEntity;
  let splatAsset;
  let collisionMesh;
  let manualCollisionEdges = [];
  let wallFillEntities = [];
  let walkBounds;
  let currentFrame;
  let currentRadius = 1;
  let disposed = false;
  let stageObserver;
  const pressedKeys = new Set();
  const walkForward = new pc.Vec3();
  const walkRight = new pc.Vec3();
  const walkDelta = new pc.Vec3();
  const moveDelta = new pc.Vec3();
  const moveUp = new pc.Vec3(0, 1, 0);
  const walkTargetVelocity = new pc.Vec3();
  const walkCurrentVelocity = new pc.Vec3();
  const walkTargetPosition = new pc.Vec3();
  const walkDisplayPosition = new pc.Vec3();
  const walkDisplaySpringVelocity = new pc.Vec3();
  const walkLookDirection = new pc.Vec3(0, 0, -1);
  const walkLookTarget = new pc.Vec3();
  const collisionScratchPoint = new pc.Vec3();
  const artworkScreenPosition = new pc.Vec3();
  const joystickVector = new pc.Vec2();
  const joystickEasedVector = new pc.Vec2();
  const walkLook = {
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
  };
  let isDraggingLook = false;
  let isDraggingMove = false;
  let activeLookPointer;
  let activeMovePointer;
  let isDraggingJoystick = false;
  let activeJoystickPointer;
  let lastLookX = 0;
  let lastLookY = 0;
  let lastMoveX = 0;
  let lastMoveY = 0;
  let artistTouchScroll;

  const setStatus = (message, state = "") => {
    stage.dataset.state = state;
    stage.setAttribute("aria-label", message);
  };

  const setProgress = (value, visible = true) => {
    progress.value = Math.max(0, Math.min(1, value));
    progressText.textContent = `${Math.round(progress.value * 100)}%`;
    progressWrap.hidden = !visible;
  };

  const closeArtworkPanel = () => {
    if (!artworkPanel) return;
    artworkPanel.hidden = true;
    delete viewer.dataset.splatArtworkOpen;
  };

  const openArtworkPanel = (button) => {
    if (!artworkPanel || !button) return;
    if (artworkPanelTitle) artworkPanelTitle.textContent = button.dataset.artworkTitle || "";
    if (artworkPanelCaption) artworkPanelCaption.textContent = button.dataset.artworkCaption || "";
    if (artworkPanelImage) {
      const image = button.dataset.artworkImage || "";
      artworkPanelImage.hidden = !image;
      artworkPanelImage.src = image;
      artworkPanelImage.alt = button.dataset.artworkTitle || "";
    }
    artworkPanel.hidden = false;
    viewer.dataset.splatArtworkOpen = "true";
  };

  const handleArtworkHotspotClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openArtworkPanel(event.currentTarget);
    canvas.focus({ preventScroll: true });
  };

  const handleArtworkCloseClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeArtworkPanel();
    canvas.focus({ preventScroll: true });
  };

  const handleArtworkPanelClick = (event) => {
    if (event.target !== artworkPanel) return;
    closeArtworkPanel();
    canvas.focus({ preventScroll: true });
  };

  const closeVideoPanel = () => {
    if (!videoPanel) return;
    videoPanel.hidden = true;
    if (videoFrame) videoFrame.src = "";
    delete viewer.dataset.videoPanelOpen;
  };

  const openVideoPanel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!videoPanel || !videoOpen) return;
    const source = videoOpen.dataset.videoSrc || "";
    if (videoFrame && source) videoFrame.src = source;
    videoPanel.hidden = false;
    viewer.dataset.videoPanelOpen = "true";
    videoClose?.focus({ preventScroll: true });
  };

  const handleVideoCloseClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeVideoPanel();
    videoOpen?.focus({ preventScroll: true });
  };

  const handleVideoPanelClick = (event) => {
    if (event.target !== videoPanel) return;
    closeVideoPanel();
    videoOpen?.focus({ preventScroll: true });
  };

  const handleArtistPanelTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!artistPanel || !touch) return;
    artistTouchScroll = {
      startY: touch.clientY,
      startScrollTop: artistPanel.scrollTop,
    };
    event.stopPropagation();
  };

  const handleArtistPanelTouchMove = (event) => {
    const touch = event.touches?.[0];
    if (!artistPanel || !artistTouchScroll || !touch) return;
    const maxScrollTop = artistPanel.scrollHeight - artistPanel.clientHeight;
    const nextScrollTop = artistTouchScroll.startScrollTop + artistTouchScroll.startY - touch.clientY;
    artistPanel.scrollTop = Math.max(0, Math.min(maxScrollTop, nextScrollTop));
    event.preventDefault();
    event.stopPropagation();
  };

  const clearArtistPanelTouch = () => {
    artistTouchScroll = undefined;
  };

  const updateArtworkHotspots = () => {
    if (!artworkHotspots.length || !app || !cameraEntity?.camera) return;
    const rect = stage.getBoundingClientRect();
    const screenPadding = 36;
    artworkLayer?.removeAttribute("hidden");
    const cameraPosition = cameraEntity.getPosition();
    const fovRadians = (cameraEntity.camera.fov * Math.PI) / 180;
    const compactViewport = window.matchMedia("(max-width: 768px)").matches;
    const maximumArtworkHeight = compactViewport ? 190 : 280;
    for (const { element, position, width, height } of artworkHotspots) {
      cameraEntity.camera.worldToScreen(position, artworkScreenPosition);
      const x = artworkScreenPosition.x;
      const y = artworkScreenPosition.y;
      const distance = Math.max(0.01, cameraPosition.distance(position));
      const worldHeight = Math.max(1.8, Math.min(4.2, (height / 50) * 3.2));
      const pixelHeight = Math.max(
        48,
        Math.min(maximumArtworkHeight, (worldHeight * rect.height) / (2 * Math.tan(fovRadians / 2) * distance)),
      );
      const pixelWidth = pixelHeight * (width / Math.max(height, 0.01));
      const isVisible = artworkScreenPosition.z > 0
        && x >= -screenPadding
        && x <= rect.width + screenPadding
        && y >= -screenPadding
        && y <= rect.height + screenPadding;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.width = `${pixelWidth}px`;
      element.style.height = `${pixelHeight}px`;
      element.classList.toggle("is-visible", isVisible);
      element.tabIndex = isVisible ? 0 : -1;
      element.setAttribute("aria-hidden", isVisible ? "false" : "true");
    }
  };

  const getRenderPixelRatio = () => {
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const basePixelRatio = parseFiniteNumber(viewer.dataset.splatPixelRatio, devicePixelRatio);
    const isCompactViewport = window.matchMedia("(max-width: 768px)").matches;
    const responsivePixelRatio = parseFiniteNumber(
      isCompactViewport ? viewer.dataset.splatMobilePixelRatio : viewer.dataset.splatDesktopPixelRatio,
      basePixelRatio,
    );
    const minPixelRatio = Math.max(0.5, parseFiniteNumber(viewer.dataset.splatPixelRatioMin, 0.72));
    const maxPixelRatio = Math.max(minPixelRatio, parseFiniteNumber(viewer.dataset.splatPixelRatioMax, 2.25));
    return Math.max(minPixelRatio, Math.min(responsivePixelRatio, maxPixelRatio));
  };

  const resize = () => {
    if (!app || !cameraEntity?.camera) return;
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    app.graphicsDevice.maxPixelRatio = getRenderPixelRatio();
    app.resizeCanvas(width, height);
    cameraEntity.camera.aspectRatio = width / height;
  };

  const getWalkSpeed = () => parseFiniteNumber(viewer.dataset.splatWalkSpeed, Math.max(currentRadius * 1.85, 0.82));

  const getPointerMoveScale = () =>
    Math.max(0.001, parseFiniteNumber(viewer.dataset.splatPointerMoveScale, currentRadius * 0.00018));

  const getWheelMoveScale = () =>
    Math.max(0.001, parseFiniteNumber(viewer.dataset.splatWheelMoveScale, currentRadius * 0.00055));

  const syncRuntimeMovementAttributes = () => {
    if (isWalkMode) {
      viewer.dataset.splatRuntimeWalkSpeed = getWalkSpeed().toFixed(6);
    } else {
      delete viewer.dataset.splatRuntimeWalkSpeed;
    }
  };

  const getBoundsSize = (bounds) => new pc.Vec3(
    bounds.halfExtents.x * 2,
    bounds.halfExtents.y * 2,
    bounds.halfExtents.z * 2,
  );

  const quantile = (values, fraction) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction)))];
  };

  const createBoundsFromCompressedChunks = (resource) => {
    const chunkData = resource?.gsplatData?.chunkData;
    if (!(chunkData instanceof Float32Array) || chunkData.length < 18) return null;
    const chunkCount = Math.floor(chunkData.length / 18);
    const minX = [];
    const minY = [];
    const minZ = [];
    const maxX = [];
    const maxY = [];
    const maxZ = [];
    for (let i = 0; i < chunkCount; i += 1) {
      const offset = i * 18;
      minX.push(chunkData[offset]);
      minY.push(chunkData[offset + 1]);
      minZ.push(chunkData[offset + 2]);
      maxX.push(chunkData[offset + 3]);
      maxY.push(chunkData[offset + 4]);
      maxZ.push(chunkData[offset + 5]);
    }
    const trim = Math.max(0, Math.min(0.2, parseFiniteNumber(viewer.dataset.splatBoundsTrim, 0.02)));
    const min = new pc.Vec3(
      quantile(minX, trim),
      quantile(minY, trim),
      quantile(minZ, trim),
    );
    const max = new pc.Vec3(
      quantile(maxX, 1 - trim),
      quantile(maxY, 1 - trim),
      quantile(maxZ, 1 - trim),
    );
    if (![min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite)) return null;
    if (min.x >= max.x || min.y >= max.y || min.z >= max.z) return null;
    const center = new pc.Vec3(
      (min.x + max.x) * 0.5,
      (min.y + max.y) * 0.5,
      (min.z + max.z) * 0.5,
    );
    const halfExtents = new pc.Vec3(
      (max.x - min.x) * 0.5,
      (max.y - min.y) * 0.5,
      (max.z - min.z) * 0.5,
    );
    return new pc.BoundingBox(center, halfExtents);
  };

  const createBoundsFromPositions = (resource) => {
    const data = resource?.gsplatData;
    const x = data?.getProp?.("x");
    const y = data?.getProp?.("y");
    const z = data?.getProp?.("z");
    if (!(x instanceof Float32Array) || !(y instanceof Float32Array) || !(z instanceof Float32Array)) return null;
    const count = Math.min(x.length, y.length, z.length);
    if (count < 8) return null;
    const maxSamples = 80000;
    const step = Math.max(1, Math.ceil(count / maxSamples));
    const xs = [];
    const ys = [];
    const zs = [];
    for (let i = 0; i < count; i += step) {
      if (![x[i], y[i], z[i]].every(Number.isFinite)) continue;
      xs.push(x[i]);
      ys.push(y[i]);
      zs.push(z[i]);
    }
    if (xs.length < 8) return null;
    const trim = Math.max(0, Math.min(0.2, parseFiniteNumber(viewer.dataset.splatBoundsTrim, 0.02)));
    const min = new pc.Vec3(
      quantile(xs, trim),
      quantile(ys, trim),
      quantile(zs, trim),
    );
    const max = new pc.Vec3(
      quantile(xs, 1 - trim),
      quantile(ys, 1 - trim),
      quantile(zs, 1 - trim),
    );
    if (min.x >= max.x || min.y >= max.y || min.z >= max.z) return null;
    return new pc.BoundingBox(
      new pc.Vec3((min.x + max.x) * 0.5, (min.y + max.y) * 0.5, (min.z + max.z) * 0.5),
      new pc.Vec3((max.x - min.x) * 0.5, (max.y - min.y) * 0.5, (max.z - min.z) * 0.5),
    );
  };

  const getGlbAccessorReader = (json, binaryChunk, accessorIndex) => {
    const accessor = json.accessors?.[accessorIndex];
    const bufferView = json.bufferViews?.[accessor?.bufferView];
    if (!accessor || !bufferView) return null;
    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const componentCount = accessor.type === "VEC3" ? 3 : 1;
    const componentSize = accessor.componentType === GLB_COMPONENT_FLOAT || accessor.componentType === GLB_COMPONENT_UNSIGNED_INT
      ? 4
      : 2;
    const stride = bufferView.byteStride || componentSize * componentCount;
    const dataView = new DataView(binaryChunk.buffer, binaryChunk.byteOffset, binaryChunk.byteLength);
    return {
      count: accessor.count,
      componentType: accessor.componentType,
      readVec3: (index) => {
        const offset = byteOffset + index * stride;
        return new pc.Vec3(
          dataView.getFloat32(offset, true),
          dataView.getFloat32(offset + 4, true),
          dataView.getFloat32(offset + 8, true),
        );
      },
      readIndex: (index) => {
        const offset = byteOffset + index * stride;
        if (accessor.componentType === GLB_COMPONENT_UNSIGNED_INT) return dataView.getUint32(offset, true);
        if (accessor.componentType === GLB_COMPONENT_UNSIGNED_SHORT) return dataView.getUint16(offset, true);
        return index;
      },
    };
  };

  const parseCollisionGlb = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Collision GLB request failed: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) {
      throw new Error("Collision asset is not a GLB v2 file.");
    }
    let offset = 12;
    let json;
    let binaryChunk;
    while (offset + 8 <= bytes.byteLength) {
      const chunkLength = header.getUint32(offset, true);
      const chunkType = header.getUint32(offset + 4, true);
      const chunkStart = offset + 8;
      const chunkBytes = bytes.subarray(chunkStart, chunkStart + chunkLength);
      if (chunkType === GLB_JSON_CHUNK) {
        json = JSON.parse(new TextDecoder().decode(chunkBytes));
      } else if (chunkType === GLB_BIN_CHUNK) {
        binaryChunk = chunkBytes;
      }
      offset = chunkStart + chunkLength;
    }
    if (!json || !binaryChunk) throw new Error("Collision GLB is missing JSON or binary chunks.");
    return { json, binaryChunk };
  };

  const transformCollisionPoint = (point, frame, rotationQuat) => {
    const mode = viewer.dataset.splatCollisionTransform || "frame";
    if (mode === "none") return point.clone();
    const transformed = rotationQuat.transformVector(point, new pc.Vec3()).scale(frame.meshScale);
    if (mode === "frame") transformed.add(frame.meshPosition);
    return transformed;
  };

  const buildCollisionMesh = ({ json, binaryChunk }, frame) => {
    const vertices = [];
    const edges = [];
    const bounds = {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    };
    const rotationQuat = new pc.Quat().setFromEulerAngles(frame.meshRotation.x, frame.meshRotation.y, frame.meshRotation.z);
    const primitives = json.meshes?.flatMap((mesh) => mesh.primitives || []) || [];
    for (const primitive of primitives) {
      const positionAccessorIndex = primitive.attributes?.POSITION;
      const positionReader = getGlbAccessorReader(json, binaryChunk, positionAccessorIndex);
      const indexReader = getGlbAccessorReader(json, binaryChunk, primitive.indices);
      if (!positionReader || positionReader.componentType !== GLB_COMPONENT_FLOAT) continue;
      const vertexOffset = vertices.length;
      for (let i = 0; i < positionReader.count; i += 1) {
        const vertex = transformCollisionPoint(positionReader.readVec3(i), frame, rotationQuat);
        vertices.push(vertex);
        bounds.minX = Math.min(bounds.minX, vertex.x);
        bounds.maxX = Math.max(bounds.maxX, vertex.x);
        bounds.minY = Math.min(bounds.minY, vertex.y);
        bounds.maxY = Math.max(bounds.maxY, vertex.y);
        bounds.minZ = Math.min(bounds.minZ, vertex.z);
        bounds.maxZ = Math.max(bounds.maxZ, vertex.z);
      }
      const indexCount = indexReader?.count || positionReader.count;
      for (let i = 0; i + 2 < indexCount; i += 3) {
        const a = vertices[vertexOffset + (indexReader ? indexReader.readIndex(i) : i)];
        const b = vertices[vertexOffset + (indexReader ? indexReader.readIndex(i + 1) : i + 1)];
        const c = vertices[vertexOffset + (indexReader ? indexReader.readIndex(i + 2) : i + 2)];
        if (!a || !b || !c) continue;
        const ab = new pc.Vec3().sub2(b, a);
        const ac = new pc.Vec3().sub2(c, a);
        const normal = new pc.Vec3().cross(ab, ac);
        if (normal.lengthSq() === 0) continue;
        normal.normalize();
        if (Math.abs(normal.y) > 0.65) continue;
        const minY = Math.min(a.y, b.y, c.y);
        const maxY = Math.max(a.y, b.y, c.y);
        edges.push({ a, b, minY, maxY });
        edges.push({ a: b, b: c, minY, maxY });
        edges.push({ a: c, b: a, minY, maxY });
      }
    }
    return { bounds, edges, vertexCount: vertices.length };
  };

  const loadCollisionMesh = async (frame) => {
    if (!collisionUrl) return;
    try {
      collisionMesh = buildCollisionMesh(await parseCollisionGlb(collisionUrl), frame);
      viewer.dataset.splatCollisionReady = "true";
    } catch (error) {
      collisionMesh = undefined;
      viewer.dataset.splatCollisionReady = "false";
      console.warn("PlayCanvas collision mesh load failed; walk movement will remain unrestricted.", error);
    }
  };

  const createWalkBounds = (frame) => {
    if (viewer.dataset.splatWalkBounds !== "true") {
      walkBounds = undefined;
      delete viewer.dataset.splatWalkBoundsReady;
      return;
    }
    const minX = parseFiniteNumber(viewer.dataset.splatWalkMinX, Number.NaN);
    const maxX = parseFiniteNumber(viewer.dataset.splatWalkMaxX, Number.NaN);
    const minZ = parseFiniteNumber(viewer.dataset.splatWalkMinZ, Number.NaN);
    const maxZ = parseFiniteNumber(viewer.dataset.splatWalkMaxZ, Number.NaN);
    if (![minX, maxX, minZ, maxZ].every(Number.isFinite) || minX >= maxX || minZ >= maxZ) {
      walkBounds = undefined;
      viewer.dataset.splatWalkBoundsReady = "false";
      console.warn("PlayCanvas walk bounds are invalid; walk movement will use only collision mesh limits.");
      return;
    }
    walkBounds = {
      minX,
      maxX,
      minZ,
      maxZ,
      sourceRadius: frame?.radius,
    };
    viewer.dataset.splatWalkBoundsReady = "true";
  };

  const createManualCollisionEdges = (frame) => {
    manualCollisionEdges = [];
    const source = viewer.dataset.splatManualCollisionEdges;
    if (!source) {
      delete viewer.dataset.splatManualCollisionReady;
      return;
    }
    const minY = parseFiniteNumber(viewer.dataset.splatManualCollisionMinY, frame.cameraPosition.y - 8);
    const maxY = parseFiniteNumber(viewer.dataset.splatManualCollisionMaxY, frame.cameraPosition.y + 8);
    for (const segment of source.split("|")) {
      const values = segment.split(",").map((value) => Number.parseFloat(value.trim()));
      if (values.length !== 4 || !values.every(Number.isFinite)) {
        console.warn("PlayCanvas manual collision segment is invalid and was skipped.", segment);
        continue;
      }
      const [x1, z1, x2, z2] = values;
      manualCollisionEdges.push({
        a: new pc.Vec3(x1, minY, z1),
        b: new pc.Vec3(x2, maxY, z2),
        minY,
        maxY,
      });
    }
    viewer.dataset.splatManualCollisionReady = manualCollisionEdges.length ? "true" : "false";
  };

  const clearWallFills = () => {
    for (const entity of wallFillEntities) {
      entity.destroy();
    }
    wallFillEntities = [];
    delete viewer.dataset.splatWallFillReady;
    delete viewer.dataset.splatWallFillRenderMode;
  };

  const createKeumsanTestWallFill = () => {
    clearWallFills();
    if (viewer.dataset.splatWallFill !== "keumsan-test2" || !app) return;

    const createMaterial = (diffuse, ambient = diffuse, emissive = new pc.Color(0, 0, 0)) => {
      const material = new pc.StandardMaterial();
      material.diffuse = diffuse;
      material.ambient = ambient;
      material.emissive = emissive;
      material.useLighting = false;
      material.depthTest = false;
      material.depthWrite = false;
      material.cull = pc.CULLFACE_NONE;
      material.update();
      return material;
    };

    const wallMaterial = createMaterial(
      new pc.Color(0.9, 0.86, 0.76),
      new pc.Color(0.9, 0.86, 0.76),
      new pc.Color(0.16, 0.14, 0.1)
    );
    const shadowMaterial = createMaterial(new pc.Color(0.42, 0.38, 0.31));
    const baseboardMaterial = createMaterial(new pc.Color(0.62, 0.58, 0.49));

    const addWallBox = (name, position, scale, material) => {
      const entity = new pc.Entity(name);
      entity.addComponent("render", {
        type: "box",
        material,
        layers: [pc.LAYERID_WORLD],
      });
      entity.setLocalPosition(position.x, position.y, position.z);
      entity.setLocalScale(scale.x, scale.y, scale.z);
      for (const meshInstance of entity.render.meshInstances) {
        meshInstance.drawOrder = 1000;
      }
      app.root.addChild(entity);
      wallFillEntities.push(entity);
    };

    addWallBox(
      "Keumsan Test2 doorway infill panel",
      { x: 32.5, y: 3.05, z: 49.28 },
      { x: 10.4, y: 5.95, z: 0.34 },
      wallMaterial
    );
    addWallBox(
      "Keumsan Test2 doorway left reveal",
      { x: 27.25, y: 3.05, z: 49.08 },
      { x: 0.24, y: 5.95, z: 0.22 },
      shadowMaterial
    );
    addWallBox(
      "Keumsan Test2 doorway right reveal",
      { x: 37.75, y: 3.05, z: 49.08 },
      { x: 0.24, y: 5.95, z: 0.22 },
      shadowMaterial
    );
    addWallBox(
      "Keumsan Test2 doorway top reveal",
      { x: 32.5, y: 6.08, z: 49.08 },
      { x: 10.6, y: 0.24, z: 0.22 },
      shadowMaterial
    );
    addWallBox(
      "Keumsan Test2 doorway baseboard",
      { x: 32.5, y: 0.1, z: 49.05 },
      { x: 10.6, y: 0.28, z: 0.24 },
      baseboardMaterial
    );

    viewer.dataset.splatWallFillReady = "true";
    viewer.dataset.splatWallFillRenderMode = "world-depth-off";
  };

  const pushPointAwayFromCollisionEdge = (point, edge, radius) => {
    const yPadding = parseFiniteNumber(viewer.dataset.splatCollisionHeightPadding, 0.08);
    if (point.y < edge.minY - yPadding || point.y > edge.maxY + yPadding) return;
    const abX = edge.b.x - edge.a.x;
    const abZ = edge.b.z - edge.a.z;
    const lengthSq = abX * abX + abZ * abZ;
    if (lengthSq < 0.000001) return;
    const t = Math.max(0, Math.min(1, ((point.x - edge.a.x) * abX + (point.z - edge.a.z) * abZ) / lengthSq));
    const closestX = edge.a.x + abX * t;
    const closestZ = edge.a.z + abZ * t;
    const awayX = point.x - closestX;
    const awayZ = point.z - closestZ;
    const distanceSq = awayX * awayX + awayZ * awayZ;
    if (distanceSq >= radius * radius) return;
    const distance = Math.sqrt(distanceSq) || 0.0001;
    const push = radius - distance;
    point.x += (awayX / distance) * push;
    point.z += (awayZ / distance) * push;
  };

  const constrainWalkPosition = (position, fallbackPosition) => {
    const radius = Math.max(0.02, parseFiniteNumber(viewer.dataset.splatCollisionRadius, 0.14));
    if (walkBounds) {
      const boundsPadding = Math.max(radius, parseFiniteNumber(viewer.dataset.splatWalkBoundsPadding, 0.28));
      position.x = Math.max(walkBounds.minX + boundsPadding, Math.min(walkBounds.maxX - boundsPadding, position.x));
      position.z = Math.max(walkBounds.minZ + boundsPadding, Math.min(walkBounds.maxZ - boundsPadding, position.z));
    }
    if (collisionMesh?.edges?.length) {
      const boundsPadding = Math.max(radius, parseFiniteNumber(viewer.dataset.splatCollisionBoundsPadding, 0.12));
      position.x = Math.max(collisionMesh.bounds.minX + boundsPadding, Math.min(collisionMesh.bounds.maxX - boundsPadding, position.x));
      position.z = Math.max(collisionMesh.bounds.minZ + boundsPadding, Math.min(collisionMesh.bounds.maxZ - boundsPadding, position.z));
      const iterations = Math.max(1, Math.min(4, Math.round(parseFiniteNumber(viewer.dataset.splatCollisionIterations, 2))));
      for (let i = 0; i < iterations; i += 1) {
        for (const edge of collisionMesh.edges) {
          pushPointAwayFromCollisionEdge(position, edge, radius);
        }
      }
    }
    if (manualCollisionEdges.length) {
      const manualRadius = Math.max(radius, parseFiniteNumber(viewer.dataset.splatManualCollisionRadius, radius));
      const iterations = Math.max(1, Math.min(6, Math.round(parseFiniteNumber(viewer.dataset.splatManualCollisionIterations, 3))));
      for (let i = 0; i < iterations; i += 1) {
        for (const edge of manualCollisionEdges) {
          pushPointAwayFromCollisionEdge(position, edge, manualRadius);
        }
      }
    }
    return position;
  };

  const createFrame = (resource) => {
    const useFixedFrame = viewer.dataset.splatFixedFrame === "true";
    const meshScale = parseFiniteNumber(viewer.dataset.splatScale, 1);
    const meshRotation = new pc.Vec3(
      parseFiniteNumber(viewer.dataset.splatRotationX, 0),
      parseFiniteNumber(viewer.dataset.splatRotationY, 0),
      parseFiniteNumber(viewer.dataset.splatRotationZ, 0),
    );
    const shouldCenterMesh = viewer.dataset.splatCenter !== "false";
    const meshRotationQuat = new pc.Quat().setFromEulerAngles(meshRotation.x, meshRotation.y, meshRotation.z);
    const rawBounds = createBoundsFromCompressedChunks(resource) || createBoundsFromPositions(resource) || (resource?.aabb instanceof pc.BoundingBox
      ? resource.aabb
      : new pc.BoundingBox(new pc.Vec3(), new pc.Vec3(1, 1, 1)));
    const bounds = useFixedFrame
      ? new pc.BoundingBox(new pc.Vec3(), new pc.Vec3(1, 1, 1))
      : rawBounds;
    const center = bounds.center;
    const rawCenter = rawBounds.center;
    const rotatedRawCenter = meshRotationQuat.transformVector(rawCenter, new pc.Vec3());
    const size = getBoundsSize(bounds);
    const radius = Math.max(size.length() * 0.5, 0.1);
    const isSpace = viewer.dataset.splatKind === "space";
    const hasDistanceOverride = viewer.dataset.splatPlaycanvasDistanceScale !== undefined;
    const distanceScale = parseFiniteNumber(
      hasDistanceOverride ? viewer.dataset.splatPlaycanvasDistanceScale : viewer.dataset.splatDistanceScale,
      isSpace ? 2.2 : 18,
    );
    const cameraX = parseFiniteNumber(viewer.dataset.splatCameraX, isSpace ? 0.7 : 0.38);
    const cameraY = parseFiniteNumber(viewer.dataset.splatCameraY, isSpace ? 0.22 : 0.18);
    const cameraZ = parseFiniteNumber(viewer.dataset.splatCameraZ, isSpace ? 0.95 : 1.18);
    const targetHeight = parseFiniteNumber(
      viewer.dataset.splatPlaycanvasTargetHeight ?? viewer.dataset.splatTargetHeight,
      isSpace ? 0.04 : 0.38,
    );
    const targetX = parseFiniteNumber(viewer.dataset.splatTargetX, 0);
    const targetZ = parseFiniteNumber(viewer.dataset.splatTargetZ, 0);
    const minimumDistance = hasDistanceOverride ? 0.01 : isSpace ? radius * 1.4 : 4.4;
    const distance = Math.max(radius * distanceScale, minimumDistance);
    const cameraPosition = useFixedFrame
      ? new pc.Vec3(cameraX, cameraY, cameraZ)
      : new pc.Vec3(distance * cameraX, distance * cameraY, distance * cameraZ);
    const target = useFixedFrame
      ? new pc.Vec3(targetX, targetHeight, targetZ)
      : new pc.Vec3(targetX, radius * targetHeight, targetZ);
    return {
      radius,
      meshScale,
      rawBounds: {
        min: [
          rawBounds.center.x - rawBounds.halfExtents.x,
          rawBounds.center.y - rawBounds.halfExtents.y,
          rawBounds.center.z - rawBounds.halfExtents.z,
        ],
        max: [
          rawBounds.center.x + rawBounds.halfExtents.x,
          rawBounds.center.y + rawBounds.halfExtents.y,
          rawBounds.center.z + rawBounds.halfExtents.z,
        ],
      },
      meshPosition: shouldCenterMesh
        ? new pc.Vec3(-rotatedRawCenter.x * meshScale, -rotatedRawCenter.y * meshScale, -rotatedRawCenter.z * meshScale)
        : new pc.Vec3(0, 0, 0),
      meshRotation,
      cameraPosition,
      target,
      near: Math.max(radius / 1000, 0.001),
      far: Math.max(radius * (isSpace ? 16 : 40), 100),
    };
  };

  const updateWalkLookFromCamera = (position, target) => {
    const direction = new pc.Vec3().sub2(target, position).normalize();
    walkLook.pitch = Math.asin(Math.max(-1, Math.min(1, direction.y)));
    walkLook.yaw = Math.atan2(-direction.x, -direction.z);
    walkLook.targetPitch = walkLook.pitch;
    walkLook.targetYaw = walkLook.yaw;
  };

  const setActiveViewpointButton = (activeButton) => {
    for (const button of viewpointButtons) {
      const isActive = button === activeButton;
      button.classList.toggle("is-active", isActive);
      if (isActive) {
        button.setAttribute("aria-current", "true");
      } else {
        button.removeAttribute("aria-current");
      }
    }
  };

  const handleViewpointClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!currentFrame) return;
    const button = event.currentTarget;
    const position = new pc.Vec3(
      parseFiniteNumber(button.dataset.viewpointX, walkTargetPosition.x),
      parseFiniteNumber(button.dataset.viewpointY, walkTargetPosition.y),
      parseFiniteNumber(button.dataset.viewpointZ, walkTargetPosition.z),
    );
    const target = new pc.Vec3(
      parseFiniteNumber(button.dataset.viewpointTargetX, position.x),
      parseFiniteNumber(button.dataset.viewpointTargetY, position.y),
      parseFiniteNumber(button.dataset.viewpointTargetZ, position.z - 1),
    );
    copyVec3(walkTargetPosition, constrainWalkPosition(position, walkTargetPosition));
    setVec3(walkDisplaySpringVelocity, 0, 0, 0);
    setVec3(walkTargetVelocity, 0, 0, 0);
    setVec3(walkCurrentVelocity, 0, 0, 0);
    updateWalkLookFromCamera(walkTargetPosition, target);
    closeArtworkPanel();
    setActiveViewpointButton(button);
    canvas.focus({ preventScroll: true });
  };

  const syncWalkCamera = () => {
    if (!cameraEntity || !currentFrame) return;
    const lookDistance = parseFiniteNumber(
      viewer.dataset.splatWalkLookDistance,
      Math.max(currentRadius * 0.24, 1.2),
    );
    updateWalkLookDirection();
    copyVec3(walkLookTarget, walkDisplayPosition);
    addScaledVector(walkLookTarget, walkLookDirection, lookDistance);
    cameraEntity.setPosition(walkDisplayPosition);
    cameraEntity.lookAt(walkLookTarget, pc.Vec3.UP);
  };

  const applyFrame = (frame) => {
    currentRadius = frame.radius;
    syncRuntimeMovementAttributes();
    splatEntity.setLocalEulerAngles(frame.meshRotation);
    splatEntity.setLocalPosition(frame.meshPosition);
    splatEntity.setLocalScale(frame.meshScale, frame.meshScale, frame.meshScale);
    cameraEntity.camera.nearClip = frame.near;
    cameraEntity.camera.farClip = frame.far;
    cameraEntity.camera.fov = parseFiniteNumber(viewer.dataset.splatFov, 55);
    cameraEntity.camera.clearColor = getThemeClearColor();
    cameraEntity.setPosition(frame.cameraPosition);
    cameraEntity.lookAt(frame.target, pc.Vec3.UP);
    copyVec3(walkTargetPosition, frame.cameraPosition);
    copyVec3(walkDisplayPosition, frame.cameraPosition);
    setVec3(walkDisplaySpringVelocity, 0, 0, 0);
    setVec3(walkTargetVelocity, 0, 0, 0);
    setVec3(walkCurrentVelocity, 0, 0, 0);
    updateWalkLookFromCamera(frame.cameraPosition, frame.target);
    createWalkBounds(frame);
    createManualCollisionEdges(frame);
    createKeumsanTestWallFill();
    syncWalkCamera();
  };

  const updateWalkLookDirection = () => {
    const cosPitch = Math.cos(walkLook.pitch);
    setVec3(
      walkLookDirection,
      -Math.sin(walkLook.yaw) * cosPitch,
      Math.sin(walkLook.pitch),
      -Math.cos(walkLook.yaw) * cosPitch,
    );
    return walkLookDirection.normalize();
  };

  const updateWalkLook = (deltaSeconds) => {
    const lookSmoothing = parseFiniteNumber(viewer.dataset.splatLookSmoothing, 18);
    const clampedDelta = Math.min(deltaSeconds, parseFiniteNumber(viewer.dataset.splatLookMaxDelta, 0.08));
    walkLook.yaw = dampAngle(walkLook.yaw, walkLook.targetYaw, lookSmoothing, clampedDelta);
    walkLook.pitch = damp(walkLook.pitch, walkLook.targetPitch, lookSmoothing, clampedDelta);
  };

  const updateWalkDisplayPosition = (deltaSeconds) => {
    const clampedDelta = Math.min(deltaSeconds, parseFiniteNumber(viewer.dataset.splatWalkMaxDelta, 0.12));
    if (viewer.dataset.splatCameraSpring === "true") {
      const smoothTime = parseFiniteNumber(
        viewer.dataset.splatCameraSpringTime,
        parseFiniteNumber(viewer.dataset.splatControlSmoothTime, 0.16),
      );
      const maxSpeed = parseFiniteNumber(viewer.dataset.splatCameraSpringMaxSpeed, Number.POSITIVE_INFINITY);
      const x = smoothDamp(
        walkDisplayPosition.x,
        walkTargetPosition.x,
        walkDisplaySpringVelocity.x,
        smoothTime,
        maxSpeed,
        clampedDelta,
      );
      const y = smoothDamp(
        walkDisplayPosition.y,
        walkTargetPosition.y,
        walkDisplaySpringVelocity.y,
        smoothTime,
        maxSpeed,
        clampedDelta,
      );
      const z = smoothDamp(
        walkDisplayPosition.z,
        walkTargetPosition.z,
        walkDisplaySpringVelocity.z,
        smoothTime,
        maxSpeed,
        clampedDelta,
      );
      walkDisplayPosition.set(x.value, y.value, z.value);
      walkDisplaySpringVelocity.set(x.velocity, y.velocity, z.velocity);
    } else {
      const positionSmoothing = parseFiniteNumber(viewer.dataset.splatPositionSmoothing, 14);
      walkDisplayPosition.lerp(
        walkDisplayPosition,
        walkTargetPosition,
        1 - Math.exp(-positionSmoothing * clampedDelta),
      );
    }
    const dx = walkDisplayPosition.x - walkTargetPosition.x;
    const dy = walkDisplayPosition.y - walkTargetPosition.y;
    const dz = walkDisplayPosition.z - walkTargetPosition.z;
    if (dx * dx + dy * dy + dz * dz < 0.000001) {
      copyVec3(walkDisplayPosition, walkTargetPosition);
      setVec3(walkDisplaySpringVelocity, 0, 0, 0);
    }
  };

  const updateJoystickEasing = () => {
    joystickEasedVector.set(0, 0);
    const length = joystickVector.length();
    const deadzone = clamp01(parseFiniteNumber(viewer.dataset.splatJoystickDeadzone, 0.1));
    if (length <= deadzone) return joystickEasedVector;
    const curve = Math.max(0.6, parseFiniteNumber(viewer.dataset.splatJoystickCurve, 1.32));
    const normalized = (Math.min(length, 1) - deadzone) / Math.max(1 - deadzone, 0.001);
    const easedLength = Math.pow(smoothstep01(normalized), curve);
    return joystickEasedVector.copy(joystickVector).normalize().scale(easedLength);
  };

  const updateWalkControls = (deltaSeconds) => {
    if (!currentFrame) return;
    setVec3(walkDelta, 0, 0, 0);
    updateWalkLookDirection();
    copyVec3(walkForward, walkLookDirection);
    walkForward.y = 0;
    if (walkForward.lengthSq() > 0) walkForward.normalize();
    setVec3(walkRight, Math.cos(walkLook.yaw), 0, -Math.sin(walkLook.yaw));
    if (walkRight.lengthSq() > 0) walkRight.normalize();

    let forwardInput = 0;
    let rightInput = 0;
    if (pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) forwardInput += 1;
    if (pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown")) forwardInput -= 1;
    if (pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) rightInput += 1;
    if (pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft")) rightInput -= 1;
    const joystickInput = updateJoystickEasing();
    forwardInput -= joystickInput.y;
    rightInput += joystickInput.x;

    const strafeScale = parseFiniteNumber(viewer.dataset.splatStrafeScale, 1);
    if (forwardInput !== 0) addScaledVector(walkDelta, walkForward, forwardInput);
    if (rightInput !== 0) addScaledVector(walkDelta, walkRight, rightInput * strafeScale);
    if (walkDelta.lengthSq() > 1) walkDelta.normalize();

    const speed = getWalkSpeed();
    const hasMovementInput = walkDelta.lengthSq() > 0;
    const acceleration = hasMovementInput
      ? parseFiniteNumber(viewer.dataset.splatWalkAcceleration, 8.8)
      : parseFiniteNumber(viewer.dataset.splatWalkBraking, 7.2);
    const clampedDelta = Math.min(deltaSeconds, parseFiniteNumber(viewer.dataset.splatWalkMaxDelta, 0.12));
    copyVec3(walkTargetVelocity, walkDelta).scale(speed);
    walkCurrentVelocity.lerp(
      walkCurrentVelocity,
      walkTargetVelocity,
      1 - Math.exp(-acceleration * clampedDelta),
    );
    if (walkCurrentVelocity.lengthSq() < 0.000001 && walkTargetVelocity.lengthSq() === 0) {
      setVec3(walkCurrentVelocity, 0, 0, 0);
      return;
    }
    copyVec3(collisionScratchPoint, walkTargetPosition);
    addScaledVector(collisionScratchPoint, walkCurrentVelocity, clampedDelta);
    copyVec3(walkTargetPosition, constrainWalkPosition(collisionScratchPoint, walkTargetPosition));
  };

  const syncJoystickVisual = (x = 0, y = 0) => {
    if (!joystickPad) return;
    joystickPad.style.setProperty("--joystick-x", `${x}px`);
    joystickPad.style.setProperty("--joystick-y", `${y}px`);
    joystickPad.style.setProperty("--joystick-distance", `${Math.hypot(x, y)}px`);
    joystickPad.style.setProperty("--joystick-angle", `${Math.atan2(y, x)}rad`);
    joystickPad.classList.toggle("is-active", x !== 0 || y !== 0);
  };

  const getJoystickRadius = () => {
    const padRect = joystickPad?.getBoundingClientRect();
    const knobRect = joystickKnob?.getBoundingClientRect();
    if (!padRect) return 40;
    const knobSize = Math.max(knobRect?.width || 30, knobRect?.height || 30);
    return Math.max(18, Math.min(padRect.width, padRect.height) * 0.5 - knobSize * 0.5 - 6);
  };

  const updateJoystickFromPointer = (event) => {
    if (!joystickPad) return;
    const rect = joystickPad.getBoundingClientRect();
    const rawX = event.clientX - rect.left - rect.width * 0.5;
    const rawY = event.clientY - rect.top - rect.height * 0.5;
    const radius = getJoystickRadius();
    const length = Math.hypot(rawX, rawY);
    const scale = length > radius && length > 0 ? radius / length : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    joystickVector.set(x / radius, y / radius);
    syncJoystickVisual(x, y);
  };

  const resetJoystick = () => {
    joystickVector.set(0, 0);
    syncJoystickVisual();
  };

  const startJoystickDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    isDraggingJoystick = true;
    activeJoystickPointer = event.pointerId;
    try {
      joystickPad?.setPointerCapture?.(event.pointerId);
    } catch {}
    updateJoystickFromPointer(event);
    canvas.focus({ preventScroll: true });
    event.preventDefault();
    event.stopPropagation();
  };

  const handleJoystickDrag = (event) => {
    if (!isDraggingJoystick) return;
    if (activeJoystickPointer !== undefined && event.pointerId !== activeJoystickPointer) return;
    updateJoystickFromPointer(event);
    event.preventDefault();
    event.stopPropagation();
  };

  const stopJoystickDrag = (event) => {
    if (event?.pointerId !== undefined && activeJoystickPointer !== undefined && event.pointerId !== activeJoystickPointer) return;
    if (activeJoystickPointer !== undefined && joystickPad?.hasPointerCapture?.(activeJoystickPointer)) {
      try {
        joystickPad.releasePointerCapture(activeJoystickPointer);
      } catch {}
    }
    isDraggingJoystick = false;
    activeJoystickPointer = undefined;
    resetJoystick();
  };

  const startLookDrag = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    isDraggingLook = true;
    activeLookPointer = event.pointerId;
    lastLookX = event.clientX;
    lastLookY = event.clientY;
    canvas.focus({ preventScroll: true });
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {}
    canvas.classList.add("is-dragging-look");
    event.preventDefault();
  };

  const stopLookDrag = (event) => {
    if (event?.pointerId !== undefined && activeLookPointer !== undefined && event.pointerId !== activeLookPointer) return;
    if (activeLookPointer !== undefined && canvas.hasPointerCapture?.(activeLookPointer)) {
      try {
        canvas.releasePointerCapture(activeLookPointer);
      } catch {}
    }
    isDraggingLook = false;
    activeLookPointer = undefined;
    canvas.classList.remove("is-dragging-look");
  };

  const handleLookDrag = (event) => {
    if (!isDraggingLook) return;
    const sensitivity = parseFiniteNumber(viewer.dataset.splatMouseSensitivity, 0.00235);
    const fallbackMovementX = event.clientX - lastLookX;
    const fallbackMovementY = event.clientY - lastLookY;
    const movementX = Number.isFinite(event.movementX) && event.movementX !== 0 ? event.movementX : fallbackMovementX;
    const movementY = Number.isFinite(event.movementY) && event.movementY !== 0 ? event.movementY : fallbackMovementY;
    lastLookX = event.clientX;
    lastLookY = event.clientY;
    walkLook.targetYaw -= movementX * sensitivity;
    walkLook.targetPitch -= movementY * sensitivity;
    walkLook.targetPitch = Math.max(-1.45, Math.min(1.45, walkLook.targetPitch));
    event.preventDefault();
  };

  const moveWalkTarget = (delta) => {
    copyVec3(collisionScratchPoint, walkTargetPosition);
    collisionScratchPoint.add(delta);
    copyVec3(walkTargetPosition, constrainWalkPosition(collisionScratchPoint, walkTargetPosition));
  };

  const startMoveDrag = (event) => {
    if (!allowAuxiliaryMouseMove) return;
    if (event.button !== 1 && event.button !== 2) return;
    isDraggingMove = true;
    activeMovePointer = event.pointerId;
    lastMoveX = event.clientX;
    lastMoveY = event.clientY;
    canvas.focus({ preventScroll: true });
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {}
    canvas.classList.add("is-dragging-move");
    event.preventDefault();
  };

  const stopMoveDrag = (event) => {
    if (event?.pointerId !== undefined && activeMovePointer !== undefined && event.pointerId !== activeMovePointer) return;
    if (activeMovePointer !== undefined && canvas.hasPointerCapture?.(activeMovePointer)) {
      try {
        canvas.releasePointerCapture(activeMovePointer);
      } catch {}
    }
    isDraggingMove = false;
    activeMovePointer = undefined;
    canvas.classList.remove("is-dragging-move");
  };

  const handleMoveDrag = (event) => {
    if (!allowAuxiliaryMouseMove) return;
    if (!isDraggingMove) return;
    const fallbackMovementX = event.clientX - lastMoveX;
    const fallbackMovementY = event.clientY - lastMoveY;
    const movementX = Number.isFinite(event.movementX) && event.movementX !== 0 ? event.movementX : fallbackMovementX;
    const movementY = Number.isFinite(event.movementY) && event.movementY !== 0 ? event.movementY : fallbackMovementY;
    lastMoveX = event.clientX;
    lastMoveY = event.clientY;
    setVec3(moveDelta, 0, 0, 0);
    const pointerScale = getPointerMoveScale();
    if (event.shiftKey) {
      addScaledVector(moveDelta, moveUp, -movementY * pointerScale);
    } else {
      updateWalkLookDirection();
      setVec3(walkRight, Math.cos(walkLook.yaw), 0, -Math.sin(walkLook.yaw));
      if (walkRight.lengthSq() > 0) walkRight.normalize();
      addScaledVector(moveDelta, walkRight, -movementX * pointerScale);
      addScaledVector(moveDelta, walkLookDirection, movementY * pointerScale);
    }
    moveWalkTarget(moveDelta);
    event.preventDefault();
  };

  const handlePointerDown = (event) => {
    if (event.button === 1 || event.button === 2) {
      if (allowAuxiliaryMouseMove) startMoveDrag(event);
      event.preventDefault();
      return;
    }
    startLookDrag(event);
  };

  const handlePointerMove = (event) => {
    handleMoveDrag(event);
    handleLookDrag(event);
  };

  const stopPointerDrag = (event) => {
    stopMoveDrag(event);
    stopLookDrag(event);
  };

  const handleWheel = (event) => {
    if (!allowWheelMove) {
      event.preventDefault();
      return;
    }
    if (!currentFrame) return;
    updateWalkLookDirection();
    const normalizedDelta = Math.max(-120, Math.min(120, event.deltaY));
    setVec3(moveDelta, 0, 0, 0);
    addScaledVector(moveDelta, walkLookDirection, -normalizedDelta * getWheelMoveScale());
    moveWalkTarget(moveDelta);
    event.preventDefault();
  };

  const preventCanvasContextMenu = (event) => {
    event.preventDefault();
  };

  const handleKeyDown = (event) => {
    if (event.code === "Escape" && videoPanel && !videoPanel.hidden) {
      closeVideoPanel();
      videoOpen?.focus({ preventScroll: true });
      event.preventDefault();
      return;
    }
    if (event.code === "Escape" && artworkPanel && !artworkPanel.hidden) {
      closeArtworkPanel();
      event.preventDefault();
      return;
    }
    if (!["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) return;
    pressedKeys.add(event.code);
    event.preventDefault();
  };

  const handleKeyUp = (event) => {
    if (!pressedKeys.has(event.code)) return;
    pressedKeys.delete(event.code);
    event.preventDefault();
  };

  const bindWalkControls = () => {
    if (!isWalkMode) return;
    const shouldExposeDebug =
      ["127.0.0.1", "localhost"].includes(window.location.hostname) ||
      new URLSearchParams(window.location.search).has("debug");
    if (shouldExposeDebug) {
      const getDebugState = () => ({
        engine: "playcanvas",
        state: stage.dataset.state,
        frame: currentFrame && {
          radius: currentFrame.radius,
          rawBounds: currentFrame.rawBounds,
          meshPosition: vec3ToArray(currentFrame.meshPosition),
          cameraPosition: vec3ToArray(currentFrame.cameraPosition),
          target: vec3ToArray(currentFrame.target),
        },
        cameraPosition: vec3ToArray(cameraEntity.getPosition()),
        targetCameraPosition: vec3ToArray(walkTargetPosition),
        displayCameraPosition: vec3ToArray(walkDisplayPosition),
        displaySpringVelocity: vec3ToArray(walkDisplaySpringVelocity),
        cameraSpring: viewer.dataset.splatCameraSpring === "true" && {
          smoothTime: parseFiniteNumber(
            viewer.dataset.splatCameraSpringTime,
            parseFiniteNumber(viewer.dataset.splatControlSmoothTime, 0.16),
          ),
          maxSpeed: parseFiniteNumber(viewer.dataset.splatCameraSpringMaxSpeed, Number.POSITIVE_INFINITY),
        },
        walkSpeed: getWalkSpeed(),
        splatBudget: app?.scene?.gsplat?.splatBudget ?? 0,
        lodTransition: app?.scene?.gsplat && {
          updateDistance: app.scene.gsplat.lodUpdateDistance,
          updateAngle: app.scene.gsplat.lodUpdateAngle,
          underfillLimit: app.scene.gsplat.lodUnderfillLimit,
          behindPenalty: app.scene.gsplat.lodBehindPenalty,
        },
        collision: collisionMesh && {
          url: collisionUrl,
          edges: collisionMesh.edges.length,
          vertices: collisionMesh.vertexCount,
          bounds: collisionMesh.bounds,
        },
        walkBounds,
        manualCollision: {
          edges: manualCollisionEdges.length,
          radius: parseFiniteNumber(
            viewer.dataset.splatManualCollisionRadius,
            Math.max(0.02, parseFiniteNumber(viewer.dataset.splatCollisionRadius, 0.14)),
          ),
          ready: viewer.dataset.splatManualCollisionReady === "true",
        },
        wallFill: wallFillEntities.map((entity) => ({
          name: entity.name,
          position: vec3ToArray(entity.getPosition()),
          scale: vec3ToArray(entity.getLocalScale()),
          screen: (() => {
            if (!cameraEntity?.camera) return undefined;
            const screenPosition = new pc.Vec3();
            cameraEntity.camera.worldToScreen(entity.getPosition(), screenPosition);
            return vec3ToArray(screenPosition);
          })(),
        })),
        input: {
          auxiliaryMouseMove: allowAuxiliaryMouseMove,
          wheelMove: allowWheelMove,
        },
        viewpoints: viewpointButtons.length,
        activeViewpoint: viewer.querySelector("[data-splat-viewpoint].is-active")?.dataset.viewpointIndex,
        lookTarget: vec3ToArray(walkLookTarget),
        yaw: walkLook.yaw,
        pitch: walkLook.pitch,
        joystick: [joystickVector.x, joystickVector.y],
        velocity: vec3ToArray(walkCurrentVelocity),
      });
      viewer.__arenderedSplatDebug = getDebugState;
      window.__arenderedSplatDebug = getDebugState;
    }
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", stopPointerDrag);
    canvas.addEventListener("pointercancel", stopPointerDrag);
    canvas.addEventListener("lostpointercapture", stopPointerDrag);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("contextmenu", preventCanvasContextMenu);
    for (const { element } of artworkHotspots) {
      element.addEventListener("click", handleArtworkHotspotClick);
    }
    for (const button of viewpointButtons) {
      button.addEventListener("click", handleViewpointClick);
    }
    videoOpen?.addEventListener("click", openVideoPanel);
    videoClose?.addEventListener("click", handleVideoCloseClick);
    videoPanel?.addEventListener("click", handleVideoPanelClick);
    artistPanel?.addEventListener("touchstart", handleArtistPanelTouchStart, { capture: true, passive: true });
    artistPanel?.addEventListener("touchmove", handleArtistPanelTouchMove, { capture: true, passive: false });
    artistPanel?.addEventListener("touchend", clearArtistPanelTouch);
    artistPanel?.addEventListener("touchcancel", clearArtistPanelTouch);
    artworkPanelClose?.addEventListener("click", handleArtworkCloseClick);
    artworkPanel?.addEventListener("click", handleArtworkPanelClick);
    joystickPad?.addEventListener("pointerdown", startJoystickDrag);
    joystickPad?.addEventListener("pointermove", handleJoystickDrag);
    joystickPad?.addEventListener("pointerup", stopJoystickDrag);
    joystickPad?.addEventListener("pointercancel", stopJoystickDrag);
    joystickPad?.addEventListener("lostpointercapture", stopJoystickDrag);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", stopPointerDrag);
    window.addEventListener("blur", stopJoystickDrag);
  };

  const createSplatAsset = async () => {
    const fileName = defaultUrl.split("?")[0].split("/").pop() || "space.sog";
    if (viewer.dataset.splatFetchFirst !== "true") {
      return new pc.Asset(fileName, "gsplat", { url: defaultUrl, filename: fileName });
    }
    setProgress(0.18, true);
    const response = await fetch(defaultUrl, { cache: "force-cache" });
    if (!response.ok) throw new Error(`SOG request failed: ${response.status}`);
    const contents = await response.arrayBuffer();
    return new pc.Asset(fileName, "gsplat", { url: defaultUrl, filename: fileName, contents });
  };

  const failSplatLoad = (error) => {
    if (disposed) return;
    setProgress(0, false);
    setStatus(viewerText.loadError, "error");
    document.dispatchEvent(new CustomEvent("arendered:viewer-error", { detail: { source: defaultUrl, engine: "playcanvas" } }));
    console.error("PlayCanvas Gaussian splat load failed", error);
  };

  const loadSplat = async () => {
    setStatus(viewerText.preparing, "loading");
    setProgress(0.12, true);
    try {
      splatAsset = await createSplatAsset();
    } catch (error) {
      failSplatLoad(error);
      return;
    }
    if (disposed) return;
    splatAsset.once("load", async () => {
      if (disposed) return;
      splatEntity.addComponent("gsplat", { asset: splatAsset });
      currentFrame = createFrame(splatAsset.resource);
      applyFrame(currentFrame);
      await loadCollisionMesh(currentFrame);
      if (disposed) return;
      if (viewer.dataset.loungeDepthRequested === "true") {
        viewer.classList.add("lounge-viewer--depth");
      }
      setProgress(1, false);
      setStatus(viewerText.ready, "ready");
      document.dispatchEvent(new CustomEvent("arendered:viewer-ready", {
        detail: {
          source: defaultUrl,
          engine: "playcanvas",
          walkSpeed: isWalkMode ? getWalkSpeed() : undefined,
        },
      }));
    });
    splatAsset.once("error", (error) => {
      failSplatLoad(error);
    });
    app.assets.add(splatAsset);
    app.assets.load(splatAsset);
    setProgress(0.28, true);
  };

  try {
    app = new pc.Application(canvas, {
      graphicsDeviceOptions: {
        alpha: false,
        antialias: false,
        powerPreference: "high-performance",
      },
    });
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.scene.ambientLight = new pc.Color(1, 1, 1);
    if (app.scene.gsplat) {
      app.scene.gsplat.splatBudget = Math.max(0, Math.round(parseFiniteNumber(viewer.dataset.splatBudget, 0)));
      app.scene.gsplat.lodUpdateDistance = Math.max(0, parseFiniteNumber(
        viewer.dataset.splatLodUpdateDistance,
        app.scene.gsplat.lodUpdateDistance,
      ));
      app.scene.gsplat.lodUpdateAngle = Math.max(0, parseFiniteNumber(
        viewer.dataset.splatLodUpdateAngle,
        app.scene.gsplat.lodUpdateAngle,
      ));
      app.scene.gsplat.lodUnderfillLimit = Math.max(0, Math.round(parseFiniteNumber(
        viewer.dataset.splatLodUnderfillLimit,
        app.scene.gsplat.lodUnderfillLimit,
      )));
      app.scene.gsplat.lodBehindPenalty = Math.max(1, parseFiniteNumber(
        viewer.dataset.splatLodBehindPenalty,
        app.scene.gsplat.lodBehindPenalty,
      ));
    }

    cameraEntity = new pc.Entity("ARENDERED PlayCanvas Camera");
    cameraEntity.addComponent("camera", {
      clearColor: getThemeClearColor(),
      clearColorBuffer: true,
      fov: parseFiniteNumber(viewer.dataset.splatFov, 55),
      horizontalFov: false,
      nearClip: 0.001,
      farClip: 1000,
    });
    app.root.addChild(cameraEntity);

    splatEntity = new pc.Entity("ARENDERED Gaussian Space");
    splatEntity.setLocalEulerAngles(
      parseFiniteNumber(viewer.dataset.splatRotationX, 0),
      parseFiniteNumber(viewer.dataset.splatRotationY, 0),
      parseFiniteNumber(viewer.dataset.splatRotationZ, 0),
    );
    app.root.addChild(splatEntity);

    resize();
    stageObserver = new ResizeObserver(resize);
    stageObserver.observe(stage);
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize, { passive: true });
    bindWalkControls();
    app.on("update", (deltaSeconds) => {
      if (!isWalkMode || !currentFrame) return;
      updateWalkLook(deltaSeconds);
      updateWalkControls(deltaSeconds);
      updateWalkDisplayPosition(deltaSeconds);
      syncWalkCamera();
      updateArtworkHotspots();
    });
    app.start();
    loadSplat();
  } catch (error) {
    setProgress(0, false);
    setStatus(viewerText.webglError, "error");
    document.dispatchEvent(new CustomEvent("arendered:viewer-error", { detail: { source: defaultUrl, engine: "playcanvas" } }));
    console.error("PlayCanvas Gaussian splat viewer setup failed", error);
  }

  disposeViewer = () => {
    disposed = true;
    window.removeEventListener("resize", resize);
    canvas?.removeEventListener("pointerdown", handlePointerDown);
    canvas?.removeEventListener("pointermove", handlePointerMove);
    canvas?.removeEventListener("pointerup", stopPointerDrag);
    canvas?.removeEventListener("pointercancel", stopPointerDrag);
    canvas?.removeEventListener("lostpointercapture", stopPointerDrag);
    canvas?.removeEventListener("wheel", handleWheel);
    canvas?.removeEventListener("contextmenu", preventCanvasContextMenu);
    for (const { element } of artworkHotspots) {
      element.removeEventListener("click", handleArtworkHotspotClick);
    }
    for (const button of viewpointButtons) {
      button.removeEventListener("click", handleViewpointClick);
    }
    videoOpen?.removeEventListener("click", openVideoPanel);
    videoClose?.removeEventListener("click", handleVideoCloseClick);
    videoPanel?.removeEventListener("click", handleVideoPanelClick);
    artistPanel?.removeEventListener("touchstart", handleArtistPanelTouchStart, { capture: true });
    artistPanel?.removeEventListener("touchmove", handleArtistPanelTouchMove, { capture: true });
    artistPanel?.removeEventListener("touchend", clearArtistPanelTouch);
    artistPanel?.removeEventListener("touchcancel", clearArtistPanelTouch);
    closeVideoPanel();
    clearWallFills();
    artworkPanelClose?.removeEventListener("click", handleArtworkCloseClick);
    artworkPanel?.removeEventListener("click", handleArtworkPanelClick);
    joystickPad?.removeEventListener("pointerdown", startJoystickDrag);
    joystickPad?.removeEventListener("pointermove", handleJoystickDrag);
    joystickPad?.removeEventListener("pointerup", stopJoystickDrag);
    joystickPad?.removeEventListener("pointercancel", stopJoystickDrag);
    joystickPad?.removeEventListener("lostpointercapture", stopJoystickDrag);
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", stopPointerDrag);
    window.removeEventListener("blur", stopJoystickDrag);
    delete viewer.__arenderedSplatDebug;
    stageObserver?.disconnect();
    if (splatAsset) {
      app?.assets?.remove(splatAsset);
      splatAsset.unload();
    }
    app?.destroy();
  };
};

const setupVisibleViewer = () =>
  setupViewer(document.querySelector("[data-gaussian-viewer][data-splat-engine='playcanvas']"));

setupVisibleViewer();
requestAnimationFrame(setupVisibleViewer);
document.addEventListener("arendered:rendered", setupVisibleViewer);
new MutationObserver(setupVisibleViewer).observe(document.getElementById("app"), { childList: true });
window.addEventListener("pagehide", disposeActiveViewer, { once: true });
