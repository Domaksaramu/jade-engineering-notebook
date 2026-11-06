import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { journeys, validateConnections } from './experience.mjs';

export const kinds = ['cases', 'notes'];
export const validSlug = slug => typeof slug==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;
export const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeUrl(value) {
  return /^(?:https?:\/\/|mailto:|#|\.\.?\/|\/[^/])/.test(value) && !/[\x00-\x20\\]/.test(value) ? value : '#';
}
export function inline(text) {
  const tokens = [];
  const placeholder = html => `\u0000${tokens.push(html)-1}\u0000`;
  const source = String(text).replace(/\u0000/g, '');
  return escape(source.replace(/`([^`]+)`/g, (_, code) => placeholder(`<code>${escape(code)}</code>`))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, title, href) => placeholder(`<a href="${escape(safeUrl(href))}">${escape(title)}</a>`)))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[index]);
}
export function markdown(source) {
  const lines = source.replace(/\r/g,'').split('\n');
  const output = []; let i = 0; let headingIndex = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const code=[]; i++; while(i<lines.length && !lines[i].startsWith('```')) code.push(lines[i++]); i++;
      output.push(`<pre><code>${escape(code.join('\n'))}</code></pre>`); continue;
    }
    const heading = /^(#{2,4})\s+(.+)$/.exec(line);
    if (heading) { output.push(`<h${heading[1].length} id="section-${headingIndex++}">${inline(heading[2])}</h${heading[1].length}>`); i++; continue; }
    if (line.startsWith('|') && lines[i+1]?.match(/^\|[\s:|\-]+\|$/)) {
      const cells = s=>s.trim().slice(1,-1).split('|').map(x=>inline(x.trim()));
      const head=cells(line); i+=2; const rows=[];
      while(lines[i]?.startsWith('|')) rows.push(cells(lines[i++]));
      output.push(`<div class="table-wrap"><table><thead><tr>${head.map(c=>`<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`); continue;
    }
    if (/^[-*] /.test(line)) {
      const items=[]; while(/^[-*] /.test(lines[i]||'')) items.push(`<li>${inline(lines[i++].slice(2))}</li>`);
      output.push(`<ul>${items.join('')}</ul>`); continue;
    }
    if (line.startsWith('> ')) { output.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); i++; continue; }
    const paragraph=[line]; i++;
    while(i<lines.length && lines[i].trim() && !/^(#{2,4} |[-*] |> |```|\|)/.test(lines[i])) paragraph.push(lines[i++]);
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return output.join('\n');
}
export function parseDocument(raw, slug, kind) {
  if (!validSlug(slug) || !kinds.includes(kind)) throw new Error('올바르지 않은 글 경로입니다.');
  const match=/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`${slug}: Markdown 상단에 메타데이터가 필요합니다.`);
  const meta={};
  for(const line of match[1].split(/\r?\n/)) {
    const field=/^([a-zA-Z]+):\s*(.+)$/.exec(line);
    if(!field || Object.hasOwn(meta,field[1])) throw new Error(`${slug}: 잘못되거나 중복된 메타데이터입니다.`);
    try { meta[field[1]]=JSON.parse(field[2]); } catch { throw new Error(`${slug}: ${field[1]} 값은 JSON 문자열/배열/boolean으로 작성하세요.`); }
  }
  for(const key of ['title','summary','category','period']) if(typeof meta[key]!=='string'||!meta[key].trim()) throw new Error(`${slug}: ${key} 필수`);
  if(typeof meta.draft!=='boolean') throw new Error(`${slug}: draft는 true/false로 지정하세요.`);
  if(!Array.isArray(meta.tags)||meta.tags.some(t=>typeof t!=='string')) throw new Error(`${slug}: tags는 문자열 배열입니다.`);
  if(kind==='cases') for(const key of ['company','role','result','scope']) if(typeof meta[key]!=='string') throw new Error(`${slug}: ${key} 필수`);
  for(const key of ['company','project','role']) if(meta[key]!==undefined && (typeof meta[key]!=='string'||!meta[key].trim())) throw new Error(`${slug}: ${key}는 비어 있지 않은 문자열이어야 합니다.`);
  if(meta.journey!==undefined) {
    if(!journeys.some(j=>j.id===meta.journey))throw new Error(`${slug}: 올바른 경력 흐름을 지정하세요.`);
    for(const key of ['company','project','role'])if(!meta[key])throw new Error(`${slug}: 경력 흐름에 연결하려면 ${key} 필수`);
  }
  if(meta.relatedCases!==undefined) {
    if(kind!=='notes'||!Array.isArray(meta.relatedCases)||meta.relatedCases.some(s=>!validSlug(s))||new Set(meta.relatedCases).size!==meta.relatedCases.length)throw new Error(`${slug}: relatedCases는 중복 없는 사례 slug 배열이어야 합니다.`);
    if(meta.relatedCases.length&&!meta.journey)throw new Error(`${slug}: 사례를 연결하려면 경력 흐름을 지정하세요.`);
  }
  if(!match[2].trim()) throw new Error(`${slug}: 본문이 비어 있습니다.`);
  const toc=[]; let inCode=false;
  for(const line of match[2].split(/\r?\n/)) {
    if(line.startsWith('```')) {inCode=!inCode;continue;}
    if(inCode)continue;
    const heading=/^(#{2,4})\s+(.+)$/.exec(line);
    if(heading)toc.push({title:heading[2],id:`section-${toc.length}`,level:heading[1].length});
  }
  return { ...meta, slug, kind, body:match[2], html:markdown(match[2]), toc, href:`${kind}/${slug}/`, minutes:Math.max(1,Math.ceil(match[2].length/650)) };
}
export async function loadContent(root, {drafts=false,validate=true}={}) {
  const result=[];
  for(const kind of kinds) for(const file of (await readdir(path.join(root,'content',kind))).sort()) {
    if(!file.endsWith('.md')) continue;
    const doc=parseDocument(await readFile(path.join(root,'content',kind,file),'utf8'),file.slice(0,-3),kind);
    result.push(doc);
  }
  if(validate)validateConnections(result);
  return result.filter(d=>drafts||!d.draft).sort((a,b)=>(a.order??99)-(b.order??99)||a.slug.localeCompare(b.slug));
}
