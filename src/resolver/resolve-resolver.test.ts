import dedent from 'dedent';
import { Loader } from '../loader/index.js';
import { createFixtures, getFixturePath } from '../test/util.js';
import { resolveResolver } from './resolve-resolver.js';

const loader = new Loader({ resolver: resolveResolver });

test('resolves specifier with resolve mechanism', async () => {
  createFixtures({
    '/test/1.css': dedent`
    @import '2.css';
    @import './3.css';
    @import 'dir/4.css';
    @import '../5.css';
    @import '${getFixturePath('/test/6.css')}';
    `,
    '/test/2.css': `.a {}`,
    '/test/3.css': `.a {}`,
    '/test/dir/4.css': `.a {}`,
    '/5.css': `.a {}`,
    '/test/6.css': `.a {}`,
  });
  const result = await loader.load(getFixturePath('/test/1.css'));
  expect(result.dependencies).toStrictEqual([
    getFixturePath('/test/2.css'),
    getFixturePath('/test/3.css'),
    getFixturePath('/test/dir/4.css'),
    getFixturePath('/5.css'),
    getFixturePath('/test/6.css'),
  ]);
});
