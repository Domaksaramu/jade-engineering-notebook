# 글 작성·발행·회수

## 현재 상태
- V1 기준본은 `v1.0.0` 태그/릴리스로 보존한다.
- GitHub Pages 대상 주소: https://jade-builds.github.io/blogs/ (배포 결과는 Actions에서 확인).
- 2026-11-06 사용자 승인으로 저장소를 공개 전환하고 Pages의 GitHub Actions 배포를 활성화했다. 원본·커밋 이력·커밋한 초안도 공개된다.
- Pages가 활성화되어 있으므로 `main` 변경 또는 `Deploy portfolio` 수동 실행으로 배포한다. 다른 브랜치에서 수동 실행하면 배포를 건너뛴다.
- GitHub Actions는 정적 `dist/`만 배포한다. `/studio/`와 쓰기 API는 로컬 전용이다.

## 저장소 주소 변경
- 원본: https://github.com/jade-builds/blogs
- 기존 체크아웃은 `git remote set-url origin https://github.com/jade-builds/blogs.git`으로 갱신한다.
- 과거 Pages 주소의 자동 리다이렉트는 전제하지 않는다. 공유한 링크도 새 주소로 수정한다.
- V1 태그와 Git 이력은 이름 변경 전후 동일하게 보존한다.

## 안전한 작성·검토 명령

새 비공개 글은 `npm run draft -- slug` → 텍스트 편집 → `npm run review -- slug`로 작성한다. 승인된 원문만 `prepare`로 공개 원본에 준비한 뒤 `npm run verify`로 일괄 검증한다. **prepare는 외부 배포가 아니다.** 기존 `new`/로컬 에디터는 계속 content에 초안을 만든다. 경로·검토 hash·확인 옵션은 [editorial-workflow.md](editorial-workflow.md)를 참고한다.

## 1. 초안
```sh
git switch main
git pull --ff-only
git switch -c writing/my-next-story
npm run draft -- my-next-story
```
`content:status`의 READY는 빌드 대상이라는 뜻이며 실제 외부 배포 완료를 뜻하지 않는다.

`_private/drafts/notes/my-next-story.md`를 텍스트 에디터로 작성한다. 이 폴더는 로컬 `/studio/` 목록이나 빌드에 포함되지 않는다. 기존 `new`/로컬 에디터는 공개 원본 경로인 content에 파일을 만들므로 비공개 초안 생성과 구분한다.

**중요:** draft는 사이트에서만 제외된다. 저장소가 공개되면 커밋한 Markdown 초안과 과거 이력도 공개된다. 비공개 메모·원천 자료는 이 저장소에 넣지 않는다. `.trash/`는 로컬 복구용이며 커밋하지 않는다.

## 2. 검토
```sh
npm run review -- my-next-story
npm run verify
```
- 회사·프로젝트·기간·개인 역할을 구분했는가?
- 관찰한 사실, 원인에 대한 해석, 향후 제안을 구분했는가?
- 결과 수치의 환경·기간·측정 범위를 확인했는가?
- 내부 URL·로그·고객 정보·자격증명·비공개 코드를 제거했는가?
- 개념도는 실제 운영 구조/코드와 혼동되지 않게 표시했는가?
- 공개해도 되는 글이라는 작성자의 확인을 받았는가?

테스트 성공은 사실·기밀 검토나 공개 승인을 대신하지 않는다. Markdown의 원시 HTML/이미지/MDX는 지원하지 않는다.

## 3. 발행
1. 공개가 승인된 원문의 최신 검토 hash·사실/기밀 검토 확인·명시적 발행일을 사용해 `prepare`한다([명령 예시](editorial-workflow.md#3-승인한-버전만-공개-원본으로-준비)). content 원본은 draft:false가 되며, 이 단계만으로 외부 배포되지는 않는다.
2. `npm run verify`를 실행하고 `npm run dev`의 로컬 미리보기와 diff를 확인한다. 생성물 `dist/`는 직접 고치지 않는다.
3. 변경을 커밋하고 글 브랜치를 push한 뒤 PR을 만든다.
4. `Validate notebook` 성공과 diff를 확인하고 `main`에 병합한다. **Pages 활성화 이후에는 이 병합이 발행 동작이다.**
5. `Deploy portfolio`의 deploy job 성공과 실제 페이지·RSS를 확인한다. 실패하면 현재 공개 버전은 자동으로 새 버전으로 바뀌지 않으며, 실행 로그를 확인하고 수정한다.

명령 예시:
```sh
git add content/notes/my-next-story.md dist/
git commit -m "content: publish my-next-story"
git push -u origin writing/my-next-story
```
GitHub에서 PR을 만들고 검수한다. 초기 설정 완료 뒤에는 API 키 없이 저장소의 기본 Actions 권한과 OIDC로 같은 저장소 Pages에 배포한다.

## 수정·삭제·복구
- 수정: 같은 slug의 원본을 수정 → 검토/PR → main 병합. URL은 유지한다.
- 비공개 회수: `draft: true` → 검토/PR → main 병합. 해당 공개 URL은 404가 된다. 검색엔진/방문자 캐시/공개 Git 이력까지 삭제되는 것은 아니다.
- 삭제: 로컬 에디터 삭제는 `.trash/`로 이동한다. Git diff에서 삭제 파일과 내부 링크를 확인하고 배포한다. 복구할 때는 백업 또는 이전 Git 커밋의 원문을 되돌린다.
- slug 변경은 URL 변경이다. 기존 외부 링크를 보존할 정책 없이 이름을 바꾸지 않는다. 자동 리다이렉트 기능은 아직 없다.
- 잘못된 발행: 문제 커밋을 `git revert <commit>`하는 복구 PR → 검사 → main 병합. 버전 태그를 이동하거나 force-push하지 않는다. V1 전체 코드로 되돌리면 이후 배포 경로 수정도 사라질 수 있으므로 원인 변경만 되돌린다.

## 자동화 경계
Codex에는 공개 가능한 기록만 제공하고 초안 생성·근거 정리·테스트까지 맡긴다. 새 글의 외부 발행은 별도 확인 후 진행한다. 예약 발행/다중 사용자 CMS/기존 글 일괄 이관은 아직 연결하지 않았다.
