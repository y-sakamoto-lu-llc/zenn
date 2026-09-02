// 記事タイトルの「署名」が直近2本と重なっていないか調べる。
//
// 署名 = 区切り記号 × 文末。この2つが両方とも直近2本のどちらかと一致したら FAIL。
// 一覧に並んだとき、記事ごとの差より書式の一致のほうが目立つと、中身を読む前に
// 量産物として処理される。2026-08 までの7本は7本とも `—` の2部構成だった。
//
// 型（断定/問い/数値/成果物）は意味の判定なので機械化できない。均質性は表層に
// 出るので、表層だけを見る。判定に型の名前は登場しない。
//
//   npm run check:title              # articles/ 配下すべて
//   npm run check:title -- a.md b.md # 表示を絞る（直近2本の計算には全記事を使う）

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const RECENT = 2; // 何本前までと比べるか。4形しかないので3にすると次の形が一意に決まる

const SEPARATORS = [
  [/[—―–]/, '—'],
  [/。/, '。'],
  [/[（(]/, '（）'],
  [/[：:]/, '：'],
];

// 文末は活用の表層だけで見る。形容詞の「い」は名詞の「違い」と区別できないので
// 体言止めに倒し、否定の「ない」だけを終止形として拾う。
function ending(title) {
  const s = title.replace(/[」』）)"']+$/, '');
  if (/[か？?]$/.test(s)) return '疑問';
  if (/た$/.test(s)) return '過去';
  if (/ない$/.test(s)) return '終止';
  if (/[るうくぐすつぬぶむ]$/.test(s)) return '終止';
  return '体言';
}

function separator(title) {
  for (const [re, name] of SEPARATORS) if (re.test(title)) return name;
  return 'なし';
}

function readTitle(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const line = m[1].split('\n').find((l) => l.startsWith('title:'));
  if (!line) return null;
  return line.slice('title:'.length).trim().replace(/^["']|["']$/g, '');
}

// 記事が追加された順に並べる。published の真偽は見ない（下書きも一覧の履歴に載る）。
// 未コミットのファイルは「いま書いているもの」なので最後に置く。
function addedAt(file) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%ct', '--', file], {
      encoding: 'utf8',
    }).trim();
    const stamps = out.split('\n').filter(Boolean);
    if (stamps.length) return Number(stamps[stamps.length - 1]);
  } catch {
    /* git が無い / リポジトリ外なら mtime に落とす */
  }
  return Infinity;
}

const all = fs
  .readdirSync('articles')
  .filter((f) => f.endsWith('.md'))
  .map((f) => path.join('articles', f))
  .map((file) => ({ file, title: readTitle(file), at: addedAt(file) }))
  .filter((a) => a.title)
  // 同じコミットで入った記事は順序が決まらないので、ファイル名で固定する
  .sort((a, b) => a.at - b.at || a.file.localeCompare(b.file));

for (const a of all) {
  a.sep = separator(a.title);
  a.end = ending(a.title);
}

const args = process.argv.slice(2);
const shown = args.length ? new Set(args.map((f) => path.normalize(f))) : null;

let failed = 0;
let total = 0;

for (const [i, a] of all.entries()) {
  if (shown && !shown.has(path.normalize(a.file))) continue;
  total++;
  const recent = all.slice(Math.max(0, i - RECENT), i);
  const clash = recent.find((p) => p.sep === a.sep && p.end === a.end);
  const sig = `${a.sep} / ${a.end}`;
  if (clash) {
    failed++;
    console.log(`${a.file}\n  ${sig} FAIL: ${path.basename(clash.file, '.md')} と署名が同じ`);
  } else {
    console.log(`${a.file}\n  ${sig} OK`);
  }
}

console.log(`\n${total - failed}/${total} OK`);
if (failed) {
  console.log(`直近${RECENT}本と、区切り記号と文末が両方とも一致しないタイトルにする。`);
}
process.exit(failed ? 1 : 0);
