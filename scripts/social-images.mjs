import { access, mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from './build.mjs';
import { loadContent } from '../src/content.mjs';
import { socialKey, socialFingerprint, socialCard, assertSocialPng } from '../src/social.mjs';

// Authoring-only tool. Ordinary builds/CI use committed PNGs and need only Node.
const candidates=[process.env.CHROME_PATH,'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
let chrome;
for(const candidate of candidates) {try{await access(candidate);chrome=candidate;break;}catch{}}
if(!chrome)throw new Error('설치된 Chrome/Chromium이 필요합니다. CHROME_PATH에 실행 파일 경로를 지정하세요. 빌드/배포에는 필요하지 않습니다.');
const docs=await loadContent(root),folder=path.join(root,'src/social'),temp=await mkdtemp(path.join(tmpdir(),'notebook-social-'));
const images=[],manifest={};
try {
  for(const doc of [undefined,...docs]) {
    const key=socialKey(doc),html=path.join(temp,`${key}.html`),png=path.join(temp,`${key}.png`);
    await writeFile(html,socialCard(doc));
    await promisify(execFile)(chrome,['--headless','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-extensions','--disable-sync',`--user-data-dir=${path.join(temp,'profile-'+key)}`,'--hide-scrollbars','--force-device-scale-factor=1','--window-size=1200,630',`--screenshot=${png}`,pathToFileURL(html).href],{timeout:30000,maxBuffer:1024*1024});
    const buffer=await readFile(png);assertSocialPng(buffer);
    images.push([key,buffer]);manifest[key]=socialFingerprint(doc);
  }
  await mkdir(folder,{recursive:true});
  for(const [key,buffer] of images)await writeFile(path.join(folder,`${key}.png`),buffer);
  await writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Rendered ${images.length} social cards (1200×630 PNG). Review before committing.`);
} finally {await rm(temp,{recursive:true,force:true});}
