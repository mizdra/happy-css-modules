import postcss, { Root } from 'postcss';

export function createRoot(code: string): Root {
  return postcss.parse(code);
}
