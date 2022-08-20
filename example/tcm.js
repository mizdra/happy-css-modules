#!/usr/bin/env -S node
// @ts-check

const { run } = require('../dist');
const less = require('less');
const sass = require('sass');

/** @type {import('../dist').Transformer} */
const transform = async (source, from) => {
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
  transform,
}).catch(console.error);
