# 읽기·공유 기준

## 날짜는 경험과 발행을 구분한다

```text
publishedAt: "2026-11-06"
updatedAt: "2026-11-10"
```

- 두 값은 선택 사항이며 실제 달력 날짜 `YYYY-MM-DD`만 받는다. `updatedAt`은 `publishedAt`이 있을 때, 그 날짜 이상이어야 한다.
- `period`는 프로젝트·경험 시기다. 발행일을 과거 프로젝트 기간으로 소급하지 않는다.
- 현재 공개 글 6개의 날짜는 GitHub Pages 공개 전환·글 발행 기록을 기준으로 `2026-11-06`을 명시했다. 원문 초안 작성일이나 과거 다른 미리보기의 최초 공개일을 뜻하지 않는다.
- `updatedAt`은 본문·기술적 판단의 의미 있는 수정일만 직접 기록한다. 빌드 시각, CSS·탐색 변경, 파일 수정 시각을 자동으로 사용하지 않는다. 현재 글에는 수정일을 임의로 추가하지 않았다.
- 화면, Article JSON-LD와 Open Graph, RSS, sitemap은 같은 명시적 날짜를 사용한다. 발행일과 수정일이 같으면 화면의 수정일은 중복 표시하지 않는다.
- RSS는 날짜 단위를 RFC 형식의 해당 날짜 `00:00:00 GMT`로 정규화한다. 정확한 발행 시각을 복원한 값은 아니다. sitemap의 `lastmod`는 수정일이 있으면 수정일, 없으면 발행일이다. 날짜를 모르면 생략한다.

## 모바일과 긴 기술 자료

- 900px 이하에서는 본문 앞에 기본 접힘 `details` 목차를 제공한다. 큰 화면의 기존 고정 목차는 유지한다.
- 실제 h2와 같은 앵커를 사용하며 코드 블록의 가짜 제목은 목차에 들어가지 않는다. JavaScript 없이도 펼치기와 이동이 가능하다.
- JavaScript가 있으면 선택 후 목차를 접고 제목으로 키보드 포커스를 옮긴다. Escape는 목차를 접고 요약 버튼으로 포커스를 돌린다.
- 긴 코드·개념도는 줄을 임의로 꺾지 않는다. 자신의 컨테이너만 가로 스크롤하고, 모바일 코드 크기는 12px로 조정한다. 코드·표에 키보드 접근과 스크롤 안내를 제공한다.
- 기존 글 본문과 개념도는 다시 쓰지 않는다.

## 공유 이미지와 검색 메타데이터

모든 정상 페이지는 `SITE_URL`에 맞는 canonical, Open Graph URL·이미지, Twitter 큰 이미지 카드 정보를 제공한다. 글에는 안전하게 직렬화한 BlogPosting JSON-LD를 추가한다. 404는 noindex이며 canonical과 공유 이미지를 제공하지 않는다.

글별 PNG는 1200×630이다. 기존 종이색·잉크·주황 포인트, 시스템 한글 폰트를 사용한다. 제목·분류·회사만 이미지에 넣고 수치를 임의로 강조하지 않는다. 홈·목록·경력 흐름 페이지는 기본 카드를 사용한다.

```sh
npm run social             # 설치된 Chrome/Chromium으로 공개 글 이미지 갱신
npm test
npm run build
npm run check
```

필요하면 `CHROME_PATH=/absolute/path/to/chrome npm run social`을 사용한다. 새 패키지나 브라우저 자동 설치는 하지 않는다. `src/social/*.png`와 `manifest.json`을 함께 커밋한다. **평소 빌드·CI·배포에는 Chrome이 필요 없다.**

- 이미지 제작은 공개 글만 대상으로 한다. 빌드도 공개 글에 필요한 이미지만 복사하며, 초안·사용하지 않는 원본 이미지는 배포하지 않는다.
- 제목·분류·회사 또는 카드 디자인 버전이 달라져 기존 이미지 문구가 맞지 않으면 기본 카드로 안전하게 대체한다. 새 글도 이미지 생성 전에는 기본 카드를 사용한다. 잘못된 옛 제목을 공유하지 않으며 로컬 편집·빌드는 계속된다.
- 이미지 URL에 실제 파일 내용의 해시를 붙여 갱신 후 이전 파일 캐시와 구분한다. 외부 공유 플랫폼이 이미 저장한 미리보기의 즉시 갱신까지 보장하지는 않는다.
- `src/social.mjs` 디자인 수정 시 `socialFingerprint`의 버전도 올린 뒤 이미지를 다시 생성하고 잘림·줄바꿈을 눈으로 확인한다.
- `check`는 canonical·로컬 PNG·JSON-LD URL·목차 앵커·초안 제외를 검사한다. 실제 검색 색인이나 카카오톡 등 외부 플랫폼의 카드 렌더링 성공은 이 검사만으로 보장하지 않는다.

기준: [Open Graph](https://ogp.me/), [Google Article 구조화 데이터](https://developers.google.com/search/docs/appearance/structured-data/article), [Google 발행일 안내](https://developers.google.com/search/docs/appearance/publication-dates). 검색 노출 순위·확장 검색 결과를 보장하는 기능은 아니다.
