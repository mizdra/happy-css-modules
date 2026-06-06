## Overview

`happy-css-modules` (CLI name `hcm`) is a CLI tool that generates type definitions (`.d.ts`) and Declaration Maps (`.d.ts.map`) from CSS Modules `.css`/`.scss`/`.less` files. The `.d.ts.map` enables go-to-definition in tsserver.

## Commands

- `npm run build`: Production build
- `npm test`/`npm test <file>`: Run tests
  - The `LESS_VERSION` environment variable lets you switch the less version used in tests
- `npm run lint`: Run all static checks at once
- `npm run lint:oxfmt`/`npm run lint:oxlint`/`npm run lint:tsc`: Run individual static checks
- `npm run dev`: Start happy-css-modules in watch mode against `example/` to verify behavior

## Architecture

Processing starts at `run()` (`src/runner.ts`), and each CSS file goes through the following pipeline:

1. **Transformer** (`src/transformer/`): Converts AltCSS into plain CSS + a source map. Dispatches to scss/less/postcss based on the file extension.
2. **Locator** (`src/locator/index.ts`): Parses the transformed CSS with postcss and obtains local token names via `postcss-modules`. Resolves `@import` / `@value` **recursively** to aggregate tokens, and determines each token's location in the original source (`originalLocation`). This is the source information for go-to-definition.
3. **Resolver** (`src/resolver/index.ts`): Resolves `@import` specifiers.
4. **Emitter** (`src/emitter/index.ts`): Generates the `.d.ts` string and source map from tokens and writes them out.

### Important Constraints

- **`Locator#load` cannot be called concurrently.** The runner acquires a lock with `async-mutex` to serialize calls.
- There are two layers of caching: the runner-level `@file-cache` (skips based on file change detection, `--cache`/`--cacheStrategy`), and Locator's internal mtime-based recursive resolution cache.
- Token location is determined by a heuristic: "a class selector matching a token name returned by `postcss-modules` is treated as the origin." False positives are possible.

## Coding Conventions

- Imports across directories must not use deep paths; they are limited to going through the `index.js` barrel. New public functions must be exported from the barrel.

## Testing

- Unit tests are `*.test.ts` files adjacent to each module.
- `src/integration-test/go-to-definition.test.ts` starts a real tsserver (`@typescript/server-harness`) to verify go-to-definition end-to-end.
- `src/regression-test/` contains regression tests labeled with issue numbers.

## Tech Stack

- npm
- oxfmt
- oxlint
- TypeScript

## Development Flow

- Write PR descriptions and commit messages in English
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  - `<type>` is one of: feat, fix, docs, refactor, test, chore, deps
  - e.g. `feat: add support for .less files`
- Assign appropriate labels when creating a PR
  - `Type: Breaking Change`: Breaking changes
  - `Type: Bug`: Bug fixes
  - `Type: Documentation`: Documentation changes
  - `Type: Feature`: New features
  - `Type: Refactoring`: Refactoring
  - `Type: Testing`: Test additions/modifications
  - `Type: Maintenance`: Repository maintenance
  - `Type: CI`: CI/CD changes
  - `Type: Security`: Security-related changes
  - `Type: Dependencies`: Dependency updates
