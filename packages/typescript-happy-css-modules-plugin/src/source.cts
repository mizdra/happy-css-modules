import { parse } from 'node:path';
import type { Config } from './config.cjs';

export function getCssFileName(fileName: string, config: Config): string {
  const { dir, name } = parse(fileName);
  return `${dir}/${name}${config.styleFileExtension}`;
}

export function getCssModuleSpecifier(fileName: string, config: Config): string {
  const { name } = parse(fileName);
  return `./${name}${config.styleFileExtension}`;
}

export function getCssImportStatement(fileName: string, config: Config): string {
  return `import ${config.exportedStylesName} from '${getCssModuleSpecifier(fileName, config)}';\n`;
}
