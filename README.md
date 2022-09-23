<p align="center">
  <img alt="Cover image" src="./docs/cover.svg" />
</p>

<h2 align="center">The Collection of tools to make CSS Modules happy :)</h2>

<p align="center">
  <em>Typed, definition jumps, and unused variable detection!</em>
</p>

https://user-images.githubusercontent.com/9639995/189538880-872ad38d-2c9d-4c19-b257-521018963eec.mov

This is an experimental project aimed at PoC for https://github.com/Quramy/typed-css-modules/issues/177.

## Installation

```console
$ npm i -D happy-css-modules
```

## Usage

```console
$ hcm --help
Create .d.ts and .d.ts.map from CSS modules *.css files.

hcm [options] <glob>

Options:
      --outDir               Output directory                                                                                       [string]
  -w, --watch                Watch input directory's css files or pattern                                         [boolean] [default: false]
      --localsConvention     Style of exported class names.                  [choices: "camelCase", "camelCaseOnly", "dashes", "dashesOnly"]
      --declarationMap       Create sourcemaps for d.ts files                                                      [boolean] [default: true]
      --sassLoadPaths        The option compatible with sass's `--load-path`.                                                        [array]
      --lessIncludePaths     The option compatible with less's `--include-path`.                                                     [array]
      --webpackResolveAlias  The option compatible with webpack's `resolve.alias`.                                                  [string]
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

const runnerOptions = parseArgv(process.argv);
const defaultResolver = createDefaultResolver({
  // Some runner options must be passed to the default resolver.
  sassLoadPaths: runnerOptions.sassLoadPaths?.map((path) => resolve(process.cwd(), path)),
  lessIncludePaths: runnerOptions.lessIncludePaths?.map((path) => resolve(process.cwd(), path)),
});
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

run({ ...runnerOptions, resolver }).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

## TODO

- [x] Add more tests
- [x] Support non-inline source maps
- [x] Implement an interface for easy use by scss/less users
- [ ] Implement stylelint rule to detect unused CSS ruleset from JavaScript
