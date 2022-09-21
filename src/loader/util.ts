import { stat, readFile } from 'fs/promises';
import { createHash } from 'node:crypto';
import fetch from 'node-fetch';

// TODO: `--cache-strategy` option will allow users to switch between `content` and `metadata` modes.
// TODO: Implement a cache algorithm compliant with RFC 9111 and RFC 5861 for performance.

const REVISION_HEADER_NAMES = ['etag', 'last-modified'];

export async function fetchRevision(url: string): Promise<string> {
  const { protocol, href, pathname } = new URL(url);
  if (protocol === 'http:' || protocol === 'https:') {
    const res = await fetch(href, { method: 'GET' });
    if (!res.ok) throw new Error(`Failed to fetch ${href}: ${res.status} ${res.statusText}`);
    for (const headerName of REVISION_HEADER_NAMES) {
      const headerValue = res.headers.get(headerName);
      if (headerValue) return `${headerName}:${headerValue}`;
    }
    const content = await res.text();
    const contentHash = createHash('sha256').update(content).digest('hex');
    return `content-hash:${contentHash}`;
  } else if (protocol === 'file:') {
    const mtime = (await stat(pathname)).mtime.getTime();
    return `mtime:${mtime}`;
  } else {
    throw new Error(`Unsupported protocol: ${href}`);
  }
}

export async function fetchContent(url: string): Promise<string> {
  const { protocol, href, pathname } = new URL(url);
  if (protocol === 'http:' || protocol === 'https:') {
    return fetch(href).then(async (response) => response.text());
  } else if (protocol === 'file:') {
    return readFile(pathname, 'utf8');
  } else {
    throw new Error(`Unsupported protocol: ${url}`);
  }
}

export function isURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// export function isSupportedProtocol(url: string): boolean {
//   const { protocol } = new URL(url);
//   return protocol === 'file:' || protocol === 'http:' || protocol === 'https:';
// }
