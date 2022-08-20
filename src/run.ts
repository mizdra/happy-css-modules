import * as util from 'util';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import _glob from 'glob';
import { DtsContent } from './dts-content';
import { DtsCreator } from './dts-creator';

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
  const creator = new DtsCreator({
    rootDir: process.cwd(),
    outDir: options.outDir,
    camelCase: options.camelCase,
    namedExport: options.namedExport,
    declarationMap: options.declarationMap,
  });

  const writeFile = async (f: string): Promise<void> => {
    try {
      const content: DtsContent = await creator.create(f, options.transform, !!options.watch);
      await content.emitGeneratedFiles();

      if (!options.silent) {
        console.log('Wrote ' + chalk.green(content.outputFilePath));
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
