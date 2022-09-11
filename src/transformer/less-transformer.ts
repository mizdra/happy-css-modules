import type { Transformer } from '../index.js';
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public override supports(filename: string): boolean {
      return true;
    }
    public override async loadFile(
      filename: string,
      currentDirectory: string,
      options: Less.LoadFileOptions,
      environment: Less.Environment,
    ): Promise<Less.FileLoadResult> {
      const resolved = await this.options.resolver(filename, { request: currentDirectory });
      return super.loadFile(resolved, currentDirectory, options, environment);
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
