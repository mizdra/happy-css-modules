import { isAbsolute } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import type { Transformer } from '../index.js';
import { fetchContent } from '../loader/util.js'; // FIXME: Move the definition location of fetchContent
import type { TransformerOptions } from './index.js';
import { handleImportError } from './index.js';

// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/consistent-type-imports
function createLessPluginResolver(Less: typeof import('less'), options: TransformerOptions): Less.Plugin {
  class ResolverFileManager extends Less.FileManager {
    options: TransformerOptions;
    constructor(options: TransformerOptions) {
      super();
      this.options = options;
    }
    public override supports(filename: string): boolean {
      return !this.options.isIgnoredSpecifier(filename);
    }
    public override async loadFile(
      filename: string,
      currentDirectory: string,
      options: Less.LoadFileOptions,
      environment: Less.Environment,
    ): Promise<Less.FileLoadResult> {
      const resolvedURL = await this.options.resolver(filename, {
        request: isAbsolute(currentDirectory) ? pathToFileURL(currentDirectory).href : currentDirectory,
      });
      if (resolvedURL.startsWith('file://')) {
        // Use the default loading logic whenever possible.
        return super.loadFile(fileURLToPath(resolvedURL), currentDirectory, options, environment);
      } else {
        // FileManager does not support loading file by http/https format.
        // So we read files without using FileManager.
        const content = await fetchContent(resolvedURL);
        return { filename: resolvedURL, contents: content };
      }
    }
  }

  class LessPluginResolver implements Less.Plugin {
    options: TransformerOptions;
    constructor(options: TransformerOptions) {
      this.options = options;
    }
    public install(less: LessStatic, pluginManager: Less.PluginManager): void {
      pluginManager.addFileManager(new ResolverFileManager(this.options));
    }
    public minVersion: [number, number, number] = [2, 1, 1];
  }

  return new LessPluginResolver(options);
}

export const createLessTransformer: () => Transformer = () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let less: typeof import('less');
  return async (source, options) => {
    less ??= (await import('less').catch(handleImportError('less'))).default;
    const result = await less.render(source, {
      filename: options.from,
      sourceMap: {},
      plugins: [createLessPluginResolver(less, options)],
      syncImport: false, // Don't use `Less.FileManager#loadFileSync`.
    });
    return { css: result.css, map: result.map, dependencies: result.imports };
  };
};
