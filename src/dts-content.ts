import {
  getDtsFilePath,
  generateDtsContentWithSourceMap,
  getSourceMapFilePath,
  generateSourceMappingURLComment,
  CamelCaseOption,
} from './emitter';
import { writeFileIfChanged } from './file-system';
import { ExportToken } from './library/css-modules-loader-core/file-system-loader';

interface DtsContentOptions {
  declarationMap: boolean;
  rootDir: string;
  outDir: string;
  rInputPath: string;
  rawTokenList: ExportToken[];
  namedExport: boolean;
  camelCase: CamelCaseOption;
  EOL: string;
}

export class DtsContent {
  private declarationMap: boolean;
  private rootDir: string;
  private outDir: string;
  private rInputPath: string;
  private rawTokenList: ExportToken[];
  private namedExport: boolean;
  private camelCase: CamelCaseOption;
  outputFilePath: string;

  constructor(options: DtsContentOptions) {
    this.declarationMap = options.declarationMap;
    this.rootDir = options.rootDir;
    this.outDir = options.outDir;
    this.rInputPath = options.rInputPath;
    this.rawTokenList = options.rawTokenList;
    this.namedExport = options.namedExport;
    this.camelCase = options.camelCase;
    this.outputFilePath = getDtsFilePath(this.rootDir, this.outDir, this.rInputPath);

    // when using named exports, camelCase must be enabled by default
    // (see https://webpack.js.org/loaders/css-loader/#namedexport)
    // we still accept external control for the 'dashes' option,
    // so we only override in case is false or undefined
    if (this.namedExport && !this.camelCase) {
      this.camelCase = true;
    }
  }

  public async emitGeneratedFiles(): Promise<void> {
    const dtsFilePath = getDtsFilePath(this.rootDir, this.outDir, this.rInputPath);
    const sourceMapFilePath = getSourceMapFilePath(this.rootDir, this.outDir, this.rInputPath);
    const { dtsContent, sourceMap } = generateDtsContentWithSourceMap(
      this.rInputPath,
      dtsFilePath,
      sourceMapFilePath,
      this.rawTokenList,
      {
        camelCase: this.camelCase,
        namedExport: this.namedExport,
      },
    );

    if (this.declarationMap) {
      const sourceMappingURLComment = generateSourceMappingURLComment(dtsFilePath, sourceMapFilePath);
      await writeFileIfChanged(dtsFilePath, dtsContent + sourceMappingURLComment);
      // NOTE: tsserver does not support inline declaration maps. Therefore, sourcemap files must be output.
      await writeFileIfChanged(sourceMapFilePath, sourceMap.toString());
    } else {
      await writeFileIfChanged(dtsFilePath, dtsContent);
    }
  }
}
