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
      --cache                Only generate .d.ts and .d.ts.map for changed files.                                  [boolean] [default: true]
      --cacheStrategy        Strategy for the cache to use for detecting changed files.[choices: "content", "metadata"] [default: "content"]
      --silent               Silent output. Do not show "files written" messages                                  [boolean] [default: false]
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

## Node.js API (Experimental)

> **Warning**
> This feature is experimental and may change significantly. The API is not stable and may have breaking changes even in minor or patch version updates.

`happy-css-modules` provides Node.js API for programmatically generating .d.ts and .d.ts.map.

See [src/index.ts](https://github.com/mizdra/happy-css-modules/blob/main/src/index.ts) for available API.

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

// Process https://github.com/mizdra/happy-css-modules/blob/main/example/02-import/2.css
const filePath = resolve('example/02-import/2.css'); // Convert to absolute path
const result = await locator.load(filePath);

assert.deepEqual(result, {
  dependencies: ['/Users/mizdra/src/github.com/mizdra/happy-css-modules/example/02-import/3.css'],
  tokens: [
    {
      name: 'b',
      originalLocations: [
        {
          filePath: '/Users/mizdra/src/github.com/mizdra/happy-css-modules/example/02-import/3.css',
          start: { line: 1, column: 1 },
          end: { line: 1, column: 2 },
        },
      ],
    },
    {
      name: 'a',
      originalLocations: [
        {
          filePath: '/Users/mizdra/src/github.com/mizdra/happy-css-modules/example/02-import/2.css',
          start: { line: 3, column: 1 },
          end: { line: 3, column: 2 },
        },
      ],
    },
  ],
});
```

## About the origins of this project

This project was born as a PoC for [Quramy/typed-css-modules#177](https://github.com/Quramy/typed-css-modules/issues/177). That is why this project forks [`Quramy/typed-css-modules`](https://github.com/Quramy/typed-css-modules). Due to refactoring, only a small amount of code now comes from `Quramy/typed-css-modules`, but its contributions can still be found in the credits of the license.

Thank you [@Quramy](https://github.com/Quramy)!

## Prior art

There are several prior art for each feature. In contrast, happy-css-modules is a comprehensive implementation of these features.

### Strict type checking

- [Quramy/typed-css-modules](https://github.com/Quramy/typed-css-modules)
  - Only `.css` can be processed.
  - Resolving using webpack's resolve.alias is not implemented.
- [skovy/typed-scss-modules](https://github.com/skovy/typed-scss-modules)
  - Only `.scss` can be processed.
  - Resolving using webpack's resolve.alias is not implemented.
- [qiniu/typed-less-modules](https://github.com/qiniu/typed-less-modules)
  - Only `.less` can be processed.
  - Resolving using webpack's resolve.alias is not implemented.
- [mrmckeb/typescript-plugin-css-modules](https://github.com/mrmckeb/typescript-plugin-css-modules)
  - This is implemented as a TypeScript language service.
    - Therefore, warnings can be issued on the editor, but not at compile time.
    - In addition, the setup procedure is complicated.
    - For more information, see [the documentation](https://github.com/mrmckeb/typescript-plugin-css-modules/tree/82ba03548c3d2193508e1a4dbc47c1aa9b22943c#about-this-plugin).

### Definition jumps

- [mrmckeb/typescript-plugin-css-modules](https://github.com/mrmckeb/typescript-plugin-css-modules)
  - Does not support `.less` or `.sass` definition jumps.
- [clinyong/vscode-css-modules](https://github.com/clinyong/vscode-css-modules)
  - This works as expected in most cases.
  - However, it does not support complex resolution algorithms such as `resolve.alias`.
  - It is implemented as a VSCode extension.
- [Viijay-Kr/react-ts-css](https://github.com/Viijay-Kr/react-ts-css)
  - It works as expected in most cases, and it's highly functional!
  - It is implemented as a VSCode extension.
