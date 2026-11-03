# Portfolio / engineering notebook

## User contract
- 새 프로젝트다. 기존 jade-devblog 배포와 상위 이력 원천을 수정하지 않는다.
- 공개 원본은 content/cases/*.md, content/notes/*.md. 생성된 dist를 직접 편집하지 않는다.
- 디자인은 DESIGN.md, 주장은 docs/content-policy.md를 먼저 읽는다.
- 회사·기간·역할, 수치의 분모/환경/기간을 보존한다. 내부 코드·실제 토큰·주소·고객 정보는 넣지 않는다.

## Content automation
1. `npm run new -- english-slug`로 초안을 생성한다. 기존 파일을 덮어쓰지 않는다.
2. 확인된 자료로 상황 → 관찰 → 판단 → 변경 → 검증/한계를 작성한다.
3. 새 글은 `draft: true`를 유지한다. 사용자가 발행을 요청하지 않았다면 자동으로 공개하지 않는다.
4. 생성/수정 후 `npm test && npm run build && npm run check`를 실행한다.
5. 배포는 명시적인 사용자 발행 요청과 현재 호스팅 스킬의 배포 정책을 따른다. 기존 공개 블로그로 자동 반영하지 않는다.

## Runtime
Node 22+만 필요하다. 의존성 추가는 요청된 경우에만 한다. `npm run dev`는 127.0.0.1:4321, 로컬 에디터는 /studio/. 이 API를 외부 인터페이스로 열거나 정적 배포에 포함하지 않는다. 삭제는 휴지통 이동으로 복구 가능하게 유지한다.

## Verification
node:test는 임시 폴더에서 파일 생성/수정/삭제/백업과 안전성 경계를 검사한다. check는 정적 링크·목차·초안/에디터 누출을 검사한다. 브라우저에서 데스크톱/모바일, 사례 탐색, 노트 검색, 편집 상태를 별도로 확인한다. 불가능한 검증은 명시한다.
