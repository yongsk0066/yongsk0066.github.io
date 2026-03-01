# Project: yongseok.me (Astro SSG Blog)

## Tech Stack
- Astro 6 (beta), React 19, TypeScript 5.9, Tailwind CSS v4
- Cloudflare Workers deployment (wrangler)
- Yarn 4.10.3, Node 22

## Commands
- `yarn dev` — 개발 서버
- `yarn build` — 프로덕션 빌드
- `yarn new:post` — 새 글 생성
- `yarn cf:deploy` — Cloudflare 배포

## Branch
- `cloudflare/main` = 프로덕션 안정 브랜치

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
├── lit/          Lit web components (ascii-screen/, common/, youtube-element, ...)
├── mermaid/      Mermaid 다이어그램 렌더링
├── widget/       독립 위젯 (HeaderClock)
├── Question/     질문 컬렉션 UI
└── (root)        범용 web component elements, 분류 불가 소수 컴포넌트
```

### article/ 운영 규칙
- 특정 글에만 필요한 UI를 만들면 여기에 넣는다
- 파일이 많아지면 `article/chat/`, `article/css-demo/` 등 하위 그룹 가능
- 3개 이상의 글에서 쓰이게 되면 `embeds/`나 적절한 상위 폴더로 승격 검토

## src/lib/ 분류 기준

| 파일 | 역할 |
|------|------|
| `utils.ts` | 범용 유틸 (cn — className 병합) |
| `blog.ts` | 블로그 전용 (readingTime) |
| `date.ts` | 날짜 포매팅 (dateRange, formatDate) |

## 코드 원칙
- `docs/code-philosophy.md` 참조
- Cognitive Flow First: 읽는 사람의 인지 흐름을 끊지 않는 코드
- Contextual Locality: 관련 코드는 물리적으로 가까이
- 3-File Rule: 한 기능 이해에 3개 이상 파일 점프 금지
