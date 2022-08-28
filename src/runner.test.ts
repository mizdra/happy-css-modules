import { readFile, writeFile } from 'fs/promises';
import { jest } from '@jest/globals';
import chalk from 'chalk';
import AggregateError from 'es-aggregate-error';
import { run } from './runner.js';
import { createFixtures, exists, getFixturePath, transformer, waitForAsyncTask } from './test/util.js';

// eslint-disable-next-line @typescript-eslint/no-empty-function
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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
test('returns an error if the file fails to process in non-watch mode', async () => {
  createFixtures({
    '/test/1.css': '.a {}',
    '/test/2.css': 'INVALID SYNTAX',
    '/test/3.css': 'INVALID SYNTAX',
  });
  const maybeError = await run({ ...defaultOptions, watch: false }).catch((e) => e);

  // The errors are aggregated into AggregateError.
  expect(maybeError).toBeInstanceOf(AggregateError);
  const error = maybeError as AggregateError;
  expect(error.message).toMatchInlineSnapshot(`"Failed to process files"`);
  expect(error.errors).toHaveLength(2);
  expect(error.errors[0]).toMatchInlineSnapshot(`<fixtures>/test/2.css:1:1: Unknown word`);
  expect(error.errors[1]).toMatchInlineSnapshot(`<fixtures>/test/3.css:1:1: Unknown word`);

  // The error is logged to console.error.
  expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, chalk.red('[Error] ' + error.errors[0]));
  // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
  expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, chalk.red('[Error] ' + error.errors[1]));

  // The valid files are emitted.
  expect(await exists(getFixturePath('/test/1.css.d.ts'))).toBe(true);
  expect(await exists(getFixturePath('/test/1.css.d.ts.map'))).toBe(true);
});
