export interface Config {
  styleFileExtension: string;
  exportedStylesName: string;
}

export function parseConfig(config: unknown): Config {
  if (typeof config !== 'object' || config === null) throw new Error('config is not an object');
  let styleFileExtension = '.module.css';
  let exportedStylesName = 'styles';
  if ('styleFileExtension' in config) {
    if (typeof config.styleFileExtension !== 'string') throw new Error('styleFileExtension is not a string');
    styleFileExtension = config.styleFileExtension;
  }
  if ('exportedStylesName' in config) {
    if (typeof config.exportedStylesName !== 'string') throw new Error('exportedStylesName is not a string');
    exportedStylesName = config.exportedStylesName;
  }
  return {
    styleFileExtension,
    exportedStylesName,
  };
}
