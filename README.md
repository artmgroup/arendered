# ARENDERED

영상, 사진, 미디어 아트 프로젝트를 소개하는 ARENDERED 포트폴리오 홈페이지입니다.

## 폴더 안내

| 폴더·파일 | 역할 |
|---|---|
| `index.html` | 홈페이지 기본 문서, 검색 정보, 스크립트 연결 |
| `content/projects.js` | 영상·사진 포트폴리오의 제목, 설명, 미디어 목록 |
| `scripts/site.js` | 페이지 구성, 언어·테마 전환, 메뉴와 갤러리 |
| `styles/site.css` | 글꼴, 색상, 크기, 간격, 모바일 화면 스타일 |
| `styles/lenis.css` | 데스크탑 스크롤 효과 스타일 |
| `assets/video-stills/` | 영상 프로젝트의 미리보기 이미지 |
| `assets/portfolio-2026/`, `assets/brochure-portfolio/` | 사진 포트폴리오 |
| `assets/development/`, `assets/gaussian/` | Development 이미지와 3D 공간 데이터 |
| `assets/vendor/` | 브라우저에서 사용하는 외부 라이브러리와 라이선스 |
| `assets/`의 JS·CSS | 3D 뷰어와 생성형 그래픽 도구 |
| `images/`, `fonts/`, `animations/` | 기존 프로젝트의 보관된 미디어 |
| `icons/` | 파비콘, 모바일 홈 화면 아이콘, 앱 설정 |
| `animations/` | 페이지 로딩 애니메이션 |
| `docs/site-behavior.md` | 현재 화면 구성과 동작 설명 |
| `tools/` | 로컬 미리보기, 썸네일·아이콘 생성, 파일 연결 검사 |
| `CNAME` | GitHub Pages의 도메인 설정 |
| `favicon.ico` | 브라우저의 기본 파비콘 요청을 위한 호환 파일 |

## 프로젝트 수정

`content/projects.js`의 `MOVING_IMAGE_PORTFOLIO`에서 영상 12개를, `KEYNOTE_PORTFOLIO`와 `BROCHURE_PHOTOGRAPHY_PORTFOLIO`에서 사진 프로젝트 7개를 관리합니다. 배열 순서가 Works 표시 순서입니다. 언어별 소개·연락처는 `scripts/site.js`에서 관리합니다.

## 미리보기와 검사

Node.js가 설치된 환경에서 프로젝트 폴더를 열고 실행합니다.

```sh
node tools/preview-server.mjs
```

브라우저에서 `http://127.0.0.1:4173/`을 엽니다. 파일 연결 검사:

```sh
node tools/check-file-links.mjs
```

`tools/build-icons.py`는 PNG 원본으로 ICO와 홈 화면 아이콘을 생성합니다. `tools/build-thumbnails.py`는 기존 이미지 형식용 보관 도구입니다. 이 도구는 홈페이지 방문 시 실행되지 않습니다.

## 배포

GitHub Pages는 `main` 브랜치의 루트 폴더를 사용합니다. `index.html`의 코드 버전 표기를 함께 갱신하면 방문자의 캐시에도 변경 사항이 반영됩니다. 도메인은 `CNAME`에서 관리합니다.

`local-archive/`와 `design-studies/`는 작업 기록과 디자인 시안을 보관하는 로컬 전용 폴더이며 GitHub에 업로드하지 않습니다.
