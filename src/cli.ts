#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as yargs from 'yargs';
import { run, RunOptions } from './run';

const pkgJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

const argv = yargs
  .usage('Create .css.d.ts from CSS modules *.css files.\nUsage: $0 [options] [file|dir|glob]')
  .example('$0 src/styles', '')
  .example('$0 src -o dist', '')
  .example("$0 'styles/**/*.icss' -w", '')
  .detectLocale(false)
  .demand(['_'])
  .alias('o', 'outDir')
  .describe('o', 'Output directory')
  .string('o')
  .alias('w', 'watch')
  .describe('w', "Watch input directory's css files or pattern")
  .boolean('w')
  .alias('c', 'camelCase')
  .describe('c', 'Convert CSS class tokens to camelcase')
  .boolean('c')
  .alias('e', 'namedExport')
  .describe('e', 'Use named exports as opposed to default exports to enable tree shaking.')
  .boolean('e')
  .alias('dm', 'declarationMap')
  .describe('dm', 'Create sourcemaps for d.ts files')
  .boolean('d')
  .alias('s', 'silent')
  .describe('s', 'Silent output. Do not show "files written" messages')
  .boolean('s')
  .alias('h', 'help')
  .help('h')
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
export function parseArgv(): RunOptions {
  const parsedArgv = argv.parseSync();
  const patterns: string[] = parsedArgv._.map((pattern) => pattern.toString());
  return {
    pattern: patterns[0],
    outDir: parsedArgv.o,
    watch: parsedArgv.w,
    camelCase: parsedArgv.c,
    namedExport: parsedArgv.e,
    silent: parsedArgv.s,
  };
}

export async function main(): Promise<void> {
  await run(parseArgv());
}
