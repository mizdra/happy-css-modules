import { DtsCreator } from '../src/dts-creator';

describe('DtsContent', () => {
  describe('#writeFile', () => {
    it('writes a file', async () => {
      await new DtsCreator().create('test/testStyle.css').then(async (content) => {
        return content.writeFile();
      });
    });
  });
});
