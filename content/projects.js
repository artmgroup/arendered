window.KEYNOTE_PORTFOLIO = {
  projects: [
    {
      key: "podium126",
      title: { ko: "Podium126", en: "Podium126" },
      type: {
        ko: "로컬 셀렉트숍 인테리어 사진",
        en: "Local Select Shop Interior Photography",
      },
      images: [
        { src: "assets/portfolio-2026/podium-01.webp", alt: { ko: "Podium126 공간 사진", en: "Podium126 interior photograph" }, layout: "wide", aspect: "landscape" },
        { src: "assets/portfolio-2026/podium-02.webp", alt: { ko: "Podium126 내부 진열 사진", en: "Podium126 interior display photograph" }, layout: "half", aspect: "landscape" },
        { src: "assets/portfolio-2026/podium-03.webp", alt: { ko: "Podium126 내부 사진", en: "Podium126 interior photograph" }, layout: "half", aspect: "landscape" },
        { src: "assets/portfolio-2026/podium-04.webp", alt: { ko: "Podium126 공간 디테일 사진", en: "Podium126 interior detail photograph" }, layout: "half", aspect: "landscape" },
        { src: "assets/portfolio-2026/podium-05.webp", alt: { ko: "Podium126 오브제 사진", en: "Podium126 object photograph" }, layout: "half", aspect: "landscape" },
      ],
    },
    {
      key: "museum-archive-mmca",
      title: { ko: "Museum Archive × MMCA", en: "Museum Archive × MMCA" },
      type: { ko: "오브제 사진", en: "Object Photography" },
      images: [
        { src: "assets/portfolio-2026/museum-01.webp", alt: { ko: "Museum Archive × MMCA 작업 장면", en: "Museum Archive × MMCA workshop photograph" }, layout: "landscape", aspect: "landscape" },
        { src: "assets/portfolio-2026/museum-02.webp", alt: { ko: "Museum Archive × MMCA 작업 디테일", en: "Museum Archive × MMCA workshop detail photograph" }, layout: "landscape", aspect: "landscape" },
        { src: "assets/portfolio-2026/museum-03.webp", alt: { ko: "Museum Archive × MMCA 오브제 사진", en: "Museum Archive × MMCA object photograph" }, layout: "landscape", aspect: "landscape" },
        { src: "assets/portfolio-2026/museum-04.webp", alt: { ko: "Museum Archive × MMCA 세로 오브제 사진", en: "Museum Archive × MMCA vertical object photograph" }, layout: "portrait", aspect: "portrait" },
        { src: "assets/portfolio-2026/museum-05.webp", alt: { ko: "Museum Archive × MMCA 오브제 디테일", en: "Museum Archive × MMCA object detail photograph" }, layout: "portrait", aspect: "portrait" },
      ],
    },
    {
      key: "hyundai-motorstudio-seoul",
      title: { ko: "Hyundai Motorstudio Seoul", en: "Hyundai Motorstudio Seoul" },
      type: { ko: "이벤트 사진", en: "Event Photography" },
      images: [
        { src: "assets/portfolio-2026/hyundai-01.webp", alt: { ko: "Hyundai Motorstudio Seoul 이벤트 사진", en: "Hyundai Motorstudio Seoul event photograph" }, layout: "landscape", aspect: "landscape" },
        { src: "assets/portfolio-2026/hyundai-02.webp", alt: { ko: "Hyundai Motorstudio Seoul 행사 장면", en: "Hyundai Motorstudio Seoul event scene" }, layout: "half", aspect: "landscape" },
        { src: "assets/portfolio-2026/hyundai-03.webp", alt: { ko: "Hyundai Motorstudio Seoul 인물 사진", en: "Hyundai Motorstudio Seoul portrait photograph" }, layout: "half", aspect: "landscape" },
        { src: "assets/portfolio-2026/hyundai-04.webp", alt: { ko: "Hyundai Motorstudio Seoul 외관 사진", en: "Hyundai Motorstudio Seoul exterior photograph" }, layout: "landscape", aspect: "landscape" },
      ],
    },
  ],
};

const workTightCropFiles = new Set([
  "hyundai-motorstudio-seoul-02",
  "hyundai-motorstudio-seoul-04",
  "inthelocal-01",
  "inthelocal-02",
  "inthelocal-03",
  "inthelocal-04",
  "podium126-01",
  "podium126-02",
  "podium126-03",
  "podium126-04",
  "museum-archive-29cm-01",
  "museum-archive-29cm-02",
  "museum-archive-29cm-03",
  "museum-archive-29cm-04",
  "museum-archive-29cm-05",
  "reincheonclub-02",
  "reincheonclub-03",
  "reincheonclub-05",
  "museum-archive-mmca-01",
  "museum-archive-mmca-02",
  "museum-archive-mmca-03",
  "museum-archive-mmca-04",
]);

const workExcludedImageNumbers = {
  reincheonclub: new Set([4]),
  inthelocal: new Set([5]),
  podium126: new Set([5]),
};

const brochurePhoto = (filename, title, imageNumber, total, aspect = "landscape") => ({
  src: `assets/brochure-portfolio/${filename}.jpg`,
  crop: workTightCropFiles.has(filename) ? "tight" : "default",
  alt: {
    ko: `${title.ko} 프로젝트 이미지 ${imageNumber}/${total}`,
    en: `${title.en} project image ${imageNumber} of ${total}`,
  },
  aspect,
});

const brochurePhotoSeries = (slug, title, count, portraitImageNumbers = [], excludedImageNumbers = new Set()) => {
  const sourceImageNumbers = Array.from({ length: count }, (_, index) => index + 1).filter(
    (imageNumber) => !excludedImageNumbers.has(imageNumber),
  );
  return sourceImageNumbers.map((sourceImageNumber, index) => {
    return brochurePhoto(
      `${slug}-${String(sourceImageNumber).padStart(2, "0")}`,
      title,
      index + 1,
      sourceImageNumbers.length,
      portraitImageNumbers.includes(sourceImageNumber) ? "portrait" : "landscape",
    );
  });
};

window.BROCHURE_PHOTOGRAPHY_PORTFOLIO = {
  projects: [
    {
      key: "builddweller-29cm",
      title: { ko: "Builddweller × 29CM", en: "Builddweller × 29CM" },
      type: { ko: "인테리어 사진", en: "Interior Photography" },
      images: [
        brochurePhoto("builddweller-29cm-01", { ko: "Builddweller × 29CM", en: "Builddweller × 29CM" }, 1, 2),
        brochurePhoto("builddweller-29cm-02", { ko: "Builddweller × 29CM", en: "Builddweller × 29CM" }, 2, 2),
      ],
    },
    {
      key: "hyundai-motorstudio-seoul",
      title: { ko: "Hyundai Motorstudio Seoul", en: "Hyundai Motorstudio Seoul" },
      type: { ko: "이벤트 사진", en: "Event Photography" },
      images: [
        brochurePhoto("hyundai-motorstudio-seoul-01", { ko: "Hyundai Motorstudio Seoul", en: "Hyundai Motorstudio Seoul" }, 1, 6),
        brochurePhoto("hyundai-motorstudio-seoul-02", { ko: "Hyundai Motorstudio Seoul", en: "Hyundai Motorstudio Seoul" }, 2, 6),
        brochurePhoto("hyundai-motorstudio-seoul-03", { ko: "Hyundai Motorstudio Seoul", en: "Hyundai Motorstudio Seoul" }, 3, 6),
        brochurePhoto("hyundai-motorstudio-seoul-03b", { ko: "Hyundai Motorstudio Seoul", en: "Hyundai Motorstudio Seoul" }, 4, 6),
        brochurePhoto("hyundai-motorstudio-seoul-04", { ko: "Hyundai Motorstudio Seoul", en: "Hyundai Motorstudio Seoul" }, 5, 6),
        brochurePhoto("hyundai-motorstudio-seoul-05", { ko: "Hyundai Motorstudio Seoul", en: "Hyundai Motorstudio Seoul" }, 6, 6),
      ],
    },
    {
      key: "museum-archive-29cm",
      title: { ko: "Museum Archive", en: "Museum Archive" },
      type: { ko: "프로세스 영상 & 사진", en: "Process Video & Photography" },
      images: [
        ...brochurePhotoSeries("museum-archive-29cm", { ko: "Museum Archive", en: "Museum Archive" }, 6),
        ...brochurePhotoSeries("museum-archive-mmca", { ko: "Museum Archive", en: "Museum Archive" }, 4, [1, 2, 3, 4]),
      ],
    },
    {
      key: "reincheonclub",
      title: { ko: "Reincheonclub", en: "Reincheonclub" },
      type: { ko: "에디토리얼 사진", en: "Editorial Photography" },
      images: brochurePhotoSeries("reincheonclub", { ko: "Reincheonclub", en: "Reincheonclub" }, 5, [], workExcludedImageNumbers.reincheonclub),
    },
    {
      key: "inthelocal",
      title: { ko: "Inthelocal", en: "Inthelocal" },
      type: { ko: "로컬 아카이브 사진", en: "Local Archive Photography" },
      images: brochurePhotoSeries("inthelocal", { ko: "Inthelocal", en: "Inthelocal" }, 5, [], workExcludedImageNumbers.inthelocal),
    },
    {
      key: "podium126",
      title: { ko: "Podium126", en: "Podium126" },
      type: { ko: "로컬 셀렉트숍 인테리어 사진", en: "Local Select Shop Interior Photography" },
      images: brochurePhotoSeries("podium126", { ko: "Podium126", en: "Podium126" }, 5, [], workExcludedImageNumbers.podium126),
    },
    {
      key: "builddweller-product",
      title: { ko: "Builddweller", en: "Builddweller" },
      type: { ko: "제품 사진", en: "Product Photography" },
      images: [
        brochurePhoto("builddweller-product-01", { ko: "Builddweller", en: "Builddweller" }, 1, 1, "panorama"),
      ],
    },
  ],
};

window.MOVING_IMAGE_PORTFOLIO = {
  projects: [
    {
      key: "qcells-brand-film-2023",
      title: { ko: "Hanwha Qcells Brand Film", en: "Hanwha Qcells Brand Film" },
      type: { ko: "브랜드 필름 · 2023", en: "Brand Film · 2023" },
      href: "https://www.youtube.com/watch?v=Tjz3Y0WCDn0",
      image: {
        src: "assets/video-stills/cropped/qcells-brand-film-2023.png",
        alt: { ko: "Hanwha Qcells 브랜드 필름의 도시 풍경 스틸", en: "City still from the Hanwha Qcells brand film" },
      },
    },
    {
      key: "house-of-shinsegae-brand-film-2025",
      title: { ko: "House of Shinsegae Brand Film", en: "House of Shinsegae Brand Film" },
      type: { ko: "브랜드 필름 · 2025", en: "Brand Film · 2025" },
      href: "https://www.youtube.com/watch?v=-fMgTB2MsjM",
      image: {
        src: "assets/video-stills/cropped/house-of-shinsegae-brand-film-2025.png",
        alt: { ko: "House of Shinsegae 브랜드 필름의 나무 풍경 스틸", en: "Tree canopy still from the House of Shinsegae brand film" },
      },
    },
    {
      key: "hyundai-motorstudio-goyang-urc2-archive-film-2024",
      title: { ko: "Hyundai Motor Studio Goyang × U-Ram Choe URC-2", en: "Hyundai Motor Studio Goyang × U-Ram Choe URC-2" },
      type: { ko: "아카이브 필름 · 2024", en: "Archive Film · 2024" },
      href: "https://www.youtube.com/watch?v=o39fCtQy7qA",
      image: {
        src: "assets/video-stills/cropped/hyundai-motorstudio-goyang-urc2-archive-film-2024.png?v=20260728-goyang-crop-1",
        alt: { ko: "Hyundai Motor Studio Goyang × U-Ram Choe URC-2 아카이브 필름의 붉은 조각 스틸", en: "Red sculpture still from the Hyundai Motor Studio Goyang × U-Ram Choe URC-2 archive film" },
      },
    },
    {
      key: "hyundai-motorstudio-opening-2025",
      title: { ko: "Hyundai Motor Studio Seoul Opening Promotion", en: "Hyundai Motor Studio Seoul Opening Promotion" },
      type: { ko: "SNS 프로모션 필름 · 2025", en: "SNS Promotion Film · 2025" },
      href: "https://www.youtube.com/watch?v=sZ6OwEBDlIw",
      image: {
        src: "assets/video-stills/cropped/hyundai-motorstudio-opening-2025.png",
        alt: { ko: "Hyundai Motor Studio Seoul 오프닝 프로모션의 외관 스틸", en: "Exterior still from the Hyundai Motor Studio Seoul opening promotion" },
      },
    },
    {
      key: "hyundai-motorstudio-christmas-mobility-town-2024",
      title: { ko: "Hyundai Motor Studio Christmas Mobility Town Project", en: "Hyundai Motor Studio Christmas Mobility Town Project" },
      type: { ko: "SNS 프로모션 필름 · 2024", en: "SNS Promotion Film · 2024" },
      href: "https://www.instagram.com/reel/DDtSDTopCWq/",
      image: {
        src: "assets/video-stills/cropped/hyundai-motorstudio-christmas-mobility-town-2024.png",
        alt: { ko: "Hyundai Motor Studio 크리스마스 모빌리티 타운의 컬러 블록 설치 스틸", en: "Colour-block installation still from the Hyundai Motor Studio Christmas Mobility Town project" },
      },
    },
    {
      key: "genesis-cheongju-opening-2025",
      title: { ko: "Genesis Cheongju Opening Video", en: "Genesis Cheongju Opening Video" },
      type: { ko: "아트 / 아키텍처 필름 · 2025", en: "Art / Architecture Film · 2025" },
      href: "https://www.youtube.com/watch?v=0CDpbdtQAzY",
      image: {
        src: "assets/video-stills/cropped/genesis-cheongju-opening-2025.png",
        alt: { ko: "Genesis Cheongju 오프닝 영상의 장인 작업 장면 스틸", en: "Craft scene still from the Genesis Cheongju opening video" },
      },
    },
    {
      key: "house-of-shinsegae-for-artist-2025",
      title: { ko: "House of Shinsegae for Artist", en: "House of Shinsegae for Artist" },
      type: { ko: "아트 / 아키텍처 필름 · 2025", en: "Art / Architecture Film · 2025" },
      href: "https://www.youtube.com/watch?v=HyS7aidJaPE",
      image: {
        src: "assets/video-stills/cropped/house-of-shinsegae-for-artist-2025.png",
        alt: { ko: "House of Shinsegae for Artist 영상의 직조 장면 스틸", en: "Loom still from the House of Shinsegae for Artist film" },
      },
    },
    {
      key: "national-palace-hwarot-2023",
      title: { ko: "활옷만개 · 여러 사람의 손길로 완성되다", en: "Blooming Hwarot · Completed by Many Hands" },
      type: { ko: "뮤지엄 전시 필름 · 2023", en: "Museum Exhibition Film · 2023" },
      href: "https://www.youtube.com/watch?v=AjRarzbLq1I",
      image: {
        src: "assets/video-stills/cropped/national-palace-hwarot-many-hands-owner.png",
        alt: { ko: "활옷을 만드는 장인의 실과 도구를 담은 전시 필름 스틸", en: "Still of threads and tools from the Blooming Hwarot exhibition film" },
      },
    },
    {
      key: "national-palace-gobaeseok",
      title: { ko: "교배석", en: "Gyobaerye (Bowing ceremony)" },
      type: { ko: "뮤지엄 전시 필름 · 2023", en: "Museum Exhibition Film · 2023" },
      href: "https://youtu.be/0A93z7GgOcw",
      image: {
        src: "assets/video-stills/cropped/national-palace-gobaerye-owner.png",
        alt: { ko: "국립고궁박물관 교배석의 자수 직물과 색실 스틸", en: "Embroidered textile and coloured thread still from Gyobaerye (Bowing ceremony)" },
      },
    },
    {
      key: "national-palace-hwarot-patterns",
      title: { ko: "활옷문양 감상영상", en: "Hwarot Patterns" },
      type: { ko: "뮤지엄 전시 필름 · 2023", en: "Museum Exhibition Film · 2023" },
      href: "https://youtu.be/ynZCFkQmo54",
      image: {
        src: "assets/video-stills/cropped/national-palace-hwarot-patterns-owner.png",
        alt: { ko: "검은 배경 위에 떠오르는 활옷 문양 입자 스틸", en: "Hwarot-pattern particle still against black" },
      },
    },
    {
      key: "national-palace-hwarot-bridal-robes",
      title: { ko: "활옷만개 · 공주의 활옷 단장", en: "Blooming Hwarot · Bridal Robes of the Joseon Royal Court" },
      type: { ko: "뮤지엄 전시 필름 · 2023", en: "Museum Exhibition Film · 2023" },
      href: "https://youtu.be/UzXB32SlFg4?si=N0QGtVblKWgZwJ5s",
      image: {
        src: "assets/video-stills/cropped/national-palace-UzXB32SlFg4.jpg",
        fit: "contain",
        alt: { ko: "국립고궁박물관 활옷만개 전시 영상 스틸", en: "Still from the National Palace Museum Blooming Hwarot film" },
      },
    },
    {
      key: "national-palace-hwarot-prologue",
      title: { ko: "활옷만개 · 프롤로그", en: "Blooming Hwarot · Prologue" },
      type: { ko: "뮤지엄 전시 필름 · 2023", en: "Museum Exhibition Film · 2023" },
      href: "https://youtu.be/-Pk4WEJ3gM8?si=yxtaZpPiZNJnY5XD",
      image: {
        src: "assets/video-stills/cropped/national-palace--Pk4WEJ3gM8.jpg",
        alt: { ko: "국립고궁박물관 활옷만개 프롤로그 영상 스틸", en: "Still from the National Palace Museum Blooming Hwarot prologue" },
      },
    },
  ],
};
