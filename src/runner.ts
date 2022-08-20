import { relative, resolve } from 'path';
import * as process from 'process';
import * as util from 'util';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import _glob from 'glob';
import { emitGeneratedFiles, getDtsFilePath } from './emitter';
import { Loader, Transformer } from './loader';

const glob = util.promisify(_glob);

export interface RunnerOptions {
  pattern: string;
  outDir?: string;
  watch?: boolean;
  camelCase?: boolean;
  namedExport?: boolean;
  declarationMap?: boolean;
  transform?: Transformer;
  silent?: boolean;
}

/**
 * Run typed-css-module.
 * @param options Runner options.
 */
export async function run(options: RunnerOptions): Promise<void> {
  const loader = new Loader(options.transform);
  const distOptions = options.outDir
    ? {
        rootDir: process.cwd(), // TODO: support `--rootDir` option
        outDir: options.outDir,
      }
    : undefined;

  async function processFile(filePath: string) {
    try {
      const result = await loader.load(filePath);
      await emitGeneratedFiles(filePath, result.tokens, distOptions, options.declarationMap, {
        camelCase: options.camelCase,
        namedExport: options.namedExport,
      });
      if (!options.silent) {
        const dtsFilePath = getDtsFilePath(filePath, distOptions);
        console.log('Wrote ' + chalk.green(relative(process.cwd(), dtsFilePath)));
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      console.error(chalk.red('[Error] ' + error));
    }
  }

  if (options.watch) {
    console.log('Watch ' + options.pattern + '...');
    const watcher = chokidar.watch([options.pattern.replace(/\\/g, '/')]);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    watcher.on('add', processFile);
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    watcher.on('change', processFile);
    await waitForever();
  } else {
    const filePaths = (await glob(options.pattern, { dot: true }))
      // convert relative path to absolute path
      .map((file) => resolve(file));

    // TODO: Use `@file-cache/core` to process only files that have changed
    filePaths.forEach((filePath) => {
      void processFile(filePath);
    });
  }
}

async function waitForever(): Promise<void> {
  return new Promise<void>(() => {
    // noop
  });
}
