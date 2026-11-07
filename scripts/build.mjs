import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadContent, escape as e, publishedNotes } from '../src/content.mjs';
import { home, article, writing, shell, journeyPage } from '../src/pages.mjs';
import { journeys } from '../src/experience.mjs';
import { createHash } from 'node:crypto';
import { socialKey, socialFingerprint, assertSocialPng } from '../src/social.mjs';

export const root = fileURLToPath(new URL('../',import.meta.url));
export function siteLocation(value=process.env.SITE_URL || 'https://jade-builds.github.io/blogs') {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('SITE_URL은 인증 정보·쿼리·fragment 없는 https 사이트 주소여야 합니다.');
  }
  const prefix = url.pathname.replace(/\/$/, '') + '/';
  return { address: url.origin + prefix.replace(/\/$/, ''), prefix };
}
export async function build({projectRoot=root, output=path.join(projectRoot,'dist'), siteUrl, localPreview=false}={}) {
  const { address: origin, prefix: publishedPrefix } = siteLocation(siteUrl);
  const prefix = localPreview ? '/' : publishedPrefix;
  const docs=await loadContent(projectRoot);
  if(docs.filter(d=>d.kind==='cases').length<1) throw new Error('공개 사례가 1개 이상 필요합니다.');
  const socialFolder=path.join(projectRoot,'src/social');
  const manifest=JSON.parse(await readFile(path.join(socialFolder,'manifest.json'),'utf8'));
  const cards=new Map();
  for(const doc of [undefined,...docs]) {
    const key=socialKey(doc);
    if(manifest[key]!==socialFingerprint(doc)) {
      if(!doc)throw new Error('기본 공유 이미지를 npm run social로 다시 생성하세요.');
      console.warn(`${doc.href}: 공유 이미지는 기본 카드 사용 (npm run social로 갱신 가능)`);
      continue;
    }
    const buffer=await readFile(path.join(socialFolder,`${key}.png`));assertSocialPng(buffer);
    const digest=createHash('sha256').update(buffer).digest('hex').slice(0,12);
    cards.set(key,{buffer,href:`social/${key}-${digest}.png`});
  }
  const metadata=(route,doc)=>{
    const key=socialKey(doc),own=cards.has(key),card=cards.get(own?key:'notebook');
    return {canonical:`${origin}/${route}`,image:`${origin}/${card.href}`,imageAlt:own&&doc?`${doc.title} · 임재원`:'임재원 · 금융 백엔드에서 MLOps 플랫폼까지'};
  };
  await rm(output,{recursive:true,force:true}); await mkdir(output,{recursive:true});
  const save=async (file,body)=>{await mkdir(path.dirname(path.join(output,file)),{recursive:true});await writeFile(path.join(output,file),body);};
  for(const card of cards.values())await save(card.href,card.buffer);
  await save('index.html',home(docs,metadata('')));
  await save('writing/index.html',writing(docs,metadata('writing/')));
  for(const journey of journeys) await save(`${journey.href}index.html`,journeyPage(journey,docs,metadata(journey.href)));
  for(const doc of docs) await save(`${doc.href}index.html`,article(doc,docs,metadata(doc.href,doc)));
  await save('404.html',shell({title:'페이지를 찾지 못했습니다',description:'주소가 변경됐거나 존재하지 않는 페이지입니다.',root:prefix,noindex:true,body:`<main id="main" class="container error-page"><p class="eyebrow">404 / NOT FOUND</p><h1>이 페이지는 아직 기록되지 않았습니다.</h1><p>주소를 확인하거나 홈에서 다른 경험을 살펴보세요.</p><a class="button" href="${e(prefix)}">홈으로 돌아가기</a></main>`}));
  for(const file of ['style.css','app.js']) await cp(path.join(projectRoot,'src',file),path.join(output,file));
  await save('favicon.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#293e36"/><text x="18" y="44" font-size="43" font-family="sans-serif" font-weight="bold" fill="#f7f6f2">j</text><circle cx="45" cy="44" r="4" fill="#f0bd9c"/></svg>');
  await save('.nojekyll','');
  await save('robots.txt',`User-agent: *\nDisallow: ${prefix}studio/\nSitemap: ${origin}/sitemap.xml\n`);
  // Relative URLs preserve portability between an origin and GitHub project Pages.
  const link=origin||'.';
  await save('feed.xml',`<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>임재원의 경험 노트</title><link>${e(link)}/</link><description>경험에서 다음 설계의 기준을 찾습니다.</description><language>ko</language>${publishedNotes(docs).map(d=>`<item><title>${e(d.title)}</title><link>${e(link)}/${d.href}</link><guid isPermaLink="false">jaewon:${e(d.slug)}</guid><description>${e(d.summary)}</description>${d.publishedAt?`<pubDate>${new Date(d.publishedAt).toUTCString()}</pubDate>`:''}</item>`).join('')}</channel></rss>`);
  if(origin) await save('sitemap.xml',`<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['','writing/',...journeys.map(j=>j.href),...docs.map(d=>d.href)].map(p=>{const doc=docs.find(d=>d.href===p),date=doc?.updatedAt||doc?.publishedAt;return `<url><loc>${e(origin)}/${p}</loc>${date?`<lastmod>${date}</lastmod>`:''}</url>`;}).join('')}</urlset>`);
  await save('content-index.json',JSON.stringify(docs.map(({title,summary,kind,slug,category,tags,href})=>({title,summary,kind,slug,category,tags,href})),null,2));
  console.log(`Built ${docs.length+3+journeys.length} HTML pages · ${docs.length} published documents`);
  return docs;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await build();
