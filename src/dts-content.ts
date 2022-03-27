import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import isThere from 'is-there';
import * as mkdirp from 'mkdirp';
import * as util from 'util';
import camelcase from 'camelcase';
import { ExportToken } from './file-system-loader';
import { CodeWithSourceMap, SourceNode } from './source-map';

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

export type CamelCaseOption = boolean | 'dashes' | undefined;

interface DtsContentOptions {
  dropExtension: boolean;
  declarationMap: boolean;
  rootDir: string;
  searchDir: string;
  outDir: string;
  rInputPath: string;
  rawTokenList: ExportToken[];
  namedExports: boolean;
  camelCase: CamelCaseOption;
  EOL: string;
}

export class DtsContent {
  private dropExtension: boolean;
  private declarationMap: boolean;
  private rootDir: string;
  private searchDir: string;
  private outDir: string;
  private rInputPath: string;
  private rawTokenList: ExportToken[];
  private namedExports: boolean;
  private camelCase: CamelCaseOption;
  private resultList: typeof SourceNode[];
  private EOL: string;

  constructor(options: DtsContentOptions) {
    this.dropExtension = options.dropExtension;
    this.declarationMap = options.declarationMap;
    this.rootDir = options.rootDir;
    this.searchDir = options.searchDir;
    this.outDir = options.outDir;
    this.rInputPath = options.rInputPath;
    this.rawTokenList = options.rawTokenList;
    this.namedExports = options.namedExports;
    this.camelCase = options.camelCase;
    this.EOL = options.EOL;

    // when using named exports, camelCase must be enabled by default
    // (see https://webpack.js.org/loaders/css-loader/#namedexport)
    // we still accept external control for the 'dashes' option,
    // so we only override in case is false or undefined
    if (this.namedExports && !this.camelCase) {
      this.camelCase = true;
    }

    this.resultList = this.createResultList();
  }

  public get contents(): string[] {
    return this.resultList.map(result => result.toString());
  }

  public get formatted(): string {
    const codeWithSourceMap = this.createCodeWithSourceMap();
    return codeWithSourceMap.code;
  }

  public get tokens(): ExportToken[] {
    return this.rawTokenList;
  }

  public get outputFilePath(): string {
    const outputFileName = this.dropExtension ? removeExtension(this.rInputPath) : this.rInputPath;
    return path.join(this.rootDir, this.outDir, outputFileName + '.d.ts');
  }

  private get outputMapFilePath(): string {
    return this.outputFilePath + '.map';
  }

  public get inputFilePath(): string {
    return path.join(this.rootDir, this.searchDir, this.rInputPath);
  }

  public async writeFile(postprocessor?: (formatted: string) => string): Promise<void> {
    // Positioning information is broken when processed by the postprocessor.
    // Therefore, disable the output of the sourcemap.
    // TODO: Allow postprocessor to handle sourcemap.
    if (this.declarationMap && postprocessor) {
      throw new Error('`postprocessor` and declaration map cannot be used together.');
    }

    const codeWithSourceMap = this.createCodeWithSourceMap();

    // Since sourcemap and type definitions are in the same directory, they can be referenced by relative paths.
    const finalOutput = postprocessor
      ? postprocessor(codeWithSourceMap.code)
      : codeWithSourceMap.code + `//# sourceMappingURL=${path.basename(this.outputMapFilePath)}` + this.EOL;
    const finalMapOutput = this.declarationMap ? codeWithSourceMap.map.toString() : undefined;

    const outPathDir = path.dirname(this.outputFilePath);
    if (!isThere(outPathDir)) {
      mkdirp.sync(outPathDir);
    }

    let isDirty = false;

    if (!isThere(this.outputFilePath)) {
      isDirty = true;
    } else {
      const content = (await readFile(this.outputFilePath)).toString();

      if (content !== finalOutput) {
        isDirty = true;
      }
    }
    if (this.declarationMap) {
      if (!isThere(this.outputMapFilePath)) {
        isDirty = true;
      } else {
        const mapContent = (await readFile(this.outputMapFilePath)).toString();
        if (mapContent !== finalMapOutput) {
          isDirty = true;
        }
      }
    }

    if (isDirty) {
      if (finalMapOutput) {
        // NOTE: tsserver does not support inline declaration maps. Therefore, sourcemap files must be output.
        await writeFile(this.outputFilePath, finalOutput, 'utf8');
        await writeFile(this.outputMapFilePath, finalMapOutput, 'utf8');
      } else {
        await writeFile(this.outputFilePath, finalOutput, 'utf8');
      }
    }
  }

  private createResultList(): typeof SourceNode[] {
    const convertKey = this.getConvertKeyMethod(this.camelCase);

    const result = this.rawTokenList.map(rawToken => {
      // NOTE: Only one original position can be associated with one generated position.
      // This is due to the sourcemap specification. Here we have no choice but to extract only one original position.
      // TODO: Consider how to preserve multiple original positions.
      const originalPosition = rawToken.originalPositions[0];
      const key = convertKey(rawToken.name);

      if (this.namedExports) {
        return new SourceNode(null, null, null, [
          'export const ',
          new SourceNode(
            originalPosition.line ?? null,
            originalPosition.column ?? null,
            originalPosition.filePath,
            `${key}`,
          ),
          ': string;',
        ]);
      } else {
        return new SourceNode(null, null, null, [
          'readonly ',
          new SourceNode(
            originalPosition.line ?? null,
            originalPosition.column ?? null,
            originalPosition.filePath,
            `"${key}"`,
          ),
          ': string;',
        ]);
      }
    });
    return result;
  }

  private getConvertKeyMethod(camelCaseOption: CamelCaseOption): (str: string) => string {
    switch (camelCaseOption) {
      case true:
        return camelcase;
      case 'dashes':
        return this.dashesCamelCase;
      default:
        return key => key;
    }
  }

  /**
   * Replaces only the dashes and leaves the rest as-is.
   *
   * Mirrors the behaviour of the css-loader:
   * https://github.com/webpack-contrib/css-loader/blob/1fee60147b9dba9480c9385e0f4e581928ab9af9/lib/compile-exports.js#L3-L7
   */
  private dashesCamelCase(str: string): string {
    return str.replace(/-+(\w)/g, function (match, firstLetter) {
      return firstLetter.toUpperCase();
    });
  }

  /**
   * Generate the `CodeWithSourceMap`.
   */
  private createCodeWithSourceMap(): CodeWithSourceMap {
    const resultList = this.createResultList();

    let sourceNode: typeof SourceNode;
    if (!this.resultList || !this.resultList.length) {
      sourceNode = new SourceNode(null, null, null, '');
    } else if (this.namedExports) {
      sourceNode = new SourceNode(null, null, null, [
        'export const __esModule: true;' + os.EOL,
        ...resultList.map(result => [result, os.EOL]),
        this.EOL,
      ]);
    } else {
      sourceNode = new SourceNode(1, 0, this.rInputPath, [
        'declare const styles: {' + os.EOL,
        ...resultList.map(result => ['  ', result, os.EOL]),
        '};' + os.EOL,
        'export = styles;' + os.EOL,
        this.EOL,
      ]);
    }
    const codeWithSourceMap = sourceNode.toStringWithSourceMap({
      // Since sourcemap and type definitions are in the same directory, they can be referenced by relative paths.
      file: path.basename(this.outputFilePath),
      sourceRoot: '',
    });
    return codeWithSourceMap;
  }
}

function removeExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return filePath.replace(new RegExp(ext + '$'), '');
}
