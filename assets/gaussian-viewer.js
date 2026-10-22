import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import CameraControls from "camera-controls";

CameraControls.install({ THREE });

let disposeViewer;
let activeViewerElement;
const worldUp = new THREE.Vector3(0, 1, 0);
const viewerHorizontalShift = -0.02;
const viewerVerticalShift = -0.24;

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
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * deltaSeconds));

const dampAngle = (current, target, lambda, deltaSeconds) => {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-lambda * deltaSeconds));
};

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
  const defaultUrl = viewer.dataset.splatUrl;
  const compressedUrl = viewer.dataset.splatCompressedUrl;
  const isPaged = viewer.dataset.splatPaged === "true";
  const hasPrecomputedLod = viewer.dataset.splatPrecomputedLod === "true";
  const isRadAsset = defaultUrl?.toLowerCase().endsWith(".rad") === true;
  const isWalkMode = viewer.dataset.splatMode === "walk";
  const locale = document.documentElement.lang;
  const isKorean = locale === "ko";
  const isJapanese = locale === "ja";
  const viewerText = {
    preparing: isJapanese ? "PLYファイルを準備中" : isKorean ? "PLY 파일을 준비하는 중" : "Preparing PLY file",
    ready: isJapanese ? "準備完了" : isKorean ? "준비됨" : "Ready",
    loadError: isJapanese ? "PLYファイルを読み込めませんでした。" : isKorean ? "PLY 파일을 불러오지 못했습니다." : "The PLY file could not be loaded.",
    webglError: isJapanese
      ? "WebGLを利用できません。ブラウザのハードウェアアクセラレーションを確認してください。"
      : isKorean
        ? "WebGL을 사용할 수 없습니다. 브라우저의 그래픽 가속을 확인하세요."
        : "WebGL is unavailable. Check browser hardware acceleration.",
  };

  let renderer;
  let scene;
  let camera;
  let controls;
  let walkControls;
  let spark;
  let currentMesh;
  let currentFrame;
  let currentRadius = 1;
  let disposed = false;
  let stageObserver;
  let loadGeneration = 0;
  const lookEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const pressedKeys = new Set();
  const walkForward = new THREE.Vector3();
  const walkRight = new THREE.Vector3();
  const walkDelta = new THREE.Vector3();
  const walkTargetVelocity = new THREE.Vector3();
  const walkCurrentVelocity = new THREE.Vector3();
  const walkTargetPosition = new THREE.Vector3();
  const walkDisplayPosition = new THREE.Vector3();
  const walkLookDirection = new THREE.Vector3();
  const walkLookTarget = new THREE.Vector3();
  const joystickVector = new THREE.Vector2();
  const joystickEasedVector = new THREE.Vector2();
  const walkLook = {
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
  };
  let isDraggingLook = false;
  let activeLookPointer;
  let isDraggingJoystick = false;
  let activeJoystickPointer;
  let lastLookX = 0;
  let lastLookY = 0;

  const setStatus = (message, state = "") => {
    stage.dataset.state = state;
    stage.setAttribute("aria-label", message);
  };

  const setProgress = (value, visible = true) => {
    progress.value = Math.max(0, Math.min(1, value));
    progressText.textContent = `${Math.round(progress.value * 100)}%`;
    progressWrap.hidden = !visible;
  };

  const resize = () => {
    if (!renderer || !camera) return;
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const horizontalShift = parseFiniteNumber(viewer.dataset.splatHorizontalShift, viewerHorizontalShift);
    const verticalShift = parseFiniteNumber(viewer.dataset.splatVerticalShift, viewerVerticalShift);
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const basePixelRatio = parseFiniteNumber(viewer.dataset.splatPixelRatio, devicePixelRatio);
    const isCompactViewport = window.matchMedia("(max-width: 768px)").matches;
    const responsivePixelRatio = parseFiniteNumber(
      isCompactViewport ? viewer.dataset.splatMobilePixelRatio : viewer.dataset.splatDesktopPixelRatio,
      basePixelRatio,
    );
    const minPixelRatio = Math.max(0.5, parseFiniteNumber(viewer.dataset.splatPixelRatioMin, 0.72));
    const maxPixelRatio = Math.max(minPixelRatio, parseFiniteNumber(viewer.dataset.splatPixelRatioMax, 2.25));
    renderer.setPixelRatio(Math.max(minPixelRatio, Math.min(responsivePixelRatio, maxPixelRatio)));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.setViewOffset(width, height, width * horizontalShift, height * verticalShift, width, height);
    camera.updateProjectionMatrix();
  };

  const getWalkSpeed = () => {
    return parseFiniteNumber(viewer.dataset.splatWalkSpeed, Math.max(currentRadius * 1.85, 0.82));
  };

  const syncRuntimeMovementAttributes = () => {
    if (isWalkMode) {
      viewer.dataset.splatRuntimeWalkSpeed = getWalkSpeed().toFixed(6);
    } else {
      delete viewer.dataset.splatRuntimeWalkSpeed;
    }
  };

  const applyFrame = (mesh, frame) => {
    currentRadius = frame.radius;
    syncRuntimeMovementAttributes();
    mesh.position.copy(frame.meshPosition);
    mesh.scale.setScalar(frame.meshScale);
    mesh.quaternion.copy(frame.meshQuaternion);
    camera.position.copy(frame.cameraPosition);
    walkTargetPosition.copy(frame.cameraPosition);
    walkDisplayPosition.copy(frame.cameraPosition);
    walkTargetVelocity.set(0, 0, 0);
    walkCurrentVelocity.set(0, 0, 0);
    camera.up.copy(worldUp);
    camera.near = frame.near;
    camera.far = frame.far;
    camera.updateProjectionMatrix();
    if (controls) {
      controls.target.copy(frame.target);
      controls.minDistance = frame.minDistance;
      controls.maxDistance = frame.maxDistance;
      controls.update();
      return;
    }
    camera.lookAt(frame.target);
    lookEuler.setFromQuaternion(camera.quaternion, "YXZ");
    walkLook.pitch = lookEuler.x;
    walkLook.yaw = lookEuler.y;
    walkLook.targetPitch = walkLook.pitch;
    walkLook.targetYaw = walkLook.yaw;
    syncWalkCamera(false);
  };

  const createFrame = (mesh) => {
    mesh.position.set(0, 0, 0);
    const rotation = new THREE.Euler(
      THREE.MathUtils.degToRad(parseFiniteNumber(viewer.dataset.splatRotationX, 0)),
      THREE.MathUtils.degToRad(parseFiniteNumber(viewer.dataset.splatRotationY, 0)),
      THREE.MathUtils.degToRad(parseFiniteNumber(viewer.dataset.splatRotationZ, 0)),
      "XYZ",
    );
    mesh.quaternion.setFromEuler(rotation);
    mesh.updateMatrixWorld(true);
    const useFixedFrame = viewer.dataset.splatFixedFrame === "true";
    const meshScale = parseFiniteNumber(viewer.dataset.splatScale, 1);
    const rawBounds = mesh.getBoundingBox(false);
    const bounds = useFixedFrame
      ? new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1))
      : rawBounds;
    const center = bounds.getCenter(new THREE.Vector3());
    const hasFiniteRawBounds = [
      rawBounds.min.x,
      rawBounds.min.y,
      rawBounds.min.z,
      rawBounds.max.x,
      rawBounds.max.y,
      rawBounds.max.z,
    ].every(Number.isFinite);
    const rawCenter = hasFiniteRawBounds ? rawBounds.getCenter(new THREE.Vector3()) : new THREE.Vector3();
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() * 0.5, 0.1);
    const meshPosition = (useFixedFrame ? rawCenter : center).multiplyScalar(-meshScale);
    const isSpace = viewer.dataset.splatKind === "space";
    const distanceScale = parseFiniteNumber(viewer.dataset.splatDistanceScale, isSpace ? 2.2 : 18);
    const cameraX = parseFiniteNumber(viewer.dataset.splatCameraX, isSpace ? 0.7 : 0.38);
    const cameraY = parseFiniteNumber(viewer.dataset.splatCameraY, isSpace ? 0.22 : 0.18);
    const cameraZ = parseFiniteNumber(viewer.dataset.splatCameraZ, isSpace ? 0.95 : 1.18);
    const targetHeight = parseFiniteNumber(viewer.dataset.splatTargetHeight, isSpace ? 0.04 : 0.38);
    const targetX = parseFiniteNumber(viewer.dataset.splatTargetX, 0);
    const targetZ = parseFiniteNumber(viewer.dataset.splatTargetZ, 0);
    const distance = Math.max(radius * distanceScale, isSpace ? radius * 1.4 : 4.4);
    const cameraPosition = useFixedFrame
      ? new THREE.Vector3(cameraX, cameraY, cameraZ)
      : new THREE.Vector3(distance * cameraX, distance * cameraY, distance * cameraZ);
    const target = useFixedFrame
      ? new THREE.Vector3(targetX, targetHeight, targetZ)
      : new THREE.Vector3(targetX, radius * targetHeight, targetZ);
    return {
      radius,
      meshScale,
      rawBounds: {
        min: rawBounds.min.toArray(),
        max: rawBounds.max.toArray(),
      },
      meshPosition,
      meshQuaternion: mesh.quaternion.clone(),
      cameraPosition,
      target,
      minDistance: Math.max(radius * (isSpace ? 0.02 : 0.08), 0.04),
      maxDistance: Math.max(radius * (isSpace ? 8 : 10), 8),
      near: Math.max(radius / 1000, 0.001),
      far: Math.max(radius * (isSpace ? 16 : 40), 100),
    };
  };

  const frameMesh = (mesh) => {
    currentFrame = createFrame(mesh);
    applyFrame(mesh, currentFrame);
  };

  const clearMesh = (mesh = currentMesh) => {
    if (!mesh) return;
    scene.remove(mesh);
    mesh.dispose?.();
    if (currentMesh === mesh) currentMesh = undefined;
    if (!currentMesh) currentFrame = undefined;
  };

  const loadSplat = async (source) => {
    const generation = ++loadGeneration;
    clearMesh();
    setStatus(viewerText.preparing, "loading");
    setProgress(0, true);

    try {
      const options = typeof source === "string"
        ? await getSplatSourceOptions(source)
        : {
            fileBytes: new Uint8Array(await source.arrayBuffer()),
            fileName: source.name,
          };
      if (disposed || generation !== loadGeneration) return;

      const mesh = new SplatMesh({
        ...options,
        paged: isPaged,
        lod: hasPrecomputedLod || isRadAsset ? false : true,
        maxSh: 3,
        onProgress: (event) => {
          if (!disposed && generation === loadGeneration && event.lengthComputable && event.total > 0) {
            setProgress(event.loaded / event.total, true);
          }
        },
      });
      if (disposed || generation !== loadGeneration) {
        mesh.dispose?.();
        return;
      }
      currentMesh = mesh;
      scene.add(mesh);

      await mesh.initialized;
      if (disposed || generation !== loadGeneration || currentMesh !== mesh) {
        clearMesh(mesh);
        return;
      }
      frameMesh(mesh);
      if (viewer.dataset.loungeDepthRequested === "true") {
        viewer.classList.add("lounge-viewer--depth");
      }
      setProgress(1, false);
      setStatus(viewerText.ready, "ready");
      document.dispatchEvent(new CustomEvent("arendered:viewer-ready", {
        detail: {
          source: defaultUrl,
          walkSpeed: isWalkMode ? getWalkSpeed() : undefined,
        },
      }));
    } catch (error) {
      if (disposed || generation !== loadGeneration) return;
      clearMesh();
      setProgress(0, false);
      setStatus(viewerText.loadError, "error");
      document.dispatchEvent(new CustomEvent("arendered:viewer-error", { detail: { source: defaultUrl } }));
      console.error("Gaussian splat load failed", error);
    }
  };

  const fetchCompressedSplat = async (url, fileName) => {
    if (!("DecompressionStream" in window)) throw new Error("DecompressionStream is unavailable.");
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Compressed PLY request failed: ${response.status}`);
    const total = Number.parseFloat(response.headers.get("content-length") || "0");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("ReadableStream is unavailable.");
    const chunks = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      if (total > 0) setProgress(Math.min(loaded / total, 0.92), true);
    }
    const decompressed = new Blob(chunks)
      .stream()
      .pipeThrough(new DecompressionStream("gzip"));
    const fileBytes = new Uint8Array(await new Response(decompressed).arrayBuffer());
    setProgress(0.96, true);
    return { fileBytes, fileName };
  };

  const getSplatSourceOptions = async (source) => {
    if (!compressedUrl) return { url: source };
    try {
      return await fetchCompressedSplat(compressedUrl, source.split("/").pop() || "capture.ply");
    } catch (error) {
      console.warn("Compressed Gaussian splat failed; falling back to raw PLY.", error);
      return { url: source };
    }
  };

  const updateWalkLookDirection = () => {
    lookEuler.set(walkLook.pitch, walkLook.yaw, 0);
    walkLookDirection.set(0, 0, -1).applyEuler(lookEuler).normalize();
    return walkLookDirection;
  };

  const syncWalkCamera = () => {
    if (!camera || !currentFrame) return;
    const lookDistance = parseFiniteNumber(
      viewer.dataset.splatWalkLookDistance,
      Math.max(currentRadius * 0.24, 1.2),
    );
    updateWalkLookDirection();
    walkLookTarget.copy(walkDisplayPosition).addScaledVector(walkLookDirection, lookDistance);
    if (walkControls) {
      walkControls.setLookAt(
        walkDisplayPosition.x,
        walkDisplayPosition.y,
        walkDisplayPosition.z,
        walkLookTarget.x,
        walkLookTarget.y,
        walkLookTarget.z,
        false,
      );
      walkControls.update(0);
      return;
    }
    camera.position.copy(walkDisplayPosition);
    camera.lookAt(walkLookTarget);
  };

  const updateWalkLook = (deltaSeconds) => {
    if (!camera) return;
    const lookSmoothing = parseFiniteNumber(viewer.dataset.splatLookSmoothing, 18);
    const clampedDelta = Math.min(deltaSeconds, parseFiniteNumber(viewer.dataset.splatLookMaxDelta, 0.08));
    walkLook.yaw = dampAngle(walkLook.yaw, walkLook.targetYaw, lookSmoothing, clampedDelta);
    walkLook.pitch = damp(walkLook.pitch, walkLook.targetPitch, lookSmoothing, clampedDelta);
  };

  const updateWalkDisplayPosition = (deltaSeconds) => {
    const clampedDelta = Math.min(deltaSeconds, parseFiniteNumber(viewer.dataset.splatWalkMaxDelta, 0.12));
    const positionSmoothing = parseFiniteNumber(viewer.dataset.splatPositionSmoothing, 14);
    walkDisplayPosition.lerp(walkTargetPosition, 1 - Math.exp(-positionSmoothing * clampedDelta));
    if (walkDisplayPosition.distanceToSquared(walkTargetPosition) < 0.000001) {
      walkDisplayPosition.copy(walkTargetPosition);
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
    return joystickEasedVector.copy(joystickVector).normalize().multiplyScalar(easedLength);
  };

  const updateWalkControls = (deltaSeconds) => {
    if (!camera || !currentFrame) return;
    walkDelta.set(0, 0, 0);
    updateWalkLookDirection();
    walkForward.copy(walkLookDirection);
    walkForward.y = 0;
    if (walkForward.lengthSq() > 0) walkForward.normalize();
    walkRight.set(1, 0, 0).applyEuler(lookEuler);
    walkRight.y = 0;
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
    if (forwardInput !== 0) walkDelta.addScaledVector(walkForward, forwardInput);
    if (rightInput !== 0) walkDelta.addScaledVector(walkRight, rightInput * strafeScale);
    if (walkDelta.lengthSq() > 1) walkDelta.normalize();

    const speed = getWalkSpeed();
    const hasMovementInput = walkDelta.lengthSq() > 0;
    const acceleration = hasMovementInput
      ? parseFiniteNumber(viewer.dataset.splatWalkAcceleration, 8.8)
      : parseFiniteNumber(viewer.dataset.splatWalkBraking, 7.2);
    const clampedDelta = Math.min(deltaSeconds, parseFiniteNumber(viewer.dataset.splatWalkMaxDelta, 0.12));
    walkTargetVelocity.copy(walkDelta).multiplyScalar(speed);
    walkCurrentVelocity.lerp(walkTargetVelocity, 1 - Math.exp(-acceleration * clampedDelta));
    if (walkCurrentVelocity.lengthSq() < 0.000001 && walkTargetVelocity.lengthSq() === 0) {
      walkCurrentVelocity.set(0, 0, 0);
      return;
    }
    walkTargetPosition.addScaledVector(walkCurrentVelocity, clampedDelta);
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
    walkLook.targetPitch = THREE.MathUtils.clamp(walkLook.targetPitch, -1.45, 1.45);
    event.preventDefault();
  };

  const handleKeyDown = (event) => {
    if (!["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) return;
    pressedKeys.add(event.code);
    event.preventDefault();
  };

  const handleKeyUp = (event) => {
    if (!pressedKeys.has(event.code)) return;
    pressedKeys.delete(event.code);
    event.preventDefault();
  };

  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, canvas });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(document.documentElement.dataset.theme === "light" ? 0xf1f0ed : 0x0a0a0a, 1);
    scene = new THREE.Scene();
    const cameraFov = parseFiniteNumber(viewer.dataset.splatFov, 55);
    camera = new THREE.PerspectiveCamera(cameraFov, 1, 0.001, 1000);
    camera.up.copy(worldUp);
    spark = new SparkRenderer({
      renderer,
      sortRadial: true,
      maxStdDev: parseFiniteNumber(viewer.dataset.splatMaxStdDev, Math.sqrt(8)),
      minAlpha: parseFiniteNumber(viewer.dataset.splatMinAlpha, 0.5 * (1 / 255)),
      blurAmount: parseFiniteNumber(viewer.dataset.splatBlurAmount, 0.3),
      preBlurAmount: parseFiniteNumber(viewer.dataset.splatPreBlurAmount, 0),
      maxPixelRadius: parseFiniteNumber(viewer.dataset.splatMaxPixelRadius, 512),
    });
    scene.add(spark);
    if (!isWalkMode) {
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.screenSpacePanning = true;
      controls.minPolarAngle = 0.05;
      controls.maxPolarAngle = Math.PI - 0.05;
      controls.target.set(0, 0, 0);
    } else {
      walkControls = new CameraControls(camera, canvas);
      walkControls.enabled = false;
      walkControls.smoothTime = parseFiniteNumber(viewer.dataset.splatControlSmoothTime, 0.13);
      walkControls.draggingSmoothTime = parseFiniteNumber(viewer.dataset.splatControlDraggingSmoothTime, 0.045);
      walkControls.restThreshold = parseFiniteNumber(viewer.dataset.splatControlRestThreshold, 0.0008);
    }
    resize();
    stageObserver = new ResizeObserver(resize);
    stageObserver.observe(stage);
    requestAnimationFrame(resize);

    window.addEventListener("resize", resize, { passive: true });
    if (isWalkMode) {
      if (["127.0.0.1", "localhost"].includes(window.location.hostname)) {
        viewer.__arenderedSplatDebug = () => ({
          state: stage.dataset.state,
          frame: currentFrame && {
            radius: currentFrame.radius,
            rawBounds: currentFrame.rawBounds,
            meshPosition: currentFrame.meshPosition.toArray(),
            cameraPosition: currentFrame.cameraPosition.toArray(),
            target: currentFrame.target.toArray(),
          },
          cameraPosition: camera?.position.toArray(),
          targetCameraPosition: walkTargetPosition.toArray(),
          displayCameraPosition: walkDisplayPosition.toArray(),
          walkSpeed: getWalkSpeed(),
          lookTarget: walkLookTarget.toArray(),
          yaw: walkLook.yaw,
          pitch: walkLook.pitch,
          joystick: joystickVector.toArray(),
          velocity: walkCurrentVelocity.toArray(),
        });
      }
      canvas.addEventListener("pointerdown", startLookDrag);
      canvas.addEventListener("pointermove", handleLookDrag);
      canvas.addEventListener("pointerup", stopLookDrag);
      canvas.addEventListener("pointercancel", stopLookDrag);
      canvas.addEventListener("lostpointercapture", stopLookDrag);
      joystickPad?.addEventListener("pointerdown", startJoystickDrag);
      joystickPad?.addEventListener("pointermove", handleJoystickDrag);
      joystickPad?.addEventListener("pointerup", stopJoystickDrag);
      joystickPad?.addEventListener("pointercancel", stopJoystickDrag);
      joystickPad?.addEventListener("lostpointercapture", stopJoystickDrag);
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);
      window.addEventListener("blur", stopLookDrag);
      window.addEventListener("blur", stopJoystickDrag);
    }

    let lastFrameTime = performance.now();
    renderer.setAnimationLoop(() => {
      const frameTime = performance.now();
      const deltaSeconds = (frameTime - lastFrameTime) / 1000;
      lastFrameTime = frameTime;
      if (controls) controls.update();
      if (isWalkMode) {
        updateWalkLook(deltaSeconds);
        updateWalkControls(deltaSeconds);
        updateWalkDisplayPosition(deltaSeconds);
        syncWalkCamera();
      }
      renderer.render(scene, camera);
    });

    loadSplat(defaultUrl);
  } catch (error) {
    setProgress(0, false);
    setStatus(viewerText.webglError, "error");
    document.dispatchEvent(new CustomEvent("arendered:viewer-error", { detail: { source: defaultUrl } }));
    console.error("Gaussian splat viewer setup failed", error);
  }

  disposeViewer = () => {
    disposed = true;
    loadGeneration += 1;
    renderer?.setAnimationLoop(null);
    window.removeEventListener("resize", resize);
    canvas?.removeEventListener("pointerdown", startLookDrag);
    canvas?.removeEventListener("pointermove", handleLookDrag);
    canvas?.removeEventListener("pointerup", stopLookDrag);
    canvas?.removeEventListener("pointercancel", stopLookDrag);
    canvas?.removeEventListener("lostpointercapture", stopLookDrag);
    joystickPad?.removeEventListener("pointerdown", startJoystickDrag);
    joystickPad?.removeEventListener("pointermove", handleJoystickDrag);
    joystickPad?.removeEventListener("pointerup", stopJoystickDrag);
    joystickPad?.removeEventListener("pointercancel", stopJoystickDrag);
    joystickPad?.removeEventListener("lostpointercapture", stopJoystickDrag);
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keyup", handleKeyUp);
    window.removeEventListener("blur", stopLookDrag);
    window.removeEventListener("blur", stopJoystickDrag);
    delete viewer.__arenderedSplatDebug;
    stageObserver?.disconnect();
    controls?.dispose();
    walkControls?.dispose();
    clearMesh();
    if (spark) {
      scene?.remove(spark);
      spark.dispose?.();
      spark = undefined;
    }
    renderer?.dispose();
  };
};

const setupVisibleViewer = () =>
  setupViewer(document.querySelector("[data-gaussian-viewer][data-splat-engine='spark']"));

setupVisibleViewer();
requestAnimationFrame(setupVisibleViewer);
document.addEventListener("arendered:rendered", setupVisibleViewer);
new MutationObserver(setupVisibleViewer).observe(document.getElementById("app"), { childList: true });
window.addEventListener("pagehide", disposeActiveViewer, { once: true });
