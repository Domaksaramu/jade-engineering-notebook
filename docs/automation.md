# Markdown 기반 블로깅 자동화 준비

## 현재 동작
1. 파일이 원본이므로 Codex가 content/의 Markdown을 직접 생성/편집할 수 있다.
2. `npm run new -- slug`는 초안을 만들며 같은 파일을 덮어쓰지 않는다.
3. `draft: true`는 웹 빌드에서 제외된다.
4. `npm test && npm run build && npm run check`로 검증한다.
5. 발행은 별도 행동이다. 이 프로젝트는 예약 실행/외부 블로그 발행에 연결돼 있지 않다.

## Codex 요청 예시
“AGENTS.md와 docs/content-policy.md를 읽고, 내가 제공한 작업 기록으로 content/notes/에 초안을 작성해. 관찰·해석·검증을 구분하고 draft:true를 유지해. 내부 주소나 코드는 복사하지 말고 검증 명령을 실행해. 배포하지 마.”

## 운영으로 확장할 때
- 입력: 공개 가능한 업무 메모/학습 기록만 지정한다. 원천 폴더 전체를 자동 공개하지 않는다.
- 생성: 초안 브랜치에 Markdown과 근거 체크리스트를 남긴다.
- 검증: 문법/링크/금칙 정보 검사 + 사람의 사실/기밀 검토. 현행 테스트가 자동 사실 검증을 대신하지 않는다.
- 발행: 리뷰 완료 후 draft:false, 병합 및 명시적 배포. Pages 활성화 후에는 main 병합으로 자동 배포하며 수동 실행도 가능하다. 다른 브랜치의 실행은 배포하지 않는다.
- 예약: 그다음 별도 Codex 자동화를 등록한다. 생성과 공개 권한을 분리한다.

## 비용과 경계
정적 사이트에는 상시 서버/DB가 필요 없다. GitHub Free public 저장소의 Pages를 후보로 준비했다. Codex·모델 API 사용량/계정 비용, 유료 도메인, 호스팅 사용 한도는 사이트 정적 호스팅 비용과 별개다. ‘블로깅 자동화까지 전부 무료’라고 보장하지 않는다.

상세 운영 절차는 [publishing.md](publishing.md), 콘텐츠 후보와 근거 경계는 [content-roadmap.md](content-roadmap.md)를 참고한다.

경력 흐름 분류와 사례↔기술 글 연결 메타데이터는 [experience-links.md](experience-links.md)를 참고한다. 회사·프로젝트가 같은 경우에만 `relatedCases`를 지정하며, 연결을 깨는 에디터 저장/삭제는 원문 변경 전에 거부한다.
