import postcss, { Root } from 'postcss';
import { generateLocalTokenNames } from '../src/postcss';

function root(code: string): Root {
  return postcss.parse(code);
}

test('generateLocalTokenNames', () => {
  expect(
    generateLocalTokenNames(
      root(`
    .foo {}
    .bar {}
  `),
    ),
  ).toStrictEqual(['foo', 'bar']);
});
