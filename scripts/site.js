(() => {
  // allow: SIZE_OK — the legacy static site's route renderer remains self-contained for predictable client-side page swaps.
  const app = document.querySelector("#app");
  const gaussianAssetOverrides = window.ARENDERED_GAUSSIAN_ASSETS || {};
  const keynotePortfolio = Array.isArray(window.KEYNOTE_PORTFOLIO?.projects)
    ? window.KEYNOTE_PORTFOLIO.projects
    : [];
  const brochurePhotographyPortfolio = Array.isArray(window.BROCHURE_PHOTOGRAPHY_PORTFOLIO?.projects)
    ? window.BROCHURE_PHOTOGRAPHY_PORTFOLIO.projects
    : keynotePortfolio;
  const movingImagePortfolio = Array.isArray(window.MOVING_IMAGE_PORTFOLIO?.projects)
    ? window.MOVING_IMAGE_PORTFOLIO.projects
    : [];
  const museumMovingImagePortfolio = movingImagePortfolio.filter((project) => project.key.startsWith("national-"));
  const nonMuseumMovingImagePortfolio = movingImagePortfolio.filter((project) => !project.key.startsWith("national-"));
  const brochureContact = [
    { name: "Heewon Jeong", role: "Director" },
  ];
  const validPages = ["home", "about", "work", "development", "contact", "mosaic", "patternField", "patternField2", "keumsanSog", "loungeRad", "loungeRadLod", "loungeSplat", "loungeSplat35", "floorIphoneOptimized", "floorIphoneFull", "lounge"];
  const routePages = {
    home: "home",
    about: "about",
    portfolio: "work",
    work: "work",
    development: "development",
    contact: "contact",
    mosaic: "mosaic",
    "pattern-field": "patternField",
    "pattern-field-2": "patternField2",
    "pattern-field2": "patternField2",
    pattern: "patternField",
    "260806-keumsan": "keumsanSog",
    "keumsan-sog": "keumsanSog",
    "lounge-rad-chunk": "loungeRad",
    "lounge-rad-lod": "loungeRadLod",
    "lounge-splat": "loungeSplat",
    "lounge-splat-35mm": "loungeSplat35",
    "fourth-floor-iphone-optimized": "floorIphoneOptimized",
    "fourth-floor-iphone": "floorIphoneFull",
    "fourth-floor-iphone-full": "floorIphoneFull",
    "floor-iphone-full": "floorIphoneFull",
    lounge: "lounge",
  };
  const interactiveViewerPages = new Set(["keumsanSog", "loungeRad", "loungeRadLod", "loungeSplat", "loungeSplat35", "floorIphoneOptimized", "floorIphoneFull", "lounge"]);
  const hostedViewerOrigin = "https://arendered.com";
  const isFileProtocol = window.location.protocol === "file:";
  const resolveGaussianAsset = (study, fallbackUrl, fallbackCompressedUrl = "") => {
    const override = gaussianAssetOverrides[study];
    if (typeof override === "string") {
      const url = override.trim();
      return { url: url || fallbackUrl, compressedUrl: "" };
    }
    if (override && typeof override === "object") {
      const url = typeof override.url === "string" ? override.url.trim() : "";
      const compressedUrl = typeof override.compressedUrl === "string" ? override.compressedUrl.trim() : "";
      return {
        url: url || fallbackUrl,
        compressedUrl: compressedUrl || fallbackCompressedUrl,
      };
    }
    return { url: fallbackUrl, compressedUrl: fallbackCompressedUrl };
  };
  const normalizeRouteKey = (value = "") => value.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  const pageFromLocation = () => {
    const hashKey = normalizeRouteKey(window.location.hash.slice(1));
    if (hashKey) return routePages[hashKey] || "home";
    const pathKey = normalizeRouteKey(window.location.pathname);
    return routePages[pathKey] || "home";
  };
  const hrefForPage = (targetPage) => `#${targetPage === "work" ? "portfolio" : targetPage}`;
  let page = pageFromLocation();
  const routeLoader = document.querySelector("[data-route-loader]");
  let routeLoaderStartedAt = 0;
  let routeLoaderTimer;
  let routeLoaderFallbackTimer;
  const routeLoaderMinDuration = 560;
  const routeLoaderFadeDuration = 220;
  const routeLoaderViewerFallbackDuration = 12000;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lenis = typeof window.Lenis === "function" && !reducedMotionQuery.matches && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ? new window.Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 0.86,
      touchMultiplier: 1,
      smoothWheel: true,
      syncTouch: false,
    })
    : null;

  const syncLenisMotionPreference = () => {
    if (!lenis) return;
    if (reducedMotionQuery.matches || interactiveViewerPages.has(page)) lenis.stop();
    else lenis.start();
  };

  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener("change", syncLenisMotionPreference);
  } else if (reducedMotionQuery.addListener) {
    reducedMotionQuery.addListener(syncLenisMotionPreference);
  }

  const scrollBehavior = (immediate = false) =>
    immediate || reducedMotionQuery.matches ? "auto" : "smooth";

  const scrollToTarget = (target, { immediate = false } = {}) => {
    const lenisOptions = immediate ? { immediate: true } : { duration: 0.9 };
    if (typeof target === "number") {
      if (lenis && !reducedMotionQuery.matches) lenis.scrollTo(target, lenisOptions);
      else window.scrollTo({ top: target, behavior: scrollBehavior(immediate) });
      return;
    }
    const element = typeof target === "string" ? document.querySelector(target) : target;
    if (!element) return;
    if (lenis && !reducedMotionQuery.matches) {
      lenis.scrollTo(element, lenisOptions);
      return;
    }
    element.scrollIntoView({ behavior: scrollBehavior(immediate), block: "start" });
  };

  const showRouteLoader = () => {
    if (!routeLoader) return;
    window.clearTimeout(routeLoaderTimer);
    window.clearTimeout(routeLoaderFallbackTimer);
    routeLoader.hidden = false;
    routeLoaderStartedAt = performance.now();
    requestAnimationFrame(() => {
      routeLoader.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-route-loading");
    });
  };

  const hideRouteLoader = () => {
    if (!routeLoader) return;
    window.clearTimeout(routeLoaderTimer);
    window.clearTimeout(routeLoaderFallbackTimer);
    const elapsed = performance.now() - routeLoaderStartedAt;
    const wait = Math.max(0, routeLoaderMinDuration - elapsed);
    routeLoaderTimer = window.setTimeout(() => {
      document.body.classList.remove("is-route-loading");
      routeLoader.setAttribute("aria-hidden", "true");
      routeLoaderTimer = window.setTimeout(() => {
        routeLoader.hidden = true;
      }, routeLoaderFadeDuration);
    }, wait);
  };

  const waitForViewerOrFallback = () => {
    window.clearTimeout(routeLoaderFallbackTimer);
    routeLoaderFallbackTimer = window.setTimeout(hideRouteLoader, routeLoaderViewerFallbackDuration);
  };

  const storage = {
    get(key, fallback) {
      try {
        return localStorage.getItem(key) || fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
  };

  const supportedLanguages = new Set(["ko", "en", "ja"]);
  const storedLanguage = storage.get("arendered-language", "en");
  let language = supportedLanguages.has(storedLanguage) ? storedLanguage : "en";
  let theme = storage.get("arendered-theme", "light") === "dark" ? "dark" : "light";
  let eventController;
  let sparkViewerModuleRequested = false;
  let playCanvasViewerModuleRequested = false;
  let mosaicStudioModuleRequested = false;
  let patternFieldModuleRequested = false;
  let disposePatternField2 = () => {};

  const copy = {
    ko: {
      nav: {
        about: "소개",
        work: "포트폴리오",
        development: "연구",
        contact: "연락처",
        lounge: "Lounge",
      },
      pageNames: {
        home: "홈",
        about: "소개",
        work: "포트폴리오",
        development: "연구",
        contact: "연락처",
        mosaic: "모자이크 스튜디오",
        patternField: "패턴 필드",
        patternField2: "패턴 필드 2 / p5.js",
        keumsanSog: "260806_Keumsan",
        keumsanSogTest2: "260806_Keumsan_Test2",
        sceneSog: "Scene (SOG)",
        loungeRad: "Lounge (RAD 청크)",
        loungeRadLod: "Lounge (RAD + LoD 스트리밍)",
        loungeSplat: "Lounge (SPLAT+26mm)",
        loungeSplat35: "Lounge (SPLAT+35mm)",
        floorIphoneOptimized: "Fourth Floor iPhone (Optimized)",
        floorIphoneFull: "Fourth Floor iPhone",
        floorIphone: "Fourth Floor iPhone compressed version",
        lounge: "Lounge",
        loungeDepth: "Lounge monochrome",
      },
      home: {
        title: "ARENDERED",
        leadLines: [
          "Creative production",
          "Video, Photography, Media Art",
        ],
        workLink: "포트폴리오 보기",
      },
      about: {
        title: "소개",
        profile: "ARENDERED",
        items: [
          { text: "ARENDERED는 영상, 사진, 미디어 아트를 만드는 크리에이티브 프로덕션 스튜디오입니다." },
          { text: "기업, 건축가, 아티스트와 협업하며 아이디어를 이미지로 구현합니다. 기획과 연출부터 촬영, 제작까지 프로젝트의 성격에 맞는 시각 언어를 만듭니다." },
          { text: "We render imagination." },
        ],
      },
      work: {
        eyebrow: "DIRECTOR'S PORTFOLIO",
        title: "포트폴리오",
        featured: "선별 포트폴리오",
        photography: "사진 포트폴리오",
        movingImage: "영상 포트폴리오",
        records: "브로슈어에 수록된 작업",
      },
      development: {
        eyebrow: "3DGS / Graphic Archive",
        title: "연구",
        viewerTitle: "Lounge",
        viewerHint: "드래그하여 회전 · 스크롤하여 줌 · 우클릭 드래그하여 이동",
        viewerCue: "3D 탐색",
        keumsanSogTitle: "260806_Keumsan",
        keumsanSogNote: "",
        keumsanSogCredit: "",
        keumsanSogDescription: "",
        keumsanSogCanvasLabel: "260806_Keumsan 가우시안 스플랫 자유시점 뷰어",
        keumsanSogTest2Title: "260806_Keumsan_Test2",
        keumsanSogTest2CanvasLabel: "260806_Keumsan_Test2 벽체 테스트 가우시안 스플랫 자유시점 뷰어",
        sceneSogTitle: "Scene (SOG)",
        sceneSogNote: "",
        sceneSogCredit: "",
        sceneSogDescription: "",
        sceneSogCanvasLabel: "Scene SOG 가우시안 스플랫 자유시점 뷰어",
        floorOptimizedTitle: "Fourth Floor iPhone (Optimized)",
        floorOptimizedNote: "",
        floorOptimizedCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorOptimizedDescription: "",
        floorOptimizedCanvasLabel: "Fourth Floor iPhone optimized Gaussian splat free-view viewer",
        radChunkTitle: "Lounge (RAD Chunk)",
        radChunkNote: "",
        radChunkCredit: "",
        radChunkDescription: "",
        radChunkCanvasLabel: "Lounge RAD chunk Gaussian splat free-view viewer",
        radLodTitle: "Lounge (RAD + LoD Streaming)",
        radLodNote: "",
        radLodCredit: "",
        radLodDescription: "",
        radLodCanvasLabel: "Lounge RAD precomputed LoD Gaussian splat free-view viewer",
        openSplatTitle: "Lounge (SPLAT+26mm)",
        openSplatNote: "",
        openSplatCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openSplatDescription: "",
        openSplatCanvasLabel: "Lounge SPLAT 26mm free-view Gaussian splat viewer",
        openSplat35Title: "Lounge (SPLAT+35mm)",
        openSplat35Note: "",
        openSplat35Credit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openSplat35Description: "",
        openSplat35CanvasLabel: "Lounge SPLAT 35mm free-view Gaussian splat viewer",
        sourceCameraInfo: (sourceCamera) => `Source Camera : ${sourceCamera}`,
        viewerCameraInfo: ({ focalLength, verticalFov }) => `Viewer Camera : ${focalLength} / vertical FOV ${verticalFov}`,
        floorFullTitle: "Fourth Floor iPhone",
        floorFullNote: "",
        floorFullCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorFullDescription: "",
        floorFullCanvasLabel: "Fourth Floor iPhone 가우시안 스플랫 자유시점 뷰어",
        floorTitle: "Fourth Floor iPhone compressed version",
        floorNote: "",
        floorCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorDescription: "",
        floorCanvasLabel: "Fourth Floor iPhone 가우시안 스플랫 자유시점 뷰어",
        openTitle: "Lounge",
        openNote: "",
        openCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openDescription: "",
        openAction: "Open Viewer",
        depthTitle: "Lounge monochrome",
        depthNote: "",
        depthCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        depthDescription: "",
        depthAction: "Open Viewer",
        loungeArtistTitle: "Artist",
        loungeVideoTitle: "Video",
        artworkInfoTitle: "Artwork",
        artworkClose: "Close",
        keumsanArtist: {
          title: "홍성용 작가 소개",
          paragraphs: [
            "저는 한국의 미술작가 홍성용입니다. 제 작업은 기억과 시간에 대한 이야기에서 출발합니다. 사람들과 어울리며 함께 공유한 소중한 시간들이 쉽게 잊히지 않기를 바라는 마음은, 영원히 붙잡아 둘 수 없는 시간에 대한 안타까움으로 이어집니다. 우리는 저마다의 방식으로 특별한 기억을 간직하고 보존하려 하는데, 저는 이러한 과정을 ‘박제된 기억’이라는 개념으로 기록합니다.",
            "박제된 기억은 단순히 과거를 보관하는 행위가 아닙니다. 그것은 사람과 장소, 특정한 순간들이 사라지지 않도록 붙잡아 두는 행위이자, 기억을 현재로 소환하는 매개체이자 오브제입니다. 이 과정에서 저는 표면과 재료에 깊은 관심을 기울입니다. 제 작업에서 표면은 단순히 외적인 형태를 넘어, 기억이 머물고 시간이 축적되는 공간입니다.",
            "이러한 주제를 구현하는 주재료는 한국의 전통 재료인 옻칠입니다. 옻칠은 매우 견고하여 오랜 시간 대상을 보호할 수 있을 뿐만 아니라, 한국과 아시아의 오랜 역사와 문화를 담고 있는 매개체이기도 합니다. 특히 겹겹이 쌓이는 옻칠의 층은 기억이 축적되는 과정과 완벽하게 닮아 있습니다.",
            "결국 저의 작업은 이처럼 옻칠이라는 재료적 특성을 빌려, 기억과 행복, 그리고 사라져가는 감정의 흔적들을 붙잡고 보존하는 일입니다. 겹겹의 시간 속에서 변화하고 깊어지는 기억의 모습을 시각화하는 것, 그것이 제가 예술을 통해 이루고자 하는 이야기입니다.",
          ],
          links: [
            { label: "홈페이지", url: "https://artistsyhong.artspoon.io/ko" },
            { label: "아트워크", url: "https://artistsyhong.artspoon.io/artworks" },
            { label: "CV", url: "https://artistsyhong.artspoon.io/cv" },
            { label: "About", url: "https://artistsyhong.artspoon.io/about" },
          ],
        },
        loungeInfo: "원형 패널 또는 WASD로 공간을 빠르게 이동하고, 마우스를 누른 상태로 드래그해 시선을 조절합니다.",
        loungeControls: "드래그 이동",
        loungeBack: "Back",
        loungePointer: "캔버스를 클릭한 상태로 드래그하면 시점이 바뀝니다. WASD 키로 공간 안을 이동합니다.",
        loading: "PLY 파일을 불러오는 중",
        ready: "준비됨",
        reset: "시점 초기화",
        canvasLabel: "Lounge 가우시안 스플랫 자유시점 뷰어",
        monochromeCanvasLabel: "Lounge monochrome 가우시안 스플랫 자유시점 뷰어",
        error: "PLY 파일을 불러오지 못했습니다.",
      },
      contact: {
        eyebrow: "STUDIO DIRECTORY",
        title: "연락처",
        team: "팀",
        email: "이메일",
        roles: {
          Director: "디렉터",
          "Sound Director": "사운드 디렉터",
        },
      },
      language: "언어",
      languageChoice: "한국어",
      korean: "한국어",
      english: "English",
      japanese: "日本語",
      openLanguage: "언어 메뉴 열기",
      closeLanguage: "언어 메뉴 닫기",
      openMenu: "메뉴 열기",
      closeMenu: "메뉴 닫기",
      themeDark: "다크 모드로 전환",
      themeLight: "라이트 모드로 전환",
      skip: "본문으로 건너뛰기",
      mainNavigation: "주요 탐색",
      homeLabel: "ARENDERED 홈",
    },
    en: {
      nav: {
        about: "About",
        work: "Portfolio",
        development: "Development",
        contact: "Contact",
        lounge: "Lounge",
      },
      pageNames: {
        home: "Home",
        about: "About",
        work: "Portfolio",
        development: "Development",
        contact: "Contact",
        mosaic: "Mosaic Studio",
        patternField: "Pattern Field",
        patternField2: "Pattern Field 2 / p5.js",
        keumsanSog: "260806_Keumsan",
        keumsanSogTest2: "260806_Keumsan_Test2",
        sceneSog: "Scene (SOG)",
        loungeRad: "Lounge (RAD Chunk)",
        loungeRadLod: "Lounge (RAD + LoD Streaming)",
        loungeSplat: "Lounge (SPLAT+26mm)",
        loungeSplat35: "Lounge (SPLAT+35mm)",
        floorIphoneOptimized: "Fourth Floor iPhone (Optimized)",
        floorIphoneFull: "Fourth Floor iPhone",
        floorIphone: "Fourth Floor iPhone compressed version",
        lounge: "Lounge",
        loungeDepth: "Lounge monochrome",
      },
      home: {
        title: "ARENDERED",
        leadLines: [
          "Creative production",
          "Video, Photography, Media Art",
        ],
        workLink: "View Portfolio",
      },
      about: {
        title: "About",
        profile: "ARENDERED",
        items: [
          { text: "ARENDERED is a creative production studio making video, photography, and media art." },
          { text: "We work with companies, architects, and artists to render ideas into images. From creative direction to filming and production, we shape a visual language for each project." },
          { text: "We render imagination." },
        ],
      },
      work: {
        eyebrow: "DIRECTOR'S PORTFOLIO",
        title: "Portfolio",
        featured: "Selected portfolio",
        photography: "Photography portfolio",
        movingImage: "Video portfolio",
        records: "Selected work from the brochure",
      },
      development: {
        eyebrow: "3DGS / Graphic Archive",
        title: "Development",
        viewerTitle: "Lounge",
        viewerHint: "Drag to orbit · scroll to zoom · right-drag to pan",
        viewerCue: "3D orbit",
        keumsanSogTitle: "260806_Keumsan",
        keumsanSogNote: "",
        keumsanSogCredit: "",
        keumsanSogDescription: "",
        keumsanSogCanvasLabel: "260806_Keumsan free-view Gaussian splat viewer",
        keumsanSogTest2Title: "260806_Keumsan_Test2",
        keumsanSogTest2CanvasLabel: "260806_Keumsan_Test2 wall-fill test free-view Gaussian splat viewer",
        sceneSogTitle: "Scene (SOG)",
        sceneSogNote: "",
        sceneSogCredit: "",
        sceneSogDescription: "",
        sceneSogCanvasLabel: "Scene SOG free-view Gaussian splat viewer",
        floorOptimizedTitle: "Fourth Floor iPhone (Optimized)",
        floorOptimizedNote: "",
        floorOptimizedCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorOptimizedDescription: "",
        floorOptimizedCanvasLabel: "Fourth Floor iPhone optimized Gaussian splat free-view viewer",
        radChunkTitle: "Lounge (RAD Chunk)",
        radChunkNote: "",
        radChunkCredit: "",
        radChunkDescription: "",
        radChunkCanvasLabel: "Lounge RAD chunk Gaussian splat free-view viewer",
        radLodTitle: "Lounge (RAD + LoD Streaming)",
        radLodNote: "",
        radLodCredit: "",
        radLodDescription: "",
        radLodCanvasLabel: "Lounge RAD precomputed LoD Gaussian splat free-view viewer",
        openSplatTitle: "Lounge (SPLAT+26mm)",
        openSplatNote: "",
        openSplatCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openSplatDescription: "",
        openSplatCanvasLabel: "Lounge SPLAT 26mm free-view Gaussian splat viewer",
        openSplat35Title: "Lounge (SPLAT+35mm)",
        openSplat35Note: "",
        openSplat35Credit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openSplat35Description: "",
        openSplat35CanvasLabel: "Lounge SPLAT 35mm free-view Gaussian splat viewer",
        sourceCameraInfo: (sourceCamera) => `Source Camera : ${sourceCamera}`,
        viewerCameraInfo: ({ focalLength, verticalFov }) => `Viewer Camera : ${focalLength} / vertical FOV ${verticalFov}`,
        floorFullTitle: "Fourth Floor iPhone",
        floorFullNote: "",
        floorFullCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorFullDescription: "",
        floorFullCanvasLabel: "Fourth Floor iPhone free-view Gaussian splat viewer",
        floorTitle: "Fourth Floor iPhone compressed version",
        floorNote: "",
        floorCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorDescription: "",
        floorCanvasLabel: "Fourth Floor iPhone free-view Gaussian splat viewer",
        openTitle: "Lounge",
        openNote: "",
        openCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openDescription: "",
        openAction: "Open Viewer",
        depthTitle: "Lounge monochrome",
        depthNote: "",
        depthCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        depthDescription: "",
        depthAction: "Open Viewer",
        loungeArtistTitle: "Artist",
        loungeVideoTitle: "Video",
        artworkInfoTitle: "Artwork",
        artworkClose: "Close",
        keumsanArtist: {
          title: "Artist Statement",
          paragraphs: [
            "I am Sungyong Hong, a visual artist based in South Korea. My work begins with stories of memory and time. My desire to preserve the precious moments shared with others from fading away stems from a poignant awareness of time, which can never be held onto forever. As people strive in their own ways to keep and preserve special memories, I record this process through the concept of ‘preserved memory.’",
            "A preserved memory is far more than a simple act of achieving the past. It is an act of holding onto people, places, and specific moments so they do not vanish, serving as a medium and an object that summons memory back into the present. Throughout this process, I maintain a deep fascination with surfaces and materials. In my work, the surface transcends mere external form; it is a space where memories dwell and time accumulates.",
            "The primary material through which I embody this theme is Ottchil (traditional Korean lacquer). I use Ottchil because of its exceptional durability. Ottchil protects objects over long periods, and is known for presenting embodiment of the long history and culture of Korea and Asia. In particular, the layers of Ottchil built up one upon another closely mirror the process by which memories accumulate over time.",
            "Ultimately, my work borrows the material characteristics of Ottchil to capture and preserve memories, happiness, and the traces of fading emotions. Visualizing the evolving and deepening visage of memory amidst layers of time is the story I seek to tell through my art.",
          ],
          links: [
            { label: "Homepage", url: "https://artistsyhong.artspoon.io/ko" },
            { label: "Artworks", url: "https://artistsyhong.artspoon.io/artworks" },
            { label: "CV", url: "https://artistsyhong.artspoon.io/cv" },
            { label: "About", url: "https://artistsyhong.artspoon.io/about" },
          ],
        },
        loungeInfo: "Move quickly with the circular panel or WASD, then hold and drag the mouse to look around.",
        loungeControls: "Drag to move",
        loungeBack: "Back",
        loungePointer: "Hold and drag on the canvas to change direction. Use WASD to move through the space.",
        loading: "Loading PLY file",
        ready: "Ready",
        reset: "Reset view",
        canvasLabel: "Lounge free-view Gaussian splat viewer",
        monochromeCanvasLabel: "Lounge monochrome free-view Gaussian splat viewer",
        error: "The PLY file could not be loaded.",
      },
      contact: {
        eyebrow: "STUDIO DIRECTORY",
        title: "Contact",
        team: "Team",
        email: "Email",
        roles: {
          Director: "Director",
          "Sound Director": "Sound Director",
        },
      },
      language: "Language",
      languageChoice: "English",
      korean: "한국어",
      english: "English",
      japanese: "日本語",
      openLanguage: "Open language menu",
      closeLanguage: "Close language menu",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      themeDark: "Switch to dark mode",
      themeLight: "Switch to light mode",
      skip: "Skip to content",
      mainNavigation: "Main navigation",
      homeLabel: "ARENDERED home",
    },
    ja: {
      nav: {
        about: "紹介",
        work: "ポートフォリオ",
        development: "研究",
        contact: "連絡先",
        lounge: "Lounge",
      },
      pageNames: {
        home: "ホーム",
        about: "紹介",
        work: "ポートフォリオ",
        development: "研究",
        contact: "連絡先",
        mosaic: "モザイク・スタジオ",
        patternField: "パターン・フィールド",
        patternField2: "Pattern Field 2 / p5.js",
        keumsanSog: "260806_Keumsan",
        keumsanSogTest2: "260806_Keumsan_Test2",
        sceneSog: "Scene (SOG)",
        loungeRad: "Lounge (RAD チャンク)",
        loungeRadLod: "Lounge (RAD + LoD ストリーミング)",
        loungeSplat: "Lounge (SPLAT+26mm)",
        loungeSplat35: "Lounge (SPLAT+35mm)",
        floorIphoneOptimized: "Fourth Floor iPhone (Optimized)",
        floorIphoneFull: "Fourth Floor iPhone",
        floorIphone: "Fourth Floor iPhone compressed version",
        lounge: "Lounge",
        loungeDepth: "Lounge monochrome",
      },
      home: {
        title: "ARENDERED",
        leadLines: [
          "Creative production",
          "Video, Photography, Media Art",
        ],
        workLink: "ポートフォリオを見る",
      },
      about: {
        title: "紹介",
        profile: "ARENDERED",
        items: [
          { text: "ARENDEREDは、映像・写真・メディアアートを制作するクリエイティブプロダクションスタジオです。" },
          { text: "企業、建築家、アーティストと協働し、アイデアをイメージにします。企画・演出から撮影・制作まで、プロジェクトに合った視覚表現をつくります。" },
          { text: "We render imagination." },
        ],
      },
      work: {
        eyebrow: "ディレクター・ポートフォリオ",
        title: "ポートフォリオ",
        featured: "セレクテッド・ポートフォリオ",
        photography: "写真ポートフォリオ",
        movingImage: "映像ポートフォリオ",
        records: "ブロシュア収録作品",
      },
      development: {
        eyebrow: "3DGS / Graphic Archive",
        title: "研究",
        viewerTitle: "Lounge",
        viewerHint: "ドラッグで回転 · スクロールでズーム · 右ドラッグで移動",
        viewerCue: "3D操作",
        keumsanSogTitle: "260806_Keumsan",
        keumsanSogNote: "",
        keumsanSogCredit: "",
        keumsanSogDescription: "",
        keumsanSogCanvasLabel: "260806_Keumsan ガウシアンスプラット自由視点ビューア",
        keumsanSogTest2Title: "260806_Keumsan_Test2",
        keumsanSogTest2CanvasLabel: "260806_Keumsan_Test2 壁面テスト ガウシアンスプラット自由視点ビューア",
        sceneSogTitle: "Scene (SOG)",
        sceneSogNote: "",
        sceneSogCredit: "",
        sceneSogDescription: "",
        sceneSogCanvasLabel: "Scene SOG ガウシアンスプラット自由視点ビューア",
        floorOptimizedTitle: "Fourth Floor iPhone (Optimized)",
        floorOptimizedNote: "",
        floorOptimizedCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorOptimizedDescription: "",
        floorOptimizedCanvasLabel: "Fourth Floor iPhone optimized Gaussian splat free-view viewer",
        radChunkTitle: "Lounge (RAD チャンク)",
        radChunkNote: "",
        radChunkCredit: "",
        radChunkDescription: "",
        radChunkCanvasLabel: "Lounge RAD チャンク・ガウシアンスプラット自由視点ビューア",
        radLodTitle: "Lounge (RAD + LoD ストリーミング)",
        radLodNote: "",
        radLodCredit: "",
        radLodDescription: "",
        radLodCanvasLabel: "Lounge RAD 事前計算 LoD ガウシアンスプラット自由視点ビューア",
        openSplatTitle: "Lounge (SPLAT+26mm)",
        openSplatNote: "",
        openSplatCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openSplatDescription: "",
        openSplatCanvasLabel: "Lounge SPLAT 26mm free-view Gaussian splat viewer",
        openSplat35Title: "Lounge (SPLAT+35mm)",
        openSplat35Note: "",
        openSplat35Credit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openSplat35Description: "",
        openSplat35CanvasLabel: "Lounge SPLAT 35mm free-view Gaussian splat viewer",
        sourceCameraInfo: (sourceCamera) => `Source Camera : ${sourceCamera}`,
        viewerCameraInfo: ({ focalLength, verticalFov }) => `Viewer Camera : ${focalLength} / vertical FOV ${verticalFov}`,
        floorFullTitle: "Fourth Floor iPhone",
        floorFullNote: "",
        floorFullCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorFullDescription: "",
        floorFullCanvasLabel: "Fourth Floor iPhone ガウシアンスプラット自由視点ビューア",
        floorTitle: "Fourth Floor iPhone compressed version",
        floorNote: "",
        floorCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        floorDescription: "",
        floorCanvasLabel: "Fourth Floor iPhone ガウシアンスプラット自由視点ビューア",
        openTitle: "Lounge",
        openNote: "",
        openCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        openDescription: "",
        openAction: "Open Viewer",
        depthTitle: "Lounge monochrome",
        depthNote: "",
        depthCredit: "Source : NVIDIA PhysicalAI-Robotics-NuRec · License : CC BY 4.0",
        depthDescription: "",
        depthAction: "Open Viewer",
        loungeArtistTitle: "Artist",
        loungeVideoTitle: "Video",
        artworkInfoTitle: "Artwork",
        artworkClose: "Close",
        keumsanArtist: {
          title: "Artist Statement",
          paragraphs: [
            "I am Sungyong Hong, a visual artist based in South Korea. My work begins with stories of memory and time. My desire to preserve the precious moments shared with others from fading away stems from a poignant awareness of time, which can never be held onto forever. As people strive in their own ways to keep and preserve special memories, I record this process through the concept of ‘preserved memory.’",
            "A preserved memory is far more than a simple act of achieving the past. It is an act of holding onto people, places, and specific moments so they do not vanish, serving as a medium and an object that summons memory back into the present. Throughout this process, I maintain a deep fascination with surfaces and materials. In my work, the surface transcends mere external form; it is a space where memories dwell and time accumulates.",
            "The primary material through which I embody this theme is Ottchil (traditional Korean lacquer). I use Ottchil because of its exceptional durability. Ottchil protects objects over long periods, and is known for presenting embodiment of the long history and culture of Korea and Asia. In particular, the layers of Ottchil built up one upon another closely mirror the process by which memories accumulate over time.",
            "Ultimately, my work borrows the material characteristics of Ottchil to capture and preserve memories, happiness, and the traces of fading emotions. Visualizing the evolving and deepening visage of memory amidst layers of time is the story I seek to tell through my art.",
          ],
          links: [
            { label: "Homepage", url: "https://artistsyhong.artspoon.io/ko" },
            { label: "Artworks", url: "https://artistsyhong.artspoon.io/artworks" },
            { label: "CV", url: "https://artistsyhong.artspoon.io/cv" },
            { label: "About", url: "https://artistsyhong.artspoon.io/about" },
          ],
        },
        loungeInfo: "円形パネルまたはWASDで素早く移動し、マウスを押したままドラッグして視線を操作します。",
        loungeControls: "ドラッグ移動",
        loungeBack: "Back",
        loungePointer: "キャンバスをクリックしたままドラッグすると視点が変わります。WASDで空間内を移動します。",
        loading: "PLYファイルを読み込み中",
        ready: "準備完了",
        reset: "視点をリセット",
        canvasLabel: "Lounge ガウシアンスプラット自由視点ビューア",
        monochromeCanvasLabel: "Lounge monochrome ガウシアンスプラット自由視点ビューア",
        error: "PLYファイルを読み込めませんでした。",
      },
      contact: {
        eyebrow: "STUDIO DIRECTORY",
        title: "連絡先",
        team: "チーム",
        email: "メール",
        roles: {
          Director: "ディレクター",
          "Sound Director": "サウンドディレクター",
        },
      },
      language: "言語",
      languageChoice: "日本語",
      korean: "한국어",
      english: "English",
      japanese: "日本語",
      openLanguage: "言語メニューを開く",
      closeLanguage: "言語メニューを閉じる",
      openMenu: "メニューを開く",
      closeMenu: "メニューを閉じる",
      themeDark: "ダークモードに切り替え",
      themeLight: "ライトモードに切り替え",
      skip: "本文へ移動",
      mainNavigation: "メインナビゲーション",
      homeLabel: "ARENDERED ホーム",
    },
  };

  const navItems = ["about", "work", "development", "contact"];

  const icon = (name) => {
    const paths = {
      moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
      sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>',
      menu: '<path d="M4 7h16M4 12h16M4 17h16"></path>',
      chevron: '<path d="m7 10 5 5 5-5"></path>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
    };
    return `<svg class="icon icon--${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  };

  const escapeHTML = (value) =>
    String(value ?? "").replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );

  const keumsanArtworks = [
    { title: "거북이", caption: "캔버스에 옻칠기법 · 31.8x31.8 · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-01.jpg" },
    { title: "꽃", caption: "캔버스에 옻칠기법 · 31.8x31.8 · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-02.jpg" },
    { title: "롤라스케이트", caption: "캔버스에 옻칠기법 · 31.8x31.8 · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-03.jpg" },
    { title: "박제된 기억 No.612-007", caption: "캔버스에 옻칠기법 · 50x50cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-04.jpg" },
    { title: "박제된 기억 No.612-008", caption: "캔버스에 옻칠기법 · 50x50cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-05.jpg" },
    { title: "박제된 기억 No. 625-013", caption: "캔버스에 옻칠기법 · 60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-06.jpg" },
    { title: "박제된 기억 No.610-005", caption: "캔버스에 옻칠기법 · 45.4x45.4cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-07.jpg" },
    { title: "박제된 기억 No.612-009", caption: "50x50cm · 캔버스 위에 옻칠기법 · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-08.jpg" },
    { title: "박제된 기억 No.612-010", caption: "캔버스에 옻칠기법 · 50x50cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-09.jpg" },
    { title: "박제된 기억 No.612-011", caption: "캔버스에 옻칠기법 · 50x50cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-10.jpg" },
    { title: "박제된 기억 No.620-012", caption: "캔버스에 옻칠기법 · 60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-11.jpg" },
    { title: "박제된 기억 No.620-013", caption: "캔버스에 옻칠기법 · 60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-12.jpg" },
    { title: "박제된 기억 No.620-014", caption: "캔버스에 옻칠기법 · 60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-13.jpg" },
    { title: "박제된 기억 No.620-015", caption: "캔버스에 옻칠기법 · 60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-14.jpg" },
    { title: "박제된 기억 No.620-016", caption: "캔버스에 옻칠기법 · 50x50cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-15.jpg" },
    { title: "박제된 기억 No.620-017", caption: "캔버스에 옻칠기법 · 50x50cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-16.jpg" },
    { title: "박제된 기억 No.620-018", caption: "캔버스에 옻칠기법 · 50x72.7cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-17.jpg" },
    { title: "박제된 기억 No.620-019", caption: "캔버스에 옻칠기법 · 50x72.7cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-18.jpg" },
    { title: "박제된 기억 No.650-001 캔버스에 옻칠기법", caption: "116.8x91cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-19.jpg" },
    { title: "박제된 기억-가족", caption: "캔버스에 옻칠기법 · 50x50cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-20.jpg" },
    { title: "박제된 기억-곰돌이 인형 _또또_", caption: "캔버스에 옻칠기법 · 116.8x91cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-21.jpg" },
    { title: "박제된 기억-시카고 네이비 피어2", caption: "캔버스에 옻칠기법 · 60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-22.jpg" },
    { title: "박제된 기억-시카고 네이비피어", caption: "캔버스에 옻칠기법 · 116.8x91cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-23.jpg" },
    { title: "박제된 기억-시카고 다운타운", caption: "60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-24.jpg" },
    { title: "박제된 기억-시카고 피자", caption: "캔버스에 옻칠기법 · 60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-25.jpg" },
    { title: "박제된 기억-영국 브라이튼", caption: "캔버스에 옻칠기법 · 50x72.7cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-26.jpg" },
    { title: "박제된 기억-이태원 우사단", caption: "캔버스에 옻칠기법 · 105x142cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-27.jpg" },
    { title: "박제된 기억-일본 이나게", caption: "캔버스에 옻칠기법 · 116.8x91cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-28.jpg" },
    { title: "박제된 기억-째즈 프렌즈", caption: "캔버스에 옻칠기법 · 50x72.7cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-29.jpg" },
    { title: "박제된 기억-케냐 나이로비", caption: "캔버스에 옻칠기법 · 50x50cm · 2025", image: "assets/development/keumsan-artworks/keumsan-artwork-30.jpg" },
    { title: "박제된 기억-케냐 나이로비", caption: "캔버스에 옻칠기법 · 50x50cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-31.jpg" },
    { title: "박제된 기억-케냐 로슬린", caption: "캔버스에 옻칠기법 · 116.8x91cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-32.jpg" },
    { title: "박제된 기억-호주 아틀리에", caption: "캔버스에 옻칠기법 · 65.1x65.1cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-33.jpg" },
    { title: "박제된 기억-Jacob", caption: "캔버스에 옻칠기법 · 60.6x60.6cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-34.jpg" },
    { title: "삐약이", caption: "캔버스에 옻칠기법 · 31.8x31.8 · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-35.jpg" },
    { title: "아프리카 코끼리", caption: "캔버스에 옻칠기법 · 31.8x31.8 · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-36.jpg" },
    { title: "앵무새", caption: "캔버스에 옻칠기법 · 31.8x31.8 · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-37.jpg" },
    { title: "엠버서더 부페", caption: "캔버스에 옻칠기법 · 45.4x45.4cm · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-38.jpg" },
    { title: "헤라클레스", caption: "캔버스에 옻칠기법 · 31.8x31.8 · 2026", image: "assets/development/keumsan-artworks/keumsan-artwork-39.jpg" },
    { title: "Memory Souvenir No.512-001", caption: "50x50cm · 캔버스 위에 옻칠기법 · 2025", image: "assets/development/keumsan-artworks/keumsan-artwork-40.jpg" },
    { title: "Memory Souvenir No.512-002", caption: "캔버스에 옻칠기법 · 50x50cm · 2025", image: "assets/development/keumsan-artworks/keumsan-artwork-41.jpg" },
    { title: "Memory Souvenir No.512-005", caption: "캔버스에 옻칠기법 · 50x50cm · 2025", image: "assets/development/keumsan-artworks/keumsan-artwork-42.jpg" },
    { title: "Memory Souvenir No.512-006", caption: "50x50cm · 캔버스 위에 옻칠기법 · 2025", image: "assets/development/keumsan-artworks/keumsan-artwork-43.jpg" },
  ];

  const keumsanArtworkPosition = (index) => {
    const walls = [
      { count: 13, x: 30.6, zStart: 10, zEnd: 50, yRows: [3.2, 5.2, 7.2] },
      { count: 12, x: -8.6, zStart: 2, zEnd: 38, yRows: [3.2, 5.2, 7.2] },
      { count: 10, z: 58.4, xStart: -4, xEnd: 28, yRows: [3.4, 5.6] },
      { count: 8, z: 67.4, xStart: 8, xEnd: 36, yRows: [3.4, 5.6] },
    ];
    let offset = index;
    for (const wall of walls) {
      if (offset >= wall.count) {
        offset -= wall.count;
        continue;
      }
      const rows = wall.yRows.length;
      const columns = Math.ceil(wall.count / rows);
      const row = Math.floor(offset / columns);
      const column = offset % columns;
      const fraction = columns <= 1 ? 0.5 : column / (columns - 1);
      return {
        x: wall.x ?? wall.xStart + (wall.xEnd - wall.xStart) * fraction,
        y: wall.yRows[row] ?? wall.yRows[wall.yRows.length - 1],
        z: wall.z ?? wall.zStart + (wall.zEnd - wall.zStart) * fraction,
      };
    }
    return { x: 0, y: 4, z: 0 };
  };

  const keumsanArtworkDimensions = (caption) => {
    const match = String(caption ?? "").match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    if (!match) return { width: 50, height: 50 };
    return { width: Number(match[1]), height: Number(match[2]) };
  };

  const keumsanArtworkViewpoint = (artworkIndex) => {
    const position = keumsanArtworkPosition(artworkIndex);
    const eyeY = Math.max(2.9, position.y - 0.55);
    const targetY = Math.max(2.7, position.y - 0.2);
    if (position.x > 20) {
      return {
        position: { x: position.x - 6.4, y: eyeY, z: position.z },
        target: { x: position.x + 0.8, y: targetY, z: position.z },
      };
    }
    if (position.x < -2) {
      return {
        position: { x: position.x + 6.4, y: eyeY, z: position.z },
        target: { x: position.x - 0.8, y: targetY, z: position.z },
      };
    }
    return {
      position: { x: position.x, y: eyeY, z: position.z - 6.4 },
      target: { x: position.x, y: targetY, z: position.z + 0.8 },
    };
  };

  const keumsanArtworkViewpoints = keumsanArtworks
    .map((_, artworkIndex) => ({
      artworkIndex,
      artworkPosition: keumsanArtworkPosition(artworkIndex),
      viewpoint: keumsanArtworkViewpoint(artworkIndex),
    }));

  const renderKeumsanViewpointControls = () => `
          <nav class="lounge-viewer__viewpoints" aria-label="Artwork viewpoints">
            <div class="lounge-viewer__viewpoint-track">
              ${keumsanArtworkViewpoints.map((entry, index) => {
                const label = String(index + 1).padStart(2, "0");
                return `
                <button
                  class="lounge-viewer__viewpoint"
                  type="button"
                  data-splat-viewpoint
                  data-viewpoint-index="${index}"
                  data-viewpoint-x="${entry.viewpoint.position.x}"
                  data-viewpoint-y="${entry.viewpoint.position.y}"
                  data-viewpoint-z="${entry.viewpoint.position.z}"
                  data-viewpoint-target-x="${entry.viewpoint.target.x}"
                  data-viewpoint-target-y="${entry.viewpoint.target.y}"
                  data-viewpoint-target-z="${entry.viewpoint.target.z}"
                  aria-label="Artwork viewpoint ${label}">
                  ${label}
                </button>`;
              }).join("")}
            </div>
          </nav>`;

  const renderKeumsanArtworkLayer = (c) => `
          <div class="lounge-viewer__artwork-layer" data-splat-artwork-layer aria-label="${escapeHTML(c.development.artworkInfoTitle)}">
            ${keumsanArtworks.map((artwork, index) => {
              const position = keumsanArtworkPosition(index);
              const dimensions = keumsanArtworkDimensions(artwork.caption);
              return `
              <button
                class="lounge-viewer__artwork-hotspot"
                type="button"
                data-splat-artwork-hotspot
                data-artwork-x="${position.x}"
                data-artwork-y="${position.y}"
                data-artwork-z="${position.z}"
                data-artwork-width="${dimensions.width}"
                data-artwork-height="${dimensions.height}"
                data-artwork-title="${escapeHTML(artwork.title)}"
                data-artwork-caption="${escapeHTML(artwork.caption)}"
                data-artwork-image="${escapeHTML(artwork.image)}"
                aria-label="${escapeHTML(`${artwork.title}${artwork.caption ? `, ${artwork.caption}` : ""}`)}">
              </button>`;
            }).join("")}
          </div>
          <aside class="lounge-viewer__artwork-panel" data-splat-artwork-panel hidden role="dialog" aria-modal="true" aria-labelledby="lounge-artwork-title" aria-live="polite">
            <div class="lounge-viewer__artwork-dialog">
              <button class="lounge-viewer__artwork-close" type="button" data-splat-artwork-close aria-label="${escapeHTML(c.development.artworkClose)}"><span aria-hidden="true">×</span></button>
              <img class="lounge-viewer__artwork-image" data-splat-artwork-image alt="" hidden>
              <div class="lounge-viewer__artwork-caption">
                <h2 id="lounge-artwork-title" data-splat-artwork-title></h2>
                <p data-splat-artwork-caption></p>
              </div>
            </div>
          </aside>`;

  const sharedRenderSpecs = [
    "Render Desktop : 0.82 · ≈1574×886 @1920×1080",
    "Render Mobile : 1.0 · ≈390×844 @390×844",
  ];
  const sceneSogRenderSpecs = [
    "Render Desktop : 0.72 · ≈1382×778 @1920×1080",
    "Render Mobile : 1.0 · ≈390×844 @390×844",
  ];
  const developmentSpecs = {
    keumsanSog: [
      "Engine : PlayCanvas",
      "File : .sog · 80.7 MB",
      "Storage : GitHub Pages",
      "Splats : 5,967,760 source",
      "SH Bands : 3",
      "Source Camera : Unknown",
      "Viewer Camera : 26mm / vertical FOV 50°",
      "Anti-Alias : off",
      ...sceneSogRenderSpecs,
      "Splat Budget : 3,000,000 cap over source splats",
      "Spring Camera : on · smoothTime 0.18 · maxSpeed 16",
      "WASD Speed : 4.05",
      "Camera Delta Clamp : 0.06",
      "Input : WASD + left-drag look · artwork hotspot click · auxiliary mouse move off",
      "Artwork Hotspots : 43 works",
      "Movement Collision : visual white-wall guards · 4 short segments · radius 1.6",
    ],
    keumsanSogTest2: [
      "Engine : PlayCanvas",
      "File : .sog · 80.7 MB",
      "Storage : GitHub Pages",
      "Splats : 5,967,760 source",
      "SH Bands : 3",
      "Source Camera : Unknown",
      "Viewer Camera : 26mm / vertical FOV 50°",
      "Anti-Alias : off",
      ...sceneSogRenderSpecs,
      "Splat Budget : 3,000,000 cap over source splats",
      "Spring Camera : on · smoothTime 0.18 · maxSpeed 16",
      "WASD Speed : 4.05",
      "Camera Delta Clamp : 0.06",
      "Input : WASD + left-drag look · auxiliary mouse move off",
      "Wall Fill Test : doorway-sized warm-white infill panel + edge trim · collision segment on",
    ],
    sceneSog: [
      "Engine : PlayCanvas",
      "File : .sog · 57.6 MB",
      "Storage : GitHub Pages",
      "Splats : 4,985,224",
      "Source Camera : Unknown",
      "Viewer Camera : 26mm / vertical FOV 50°",
      "Anti-Alias : off",
      ...sceneSogRenderSpecs,
      "Splat Budget : 3,000,000 cap over source splats",
    ],
    loungeSplat: [
      "Engine : Three.js + Spark",
      "File : .splat · 27.9 MB",
      "Storage : GitHub Pages",
      "Splats : 870,958",
      "Source Camera : Nikon Z7 · 14-30mm f/4 @14mm",
      "Viewer Camera : 26mm / vertical FOV 50°",
      "Anti-Alias : off",
      ...sharedRenderSpecs,
      "Splat Budget : none",
    ],
    loungeSplat35: [
      "Engine : Three.js + Spark",
      "File : .splat · 27.9 MB",
      "Storage : GitHub Pages",
      "Splats : 870,958",
      "Source Camera : Nikon Z7 · 14-30mm f/4 @14mm",
      "Viewer Camera : 35mm / vertical FOV 37.8°",
      "Anti-Alias : off",
      ...sharedRenderSpecs,
      "Splat Budget : none",
    ],
    floorIphoneOptimized: [
      "Engine : Three.js + Spark",
      "File : .spz · 18.0 MB",
      "Storage : GitHub Pages",
      "Splats : 862,035",
      "Source Camera : iPhone 13 Pro · 13mm f/1.8",
      "Viewer Camera : 25mm / vertical FOV 52°",
      "Anti-Alias : off",
      ...sharedRenderSpecs,
      "Splat Budget : none",
      "LoD : precomputed 65% from Fourth Floor PLY",
    ],
    floorIphoneFull: [
      "Engine : PlayCanvas",
      "File : .ply · 81.1 MB",
      "Storage : GitHub Pages",
      "Splats : 1,323,405",
      "Source Camera : iPhone 13 Pro · 13mm f/1.8",
      "Viewer Camera : 25mm / vertical FOV 52°",
      "Anti-Alias : off",
      ...sharedRenderSpecs,
      "Splat Budget : none",
    ],
    floorIphone: [
      "Engine : PlayCanvas",
      "File : .ply · 85.0 MB",
      "Storage : GitHub Pages",
      "Splats : 360,000",
      "Source Camera : iPhone 13 Pro · 13mm f/1.8",
      "Viewer Camera : 25mm / vertical FOV 52°",
      "Anti-Alias : off",
      ...sharedRenderSpecs,
      "Splat Budget : none",
    ],
    lounge: [
      "Engine : PlayCanvas",
      "File : .ply · 53.7 MB",
      "Storage : GitHub Pages",
      "Splats : 876,652",
      "Source Camera : Nikon Z7 · 14-30mm f/4 @14mm",
      "Viewer Camera : 26mm / vertical FOV 50°",
      "Anti-Alias : off",
      ...sharedRenderSpecs,
      "Splat Budget : none",
    ],
    loungeDepth: [
      "Engine : PlayCanvas",
      "File : .ply + monochrome CSS filter · 53.7 MB",
      "Storage : GitHub Pages",
      "Splats : 876,652",
      "Source Camera : Nikon Z7 · 14-30mm f/4 @14mm",
      "Viewer Camera : 26mm / vertical FOV 50°",
      "Anti-Alias : off",
      ...sharedRenderSpecs,
      "Splat Budget : none",
    ],
  };

  const developmentSpecLine = (line) => {
    const parts = String(line).split(" : ");
    if (parts.length < 2) return `<span>${escapeHTML(line)}</span>`;
    const label = parts.shift();
    return `<span><b>${escapeHTML(label)}</b> : ${escapeHTML(parts.join(" : "))}</span>`;
  };

  const developmentSpecBlock = (study) =>
    `<span class="development-card__specs">${(developmentSpecs[study] || [])
      .map(developmentSpecLine)
      .join("")}</span>`;

  const sourceCreditText = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return "";
    return /(?:\bSource\b|\bLicense\b|\bCC\b|출처|소스|ライセンス)/i.test(text) ? text : "";
  };

  const developmentSourceCredit = (value) => {
    const text = sourceCreditText(value);
    return text ? `<span class="development-card__credit">${escapeHTML(text)}</span>` : "";
  };

 const image = ({ src, alt, eager = false, index, group }) =>
   `<img src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="${eager ? "eager" : "lazy"}" decoding="async"${eager ? ' fetchpriority="high"' : ""}${group ? ` data-art-group="${escapeHTML(group)}"` : ""}${Number.isInteger(index) ? ` data-media-index="${index}"` : ""}>`;

 const navigation = (c) =>
    navItems
      .map(
        (key) =>
          `<a class="site-nav__link" href="${hrefForPage(key)}"${page === key ? ' aria-current="page"' : ""}>${escapeHTML(c.nav[key])}</a>`,
      )
      .join("");

  const languageMenu = (c) => `
    <div class="language-menu">
      <button class="language-menu__trigger" type="button" data-action="language-menu" aria-label="${c.openLanguage}" title="${c.language}" aria-haspopup="menu" aria-controls="language-menu-panel" aria-expanded="false">
        <span class="language-menu__label">${c.languageChoice}</span>${icon("chevron")}
      </button>
      <div class="language-menu__panel" id="language-menu-panel" role="menu" aria-label="${c.language}" hidden>
        <button class="language-menu__option" type="button" role="menuitemradio" data-language="ko" aria-checked="${language === "ko"}">${c.korean}</button>
        <button class="language-menu__option" type="button" role="menuitemradio" data-language="en" aria-checked="${language === "en"}">${c.english}</button>
        <button class="language-menu__option" type="button" role="menuitemradio" data-language="ja" aria-checked="${language === "ja"}">${c.japanese}</button>
      </div>
    </div>`;

  const sharedChrome = (c) => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const themeLabel = nextTheme === "dark" ? c.themeDark : c.themeLight;
    return `
      <header class="site-header" id="top">
        <a class="brand brand--header" href="#home" aria-label="${c.homeLabel}"${page === "home" ? ' aria-current="page"' : ""}><strong>ARENDERED</strong></a>
        <nav class="site-nav" id="site-nav" aria-label="${c.mainNavigation}">${navigation(c)}</nav>
        <div class="header-actions">
          <button class="icon-button mobile-menu-button" type="button" data-action="menu" aria-controls="site-nav" aria-expanded="false" aria-label="${c.openMenu}" title="${c.openMenu}">${icon("menu")}</button>
          <div class="header-preferences">
            <button class="icon-button theme-button" type="button" data-action="theme" aria-label="${themeLabel}" title="${themeLabel}">${icon(theme === "dark" ? "sun" : "moon")}</button>
            ${languageMenu(c)}
          </div>
        </div>
      </header>`;
  };

  const homePage = (c) => {
    const leadLines = Array.isArray(c.home.leadLines) ? c.home.leadLines : [c.home.lead];
    const portfolioPreview = "assets/video-stills/cropped/national-palace--Pk4WEJ3gM8.jpg";
    return `
      <main class="page page--home" id="main" tabindex="-1" aria-label="${c.pageNames.home}">
        <section class="home-landing" aria-labelledby="page-title">
          <div class="home-landing__copy">
            <h1 id="page-title">${c.home.title}</h1>
            <p class="home-landing__lead">${leadLines.map((line) => `<span>${escapeHTML(line)}</span>`).join("")}</p>
          </div>
          <nav class="home-landing__links" aria-label="${c.pageNames.home}">
            <a class="home-preview-link home-preview-link--portfolio" href="#portfolio">
              <span class="home-preview-link__label">Portfolio</span>
              <span class="home-preview-link__media">
                <span class="home-preview-link__image-frame home-preview-link__image-frame--video">${image({
                  src: portfolioPreview,
                  alt: "Blooming Hwarot Prologue thumbnail",
                  eager: true,
                })}</span>
              </span>
            </a>
          </nav>
        </section>
      </main>`;
  };

  const mosaicPage = (c) => {
    const labels = language === "ko"
      ? {
          brandTitle: "Mosaic Motif Generator",
          brandSubtitle: "하나의 전통 문양으로 장소의 기억을 구성합니다.",
          back: "← ARENDERED / 홈",
          input: "입력",
          image: "랜드마크 사진",
          imageHint: "이미지를 올리거나 주요 명소를 선택하세요.",
          motif: "문양 심볼",
          motifHint: "한 개의 문양으로 모자이크를 만듭니다.",
          dropImage: "이미지를 놓거나 파일 선택",
          dropMotif: "문양 / 로고를 놓거나 파일 선택",
          reset: "기본값 사용",
          motion: "모션",
          motifMotion: "문양 모션",
          fieldMotion: "이미지 필드",
          fieldHint: "물방울 중심은 프리뷰를 클릭해 정합니다.",
          visual: "비주얼",
          resolution: "그리드 크기",
          speed: "재생 속도",
          breath: "크기 변화",
          rotation: "회전",
          opacity: "불투명도",
          color: "색상 혼합",
          contrast: "명암",
          pause: "일시정지",
          resetAnim: "모션 초기화",
          full: "전체 화면",
          export: "프리뷰 저장",
          record: "08초 영상 녹화",
          stopRecord: "녹화 중지",
          download: "WEBM 다운로드",
          preview: "라이브 프리뷰",
          controls: "컨트롤",
          upload: "업로드",
          useDefault: "기본값 사용",
          exportHint: "현재 프레임을 PNG로 저장",
          circleMotif: "원형 점",
          lotusMotif: "단청 연화문",
          logoOneMotif: "로고 샘플 01",
          logoTwoMotif: "로고 샘플 02",
          logoThreeMotif: "로고 샘플 03",
          logoFourMotif: "로고 샘플 04",
          samarkandOneMotif: "사마르칸트 패턴 1",
          samarkandTwoMotif: "사마르칸트 패턴 2",
          samarkandThreeMotif: "사마르칸트 패턴 3",
          fileHint: "JPG, PNG, WEBP",
          motifFileHint: "SVG, PNG, JPG",
          motifPresets: "MOTIF",
          output: "출력",
          resetAll: "리셋",
          randomize: "랜덤",
          loadSettings: "불러오기",
          saveSettings: "저장",
          controlActions: "프로젝트 설정",
          cohesion: "군집 결속도",
          phaseDelay: "시간차",
          variation: "개별 변주",
          spinSpeed: "회전 속도",
          spread: "신호 확산",
          local: "브라우저 안에서만 작동하는 로컬 작업실",
          canvasLabel: "하나의 문양으로 풍경을 구성하는 모자이크",
          cells: "1024 CELLS / 32 × 32",
          defaultImage: "광화문",
          defaultImageMeta: "기본 이미지 · 537 × 537 px",
          defaultMotif: "원형 점 / 기본 문양",
          defaultMotifMeta: "하나의 문양 · SVG 벡터",
          landmarkLibrary: "주요 명소 선택",
          korea: "한국",
          samarkand: "사마르칸트",
          note: "각 셀은 하나의 문양만 사용하며, 크기·색·투명도로 이미지를 구성합니다.",
        }
      : language === "ja" ? {
          brandTitle: "モザイク・モチーフ・ジェネレーター",
          brandSubtitle: "ひとつの伝統文様で場所の記憶を構成します。",
          back: "← ARENDERED / ホーム",
          input: "入力",
          image: "ランドマーク写真",
          imageHint: "画像をアップロードするか、名所を選んでください。",
          motif: "モチーフシンボル",
          motifHint: "ひとつのモチーフでモザイクを作ります。",
          dropImage: "画像をドロップまたはファイルを選択",
          dropMotif: "モチーフ / ロゴをドロップまたはファイルを選択",
          reset: "デフォルトを使用",
          motion: "モーション",
          motifMotion: "モーション",
          fieldMotion: "イメージフィールド",
          fieldHint: "水滴の中心はプレビューをクリックして設定します。",
          visual: "ビジュアル",
          resolution: "グリッドサイズ",
          speed: "再生速度",
          breath: "サイズ変化",
          rotation: "回転",
          opacity: "不透明度",
          color: "カラー",
          contrast: "コントラスト",
          pause: "一時停止",
          resetAnim: "モーションをリセット",
          full: "全画面",
          export: "プレビューを保存",
          record: "08秒を録画",
          stopRecord: "録画を停止",
          download: "WEBMをダウンロード",
          preview: "ライブプレビュー",
          controls: "コントロール",
          upload: "アップロード",
          useDefault: "デフォルトを使用",
          exportHint: "現在のフレームをPNGで保存",
          circleMotif: "円形ドット",
          lotusMotif: "丹青蓮華文",
          logoOneMotif: "ロゴサンプル 01",
          logoTwoMotif: "ロゴサンプル 02",
          logoThreeMotif: "ロゴサンプル 03",
          logoFourMotif: "ロゴサンプル 04",
          samarkandOneMotif: "サマルカンドパターン 1",
          samarkandTwoMotif: "サマルカンドパターン 2",
          samarkandThreeMotif: "サマルカンドパターン 3",
          fileHint: "JPG, PNG, WEBP",
          motifFileHint: "SVG, PNG, JPG",
          motifPresets: "MOTIF",
          output: "出力",
          resetAll: "リセット",
          randomize: "ランダム",
          loadSettings: "読み込み",
          saveSettings: "保存",
          controlActions: "プロジェクト設定",
          cohesion: "群れの結束",
          phaseDelay: "位相差",
          variation: "個体差",
          spinSpeed: "回転速度",
          spread: "信号の拡散",
          local: "ブラウザ内だけで動作するローカルスタジオ",
          canvasLabel: "ひとつのモチーフで風景を構成するモザイク",
          cells: "1024 CELLS / 32 × 32",
          defaultImage: "光化門",
          defaultImageMeta: "デフォルト画像 · 537 × 537 px",
          defaultMotif: "円形ドット / モナリザフィールド",
          defaultMotifMeta: "ひとつのモチーフ · SVGベクター",
          landmarkLibrary: "主要名所を選択",
          korea: "韓国",
          samarkand: "サマルカンド",
          note: "各セルはひとつのモチーフだけを使用し、サイズ・色・透明度で画像を構成します。",
        }
      : {
          brandTitle: "Mosaic Motif Generator",
          brandSubtitle: "Turn landmarks into art with a single traditional motif.",
          back: "← ARENDERED / HOME",
          input: "INPUT",
          image: "Landmark Photo",
          imageHint: "Upload or choose a major landmark.",
          motif: "Motif Symbol",
          motifHint: "Choose a single motif to build the mosaic.",
          dropImage: "Drop an image or choose a file",
          dropMotif: "Drop a motif / logo or choose a file",
          reset: "Use default",
          motion: "MOTION",
          motifMotion: "Motif motion",
          fieldMotion: "Image field",
          fieldHint: "Click the preview to set the ripple origin.",
          visual: "VISUAL",
          resolution: "Grid size",
          speed: "Playback speed",
          breath: "Motif size",
          rotation: "Rotation",
          opacity: "Opacity",
          color: "Color blend",
          contrast: "Contrast",
          pause: "PAUSE",
          resetAnim: "Reset motion",
          full: "Fullscreen",
          export: "Export Preview",
          record: "Record 08 sec",
          stopRecord: "STOP RECORDING",
          download: "Download WEBM",
          preview: "LIVE PREVIEW",
          controls: "CONTROLS",
          upload: "UPLOAD",
          useDefault: "USE DEFAULT",
          exportHint: "Save the current frame as PNG",
          circleMotif: "Circular dot",
          lotusMotif: "Dancheong lotus",
          logoOneMotif: "Logo sample 01",
          logoTwoMotif: "Logo sample 02",
          logoThreeMotif: "Logo sample 03",
          logoFourMotif: "Logo sample 04",
          samarkandOneMotif: "Samarkand pattern 01",
          samarkandTwoMotif: "Samarkand pattern 02",
          samarkandThreeMotif: "Samarkand pattern 03",
          fileHint: "JPG, PNG, WEBP",
          motifFileHint: "SVG, PNG, JPG",
          motifPresets: "MOTIF",
          output: "OUTPUT",
          resetAll: "RESET",
          randomize: "RANDOM",
          loadSettings: "LOAD",
          saveSettings: "SAVE",
          controlActions: "Project settings",
          cohesion: "Group cohesion",
          phaseDelay: "Phase delay",
          variation: "Local variation",
          spinSpeed: "Spin rate",
          spread: "Signal spread",
          local: "A local studio that stays in your browser",
          canvasLabel: "32 by 32 grid of one motif forming a larger image",
          cells: "1024 CELLS / 32 × 32",
          defaultImage: "GWANGHWAMUN",
          defaultImageMeta: "default field · 537 × 537 px",
          defaultMotif: "CIRCULAR DOT / MONALISA FIELD",
          defaultMotifMeta: "one motif · SVG vector",
          landmarkLibrary: "Choose a landmark",
          korea: "KOREA",
          samarkand: "SAMARKAND",
          note: "Each grid cell uses one motif; size, color, and opacity compose the larger image.",
        };
    const landmarkLibrary = [
      {
        key: "gwanghwamun",
        region: "korea",
        src: "assets/mosaic/palace-source-2026-08-27.png",
        name: { ko: "광화문", en: "Gwanghwamun", ja: "光化門" },
        meta: { ko: "서울 · 대한민국", en: "Seoul · Korea", ja: "ソウル · 韓国" },
        dimensions: "537 × 537 px",
      },
      {
        key: "changdeokgung",
        region: "korea",
        src: "assets/mosaic/landmarks/flat/landmark-changdeokgung-flat.webp",
        name: { ko: "창덕궁", en: "Changdeokgung Palace", ja: "昌徳宮" },
        meta: { ko: "서울 · 대한민국", en: "Seoul · Korea", ja: "ソウル · 韓国" },
        dimensions: "720 × 720 px · flat",
      },
      {
        key: "bulguksa",
        region: "korea",
        src: "assets/mosaic/landmarks/flat/landmark-bulguksa-flat.webp",
        name: { ko: "불국사", en: "Bulguksa Temple", ja: "仏国寺" },
        meta: { ko: "경주 · 대한민국", en: "Gyeongju · Korea", ja: "慶州 · 韓国" },
        dimensions: "720 × 720 px · flat",
      },
      {
        key: "hwaseong",
        region: "korea",
        src: "assets/mosaic/landmarks/flat/landmark-hwaseong-flat.webp",
        name: { ko: "수원화성", en: "Hwaseong Fortress", ja: "水原華城" },
        meta: { ko: "수원 · 대한민국", en: "Suwon · Korea", ja: "水原 · 韓国" },
        dimensions: "720 × 720 px · flat",
      },
      {
        key: "sungnyemun",
        region: "korea",
        src: "assets/mosaic/landmarks/flat/landmark-sungnyemun-flat.webp",
        name: { ko: "숭례문", en: "Sungnyemun Gate", ja: "崇礼門" },
        meta: { ko: "서울 · 대한민국", en: "Seoul · Korea", ja: "ソウル · 韓国" },
        dimensions: "720 × 720 px · flat",
      },
      {
        key: "registan",
        region: "samarkand",
        src: "assets/mosaic/landmarks/flat/landmark-registan-flat.webp",
        name: { ko: "레기스탄 광장", en: "Registan Square", ja: "レギスタン広場" },
        meta: { ko: "사마르칸트 · 우즈베키스탄", en: "Samarkand · Uzbekistan", ja: "サマルカンド · ウズベキスタン" },
        dimensions: "720 × 720 px · flat",
      },
      {
        key: "gur-e-amir",
        region: "samarkand",
        src: "assets/mosaic/landmarks/flat/landmark-gur-e-amir-flat.webp",
        name: { ko: "구르-에 아미르 영묘", en: "Gur-e Amir Mausoleum", ja: "グル・エミール廟" },
        meta: { ko: "사마르칸트 · 우즈베키스탄", en: "Samarkand · Uzbekistan", ja: "サマルカンド · ウズベキスタン" },
        dimensions: "720 × 720 px · flat",
      },
      {
        key: "bibi-khanym",
        region: "samarkand",
        src: "assets/mosaic/landmarks/flat/landmark-bibi-khanym-flat.webp",
        name: { ko: "비비하눔 모스크", en: "Bibi-Khanym Mosque", ja: "ビビハニム・モスク" },
        meta: { ko: "사마르칸트 · 우즈베키스탄", en: "Samarkand · Uzbekistan", ja: "サマルカンド · ウズベキスタン" },
        dimensions: "720 × 720 px · flat",
      },
      {
        key: "shah-i-zinda",
        region: "samarkand",
        src: "assets/mosaic/landmarks/flat/landmark-shah-i-zinda-flat.webp",
        name: { ko: "샤히진다", en: "Shah-i-Zinda", ja: "シャーヒ・ズィンダ" },
        meta: { ko: "사마르칸트 · 우즈베키스탄", en: "Samarkand · Uzbekistan", ja: "サマルカンド · ウズベキスタン" },
        dimensions: "720 × 720 px · flat",
      },
      {
        key: "ulugh-beg",
        region: "samarkand",
        src: "assets/mosaic/landmarks/flat/landmark-ulugh-beg-flat.webp",
        name: { ko: "울루그벡 천문대", en: "Ulugh Beg Observatory", ja: "ウルグ・ベク天文台" },
        meta: { ko: "사마르칸트 · 우즈베키스탄", en: "Samarkand · Uzbekistan", ja: "サマルカンド · ウズベキスタン" },
        dimensions: "720 × 720 px · flat",
      },
    ];
    const landmarkCardMarkup = (landmark) => {
      const name = language === "ko" ? landmark.name.ko : language === "ja" ? landmark.name.ja : landmark.name.en;
      const meta = language === "ko" ? landmark.meta.ko : language === "ja" ? landmark.meta.ja : landmark.meta.en;
      return `<button class="mosaic-landmark-button${landmark.key === "gwanghwamun" ? " is-selected" : ""}" type="button" data-mosaic-landmark="${landmark.key}" data-mosaic-landmark-region="${landmark.region}" data-mosaic-landmark-src="${landmark.src}" data-mosaic-landmark-name="${escapeHTML(name)}" data-mosaic-landmark-meta="${escapeHTML(`${meta} · ${landmark.dimensions}`)}" aria-pressed="${landmark.key === "gwanghwamun"}">
        <img src="${landmark.src}" alt="${escapeHTML(name)}" loading="lazy" decoding="async">
        <span class="mosaic-landmark-button__name">${escapeHTML(name)}</span>
        <small class="mosaic-landmark-button__meta">${escapeHTML(meta)}</small>
      </button>`;
    };
    const landmarkGroupMarkup = (region) => landmarkLibrary.filter((landmark) => landmark.region === region).map(landmarkCardMarkup).join("");
    return `
      <main class="mosaic-studio-page" id="main" tabindex="-1" aria-label="${escapeHTML(c.pageNames.mosaic)}" data-mosaic-studio data-mosaic-default-image-name="${escapeHTML(labels.defaultImage)}" data-mosaic-default-image-meta="${escapeHTML(labels.defaultImageMeta)}" data-mosaic-default-motif-name="${escapeHTML(labels.defaultMotif)}" data-mosaic-default-motif-meta="${escapeHTML(labels.defaultMotifMeta)}">
        <h1 class="sr-only">${escapeHTML(labels.brandTitle)}</h1>
        <div class="mosaic-studio-layout">
          <section class="mosaic-input-panel" aria-labelledby="mosaic-input-title">
            <div class="mosaic-step-heading mosaic-step-heading--panel"><span class="mosaic-step-number">1</span><h2 id="mosaic-input-title">${labels.input}</h2></div>
            <div class="mosaic-input-column">
            <section class="mosaic-card mosaic-card--landmark" aria-labelledby="mosaic-image-field-title">
              <div class="mosaic-card-heading">
                <div class="mosaic-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8" cy="9" r="1.6"></circle><path d="m4 17 5-5 3 3 3-4 5 6"></path></svg></div>
                <div><h3 id="mosaic-image-field-title">${labels.image}</h3><p>${labels.imageHint}</p></div>
                <button class="mosaic-card-action mosaic-card-upload-button" type="button" data-mosaic-image-upload>${labels.upload}</button>
              </div>
              <input class="mosaic-hidden-file" type="file" accept="image/png,image/jpeg,image/webp" tabindex="-1" aria-hidden="true" data-mosaic-image-input>
              <div class="mosaic-compact-status">
                <span><strong data-mosaic-image-name>${labels.defaultImage}</strong><small data-mosaic-image-meta>${labels.fileHint} · 537 × 537 px</small></span>
                <button class="mosaic-text-button" type="button" data-mosaic-reset-image>${labels.useDefault}</button>
              </div>
              <div class="mosaic-landmark-library" data-mosaic-landmark-library>
                <div class="mosaic-landmark-library__heading"><p>${labels.landmarkLibrary}</p><span>10 PRESETS</span></div>
                <div class="mosaic-landmark-tabs" role="group" aria-label="${escapeHTML(labels.landmarkLibrary)}">
                  <button class="mosaic-landmark-tab is-selected" type="button" data-mosaic-landmark-filter="korea" aria-pressed="true">${labels.korea} · 5</button>
                  <button class="mosaic-landmark-tab" type="button" data-mosaic-landmark-filter="samarkand" aria-pressed="false">${labels.samarkand} · 5</button>
                </div>
                <div class="mosaic-landmark-grid" data-mosaic-landmark-group="korea">${landmarkGroupMarkup("korea")}</div>
                <div class="mosaic-landmark-grid" data-mosaic-landmark-group="samarkand" hidden>${landmarkGroupMarkup("samarkand")}</div>
              </div>
            </section>

            <section class="mosaic-card mosaic-card--motif" aria-labelledby="mosaic-motif-field-title">
              <div class="mosaic-card-heading">
                <div class="mosaic-card-icon mosaic-card-icon--motif" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M12 2c2.2 0 3 2.4 3 4s-1 3-3 3-3-1-3-3 0-4 3-4ZM22 12c0 2.2-2.4 3-4 3s-3-1-3-3 1-3 3-3 4 0 4 3ZM12 22c-2.2 0-3-2.4-3-4s1-3 3-3 3 1 3 3 0 4-3 4ZM2 12c0-2.2 2.4-3 4-3s3 1 3 3-1 3-3 3-4 0-4-3Z"></path></svg></div>
                <div><h3 id="mosaic-motif-field-title">${labels.motif}</h3><p>${labels.motifHint}</p></div>
                <button class="mosaic-card-action mosaic-card-upload-button" type="button" data-mosaic-motif-upload>${labels.upload}</button>
              </div>
              <input class="mosaic-hidden-file" type="file" accept="image/svg+xml,image/png,image/jpeg" tabindex="-1" aria-hidden="true" data-mosaic-motif-input>
              <p class="mosaic-card-subtitle">${labels.motifPresets}</p>
              <div class="mosaic-studio-presets" role="group" aria-label="${labels.motifPresets}">
                <button class="mosaic-studio-preset is-selected" type="button" data-mosaic-motif-preset="circle" aria-pressed="true">
                  <span class="mosaic-preset-art mosaic-preset-art--circle" aria-hidden="true"><img src="assets/mosaic/circular-dot.svg?v=20260827-filled-3" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.circleMotif}</span>
                  <span class="mosaic-studio-preset__meta">SVG · full color</span>
                </button>
                <button class="mosaic-studio-preset" type="button" data-mosaic-motif-preset="lotus" aria-pressed="false">
                  <span class="mosaic-preset-art" aria-hidden="true"><img src="assets/mosaic/dancheong-lotus.svg?v=20260827-lotus-3" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.lotusMotif}</span>
                  <span class="mosaic-studio-preset__meta">SVG · transparent</span>
                </button>
                <button class="mosaic-studio-preset" type="button" data-mosaic-motif-preset="logoOne" aria-pressed="false">
                  <span class="mosaic-preset-art mosaic-preset-art--logo" aria-hidden="true"><img src="assets/mosaic/motifs/logo-sample-01.png?v=20260831-logo-1" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.logoOneMotif}</span>
                  <span class="mosaic-studio-preset__meta">PNG · transparent</span>
                </button>
                <button class="mosaic-studio-preset" type="button" data-mosaic-motif-preset="logoTwo" aria-pressed="false">
                  <span class="mosaic-preset-art mosaic-preset-art--logo" aria-hidden="true"><img src="assets/mosaic/motifs/logo-sample-02.png?v=20260831-logo-1" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.logoTwoMotif}</span>
                  <span class="mosaic-studio-preset__meta">PNG · transparent</span>
                </button>
                <button class="mosaic-studio-preset" type="button" data-mosaic-motif-preset="logoThree" aria-pressed="false">
                  <span class="mosaic-preset-art mosaic-preset-art--logo" aria-hidden="true"><img src="assets/mosaic/motifs/logo-sample-03.png?v=20260901-logo-1" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.logoThreeMotif}</span>
                  <span class="mosaic-studio-preset__meta">PNG · transparent</span>
                </button>
                <button class="mosaic-studio-preset" type="button" data-mosaic-motif-preset="logoFour" aria-pressed="false">
                  <span class="mosaic-preset-art mosaic-preset-art--logo" aria-hidden="true"><img src="assets/mosaic/motifs/logo-sample-04.png?v=20260901-logo-1" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.logoFourMotif}</span>
                  <span class="mosaic-studio-preset__meta">PNG · transparent</span>
                </button>
                <button class="mosaic-studio-preset" type="button" data-mosaic-motif-preset="samarkandOne" aria-pressed="false">
                  <span class="mosaic-preset-art mosaic-preset-art--logo" aria-hidden="true"><img src="assets/mosaic/motifs/samarkand-pattern-01.png?v=20260901-samarkand-1" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.samarkandOneMotif}</span>
                  <span class="mosaic-studio-preset__meta">PNG · transparent</span>
                </button>
                <button class="mosaic-studio-preset" type="button" data-mosaic-motif-preset="samarkandTwo" aria-pressed="false">
                  <span class="mosaic-preset-art mosaic-preset-art--logo" aria-hidden="true"><img src="assets/mosaic/motifs/samarkand-pattern-02.png?v=20260901-samarkand-1" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.samarkandTwoMotif}</span>
                  <span class="mosaic-studio-preset__meta">PNG · transparent</span>
                </button>
                <button class="mosaic-studio-preset" type="button" data-mosaic-motif-preset="samarkandThree" aria-pressed="false">
                  <span class="mosaic-preset-art mosaic-preset-art--logo" aria-hidden="true"><img src="assets/mosaic/motifs/samarkand-pattern-03.png?v=20260901-samarkand-1" alt=""></span>
                  <span class="mosaic-studio-preset__name">${labels.samarkandThreeMotif}</span>
                  <span class="mosaic-studio-preset__meta">PNG · transparent</span>
                </button>
              </div>
            </section>
            </div>
          </section>

          <section class="mosaic-preview-panel" aria-labelledby="mosaic-preview-title">
            <div class="mosaic-step-heading mosaic-step-heading--preview"><span class="mosaic-step-number">2</span><h2 id="mosaic-preview-title">${labels.preview}</h2><div class="mosaic-grid-badge"><span>Grid</span><output class="sr-only" data-mosaic-output="resolution">32 × 32</output><select class="mosaic-grid-select" id="mosaic-resolution" aria-label="${labels.resolution}" data-mosaic-resolution><option value="16">16 × 16</option><option value="25">25 × 25</option><option value="32" selected>32 × 32</option><option value="48">48 × 48</option><option value="64">64 × 64</option><option value="96">96 × 96</option><option value="128">128 × 128</option></select></div></div>
            <div class="mosaic-canvas-wrap" data-mosaic-stage>
              <canvas id="mosaic-studio-canvas" aria-label="${escapeHTML(labels.canvasLabel)}"></canvas>
              <output class="mosaic-preview-status" data-mosaic-status aria-live="polite">LOADING</output>
            </div>
            <div class="mosaic-preview-transport">
              <button class="mosaic-play-button" type="button" data-mosaic-play aria-pressed="true" aria-label="${labels.pause}"><span aria-hidden="true"></span></button>
              <div class="mosaic-transport-main">
                <div class="mosaic-transport-time"><output data-mosaic-time>00:00 / 00:08</output><span data-mosaic-count>${labels.cells}</span></div>
                <input class="mosaic-timeline" type="range" min="0" max="8" value="0" step="0.01" aria-label="Preview timeline" data-mosaic-timeline>
              </div>
              <button class="mosaic-transport-full" type="button" data-mosaic-fullscreen aria-label="${labels.full}">↗</button>
            </div>
          </section>

          <aside class="mosaic-controls-panel" aria-label="${labels.controls}">
            <div class="mosaic-step-heading mosaic-step-heading--controls"><span class="mosaic-step-number">3</span><h2>${labels.controls}</h2></div>
            <div class="mosaic-controls-scroll">
              <section class="mosaic-control-card" aria-labelledby="mosaic-speed-title">
                <div class="mosaic-control-title"><h3 id="mosaic-speed-title">${labels.speed}</h3><output data-mosaic-output="speed">1.0×</output></div>
                <input class="mosaic-studio-range" id="mosaic-speed" type="range" min="0.25" max="4" value="1" step="0.25" aria-label="${labels.speed}" data-mosaic-speed>
                <div class="mosaic-range-labels"><span>0.25×</span><span>1×</span><span>2×</span><span>4×</span></div>
              </section>
              <section class="mosaic-control-card" aria-labelledby="mosaic-color-title">
                <div class="mosaic-control-title"><h3 id="mosaic-color-title">${labels.color}</h3><output data-mosaic-output="color-strength">12%</output></div>
                <div class="mosaic-color-swatches" role="group" aria-label="Tint presets">
                  <button type="button" class="mosaic-color-swatch" data-mosaic-tint-swatch data-color="#3C82B9" aria-label="Blue" style="--swatch:#3C82B9"></button>
                  <button type="button" class="mosaic-color-swatch" data-mosaic-tint-swatch data-color="#4C9FA6" aria-label="Teal" style="--swatch:#4C9FA6"></button>
                  <button type="button" class="mosaic-color-swatch" data-mosaic-tint-swatch data-color="#9CA77A" aria-label="Sage" style="--swatch:#9CA77A"></button>
                  <button type="button" class="mosaic-color-swatch" data-mosaic-tint-swatch data-color="#D8A463" aria-label="Gold" style="--swatch:#D8A463"></button>
                  <button type="button" class="mosaic-color-swatch" data-mosaic-tint-swatch data-color="#EA8B60" aria-label="Coral" style="--swatch:#EA8B60"></button>
                  <label class="mosaic-color-picker" aria-label="Custom tint"><input class="mosaic-studio-color" id="mosaic-tint" type="color" value="#d8a463" data-mosaic-tint></label>
                </div>
                <input class="mosaic-studio-range" id="mosaic-color-strength" type="range" min="0" max="100" value="12" step="1" aria-label="Color strength" data-mosaic-color-strength>
              </section>
              <section class="mosaic-control-card" aria-labelledby="mosaic-size-title">
                <div class="mosaic-control-title"><h3 id="mosaic-size-title">${labels.breath}</h3><output data-mosaic-output="breath">82%</output></div>
                <input class="mosaic-studio-range" id="mosaic-breath" type="range" min="0" max="100" value="82" step="1" aria-label="${labels.breath}" data-mosaic-breath>
                <div class="mosaic-range-labels"><span>MIN</span><span>MAX</span></div>
              </section>
              <section class="mosaic-control-card" aria-labelledby="mosaic-opacity-title">
                <div class="mosaic-control-title"><h3 id="mosaic-opacity-title">${labels.opacity}</h3><output data-mosaic-output="opacity">120%</output></div>
                <input class="mosaic-studio-range" id="mosaic-opacity" type="range" min="20" max="160" value="120" step="1" aria-label="${labels.opacity}" data-mosaic-opacity>
                <div class="mosaic-range-labels"><span>20%</span><span>100%</span><span>160%</span></div>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-motif-motion-title">
                <div class="mosaic-control-title"><h3 id="mosaic-motif-motion-title">${labels.motifMotion}</h3><span data-mosaic-mode-label>ORGANIC / CLUSTERS · STILL / LOCKED</span></div>
                <label class="mosaic-select-wrap" for="mosaic-motif-motion"><span class="sr-only">${labels.motifMotion}</span><select class="mosaic-studio-select" id="mosaic-motif-motion" data-mosaic-motif-motion><option value="organic" selected>ORGANIC / CLUSTERS</option><option value="swarm">SWARM / CHOREOGRAPHY</option><option value="neural">NEURAL / SIGNAL</option><option value="rotating">ROTATION / SPIN</option><option value="breathing">BREATHING / PULSE</option></select></label>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-cohesion-title">
                <div class="mosaic-control-title"><h3 id="mosaic-cohesion-title">${labels.cohesion}</h3><output data-mosaic-output="cohesion">72%</output></div>
                <input class="mosaic-studio-range" id="mosaic-cohesion" type="range" min="0" max="100" value="72" step="1" aria-label="${labels.cohesion}" data-mosaic-cohesion>
                <div class="mosaic-range-labels"><span>INDIVIDUAL</span><span>GROUPED</span></div>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-phase-delay-title">
                <div class="mosaic-control-title"><h3 id="mosaic-phase-delay-title">${labels.phaseDelay}</h3><output data-mosaic-output="phase-delay">42%</output></div>
                <input class="mosaic-studio-range" id="mosaic-phase-delay" type="range" min="0" max="100" value="42" step="1" aria-label="${labels.phaseDelay}" data-mosaic-phase-delay>
                <div class="mosaic-range-labels"><span>TOGETHER</span><span>DELAYED</span></div>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-variation-title">
                <div class="mosaic-control-title"><h3 id="mosaic-variation-title">${labels.variation}</h3><output data-mosaic-output="variation">28%</output></div>
                <input class="mosaic-studio-range" id="mosaic-variation" type="range" min="0" max="100" value="28" step="1" aria-label="${labels.variation}" data-mosaic-variation>
                <div class="mosaic-range-labels"><span>UNIFORM</span><span>VARIED</span></div>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-spin-speed-title">
                <div class="mosaic-control-title"><h3 id="mosaic-spin-speed-title">${labels.spinSpeed}</h3><output data-mosaic-output="spin-speed">32%</output></div>
                <input class="mosaic-studio-range" id="mosaic-spin-speed" type="range" min="0" max="100" value="32" step="1" aria-label="${labels.spinSpeed}" data-mosaic-spin-speed>
                <div class="mosaic-range-labels"><span>STILL</span><span>FAST</span></div>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-field-motion-title">
                <div class="mosaic-control-title"><h3 id="mosaic-field-motion-title">${labels.fieldMotion}</h3></div>
                <label class="mosaic-select-wrap" for="mosaic-field-motion"><span class="sr-only">${labels.fieldMotion}</span><select class="mosaic-studio-select" id="mosaic-field-motion" data-mosaic-field-motion><option value="still" selected>STILL / LOCKED</option><option value="wave">WAVE / SURFACE</option><option value="flow">FLOW / CURRENT</option><option value="choreography">CHOREOGRAPHY / GROUPS</option><option value="neural">NEURAL / SIGNAL</option><option value="ripple">RIPPLE / DROP</option></select></label>
                <small class="mosaic-control-hint">${labels.fieldHint}</small>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-spread-title">
                <div class="mosaic-control-title"><h3 id="mosaic-spread-title">${labels.spread}</h3><output data-mosaic-output="spread">58%</output></div>
                <input class="mosaic-studio-range" id="mosaic-spread" type="range" min="0" max="100" value="58" step="1" aria-label="${labels.spread}" data-mosaic-spread>
                <div class="mosaic-range-labels"><span>LOCAL</span><span>FIELD</span></div>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-rotation-title">
                <div class="mosaic-control-title"><h3 id="mosaic-rotation-title">${labels.rotation}</h3><output data-mosaic-output="rotation">0°</output></div>
                <input class="mosaic-studio-range" id="mosaic-rotation" type="range" min="0" max="180" value="0" step="1" aria-label="${labels.rotation}" data-mosaic-rotation>
              </section>
              <section class="mosaic-control-card mosaic-control-card--split" aria-labelledby="mosaic-visual-title">
                <div class="mosaic-control-title"><h3 id="mosaic-visual-title">${labels.contrast}</h3><output data-mosaic-output="contrast">100%</output></div>
                <input class="mosaic-studio-range" id="mosaic-contrast" type="range" min="70" max="150" value="100" step="1" aria-label="${labels.contrast}" data-mosaic-contrast>
              </section>
              <div class="mosaic-control-actions" role="group" aria-label="${labels.controlActions}">
                <button type="button" data-mosaic-random>${labels.randomize}</button>
                <button type="button" data-mosaic-reset>${labels.resetAll}</button>
                <button type="button" data-mosaic-load>${labels.loadSettings}</button>
                <button type="button" data-mosaic-save>${labels.saveSettings}</button>
                <input class="mosaic-project-input" type="file" accept="application/json,.json" tabindex="-1" aria-hidden="true" data-mosaic-project-input>
              </div>
              <section class="mosaic-output-card" aria-labelledby="mosaic-output-title">
                <div class="mosaic-control-title"><h3 id="mosaic-output-title">${labels.output}</h3><span>LOCAL FILE</span></div>
                <div class="mosaic-output-actions"><button class="mosaic-output-button" type="button" data-mosaic-export>${labels.export}</button><button class="mosaic-output-button" type="button" data-mosaic-record data-record-start="${labels.record}" data-record-stop="${labels.stopRecord}">${labels.record}</button><a class="mosaic-output-button mosaic-studio-download" data-mosaic-download href="#">${labels.download}</a></div>
                <p>${labels.exportHint}</p>
              </section>
            </div>
          </aside>
        </div>
      </main>`;
  };

  const aboutPage = (c) => {
    const instagramUrl = "https://www.instagram.com/arenderedofficial/";
    const profile = Array.isArray(c.about.items) ? c.about.items : [];
    const aboutItemMarkup = (item) => {
      const entry = typeof item === "string" ? { text: item } : item || {};
      const safeText = escapeHTML(entry.text || "");
      const safeLabel = escapeHTML(entry.label || "");
      if (entry.kind === "heading") return `<h2 class="about-profile__subheading">${safeText}</h2>`;
      if (entry.kind === "value") return `<p class="about-profile__value"><strong>${safeLabel}</strong>${safeText}</p>`;
      if (entry.kind === "credit") return `<p class="about-profile__credit">${safeText}</p>`;
      if (language !== "ja") return `<p>${safeText}</p>`;
      return `<p>${safeText
        .replace("アーティスト", '<span class="ja-nowrap">アーティスト</span>')
        .replace("考えています。", '<span class="ja-nowrap">考えています。</span>')}</p>`;
    };
    return `
      <main class="page page--about" id="main" tabindex="-1" aria-label="${c.pageNames.about}">
        <section class="about-profile" aria-labelledby="page-title">
          <div class="about-profile__heading">
            <h1 id="page-title">${c.about.title}</h1>
          </div>
          <div class="about-profile__content">
            <p class="section-label">${c.about.profile}</p>
            <div class="about-profile__copy">
              ${profile.map(aboutItemMarkup).join("")}
              <p class="about-profile__instagram"><a href="${instagramUrl}" target="_blank" rel="noopener noreferrer">Instagram</a></p>
            </div>
          </div>
        </section>
      </main>`;
  };

  const localizedProjectValue = (project, field) =>
    project[field]?.[language] || project[field]?.en || project[field]?.ko || "";

  const japaneseWorkTypes = {
    "builddweller-29cm": "インテリア写真",
    "hyundai-motorstudio-seoul": "イベント写真",
    "museum-archive-29cm": "プロセス映像・写真",
    reincheonclub: "エディトリアル写真",
    inthelocal: "ローカル・アーカイブ写真",
    "museum-archive-mmca": "オブジェ写真",
    podium126: "ローカル・セレクトショップ・インテリア写真",
    "builddweller-product": "プロダクト写真",
  };

  const japaneseMovingTypes = {
    "qcells-brand-film-2023": "ブランドフィルム · 2023",
    "house-of-shinsegae-brand-film-2025": "ブランドフィルム · 2025",
    "hyundai-motorstudio-goyang-urc2-archive-film-2024": "アーカイブフィルム · 2024",
    "hyundai-motorstudio-opening-2025": "SNSプロモーションフィルム · 2025",
    "hyundai-motorstudio-christmas-mobility-town-2024": "SNSプロモーションフィルム · 2024",
    "genesis-cheongju-opening-2025": "アート・建築フィルム · 2025",
    "house-of-shinsegae-for-artist-2025": "アート・建築フィルム · 2025",
    "national-palace-hwarot-2023": "ミュージアム展示フィルム · 2023",
    "national-palace-gobaeseok": "ミュージアム展示フィルム · 2023",
    "national-palace-hwarot-patterns": "ミュージアム展示フィルム · 2023",
    "national-palace-hwarot-bridal-robes": "ミュージアム展示フィルム · 2023",
    "national-palace-hwarot-prologue": "ミュージアム展示フィルム · 2023",
  };

  const localizedMediaAlt = (asset, fallback) => {
    if (language === "ja") return asset.alt?.ja || `${fallback}の画像`;
    return asset.alt?.[language] || asset.alt?.en || fallback;
  };

  const portfolioProject = (project) => {
    const images = project.images || [];
    const imageGroups = [
      ["landscape", images.filter((asset) => asset.aspect === "landscape")],
      ["portrait", images.filter((asset) => asset.aspect === "portrait")],
      ["panorama", images.filter((asset) => asset.aspect === "panorama")],
    ];
    const renderMedia = (asset, index) => `
      <figure class="portfolio-media media-frame media-frame--${escapeHTML(asset.aspect || "landscape")}${asset.crop === "tight" ? " media-frame--tight-crop" : ""}">
        ${image({
          src: asset.src,
          alt: localizedMediaAlt(asset, localizedProjectValue(project, "title") || project.key),
          eager: index === 0,
        })}
      </figure>`;
    let mediaIndex = 0;
    const mediaRows = imageGroups
      .filter(([, assets]) => assets.length)
      .map(([aspect, assets]) => {
        const row = assets
          .map((asset) => {
            const media = renderMedia(asset, mediaIndex);
            mediaIndex += 1;
            return media;
          })
          .join("");
        return `<div class="portfolio-project__media-row portfolio-project__media-row--${escapeHTML(aspect)}">${row}</div>`;
      })
      .join("");

    return `
      <section class="portfolio-project" id="work-${escapeHTML(project.key)}" aria-labelledby="work-${escapeHTML(project.key)}-title">
        <header class="portfolio-project__header">
        <p class="section-label">${escapeHTML(language === "ja" ? japaneseWorkTypes[project.key] || localizedProjectValue(project, "type") : localizedProjectValue(project, "type"))}</p>
          <h3 id="work-${escapeHTML(project.key)}-title">${escapeHTML(localizedProjectValue(project, "title") || project.key)}</h3>
        </header>
        <div class="portfolio-project__media-groups">
          ${mediaRows}
        </div>
      </section>`;
  };

  const movingImageProject = (project) => {
    const title = localizedProjectValue(project, "title") || project.key;
    const type = language === "ja"
      ? japaneseMovingTypes[project.key] || localizedProjectValue(project, "type")
      : localizedProjectValue(project, "type");
    const imageAsset = project.image || {};
    const mediaFitClass = imageAsset.fit === "contain" ? " media-frame--video-contain" : "";
    return `
      <article class="portfolio-video-project" data-moving-image-project="${escapeHTML(project.key)}" aria-labelledby="video-${escapeHTML(project.key)}-title">
        <header class="portfolio-video-project__header">
          <p class="section-label">${escapeHTML(type)}</p>
          <h3 id="video-${escapeHTML(project.key)}-title"><a href="${escapeHTML(project.href || "#")}" target="_blank" rel="noreferrer">${escapeHTML(title)}</a></h3>
        </header>
        <a class="portfolio-video-project__media media-frame media-frame--video${mediaFitClass}" href="${escapeHTML(project.href || "#")}" target="_blank" rel="noreferrer">
          ${image({
            src: imageAsset.src,
            alt: localizedMediaAlt(imageAsset, title),
          })}
        </a>
      </article>`;
  };

  const workPage = (c) => {
    const projects = brochurePhotographyPortfolio
      .map(
        (project) => portfolioProject(project),
      )
      .join("");
    const movingProjects = [...museumMovingImagePortfolio, ...nonMuseumMovingImagePortfolio]
      .map(movingImageProject)
      .join("");
    return `
      <main class="page page--work" id="main" tabindex="-1" aria-label="${c.pageNames.work}">
        <header class="page-heading">
          <p class="section-label">${c.work.eyebrow}</p>
          <h1 id="page-title">${c.work.title}</h1>
        </header>
        <section class="work-moving" aria-labelledby="work-moving-title">
          <header class="work-section-heading">
            <p class="section-label">${c.work.featured}</p>
            <h2 id="work-moving-title">${c.work.movingImage}</h2>
          </header>
          ${movingProjects}
        </section>
        <section class="work-featured" aria-labelledby="work-featured-title">
          <header class="work-section-heading">
            <p class="section-label">${c.work.featured}</p>
            <h2 id="work-featured-title">${c.work.photography}</h2>
          </header>
          ${projects}
        </section>
      </main>`;
  };

  const contactPage = (c) => `
    <main class="page page--contact" id="main" tabindex="-1" aria-label="${c.pageNames.contact}">
      <section class="about-profile contact-profile" aria-labelledby="page-title">
        <div class="about-profile__heading">
          <h1 id="page-title">${c.contact.title}</h1>
        </div>
        <div class="about-profile__content contact-profile__content">
          <p class="section-label">ARENDERED</p>
          <div class="about-profile__copy contact-profile__copy">
            <h2 id="contact-team-title" class="sr-only">${c.contact.team}</h2>
            <ul class="contact-profile__list" aria-labelledby="contact-team-title">
              ${brochureContact
                .map(
                  (person) => `<li><strong>${escapeHTML(person.name)}</strong><span>${escapeHTML(c.contact.roles?.[person.role] || person.role)}</span></li>`,
                )
                .join("")}
            </ul>
            <p class="contact-profile__email"><a href="mailto:heewon@arendered.com">${c.contact.email}: heewon@arendered.com</a></p>
            <p class="contact-profile__email"><a href="tel:+821088071697">+82 (0)10 8807 1697</a></p>
            <p class="about-profile__instagram"><a href="https://www.instagram.com/arenderedofficial/" target="_blank" rel="noopener noreferrer">@arenderedofficial</a></p>
          </div>
        </div>
      </section>
    </main>`;

  const patternFieldPage = (c) => {
    const labels = language === "ko"
      ? { eyebrow: "생성 연구 / 01", title: "Pattern Orchestra", subtitle: "하나의 이미지. 하나의 문양. 여러 개의 몸.", back: "← ARENDERED", mosaic: "MOSAIC", stage: "패턴 필드", source: "SOURCE IMAGE", sourceHint: "랜드마크나 이미지를 올려 색과 명암을 읽습니다.", motif: "MOTIF", motifHint: "한 문양이 집단의 움직임을 만듭니다.", motion: "MOTION SYSTEM", field: "FIELD RESPONSE", play: "PAUSE", random: "RANDOMIZE", reset: "RESET", full: "FULLSCREEN", live: "LIVE / FLOCK READY", upload: "UPLOAD", grid: "GRID DENSITY", scale: "MOTIF SCALE", opacity: "OPACITY", speed: "SPEED", cohesion: "COHESION", delay: "PHASE DELAY", turbulence: "TURBULENCE", spread: "SIGNAL SPREAD", colorMix: "COLOR MIX", trail: "TRAIL", sequence: "LANDMARK SEQUENCE", sequenceHint: "60%부터 다음 랜드마크가 섞이고, 80%부터 튜블런스가 가라앉으며 다음 이미지에서 0%로 다시 시작합니다.", ramp: "RAMP DURATION", crossfade: "CROSSFADE", auto: "AUTO SEQUENCE", note: "각 타일은 원본 이미지의 색을 읽고, 같은 문양으로 하나의 군무를 구성합니다." }
      : language === "ja"
        ? { eyebrow: "生成研究 / 01", title: "Pattern Orchestra", subtitle: "ひとつの画像。ひとつの文様。いくつもの身体。", back: "← ARENDERED", mosaic: "MOSAIC", stage: "パターン・フィールド", source: "SOURCE IMAGE", sourceHint: "ランドマークの色と明暗を読み込みます。", motif: "MOTIF", motifHint: "ひとつの文様が群れの動きをつくります。", motion: "MOTION SYSTEM", field: "FIELD RESPONSE", play: "PAUSE", random: "RANDOMIZE", reset: "RESET", full: "FULLSCREEN", live: "LIVE / FLOCK READY", upload: "UPLOAD", grid: "GRID DENSITY", scale: "MOTIF SCALE", opacity: "OPACITY", speed: "SPEED", cohesion: "COHESION", delay: "PHASE DELAY", turbulence: "TURBULENCE", spread: "SIGNAL SPREAD", colorMix: "COLOR MIX", trail: "TRAIL", sequence: "LANDMARK SEQUENCE", sequenceHint: "60%から次のランドマークを混ぜ、80%からチュブルランスが静まり、次の画像で0%から再開します。", ramp: "RAMP DURATION", crossfade: "CROSSFADE", auto: "AUTO SEQUENCE", note: "各タイルが画像の色を読み、ひとつの文様で群舞を構成します。" }
        : { eyebrow: "GENERATIVE STUDY / 01", title: "Pattern Orchestra", subtitle: "One image. One motif. Many bodies.", back: "← ARENDERED", mosaic: "MOSAIC", stage: "PATTERN FIELD", source: "SOURCE IMAGE", sourceHint: "Read color and luminance from a landmark or image.", motif: "MOTIF", motifHint: "One motif becomes a collective body.", motion: "MOTION SYSTEM", field: "FIELD RESPONSE", play: "PAUSE", random: "RANDOMIZE", reset: "RESET", full: "FULLSCREEN", live: "LIVE / FLOCK READY", upload: "UPLOAD", grid: "GRID DENSITY", scale: "MOTIF SCALE", opacity: "OPACITY", speed: "SPEED", cohesion: "COHESION", delay: "PHASE DELAY", turbulence: "TURBULENCE", spread: "SIGNAL SPREAD", colorMix: "COLOR MIX", trail: "TRAIL", sequence: "LANDMARK SEQUENCE", sequenceHint: "The next landmark blends in from 60%; turbulence settles from 80% and restarts at 0% on it.", ramp: "RAMP DURATION", crossfade: "CROSSFADE", auto: "AUTO SEQUENCE", note: "Each cell reads the image's color and joins one choreographed motif field." };
    labels.motifCycle ||= "MOTIF CHANGE"; labels.motifMode ||= "CHANGE MODE"; labels.motionMode ||= "MOTION MODE"; labels.motifFixed ||= "FIXED / SELECTED"; labels.motifAuto ||= "MORPH / CYCLE"; labels.motifMorphEnd ||= "MORPH END"; labels.pulse ||= "PULSE"; labels.sequenceHint = labels.sequenceHint.replace("60%", "20%");
    const motifs = [
      ["koreaThree", "Korea_3", "assets/mosaic/motifs/Korea_3.png?v=20260902-motif-1"],
      ["koreaFour", "Korea_4", "assets/mosaic/motifs/Korea_4.png?v=20260902-motif-1"],
      ["koreaFive", "Korea_5", "assets/mosaic/motifs/Korea_5.png?v=20260902-motif-1"],
      ["koreaSix", "Korea_6", "assets/mosaic/motifs/Korea_6.png?v=20260902-motif-1"],
      ["koreaSeven", "Korea_7", "assets/mosaic/motifs/Korea_7.png?v=20260903-motif-1"],
      ["koreaEight", "Korea_8", "assets/mosaic/motifs/Korea_8.png?v=20260903-motif-1"],
      ["koreaNine", "Korea_9", "assets/mosaic/motifs/Korea_9.png?v=20260905-motif-1"],
      ["koreaTen", "Korea_10", "assets/mosaic/motifs/Korea_10.png?v=20260905-motif-1"],
      ["koreaEleven", "Korea_11", "assets/mosaic/motifs/Korea_11.png?v=20260905-motif-1"],
      ["koreaTwelve", "Korea_12", "assets/mosaic/motifs/Korea_12.png?v=20260905-motif-1"],
      ["koreaFourteen", "Korea_14", "assets/mosaic/motifs/Korea_14.png?v=20260905-motif-1"],
      ["samarkandOne", "Samarkand_1", "assets/mosaic/motifs/samarkand-pattern-01.png?v=20260901-samarkand-1"],
      ["samarkandTwo", "Samarkand_2", "assets/mosaic/motifs/samarkand-pattern-02.png?v=20260901-samarkand-1"],
      ["samarkandThreeTwo", "Samarkand_3-2", "assets/mosaic/motifs/Samarkand_3-2.png?v=20260902-motif-1"],
      ["samarkandFive", "Samarkand_5", "assets/mosaic/motifs/Samarkand_5.png?v=20260903-motif-1"],
      ["samarkandSix", "Samarkand_6", "assets/mosaic/motifs/Samarkand_6.png?v=20260905-motif-1"],
      ["samarkandEight", "Samarkand_8", "assets/mosaic/motifs/Samarkand_8.png?v=20260906-motif-1"],
      ["samarkandNine", "Samarkand_9", "assets/mosaic/motifs/Samarkand_9.png?v=20260906-motif-1"],
      ["samarkandTen", "Samarkand_10", "assets/mosaic/motifs/Samarkand_10.png?v=20260906-motif-2"],
      ["samarkandTwelve", "Samarkand_12", "assets/mosaic/motifs/Samarkand_12.png?v=20260906-motif-2"],
      ["samarkandThirteen", "Samarkand_13", "assets/mosaic/motifs/Samarkand_13.png?v=20260906-motif-2"],
      ["samarkandFourteen", "Samarkand_14", "assets/mosaic/motifs/Samarkand_14.png?v=20260906-motif-2"],
      ["circle", "Circular dot", "assets/mosaic/circular-dot.svg?v=20260827-filled-3"],
      ["square", "Square motif", "assets/mosaic/square-motif.svg?v=20260902-square-1"],
    ];
    const motifGroups = [
      ["KOREA", motifs.slice(0, 11)],
      ["SAMARKAND", motifs.slice(11, 22)],
      ["SAMPLE", motifs.slice(22)],
    ];
    const motifButton = ([key, name, src]) => `<button class="pattern-field-motif${key === "samarkandNine" ? " is-selected" : ""}" type="button" data-pattern-field-motif data-pattern-field-src="${src}" aria-pressed="${key === "samarkandNine"}"><img src="${src}" alt=""><span>${name}</span></button>`;
    const motifMarkup = motifGroups.map(([label, items]) => `<section class="pattern-field-motif-group" data-pattern-field-motif-group="${label.toLowerCase()}"><h3>${label}</h3><div class="pattern-field-motif-grid">${items.map(motifButton).join("")}</div></section>`).join("");
    const mainMotifMarkup = Object.values(window.PATTERN_FIELD_MOTIFS.rules).map((rule) => `<section class="pattern-field-motif-group"><h3>${rule.label} / ${rule.motifs.length}</h3><div class="pattern-field-motif-grid">${rule.motifs.map((item) => `<div class="pattern-field-motif pattern-field-motif-preview"><img src="${item.src}" alt="" loading="lazy"><span>${item.label} · 3×3 / 1개</span></div>`).join("")}</div></section>`).join("");
    const motifLibraryMarkup = `<label class="pattern-field-select-label"><span>MOTIF SET</span><select data-pattern-field-motif-library aria-label="MOTIF SET"><option value="main" selected>Main / 장소별 문양</option><option value="sample">Sample / 기존 문양</option></select></label><div data-pattern-field-main-motifs><p class="pattern-field-size-hint">3×3은 장소별 문양을 하나씩 배치합니다. 2×2는 총 40개를 균등 배분합니다: 5종은 각 8개, 4종은 각 10개, 2종은 각 20개, 3종은 14·13·13개. 1×1은 모든 문양을 랜덤 배치합니다. 다시 섞으면 위치와 추가 1개를 받는 문양이 바뀝니다. 진묘수·해태도 같은 규칙을 따릅니다.</p><p class="pattern-field-size-hint" data-pattern-field-rule-status role="status" aria-live="polite"></p><div class="pattern-field-motif-groups">${mainMotifMarkup}</div></div>`;

    const defaultMotifSequenceKeys = window.PATTERN_FIELD_LIBRARY.main.map((landmark) => landmark.motif);
    const motifOptions = (selectedKey) => motifGroups.map(([label, items]) => `<optgroup label="${label}">${items.map(([key, name, src]) => `<option value="${src}" data-motif-key="${key}"${key === selectedKey ? " selected" : ""}>${name}</option>`).join("")}</optgroup>`).join("");
    const motifSequenceMarkup = Array.from({ length: defaultMotifSequenceKeys.length }, (_, index) => `<label class="pattern-field-sequence-row"><span>${String(index + 1).padStart(2, "0")}</span><select data-pattern-field-motif-sequence="${index}" aria-label="${labels.motif} ${index + 1}">${motifOptions(defaultMotifSequenceKeys[index])}</select></label>`).join("");
    const landmarks = window.PATTERN_FIELD_LIBRARY.main.map(({ key, label, evening }) => [key, label, evening]);
    const defaultSequenceKeys = landmarks.map(([key]) => key);
    const landmarkOptions = (selectedKey) => landmarks.map(([key, name, src]) => `<option value="${src}" data-landmark-key="${key}"${key === selectedKey ? " selected" : ""}>${name}</option>`).join("");
    const sequenceMarkup = Array.from({ length: defaultSequenceKeys.length }, (_, index) => { const selected = landmarks.find(([key]) => key === defaultSequenceKeys[index]); return `<label class="pattern-field-sequence-row pattern-field-sequence-row--landmark"><span>${String(index + 1).padStart(2, "0")}</span><select data-pattern-field-sequence="${index}" aria-label="${labels.sequence} ${index + 1}">${landmarkOptions(defaultSequenceKeys[index])}</select><img src="${selected?.[2] || ""}" data-pattern-field-sequence-preview alt="${selected?.[1] || "Landmark"}"></label>`; }).join("");
    const sizeHint = language === "ko" ? "Main: 2×2는 40개, 3×3은 문양 종류 수로 자동 설정됩니다. 남는 칸은 1×1 랜덤입니다. 수량을 직접 바꾸려면 MOTIF SET에서 Sample을 선택하세요. 아래 숫자는 실제 배치 / 요청 개수입니다." : language === "ja" ? "Main: 2×2は40個、3×3は文様ごとに1個。残りは1×1でランダム配置。個数の手動変更はSampleで。下の数字は配置数 / 指定数。" : "Main: 40 tiles at 2×2; one tile per motif at 3×3. Remaining cells use random 1×1 motifs. Select Sample to edit counts. Below: placed / requested.";
    const range = (key, label, min, max, value, output) => `<label class="pattern-field-range"><span><span>${label}</span><output data-pattern-field-output="${key}">${output}</output></span><input type="range" min="${min}" max="${max}" value="${value}" data-pattern-field-control="${key}" aria-label="${label}"></label>`;
    return `<main class="pattern-field-page" id="main" tabindex="-1" aria-label="${escapeHTML(c.pageNames.patternField)}" data-pattern-field>
      <section class="pattern-field-stage-panel">
        <div class="pattern-field-stage" data-pattern-field-stage><canvas data-pattern-field-canvas aria-label="${escapeHTML(labels.stage)}"></canvas><div class="pattern-field-landmark-hover-preview" data-pattern-field-landmark-hover-preview aria-hidden="true"><img data-pattern-field-landmark-hover-image alt=""><span data-pattern-field-landmark-hover-label></span></div></div>
        <footer class="pattern-field-stage-footer"><div><button class="pattern-field-play" type="button" data-pattern-field-play aria-pressed="true">${labels.play}</button><button class="pattern-field-quiet-button" type="button" data-pattern-field-fullscreen aria-pressed="false">${labels.full}</button></div><span><output data-pattern-field-output="grid">48 × 48</output> / <output data-pattern-field-output="cells">2,304 CELLS</output><small data-pattern-field-output="outputSummary">FHD / 4:5 · 1080 × 1350 px · 30 fps</small></span></footer>
      </section>
      <aside class="pattern-field-control-panel" aria-label="${escapeHTML(labels.title)} ${escapeHTML(labels.motion)}">
        <header class="pattern-field-control-header"><a href="#home">${labels.back}</a><a href="#pattern-field-2">PATTERN FIELD 2 ↗</a></header>
        <section class="pattern-field-control-section pattern-field-control-section--ranges" aria-label="SOUNDTRACK">
          <div class="pattern-field-section-heading"><span>♪</span><div><h2>SOUNDTRACK</h2><p data-pattern-field-sound-description>Gentle Variations · Wind / Coast v2.1 · 88 BPM · 5 MIN</p></div></div>
          <label class="pattern-field-select-label"><span>${language === "ko" ? "음악 버전" : language === "ja" ? "音楽バージョン" : "MUSIC VERSION"}</span><select data-pattern-field-sound-version aria-label="${language === "ko" ? "음악 버전" : language === "ja" ? "音楽バージョン" : "Music version"}" disabled><option value="coast" selected>${language === "ko" ? "바람·물결 / Spatial v2.1" : language === "ja" ? "風・波 / Spatial v2.1" : "Wind / Coast · v2.1"}</option><option value="spatial2">${language === "ko" ? "공간감 강화 / Spatial v2" : language === "ja" ? "奥行き強化 / Spatial v2" : "Enhanced spatial / v2"}</option><option value="spatial">${language === "ko" ? "공간감 / Spatial v1" : language === "ja" ? "奥行き / Spatial v1" : "Spatial depth / v1"}</option><option value="original">${language === "ko" ? "원본 음악 / Original" : language === "ja" ? "元の音楽 / Original" : "Original music"}</option><option value="formation">${language === "ko" ? "형성 공명 / Warm v5" : language === "ja" ? "形成の響き / Warm v5" : "Formation resonance / Warm v5"}</option></select></label>
          <audio data-pattern-field-audio data-src="assets/audio/pattern-field-pulse-depth-v21b-loop-300.m4a" preload="none" loop hidden></audio>
          <button class="pattern-field-auto-toggle pattern-field-export-button" type="button" data-pattern-field-sound aria-pressed="false" disabled>SOUND / OFF</button>
          <button class="pattern-field-quiet-button" type="button" data-pattern-field-sound-restart disabled>${language === "ko" ? "처음부터 함께 재생" : language === "ja" ? "最初から一緒に再生" : "RESTART VIDEO + SOUND"}</button>
          <label class="pattern-field-range"><span><span>VOLUME</span><output data-pattern-field-volume-output>70%</output></span><input type="range" min="0" max="100" value="70" data-pattern-field-volume aria-label="Soundtrack volume"></label>
          <output class="pattern-field-size-hint" data-pattern-field-sound-time aria-label="Soundtrack elapsed time">00:00 / 05:00</output>
          <p class="pattern-field-size-hint" data-pattern-field-sound-status role="status" aria-live="polite">${language === "ko" ? "SOUND를 켜면 움직임과 함께 음악이 재생됩니다." : language === "ja" ? "SOUNDをオンにすると映像と音楽を再生します。" : "Turn SOUND on to listen with the moving image."}</p>
          <p class="pattern-field-size-hint">${language === "ko" ? "바람·물결 v2.1은 Spatial v2를 유지하면서 한국 장면의 바람에만 미세한 물결의 호흡을 더했습니다. Main 기본 순서·30초 장면·기본 전환에 맞춘 5분 루프이며, 순서나 시간을 바꾸면 장면과 맞지 않을 수 있습니다. 이전 음악도 선택할 수 있습니다. 음악을 바꾸면 영상과 함께 처음부터 재생합니다. 선택한 음악이 MP4에도 원본 음량으로 적용되며 SOUND·VOLUME은 미리보기용입니다." : language === "ja" ? "風・波 v2.1はSpatial v2を保ち、韓国の場面だけ風に微かな波の呼吸を加えます。Mainの標準順序・30秒シーン・標準遷移に合わせた5分ループです。順序や時間を変更すると同期しない場合があります。以前の音楽も選べます。選択変更で映像と音楽が最初に戻ります。MP4は選択した音楽の原音量を使用し、SOUND・VOLUMEはプレビュー専用です。" : "Wind / Coast v2.1 preserves Spatial v2, adding a subtle wave-like breath to the wind in Korean scenes. This 5-minute loop follows Main’s default order, 30-second scenes and default transitions; custom timing or order may not match. Earlier versions remain available. Changing music restarts video and audio. MP4 includes the selected music at original volume; SOUND / VOLUME affect preview only."}</p>
        </section>
        <section class="pattern-field-control-section pattern-field-output-section"><div class="pattern-field-section-heading"><span>00</span><div><h2>OUTPUT SETUP</h2><p>${language === "ko" ? "4:5 작품 자체를 출력합니다. FHD·4K는 각각 가로 1080·2160px 기준이며, 파일에 좌우 여백을 추가하지 않습니다." : language === "ja" ? "4:5の作品をそのまま出力。FHD・4Kは横1080・2160px基準で、左右の余白は追加しません。" : "Native 4:5 artwork, without sidebars. FHD and 4K presets use 1080px and 2160px widths."}</p></div></div>
          <label class="pattern-field-select-label"><span>RESOLUTION</span><select data-pattern-field-resolution aria-label="OUTPUT RESOLUTION"><option value="fhd">FHD / 4:5 · 1080 × 1350 px</option><option value="uhd">4K / 4:5 · 2160 × 2700 px</option></select></label>
          <dl class="pattern-field-output-details"><div><dt>VIDEO FRAME</dt><dd data-pattern-field-output="outputFrame">1080 × 1350 px</dd></div><div><dt>FRAME RATE</dt><dd data-pattern-field-output="outputFps">30 fps</dd></div><div><dt>BITRATE / TARGET</dt><dd data-pattern-field-output="outputBitrate">16 Mbps</dd></div></dl>
          <p class="pattern-field-size-hint">${language === "ko" ? "비트레이트는 MP4/H.264 출력 목표값입니다. 실제 값은 인코딩 후 확인합니다. 미리보기는 기기 성능에 따라 30fps보다 낮아질 수 있습니다." : language === "ja" ? "ビットレートはMP4/H.264出力の目標値です。実測値はエンコード後に確認。プレビューは端末性能により30fpsを下回る場合があります。" : "Target bitrate for MP4/H.264 export, not a measured bitrate. Preview may run below 30fps on slower devices."}</p>
          <label class="pattern-field-select-label"><span>${language === "ko" ? "영상 길이" : language === "ja" ? "動画の長さ" : "DURATION"}</span><select data-pattern-field-export-duration aria-label="EXPORT DURATION"><option value="30">30s / SAMPLE</option><option value="60">60s / SAMPLE</option><option value="full" selected>FULL SEQUENCE</option><option value="custom">CUSTOM</option></select></label>
          <label class="pattern-field-size-count pattern-field-export-seconds" hidden><span>${language === "ko" ? "직접 입력 (초)" : language === "ja" ? "秒数" : "SECONDS"}</span><input type="number" min="1" max="1800" step="1" value="30" inputmode="numeric" data-pattern-field-export-seconds aria-label="EXPORT SECONDS"></label>
          <label class="pattern-field-select-label"><span>${language === "ko" ? "시작 지점" : language === "ja" ? "開始位置" : "START AT"}</span><select data-pattern-field-export-start aria-label="EXPORT START"><option value="first">${language === "ko" ? "첫 번째 장면부터" : language === "ja" ? "最初のシーンから" : "FIRST SCENE"}</option><option value="current">${language === "ko" ? "현재 미리보기 시점부터" : language === "ja" ? "現在のプレビューから" : "CURRENT PREVIEW"}</option></select></label>
          <p class="pattern-field-size-hint" data-pattern-field-export-summary></p>
          <p class="pattern-field-size-hint">${language === "ko" ? "반복 영상: 전체 순서 300초 · 첫 번째 장면부터. 영상과 음악의 연결부를 자동으로 맞춥니다. DaVinci Resolve의 30fps 타임라인에서 6번 반복하면 30분, 12번이면 1시간입니다. 미리듣기와 내보내기 모두 선택한 음악을 사용합니다." : language === "ja" ? "ループ動画：全シーン300秒・最初のシーンから。映像と音楽の継ぎ目を自動調整。30fpsタイムラインで6回＝30分、12回＝1時間。試聴と書き出しに選択した音楽を使用します。" : "Loop export: full 300-second sequence, from the first scene. Video and music join automatically. Repeat 6 times for 30 minutes or 12 times for 1 hour on a 30fps DaVinci Resolve timeline. Preview and export use the selected soundtrack."}</p>
          <button class="pattern-field-auto-toggle pattern-field-export-button" type="button" data-pattern-field-export disabled>${language === "ko" ? "MP4 영상 내보내기" : language === "ja" ? "MP4を書き出す" : "EXPORT MP4"}</button>
          <button class="pattern-field-quiet-button" type="button" data-pattern-field-export-cancel hidden>${language === "ko" ? "출력 취소" : language === "ja" ? "キャンセル" : "CANCEL EXPORT"}</button>
          <progress class="pattern-field-export-progress" data-pattern-field-export-progress max="100" value="0" aria-label="MP4 export progress" hidden></progress>
          <p class="pattern-field-size-hint" data-pattern-field-export-status role="status" aria-live="polite"></p>
          <a class="pattern-field-quiet-button pattern-field-export-download" data-pattern-field-export-download hidden>${language === "ko" ? "완성된 MP4 다운로드" : language === "ja" ? "完成したMP4をダウンロード" : "DOWNLOAD MP4"}</a>
        </section>
      <section class="pattern-field-control-section"><div class="pattern-field-section-heading"><span>01</span><div><h2>${labels.motif}</h2><p>${labels.motifHint}</p></div><button type="button" data-pattern-field-motif-upload hidden>${labels.upload}</button></div><input type="file" accept="image/svg+xml,image/png,image/jpeg" data-pattern-field-motif-input hidden>${motifLibraryMarkup}<div data-pattern-field-sample-motifs hidden><div class="pattern-field-motif-groups">${motifMarkup}</div><label class="pattern-field-select-label"><span>MOTIF FIELD</span><select data-pattern-field-motif-mix aria-label="MOTIF FIELD"><option value="single" selected>SINGLE / SELECTED</option><option value="korea">KOREA / 11 MOTIFS</option><option value="samarkand">SAMARKAND / 11 MOTIFS</option><option value="all">ALL / 22 MOTIFS</option></select></label><label class="pattern-field-select-label"><span>MIX ARRANGEMENT</span><select data-pattern-field-motif-arrangement aria-label="MIX ARRANGEMENT"><option value="balanced" selected>BALANCED / GRID</option><option value="luminance">LUMINANCE / SCENE</option><option value="radial">RADIAL / RINGS</option></select></label><div class="pattern-field-motif-cycle"><div class="pattern-field-sequence-heading"><p>${labels.motifCycle}</p><div class="pattern-field-sequence-actions"><button type="button" data-pattern-field-motif-remove aria-label="Remove motif">−</button><button type="button" data-pattern-field-motif-add aria-label="Add motif">+</button></div></div><div class="pattern-field-sequence-list" data-pattern-field-motif-sequence-list>${motifSequenceMarkup}</div><label class="pattern-field-select-label"><span>${labels.motifMode}</span><select data-pattern-field-motif-cycle aria-label="${labels.motifMode}"><option value="fixed">${labels.motifFixed}</option><option value="cycle" selected>${labels.motifAuto}</option></select></label></div></div></section>
        <section class="pattern-field-control-section pattern-field-control-section--sequence"><div class="pattern-field-section-heading"><span>02</span><div><h2>${labels.sequence}</h2><p>${labels.sequenceHint}</p></div><div class="pattern-field-sequence-actions"><button type="button" data-pattern-field-sequence-remove aria-label="Remove landmark">−</button><button type="button" data-pattern-field-sequence-add aria-label="Add landmark">+</button></div></div><label class="pattern-field-select-label"><span>IMAGE SET</span><select data-pattern-field-library aria-label="IMAGE SET"><option value="main">Main / 20 images</option><option value="sample">Sample / 20 images</option></select></label><p class="pattern-field-size-hint">${language === "ko" ? "Main은 한국 5곳·사마르칸트 5곳의 낮·밤(총 20장), Sample은 기존 자료입니다. Main 전체 영상은 30초 기준 5분입니다. 변경하면 장면·문양 순서가 초기화됩니다." : language === "ja" ? "Mainは韓国5か所・サマルカンド5か所の昼夜（20枚）。30秒×10シーンで5分。Sampleは以前の資料。変更するとシーンと文様の順序がリセットされます。" : "Main: 5 Korean + 5 Samarkand locations, day/night (20 images); 10 × 30s = 5 minutes. Sample: previous material. Changing sets resets the scene and motif sequences."}</p><div class="pattern-field-landmark-mode" role="group" aria-label="LANDMARK VERSION"><span>VERSION</span><div><button type="button" data-pattern-field-landmark-mode="day" aria-pressed="false">DAY</button><button type="button" data-pattern-field-landmark-mode="evening" aria-pressed="true" class="is-selected">NIGHT</button></div></div><div class="pattern-field-sequence-list" data-pattern-field-sequence-list>${sequenceMarkup}</div><div class="pattern-field-sequence-state"><span><output data-pattern-field-output="landmark">1 / ${landmarks.length}</output></span><span>RAMP <output data-pattern-field-output="ramp">0%</output></span></div><button class="pattern-field-auto-toggle" type="button" data-pattern-field-auto aria-pressed="true">${labels.auto} / ON</button></section>
        <section class="pattern-field-control-section"><div class="pattern-field-section-heading"><span>03</span><div><h2>${labels.motion}</h2><p>${labels.note}</p></div></div><label class="pattern-field-select-label"><span>${labels.motionMode}</span><select data-pattern-field-mode aria-label="${labels.motionMode}"><option value="flock" selected>FLOCK / CHOREOGRAPHY</option><option value="nerve">NERVE / PROPAGATION</option><option value="tide">TIDE / FIELD</option><option value="rotate">ROTATE / ORBIT</option></select></label><label class="pattern-field-select-label"><span>${labels.field}</span><select data-pattern-field-field aria-label="${labels.field}"><option value="source" selected>SOURCE / COLOR</option><option value="warm">WARM / CERAMIC</option><option value="cool">COOL / BLUE HOUR</option><option value="mono">MONO / INK</option></select></label></section>
        <section class="pattern-field-control-section pattern-field-control-section--ranges">${range("grid", labels.grid, 16, 96, 48, "48 × 48")}<label class="pattern-field-select-label"><span>${language === "ko" ? "완성 밀도" : language === "ja" ? "完成時の密度" : "SETTLED DENSITY"}</span><select data-pattern-field-detail-density aria-label="${language === "ko" ? "완성 밀도" : language === "ja" ? "完成時の密度" : "Settled density"}" disabled><option value="96">96 × 96</option><option value="110">110 × 110</option><option value="128" selected>128 × 128</option></select></label><p class="pattern-field-size-hint">${language === "ko" ? "기본 완성 밀도는 128×128입니다. 기본 GRID 48에서는 해체 시 40×40 밀도로 흩어지며 문양이 현재 크기보다 최대 20% 서서히 커집니다. 다시 모일 때 원래 크기로 돌아옵니다. MP4에도 동일하게 적용됩니다." : language === "ja" ? "完成時の標準密度は128×128。標準GRID 48では40×40で分散し、文様は従来より最大20%ゆっくり拡大。集合時に元のサイズに戻ります。MP4にも適用。" : "Default settled density: 128×128. At GRID 48, motifs scatter at 40×40 density and gradually grow up to 20% beyond their previous size, then return to their original size as they form. Also applies to MP4."}</p>${range("landmarkDetail", "LANDMARK DETAIL / 정렬 디테일", 0, 100, 100, "100%")}<p class="pattern-field-size-hint">문양마다 시작·종료 시간과 크기·밝기 변화가 다르게 겹칩니다. 각자의 경로로 나타나고 사라지며 서서히 정렬됩니다. 2×2·3×3 크기·개수 유지. 정렬될 때 큰 문양 바깥 여백에 작은 문양을 보충하며 내부는 보호합니다. 0%는 기존 밀도.</p><p class="pattern-field-size-hint" data-pattern-field-detail-status></p>${range("scale", labels.scale, 30, 100, 100, "100%")}${range("edgeFeather", "EDGE FEATHER / 가장자리 페더", 0, 30, 6, "6%")}<p class="pattern-field-size-hint">4:5 화면 네 가장자리를 검게 부드럽게 감춥니다. 화면 폭 대비 페더 너비 · 0% 끄기 · MP4에도 적용됩니다.</p><div class="pattern-field-size-controls"><span class="pattern-field-size-title">SIZE MIX / BASE COUNTS</span><p class="pattern-field-size-hint" id="pattern-field-size-hint">${sizeHint}</p>${[2, 3, 4].map((span) => `<label class="pattern-field-size-count"><span>${span} × ${span}</span><input type="number" min="0" max="${Math.floor(48 / span) ** 2}" step="1" value="${span === 2 ? 40 : span === 3 ? 1 : 0}" inputmode="numeric" data-pattern-field-size-count="${span}" aria-label="${span} × ${span} MOTIF COUNT" aria-describedby="pattern-field-size-hint"><output data-pattern-field-output="sizeCount${span}">${span === 2 ? "40 / 40" : span === 3 ? "1 / 1" : "0 / 0"}</output></label>`).join("")}<p class="pattern-field-size-hint" data-pattern-field-size-summary role="status" aria-live="polite"></p><button class="pattern-field-quiet-button" type="button" data-pattern-field-size-shuffle>RESHUFFLE SIZES</button></div>${range("pulse", labels.pulse, 0, 100, 7, "7%")}${range("tension", language === "ko" ? "TENSION / 텐션" : language === "ja" ? "TENSION / 緊張" : "TENSION", 0, 100, 0, "0%")}<p class="pattern-field-size-hint">${language === "ko" ? "0% 기존 흐름 · 100% 버티다가 쓸려가는 흐름. 난기류가 높을수록 뚜렷해집니다." : language === "ja" ? "0% 従来の流れ · 100% 抵抗してから流される動き。乱流が強いほど明瞭。" : "0% original flow · 100% resist, sweep, settle. Increase TURBULENCE to see the effect."}</p>${range("opacity", labels.opacity, 40, 140, 100, "100%")}${range("toneMatch", "DAY TONE MATCH / 낮 톤 통일", 0, 100, 100, "100%")}<p class="pattern-field-size-hint">Main DAY 전용 · 0% 기존 색상 / 100% 장면별 하늘 채도와 색감 통일. NIGHT·Sample·원본 파일은 바뀌지 않습니다.</p>${range("brightnessBoost", "BRIGHTNESS BOOST", 0, 300, 300, "300%")}<p class="pattern-field-size-hint">${language === "ko" ? "0% 기본 밝기 · 100% 기존 부스트 · 최대 300%까지 더 밝게 조절합니다." : language === "ja" ? "0% 基本の明るさ · 100% 従来のブースト · 最大300%まで明るく調整。" : "0% base brightness · 100% previous boost · up to 300% for a brighter image."}</p>${range("contrast", language === "ko" ? "CONTRAST / 대비" : language === "ja" ? "CONTRAST / コントラスト" : "CONTRAST", 100, 300, 115, "115%")}<p class="pattern-field-size-hint">${language === "ko" ? "100% 현재 대비 · 최대 300%. 높은 값에서는 암부와 밝은 부분의 세부가 줄어듭니다." : language === "ja" ? "100% 現在のコントラスト · 最大300%。高い値では暗部と明部の細部が失われます。" : "100% current contrast · up to 300%. High values clip shadow and highlight detail."}</p>${range("projectionLift", language === "ko" ? "PROJECTION LIFT / 투사용 보정" : language === "ja" ? "PROJECTION LIFT / 投影補正" : "PROJECTION LIFT", 0, 100, 65, "65%")}<p class="pattern-field-size-hint">${language === "ko" ? "0% 보정 끄기 · 기본 65%. 기존 화면과 TRAIL 1% 사이의 선명도를 목표로 현재 프레임의 문양만 보강합니다. 색상과 암부·밝은 면의 단계 차이를 유지합니다. 잔상·블러 없이 MP4에도 적용됩니다. 잔상을 없애려면 TRAIL은 0%로 유지하세요." : language === "ja" ? "0% オフ・標準65%。従来とTRAIL 1%の中間を目標に、現在フレームの文様のみを補強。色相と暗部・明部の階調を維持します。残像・ぼかしなしでMP4にも適用。TRAILは0%にしてください。" : "0% off · default 65%. Reinforces only the current frame toward a midpoint between the previous image and Trail 1%, preserving hue, shadows and highlight gradation. No added trails or blur; also applied to MP4. Keep TRAIL at 0% for trail-free motion."}</p>${range("speed", labels.speed, 25, 200, 100, "1.00×")}${range("rampDuration", labels.ramp, 8, 180, 30, "30s")}${range("transitionDuration", labels.crossfade, 1, 12, 5, "5s")}${range("motifMorphEnd", labels.motifMorphEnd, 30, 80, 55, "55%")}${range("cohesion", labels.cohesion, 0, 100, 72, "72%")}${range("delay", labels.delay, 0, 100, 42, "42%")}${range("turbulence", labels.turbulence, 0, 100, 24, "24%")}${range("spread", labels.spread, 0, 100, 70, "70%")}${range("colorMix", labels.colorMix, 0, 100, 8, "8%")}${range("surfaceVariation", "DANCHEONG VARIATION", 0, 50, 26, "26%")}${range("trail", labels.trail, 0, 100, 0, "0%")}</section>
        <section class="pattern-field-control-section pattern-field-color-section"><div class="pattern-field-section-heading"><span>04</span><div><h2>COLOR FIELD</h2><p>Source color can drift toward a material palette.</p></div></div><div class="pattern-field-tints"><button type="button" data-pattern-field-tint="#D8A463" style="--tint:#D8A463" aria-label="Sand tint"></button><button type="button" data-pattern-field-tint="#3C82B9" style="--tint:#3C82B9" aria-label="Tile blue tint"></button><button type="button" data-pattern-field-tint="#C45A4A" style="--tint:#C45A4A" aria-label="Vermilion tint"></button><button type="button" data-pattern-field-tint="#E6D8B8" style="--tint:#E6D8B8" aria-label="Limewash tint"></button></div></section>
        <footer class="pattern-field-actions"><button type="button" data-pattern-field-random>${labels.random}</button><button type="button" data-pattern-field-reset>${labels.reset}</button></footer>
      </aside>
    </main>`;
  };

  const developmentPage = (c) => `
    <main class="page page--development" id="main" tabindex="-1" aria-label="${c.pageNames.development}">
      <header class="page-heading development-intro">
        <p class="section-label">${c.development.eyebrow}</p>
        <h1 id="page-title">${c.development.title}</h1>
      </header>
      <div class="development-card-list">
        <a class="development-card" href="#260806-keumsan" aria-label="${c.development.openAction}: ${c.development.keumsanSogTitle}">
          <span class="development-card__copy">
            <span class="development-card__title">${c.development.keumsanSogTitle}</span>
            ${developmentSourceCredit(c.development.keumsanSogCredit)}
            ${developmentSpecBlock("keumsanSog")}
            <span class="development-card__action">${c.development.openAction}</span>
          </span>
          <span class="development-card__media" aria-hidden="true">
            <img src="assets/development/260806-keumsan-thumbnail.jpg?v=20260814-keumsan-wall-1" alt="" loading="lazy" decoding="async">
          </span>
        </a>
        <a class="development-card" href="#lounge-splat" aria-label="${c.development.openAction}: ${c.development.openSplatTitle}">
          <span class="development-card__copy">
            <span class="development-card__title">${c.development.openSplatTitle}</span>
            ${developmentSourceCredit(c.development.openSplatCredit)}
            ${developmentSpecBlock("loungeSplat")}
            <span class="development-card__action">${c.development.openAction}</span>
          </span>
          <span class="development-card__media" aria-hidden="true">
            <img src="assets/development/lounge-splat-thumbnail.jpg?v=20260801-splat-1" alt="" loading="lazy" decoding="async">
          </span>
        </a>
        <a class="development-card" href="#lounge-splat-35mm" aria-label="${c.development.openAction}: ${c.development.openSplat35Title}">
          <span class="development-card__copy">
            <span class="development-card__title">${c.development.openSplat35Title}</span>
            ${developmentSourceCredit(c.development.openSplat35Credit)}
            ${developmentSpecBlock("loungeSplat35")}
            <span class="development-card__action">${c.development.openAction}</span>
          </span>
          <span class="development-card__media" aria-hidden="true">
            <img src="assets/development/lounge-splat-thumbnail.jpg?v=20260801-splat-1" alt="" loading="lazy" decoding="async">
          </span>
        </a>
        <a class="development-card" href="#fourth-floor-iphone-optimized" aria-label="${c.development.openAction}: ${c.development.floorOptimizedTitle}">
          <span class="development-card__copy">
            <span class="development-card__title">${c.development.floorOptimizedTitle}</span>
            ${developmentSourceCredit(c.development.floorOptimizedCredit)}
            ${developmentSpecBlock("floorIphoneOptimized")}
            <span class="development-card__action">${c.development.openAction}</span>
          </span>
          <span class="development-card__media" aria-hidden="true">
            <img src="assets/development/fourth-floor-iphone-optimized-thumbnail.jpg?v=20260801-3dgs-optimized-1" alt="" loading="lazy" decoding="async">
          </span>
        </a>
        <a class="development-card" href="#fourth-floor-iphone" aria-label="${c.development.openAction}: ${c.development.floorFullTitle}">
          <span class="development-card__copy">
            <span class="development-card__title">${c.development.floorFullTitle}</span>
            ${developmentSourceCredit(c.development.floorFullCredit)}
            ${developmentSpecBlock("floorIphoneFull")}
            <span class="development-card__action">${c.development.openAction}</span>
          </span>
          <span class="development-card__media" aria-hidden="true">
            <img src="assets/development/fourth-floor-iphone-thumbnail.jpg?v=20260730-3dgs-thumb-1" alt="" loading="lazy" decoding="async">
          </span>
        </a>
        <a class="development-card" href="#lounge" aria-label="${c.development.openAction}: ${c.development.openTitle}">
          <span class="development-card__copy">
            <span class="development-card__title">${c.development.openTitle}</span>
            ${developmentSourceCredit(c.development.openCredit)}
            ${developmentSpecBlock("lounge")}
            <span class="development-card__action">${c.development.openAction}</span>
          </span>
          <span class="development-card__media" aria-hidden="true">
            <img src="assets/development/lounge-thumbnail.jpg?v=20260730-3dgs-thumb-1" alt="" loading="lazy" decoding="async">
          </span>
        </a>
      </div>
    </main>`;

  const gaussianStudyPage = (c, study = "lounge") => {
    const isKeumsanSog = study === "keumsanSog";
    const isKeumsanSogTest2 = study === "keumsanSogTest2";
    const isKeumsanStudy = isKeumsanSog || isKeumsanSogTest2;
    const isSceneSog = study === "sceneSog";
    const isLoungeRad = study === "loungeRad";
    const isLoungeRadLod = study === "loungeRadLod";
    const isLoungeSplat = study === "loungeSplat";
    const isLoungeSplat35 = study === "loungeSplat35";
    const isFloorOptimized = study === "floorIphoneOptimized";
    const isFloorFull = study === "floorIphoneFull";
    const isFloor = study === "floorIphone";
    const isDepth = study === "loungeDepth";
    const title = isKeumsanSogTest2 ? c.development.keumsanSogTest2Title : isKeumsanSog ? c.development.keumsanSogTitle : isSceneSog ? c.development.sceneSogTitle : isLoungeRad ? c.development.radChunkTitle : isLoungeRadLod ? c.development.radLodTitle : isLoungeSplat35 ? c.development.openSplat35Title : isLoungeSplat ? c.development.openSplatTitle : isFloorOptimized ? c.development.floorOptimizedTitle : isFloorFull ? c.development.floorFullTitle : isFloor ? c.development.floorTitle : isDepth ? c.development.depthTitle : c.development.openTitle;
    const pageLabel = c.pageNames[study];
    const canvasLabel = isKeumsanSogTest2
      ? c.development.keumsanSogTest2CanvasLabel
      : isKeumsanSog
      ? c.development.keumsanSogCanvasLabel
      : isLoungeRad
      ? c.development.radChunkCanvasLabel
      : isLoungeRadLod
      ? c.development.radLodCanvasLabel
      : isSceneSog
      ? c.development.sceneSogCanvasLabel
      : isLoungeSplat35
      ? c.development.openSplat35CanvasLabel
      : isLoungeSplat
      ? c.development.openSplatCanvasLabel
      : isFloorFull
      ? c.development.floorFullCanvasLabel
      : isFloorOptimized
      ? c.development.floorOptimizedCanvasLabel
      : isFloor
      ? c.development.floorCanvasLabel
      : isDepth
        ? c.development.monochromeCanvasLabel
        : c.development.canvasLabel;
    const localSplatUrl = isKeumsanStudy
      ? "assets/gaussian/260806-keumsan/com.sog"
      : isSceneSog
      ? "assets/gaussian/scene.sog"
      : isLoungeRad
      ? "assets/gaussian/lounge-rad-chunk.rad"
      : isLoungeRadLod
      ? "assets/gaussian/lounge-rad-lod.rad"
      : isLoungeSplat || isLoungeSplat35
      ? "assets/gaussian/lounge_splat.splat"
      : isFloorOptimized
      ? "assets/gaussian/fourth_floor_iphone-optimized.spz"
      : isFloorFull
      ? "assets/gaussian/fourth_floor_iphone.ply"
      : isFloor
        ? "assets/gaussian/floor_iphone.ply"
        : "assets/gaussian/lounge_3.ply";
    const localCompressedSplatUrl = isKeumsanStudy || isSceneSog || isLoungeRad || isLoungeRadLod || isLoungeSplat || isLoungeSplat35 || isFloorOptimized
      ? ""
      : isFloorFull
      ? "assets/gaussian/fourth_floor_iphone.ply.gz"
      : isFloor
        ? "assets/gaussian/floor_iphone.ply.gz"
        : "assets/gaussian/lounge_3.ply.gz";
    const splatAsset = resolveGaussianAsset(study, localSplatUrl, localCompressedSplatUrl);
    const splatUrl = splatAsset.url;
    const compressedSplatUrl = splatAsset.compressedUrl
      ? ` data-splat-compressed-url="${escapeHTML(splatAsset.compressedUrl)}"`
      : "";
    const splatEngine = isLoungeRad || isLoungeRadLod || isLoungeSplat || isLoungeSplat35 || isFloorOptimized
      ? "spark"
      : "playcanvas";
    const renderQualityFrame = 'data-splat-pixel-ratio="1.1" data-splat-desktop-pixel-ratio="0.82" data-splat-mobile-pixel-ratio="1.0" data-splat-pixel-ratio-min="0.72" data-splat-pixel-ratio-max="1.35"';
    const sceneSogRenderQualityFrame = 'data-splat-pixel-ratio="1" data-splat-desktop-pixel-ratio="0.72" data-splat-mobile-pixel-ratio="1.0" data-splat-pixel-ratio-min="0.66" data-splat-pixel-ratio-max="1.12" data-splat-budget="3000000"';
    const walkMovementFrame = 'data-splat-walk-speed="4.05" data-splat-strafe-scale="0.75" data-splat-walk-acceleration="20" data-splat-walk-braking="24" data-splat-walk-max-delta="0.06" data-splat-look-max-delta="0.06" data-splat-look-smoothing="22" data-splat-position-smoothing="26" data-splat-mouse-sensitivity="0.0023" data-splat-control-smooth-time="0.1" data-splat-control-dragging-smooth-time="0" data-splat-joystick-deadzone="0.05" data-splat-joystick-curve="1" data-splat-walk-look-distance="1.35"';
    const splatFrame = isKeumsanStudy
      ? `${walkMovementFrame} ${sceneSogRenderQualityFrame} data-splat-camera-spring="true" data-splat-camera-spring-time="0.18" data-splat-camera-spring-max-speed="18" data-splat-lod-update-distance="0.35" data-splat-lod-update-angle="1.5" data-splat-lod-underfill-limit="1" data-splat-lod-behind-penalty="1.15" data-splat-center="false" data-splat-distance-scale="9" data-splat-camera-x="0.035" data-splat-camera-y="0.04789" data-splat-camera-z="0" data-splat-target-height="0.00983" data-splat-target-x="32" data-splat-target-z="56" data-splat-playcanvas-distance-scale="0.28" data-splat-playcanvas-target-height="0.00983" data-splat-rotation-x="180" data-splat-rotation-y="0" data-splat-rotation-z="0" data-splat-horizontal-shift="0" data-splat-vertical-shift="0" data-splat-fov="50" data-splat-aux-mouse-move="false" data-splat-wheel-move="false" data-splat-manual-collision-radius="1.6" data-splat-manual-collision-iterations="3" data-splat-manual-collision-edges="${isKeumsanSogTest2 ? "-9,-2,-9,24|31,8,31,48|31,48,31,61|-8,58,26,58|6,68,36,68" : "-9,-2,-9,24|31,8,31,48|-8,58,26,58|6,68,36,68"}" data-splat-wall-fill="${isKeumsanSogTest2 ? "keumsan-test2" : ""}" data-splat-pointer-move-scale="0.035" data-splat-wheel-move-scale="0.11" data-splat-max-std-dev="2.45" data-splat-blur-amount="0.18" data-splat-max-pixel-radius="220"`
      : isSceneSog
      ? `${walkMovementFrame} ${sceneSogRenderQualityFrame} data-splat-distance-scale="9" data-splat-camera-x="0.8011" data-splat-camera-y="0.2" data-splat-camera-z="-0.6867" data-splat-target-height="0.08" data-splat-target-x="2.3599" data-splat-target-z="-0.2519" data-splat-playcanvas-distance-scale="0.25" data-splat-playcanvas-target-height="0.04331" data-splat-rotation-x="180" data-splat-rotation-y="0" data-splat-rotation-z="0" data-splat-horizontal-shift="0" data-splat-vertical-shift="0" data-splat-fov="50" data-splat-max-std-dev="2.45" data-splat-blur-amount="0.18" data-splat-max-pixel-radius="220" data-splat-collision-url="assets/gaussian/scene.collision.glb" data-splat-collision-transform="rotation" data-splat-collision-radius="0.16" data-splat-collision-bounds-padding="0.16"`
      : isFloorOptimized || isFloorFull || isFloor
      ? `${walkMovementFrame} ${renderQualityFrame} data-splat-distance-scale="8" data-splat-camera-x="0.68" data-splat-camera-y="0.2" data-splat-camera-z="1.02" data-splat-target-height="0.12" data-splat-rotation-z="180" data-splat-horizontal-shift="0" data-splat-vertical-shift="0" data-splat-fov="52" data-splat-max-std-dev="2.45" data-splat-blur-amount="0.18" data-splat-max-pixel-radius="220"`
      : isLoungeRad || isLoungeRadLod
      ? `${walkMovementFrame} ${renderQualityFrame} data-splat-distance-scale="9" data-splat-camera-x="1.4" data-splat-camera-y="0.39" data-splat-camera-z="1.98" data-splat-target-height="0.07" data-splat-rotation-z="180" data-splat-scale="0.1" data-splat-horizontal-shift="0" data-splat-vertical-shift="0" data-splat-fov="50" data-splat-max-std-dev="1.15" data-splat-blur-amount="0.01" data-splat-max-pixel-radius="6"`
      : `${walkMovementFrame} ${renderQualityFrame} data-splat-distance-scale="9" data-splat-camera-x="0.72" data-splat-camera-y="0.2" data-splat-camera-z="1.02" data-splat-target-height="0.16" data-splat-playcanvas-distance-scale="0.25" data-splat-playcanvas-target-height="0.04" data-splat-rotation-z="179.2" data-splat-horizontal-shift="0" data-splat-vertical-shift="0" data-splat-fov="${isLoungeSplat35 ? "37.8" : "50"}" data-splat-max-std-dev="2.45" data-splat-blur-amount="0.18" data-splat-max-pixel-radius="220"`;
    const artist = isKeumsanStudy ? c.development.keumsanArtist : null;
    const artistPanel = artist
      ? `
          <details class="lounge-viewer__artist" name="lounge-viewer-menu">
            <summary>${c.development.loungeArtistTitle}</summary>
            <div class="lounge-viewer__artist-panel">
              <h2>${escapeHTML(artist.title)}</h2>
              ${artist.paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join("")}
              <div class="lounge-viewer__artist-links">
                ${artist.links.map((link) => `<a href="${escapeHTML(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(link.label)}</a>`).join("")}
              </div>
            </div>
          </details>`
      : "";
    return `
    <main class="lounge-page" id="main" tabindex="-1" aria-label="${pageLabel}">
      <section class="lounge-viewer${isDepth ? " lounge-viewer--depth" : ""}" data-gaussian-viewer data-splat-engine="${splatEngine}" data-lounge-depth-requested="${isDepth ? "true" : "false"}" data-splat-url="${escapeHTML(splatUrl)}"${compressedSplatUrl} data-splat-paged="${isLoungeRadLod ? "true" : "false"}" data-splat-precomputed-lod="${isLoungeRadLod ? "true" : "false"}" data-splat-fixed-frame="${isLoungeRad || isLoungeRadLod ? "true" : "false"}" data-splat-kind="space" data-splat-mode="walk" ${splatFrame} aria-labelledby="lounge-title">
        <a class="lounge-viewer__title" id="lounge-title" href="#development">
          <strong>ARENDERED</strong>
          <span>${escapeHTML(title)}</span>
        </a>
        <div class="lounge-viewer__actions">
          ${artistPanel}
          <button class="lounge-viewer__video" type="button" data-video-open data-video-src="https://www.youtube.com/embed/TPBjQ9eNZ0c?rel=0">${c.development.loungeVideoTitle}</button>
          <a class="lounge-viewer__back" href="#development">${c.development.loungeBack}</a>
        </div>
        <aside class="lounge-viewer__video-panel" data-video-panel hidden role="dialog" aria-modal="true" aria-label="${escapeHTML(c.development.loungeVideoTitle)}">
          <div class="lounge-viewer__video-dialog">
            <button class="lounge-viewer__video-close" type="button" data-video-close aria-label="${escapeHTML(c.development.artworkClose)}"><span aria-hidden="true">×</span></button>
            <iframe class="lounge-viewer__video-frame" data-video-frame title="${escapeHTML(c.development.loungeVideoTitle)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
          </div>
        </aside>
        <div class="lounge-viewer__stage" data-splat-stage>
          <canvas class="lounge-viewer__canvas gaussian-viewer__canvas" data-splat-canvas tabindex="0" role="img" aria-label="${canvasLabel}" aria-describedby="lounge-viewer-help"></canvas>
          <div class="lounge-viewer__control" aria-hidden="true">
            <span class="lounge-viewer__control-group">
              <span class="lounge-viewer__joystick" data-joystick-pad>
                <span class="lounge-viewer__joystick-cross" aria-hidden="true"></span>
                <span class="lounge-viewer__joystick-ring" aria-hidden="true"></span>
                <span class="lounge-viewer__joystick-vector" aria-hidden="true"></span>
                <span class="lounge-viewer__joystick-knob" data-joystick-knob aria-hidden="true"></span>
              </span>
              <span class="lounge-viewer__control-label">${c.development.loungeControls}</span>
            </span>
          </div>
          <p class="sr-only" id="lounge-viewer-help">${c.development.loungePointer}</p>
          <div class="gaussian-viewer__progress lounge-viewer__progress" data-splat-progress-wrap>
            <progress data-splat-progress max="1" value="0" aria-label="${c.development.loading}"></progress>
            <span data-splat-progress-text>0%</span>
          </div>
        </div>
      </section>
    </main>`;
  };

  const emptyPage = (c) =>
    `<main class="page page--${page} page--empty" id="main" tabindex="-1" aria-label="${c.pageNames[page]}"></main>`;

  const pageBody = (c) => {
    if (page === "home") return homePage(c);
    if (page === "about") return aboutPage(c);
    if (page === "work") return workPage(c);
    if (page === "development") return developmentPage(c);
    if (page === "contact") return contactPage(c);
    if (page === "mosaic") return mosaicPage(c);
    if (page === "patternField") return patternFieldPage(c);
    if (page === "patternField2") return `<main class="pattern-field-page pattern-field-2" id="main" tabindex="-1" aria-label="${escapeHTML(c.pageNames.patternField2)}" data-pattern-field-2><p role="status">Loading Pattern Field 2…</p></main>`;
    if (page === "keumsanSog") return gaussianStudyPage(c, "keumsanSog");
    if (page === "loungeRad") return gaussianStudyPage(c, "loungeRad");
    if (page === "loungeRadLod") return gaussianStudyPage(c, "loungeRadLod");
    if (page === "loungeSplat") return gaussianStudyPage(c, "loungeSplat");
    if (page === "loungeSplat35") return gaussianStudyPage(c, "loungeSplat35");
    if (page === "floorIphoneOptimized") return gaussianStudyPage(c, "floorIphoneOptimized");
    if (page === "floorIphoneFull") return gaussianStudyPage(c, "floorIphoneFull");
    if (page === "lounge") return gaussianStudyPage(c);
    return emptyPage(c);
  };

  const ensureMosaicStudioModule = () => {
    if (mosaicStudioModuleRequested) return;
    mosaicStudioModuleRequested = true;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "assets/mosaic-studio.js?v=20260901-samarkand-motion-2";
    script.dataset.mosaicStudioModule = "";
    document.body.append(script);
  };

  const ensurePatternFieldModule = () => {
    if (patternFieldModuleRequested) return;
    patternFieldModuleRequested = true;
    const script = document.createElement("script");
    script.type = "module";
    script.src = "assets/pattern-field.js?v=20261007-scatter-size-1";
    script.dataset.patternFieldModule = "";
    document.body.append(script);
  };

  const bind = (c) => {
    eventController?.abort();
    eventController = new AbortController();
    const listenerOptions = { signal: eventController.signal };
    const header = app.querySelector(".site-header");
    const nav = app.querySelector(".site-nav");
    const menuButton = app.querySelector("[data-action='menu']");
    const languageTrigger = app.querySelector("[data-action='language-menu']");
    const languagePanel = app.querySelector(".language-menu__panel");
    const languageOptions = [...app.querySelectorAll(".language-menu__option")];
    const themeButton = app.querySelector("[data-action='theme']");

    const setMenu = (isOpen, returnFocus = false) => {
      header.classList.toggle("is-menu-open", isOpen);
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute("aria-label", isOpen ? c.closeMenu : c.openMenu);
      menuButton.setAttribute("title", isOpen ? c.closeMenu : c.openMenu);
      if (returnFocus) menuButton.focus({ preventScroll: true });
    };

    const setLanguageMenu = (isOpen, returnFocus = false, focusOption = false) => {
      languagePanel.hidden = !isOpen;
      languageTrigger.setAttribute("aria-expanded", String(isOpen));
      languageTrigger.setAttribute("aria-label", isOpen ? c.closeLanguage : c.openLanguage);
      if (isOpen && focusOption) {
        const selected = languageOptions.find(
          (option) => option.getAttribute("aria-checked") === "true",
        );
        requestAnimationFrame(() => selected?.focus({ preventScroll: true }));
      } else if (returnFocus) {
        languageTrigger.focus({ preventScroll: true });
      }
    };

    menuButton.addEventListener("click", (event) => {
      setMenu(menuButton.getAttribute("aria-expanded") !== "true");
      if (event.detail > 0) menuButton.blur();
    });
    nav.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => setMenu(false)),
    );

    themeButton.addEventListener("click", (event) => {
     theme = theme === "dark" ? "light" : "dark";
     storage.set("arendered-theme", theme);
      render(event.detail === 0 ? "theme" : undefined);
   });

    languageTrigger.addEventListener("click", (event) => {
      setLanguageMenu(
       languageTrigger.getAttribute("aria-expanded") !== "true",
       false,
       event.detail === 0,
     );
      if (event.detail > 0) languageTrigger.blur();
    });
    languageTrigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setLanguageMenu(true, false, true);
      }
    });

    languageOptions.forEach((option, index) => {
      option.addEventListener("click", (event) => {
       language = supportedLanguages.has(option.dataset.language) ? option.dataset.language : "ko";
       storage.set("arendered-language", language);
        render(event.detail === 0 ? "language" : undefined);
     });
      option.addEventListener("keydown", (event) => {
        let nextIndex;
        if (event.key === "ArrowDown") nextIndex = (index + 1) % languageOptions.length;
        if (event.key === "ArrowUp")
          nextIndex = (index - 1 + languageOptions.length) % languageOptions.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = languageOptions.length - 1;
        if (Number.isInteger(nextIndex)) {
          event.preventDefault();
          languageOptions[nextIndex].focus();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setLanguageMenu(false, true);
        }
        if (event.key === "Tab") setLanguageMenu(false);
      });
    });

    document.addEventListener("pointerdown", (event) => {
      if (!header.contains(event.target)) setMenu(false);
      if (!languagePanel.hidden && !event.target.closest(".language-menu"))
        setLanguageMenu(false);
    }, listenerOptions);
    document.addEventListener("click", (event) => {
      const summary = event.target.closest?.(".lounge-viewer__actions details > summary");
      if (!summary) return;
      const activeDetails = summary.parentElement;
      requestAnimationFrame(() => {
        if (!activeDetails.open) return;
        activeDetails.closest(".lounge-viewer__actions")?.querySelectorAll("details[open]").forEach((details) => {
          if (details !== activeDetails) details.open = false;
        });
      });
    }, listenerOptions);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!languagePanel.hidden) {
        event.preventDefault();
        setLanguageMenu(false, true);
      } else if (menuButton.getAttribute("aria-expanded") === "true") {
        event.preventDefault();
        setMenu(false, true);
      }
    }, listenerOptions);
  };

  const render = (focusTarget) => {
    disposePatternField2();
    disposePatternField2 = () => {};
    const c = copy[language];
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.body.dataset.page = page;
    document.title = `ARENDERED — ${c.pageNames[page]}`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#0a0a0a" : "#f1f0ed",
    );
    const skipLink = document.querySelector(".skip-link");
    if (skipLink) skipLink.textContent = c.skip;
    const isImmersivePage = interactiveViewerPages.has(page) || page === "mosaic" || page === "patternField" || page === "patternField2";
    const immersiveShellClass = page === "mosaic" ? "mosaic-shell" : page === "patternField" || page === "patternField2" ? "pattern-field-shell" : "lounge-shell";
    app.innerHTML = isImmersivePage
      ? `<div class="${immersiveShellClass}" data-arendered data-rendered-page="${page}">${pageBody(c)}</div>`
      : `<div class="site-shell" data-arendered data-rendered-page="${page}">${sharedChrome(c)}${pageBody(c)}</div>`;
    if (isImmersivePage) {
      eventController?.abort();
      eventController = undefined;
    } else {
      bind(c);
    }
    if (interactiveViewerPages.has(page) && !isFileProtocol) {
      ensureGaussianViewerModule(app.querySelector("[data-gaussian-viewer]")?.dataset.splatEngine);
    }
    if (page === "mosaic") ensureMosaicStudioModule();
    if (page === "patternField") ensurePatternFieldModule();
    if (page === "patternField2") {
      const fieldRoot = app.querySelector("[data-pattern-field-2]");
      import("../assets/pattern-field-2.js?v=20260908-p5-relief-1").then(({ mountPatternField2 }) => {
        if (fieldRoot.isConnected) disposePatternField2 = mountPatternField2(fieldRoot);
      }).catch(() => {
        if (fieldRoot.isConnected) fieldRoot.innerHTML = '<p role="alert">Pattern Field 2 could not load. <a href="#pattern-field">Return to Pattern Field</a></p>';
      });
    }
    document.dispatchEvent(new CustomEvent("arendered:rendered", { detail: { page, language, theme } }));
    if (focusTarget === "language") {
      requestAnimationFrame(() =>
        app.querySelector("[data-action='language-menu']")?.focus({ preventScroll: true }),
      );
    }
    if (focusTarget === "theme") {
      requestAnimationFrame(() =>
        app.querySelector("[data-action='theme']")?.focus({ preventScroll: true }),
      );
    }
    syncLenisMotionPreference();
  };

  const ensureGaussianViewerModule = (engine = "spark") => {
    const isPlayCanvas = engine === "playcanvas";
    if (isPlayCanvas && playCanvasViewerModuleRequested) return;
    if (!isPlayCanvas && sparkViewerModuleRequested) return;
    if (isPlayCanvas) {
      playCanvasViewerModuleRequested = true;
    } else {
      sparkViewerModuleRequested = true;
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = isPlayCanvas
      ? "assets/playcanvas-viewer.js?v=20260817-keumsan-artist-touch-scroll-1"
      : "assets/gaussian-viewer.js?v=20260901-scene-splat-remove-1";
    if (isPlayCanvas) {
      script.dataset.playcanvasViewerModule = "";
    } else {
      script.dataset.gaussianViewerModule = "";
    }
    document.body.append(script);
  };

  const updateLoungeVariant = (nextPage) => {
    const c = copy[language];
    const isDepth = nextPage === "loungeDepth";
    page = nextPage;
    document.body.dataset.page = page;
    document.title = `ARENDERED — ${c.pageNames[page]}`;
    const shell = app.querySelector("[data-rendered-page]");
    shell?.setAttribute("data-rendered-page", page);
    const main = app.querySelector(".lounge-page");
    main?.setAttribute("aria-label", c.pageNames[page]);
    const viewer = app.querySelector(".lounge-viewer");
    viewer?.classList.toggle("lounge-viewer--depth", isDepth);
    viewer?.setAttribute("data-lounge-depth-requested", isDepth ? "true" : "false");
    const title = app.querySelector("#lounge-title");
    const canvas = app.querySelector("[data-splat-canvas]");
    if (canvas) canvas.setAttribute("aria-label", isDepth ? c.development.monochromeCanvasLabel : c.development.canvasLabel);
    if (title) title.textContent = isDepth ? c.development.depthTitle : c.development.openTitle;
  };

  const handleRouteChange = (options = {}) => {
    const nextPage = pageFromLocation();
    if (nextPage === page && !options.force) return;
    const isCurrentLounge = page === "lounge" || page === "loungeDepth";
    const isNextLounge = nextPage === "lounge" || nextPage === "loungeDepth";
    if (!options.force && isCurrentLounge && isNextLounge && app.querySelector("[data-gaussian-viewer]")) {
      updateLoungeVariant(nextPage);
      return;
    }
    showRouteLoader();
    page = nextPage;
    render();
    scrollToTarget(0, { immediate: true });
    if (interactiveViewerPages.has(nextPage) && !isFileProtocol) {
      waitForViewerOrFallback();
    } else {
      hideRouteLoader();
    }
  };

  const navigateToHash = (hash) => {
    if (!hash?.startsWith("#")) return false;
    const nextPage = routePages[hash.slice(1).trim().toLowerCase()];
    if (!nextPage) return false;
    if (isFileProtocol && interactiveViewerPages.has(nextPage)) {
      window.location.href = `${hostedViewerOrigin}/${hash}`;
      return true;
    }
    if (window.location.hash === hash) {
      handleRouteChange({ force: interactiveViewerPages.has(nextPage) });
      return true;
    }
    window.location.hash = hash;
    return true;
  };

  const redirectFileViewerRoute = () => {
    if (!isFileProtocol || !interactiveViewerPages.has(page)) return false;
    window.location.replace(`${hostedViewerOrigin}/${window.location.hash}`);
    return true;
  };

  if (app) {
    if (!redirectFileViewerRoute()) {
      window.addEventListener("hashchange", handleRouteChange);
      document.addEventListener("arendered:viewer-ready", hideRouteLoader);
      document.addEventListener("arendered:viewer-error", hideRouteLoader);
      document.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const card = event.target.closest?.(".development-card[href^='#']");
        if (!card) return;
        event.preventDefault();
        navigateToHash(card.getAttribute("href"));
      });
      if (interactiveViewerPages.has(page) && !isFileProtocol) showRouteLoader();
      render();
      if (interactiveViewerPages.has(page) && !isFileProtocol) waitForViewerOrFallback();
    }
  }
})();
