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
  npm version <major|minor|patch>
  ```
- ```bash
  git push --follow-tags
  ```
- Approve a staged package on npmjs.com and publish it.
  - https://www.npmjs.com/settings/mizdra/staged-packages
- Create a release on GitHub.
  - https://github.com/mizdra/happy-css-modules/releases/new
