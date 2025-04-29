<p align="center">
  <img alt="Cover image" src="./docs/cover.svg" />
</p>

<h2 align="center">Happy CSS Modules</h2>

<p align="center">
  <em>Typed, definition jumpable CSS Modules.</em>
  <br />
  <em>Moreover, easy!</em>
</p>

https://user-images.githubusercontent.com/9639995/189538880-872ad38d-2c9d-4c19-b257-521018963eec.mov

## NOTICE: Migration to css-modules-kit

Consider migrating to [`mizdra/css-modules-kit`](https://github.com/mizdra/css-modules-kit), which is the successor to happy-css-modules. It offers enhanced features such as Renaming and Find All References support.

Please note that `css-modules-kit` **does not support** Sass and Less. There are no plans to add support in the future. If you depend on these preprocessors, continue using `happy-css-modules`.

See the [`css-modules-kit` repository](https://github.com/mizdra/css-modules-kit).

## Features

- :white_check_mark: Strict type checking
  - Generate `.d.ts` of CSS Modules for type checking
- :mag: Definition jumps
  - Clicking on a property on `.jsx`/`.tsx` will jump to the source of the definition on `.module.css`.
  - This is accomplished by generating `.d.ts.map` (a.k.a. [Declaration Map](https://www.typescriptlang.org/tsconfig#declarationMap)).
- :handshake: High compatibility with the ecosystem
  - Support for Postcss/Sass/Less
  - Implement webpack-compatible resolving algorithms
  - Also supports [`resolve.alias`](https://webpack.js.org/configuration/resolve/#resolvealias)
- :beginner: Easy to use
  - No configuration file, some simple CLI options

## Installation

```console
$ npm i -D happy-css-modules
```

## Usage

In the simple case, everything goes well with the following!

```console
$ hcm 'src/**/*.module.{css,scss,less}'
```

If you want to customize the behavior, see `--help`.

```console
$ hcm --help
Generate .d.ts and .d.ts.map for CSS modules.

hcm [options] <glob>

Options:
  -w, --watch                Watch input directory's css files or pattern                                         [boolean] [default: false]
      --localsConvention     Style of exported class names.                  [choices: "camelCase", "camelCaseOnly", "dashes", "dashesOnly"]
      --declarationMap       Create sourcemaps for d.ts files                                                      [boolean] [default: true]
      --sassLoadPaths        The option compatible with sass's `--load-path`.                                                        [array]
      --lessIncludePaths     The option compatible with less's `--include-path`.                                                     [array]
      --webpackResolveAlias  The option compatible with webpack's `resolve.alias`.                                                  [string]
      --postcssConfig        The option compatible with postcss's `--config`.                                                       [string]
      --arbitraryExtensions  Generate `.d.css.ts` instead of `.css.d.ts`.                                          [boolean] [default: true]
      --cache                Only generate .d.ts and .d.ts.map for changed files.                                  [boolean] [default: true]
      --cacheStrategy        Strategy for the cache to use for detecting changed files.[choices: "content", "metadata"] [default: "content"]
      --logLevel             What level of logs to report.                            [choices: "debug", "info", "silent"] [default: "info"]
  -o, --outDir               Output directory for generated files.                                                                  [string]
  -h, --help                 Show help                                                                                             [boolean]
  -v, --version              Show version number                                                                                   [boolean]

Examples:
  hcm 'src/**/*.module.css'                                       Generate .d.ts and .d.ts.map.
  hcm 'src/**/*.module.{css,scss,less}'                           Also generate files for sass and less.
  hcm 'src/**/*.module.css' --watch                               Watch for changes and generate .d.ts and .d.ts.map.
  hcm 'src/**/*.module.css' --declarationMap=false                Generate .d.ts only.
  hcm 'src/**/*.module.css' --sassLoadPaths=src/style             Run with sass's `--load-path`.
  hcm 'src/**/*.module.css' --lessIncludePaths=src/style          Run with less's `--include-path`.
  hcm 'src/**/*.module.css' --webpackResolveAlias='{"@": "src"}'  Run with webpack's `resolve.alias`.
  hcm 'src/**/*.module.css' --cache=false                         Disable cache.
```

## How docs definition jumps work?

In addition to `.module.css.d.ts`, happy-css-modules also generates a `.module.css.d.ts.map` file (a.k.a. [Declaration Map](https://www.typescriptlang.org/tsconfig#declarationMap)). This file is a Source Map that contains code mapping information from generated (`.module.css.d.ts`) to source (`.module.css`).

When tsserver (TypeScript Language Server for VSCode) tries to jump to the code on `.module.css.d.ts`, it restores the original location from this Source Map and redirects to the code on` .module.css`. happy-css-modules uses this mechanism to realize definition jump.

![Illustration of how definition jump works](docs/how-does-definition-jumps-work/basic/flow.drawio.svg)

The case of multiple definitions is a bit more complicated. This is because the Source Map specification does not allow for a 1:N mapping of the generated:original locations. Therefore, happy-css-modules define multiple definitions of the same property type and map each property to a different location in `.module.css`.

![Illustration of a case with multiple definitions](docs/how-does-definition-jumps-work/multiple-definitions/flow.drawio.svg)

## How to use `--outDir` option

Use `--outDir` to output `.module.css.d.ts` and `.module.css.d.ts.map` in a separate directory. This is useful for keeping the `src/` directory clean.

However, by default tsc and tsserver cannot load it. To enable tsc or tsserver to load them, use the [`rootDirs`](https://www.typescriptlang.org/tsconfig/#rootDirs) option in `tsconfig.json`. An example is given below.

```json
// package.json
{
  "scripts": {
    "gen": "hcm -o generated/hcm 'src/**/*.module.css'"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "rootDirs": ["src", "generated/hcm/src"]
  }
}
```

## Node.js API (Experimental)

> **Warning**
> This feature is experimental and may change significantly. The API is not stable and may have breaking changes even in minor or patch version updates.

`happy-css-modules` provides Node.js API for programmatically generating .d.ts and .d.ts.map.

See [packages/happy-css-modules/src/index.ts](https://github.com/mizdra/happy-css-modules/blob/main/packages/happy-css-modules/src/index.ts) for available API.

### Example: Custom `hcm` commands

You can create your own customized `hcm` commands. We also provide a `parseArgv` utility that parses `process.argv` and extracts options.

```javascript
#!/usr/bin/env ts-node
// scripts/hcm.ts

import { run, parseArgv } from 'happy-css-modules';

// Write your code here...

run({
  // Inherit default CLI options (e.g. --watch).
  ...parseArgv(process.argv),
  // Add custom CLI options.
  cwd: __dirname,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### Example: Custom transformer

With the `transformer` option, you can use AltCSS, which is not supported by `happy-css-modules`.

```typescript
#!/usr/bin/env ts-node

import { run, parseArgv, createDefaultTransformer, type Transformer } from 'happy-css-modules';
import sass from 'sass';
import { promisify } from 'util';

const defaultTransformer = createDefaultTransformer();
const render = promisify(sass.render);

// The custom transformer supporting sass indented syntax
const transformer: Transformer = async (source, options) => {
  if (from.endsWith('.sass')) {
    const result = await render({
      // Use indented syntax.
      // ref: https://sass-lang.com/documentation/syntax#the-indented-syntax
      indentedSyntax: true,
      data: source,
      file: options.from,
      outFile: 'DUMMY',
      // Output sourceMap.
      sourceMap: true,
      // Resolve import specifier using resolver.
      importer: (url, prev, done) => {
        options
          .resolver(url, { request: prev })
          .then((resolved) => done({ file: resolved }))
          .catch((e) => done(e));
      },
    });
    return { css: result.css, map: result.sourceMap!, dependencies: result.loadedUrls };
  }
  // Fallback to default transformer.
  return await defaultTransformer(source, from);
};

run({ ...parseArgv(process.argv), transformer }).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### Example: Custom resolver

With the `resolver` option, you can customize the resolution algorithm for import specifier (such as `@import "specifier"`).

```typescript
#!/usr/bin/env ts-node

import { run, parseArgv, createDefaultResolver, type Resolver } from 'happy-css-modules';
import { exists } from 'fs/promises';
import { resolve, join } from 'path';

const cwd = process.cwd();
const runnerOptions = parseArgv(process.argv);
const { sassLoadPaths, lessIncludePaths, webpackResolveAlias } = runnerOptions;
// Some runner options must be passed to the default resolver.
const defaultResolver = createDefaultResolver({ cwd, sassLoadPaths, lessIncludePaths, webpackResolveAlias });
const stylesDir = resolve(__dirname, 'src/styles');

const resolver: Resolver = async (specifier, options) => {
  // If the default resolver cannot resolve, fallback to a customized resolve algorithm.
  const resolvedByDefaultResolver = await defaultResolver(specifier, options);
  if (resolvedByDefaultResolver === false) {
    // Search for files in `src/styles` directory.
    const path = join(stylesDir, specifier);
    if (await exists(path)) return path;
  }
  // Returns `false` if specifier cannot be resolved.
  return false;
};

run({ ...runnerOptions, resolver, cwd }).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### Example: Get locations for selectors exported by CSS Modules

`Locator` can be used to get location for selectors exported by CSS Modules.

```typescript
import { Locator } from 'happy-css-modules';
import { resolve } from 'path';
import assert from 'assert';

const locator = new Locator({
  // You can customize the transformer and resolver used by the locator.
  // transformer: createDefaultTransformer(),
  // resolver: createDefaultResolver(),
});

// Process https://github.com/mizdra/happy-css-modules/blob/main/packages/example/02-import/2.css
const filePath = resolve('example/02-import/2.css'); // Convert to absolute path
const result = await locator.load(filePath);

assert.deepEqual(result, {
  dependencies: ['/Users/mizdra/src/github.com/mizdra/packages/example/02-import/3.css'],
  tokens: [
    {
      name: 'b',
      originalLocation: {
        filePath: '/Users/mizdra/src/github.com/mizdra/packages/example/02-import/3.css',
        start: { line: 1, column: 1 },
        end: { line: 1, column: 2 },
      },
    },
    {
      name: 'a',
      originalLocation: {
        filePath: '/Users/mizdra/src/github.com/mizdra/packages/example/02-import/2.css',
        start: { line: 3, column: 1 },
        end: { line: 3, column: 2 },
      },
    },
  ],
});
```

## About the origins of this project

This project was born as a PoC for [Quramy/typed-css-modules#177](https://github.com/Quramy/typed-css-modules/issues/177). That is why this project forks [`Quramy/typed-css-modules`](https://github.com/Quramy/typed-css-modules). Due to refactoring, only a small amount of code now comes from `Quramy/typed-css-modules`, but its contributions can still be found in the credits of the license.

Thank you [@Quramy](https://github.com/Quramy)!

## Prior art

There is a lot of excellent prior art.

- ✅ Supported
- 🔶 Partially supported
- 🛑 Not supported
- ❓ Unknown

| Repository                                                                                        | Strict type checking | Definition jumps | Sass | Less | `resolve.alias` |              How implemented              |
| :------------------------------------------------------------------------------------------------ | :------------------: | :--------------: | :--: | :--: | :-------------: | :---------------------------------------: |
| [Quramy/typed-css-modules](https://github.com/Quramy/typed-css-modules)                           |          ✅          |        🛑        |  🛑  |  🛑  |       🛑        |                 CLI Tool                  |
| [skovy/typed-scss-modules](https://github.com/skovy/typed-scss-modules)                           |          ✅          |        🛑        |  ✅  |  🛑  |       🛑        |                 CLI Tool                  |
| [qiniu/typed-less-modules](https://github.com/qiniu/typed-less-modules)                           |          ✅          |        🛑        |  🛑  |  ✅  |       🛑        |                 CLI Tool                  |
| [mrmckeb/typescript-plugin-css-modules](https://github.com/mrmckeb/typescript-plugin-css-modules) |   🔶<sup>\*1</sup>   | 🔶<sup>\*2</sup> |  ✅  |  ✅  |       🛑        | TypeScript Language Service<sup>\*3</sup> |
| [clinyong/vscode-css-modules](https://github.com/clinyong/vscode-css-modules)                     |          🛑          |        ✅        |  ✅  |  ✅  |       🛑        |             VSCode Extension              |
| [Viijay-Kr/react-ts-css](https://github.com/Viijay-Kr/react-ts-css)                               |   🔶<sup>\*1</sup>   |        ✅        |  ✅  |  ✅  |       ❓        |             VSCode Extension              |
| [mizdra/happy-css-modules](https://github.com/mizdra/happy-css-modules)                           |          ✅          |        ✅        |  ✅  |  ✅  |       ✅        |        CLI Tool + Declaration Map         |

- \*1: Warnings are displayed in the editor, but not at compile time.
- \*2: Not supported for `.less` definition jumps.
- \*3: The TypeScript language service can display warnings in the editor, but not at compile time. It is also complicated to set up.

Another known tool for generating `.css.d.ts` is [wix/stylable](https://github.com/wix/stylable) , which does not use CSS Modules.
