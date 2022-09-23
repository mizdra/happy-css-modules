import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { type RunnerOptions } from './runner.js';

const pkgJson = JSON.parse(readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf-8'));

/**
 * Parse command line arguments.
 * @returns Runner options.
 */
export function parseArgv(argv: string[]): RunnerOptions {
  const parsedArgv = yargs(hideBin(argv))
    .wrap(Math.min(120, process.stdout.columns))
    .scriptName('hcm')
    .usage('Create .d.ts and .d.ts.map from CSS modules *.css files.\n\n$0 [options] <glob>')
    .example("$0 'src/**/*.module.css'", 'Generate .d.ts and .d.ts.map.')
    .example("$0 'src/**/*.module.{css,scss,less}'", 'Also generate files for sass and less.')
    .example("$0 'src/**/*.module.css' --watch", 'Watch for changes and generate .d.ts and .d.ts.map.')
    .example("$0 'src/**/*.module.css' --declarationMap=false", 'Generate .d.ts only.')
    .example("$0 'src/**/*.module.css' --sassLoadPaths=src/style", "Run with sass's `--load-path`.")
    .example("$0 'src/**/*.module.css' --lessIncludePaths=src/style", "Run with less's `--include-path`.")
    .example('$0 \'src/**/*.module.css\' --webpackResolveAlias=\'{"@": "src"}\'', "Run with webpack's `resolve.alias`.")
    .detectLocale(false)
    .option('outDir', {
      type: 'string',
      describe: 'Output directory',
    })
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
    .option('silent', {
      type: 'boolean',
      default: false,
      describe: 'Silent output. Do not show "files written" messages',
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
    outDir: parsedArgv.outDir,
    watch: parsedArgv.watch,
    localsConvention: parsedArgv.localsConvention,
    declarationMap: parsedArgv.declarationMap,
    sassLoadPaths: parsedArgv.sassLoadPaths?.map((item) => item.toString()),
    lessIncludePaths: parsedArgv.lessIncludePaths?.map((item) => item.toString()),
    webpackResolveAlias: parsedArgv.webpackResolveAlias ? JSON.parse(parsedArgv.webpackResolveAlias) : undefined,
    silent: parsedArgv.silent,
  };
}
