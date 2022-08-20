import * as process from 'process';
import * as util from 'util';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import _glob from 'glob';
import { emitGeneratedFiles, getDtsFilePath } from './emitter';
import { Loader } from './loader';

const glob = util.promisify(_glob);

export interface RunOptions {
  pattern: string;
  outDir?: string;
  watch?: boolean;
  camelCase?: boolean;
  namedExport?: boolean;
  declarationMap?: boolean;
  transform?: (newPath: string) => Promise<string>;
  silent?: boolean;
}

/**
 * Run typed-css-module.
 * @param options Runner options.
 */
export async function run(options: RunOptions): Promise<void> {
  const writeFile = async (f: string): Promise<void> => {
    try {
      const loader = new Loader(); // TODO: support transform
      const result = await loader.load(f);
      const rootDir = process.cwd();
      const outDir = options.outDir;
      await emitGeneratedFiles(process.cwd(), options.outDir, f, result.tokens, options.declarationMap, {
        camelCase: options.camelCase,
        namedExport: options.namedExport,
      });

      if (!options.silent) {
        const dtsFilePath = getDtsFilePath(rootDir, outDir, f);
        console.log('Wrote ' + chalk.green(dtsFilePath));
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      console.error(chalk.red('[Error] ' + error));
    }
  };

  if (!options.watch) {
    const files = await glob(options.pattern);
    await Promise.all(files.map(writeFile));
  } else {
    console.log('Watch ' + options.pattern + '...');

    const watcher = chokidar.watch([options.pattern.replace(/\\/g, '/')]);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    watcher.on('add', writeFile);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    watcher.on('change', writeFile);
    await waitForever();
  }
}

async function waitForever(): Promise<void> {
  return new Promise<void>(() => {
    // noop
  });
}
