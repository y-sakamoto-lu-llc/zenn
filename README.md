# zenn

[zenn.dev/yusaka_lu](https://zenn.dev/yusaka_lu) に公開する記事。

手を動かして確かめたことを記事にする。読者が再現するためのコードは別リポジトリ [zenn-examples](https://github.com/y-sakamoto-lu-llc/zenn-examples) にあり、記事からは commit permalink で参照する。

記事の元になる調査・検証の記録は手元のナレッジベースにあり、ここには**公開する形に書き直したものだけ**を置く。

## 構成

```
articles/         記事本体。Zenn が読むのはここ直下の .md のみ
images/<slug>/    記事ごとの画像
```

`articles/` のサブディレクトリは Zenn に無視される。記事は必ず直下にフラットに置く。

## 執筆

```sh
mise install          # node を固定バージョンで入れる
npm ci                # zenn-cli を lock 通りに入れる
npm run preview       # localhost:8000 でプレビュー
npm run new:article   # 記事の雛形を作る
```

`main` に push すると Zenn へ自動デプロイされる。`published: false` の記事は下書き扱いで公開されない。

## 記事の規約

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
