import { resolve } from 'path';
import * as process from 'process';
import * as util from 'util';
import chalk from 'chalk';
import * as chokidar from 'chokidar';
import _glob from 'glob';
import { emitGeneratedFiles } from './emitter/index.js';
import { Loader, Transformer } from './loader.js';

const glob = util.promisify(_glob);

export type Watcher = {
  close: () => Promise<void>;
};

export type LocalsConvention = 'camelCase' | 'camelCaseOnly' | 'dashes' | 'dashesOnly' | undefined;

export interface RunnerOptions {
  pattern: string;
  outDir?: string;
  watch?: boolean;
  localsConvention?: LocalsConvention;
  namedExport?: boolean;
  declarationMap?: boolean;
  transform?: Transformer;
  /**
   * Silent output. Do not show "files written" messages.
   * @default false
   */
  silent?: boolean;
  /** Working directory path. */
  cwd?: string;
}

type OverrideProp<T, K extends keyof T, V extends T[K]> = Omit<T, K> & { [P in K]: V };

/**
 * Run typed-css-module.
 * @param options Runner options.
 * @returns Returns `Promise<Watcher>` if `options.watch` is `true`, `Promise<void>` if `false`.
 */
export async function run(options: OverrideProp<RunnerOptions, 'watch', true>): Promise<Watcher>;
export async function run(options: RunnerOptions): Promise<void>;
export async function run(options: RunnerOptions): Promise<Watcher | void> {
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
      await emitGeneratedFiles({
        filePath,
        tokens: result.tokens,
        distOptions,
        emitDeclarationMap: options.declarationMap,
        dtsFormatOptions: {
          localsConvention: options.localsConvention,
          namedExport: options.namedExport,
        },
        silent: options.silent ?? false,
        cwd: options.cwd ?? process.cwd(),
      });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      console.error(chalk.red('[Error] ' + error));
    }
  }

  if (options.watch) {
    if (!options.silent) console.log('Watch ' + options.pattern + '...');
    const watcher = chokidar.watch([options.pattern.replace(/\\/g, '/')]);
    watcher.on('all', (eventName, filePath) => {
      if (eventName === 'add' || eventName === 'change') {
        void processFile(filePath);
      }
    });
    return { close: async () => watcher.close() };
  } else {
    const filePaths = (await glob(options.pattern, { dot: true }))
      // convert relative path to absolute path
      .map((file) => resolve(file));

    // TODO: Use `@file-cache/core` to process only files that have changed
    for (const filePath of filePaths) {
      await processFile(filePath);
    }
  }
}
