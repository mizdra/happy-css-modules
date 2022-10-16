<p align="center">
  <img alt="Cover image" src="./docs/cover.svg" />
</p>

<h2 align="center">The Collection of tools to make CSS Modules happy :)</h2>

<p align="center">
  <em>Typed, definition jumps, and unused selector detection!</em>
</p>

https://user-images.githubusercontent.com/9639995/189538880-872ad38d-2c9d-4c19-b257-521018963eec.mov

## Features

- :white_check_mark: Strict type checking
  - Generate `.d.ts` of CSS Modules for type checking
- :mag: Definition jumps
  - Clicking on a property on `.jsx`/`.tsx` will jump to the source of the definition on `.module.css`.
  - This is accomplished by generating `.d.ts.map` (a.k.a. [Declaration Map](https://www.typescriptlang.org/tsconfig#declarationMap)).
- :rotating_light: Unused selector detection (**Not implemented yet**)
  - Detect unused selectors using information from strict type checking.
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

- [typed-css-modules](https://github.com/Quramy/typed-css-modules)
  - Only `.css` can be processed.
  - Resolving using webpack's resolve.alias is not implemented.
- [typed-scss-modules](https://github.com/skovy/typed-scss-modules)
  - Only `.scss` can be processed.
  - Resolving using webpack's resolve.alias is not implemented.
- [typed-less-modules](https://github.com/qiniu/typed-less-modules)
  - Only `.less` can be processed.
  - Resolving using webpack's resolve.alias is not implemented.
- [typescript-plugin-css-modules](https://github.com/mrmckeb/typescript-plugin-css-modules)
  - This is implemented as a TypeScript language service.
    - Therefore, warnings can be issued on the editor, but not at compile time.
    - In addition, the setup procedure is complicated.
    - For more information, see [the documentation](https://github.com/mrmckeb/typescript-plugin-css-modules/tree/82ba03548c3d2193508e1a4dbc47c1aa9b22943c#about-this-plugin).

### Definition jumps

- [typescript-plugin-css-modules](https://github.com/mrmckeb/typescript-plugin-css-modules)
  - Can only jump to the top of `.css`.

### Unused selector detection

- [stylelint-no-unused-selectors](https://github.com/nodaguti/stylelint-no-unused-selectors)
  - Detectable patterns are limited.
  - However, it works without `.d.ts`.
  - For more information, see [the documentation](https://github.com/nodaguti/stylelint-no-unused-selectors/tree/57eeacaab675957aaa507f5524b9b78947e127b2/src/plugins/stylelint-no-unused-selectors-plugin-tsx#features-and-limitations)
