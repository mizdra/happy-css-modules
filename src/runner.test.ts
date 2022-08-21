import { readFile } from 'fs/promises';
import mock from 'mock-fs';
import { run } from './runner';

test('generates .d.ts and .d.ts.map', async () => {
  mock({
    '/test/1.css': '.a {}',
    '/test/2.css': '.b {}',
  });
  await run({
    pattern: '/test/**/*.css',
    declarationMap: true,
    silent: true,
  });
  expect(await readFile('/test/1.css.d.ts', 'utf8')).toMatchSnapshot();
  expect(await readFile('/test/1.css.d.ts.map', 'utf8')).toMatchSnapshot();
  expect(await readFile('/test/2.css.d.ts', 'utf8')).toMatchSnapshot();
  expect(await readFile('/test/2.css.d.ts.map', 'utf8')).toMatchSnapshot();
});

test.todo('changes dts format with camelCase and namedExport options');
test.todo('does not emit declaration map if declarationMap is false');
test.todo('supports transformer');
test.todo('watches for changes in files');
