#!/usr/bin/env -S node
// @ts-check

import { run } from '../dist/index.js';
import less from 'less';
import sass from 'sass';

/** @type {import('../dist').Transformer} */
const transformer = async (source, from) => {
  if (from.endsWith('.scss')) {
    const result = sass.compile(from, { sourceMap: true });
    return { css: result.css, map: /** @type {object} */ (result.sourceMap), dependencies: result.loadedUrls };
  } else if (from.endsWith('.less')) {
    const result = await less.render(source, {
      filename: from,
      sourceMap: {},
    });
    return { css: result.css, map: result.map, dependencies: result.imports };
  }
  return false;
};

run({
  pattern: '**/*.{css,scss,less}',
  watch: process.argv.includes('--watch'),
  declarationMap: true,
  transformer,
}).catch(console.error);
