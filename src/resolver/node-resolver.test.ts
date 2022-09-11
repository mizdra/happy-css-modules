import dedent from 'dedent';
import { Loader } from '../loader/index.js';
import { createFixtures, getFixturePath } from '../test/util.js';
import { createNodeResolver } from './node-resolver.js';

const loader = new Loader({ resolver: createNodeResolver() });

test('resolves specifier with node mechanism', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @import './2.css';
    @import './dir/3.css';
    @import '../4.css';
    @import '${getFixturePath('/test/5.css')}';
    @import 'package-1/6.css';
    @import '#subpath-1';
    /* FIXME: For some reason, it does not pass... */
    /* @import '#subpath-2/8.css'; */
    `,
    '/test/2.css': `.a {}`,
    '/test/dir/3.css': `.a {}`,
    '/4.css': `.a {}`,
    '/test/5.css': `.a {}`,
    '/node_modules/package-1/6.css': `.a {}`,
    '/package.json': `{ "imports": { "#subpath-1": "./test/7.css", "#subpath-2/*.css": "./test/*.css" } }`,
    '/test/7.css': `.a {}`,
    '/test/8.css': `.a {}`,
  });
  const result = await loader.load(getFixturePath('/test/1.css'));
  expect(result.dependencies).toStrictEqual([
    getFixturePath('/test/2.css'),
    getFixturePath('/test/dir/3.css'),
    getFixturePath('/4.css'),
    getFixturePath('/test/5.css'),
    getFixturePath('/node_modules/package-1/6.css'),
    getFixturePath('/test/7.css'),
    // getFixturePath('/test/8.css'),
  ]);
});
