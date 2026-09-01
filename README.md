# zenn

[zenn.dev/yusaka_lu](https://zenn.dev/yusaka_lu) に公開する記事。

手を動かして確かめたことを記事にする。読者が再現するためのコードは別リポジトリ [zenn-examples](https://github.com/y-sakamoto-lu-llc/zenn-examples) にあり、記事からは commit permalink で参照する。

記事の元になる調査・検証の記録は手元のナレッジベースにあり、ここには**公開する形に書き直したものだけ**を置く。

## 構成

```
articles/         記事本体。Zenn が読むのはここ直下の .md のみ
images/<slug>/    記事ごとの画像
scripts/          記事のチェックに使うスクリプト
```

`articles/` のサブディレクトリは Zenn に無視される。記事は必ず直下にフラットに置く。

図は **Mermaid** で書き、画像・SVG は貼らない（差分が追えず、あとで直せない）。`images/` に置くのは、スクリーンショットなど Mermaid で描けないものだけ。

## 執筆

```sh
mise install          # node を固定バージョンで入れる
npm ci                # 依存を lock 通りに入れる
npm run preview       # localhost:8000 でプレビュー
npm run new:article   # 記事の雛形を作る
npm run check:mermaid # 記事内の Mermaid を構文チェック
```

`main` に push すると Zenn へ自動デプロイされる。`published: false` の記事は下書き扱いで公開されない。

### プレビューの Mermaid は当てにならない

**Zenn の Mermaid は zenn-cli が描画しているのではない。** `https://embed.zenn.studio/mermaid` への iframe に委託されていて、ローカルにあるのは iframe だけ。図そのものは外部から返ってくる。

そのため**同じ記事・同じバージョンでも読み込むたびに結果が変わる**。2026-08-28 に zenn-cli 0.5.2 と 0.5.3 へ同じ記事を入れて並べたところ、どちらのバージョンでも「正常に描画される」「極小に潰れて読めない」「空白のまま」の3つが入れ替わった。**バージョンを上げても直らない。**

潰れやすいのは `subgraph` を含む図で、単純な `graph TD` や `sequenceDiagram` は比較的出る。いずれにせよ**プレビューで図が崩れていても直さないこと**。正しい構文を壊す方向に直すことになる。

構文の判定は `npm run check:mermaid` で行う。`mermaid.parse()` に通すだけで、描画はしない。

```
$ npm run check:mermaid
articles/rails81-authentication-generator.md (4)
  L60 #1 OK
  L387 #2 OK
  ...

9/9 OK
```

引数にファイルを渡せば個別に確認できる（`npm run check:mermaid -- articles/foo.md`）。構文が通れば本番では描画される。図の**見た目**の最終確認は本番デプロイ後になる、と割り切る。

## 記事の規約

### タイトル

```
<対象と行為> — <この記事にしかない切り口>
```

`—` の後ろに書くのは、読者が何を得るか、またはたとえ。**ここが書けないうちは記事の焦点が絞れていない。**

**タイトルは70字以内。** 超えると Zenn Editor が「タイトルは70字以内にしてください」で弾く。

### 骨格

```
リード（何の話か・引き）
## この記事で書くこと・書かないこと
## 検証環境
## 結論
## <本文>
## 自分では確かめていないこと
## まとめ
## 参考
```

前半の3つ（書かないこと・検証環境・結論）は、読者が最初の1画面で「自分に関係があるか」「自分の環境で再現できるか」を判断するための材料。あとから足す装飾ではない。

**「自分では確かめていないこと」は `##` で立てる。** `###` に落とすと長い記事では埋没し、断定したのと同じことになる。

### slug

**12〜50文字**、`a-z` `0-9` `-` `_` のみ。内容が分かる名前にする（例: `rails8-solid-queue-on-sqlite`）。

`zenn-examples` 側のディレクトリ名と揃える。

### frontmatter

```yaml
---
title: 日本語のタイトル
emoji: "🚂"
type: tech
topics: [rails, ruby, sqlite]
published: false
---
```

Zenn が解釈しないキーは書かない。

### 検証環境ブロック

検証記事は冒頭に必ず置く。読者が「自分の環境で再現できるか」を最初に判断できるようにする。

```markdown
## 検証環境

| 項目 | 値 |
| --- | --- |
| OS | macOS 15.3 (arm64) |
| Ruby | 3.4.1 |
| Rails | 8.0.1 |
| 検証日 | 2026-08-22 |

コードは [zenn-examples/rails8-solid-queue](https://github.com/y-sakamoto-lu-llc/zenn-examples/tree/<commit>/rails8-solid-queue) にあります。
```

サンプルへのリンクは **commit hash 付きの permalink** にする。`main` を指すと、あとで直したときに記事と実物がずれる。

## 運用上の注意

- **`main` への push は公開記事の書き換えと同義**（Zenn が自動デプロイする）。force push は禁止設定にしてある
- Zenn Connect の GitHub App は**このリポジトリだけ**に許可する（`Only select repositories`）
- GitHub Actions は置かない。CI を入れる場合は `pull_request_target` を使わず、既定の権限を read-only にする
- 記事を消すときは Zenn ダッシュボードでの削除が必要。ファイルを消すだけでは次のデプロイで復活する
