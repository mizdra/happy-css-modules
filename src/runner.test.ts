import { readFile, writeFile } from 'fs/promises';
import mock from 'mock-fs';
import { run } from './runner';
import { transform, waitForAsyncTask } from './test/util';

const defaultOptions = {
  pattern: '/test/**/*.{css,scss}',
  declarationMap: true,
  silent: true,
};

test('generates .d.ts and .d.ts.map', async () => {
  mock({
    '/test/1.css': '.a {}',
    '/test/2.css': '.b {}',
  });
  await run({ ...defaultOptions });
  expect(await readFile('/test/1.css.d.ts', 'utf8')).toMatchSnapshot();
  expect(await readFile('/test/1.css.d.ts.map', 'utf8')).toMatchSnapshot();
  expect(await readFile('/test/2.css.d.ts', 'utf8')).toMatchSnapshot();
  expect(await readFile('/test/2.css.d.ts.map', 'utf8')).toMatchSnapshot();
});

test.todo('changes dts format with camelCase and namedExport options');
test('does not emit declaration map if declarationMap is false', async () => {
  mock({
    '/test/1.css': '.a {}',
  });
  await run({ ...defaultOptions, declarationMap: false });
  await expect(readFile('/test/1.css.d.ts', 'utf8')).resolves.not.toThrow();
  await expect(readFile('/test/1.css.d.ts.map', 'utf8')).rejects.toThrow(/ENOENT/);
});
test('supports transformer', async () => {
  mock({
    '/test/1.scss': `.a { dummy: ''; }`,
  });
  await run({ ...defaultOptions, transform });
  expect(await readFile('/test/1.scss.d.ts', 'utf8')).toMatchSnapshot();
  expect(await readFile('/test/1.scss.d.ts.map', 'utf8')).toMatchSnapshot();
});
test('watches for changes in files', async () => {
  mock({
    '/test': {
      /* empty directory */
    },
  });
  const watcher = await run({ ...defaultOptions, watch: true });

  await writeFile('/test/1.css', '.a-1 {}');
  await waitForAsyncTask();
  expect(await readFile('/test/1.css.d.ts', 'utf8')).toMatch(/a-1/);

  // For some reason, the second file change event does not fire, so I cannot test it.
  // TODO: find out why it does not fire.
  // await writeFile('/test/1.css', '.a-2 {}');
  // await waitForAsyncTask();
  // expect(await readFile('/test/1.css.d.ts', 'utf8')).toMatch(/a-2/);

  await watcher.close();
});
