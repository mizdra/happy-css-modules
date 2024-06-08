- Feature Name: Generate .d.ts files for AltCSS
- Start Date: 2024-06-08
- RFC PR: [#0](https://github.com/mizdra/happy-css-modules/pull/0)

# Summary

この RFC は、Sass や Less などの AltCSS ファイル向けの `.d.ts` を生成する機能を提案します。

# Motivation

`happy-css-modules` コマンドは、`.module.css` をパースし、そのファイルが export するクラスや variable (内部的に "token" と呼びます) を検出し、型定義ファイルを生成します。パースには PostCSS を利用しています。

PostCSS はデフォルトでは CSS のみをパースできます。そのため、`happy-css-modules` コマンドで AltCSS をサポートするには、追加の実装が必要です。

この RFC では、AltCSS ファイルをサポートするための機能を提案します。

# Detailed design

AltCSS 形式の CSS Modules ファイル を `happy-css-modules` コマンドが検出したら、そのファイルを PostCSS でパースする前に、AltCSS プリプロセッサを利用して CSS にトランスパイルします。例えば、`.module.scss` ファイルを検出したら、そのファイルを [`sass`](https://www.npmjs.com/package/sass) で CSS にトランスパイルします。

以下は疑似コードです:

```ts
import path from 'node:path';
async function readCSS(filePath: string): Promise<string> {
  const css = await readFile(filePath, 'utf-8');
  const ext = path.extname(filePath);
  if (ext === '.scss') {
    return transpileScss(css);
  } else if (ext === '.less') {
    return transpileLess(css);
  } else {
    return css;
  }
}
async function loadTokens(filePath: string): Promise<string[]> {
  const css = await readCSS(filePath);
  const ast = postcss.parse(css);
  const tokens = extractTokensFromAst(ast);
  return tokens;
}
console.log(await loadTokens(path.resolve('src/Counter.module.scss')));
```

## キャッシュ機構との互換性

`happy-css-modules` コマンドには、`--cache` オプションがあります。このオプションを指定すると、CSS Modules ファイルが以前から変更されていない場合、型定義ファイルの生成をスキップします。つまり、`happy-css-modules` コマンドは、`1.module.scss` が以前の型定義ファイル生成時から変更されていなければ、その型定義ファイルを再生成しません。

ところで Sass や Less では、`@import` を利用してあるファイルに、別のファイルを埋め込むことができます。この場合、埋め込まれたファイルが変更された場合、埋め込んだファイルから export される token も変更される可能性があります。

例えば、以下の Sass ファイルを考えます:

```scss
// 1.module.scss
@import './2.module.scss';
.foo {
  color: red;
}
```

```scss
// 2.module.scss
.bar {
  color: blue;
}
```

このとき、`1.module.scss` から export される token は、`foo` と `bar` です。

ここで、もし以下のように `2.module.scss` が変更された場合:

```scss
// 2.module.scss
.bar {
  color: green;
}
.baz {
  color: yellow;
}
```

このとき、`1.module.scss` から export される token は、`foo` と `bar` と `baz` になります。従って、`1.module.scss` を変更していない場合でも、`happy-css-modules` コマンドは `1.module.scss` の型定義ファイルを再生成する必要があります。

そのために、`happy-css-modules` はプリプロセッサから埋め込まれたファイルの情報を取得するようにします。以下は疑似コードです:

```ts
import path from 'node:path';
async function readCSS(filePath: string): Promise<{ css: string; transpileDependencies?: string[] }> {
  const css = await readFile(filePath, 'utf-8');
  const ext = path.extname(filePath);
  if (ext === '.scss') {
    return transpileScss(css);
  } else if (ext === '.less') {
    return transpileLess(css);
  } else {
    return { css };
  }
}
async function loadTokens(filePath: string): Promise<{ tokens: string[]; transpileDependencies?: string[] }> {
  const { css, ...rest } = await readCSS(filePath);
  const ast = postcss.parse(css);
  const tokens = extractTokensFromAst(ast);
  return { tokens, ...rest };
}
async function processFile(filePath: string) {
  const result = await loadTokens(filePath);
  await generateDts(filePath, result.tokens);
  dependenciesGraph.update(filePath, result.transpileDependencies);
}
watcher.on('change', async (changedFilePath) => {
  const dependentFilePaths = dependenciesGraph.getDependentFilePaths(changedFilePath);
  for (const filePath of [changedFilePath, ...dependentFilePaths]) {
    processFile(filePath);
  }
});
```

# Alternatives

## PostCSS の custom syntax を利用する

トランスパイラの代わりに、PostCSS の custom syntax を利用します。custom syntax は PostCSS のプラグインを利用して、PostCSS が未知の構文をパースできるようにする機能です。この方法を利用すると、PostCSS で AltCSS ファイルをパースできます。例えば、Sass 向けの custom syntax は [`postcss-scss`](https://github.com/postcss/postcss-scss) です。

しかし、この方法には以下の問題があります:

- Sass の [parent selector](https://sass-lang.com/documentation/style-rules/parent-selector/) (`&`) が使われている場合、export されるトークンを正しく検出できない
  - `.box { &_inner {} }` は `box` と `box_inner` の 2 つのトークンを export します
  - しかし `postcss-scss` を使った場合、`box` と `&_inner` の 2 つのトークンを export するものとして解釈されます
  - これはユーザを混乱させる可能性があります
- Sass の [`@use`](https://sass-lang.com/documentation/at-rules/use/)、Less の [`@import`](https://lesscss.org/features/#import-atrules-feature) をサポートするために、追加の実装が必要
  - Sass の `@use` は、css-loader の `@import` のように、他のスタイルシートを埋め込むことができます
    - happy-css-modules は css-loader の `@import` と同じように、`@use` を扱う必要があります
  - Less の `@import` は、css-loader の `@import` と似ていますが、オプションで挙動をカスタマイズできます
    - しかも、オプションにはいくつものバリエーションがあります
  - 実装は可能ですが、多くの労力が必要です

# Prior art

- https://github.com/skovy/typed-scss-modules
  - A CLI tool for generating type definition files for `.module.scss` files.
- https://github.com/qiniu/typed-less-modules
  - A CLI tool for generating type definition files for `.module.less` files.
