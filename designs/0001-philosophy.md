- Feature Name: Philosophy
- Start Date: 2024-05-28
- RFC PR: [#0](https://github.com/mizdra/happy-css-modules/pull/0)

# Summary

この RFC は、happy-css-modules の設計哲学を示します。

# Motivation

happy-css-modules を開発するにあたり、いくつかの設計上の決定が必要となります。本 RFC では、happy-css-modules の設計哲学を示し、それを基準として設計上の決定を行います。

# Detailed design

happy-css-modules の設計哲学は以下の通りです。

- 現代的な開発者体験を提供する
- エコシステムとの互換性
- エディタ非依存
- 使用が容易であること

## 現代的な開発者体験を提供する

CSS Modules では、スタイルを`.module.css`に記述し、`.js`から`.module.css`をインポートして利用します。このため、`.js`と`.module.css`は異なる言語で記述されているため、エディタの言語機能を利用することが難しいです。例えば、`.js`内の`styles.foo`から"Go to definition"を用いて、`.module.css`へとジャンプすることはできません。

一方、CSS-in-JS ではスタイルを`.js`の中に記述するため、エディタの言語機能を利用することが容易です。実装によりますが、一般に CSS-in-JS では"Go to definition"、"rename"、"find references"などの機能を利用できます。

このように、CSS Modules は CSS-in-JS と比較して開発者体験が十分でないと言えます。しかし、補助ツールを用いることで CSS Modules の開発者体験を CSS-in-JS に近づけることができると考えています。happy-css-modules は補助ツールを提供し、CSS Modules の開発者体験を向上させることを目指します。

## エコシステムとの互換性

私たちは、多くの CSS Modules ユーザーの開発者体験を向上させたいと考えています。そのため、happy-css-modules は既存のエコシステムとの互換性を重視します。例えば、PostCSS、Sass、Less などのプリプロセッサとの互換性を保ちます。Sass や Less などのプリプロセッサを利用しているユーザーも、happy-css-modules を利用することで開発者体験を向上させることができます。

## エディタ非依存

私たちは、エディタの選択に制約を与えることなく、多くの開発者に happy-css-modules を利用してもらいたいと考えています。そのため、happy-css-modules はエディタ非依存を目指します。例えば、VS Code、Vim、Emacs などのエディタを利用しているユーザーも、happy-css-modules を利用することができます。

## 使用が容易であること

ツールの使用方法が容易であることは重要です。使用が容易であることで、より多くの人がツールを導入することができます。また、初心者などの多くのユーザー層にツールがリーチできます。そのため、happy-css-modules は使用が容易であることを目指します。
