# 비공개 초안 → 검토 → 발행 준비

이 명령들은 로컬 파일만 다룬다. Git commit/push, PR 병합, 외부 배포, 예약 실행, LLM 호출을 하지 않는다. **작성 자동화와 공개 권한은 별개다.**

## 1. 초안은 비공개 작업 폴더에서

```sh
npm run draft -- my-next-story
```

`_private/drafts/notes/my-next-story.md`가 `draft: true`로 생성된다. 기존 파일을 덮어쓰지 않는다. VS Code 등 텍스트 에디터 또는 Codex로 이 파일을 수정한다. 상황·관찰·대안/판단·변경·검증/한계를 실제 자료에 맞춰 작성하고, 기본 제목·요약·안내 문장을 제거한다.

- `_private/`는 기본 `.gitignore`에 의해 제외된다. 빌드와 `/studio/`는 이 폴더를 읽지 않는다. 로컬에서 누구나 접근할 수 있는 평문 파일이며 암호화된 보관함은 아니다. `git add -f`를 쓰거나 클라우드/원격에 공유하지 않는다.
- 기존 `npm run new -- slug`와 `/studio/`의 새 노트는 호환성을 위해 여전히 `content/notes/`에 만든다. 이 경로는 공개 저장소에 커밋하면 **draft:true라도 원문이 공개**된다. 비공개 작성에는 새 `draft` 명령을 우선 사용한다.
- 새 cases 초안 자동 생성은 이번 범위가 아니다. 기존 사례 수정·검토는 지원한다.

## 2. 자동 검토 + 직접 내용 검토

```sh
npm run review -- my-next-story
```

원문 SHA-256, 자동 검사 결과, 직접 확인해야 하는 항목을 출력한다. 리포트는 `_private/reviews/`에 저장된다. 원문은 바뀌지 않는다. `checksPassed: true`는 자동 차단 항목이 없다는 뜻이지, 공개 승인이나 사실 검증 완료가 아니다.

자동 검사 범위:
- Markdown 메타데이터·날짜·경력 흐름·사례 연결의 유효성.
- 기본 제목/요약/안내 문구·TODO 잔존 여부.
- 일부 개인 키·AWS/GitHub 토큰 모양·URL 인증 정보. 의심 값 대신 코드와 줄 번호만 보고한다.
- 내부/로컬 주소, 부족한 경력 맥락·글 구조는 경고한다. 예제 주소까지 기밀로 단정하지 않는다.
- 같은 공개 원본이 있으면 비공개 초안으로 덮어쓰지 못하게 한다.

**검출하지 못한 기밀·토큰·개인정보가 있을 수 있다.** 링크가 외부에서 실제 열리는지, 수치가 사실인지, 고객사 공개 승인이 있는지는 자동 판정하지 않는다. 최종 빌드/링크 검사도 별도로 필요하다. 리포트도 커밋하지 않는다.

직접 확인할 세 가지:
1. 사실·수치·본인 역할·측정 범위가 근거와 일치한다.
2. 기밀·개인정보를 제거했고 공개할 권한이 있다.
3. **현재 원문 버전의 공개를 명시적으로 승인했다.** Codex가 이 확인을 자동으로 가정하지 않는다.

## 3. 승인한 버전만 공개 원본으로 준비

아래 `FULL_SHA256`과 날짜를 실제 검토값·발행 예정일로 바꾼다. 세 확인 옵션은 직접 검토와 사용자 승인이 끝난 경우에만 사용한다.

```sh
npm run content:prepare -- my-next-story \
  --review FULL_SHA256 \
  --date YYYY-MM-DD \
  --facts-reviewed \
  --privacy-reviewed \
  --publication-approved
```

- 통과한 리포트와 현재 원문 hash가 같아야 한다. 원문을 바꾸면 review와 내용 확인을 다시 해야 한다.
- 준비 직전에 메타데이터·경력 연결·차단 패턴을 다시 검사한다. 다른 글이 바뀌어 연결이 깨진 경우 이전 리포트만 믿고 진행하지 않는다.
- 비공개 원문은 유지하고 `content/notes/my-next-story.md`를 새로 만든다. `draft:false`, 명시한 `publishedAt`을 적용하되 본문은 그대로 복사한다. 다른 작성자가 먼저 같은 경로를 만들면 덮어쓰지 않는다.
- 결과 `prepared-not-deployed`는 **로컬 공개 원본 준비**이지 실제 발행 완료가 아니다. 이 파일을 공개 브랜치에 push하면 원문은 공개되고, main에 반영하면 Pages 배포가 시작된다.
- 날짜는 준비 시각에서 자동 추정하지 않는다. 실제 발행 예정일을 지정하고, 일정이 바뀌면 반영 전 날짜도 확인한다. 미래 날짜를 넣어도 예약 발행이 되지 않는다.

npm의 자동 실행 lifecycle인 `prepare`와 혼동되지 않도록 npm 명령명은 `content:prepare`를 사용한다. 패키지 설치 시 발행 준비를 실행하는 hook은 등록하지 않는다.

## 4. 한 번에 검증한 뒤 diff 확인

```sh
npm run verify
# 필요한 경우 설치된 Chrome으로 공유 이미지 생성
npm run social
npm run verify
git diff -- content/ dist/
git status --short
```

`verify`는 구문 검사 → 전체 테스트 → 빌드 → 정적 검사 순으로 실행하며 실패 시 중단한다. 의존성 설치나 외부 네트워크 호출, Git 작업은 하지 않는다. `dist/`는 검증 빌드로 재생성되므로 변경 diff를 확인한다.

새 글의 공유 이미지를 아직 만들지 않았다면 기본 카드를 사용한다. `social` 실행 시 `_private`는 읽지 않는다. 최종적으로 생성물·공개 원문·필요한 이미지 변경분만 선택해 커밋한다. 사실·기밀 확인과 공개 승인을 거친 뒤 PR → main 병합 → Actions 성공 → 실제 페이지/RSS 확인으로 발행을 마친다. 자세한 절차는 [publishing.md](publishing.md).

## 기존 글 수정

기존 공개 원본은 같은 slug에서 수정하고 다음처럼 검토한다. `--source content`를 prepare에도 반드시 지정한다.

```sh
npm run review -- notes/object-lifetime --source content
npm run content:prepare -- notes/object-lifetime --source content \
  --review FULL_SHA256 --date YYYY-MM-DD \
  --facts-reviewed --privacy-reviewed --publication-approved
npm run verify
```

최초 `publishedAt`은 유지하고 `updatedAt`만 지정한다. 기존 발행·수정일보다 이전 날짜는 거부한다. 수정 전 원문은 `.trash/`에 백업한다. 준비 이후 다시 편집했다면 검토를 다시 해야 한다. 삭제·회수는 기존 로컬 에디터/문서 절차를 사용하며 이 명령은 삭제하지 않는다.

## Codex 자동화에 연결

반복 요청에는 [초안 작성 프롬프트](prompts/draft-note.md)를 사용한다. 공개 가능한 입력 파일을 구체적으로 지정하고, 지정하지 않은 이력·회사 자료를 탐색하지 않게 한다. 기본 실행 범위는 draft → 원문 작성 → review → 결과 보고다. 자동화에 prepare의 승인 옵션이나 Git push를 기본값으로 넣지 않는다.

CLI의 review/prepare는 stdout에 JSON을, 부가 안내는 stderr에 출력한다(Node 직접 실행 기준). 검토 차단 또는 실패 시 종료 코드는 0이 아니다. JSON 파일을 읽는 자동화도 `checksPassed`를 사람의 승인으로 해석해서는 안 된다. npm 자체 로그가 필요 없으면 `npm run --silent review -- slug`를 사용한다.
