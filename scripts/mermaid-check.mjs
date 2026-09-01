// Markdown 内の ```mermaid ブロックを mermaid.parse() に通して構文だけ検証する。
//
// zenn-cli の `npm run preview` は Mermaid を描画できない（公式ガイドのサンプルすら
// "Syntax error in text" になる）。プレビューの見た目を根拠に図を直すと、正しい構文を
// 壊す方向へ直してしまうので、構文の判定はこのスクリプトだけを信じる。
// 図の「見た目」の確認は本番デプロイ後になる、と割り切る。
//
//   npm run check:mermaid              # articles/ 配下すべて
//   npm run check:mermaid -- a.md b.md # ファイル指定

import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

// import mermaid より前に DOM を用意する。無いと flowchart / stateDiagram が
// "DOMPurify.addHook is not a function" で落ち、構文エラーと区別がつかなくなる。
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// navigator は getter しかないので代入せず defineProperty で置く。
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.DOMPurify = undefined;

const mermaid = (await import('mermaid')).default;
mermaid.initialize({ startOnLoad: false });

const args = process.argv.slice(2);
const files = args.length
  ? args
  : fs.readdirSync('articles')
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join('articles', f));

let failed = 0;
let total = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const blocks = [...src.matchAll(/```mermaid\n([\s\S]*?)```/g)];
  if (blocks.length === 0) continue;

  console.log(`${file} (${blocks.length})`);
  for (const [i, match] of blocks.entries()) {
    total++;
    // ブロック開始行を出して、失敗箇所をエディタで開けるようにする。
    const line = src.slice(0, match.index).split('\n').length;
    try {
      await mermaid.parse(match[1]);
      console.log(`  L${line} #${i + 1} OK`);
    } catch (e) {
      failed++;
      console.log(`  L${line} #${i + 1} FAIL: ${e.message}`);
    }
  }
}

console.log(`\n${total - failed}/${total} OK`);
process.exit(failed ? 1 : 0);
