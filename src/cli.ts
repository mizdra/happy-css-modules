#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as yargs from 'yargs';
import { run } from './run';

const pkgJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

const yarg = yargs
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
  .version(pkgJson.version);

export async function main(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const argv = await yarg.argv;

  if (argv.h) {
    yarg.showHelp();
    return;
  }

  // TODO: support multiple patterns
  const patterns: string[] = argv._.map((pattern) => pattern.toString());
  if (patterns.length !== 1) {
    yarg.showHelp();
    return;
  }

  await run(patterns[0], {
    outDir: argv.o,
    watch: argv.w,
    camelCase: argv.c,
    namedExport: argv.e,
    silent: argv.s,
  });
}
