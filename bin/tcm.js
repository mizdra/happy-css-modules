#!/usr/bin/env node
// @ts-check

import { run, parseArgv } from '../dist/index.js';

run(parseArgv(process.argv)).catch(console.error);
