import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { DEFAULT_ARBITRARY_EXTENSIONS } from './config.js';
import { type RunnerOptions } from './runner.js';
import { getPackageJson } from './util.js';

/**
 * Parse command line arguments.
 * @returns Runner options.
 */
export function parseArgv(argv: string[]): RunnerOptions {
  const pkgJson = getPackageJson();
  const parsedArgv = yargs(hideBin(argv))
    .wrap(Math.min(140, process.stdout.columns))
    .scriptName('hcm')
    .usage('Generate .d.ts and .d.ts.map for CSS modules.\n\n$0 [options] <glob>')
    .example("$0 'src/**/*.module.css'", 'Generate .d.ts and .d.ts.map.')
    .example("$0 'src/**/*.module.{css,scss,less}'", 'Also generate files for sass and less.')
    .example("$0 'src/**/*.module.css' --watch", 'Watch for changes and generate .d.ts and .d.ts.map.')
    .example("$0 'src/**/*.module.css' --declarationMap=false", 'Generate .d.ts only.')
    .example("$0 'src/**/*.module.css' --sassLoadPaths=src/style", "Run with sass's `--load-path`.")
    .example("$0 'src/**/*.module.css' --lessIncludePaths=src/style", "Run with less's `--include-path`.")
    .example('$0 \'src/**/*.module.css\' --webpackResolveAlias=\'{"@": "src"}\'', "Run with webpack's `resolve.alias`.")
    .example("$0 'src/**/*.module.css' --cache=false", 'Disable cache.')
    .detectLocale(false)
    .option('watch', {
      type: 'boolean',
      alias: 'w',
      default: false,
      describe: "Watch input directory's css files or pattern",
    })
    .option('localsConvention', {
      choices: ['camelCase', 'camelCaseOnly', 'dashes', 'dashesOnly'] as const,
      describe: 'Style of exported class names.',
    })
    .option('declarationMap', {
      type: 'boolean',
      default: true,
      describe: 'Create sourcemaps for d.ts files',
    })
    .option('sassLoadPaths', {
      array: true,
      nargs: 1,
      describe: "The option compatible with sass's `--load-path`.",
    })
    .option('lessIncludePaths', {
      array: true,
      nargs: 1,
      describe: "The option compatible with less's `--include-path`.",
    })
    .option('webpackResolveAlias', {
      string: true,
      describe: "The option compatible with webpack's `resolve.alias`.",
    })
    // TODO: Support --noPostcssConfig option.
    .option('postcssConfig', {
      string: true,
      describe: "The option compatible with postcss's `--config`.",
    })
    .option('arbitraryExtensions', {
      type: 'boolean',
      default: DEFAULT_ARBITRARY_EXTENSIONS,
      describe: 'Generate `.d.css.ts` instead of `.css.d.ts`.',
    })
    .option('cache', {
      type: 'boolean',
      default: true,
      describe: 'Only generate .d.ts and .d.ts.map for changed files.',
    })
    .option('cacheStrategy', {
      choices: ['content', 'metadata'] as const,
      // NOTE: This is a workaround for `parsedArgv.cacheStrategy` type breaks.
      default: 'content' as RunnerOptions['cacheStrategy'],
      describe: 'Strategy for the cache to use for detecting changed files.',
    })
    .option('logLevel', {
      choices: ['debug', 'info', 'silent'] as const,
      default: 'info' as RunnerOptions['logLevel'],
      describe: 'What level of logs to report.',
    })
    .alias('h', 'help')
    .alias('v', 'version')
    .version(pkgJson.version)
    .check((argv) => {
      const patterns = argv._;
      // TODO: support multiple patterns
      if (patterns.length !== 1) throw new Error('Only one pattern is allowed.');
      if (argv.webpackResolveAlias) {
        let parsedWebpackResolveAlias: unknown;
        try {
          parsedWebpackResolveAlias = JSON.parse(argv.webpackResolveAlias);
        } catch (e) {
          throw new Error('--webpackResolveAlias must be a valid JSON string.');
        }
        if (typeof parsedWebpackResolveAlias !== 'object' || parsedWebpackResolveAlias === null)
          throw new Error('--webpackResolveAlias must be an object');
        if (!Object.keys(parsedWebpackResolveAlias).every((key) => typeof key === 'string'))
          throw new Error('--webpackResolveAlias must be an object of string keys');
        if (!Object.values(parsedWebpackResolveAlias).every((value) => typeof value === 'string'))
          throw new Error('--webpackResolveAlias must be an object of string values');
      }
      return true;
    })
    .parseSync();
  const patterns: string[] = parsedArgv._.map((pattern) => pattern.toString());
  return {
    pattern: patterns[0]!,
    watch: parsedArgv.watch,
    localsConvention: parsedArgv.localsConvention,
    declarationMap: parsedArgv.declarationMap,
    sassLoadPaths: parsedArgv.sassLoadPaths?.map((item) => item.toString()),
    lessIncludePaths: parsedArgv.lessIncludePaths?.map((item) => item.toString()),
    webpackResolveAlias: parsedArgv.webpackResolveAlias ? JSON.parse(parsedArgv.webpackResolveAlias) : undefined,
    postcssConfig: parsedArgv.postcssConfig,
    arbitraryExtensions: parsedArgv.arbitraryExtensions,
    cache: parsedArgv.cache,
    cacheStrategy: parsedArgv.cacheStrategy,
    logLevel: parsedArgv.logLevel,
  };
}
