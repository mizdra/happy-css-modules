- Feature Name: Generate .d.ts files for AltCSS
- Start Date: 2024-06-08
- RFC PR: [#0](https://github.com/mizdra/happy-css-modules/pull/0)

# Summary

This RFC proposes the feature to generate `.d.ts` files for AltCSS files such as Sass and Less.

# Motivation

The `happy-css-modules` command parses `.module.css` files, detects the classes and variables (internally referred to as "tokens") exported by those files, and generates type definition files. The parsing is implemented with [PostCSS](https://github.com/postcss/postcss).

By default, PostCSS can only parse CSS. Therefore, to support AltCSS in the `happy-css-modules` command, additional implementation is required.

This RFC proposes a feature to support AltCSS files.

# Detailed design

When the `happy-css-modules` command detects a CSS Modules file in an AltCSS format, it will transpile the file to CSS using an AltCSS preprocessor before parsing it with PostCSS. For example, when a `.module.scss` file is detected, it will be transpiled to CSS using [`sass`](https://www.npmjs.com/package/sass).

The following is a code example:

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

## Compatibility with caching mechanism

The `happy-css-modules` command has a `--cache` option. When this option is specified, the command skips generating type definition files if the CSS Modules file has not changed since the last generation. In other words, the command does not regenerate the type definition file if `1.module.scss` has not changed since the previous generation.

In Sass and Less, it is possible to embed another file into a file using `@import`. If the embedded file changes, the tokens exported from the embedding file may also change.

For example, consider the following Sass files:

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

In this case, the tokens exported from `1.module.scss` are `foo` and `bar`.

Now, if `2.module.scss` is changed as follows:

```scss
// 2.module.scss
.bar {
  color: green;
}
.baz {
  color: yellow;
}
```

In this case, the tokens exported from `1.module.scss` will be `foo`, `bar`, and `baz`. Therefore, even if `1.module.scss` itself has not been modified, the `happy-css-modules` command needs to regenerate the type definition file for `1.module.scss`.

To achieve this, `happy-css-modules` will retrieve information about embedded files from the preprocessor. Here is the code:

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

## Using PostCSS custom syntax

Instead of a transpiler, use PostCSS custom syntax. Custom syntax allows PostCSS to parse unknown syntax using plugins. This method allows PostCSS to parse AltCSS files. For example, the custom syntax for Sass is [`postcss-scss`](https://github.com/postcss/postcss-scss).

However, this method has the following issues:

- If Sass's [parent selector](https://sass-lang.com/documentation/style-rules/parent-selector/) (`&`) is used, the exported tokens cannot be correctly detected.
  - `.box { &_inner {} }` exports two tokens: `box` and `box_inner`.
  - However, when using `postcss-scss`, it is interpreted as exporting `box` and `&_inner`, which can confuse users.
- Additional implementation is needed to support Sass's [`@use`](https://sass-lang.com/documentation/at-rules/use/) and Less's [`@import`](https://lesscss.org/features/#import-atrules-feature).
  - Sass's `@use` can embed other stylesheets, similar to css-loader's `@import`.
    - `happy-css-modules` needs to handle `@use` like css-loader's `@import`.
  - Less's `@import` is similar to css-loader's `@import` but can be customized with options.
    - There are many variations of these options.
  - It is possible to implement them but requires significant effort.

# Prior art

- https://github.com/skovy/typed-scss-modules
  - A CLI tool for generating type definition files for `.module.scss` files.
- https://github.com/qiniu/typed-less-modules
  - A CLI tool for generating type definition files for `.module.less` files.
