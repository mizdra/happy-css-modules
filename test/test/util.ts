import postcss, { Root, Rule } from 'postcss';
import { ClassName } from 'postcss-selector-parser';
import { walkByMatcher } from '../../src/postcss';

export function createRoot(code: string, from?: string): Root {
  return postcss.parse(code, { from: from || '/test/test.css' });
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
