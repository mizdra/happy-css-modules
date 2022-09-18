import { pathToFileURL } from 'url';
import { rest } from 'msw';
import { server } from '../test/msw.js';
import { createFixtures, getFixturePath, oneOf } from '../test/util.js';
import { createRelativeResolver } from './relative-resolver.js';

const relativeResolver = createRelativeResolver();

describe('resolves specifier with relative mechanism', () => {
  test('file://', async () => {
    const request = pathToFileURL(getFixturePath('/test/1.css')).href;
    createFixtures({
      '/test/2.css': `.a {}`,
      '/test/3.css': `.a {}`,
      '/test/dir/4.css': `.a {}`,
      '/5.css': `.a {}`,
      '/test/6.css': `.a {}`,
    });
    expect(await relativeResolver('2.css', { request })).toBe(pathToFileURL(getFixturePath('/test/2.css')).href);
    expect(await relativeResolver('./3.css', { request })).toBe(pathToFileURL(getFixturePath('/test/3.css')).href);
    expect(await relativeResolver('dir/4.css', { request })).toBe(
      pathToFileURL(getFixturePath('/test/dir/4.css')).href,
    );
    expect(await relativeResolver('../5.css', { request })).toBe(pathToFileURL(getFixturePath('/5.css')).href);
    expect(await relativeResolver(getFixturePath('/test/6.css'), { request })).toBe(
      pathToFileURL(getFixturePath('/test/6.css')).href,
    );
  });
  test('http(s)://', async () => {
    const protocol = oneOf(['http', 'https']);
    const request = `${protocol}://example.com/test/1.css`;

    server.use(rest.head(`${protocol}://example.com/test/2.css`, (_req, res, ctx) => res(ctx.text('.a {}'))));
    server.use(rest.head(`${protocol}://example.com/test/3.css`, (_req, res, ctx) => res(ctx.text('.a {}'))));
    server.use(rest.head(`${protocol}://example.com/test/dir/4.css`, (_req, res, ctx) => res(ctx.text('.a {}'))));
    server.use(rest.head(`${protocol}://example.com/5.css`, (_req, res, ctx) => res(ctx.text('.a {}'))));
    server.use(rest.head(`${protocol}://example.com/test/6.css`, (_req, res, ctx) => res(ctx.text('.a {}'))));

    expect(await relativeResolver('2.css', { request })).toBe(`${protocol}://example.com/test/2.css`);
    expect(await relativeResolver('./3.css', { request })).toBe(`${protocol}://example.com/test/3.css`);
    expect(await relativeResolver('dir/4.css', { request })).toBe(`${protocol}://example.com/test/dir/4.css`);
    expect(await relativeResolver('../5.css', { request })).toBe(`${protocol}://example.com/5.css`);
    expect(await relativeResolver('/test/6.css', { request })).toBe(`${protocol}://example.com/test/6.css`);
  });
});
