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
  // TODO: Change default value for options.
  const parsedArgv = yargs(hideBin(argv))
    .parserConfiguration({
      // workaround for https://github.com/yargs/yargs/issues/1318
      'duplicate-arguments-array': false,
    })
    .usage('Create .css.d.ts from CSS modules *.css files.\nUsage: $0 [options] [file|dir|glob]')
    .example('$0 src/styles', '')
    .example('$0 src -o dist', '')
    .example("$0 'styles/**/*.icss' -w", '')
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
    .option('namedExport', {
      type: 'boolean',
      default: false,
      describe: 'Use named exports as opposed to default exports to enable tree shaking',
    })
    .option('declarationMap', {
      type: 'boolean',
      default: true,
      describe: 'Create sourcemaps for d.ts files',
    })
    .option('silent', {
      type: 'boolean',
      default: false,
      describe: 'Silent output. Do not show "files written" messages',
    })
    .alias('h', 'help')
    .version(pkgJson.version)
    .check((argv) => {
      const patterns = argv._;
      // TODO: support multiple patterns
      if (patterns.length !== 1) throw new Error('Only one pattern is allowed.');
      return true;
    })
    .parseSync();
  const patterns: string[] = parsedArgv._.map((pattern) => pattern.toString());
  return {
    pattern: patterns[0],
    outDir: parsedArgv.outDir,
    watch: parsedArgv.watch,
    localsConvention: parsedArgv.localsConvention,
    namedExport: parsedArgv.namedExport,
    declarationMap: parsedArgv.declarationMap,
    silent: parsedArgv.silent,
  };
}
