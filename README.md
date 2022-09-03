# enhanced-typed-css-modules

A collection of tools to make CSS Modules statically checkable.

This is an experimental project aimed at PoC for https://github.com/Quramy/typed-css-modules/issues/177.

## Installation

```console
$ npm i -D enhanced-typed-css-modules
```

## Usage

```console
$ etcm --help
Create .d.ts and .d.ts.map from CSS modules *.css files.

etcm [options] <glob>

Options:
      --outDir            Output directory                              [string]
  -w, --watch             Watch input directory's css files or pattern
                                                      [boolean] [default: false]
      --localsConvention  Style of exported class names.
                 [choices: "camelCase", "camelCaseOnly", "dashes", "dashesOnly"]
      --namedExport       Use named exports as opposed to default exports to ena
                          ble tree shaking            [boolean] [default: false]
      --declarationMap    Create sourcemaps for d.ts files
                                                       [boolean] [default: true]
      --silent            Silent output. Do not show "files written" messages
                                                      [boolean] [default: false]
  -h, --help              Show help                                    [boolean]
  -v, --version           Show version number                          [boolean]

Examples:
  etcm 'src/**/*.module.css'                Generate .d.ts and .d.ts.map.
  etcm 'src/**/*.module.{css,scss,less}'    Also generate files for sass and les
                                            s.
  etcm 'src/**/*.module.css' --watch        Watch for changes and generate .d.ts
                                             and .d.ts.map.
  etcm 'src/**/*.module.css' --declaration  Generate .d.ts only.
  Map=false
```

## Node.js API (Experimental)

> **Warning**
> This feature is experimental and may change significantly. The API is not stable and may have breaking changes even in minor or patch version updates.

`enhanced-typed-css-modules` provides Node.js API for programmatically generating .d.ts and .d.ts.map.

See [src/index.ts](https://github.com/mizdra/enhanced-typed-css-modules/blob/main/src/index.ts) for available API.

### Example

With the `transformer` option, you can use AltCSS, which is not supported by `enhanced-typed-css-modules`.

```javascript
// @ts-check

import { run } from 'enhanced-typed-css-modules';
import { readFile } from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';
import sass from 'sass';

// The custom transpiler supporting sass indented syntax
/** @type {import('enhanced-typed-css-modules').Transformer} */
const transformer = async (source, from) => {
  if (from.endsWith('.sass')) {
    const result = await sass.compileStringAsync(source, {
      // Use indented syntax
      // ref: https://sass-lang.com/documentation/syntax#the-indented-syntax
      syntax: 'indented',
      url: pathToFileURL(from),
      sourceMap: true,
    });
    return { css: result.css, map: result.sourceMap!, dependencies: result.loadedUrls };
  }
  return false;
};

run({
  pattern: 'src/**/*.css';
  watch: false;
  transformer,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

You can also create your own customized `etcm` commands. We also provide a `parseArgv` utility that parses `process.argv` and extracts options.

```javascript
#!/usr/bin/env node
// scripts/etcm.js
// @ts-check

import { run, parseArgv } from 'enhanced-typed-css-modules';

// ...

run({
  ...parseArgv(process.argv), // Inherit default CLI options (e.g. --watch, --namedExport)
  transformer,
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
```

## TODO

- [x] Add more tests
- [x] Support non-inline source maps
- [x] Implement an interface for easy use by scss/less users
- [ ] Implement stylelint rule to detect unused CSS ruleset from JavaScript
