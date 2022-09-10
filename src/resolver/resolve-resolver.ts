import { dirname, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { exists } from '../util.js';
import type { Resolver } from './index.js';

export const createResolveResolver: () => Resolver = () => async (specifier, options) => {
  // ignore `http(s)://`
  if (!options.request.startsWith('file://')) return false;

  const resolvedPath = resolve(dirname(fileURLToPath(options.request)), specifier);
  const isExists = await exists(resolvedPath);
  if (isExists) {
    const resolvedFileURL = pathToFileURL(resolvedPath).href;
    return resolvedFileURL;
  } else {
    return false;
  }
};
