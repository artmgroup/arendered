# ARENDERED

영상, 사진, 미디어 아트 프로젝트를 소개하는 ARENDERED 포트폴리오 홈페이지입니다.

## 폴더 안내

| 폴더·파일 | 역할 |
|---|---|
| `index.html` | 홈페이지 첫 화면, 헤더, About, Contact 구성 |
| `content/projects.js` | 프로젝트 이름·설명·크레딧·이미지 순서 |
| `scripts/site.js` | 메뉴, 테마 전환, 갤러리, 스크롤 동작 |
| `styles/site.css` | 글꼴, 색상, 크기, 간격, 모바일 화면 스타일 |
| `images/projects/` | 프로젝트별 사진과 썸네일 |
| `images/studio/` | About 페이지 사진 |
| `fonts/` | 홈페이지에서 사용하는 글꼴 |
| `icons/` | 파비콘, 모바일 홈 화면 아이콘, 앱 설정 |
| `animations/` | 페이지 로딩 애니메이션 |
| `docs/site-behavior.md` | 현재 화면 구성과 동작 설명 |
| `tools/` | 로컬 미리보기, 썸네일·아이콘 생성, 파일 연결 검사 |
| `CNAME` | GitHub Pages의 도메인 설정 |
| `favicon.ico` | 브라우저의 기본 파비콘 요청을 위한 호환 파일 |

사진은 `images/projects/프로젝트명/` 안에 있습니다. `thumbnail.webp`는 대표 사진, `thumbnail-480.webp`처럼 숫자가 붙은 파일은 화면 크기에 맞춘 썸네일, `photo-01.webp`처럼 번호가 붙은 파일은 본문 사진입니다. 사진 번호와 프로젝트의 선택 순서를 유지합니다.

## 프로젝트 수정

`content/projects.js`에서 제목, 설명, `client`, `role`, `assets`, `year`, 제작 크레딧과 사진 경로를 수정합니다. 배열 순서가 메인 화면과 인덱스의 순서입니다. `layout`의 사진 번호는 각 프로젝트 `images` 배열의 순서를 가리킵니다.

## 미리보기와 검사

Node.js가 설치된 환경에서 프로젝트 폴더를 열고 실행합니다.

```sh
node tools/preview-server.mjs
```

브라우저에서 `http://127.0.0.1:4173/`을 엽니다. 파일 연결 검사:

```sh
node tools/check-file-links.mjs
```

`tools/build-thumbnails.py`는 Pillow로 화면 크기별 썸네일을 생성합니다. `tools/build-icons.py`는 PNG 원본으로 ICO와 홈 화면 아이콘을 생성합니다. 이 도구는 홈페이지 방문 시 실행되지 않습니다.

## 배포

GitHub Pages는 `main` 브랜치의 루트 폴더를 사용합니다. `index.html`의 코드 버전 표기를 함께 갱신하면 방문자의 캐시에도 변경 사항이 반영됩니다. 도메인은 `CNAME`에서 관리합니다.

`local-archive/`와 `design-studies/`는 작업 기록과 디자인 시안을 보관하는 로컬 전용 폴더이며 GitHub에 업로드하지 않습니다.
