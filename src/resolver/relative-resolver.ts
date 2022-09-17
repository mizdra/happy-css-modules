import fetch from 'node-fetch';
import { exists } from '../util.js';
import type { Resolver } from './index.js';

export const createRelativeResolver: () => Resolver =
  () =>
  async (specifier, { request }) => {
    let url: URL;
    // Check if it can be converted to a URL
    try {
      url = new URL(specifier, request);
    } catch (e) {
      return false;
    }

    // If the resource does not exist, it must fallback to another resolver.
    // Therefore, the existence of the resource is checked.
    if (url.protocol === 'file:') {
      // Check if the resource exists on the file system
      const isExists = await exists(url.pathname);
      if (isExists) return url.href;
    } else if (url.protocol === 'http:' || url.protocol === 'https:') {
      // Check if the resource exists on the web
      const res = await fetch(url.href, { method: 'HEAD' });
      if (res.ok) return url.href;
    }
    return false;
  };
