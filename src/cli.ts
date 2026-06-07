import { parseArgs } from 'node:util';
import { DEFAULT_ARBITRARY_EXTENSIONS } from './config.js';
import { type RunnerOptions } from './runner.js';
import { getPackageJson } from './util.js';

const HELP_TEXT = `
Generate .d.ts and .d.ts.map for CSS modules.

Usage: hcm [options] <glob>

Options:
  -w, --[no-]watch               Watch input directory's css files or pattern (default: false)
      --localsConvention         Style of exported class names.
                                 [choices: camelCase, camelCaseOnly, dashes, dashesOnly]
      --[no-]declarationMap      Create sourcemaps for d.ts files (default: true)
      --sassLoadPaths            The option compatible with sass's \`--load-path\`.
      --lessIncludePaths         The option compatible with less's \`--include-path\`.
      --webpackResolveAlias      The option compatible with webpack's \`resolve.alias\`.
      --postcssConfig            The option compatible with postcss's \`--config\`.
      --[no-]arbitraryExtensions Generate \`.d.css.ts\` instead of \`.css.d.ts\` (default: false)
      --[no-]cache               Only generate .d.ts and .d.ts.map for changed files (default: true)
      --cacheStrategy            Strategy for the cache to use for detecting changed files.
                                 [choices: content, metadata] (default: content)
      --logLevel                 What level of logs to report.
                                 [choices: debug, info, silent] (default: info)
  -o, --outDir                   Output directory for generated files.
  -h, --help                     Show help
  -v, --version                  Show version number

Examples:
  hcm 'src/**/*.module.css'
  hcm 'src/**/*.module.{css,scss,less}'
  hcm 'src/**/*.module.css' --watch
  hcm 'src/**/*.module.css' --no-declarationMap
  hcm 'src/**/*.module.css' --sassLoadPaths src/style
  hcm 'src/**/*.module.css' --lessIncludePaths src/style
  hcm 'src/**/*.module.css' --webpackResolveAlias '{"@": "src"}'
  hcm 'src/**/*.module.css' --no-cache
`.trim();

export function parseArgv(argv: string[]): RunnerOptions {
  const pkgJson = getPackageJson();

  const { values, positionals } = parseArgs({
    args: argv.slice(2),
    options: {
      watch: { type: 'boolean', short: 'w', default: false },
      localsConvention: { type: 'string' },
      declarationMap: { type: 'boolean', default: true },
      sassLoadPaths: { type: 'string', multiple: true },
      lessIncludePaths: { type: 'string', multiple: true },
      webpackResolveAlias: { type: 'string' },
      postcssConfig: { type: 'string' },
      arbitraryExtensions: { type: 'boolean', default: DEFAULT_ARBITRARY_EXTENSIONS },
      cache: { type: 'boolean', default: true },
      cacheStrategy: { type: 'string', default: 'content' },
      logLevel: { type: 'string', default: 'info' },
      outDir: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
    allowPositionals: true,
    allowNegative: true,
  });

  if (values.help) {
    // oxlint-disable-next-line no-console
    console.log(HELP_TEXT);
    // oxlint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }

  if (values.version) {
    // oxlint-disable-next-line no-console
    console.log(pkgJson.version);
    // oxlint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }

  if (positionals.length !== 1) throw new Error('Only one pattern is allowed.');

  const validLocalsConventions = ['camelCase', 'camelCaseOnly', 'dashes', 'dashesOnly'];
  if (values.localsConvention !== undefined && !validLocalsConventions.includes(values.localsConvention)) {
    throw new Error(`--localsConvention must be one of: ${validLocalsConventions.join(', ')}`);
  }

  const validCacheStrategies = ['content', 'metadata'];
  if (!validCacheStrategies.includes(values.cacheStrategy)) {
    throw new Error(`--cacheStrategy must be one of: ${validCacheStrategies.join(', ')}`);
  }

  const validLogLevels = ['debug', 'info', 'silent'];
  if (!validLogLevels.includes(values.logLevel)) {
    throw new Error(`--logLevel must be one of: ${validLogLevels.join(', ')}`);
  }

  let webpackResolveAlias: Record<string, string> | undefined;
  if (values.webpackResolveAlias) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(values.webpackResolveAlias);
    } catch {
      throw new Error('--webpackResolveAlias must be a valid JSON string.');
    }
    if (typeof parsed !== 'object' || parsed === null) throw new Error('--webpackResolveAlias must be an object');
    if (!Object.keys(parsed).every((key) => typeof key === 'string'))
      throw new Error('--webpackResolveAlias must be an object of string keys');
    if (!Object.values(parsed).every((value) => typeof value === 'string'))
      throw new Error('--webpackResolveAlias must be an object of string values');
    webpackResolveAlias = parsed as Record<string, string>;
  }

  return {
    pattern: positionals[0]!,
    watch: values.watch,
    localsConvention: values.localsConvention as RunnerOptions['localsConvention'],
    declarationMap: values.declarationMap,
    sassLoadPaths: values.sassLoadPaths,
    lessIncludePaths: values.lessIncludePaths,
    webpackResolveAlias,
    postcssConfig: values.postcssConfig,
    arbitraryExtensions: values.arbitraryExtensions,
    cache: values.cache,
    cacheStrategy: values.cacheStrategy as RunnerOptions['cacheStrategy'],
    logLevel: values.logLevel as RunnerOptions['logLevel'],
    outDir: values.outDir,
  };
}
