- Feature Name: Strict Type Checking
- Start Date: 2024-05-28
- RFC PR: [#0](https://github.com/mizdra/happy-css-modules/pull/0)

# Summary

この RFC は CSS Modules で厳密な型チェックをサポートするための戦略を提案します。

# Motivation

CSS Modules では、スタイルは `.module.css` に記述されます。そして `.js` から `.module.css` をインポートしてそのスタイルを利用します。以下はその例です。

```css
/* src/Counter.module.css */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
.count {
  font-size: 24px;
}
```

```tsx
/* src/Counter.jsx */
import styles from './Counter.module.css';

function Counter({ count }) {
  return (
    <div className={styles.container}>
      <span className={styles.count}>{count}</span>
    </div>
  );
}
```

TypeScript で CSS Modules を利用する場合、`Counter.module.css` の型定義ファイルを用意する必要があります。TypeScript では、型情報のないモジュールの import がエラーとなるためです。以下はその例です。

```tsx
/* types/css-modules.d.ts */
declare module '*.module.css' {
  const styles: { readonly [token: string]: string };
  export default styles;
}
```

この型定義は、Next.js や Remix などの一般的なフレームワークで利用されています。

- https://github.com/vercel/next.js/blob/v14.2.3/packages/next/types/global.d.ts#L30-L33
- https://github.com/remix-run/remix/blob/remix%402.9.2/packages/remix-dev/modules.ts#L11-L14

しかし、この型定義は厳密な型チェックを行うことができません。例えば、以下のようなコードはコンパイルエラーとなりません。

```tsx
/* src/Counter.jsx */
import styles from './Counter.module.css';

function Counter({ count }) {
  return (
    <div className={styles.container}>
      <span className={styles.counter}>{count}</span>
      {/*                     ^^^^^^^
       * This is a typo. The correct is `count`.
       */}
    </div>
  );
}
```

このような問題を解決するために、この RFC では CSS Modules で厳密な型チェックをサポートする仕組みを提案します。

# Detailed design

この RFC では、`.module.css` の型定義ファイルを生成する CLI ツールを提案します。この CLI ツールは、`.module.css` を読み取り、その型定義ファイルを生成します。以下はその例です。

<!-- prettier-ignore-start -->
```css
/* src/Counter.module.css */
.container {}
.count {}
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```tsx
/* src/Counter.module.css.d.ts */
declare const styles:
  & { readonly container: string }
  & { readonly count: string }
;
export default styles;
```
<!-- prettier-ignore-end -->

この型定義ファイルにより、型チェックが厳密になり、以下のようなコンパイルエラーが発生します。

```console
$ npx tsc
src/Counter.tsx:6:31 - error TS2551: Property 'counter' does not exist on type '{ readonly container: string; } & { readonly count: string; }'. Did you mean 'count'?

6       <span className={styles.counter}>{count}</span>
                                ~~~~~~~

  src/Counter.module.css.d.ts:3:16
    3   & { readonly count: string }
                     ~~~~~
    'count' is declared here.
```

## `@value` のサポート

CSS Modules では、`@value` を用いて変数を定義することができます。この変数は、`.js` から利用することができます。従って、型定義ファイルにもこの変数を含めるようにします。

以下はその例です。

```css
/* src/Box.module.css */
@value paddingSmall: 8px;
@value red, blue from './colors.module.css';
.box {
  padding: paddingSmall;
}
```

```css
/* src/colors.module.css */
@value red: #ff0000;
@value blue: #0000ff;
@value green: #00ff00;
```

<!-- prettier-ignore-start -->
```tsx
/* src/Box.module.css.d.ts */
declare const styles:
  & { readonly paddingSmall: string }
  & { readonly red: string }
  & { readonly blue: string }
  & { readonly box: string }
;
export default styles;
```
<!-- prettier-ignore-end -->

## `@import` のサポート

`@import` は css-loader や postcss-modules による拡張機能です。この機能使うと、他の CSS Modules ファイルを import 元のファイルに展開することができます。これは CSS Modules の仕様では定義されていませんが、エコシステムとの互換性を保つため、happy-css-modules もこの機能をサポートします。

以下はその例です。

<!-- prettier-ignore-start -->
```css
/* src/Import.module.css */
@import './common.module.css';
.basic {}
```
<!-- prettier-ignore-end -->

```css
/* src/common.module.css */
.box {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

<!-- prettier-ignore-start -->
```tsx
/* src/Import.module.css.d.ts */
declare const styles:
  & import('./common.module.css').default
  & { readonly basic: string }
;
export default styles;
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```tsx
/* src/common.module.css.d.ts */
declare const styles:
  & { readonly box: string }
;
export default styles;
```
<!-- prettier-ignore-end -->

`Import.module.css.d.ts` に `common.module.css` の型定義を展開するために、`import('./common.module.css').default` を利用します。これにより、`Import.module.css` をパースするだけで `Import.module.css.d.ts` が生成可能となります。これにより、コード生成ツールは型定義ファイルの生成を容易に並列化できます。

# Drawbacks

## 編集中の変更が反映されない

コード生成ツールはファイルシステム上にある `.module.css` を読み取り、型定義ファイルを生成します。このため、エディタで `.module.css` を編集中で、未保存の変更がある場合、型定義ファイルには反映されません。その結果、しばしばエディタ上で古い型エラーが表示されたり、本来型エラーが表示されるべき箇所で型エラーが表示されなかったりします。これは開発者を混乱させる可能性があります。

## 型定義ファイルが煩わしい

型定義ファイルはエディタのファイルエクスプローラや、Pull Request の差分に表示されます。しかしながら、開発者は型定義ファイルを見たいと思うことは滅多にありません。従って、開発者はそれを煩わしく感じる可能性があります。

ただしエディタやツールの設定を変更すると、問題を軽減できるかもしれません。例えば、VS Code では、`files.exclude` や `search.exclude` などの設定を変更することで、型定義ファイルを非表示にできます。`.gitignore` に型定義ファイルを追加したり、`.gitattributes` で `linguist-generated` 属性を設定することで、Pull Request で型定義ファイルを非表示にできます。

# Alternatives

## TypeScript Language Service Plugin

TypeScript Language Service Plugin は、Language Server の挙動をカスタマイズできる技術です。これを用いると、エディタ上で型エラーを表示できます。

しかし、TypeScript Language Service Plugin は、Language Server の挙動をカスタマイズできますが、コンパイルの挙動をカスタマイズすることはできません。そのため、エディタでは型エラーが表示されますが、コンパイルには成功します。これは開発者を混乱させる可能性があります。

# Prior art

- https://github.com/mrmckeb/typescript-plugin-css-modules
  - CSS Modules の型チェックを行う TypeScript Language Service Plugin です。
- https://github.com/Quramy/typed-css-modules
  - `.module.css` の型定義ファイルを生成する CLI ツールです。
- https://github.com/skovy/typed-scss-modules
  - `.module.scss` の型定義ファイルを生成する CLI ツールです。
- https://github.com/qiniu/typed-less-modules
  - `.module.less` の型定義ファイルを生成する CLI ツールです。
- https://github.com/Viijay-Kr/react-ts-css
  - CSS Modules の型チェックを行う VS Code 拡張機能です。

# Unresolved questions

## named export をサポートするべきか

この RFC では、CSS Modules の型定義ファイルを default export 形式で生成することを提案しています。しかし、css-loader の [`namedExport`](https://github.com/webpack-contrib/css-loader?tab=readme-ov-file#namedexport) オプションを用いると、`.module.css` から named export 形式でトークンが export されます。従って、このオプションを併用する場合、型定義ファイルも named export 形式で生成しなければなりません。

恐らく、生成される型定義ファイルは以下のようになるでしょう。

<!-- prettier-ignore-start -->
```css
/* src/NamedExport.module.css */
@import './common.module.css';
@value paddingSmall: 8px;
@value red, blue from './colors.module.css';
.container {}
```
<!-- prettier-ignore-end -->

<!-- prettier-ignore-start -->
```tsx
/* src/NamedExport.module.css.d.ts */
export * from './common.module.css';
export const paddingSmall: string;
export const red: string;
export const blue: string;
export const container: string;
```
<!-- prettier-ignore-end -->

しかし、named export 形式で型定義ファイルを生成すると、TypeScript の completion items にトークンが含まれます。小さなプロジェクトでは問題ありませんが、大規模なプロジェクトでは completion items の数が過剰になり、開発者を混乱させる可能性があります。

![エディタのスクリーンショット。`.ts` ファイル内に "pad" と入力して completion している。completion items には paddingSmall が含まれている。](namex-export.png)

VS Code の `typescript.preferences.autoImportFileExcludePatterns` オプションを利用すると、この問題を軽減できます。しかし、このオプションは VS Code にしか存在せず、他のエディタでは利用できません。

よって named export 形式の型定義ファイルは、開発者体験とエディタの互換性の観点から、サポートを見送ります。
