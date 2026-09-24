// 記事の topics が一覧でどう並ぶかを見る。
//
// 2026-09-24 に看板を広げ、topics 先頭の rails 固定をやめた。根拠は README の
// 「題材」。個人が交差点へ寄せる効果が測れず、月2本の題材に絞ると枯れるため。
//
// そのため先頭トピックでは落とさない。出すのは散らばりだけで、一覧に並べたとき
// 別の書き手に見えるかは人が判定する。機械にできるのは分布を見せるところまで。
//
// Publication への紐づけは落とす検査のまま。到達率の差はここで決まる。
//
//   npm run check:topic              # articles/ 配下すべて
//   npm run check:topic -- a.md b.md # 表示を絞る

import fs from 'node:fs';
import path from 'node:path';

// Publication の name。2026-09-11 に開設を見送ったので空のまま。空のあいだ紐づけ検査は走らない。
// 再開して申請が通ったら 'lu_tech' を入れる。埋めた時点で全記事が検査対象になる。
const PUBLICATION = '';

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
const leads = new Map();

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

  const list = topics(fm.topics);
  const lead = list[0] ?? 'なし';
  const published = fm.published === 'true';
  if (published) leads.set(lead, (leads.get(lead) ?? 0) + 1);

  const problems = [];
  if (!list.length) problems.push('topics が空');
  if (PUBLICATION && fm.publication_name !== PUBLICATION) {
    problems.push(`publication_name が ${fm.publication_name ?? 'なし'}。${PUBLICATION} にする`);
  }

  total++;
  const head = `${file}\n  [${list.join(', ')}]${published ? '' : ' 下書き'}`;
  if (!problems.length) {
    console.log(`${head} OK`);
  } else {
    failed++;
    console.log(`${head} FAIL: ${problems.join(' / ')}`);
  }
}

console.log(`\n${total - failed}/${total} OK`);

// 公開記事だけを数える。下書きは一覧に並ばない。
if (leads.size) {
  console.log('\n公開記事の先頭トピック');
  for (const [lead, n] of [...leads].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lead.padEnd(16)}${String(n).padStart(3)}`);
  }
  console.log('\n散らばりすぎていないかは人が見る。落とす検査ではない。');
} else {
  console.log('\n公開記事が無いので先頭トピックの分布は出ない。');
}

if (!PUBLICATION) {
  console.log('publication_name は未検査。Publication は見送り中（README の「名乗り」を見る）。');
}
process.exit(failed ? 1 : 0);
