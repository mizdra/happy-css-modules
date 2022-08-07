import postcss, { Root, Rule, AtRule, Declaration } from 'postcss';
import { ClassName } from 'postcss-selector-parser';
import { walkByMatcher } from '../../src/postcss';

export function createRoot(code: string, from?: string): Root {
  return postcss.parse(code, { from: from || '/test/test.css' });
}

export function createAtImports(root: Root): AtRule[] {
  const result: AtRule[] = [];
  walkByMatcher(root, {
    atImport(atImport) {
      result.push(atImport);
    },
  });
  return result;
}

export function createClassSelectors(root: Root): { rule: Rule; classSelector: ClassName }[] {
  const result: { rule: Rule; classSelector: ClassName }[] = [];
  walkByMatcher(root, {
    classSelector(rule, classSelector) {
      result.push({ rule, classSelector });
    },
  });
  return result;
}

export function createComposesDeclarations(root: Root): Declaration[] {
  const result: Declaration[] = [];
  walkByMatcher(root, {
    composesDeclaration(composesDeclaration) {
      result.push(composesDeclaration);
    },
  });
  return result;
}
