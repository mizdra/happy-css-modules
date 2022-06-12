# Contributing

This is a guide for contributors.

## How to dev

- `npm run build`: Build for production
- `npm run lint`: Try static-checking
- `npm run test`: Run tests

## How to release

- Wait for passing CI...
- ```bash
  git switch main && git pull
  ```
- ```bash
  rm -rf dist && npm run build
  ```
- ```bash
  npm version <major|minor|patch>
  ```
- ```bash
  npm publish
  ```
- ```bash
  git push --follow-tags
  ```
