# Changelog

## Unreleased

- 비공개 초안 draft → 원문 hash 기반 review → 명시적 승인 확인 prepare → verify 명령. 자동 Git push·발행 없음.
- 동시 생성 시 기존 공개 원본 덮어쓰기 방지, 기존 글 발행일 보존/수정일·백업 처리.
- Codex 초안 작성 요청 양식과 PR 사실·기밀 검토 체크리스트.

- 사용자명 jade-builds 및 저장소 blogs로 이전. 배포 주소 https://jade-builds.github.io/blogs/, 원본·로컬 remote·문서·RSS/sitemap 경로 갱신.

- GitHub Pages 활성화 후 main 자동 배포, 다른 브랜치 배포 방지.
- 프로젝트 하위 경로의 404·자산·RSS·sitemap 검사.
- `npm run content:status`, 초안·검토·발행·회수 절차 및 콘텐츠 후속 계획.
- 2026-11-06 사용자 승인으로 저장소 공개 전환 및 Pages 활성화. main 자동 배포 구성.

## 1.0.0 — 2026-11-05

사용자가 승인한 첫 번째 웹 포트폴리오 기준본입니다. 버전 등록 과정에서 디자인과 본문은 변경하지 않았습니다.

- 경력의 흐름, 대표 기술 사례 3건, 경험 노트 2건.
- 반응형 페이지, 사례 상세, 노트 검색·분류, RSS와 sitemap.
- Markdown 원본과 로컬 전용 글 편집기.
- Node 내장 모듈 기반 빌드와 테스트, 내부 링크·초안 누출 검사.
- GitHub Pages 수동 배포 workflow 준비. 실제 Pages 배포는 미실행.

저장소 비공개 상태와 기존 블로그를 유지합니다. 예약 발행, 기존 글 이관, 공개 CMS는 포함하지 않습니다.
