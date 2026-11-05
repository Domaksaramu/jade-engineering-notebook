# 임재원 · Engineering Notebook

경력의 나열보다 **관찰 → 판단 → 변경 → 검증**을 읽게 하는 웹 포트폴리오 V1입니다. 기존 블로그·포트폴리오는 건드리지 않은 독립 프로젝트입니다.

## 이번에 만든 것
- 경력의 흐름을 보여주는 반응형 메인, 대표 사례 3개와 상세 페이지.
- 경험 노트 2개, 주제/텍스트 검색, 읽기 목차, RSS.
- Markdown 파일 기반 원본. VS Code 등 텍스트 에디터와 Codex로 수정 가능.
- 로컬 웹 에디터: 글 열기·새 초안·본문 미리보기·파일 저장·휴지통 이동.
- 정적 HTML 빌드, 초안 제외, 테스트와 내부 링크 검사. 외부 npm 의존성 없음.
- GitHub Pages 정적 배포 workflow (활성화 후 main 자동 배포·수동 실행). 저장소는 비공개로 유지하며, Pages 배포와 기존 블로그 연결은 아직 실행하지 않았습니다.

## 버전 기준
- 저장소: https://github.com/Domaksaramu/jade-engineering-notebook
- 사용자 승인 기준본: `v1.0.0`. 현재 디자인과 본문을 고정합니다.
- 이후 작업은 별도 브랜치에서 검증하고, V1 태그는 이동하지 않습니다.
- 변경 기록: [CHANGELOG.md](CHANGELOG.md).
- 후속 작업과 선택 사항: [docs/next-steps.md](docs/next-steps.md).
- `.github/workflows/validate.yml`은 push/PR마다 자동 검증만 실행하며 배포하지 않습니다.

## 실행
Node.js 22 이상만 필요합니다. 의존성 설치가 필요하지 않습니다.

```sh
git clone https://github.com/Domaksaramu/jade-engineering-notebook.git
cd jade-engineering-notebook
npm run dev
```

- 사이트: http://127.0.0.1:4321/
- 로컬 글 편집: http://127.0.0.1:4321/studio/
- 종료: Ctrl+C. `PORT=4322 npm run dev`로 포트 변경.
- 수정 후 브라우저 새로고침으로 반영. HMR은 없습니다.

## 내용 편집
`content/cases/`는 경력 사례, `content/notes/`는 경험/기술 글입니다. **dist는 생성물이므로 직접 편집하지 않습니다.**

```sh
npm run new -- next-story
npm run content:status
# content/notes/next-story.md 편집
npm test
npm run build
npm run check
```

메타데이터는 `key: JSON값` 형태의 제한된 frontmatter입니다. 일반 YAML 전체를 지원하지 않습니다.

```md
---
title: "글 제목"
summary: "목록에서 보여 줄 한 문장"
category: "운영의 기준"
period: "2026 경험 정리"
tags: ["Java", "운영"]
order: 3
draft: true
---
## 배경

본문을 씁니다.
```

문단, ##~#### 제목, 목록, 링크, 굵게, 인용, 표, 코드 블록을 지원합니다. 원시 HTML/이미지/MDX는 지원하지 않습니다. `draft: true`인 파일은 빌드되지 않습니다. 공개 대상으로 검토한 뒤 false로 바꿉니다. 로컬 에디터는 수정 전 원문을 `.trash/`에 보관하며 삭제도 이동으로 처리합니다. 마지막 공개 사례의 삭제는 홈 유지를 위해 제한합니다. 파일 편집기의 직접 삭제는 Git으로 관리하세요.

## Codex로 이어가기
AGENTS.md와 docs/automation.md에 초안 생성·검증·발행 분리 규칙이 있습니다. 이 샘플에는 예약 작업이나 외부 블로그 자동 발행을 연결하지 않았습니다. API 키도 필요하지 않습니다.

## 배포
정적 산출물은 `dist/`뿐입니다. `SITE_URL=https://your-domain.example npm run build`로 RSS 절대 주소와 sitemap을 생성합니다. URL 미지정 시 샘플 Sites 주소를 사용합니다. 로컬 에디터, 원천 자료, 백업과 쓰기 API는 배포되지 않습니다.

GitHub Pages: 현재 저장소는 비공개입니다. 공개 전환은 별도 승인 사항이며, 비공개 저장소의 Pages 이용 가능 여부는 계정 요금제를 확인해야 합니다. 배포하기로 결정하면 Settings → Pages → Source를 GitHub Actions로 지정한 뒤, Actions의 Deploy portfolio를 main에서 수동 실행합니다. 이후 main 변경은 자동 배포됩니다. 사용자 사이트와 프로젝트 하위 경로 모두 상대 링크로 동작합니다. 첫 저장소 생성·공개 전 기밀 검토가 필요합니다. [GitHub 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)에 따르면 GitHub Free의 public 저장소에서 Pages를 사용할 수 있습니다. 무료 범위·제한은 변경될 수 있으므로 최종 호스팅 선택 시 확인하세요.

Sites의 owner-private 샘플 배포와 GitHub Pages의 public 배포는 서로 별개입니다. 지금 만든 것은 샘플이며 기존 블로그 교체가 아닙니다.

## 구조
```
content/          Markdown 원본
src/              페이지 템플릿·스타일·Markdown 변환·로컬 편집 UI
scripts/          build / dev / check / 새 글
tests/            파일 편집·안전성·변환 테스트
docs/             내용 기준·자동화·검증 기록
dist/             정적 배포 산출물
```

## 작성·발행 기준
[초안 → 검토 → 발행 → 회수 절차](docs/publishing.md)와 [콘텐츠 보강 계획](docs/content-roadmap.md)을 참고하세요. `draft: true`는 사이트 빌드에서만 제외되며, 공개 저장소에 커밋한 초안·과거 이력까지 숨기지 않습니다.

## 다음 단계
V1 기준본 보존 → 자동 검증 정비 → 호스팅/공개 범위 결정 → 실제 블로그 글 이관/URL 정책 → 필요 시 초안 자동 생성과 발행 승인 흐름 연결. 공개 CMS, 멀티유저 인증, 예약 발행, 기존 글 마이그레이션은 이번 범위가 아닙니다.
