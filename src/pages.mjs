import { escape as e } from './content.mjs';
import { journeys, relatedDocuments } from './experience.mjs';
import { seoTags } from './seo.mjs';

const arrow = '<span aria-hidden="true">↗</span>';
export const profile = {
  name:'임재원', email:'jewon945@gmail.com', blog:'https://jade-devblog.vercel.app/',
  careers:[
    {date:'2024.06 — 현재', company:'현대오토에버', role:'Backend · MLOps Engineer / 프로젝트 PL', label:'공통 기반에서 플랫폼 운영으로', text:'스마트팩토리 공통 백엔드와 이기종 DB 대응을 거쳐, ML 서비스의 배포·검증·운영 자동화로 역할을 넓혔습니다.', skills:'Java · Spring · Kubernetes · Helm · FastAPI'},
    {date:'2018.10 — 2024.06', company:'다우기술', role:'Backend Engineer / 공통파트 PL', label:'금융 업무의 경계와 안정성을 다루다', text:'금융 전문 송수신과 제휴 채널 연동, 인증·배치·DB 운영을 담당했습니다. 차세대 프로젝트에서는 여러 개발자가 함께 쓰는 공통 기반을 만들었습니다.', skills:'Java · Spring Security · Batch · Tibero · Oracle'},
    {date:'2017.04 — 2018.04', company:'MDS테크놀러지', role:'HMI Developer / 개발 파트 PL', label:'서로 다른 요구를 하나의 인터페이스로', text:'내비게이션 HMI 데모와 공통 인터페이스를 개발했습니다. 고객사·디자인 업체·개발자 사이의 요구를 정리하고 개발 업무를 조율했습니다.', skills:'EB Guide · 공통 인터페이스 · 개발 협업'}
  ]
};

export function shell({title, description, root='', active='', body, article=false, noindex=false, seo={}}) {
  const link = (href,label,id)=>`<a href="${root}${href}"${active===id?' aria-current="page"':''}>${label}</a>`;
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f6f2">
<title>${e(title)} · 임재원</title><meta name="description" content="${e(description)}">${noindex?'<meta name="robots" content="noindex,nofollow">':''}
<meta property="og:title" content="${e(title)} · 임재원"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="${article?'article':'website'}"><meta property="og:locale" content="ko_KR">
${noindex?'':seoTags({title,description,article,...seo})}
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${root}style.css"><link rel="alternate" type="application/rss+xml" title="임재원의 경험 노트" href="${root}feed.xml"><script src="${root}app.js" defer></script></head>
<body><a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="site-header"><div class="container header-inner"><a class="brand" href="${root}index.html" aria-label="임재원 홈"><span class="brand-mark">j<span>.</span></span><span>임재원<span class="brand-caption">ENGINEERING NOTEBOOK</span></span></a>
<nav class="desktop-nav" aria-label="주 메뉴">${link('index.html#work','경험','work')}${link('index.html#career','경력','career')}${link('writing/','노트','writing')}</nav><a class="header-contact" href="mailto:${profile.email}">이야기 나누기 ${arrow}</a>
<details class="mobile-nav"><summary>메뉴 <span aria-hidden="true">＋</span></summary><nav aria-label="모바일 메뉴">${link('index.html#work','경험','work')}${link('index.html#career','경력','career')}${link('writing/','노트','writing')}<a href="mailto:${profile.email}">연락하기</a></nav></details></div></header>
${body}
<footer class="site-footer"><div class="container"><div class="footer-top"><div><span class="eyebrow">LET’S TALK</span><h2>함께 풀어 볼 문제가 있나요?</h2><p>백엔드의 실행 경로부터 운영의 다음 단계까지 이야기합니다.</p></div><a class="contact-link" href="mailto:${profile.email}">${profile.email} ${arrow}</a></div><div class="footer-bottom"><span>© 2026 임재원</span><span>경험을 기록하고, 다음 설계로 연결합니다.</span><a href="${profile.blog}" target="_blank" rel="noopener noreferrer">기존 블로그 ${arrow}</a></div></div></footer>
</body></html>`;
}

const tags = list=>`<span class="tags">${list.map(t=>`<span>${e(t)}</span>`).join('')}</span>`;
function journeyNavigation(docs,root='',active='') {
  const published=docs.filter(d=>!d.draft);
  return `<nav class="journey-nav" aria-label="경력 흐름별 탐색">${journeys.map((j,i)=>{
    const group=published.filter(d=>d.journey===j.id);
    return `<a class="journey-link" href="${root}${j.href}"${j.id===active?' aria-current="page"':''}><span class="journey-number">0${i+1}</span><span><strong>${e(j.title)}</strong><span class="journey-count">사례 ${group.filter(d=>d.kind==='cases').length} · 기술 글 ${group.filter(d=>d.kind==='notes').length}</span></span>${arrow}</a>`;
  }).join('')}</nav>`;
}
function connectionRow(doc,root) {
  return `<a class="related-link" href="${root}${doc.href}"><span class="connection-copy"><span class="connection-label">${doc.kind==='cases'?'프로젝트 사례':'기술 글'} · ${e(doc.period)}</span><strong>${e(doc.title)}</strong><span class="connection-meta">${e([doc.company,doc.project].filter(Boolean).join(' / '))}</span></span>${arrow}</a>`;
}
function caseNotes(doc,docs) {
  return relatedDocuments(doc,docs).project.slice(0,2).map(note=>`<a class="text-link case-note-link" href="${note.href}">기술 글: ${e(note.title)} ${arrow}</a>`).join('');
}
function articleConnections(doc,docs,root) {
  const index=journeys.findIndex(j=>j.id===doc.journey);
  if(index<0)return '';
  const {project,journey}=relatedDocuments(doc,docs),current=journeys[index],next=journeys[index+1];
  return `<section class="related"><p class="eyebrow">EXPERIENCE / CONNECTED</p><h2>이 경험에서 이어 읽기</h2>${project.length?`<h3>${doc.kind==='cases'?'이 프로젝트의 기술 글':'이 글의 프로젝트 사례'}</h3>${project.map(d=>connectionRow(d,root)).join('')}`:''}${journey.length?`<h3>같은 경력 흐름의 다른 글</h3>${journey.slice(0,2).map(d=>connectionRow(d,root)).join('')}`:''}<div class="connection-navigation"><a class="text-link" href="${root}${current.href}">${e(current.title)}의 경험 모아 보기 ${arrow}</a>${next?`<a class="text-link" href="${root}${next.href}">다음 경력 흐름: ${e(next.title)} ${arrow}</a>`:''}</div></section>`;
}
export function noteRow(note,root='') {
  return `<article class="note-row" data-note data-search="${e([note.title,note.summary,note.category,note.company||'',note.project||'',note.role||'',journeys.find(j=>j.id===note.journey)?.title||'',...note.tags].join(' ').toLowerCase())}" data-category="${e(note.category)}"><div class="note-meta"><span>${e(note.category)}</span><span>${e(note.period)}</span></div><div><h3><a href="${root}${note.href}">${e(note.title)} ${arrow}</a></h3>${note.project?`<p class="note-project">${e(note.company)} / ${e(note.project)}</p>`:''}<p>${e(note.summary)}</p>${tags(note.tags)}</div><span class="read-time">${note.publishedAt?`<time datetime="${e(note.publishedAt)}">${e(note.publishedAt.replaceAll('-','.'))} 발행</time>`:''}${note.minutes}분 읽기</span></article>`;
}
export function home(docs,seo={}) {
  const cases=docs.filter(d=>d.kind==='cases'), notes=docs.filter(d=>d.kind==='notes');
  const first=cases[0];
  return shell({seo,title:'시스템을 이해하고, 운영까지',description:'금융 백엔드에서 MLOps 플랫폼까지. 임재원의 경력과 기술적 판단을 기록하는 엔지니어링 노트북.',body:`
<main id="main">
<section class="hero container" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow"><span class="status-dot" aria-hidden="true"></span> BACKEND / PLATFORM ENGINEER</p><h1 id="hero-title">문제를 좁히고,<br>구조를 바꾸고,<br><span>운영으로 확인합니다.</span></h1><p class="hero-description">안녕하세요, 백엔드 엔지니어 <strong>임재원</strong>입니다.<br>금융 연동부터 ML 서비스 운영까지,<br>시스템의 경계를 이해하고 반복되는 문제를 줄여 왔습니다.</p><div class="hero-actions"><a class="button" href="#work">문제 해결 사례 보기 <span aria-hidden="true">↓</span></a><a class="text-link" href="#career">어떤 길을 걸어왔나요 ${arrow}</a></div></div>
<aside class="career-map" aria-label="경력의 확장 방향"><div class="map-head"><span class="eyebrow">THE THREAD THROUGH MY WORK</span><span class="map-index">01 — 03</span></div><p class="map-intro">환경은 달라져도, <br>질문은 이어집니다.</p><ol>${journeys.map((j,i)=>`<li><span class="map-step">0${i+1}</span><div><h2><a href="${j.href}">${e(j.heading)}</a></h2><p>${e(j.detail)}</p></div><span class="map-year">${j.year}</span></li>`).join('')}</ol><div class="map-foot"><span class="tiny-square" aria-hidden="true"></span><span>도메인보다 오래 남는, 문제를 푸는 방식.</span></div></aside></section>
<div class="container intro-rule"><span class="eyebrow">HOW I WORK</span><p>기술의 이름보다 <strong>바뀐 실행 경로</strong>를,<br class="mobile-only"> 큰 숫자보다 <strong>판단의 근거</strong>를 남깁니다.</p></div>
<section class="work-section container" id="work" aria-labelledby="work-title"><div class="section-heading"><div><p class="eyebrow">01 / SELECTED EXPERIENCE</p><h2 id="work-title">경험에서 꺼낸 세 가지 장면</h2></div><p>무엇을 만들었는지보다,<br>왜 그렇게 바꿨는지를 이야기합니다.</p></div>
<article class="featured-case"><div class="featured-copy"><div class="case-topline"><span class="eyebrow">CASE 01</span><span>${e(first.category)}</span></div><p class="company-label">${e(first.company)} <span>/${e(first.period)}</span></p><h3><a href="${first.href}">${e(first.title)} ${arrow}</a></h3><p>${e(first.summary)}</p><p class="role-caption">${e(first.role)}</p><a class="text-link" href="${first.href}">분석과 변경 과정 읽기 ${arrow}</a>${caseNotes(first,docs)}</div><div class="case-evidence">${first.slug!=='auth-cache'?`<div class="evidence-label">CONTEXT / CHANGE / SCOPE</div><div class="trace-row"><span>범위</span><strong>${e(first.role)}</strong></div><div class="trace-row"><span>결과</span><strong>${e(first.result)}</strong></div><div class="trace-row"><span>성과 범위</span><strong>${e(first.scope)}</strong></div>`:`<div class="evidence-label">FROM SYMPTOM TO CAUSE</div><div class="trace-row"><span>관찰</span><strong>CPU 급증 · 서버 중단</strong></div><div class="trace-row"><span>추적</span><strong>Heap · GC · 인증 캐시 누적</strong></div><div class="trace-row"><span>변경</span><strong>요청 종료 정리 · 퇴거 로직</strong></div><div class="evidence-result"><span>Heap 사용량 변화</span><strong>10<span>GB</span> <i aria-hidden="true">→</i> 3.5<span>GB</span></strong><p>약 65% 감소 · 측정 범위는 상세 본문에서 구분</p></div>`}</div></article>
<div class="secondary-cases">${cases.slice(1).map((d,i)=>`<article class="compact-case"><div class="case-topline"><span class="eyebrow">CASE 0${i+2}</span><span>${e(d.category)}</span></div><p class="company-label">${e(d.company)}</p><h3><a href="${d.href}">${e(d.title)} ${arrow}</a></h3><p>${e(d.summary)}</p><div class="compact-result"><strong>${e(d.result)}</strong><span>${e(d.scope)}</span></div>${tags(d.tags)}<a class="text-link case-bottom-link" href="${d.href}">사례 자세히 읽기 ${arrow}</a>${caseNotes(d,docs)}</article>`).join('')}</div></section>
<section id="career" class="career-section"><div class="container"><div class="section-heading"><div><p class="eyebrow">02 / CAREER JOURNEY</p><h2>역할은 넓어지고,<br>관심은 더 깊어졌습니다.</h2></div><p>인터페이스에서 백엔드로,<br>개별 기능에서 공통 기반과 운영으로.</p></div><div class="career-list">${profile.careers.map((c,i)=>`<article class="career-row"><div class="career-period"><span>${e(c.date)}</span>${i===0?'<span class="current-label">현재</span>':''}</div><div class="career-company"><h3>${e(c.company)}</h3><p>${e(c.role)}</p></div><div class="career-story"><h4>${e(c.label)}</h4><p>${e(c.text)}</p><span>${e(c.skills)}</span></div></article>`).join('')}</div><div class="career-note"><p>함께 일하는 방식</p><strong>공통파트 PL로 개발 기준을 정리하고,<br>직접 구현한 변경을 운영에서 확인해 왔습니다.</strong><span>팀 전체의 성과와 개인의 담당 범위는 사례별로 구분합니다.</span></div></div></section>
<section class="notes-section container" aria-labelledby="notes-title"><div class="section-heading"><div><p class="eyebrow">03 / FIELD NOTES</p><h2 id="notes-title">지나온 문제에서, 다음 설계의 기준을</h2></div><a class="text-link" href="writing/">노트 모아 보기 ${arrow}</a></div><p class="section-intro">직접 수행한 프로젝트에서 배운 점과 기술적 판단을 정리한 경험 노트입니다. 앞으로의 기술 글도 이곳에 쌓아 갑니다.</p>${notes.map(d=>noteRow(d)).join('')}</section>
</main>`});
}

function articleDates(doc) {
  if(!doc.publishedAt)return '';
  const date=(label,value)=>`<span>${label} <time datetime="${e(value)}">${e(value.replaceAll('-','.'))}</time></span>`;
  return `<div class="article-dates">${date('발행',doc.publishedAt)}${doc.updatedAt && doc.updatedAt!==doc.publishedAt?date('수정',doc.updatedAt):''}<span>${doc.minutes}분 읽기</span></div>`;
}
export function article(doc,docs,seo={}) {
  const root='../../'; const journey=journeys.find(j=>j.id===doc.journey);
  const toc=doc.toc.filter(t=>t.level===2).map(t=>`<a href="#${t.id}">${e(t.title)}</a>`).join('');
  return shell({seo:{publishedAt:doc.publishedAt,updatedAt:doc.updatedAt,...seo},title:doc.title,description:doc.summary,root,active:doc.kind==='notes'?'writing':'work',article:true,body:`<main id="main" class="article-page container"><div class="article-breadcrumb"><a href="${root}index.html">홈</a><span>/</span><a href="${root}${doc.kind==='cases'?'index.html#work':'writing/'}">${doc.kind==='cases'?'문제 해결 사례':'경험 노트'}</a></div><header class="article-header"><span class="eyebrow">${e(doc.category)} / ${doc.kind==='cases'?'CASE STUDY':'FIELD NOTE'}</span><h1>${e(doc.title)}</h1><p class="article-lead">${e(doc.summary)}</p>${articleDates(doc)}<div class="article-context">${doc.company?`<div><span>회사 · 수행 환경</span><strong>${e(doc.company)}</strong></div>`:''}${doc.project?`<div><span>프로젝트</span><strong>${e(doc.project)}</strong></div>`:''}<div><span>경험 시기</span><strong>${e(doc.period)}</strong></div>${doc.role?`<div><span>담당 범위</span><strong>${e(doc.role)}</strong></div>`:''}<div><span>기술 · 주제</span><strong>${doc.tags.map(e).join(' · ')}</strong></div>${journey?`<div><span>경력 흐름</span><a class="context-link" href="${root}${journey.href}">${e(journey.title)} ${arrow}</a></div>`:''}</div></header>${toc?`<details class="mobile-toc"><summary>이 글의 목차 <span>${doc.toc.filter(t=>t.level===2).length}개 섹션</span></summary><nav aria-label="모바일 글 목차">${toc}</nav></details>`:''}<div class="article-grid"><aside class="article-toc"><p class="eyebrow">IN THIS STORY</p><nav aria-label="이 글의 목차">${toc}</nav><p class="toc-note">직접 수행한 경험과 기술적 판단을 정리했습니다.<br>개념도는 실제 코드·운영 구성과 구분합니다.</p></aside><article class="prose">${doc.html}<div class="article-end"><span>임재원 · Backend / Platform Engineer</span><a href="mailto:${profile.email}">이 경험에 대해 이야기 나누기 ${arrow}</a></div></article></div>${articleConnections(doc,docs,root)}</main>`});
}

export function writing(docs,seo={}) {
  const notes=docs.filter(d=>d.kind==='notes');
  return shell({seo,title:'경험 노트',description:'백엔드·운영·자동화 경험에서 다음 설계의 기준을 찾는 임재원의 기록.',root:'../',active:'writing',body:`<main id="main" class="writing-page container"><header class="writing-header"><p class="eyebrow">FIELD NOTES</p><h1>한 번의 해결을,<br>다음의 기준으로.</h1><p>운영 중 만난 문제와 그 뒤에 남은 질문을 기록합니다.<br>완료한 경험과 앞으로 확인할 일을 구분해 씁니다.</p></header><section class="writing-journeys" aria-labelledby="journey-heading"><h2 id="journey-heading">경험의 흐름으로 읽기</h2>${journeyNavigation(docs,'../')}</section><form class="note-search" role="search"><label for="search">노트 검색</label><div><input id="search" type="search" placeholder="제목, 주제, 기술로 찾아보기" autocomplete="off"><span aria-hidden="true">⌕</span></div></form><div class="filter-row" role="group" aria-label="노트 분류"><button type="button" data-filter="all" aria-pressed="true">전체</button>${[...new Set(notes.map(n=>n.category))].map(c=>`<button type="button" data-filter="${e(c)}" aria-pressed="false">${e(c)}</button>`).join('')}<span id="search-count" aria-live="polite">${notes.length}개의 노트</span></div><div id="note-list">${notes.map(d=>noteRow(d,'../')).join('')}</div><p id="empty-state" hidden>검색 결과가 없습니다. 다른 단어나 분류를 선택해 주세요.</p><div class="writing-foot"><span class="eyebrow">CONTINUOUSLY WRITTEN</span><p>내용은 Markdown으로 관리합니다.<br>경험이 쌓이면, 기록도 함께 다듬어 갑니다.</p><a class="text-link" href="../feed.xml">RSS 구독 ${arrow}</a></div></main>`});
}

export function journeyPage(journey,docs,seo={}) {
  const root='../../',index=journeys.findIndex(j=>j.id===journey.id);
  const connected=docs.filter(d=>!d.draft && d.journey===journey.id);
  const cases=connected.filter(d=>d.kind==='cases'),notes=connected.filter(d=>d.kind==='notes');
  return shell({seo,title:`${journey.title}의 경험`,description:journey.summary,root,active:'writing',body:`
<main id="main" class="writing-page container">
  <div class="article-breadcrumb"><a href="${root}index.html">홈</a><span>/</span><a href="${root}writing/">경험 노트</a><span>/</span><span>${e(journey.title)}</span></div>
  <header class="writing-header"><p class="eyebrow">CAREER THREAD / 0${index+1}</p><h1>${e(journey.heading)}</h1><p>${e(journey.summary)}</p></header>
  ${journeyNavigation(docs,root,journey.id)}
  <section class="journey-content" aria-labelledby="journey-cases"><h2 id="journey-cases">프로젝트 사례</h2><p class="section-intro">어떤 문제를 맡았고, 무엇을 바꿨는지 읽습니다. 각 글의 프로젝트와 기간은 별도로 표시합니다.</p>${cases.length?cases.map(d=>connectionRow(d,root)).join(''):'<p class="journey-empty">아직 공개된 프로젝트 사례가 없습니다.</p>'}</section>
  <section class="journey-content" aria-labelledby="journey-notes"><h2 id="journey-notes">경험에서 이어진 기술 글</h2><p class="section-intro">구현 이후에 남은 판단과 다음 설계의 기준을 정리합니다.</p>${notes.length?notes.map(d=>noteRow(d,root)).join(''):'<p class="journey-empty">아직 공개된 기술 글이 없습니다. 위 프로젝트 사례부터 살펴보세요.</p>'}</section>
  <nav class="journey-pagination" aria-label="다른 경력 흐름">${[journeys[index-1],journeys[index+1]].filter(Boolean).map(j=>`<a class="text-link" href="${root}${j.href}">${j===journeys[index-1]?'이전':'다음'} 흐름 · ${e(j.title)} ${arrow}</a>`).join('')}<a class="text-link" href="${root}writing/">전체 노트 보기 ${arrow}</a></nav>
</main>`});
}
