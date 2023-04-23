import { EOL } from 'os';
import { getSourceMapFilePath, generateSourceMappingURLComment } from './source-map.js';

test('getSourceMapFilePath', () => {
  expect(getSourceMapFilePath('/app/src/dir/1.css', false)).toBe('/app/src/dir/1.css.d.ts.map');
  expect(getSourceMapFilePath('/app/src/dir/1.scss', false)).toBe('/app/src/dir/1.scss.d.ts.map');
  expect(getSourceMapFilePath('/app/src/dir/1.css', true)).toBe('/app/src/dir/1.d.css.ts.map');
  expect(getSourceMapFilePath('/app/src/dir/1.scss', true)).toBe('/app/src/dir/1.d.scss.ts.map');
});

test('generateSourceMappingURLComment', () => {
  expect(generateSourceMappingURLComment('/app/src/dir/1.css.d.ts', '/app/src/dir/1.css.d.ts.map')).toBe(
    `//# sourceMappingURL=./1.css.d.ts.map${EOL}`,
  );
  expect(generateSourceMappingURLComment('/app/src/dir1/1.css.d.ts', '/app/src/dir2/1.css.d.ts.map')).toBe(
    `//# sourceMappingURL=../dir2/1.css.d.ts.map${EOL}`,
  );
});
