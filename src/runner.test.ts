import { readFile, writeFile } from 'fs/promises';
import { run } from './runner.js';
import { createFixtures, getFixturePath, transformer, waitForAsyncTask } from './test/util.js';

const defaultOptions = {
  pattern: 'test/**/*.{css,scss}',
  declarationMap: true,
  silent: true,
  cwd: getFixturePath('/'),
};

test('generates .d.ts and .d.ts.map', async () => {
  createFixtures({
    '/test/1.css': '.a {}',
    '/test/2.css': '.b {}',
  });
  await run({ ...defaultOptions });
  expect(await readFile(getFixturePath('/test/1.css.d.ts'), 'utf8')).toMatchSnapshot();
  expect(await readFile(getFixturePath('/test/1.css.d.ts.map'), 'utf8')).toMatchSnapshot();
  expect(await readFile(getFixturePath('/test/2.css.d.ts'), 'utf8')).toMatchSnapshot();
  expect(await readFile(getFixturePath('/test/2.css.d.ts.map'), 'utf8')).toMatchSnapshot();
});

test.todo('changes dts format with camelCase and namedExport options');
test('does not emit declaration map if declarationMap is false', async () => {
  createFixtures({
    '/test/1.css': '.a {}',
  });
  await run({ ...defaultOptions, declarationMap: false });
  await expect(readFile(getFixturePath('/test/1.css.d.ts'), 'utf8')).resolves.not.toThrow();
  await expect(readFile(getFixturePath('/test/1.css.d.ts.map'), 'utf8')).rejects.toThrow(/ENOENT/);
});
test('supports transformer', async () => {
  createFixtures({
    '/test/1.scss': `.a { dummy: ''; }`,
  });
  await run({ ...defaultOptions, transformer });
  expect(await readFile(getFixturePath('/test/1.scss.d.ts'), 'utf8')).toMatchSnapshot();
  expect(await readFile(getFixturePath('/test/1.scss.d.ts.map'), 'utf8')).toMatchSnapshot();
});
test('watches for changes in files', async () => {
  createFixtures({
    '/test': {}, // empty directory
  });
  const watcher = await run({ ...defaultOptions, watch: true });

  await writeFile(getFixturePath('/test/1.css'), '.a-1 {}');
  await waitForAsyncTask(500); // Wait until the file is written
  expect(await readFile(getFixturePath('/test/1.css.d.ts'), 'utf8')).toMatch(/a-1/);

  await writeFile(getFixturePath('/test/1.css'), '.a-2 {}');
  await waitForAsyncTask(500); // Wait until the file is written
  expect(await readFile(getFixturePath('/test/1.css.d.ts'), 'utf8')).toMatch(/a-2/);

  await watcher.close();
});
