import { constants, mkdirSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { access } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import less from 'less';
import postcss, { type Root, type Rule, type AtRule, type Declaration } from 'postcss';
import { type ClassName } from 'postcss-selector-parser';
import sass from 'sass';
import { type Transformer, type Token, collectNodes, type Location } from '../loader/index.js';

export const FIXTURE_DIR_PATH = resolve(tmpdir(), 'checkable-css-modules/fixtures', process.env.JEST_WORKER_ID!);

export function createRoot(code: string, from?: string): Root {
  return postcss.parse(code, { from: from || '/test/test.css' });
}

export function createAtImports(root: Root): AtRule[] {
  return collectNodes(root).atImports;
}

export function createClassSelectors(root: Root): { rule: Rule; classSelector: ClassName }[] {
  return collectNodes(root).classSelectors;
}

export function createComposesDeclarations(root: Root): Declaration[] {
  return collectNodes(root).composesDeclarations;
}

export function fakeToken(args: {
  name: Token['name'];
  originalLocations: { filePath?: Location['filePath']; start: Location['start'] }[];
}): Token {
  return {
    name: args.name,
    originalLocations: args.originalLocations.map((location) => ({
      filePath: location.filePath ?? '/test/1.css',
      start: location.start,
      end: {
        line: location.start.line,
        column: location.start.column + args.name.length - 1,
      },
    })),
  };
}

export const transformer: Transformer = async (source: string, from: string) => {
  if (from.endsWith('.scss')) {
    const result = sass.compile(from, { sourceMap: true });
    return { css: result.css, map: result.sourceMap!, dependencies: result.loadedUrls };
  } else if (from.endsWith('.less')) {
    const result = await less.render(source, {
      filename: from,
      sourceMap: {},
    });
    return { css: result.css, map: result.map, dependencies: result.imports };
  }
  return false;
};

export async function waitForAsyncTask(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

type File = string | { content: string; mtime: Date };

type DirectoryItem = File | DirectoryItems;

type DirectoryItems = {
  [name: string]: DirectoryItem;
};

function isFile(item: DirectoryItem): item is File {
  return typeof item === 'string' || 'content' in item;
}

export function createFixtures(items: DirectoryItems): void {
  function createFixturesImpl(items: DirectoryItems, baseDir: string): void {
  for (const [name, item] of Object.entries(items)) {
      const path = join(baseDir, name);
    if (isFile(item)) {
      mkdirSync(dirname(path), { recursive: true });
      if (typeof item === 'string') {
        writeFileSync(path, item);
      } else {
        writeFileSync(path, item.content);
        utimesSync(path, item.mtime, item.mtime);
      }
    } else {
      mkdirSync(path, { recursive: true });
        createFixturesImpl(item, path);
    }
  }
  }
  removeFixtures();
  createFixturesImpl(items, FIXTURE_DIR_PATH);
}

export function removeFixtures(): void {
  rmSync(FIXTURE_DIR_PATH, { recursive: true, force: true });
}
