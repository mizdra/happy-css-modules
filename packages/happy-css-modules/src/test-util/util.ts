import { constants, mkdirSync, realpathSync, rmSync, writeFileSync } from 'fs';
import { access } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import postcss, { type Root, type Rule, type AtRule } from 'postcss';
import { type ClassName } from 'postcss-selector-parser';
import { type Token, collectNodes, type Location } from '../locator/index.js';
import { sleepSync } from '../util.js';

export const FIXTURE_DIR_PATH = resolve(
  realpathSync(tmpdir()),
  'happy-css-modules/fixtures',
  process.env['JEST_WORKER_ID']!,
);

export function createRoot(code: string, from?: string): Root {
  return postcss.parse(code, { from: from || '/test/test.css' });
}

export function createAtImports(root: Root): AtRule[] {
  return collectNodes(root).atImports;
}

export function createClassSelectors(root: Root): { rule: Rule; classSelector: ClassName }[] {
  return collectNodes(root).classSelectors;
}

export function fakeToken(args: {
  name: Token['name'];
  originalLocation: { filePath?: Location['filePath']; start?: Location['start'] };
}): Token {
  if (args.originalLocation.filePath === undefined || args.originalLocation.start === undefined) {
    return {
      name: args.name,
      originalLocation: { filePath: undefined, start: undefined, end: undefined },
    };
  } else {
    return {
      name: args.name,
      originalLocation: {
        filePath: args.originalLocation.filePath ?? getFixturePath('/test/1.css'),
        start: args.originalLocation.start,
        end: {
          line: args.originalLocation.start.line,
          column: args.originalLocation.start.column + args.name.length - 1,
        },
      },
    };
  }
}

export async function waitForAsyncTask(ms?: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms ?? 0);
  });
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

type File = string;

type DirectoryItem = File | DirectoryItems;

type DirectoryItems = {
  [name: string]: DirectoryItem;
};

function isFile(item: DirectoryItem): item is File {
  return typeof item === 'string';
}

export function createFixtures(items: DirectoryItems): void {
  function createFixturesImpl(items: DirectoryItems, baseDir: string): void {
    for (const [name, item] of Object.entries(items)) {
      const path = join(baseDir, name);
      if (isFile(item)) {
        mkdirSync(dirname(path), { recursive: true });
        if (typeof item === 'string') {
          writeFileSync(path, item);
        }
      } else {
        mkdirSync(path, { recursive: true });
        createFixturesImpl(item, path);
      }
    }
  }
  removeFixtures();
  sleepSync(2); // Wait 2 ms for mtime to change from the previous fixture.
  createFixturesImpl(items, FIXTURE_DIR_PATH);
}

export function removeFixtures(): void {
  rmSync(FIXTURE_DIR_PATH, { recursive: true, force: true });
}

export function getFixturePath(path: string): string {
  return join(FIXTURE_DIR_PATH, path);
}
