#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as yargs from 'yargs';
import { run, RunOptions } from './run';

const pkgJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

const yargsInstance = yargs
  .usage('Create .css.d.ts from CSS modules *.css files.\nUsage: $0 [options] [file|dir|glob]')
  .example('$0 src/styles', '')
  .example('$0 src -o dist', '')
  .example("$0 'styles/**/*.icss' -w", '')
  .detectLocale(false)
  .demand(['_'])
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
  .option('camelCase', {
    type: 'boolean',
    alias: 'c',
    describe: 'Convert CSS class tokens to camelcase',
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
export function parseArgv(argv: string[]): RunOptions {
  const parsedArgv = yargsInstance.parseSync(argv.slice(2));
  const patterns: string[] = parsedArgv._.map((pattern) => pattern.toString());
  return {
    pattern: patterns[0],
    outDir: parsedArgv.outDir,
    watch: parsedArgv.watch,
    camelCase: parsedArgv.camelCase,
    namedExport: parsedArgv.namedExport,
    silent: parsedArgv.silent,
  };
}

export async function main(): Promise<void> {
  await run(parseArgv(process.argv));
}
