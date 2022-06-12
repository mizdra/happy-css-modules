import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import { Plugin } from 'postcss';
import { DtsContent, CamelCaseOption } from './dts-content';
import FileSystemLoader from './file-system-loader';

interface DtsCreatorOptions {
  rootDir?: string;
  searchDir?: string;
  outDir?: string;
  camelCase?: CamelCaseOption;
  namedExports?: boolean;
  dropExtension?: boolean;
  declarationMap?: boolean;
  EOL?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loaderPlugins?: Plugin<any>[];
}

export class DtsCreator {
  private rootDir: string;
  private searchDir: string;
  private outDir: string;
  private loader: FileSystemLoader;
  private inputDirectory: string;
  private outputDirectory: string;
  private camelCase: CamelCaseOption;
  private namedExports: boolean;
  private dropExtension: boolean;
  private declarationMap: boolean;
  private EOL: string;

  constructor(options?: DtsCreatorOptions) {
    if (!options) options = {};
    this.rootDir = options.rootDir || process.cwd();
    this.searchDir = options.searchDir || '';
    this.outDir = options.outDir || this.searchDir;
    this.loader = new FileSystemLoader(this.rootDir, options.loaderPlugins);
    this.inputDirectory = path.join(this.rootDir, this.searchDir);
    this.outputDirectory = path.join(this.rootDir, this.outDir);
    this.camelCase = options.camelCase;
    this.namedExports = !!options.namedExports;
    this.dropExtension = !!options.dropExtension;
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
        dropExtension: this.dropExtension,
        declarationMap: this.declarationMap,
        rootDir: this.rootDir,
        searchDir: this.searchDir,
        outDir: this.outDir,
        rInputPath,
        rawTokenList,
        namedExports: this.namedExports,
        camelCase: this.camelCase,
        EOL: this.EOL,
      });

      return content;
    } else {
      throw rawTokenList;
    }
  }
}
