import type { Stats } from 'node:fs';
import { glob } from 'node:fs/promises';
import { resolve, relative, basename } from 'node:path';
import * as process from 'node:process';
import { styleText } from 'node:util';
import { createCache } from '@file-cache/core';
import { createNpmPackageKey } from '@file-cache/npm';
import chokidar from 'chokidar';
import { DEFAULT_ARBITRARY_EXTENSIONS } from './config.js';
import { isGeneratedFilesExist, emitGeneratedFiles } from './emitter/index.js';
import { Locator } from './locator/index.js';
import { Logger } from './logger.js';
import type { Resolver } from './resolver/index.js';
import { createDefaultResolver } from './resolver/index.js';
import { createDefaultTransformer, type Transformer } from './transformer/index.js';
import { getInstalledPeerDependencies, isMatchByGlob } from './util.js';

class Mutex {
  private _queue: (() => void)[] = [];
  private _locked = false;

  async acquire(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this._locked) {
        this._locked = true;
        resolve();
      } else {
        this._queue.push(resolve);
      }
    });
  }

  release(): void {
    const next = this._queue.shift();
    if (next) {
      next();
    } else {
      this._locked = false;
    }
  }
}

export type Watcher = {
  close: () => Promise<void>;
};

export type LocalsConvention = 'camelCase' | 'camelCaseOnly' | 'dashes' | 'dashesOnly' | undefined;

export interface RunnerOptions {
  pattern: string;
  watch?: boolean | undefined;
  /**
   * Style of exported class names.
   * @default undefined
   */
  localsConvention?: LocalsConvention | undefined;
  declarationMap?: boolean | undefined;
  transformer?: Transformer | undefined;
  resolver?: Resolver | undefined;
  /**
   * The option compatible with sass's `--load-path`. It is an array of relative or absolute paths.
   * @example ['src/styles']
   * @example ['/home/user/repository/src/styles']
   */
  sassLoadPaths?: string[] | undefined;
  /**
   * The option compatible with less's `--include-path`. It is an array of relative or absolute paths.
   * @example ['src/styles']
   * @example ['/home/user/repository/src/styles']
   */
  lessIncludePaths?: string[] | undefined;
  /**
   * The option compatible with webpack's `resolve.alias`. It is an object consisting of a pair of alias names and relative or absolute paths.
   * @example { style: 'src/styles', '@': 'src' }
   * @example { style: '/home/user/repository/src/styles', '@': '/home/user/repository/src' }
   */
  webpackResolveAlias?: Record<string, string> | undefined;
  /**
   * The option compatible with postcss's `--config`. It is a relative or absolute path.
   * @example '.'
   * @example 'postcss.config.js'
   * @example '/home/user/repository/src'
   */
  postcssConfig?: string | undefined;
  /**
   * Generate `.d.css.ts` instead of `.css.d.ts`.
   * @default false
   */
  arbitraryExtensions?: boolean | undefined;
  /**
   * Only generate .d.ts and .d.ts.map for changed files.
   * @default true
   */
  cache?: boolean | undefined;
  /**
   * Strategy for the cache to use for detecting changed files.
   * @default 'content'
   */
  cacheStrategy?: 'content' | 'metadata' | undefined;
  /**
   * What level of logs to report.
   * @default 'info'
   */
  logLevel?: 'debug' | 'info' | 'silent' | undefined;
  /** Working directory path. */
  cwd?: string | undefined;
  /** Output directory for generated files. */
  outDir?: string | undefined;
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
  const lock = new Mutex();
  const logger = new Logger(options.logLevel ?? 'info');

  const cwd = options.cwd ?? process.cwd();
  const resolver =
    options.resolver ??
    createDefaultResolver({
      cwd,
      sassLoadPaths: options.sassLoadPaths,
      lessIncludePaths: options.lessIncludePaths,
      webpackResolveAlias: options.webpackResolveAlias,
    });
  const transformer = options.transformer ?? createDefaultTransformer({ cwd, postcssConfig: options.postcssConfig });

  const installedPeerDependencies = getInstalledPeerDependencies();
  const cache = await createCache({
    name: 'happy-css-modules',
    mode: options.cacheStrategy ?? 'content',
    keys: [
      () => createNpmPackageKey(['happy-css-modules', ...installedPeerDependencies]),
      () => {
        return JSON.stringify(options);
      },
    ],
    noCache: !(options.cache ?? true),
  });

  const locator = new Locator({ transformer, resolver });
  const isExternalFile = (filePath: string) => {
    return !isMatchByGlob(filePath, options.pattern, { cwd });
  };

  async function processFile(filePath: string) {
    async function isChangedFile(filePath: string) {
      const result = await cache.getAndUpdateCache(filePath);
      // oxlint-disable-next-line typescript/only-throw-error
      if (result.error) throw result.error;
      return result.changed;
    }

    // Locator#load cannot be called concurrently. Therefore, it takes a lock and waits.
    await lock.acquire();

    try {
      const _isGeneratedFilesExist = await isGeneratedFilesExist(
        filePath,
        options.declarationMap,
        options.arbitraryExtensions ?? DEFAULT_ARBITRARY_EXTENSIONS,
        options.outDir,
        cwd,
      );
      const _isChangedFile = await isChangedFile(filePath);
      // Generate .d.ts and .d.ts.map only when the file has been updated.
      // However, if .d.ts or .d.ts.map has not yet been generated, always generate.
      if (_isGeneratedFilesExist && !_isChangedFile) {
        logger.debug(styleText('gray', `${relative(cwd, filePath)} (skipped)`));
        return;
      }

      const result = await locator.load(filePath);
      await emitGeneratedFiles({
        filePath,
        tokens: result.tokens,
        emitDeclarationMap: options.declarationMap,
        dtsFormatOptions: {
          localsConvention: options.localsConvention,
          arbitraryExtensions: options.arbitraryExtensions,
        },
        isExternalFile,
        outDir: options.outDir,
        cwd,
      });
      logger.info(styleText('green', `${relative(cwd, filePath)} (generated)`));

      await cache.reconcile(); // Update cache for the file
    } finally {
      lock.release();
    }
  }

  async function processAllFiles() {
    const filePaths = (await Array.fromAsync(glob(options.pattern, { cwd })))
      // convert relative path to absolute path
      .map((file) => resolve(cwd, file));

    const errors: unknown[] = [];
    for (const filePath of filePaths) {
      // oxlint-disable-next-line no-await-in-loop
      await processFile(filePath).catch((e) => errors.push(e));
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Failed to process files');
    }
  }

  if (!options.watch) {
    logger.info(`Generate .d.ts for ${options.pattern}...`);
    await processAllFiles();
    // Write cache state to file for persistence
  } else {
    // First, watch files.
    logger.info(`Watch ${options.pattern}...`);
    const watcher = chokidar.watch(cwd, {
      ignored: (filePath: string, stats?: Stats) => {
        // The ignored function is called twice for the same path. The first time with stats undefined,
        // and the second time with stats provided.
        // In the first call, we can't determine if the path is a directory or file,
        // so we include it considering it might be a directory.
        if (!stats) return false;
        if (stats.isDirectory()) {
          const name = basename(filePath);
          return name === 'node_modules' || name === '.git';
        }
        return isExternalFile(filePath);
      },
    });
    watcher.on('all', (eventName, filePath) => {
      if (eventName !== 'add' && eventName !== 'change') return;

      processFile(filePath).catch((e) => {
        logger.error(e);
        // TODO: Emit a error by `Watcher#onerror`
      });
    });

    return { close: async () => watcher.close() };
  }
}
