import mizdra from '@mizdra/oxfmt-config';

export default {
  ...mizdra,
  ignorePatterns: ['__snapshots__/', '*.css.d.ts', '*.scss.d.ts', '*.less.d.ts', 'docs/how-does-definition-jumps-work'],
};
