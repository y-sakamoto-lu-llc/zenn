// 記事が名乗りから外れていないか調べる。
//
// 看板は「本番の Rails を、生成AI でどう扱うかを実測で判定する」。一覧とトピック
// フィードで最初に読まれるのは topics の先頭なので、そこが rails でない記事は
// 別の書き手として並ぶ。判定できるのは並び順だけで、題材が交差点に落ちているか
// は意味の判定なので機械化しない。そちらは README が持つ。
//
// Publication に紐づいているかも同時に見る。到達率の差はここで決まる。
//
//   npm run check:topic              # articles/ 配下すべて
//   npm run check:topic -- a.md b.md # 表示を絞る

import fs from 'node:fs';
import path from 'node:path';

const LEAD_TOPIC = 'rails';

// Publication の name。2026-09-11 に開設を見送ったので空のまま。空のあいだ紐づけ検査は走らない。
// 再開して申請が通ったら 'lu_tech' を入れる。埋めた時点で全記事が検査対象になる。
const PUBLICATION = '';

// 名乗りを決める前（2026-08）に出した記事。topics の先頭が rails ではない。
// 2026-09-11 に3本とも非公開へ戻すと決めたので、この免除は恒久。看板が変わって
// 公開し直すことにしたら、その時点でこの行ごと消して検査に通す。
const GRANDFATHERED = new Set([
  'herdr-popup-file-tree-preview',
  'claude-code-subagents-vs-cross-session',
  'incident-game-day0-verify',
]);

function frontmatter(file) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0 || /^\s/.test(line)) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

// topics: [rails, ruby] の形だけを読む。README が frontmatter をこの書式に固定している。
function topics(raw) {
  if (!raw) return [];
  return raw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

const args = process.argv.slice(2);
const shown = args.length ? new Set(args.map((f) => path.normalize(f))) : null;

let failed = 0;
let total = 0;

for (const name of fs.readdirSync('articles').sort()) {
  if (!name.endsWith('.md')) continue;
  const file = path.join('articles', name);
  if (shown && !shown.has(path.normalize(file))) continue;

  const fm = frontmatter(file);
  if (!fm) {
    console.log(`${file}\n  frontmatter が読めない FAIL`);
    total++;
    failed++;
    continue;
  }

  const slug = path.basename(name, '.md');
  const list = topics(fm.topics);
  const problems = [];

  if (list[0] !== LEAD_TOPIC) {
    problems.push(`topics の先頭が ${list[0] ?? 'なし'}。${LEAD_TOPIC} にする`);
  }
  if (PUBLICATION && fm.publication_name !== PUBLICATION) {
    problems.push(`publication_name が ${fm.publication_name ?? 'なし'}。${PUBLICATION} にする`);
  }

  total++;
  const head = `${file}\n  [${list.join(', ')}]`;
  if (!problems.length) {
    console.log(`${head} OK`);
  } else if (GRANDFATHERED.has(slug)) {
    console.log(`${head} SKIP: 名乗りを決める前の記事（${problems.join(' / ')}）`);
  } else {
    failed++;
    console.log(`${head} FAIL: ${problems.join(' / ')}`);
  }
}

console.log(`\n${total - failed}/${total} OK`);
if (!PUBLICATION) {
  console.log('publication_name は未検査。Publication は見送り中（README の「名乗り」を見る）。');
}
process.exit(failed ? 1 : 0);
