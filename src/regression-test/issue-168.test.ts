import { symlink } from 'fs/promises';
import { jest } from '@jest/globals';
import type { RunnerOptions, Watcher } from '../runner.js';
import { run } from '../runner.js';
import { createFixtures, getFixturePath, waitForAsyncTask } from '../test-util/util.js';

const defaultOptions: RunnerOptions = {
  pattern: 'test/**/*.css',
  cwd: getFixturePath('/'),
  cache: false,
  logLevel: 'silent',
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Exit the watcher even if the test fails
let watcher: Watcher | undefined;
afterEach(async () => {
  if (watcher) {
    await watcher.close();
  }
});

it('issue-168', async () => {
  createFixtures({
    '/test/css-file.css': '.a {}',
    '/test/non-css-file.txt': 'text file',
  });
  await symlink(getFixturePath('/test/non-css-file.txt'), getFixturePath('/test/symlink.txt'));
  watcher = await run({ ...defaultOptions, watch: true });
  await waitForAsyncTask(300); // Wait for initial code generation to complete
  expect(consoleErrorSpy).not.toBeCalled(); // If an error is output, then failed
});
