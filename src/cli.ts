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
    .parserConfiguration({
      // workaround for https://github.com/yargs/yargs/issues/1318
      'duplicate-arguments-array': false,
    })
    .scriptName('etcm')
    .usage('Create .d.ts and .d.ts.map from CSS modules *.css files.\n\n$0 [options] <glob>')
    .example("$0 'src/**/*.module.css'", 'Generate .d.ts and .d.ts.map.')
    .example("$0 'src/**/*.module.{css,scss,less}'", 'Also generate files for sass and less.')
    .example("$0 'src/**/*.module.css' --watch", 'Watch for changes and generate .d.ts and .d.ts.map.')
    .example("$0 'src/**/*.module.css' --declarationMap=false", 'Generate .d.ts only.')
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
      return true;
    })
    .parseSync();
  const patterns: string[] = parsedArgv._.map((pattern) => pattern.toString());
  return {
    pattern: patterns[0],
    outDir: parsedArgv.outDir,
    watch: parsedArgv.watch,
    localsConvention: parsedArgv.localsConvention,
    declarationMap: parsedArgv.declarationMap,
    silent: parsedArgv.silent,
  };
}
