#!/usr/bin/env node
// @ts-check

import { run, parseArgv } from '../dist/index.js';

run(parseArgv(process.argv)).catch((e) => {
  console.error(e);
  process.exit(1);
});
