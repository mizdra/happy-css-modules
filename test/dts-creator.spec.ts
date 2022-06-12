'use strict';

import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import { DtsCreator } from '../src/dts-creator';

describe('DtsCreator', () => {
  const creator = new DtsCreator();

  describe('#create', () => {
    it('returns DtsContent instance simple css', async () => {
      const content = await creator.create('test/testStyle.css');
      assert.equal(content.contents.length, 1);
      assert.equal(content.contents[0], 'readonly "myClass": string;');
    });
    it('rejects an error with invalid CSS', async () => {
      await creator
        .create('test/errorCss.css')
        .then(() => {
          assert.fail();
        })
        .catch((err) => {
          assert.equal(err.name, 'CssSyntaxError');
        });
    });
    it('returns DtsContent instance from composing css', async () => {
      const content = await creator.create('test/composer.css');
      assert.equal(content.contents.length, 1);
      assert.equal(content.contents[0], 'readonly "root": string;');
    });
    it('returns DtsContent instance from composing css whose has invalid import/composes', async () => {
      const content = await creator.create('test/invalidComposer.scss');
      assert.equal(content.contents.length, 1);
      assert.equal(content.contents[0], 'readonly "myClass": string;');
    });
    it('returns DtsContent instance from the pair of path and contents', async () => {
      const content = await creator.create('test/somePath', async () => Promise.resolve(`.myClass { color: red }`));
      assert.equal(content.contents.length, 1);
      assert.equal(content.contents[0], 'readonly "myClass": string;');
    });
    it('returns DtsContent instance combined css', async () => {
      const content = await creator.create('test/combined/combined.css');
      assert.equal(content.contents.length, 3);
      assert.equal(content.contents[0], 'readonly "block": string;');
      assert.equal(content.contents[1], 'readonly "myClass": string;');
      assert.equal(content.contents[2], 'readonly "box": string;');
    });
  });

  describe('#modify path', () => {
    it('can be set outDir', async () => {
      const content = await new DtsCreator({ searchDir: 'test', outDir: 'dist' }).create(
        path.normalize('test/testStyle.css'),
      );
      assert.equal(path.relative(process.cwd(), content.outputFilePath), path.normalize('dist/testStyle.css.d.ts'));
    });
  });
});

describe('DtsContent', () => {
  describe('#tokens', () => {
    it('returns original tokens', async () => {
      const content = await new DtsCreator().create('test/testStyle.css');
      assert.deepStrictEqual(content.tokens[0], {
        name: 'myClass',
        originalPositions: [
          {
            column: 0,
            filePath: '/Users/mizdra/src/github.com/mizdra/checkable-css-modules/test/testStyle.css',
            line: 1,
          },
        ],
      });
    });
  });

  describe('#inputFilePath', () => {
    it('returns original CSS file name', async () => {
      const content = await new DtsCreator().create(path.normalize('test/testStyle.css'));
      assert.equal(path.relative(process.cwd(), content.inputFilePath), path.normalize('test/testStyle.css'));
    });
  });

  describe('#outputFilePath', () => {
    it('adds d.ts to the original filename', async () => {
      const content = await new DtsCreator().create(path.normalize('test/testStyle.css'));
      assert.equal(path.relative(process.cwd(), content.outputFilePath), path.normalize('test/testStyle.css.d.ts'));
    });

    it('can drop the original extension when asked', async () => {
      const content = await new DtsCreator({ dropExtension: true }).create(path.normalize('test/testStyle.css'));
      assert.equal(path.relative(process.cwd(), content.outputFilePath), path.normalize('test/testStyle.d.ts'));
    });
  });

  describe('#formatted', () => {
    it('returns formatted .d.ts string', async () => {
      const content = await new DtsCreator().create('test/testStyle.css');
      assert.equal(
        content.formatted,
        `\
declare const styles: {
  readonly "myClass": string;
};
export = styles;

`,
      );
    });

    it('returns named exports formatted .d.ts string', async () => {
      const content = await new DtsCreator({ namedExports: true }).create('test/testStyle.css');
      assert.equal(
        content.formatted,
        `\
export const __esModule: true;
export const myClass: string;

`,
      );
    });

    it('returns camelcase names when using named exports as formatted .d.ts string', async () => {
      const content = await new DtsCreator({ namedExports: true }).create('test/kebabedUpperCase.css');
      assert.equal(
        content.formatted,
        `\
export const __esModule: true;
export const myClass: string;

`,
      );
    });

    it('returns empty object exportion when the result list has no items', async () => {
      const content = await new DtsCreator().create('test/empty.css');
      assert.equal(content.formatted, '');
    });

    describe('#camelCase option', () => {
      it('camelCase == true: returns camelized tokens for lowercase classes', async () => {
        const content = await new DtsCreator({ camelCase: true }).create('test/kebabed.css');
        assert.equal(
          content.formatted,
          `\
declare const styles: {
  readonly "myClass": string;
};
export = styles;

`,
        );
      });

      it('camelCase == true: returns camelized tokens for uppercase classes ', async () => {
        const content = await new DtsCreator({ camelCase: true }).create('test/kebabedUpperCase.css');
        assert.equal(
          content.formatted,
          `\
declare const styles: {
  readonly "myClass": string;
};
export = styles;

`,
        );
      });

      it('camelCase == "dashes": returns camelized tokens for dashes only', async () => {
        const content = await new DtsCreator({ camelCase: 'dashes' }).create('test/kebabedUpperCase.css');
        assert.equal(
          content.formatted,
          `\
declare const styles: {
  readonly "MyClass": string;
};
export = styles;

`,
        );
      });
    });
  });

  describe('#writeFile', () => {
    it('accepts a postprocessor function', async () => {
      const content = await new DtsCreator().create('test/testStyle.css').then(async (content) => {
        return content.writeFile(
          (formatted) => `// this banner was added to the .d.ts file automatically.\n${formatted}`,
        );
      });
    });

    it('writes a file', async () => {
      const content = await new DtsCreator().create('test/testStyle.css').then(async (content) => {
        return content.writeFile();
      });
    });
  });
});
