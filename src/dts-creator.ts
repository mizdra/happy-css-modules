import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { Plugin } from 'postcss';
import { DtsContent } from './dts-content';
import { CamelCaseOption } from './emitter';
import FileSystemLoader from './library/css-modules-loader-core/file-system-loader';

interface DtsCreatorOptions {
  rootDir?: string;
  outDir?: string;
  camelCase?: CamelCaseOption;
  namedExport?: boolean;
  declarationMap?: boolean;
  EOL?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loaderPlugins?: Plugin<any>[];
}

export class DtsCreator {
  private rootDir: string;
  private outDir: string;
  private loader: FileSystemLoader;
  private inputDirectory: string;
  private outputDirectory: string;
  private camelCase: CamelCaseOption;
  private namedExport: boolean;
  private declarationMap: boolean;
  private EOL: string;

  constructor(options?: DtsCreatorOptions) {
    if (!options) options = {};
    this.rootDir = options.rootDir || process.cwd();
    this.outDir = options.outDir || '.';
    this.loader = new FileSystemLoader(this.rootDir, options.loaderPlugins);
    this.inputDirectory = this.rootDir;
    this.outputDirectory = path.join(this.rootDir, this.outDir);
    this.camelCase = options.camelCase;
    this.namedExport = !!options.namedExport;
    this.declarationMap = !!options.declarationMap;
    this.EOL = options.EOL || os.EOL;
  }

  public async create(
    filePath: string,
    transform?: (newPath: string) => Promise<string>,
    clearCache = false,
  ): Promise<DtsContent> {
    let rInputPath: string;
    if (path.isAbsolute(filePath)) {
      rInputPath = path.relative(this.inputDirectory, filePath);
    } else {
      rInputPath = path.relative(this.inputDirectory, path.join(process.cwd(), filePath));
    }
    if (clearCache) {
      this.loader.tokensByFile = {};
    }

    const rawTokenList = await this.loader.fetch(filePath, '/', undefined, transform);
    if (rawTokenList) {
      const content = new DtsContent({
        declarationMap: this.declarationMap,
        rootDir: this.rootDir,
        outDir: this.outDir,
        rInputPath,
        rawTokenList,
        namedExport: this.namedExport,
        camelCase: this.camelCase,
        EOL: this.EOL,
      });

      return content;
    } else {
      throw rawTokenList;
    }
  }
}
