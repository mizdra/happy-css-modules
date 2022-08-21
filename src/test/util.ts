import less from 'less';
import postcss, { Root, Rule, AtRule, Declaration } from 'postcss';
import { ClassName } from 'postcss-selector-parser';
import sass from 'sass';
import { collectNodes } from '../../src/postcss';
import { Transformer } from '../loader';

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

export const transform: Transformer = async (source: string, from: string) => {
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
