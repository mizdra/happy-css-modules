import { constants } from 'fs';
import { access } from 'fs/promises';
import less from 'less';
import postcss, { type Root, type Rule, type AtRule, type Declaration } from 'postcss';
import { type ClassName } from 'postcss-selector-parser';
import sass from 'sass';
import { type Transformer, type Token, collectNodes, type Location } from '../loader/index.js';

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
