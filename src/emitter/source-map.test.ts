import { EOL } from 'os';
import { getSourceMapFilePath, generateSourceMappingURLComment } from './source-map.js';

test('getSourceMapFilePath', () => {
  expect(getSourceMapFilePath('/app/src/dir/1.css', undefined)).toBe('/app/src/dir/1.css.d.ts.map');
  expect(getSourceMapFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toBe(
    '/app/dist/src/dir/1.css.d.ts.map',
  );
  expect(() => getSourceMapFilePath('/tmp/src/dir/1.css', { rootDir: '/app', outDir: '/app/dist' })).toThrow();
  expect(() => getSourceMapFilePath('/app/src/dir/1.css', { rootDir: '/app', outDir: '/tmp/dist' })).toThrow();
});

test('generateSourceMappingURLComment', () => {
  expect(generateSourceMappingURLComment('/app/src/dir/1.css.d.ts', '/app/src/dir/1.css.d.ts.map')).toBe(
    '//# sourceMappingURL=1.css.d.ts.map' + EOL,
  );
  expect(generateSourceMappingURLComment('/app/src/dir1/1.css.d.ts', '/app/src/dir2/1.css.d.ts.map')).toBe(
    '//# sourceMappingURL=../dir2/1.css.d.ts.map' + EOL,
  );
});
