// 公開した記事が届いているかを、印象ではなく数で見る。
//
// 見るのは4つ。いいねの中央値、いいね10以上の本数、はてブが付いた本数、フォロワー。
// 記事の中身を磨いても動くのはこのうちごく一部で、動かすのは名乗り（Publication・
// プロフィール）と経路（X・はてブ）のほう。だから中身を直す前にここを見る。
//
// 閾値は 2026-09-11 に置いたもの。下回ったときの切り分けは3通り。
//
//   いいねは伸びたが問い合わせが来ない → 受け皿が弱い。プロフィールと着地先を直す
//   はてブが0のまま                    → 経路が動いていない。X の運用量を見直す
//   どちらも0                          → 題材を疑う。交差点の標本が小さすぎた可能性
//
// 緩めるときは、緩めた事実と理由を残してから緩める。黙って下げると、次に見たとき
// 達成しているように見える。
//
//   npm run stats

const USER = 'yusaka_lu';

const TARGETS = [
  ['公開記事', (s) => s.count, 12],
  ['いいね中央値', (s) => s.median, 3],
  ['いいね10以上', (s) => s.over10, 2],
  ['はてブが付いた記事', (s) => s.bookmarked, 2],
  ['フォロワー', (s) => s.followers, 20],
];

async function json(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'zenn-stats' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function hatena(url) {
  const res = await fetch(
    `https://bookmark.hatenaapis.com/count/entry?url=${encodeURIComponent(url)}`,
  );
  if (!res.ok) return 0;
  return Number(await res.text()) || 0;
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const { user } = await json(`https://zenn.dev/api/users/${USER}`);

const articles = [];
let next = `https://zenn.dev/api/articles?username=${USER}&order=latest`;
while (next) {
  const page = await json(next);
  articles.push(...page.articles);
  next = page.next_page
    ? `https://zenn.dev/api/articles?username=${USER}&order=latest&page=${page.next_page}`
    : null;
}

// はてブは記事ごとに1リクエスト。直列で投げる（公開記事は数十本の想定）。
for (const a of articles) {
  a.url = `https://zenn.dev${a.path}`;
  a.hatena = await hatena(a.url);
}

const likes = articles.map((a) => a.liked_count ?? 0);
const s = {
  count: articles.length,
  median: median(likes),
  over10: likes.filter((x) => x >= 10).length,
  bookmarked: articles.filter((a) => a.hatena > 0).length,
  followers: user.follower_count ?? 0,
};

const pad = (v, n) => String(v).padStart(n);
console.log(`zenn.dev/${USER}  ${new Date().toISOString().slice(0, 10)} 時点\n`);
console.log('  いいね  ブクマ  はてブ  公開日      タイトル');
for (const a of articles) {
  console.log(
    `  ${pad(a.liked_count ?? 0, 6)}  ${pad(a.bookmarked_count ?? 0, 6)}  ${pad(a.hatena, 6)}  ` +
      `${a.published_at.slice(0, 10)}  ${a.title}`,
  );
}

// 全角は2文字幅として詰める。ASCII 以外はすべて全角とみなす（ラベルは日本語のみ）。
const width = (t) => [...t].reduce((n, c) => n + (c.charCodeAt(0) < 0x100 ? 1 : 2), 0);
const padLabel = (t, n) => t + ' '.repeat(Math.max(0, n - width(t)));

console.log(`\n  ${padLabel('指標', 20)}  現在   閾値  判定`);
for (const [label, get, target] of TARGETS) {
  const now = get(s);
  console.log(
    `  ${padLabel(label, 20)}${pad(now, 4)}${pad(target, 7)}  ${now >= target ? '達成' : '未達'}`,
  );
}
console.log('\n  X のフォロワーと会社への問い合わせは API で取れない。手で数える。');
