import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadContent } from '../src/content.mjs';
import { documentPath } from '../src/workspace.mjs';

export function newNote(title='새 경험의 제목') {
  return `---\ntitle: ${JSON.stringify(title)}\nsummary: "어떤 문제와 판단을 기록할지 한 문장으로 작성하세요."\ncategory: "경험 노트"\nperiod: "2026 경험 정리"\ntags: ["Backend"]\norder: 99\ndraft: true\n---\n## 어떤 상황이었나요\n\n실제로 경험한 상황과 본인의 담당 범위를 작성합니다.\n\n## 무엇을 보고 판단했나요\n\n확인한 사실과 해석을 구분합니다.\n\n## 무엇을 바꾸고 확인했나요\n\n변경과 검증의 범위, 남은 질문을 작성합니다.\n`;
}
export async function createNote(root,slug) {const file=await documentPath(root,'notes',slug);await writeFile(file,newNote(),{flag:'wx'});return file;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const slug=process.argv[2];if(slug==='--list') {
    const docs=await loadContent(fileURLToPath(new URL('../',import.meta.url)),{drafts:true});
    for(const doc of docs) console.log(`${doc.draft?'DRAFT (not deployed)':'READY (included in build)'} | ${doc.href} | ${doc.title}`);
    console.log('draft:true는 사이트 빌드에서만 제외됩니다. 공개 저장소에 커밋하면 원문은 공개됩니다.');
  }else if(!slug){console.error('사용법: npm run new -- my-next-story');process.exitCode=1;}else{try{console.log(await createNote(fileURLToPath(new URL('../',import.meta.url)),slug));}catch(error){console.error(error.message);process.exitCode=1;}}
}
