# Project: yongseok.me (Astro SSG Blog)

## Tech Stack
- Astro 6 (beta), React 19, TypeScript 5.9, Tailwind CSS v4
- Lit 3 (web components), Three.js (3D 시각화)
- Cloudflare Workers (wrangler), Yarn 4.10.3, Node 22

## Commands
- `yarn dev` — 개발 서버
- `yarn build` — 프로덕션 빌드
- `yarn new:post` — 새 글 생성 (scripts/create-post.js)
- `yarn cf:deploy` — 빌드 + Cloudflare 배포
- `yarn cf:dev` — 빌드 + 로컬 wrangler dev

## Branch & Deploy
- `cloudflare/main` = 프로덕션 안정 브랜치
- Push → GitHub Actions → `yarn build` → wrangler deploy
- Slack 알림: 배포 시작/성공/실패

## Architecture

### Worker (src/worker.js)
- URL 소문자 리다이렉트 (대문자 → 301)
- `/_astro/*` 캐시: `max-age=31536000, immutable`
- 정적 파일 확장자/경로 바이패스

### i18n
- 기본 `ko` (prefix 없음), `en` (`/en/`, `/blog/en/`)
- 번역 데이터 + `useTranslations()` → `src/i18n/utils.ts`
- 블로그 영문 번역: `src/content/blog/en/` 하위에 동일 slug

### Content Collections
- **blog**: `src/content/blog/` (MDX), frontmatter: title, date, categories, heroImage, series, draft
- **question**: `src/content/question/` (MDX), frontmatter: title, isSolved, solvedDate
- `_examples/` 디렉토리: Sandpack 코드 샘플 (빌드 제외)
- `content/wip/`: 작성 중 글 (빌드 제외)

### Custom Plugins
- `plugin/remark-mermaid/` — Mermaid 다이어그램 → SVG 변환 (Lit SSR + mmdc CLI)
- Shiki 커스텀 테마: `shiki/github-dark-default.json`

## Path Aliases (tsconfig.json)
- `@components/*` → `src/components/*`
- `@layouts/*` → `src/layouts/*`
- `@lib/*` → `src/lib/*`
- `@styles/*` → `src/styles/*`
- `@consts` → `src/consts`
- `@types` → `src/types`
- `@i18n/*` → `src/i18n/*`

## Import 규칙
- **페이지/컴포넌트** (.astro, .ts, .tsx): `@components/`, `@lib/` 등 alias 사용
- **MDX 블로그 글**: 상대 경로 사용 (`../../components/embeds/YouTube.astro`)
  - `src/content/blog/` → `../../components/`
  - `src/content/blog/en/` → `../../../components/`

## Naming Conventions
- Astro 컴포넌트: **PascalCase** `.astro` (Container.astro)
- React 컴포넌트: **PascalCase** `.tsx` (Globe.tsx)
- Lit web components: **kebab-case-element** `.ts` (youtube-element.ts)
- 유틸리티: **camelCase** `.ts` (readingTime, dateRange)
- 한글 파일명 허용: slugify 자동 처리 (`여가활동 [1].mdx` → `/blog/여가활동-1`)

## src/components/ 분류 기준

새 컴포넌트를 만들 때 아래 질문 순서대로 판단한다.

| 질문 | 답 → 폴더 |
|------|-----------|
| 모든 페이지의 뼈대(헤더, 푸터, 컨테이너)인가? | → `layout/` |
| 문서 `<head>`에 들어가는 메타/스크립트인가? | → `head/` |
| 블로그 시스템(목록, 상세)이 공통으로 쓰는가? | → `blog/` |
| 여러 MDX 글에서 범용적으로 쓰는 외부 콘텐츠 임베드인가? | → `embeds/` |
| 특정 글의 표현을 위해 만든 맞춤 UI인가? | → `article/` |
| 독립적인 기능 도메인인가? (404, 3D 시각화 등) | → 해당 도메인 폴더 (e.g. `not-found/`, `three/`) |
| Lit 기반 web component인가? | → `lit/` 하위 |
| 위 어디에도 해당 안 되는 범용 컴포넌트인가? | → root에 유지 |

### 폴더별 역할

```
src/components/
├── layout/       페이지 셸 (Header, Footer, Container, Link, BackToTop, WebMCP)
├── head/         <head> 메타데이터 (BaseHead, Head, ClarityIdentify)
├── blog/         블로그 인프라 (TOC, Share, PostNavigation, FormattedDate, ArrowCard, Comments, BackToPrev)
├── embeds/       MDX 범용 임베드 (YouTube, Video, GoogleMap, LinkPreview, AudioPlayer, ...)
├── article/      특정 글 전용 UI (Chat*, CSSLogicGates, Letter, Sandpack, AsciiElement)
├── not-found/    404 기능 (NotFoundPlayer + WebGL 렌더러)
├── three/        Three.js 3D 시각화 컴포넌트
├── lit/          Lit web components (ascii-screen/, common/)
├── mermaid/      Mermaid 다이어그램 렌더링
├── widget/       독립 위젯 (HeaderClock)
├── Question/     질문 컬렉션 UI
└── (root)        web component elements (thumbnail-element, link-preview-element)
```

### article/ 운영 규칙
- 특정 글에만 필요한 UI를 만들면 여기에 넣는다
- 파일이 많아지면 `article/chat/`, `article/css-demo/` 등 하위 그룹 가능
- 3개 이상의 글에서 쓰이게 되면 `embeds/`나 적절한 상위 폴더로 승격 검토

## src/lib/

| 파일 | 역할 |
|------|------|
| `utils.ts` | 범용 유틸 (cn — className 병합) |
| `blog.ts` | 블로그 전용 (readingTime — HTML 태그 제거 후 단어 수/200 WPM) |
| `date.ts` | 날짜 포매팅 (dateRange — about 페이지 경력 기간 표시) |

## Styling (Tailwind v4)
- CSS-first 설정: `src/styles/global.css`의 `@theme`, `@plugin` 사용
- JS config 파일 없음 (삭제됨)
- 커스텀 폰트: Oswald (sans), Pretendard (serif), JetBrains Mono (code), Atkinson
- 커스텀 값: `--shadow-3xl`, `--animate-expand`

## 코드 원칙
- `docs/code-philosophy.md` 참조
- **Cognitive Flow First**: 읽는 사람의 인지 흐름을 끊지 않는 코드
- **Contextual Locality**: 관련 코드는 물리적으로 가까이
- **3-File Rule**: 한 기능 이해에 3개 이상 파일 점프 금지
- **Grep Friendliness**: 폴더/파일명만으로 기능 위치 추측 가능
- **Pragmatic DRY**: 우연히 비슷한 것 vs 본질적으로 같은 것 구분
