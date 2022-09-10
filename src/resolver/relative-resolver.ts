import { dirname, isAbsolute, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { exists } from '../util.js';
import type { Resolver } from './index.js';

export const createRelativeResolver: () => Resolver = () => async (specifier, options) => {
  // ignore `http(s)://`
  // TODO: If requested by the user, we support relative path resolution under the http(s) protocol.
  if (!options.request.startsWith('file://')) return false;
  if (isAbsolute(specifier)) return false;

  const resolvedPath = resolve(dirname(fileURLToPath(options.request)), specifier);
  const isExists = await exists(resolvedPath);
  if (isExists) {
    const resolvedFileURL = pathToFileURL(resolvedPath).href;
    return resolvedFileURL;
  } else {
    return false;
  }
};
