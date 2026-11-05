import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, readFile, stat, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { newNote } from '../scripts/content.mjs';
import { build, root } from '../scripts/build.mjs';

async function fixture(t) {
  const folder = await realpath(await mkdtemp(path.join(os.tmpdir(), 'notebook-pages-')));
  t.after(() => rm(folder, { recursive: true, force: true }));
  for (const dir of ['src', 'content']) await cp(path.join(root, dir), path.join(folder, dir), { recursive: true });
  return folder;
}

test('Project Pages: a nested 404 keeps assets and navigation under the repository path', async t => {
  const folder = await fixture(t);
  await build({ projectRoot: folder, siteUrl: 'https://example.github.io/notebook/' });
  const html = await readFile(path.join(folder, 'dist/404.html'), 'utf8');
  for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(#|https?:|mailto:)/.test(href)) continue;
    const url = new URL(href, 'https://example.github.io/notebook/missing/deep/page');
    assert(url.pathname.startsWith('/notebook/'), href);
    const file = path.join(folder, 'dist', url.pathname.slice('/notebook/'.length));
    await stat(file);
  }
  assert.match(html, /href="\/notebook\/">홈으로 돌아가기/);
  assert.match(await readFile(path.join(folder, 'dist/feed.xml'), 'utf8'), /https:\/\/example.github.io\/notebook\/notes\//);
  assert.match(await readFile(path.join(folder, 'dist/sitemap.xml'), 'utf8'), /https:\/\/example.github.io\/notebook\/cases\//);
  assert.match(await readFile(path.join(folder, 'dist/robots.txt'), 'utf8'), /Disallow: \/notebook\/studio\//);
});

test('A root-hosted site retains root 404 navigation', async t => {
  const folder = await fixture(t);
  await build({ projectRoot: folder, siteUrl: 'https://example.com' });
  assert.match(await readFile(path.join(folder, 'dist/404.html'), 'utf8'), /href="\/">홈으로 돌아가기/);
});

test('Invalid publication URLs fail before deleting existing output', async t => {
  const folder = await fixture(t);
  await build({ projectRoot: folder, siteUrl: 'https://example.com' });
  for (const siteUrl of ['http://example.com', 'https://user:secret@example.com', 'https://example.com/?key=x', 'https://example.com/#fragment', 'not-a-url']) {
    await assert.rejects(build({ projectRoot: folder, siteUrl }));
    await stat(path.join(folder, 'dist/index.html'));
  }
});

test('Content status lists drafts without building or changing their source', async t => {
  const folder = await fixture(t);
  await cp(path.join(root, 'scripts'), path.join(folder, 'scripts'), { recursive: true });
  const raw = newNote('아직 공개하지 않은 글');
  const file = path.join(folder, 'content/notes/private-draft.md');
  await writeFile(file, raw);
  const { stdout } = await promisify(execFile)(process.execPath, [path.join(folder, 'scripts/content.mjs'), '--list']);
  assert.match(stdout, /DRAFT \(not deployed\) \| notes\/private-draft\//);
  assert.match(stdout, /PUBLISHED \| cases\/auth-cache\//);
  assert.match(stdout, /공개 저장소에 커밋하면 원문은 공개/);
  assert.equal(await readFile(file, 'utf8'), raw);
  await assert.rejects(stat(path.join(folder, 'dist')));
});
