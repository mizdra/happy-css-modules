#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as yargs from 'yargs';
import { run, RunnerOptions } from './runner';

const pkgJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

// TODO: Change default value for options.
const yargsInstance = yargs
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
    alias: 'o',
    describe: 'Output directory',
  })
  .option('watch', {
    type: 'boolean',
    alias: 'w',
    describe: "Watch input directory's css files or pattern",
  })
  .option('localsConvention', {
    choices: ['camelCase', 'camelCaseOnly', 'dashes', 'dashesOnly'] as const,
    describe: 'Style of exported class names.',
  })
  .option('namedExport', {
    type: 'boolean',
    alias: 'e',
    describe: 'Use named exports as opposed to default exports to enable tree shaking',
  })
  .option('declarationMap', {
    type: 'boolean',
    alias: 'dm',
    describe: 'Create sourcemaps for d.ts files',
  })
  .option('silent', {
    type: 'boolean',
    alias: 's',
    describe: 'Silent output. Do not show "files written" messages',
  })
  .alias('h', 'help')
  .version(pkgJson.version)
  .check((argv) => {
    const patterns = argv._;
    // TODO: support multiple patterns
    if (patterns.length !== 1) throw new Error('Only one pattern is allowed.');
    return true;
  });

/**
 * Parse command line arguments.
 * @returns Runner options.
 */
export function parseArgv(argv: string[]): RunnerOptions {
  const parsedArgv = yargsInstance.parseSync(argv.slice(2));
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

export async function main(): Promise<void> {
  await run(parseArgv(process.argv));
}
