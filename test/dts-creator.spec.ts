import { readFile } from 'fs/promises';
import { DtsCreator } from '../src/dts-creator';

describe('DtsContent', () => {
  describe('#writeFile', () => {
    it('writes a file', async () => {
      const content = await new DtsCreator().create('test/testStyle.css');
      await content.emitGeneratedFiles();
      expect(await readFile('test/testStyle.css.d.ts', 'utf8')).toMatchInlineSnapshot(`
        "declare const styles: {
          readonly \\"myClass\\": string;
        };
        export = styles;
        "
      `);
    });
  });
});
