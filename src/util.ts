import { constants } from 'fs';
import { access, stat, readFile } from 'fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'path';
import minimatch from 'minimatch';
import fetch from 'node-fetch';

const REVISION_HEADER_NAMES = ['etag', 'last-modified'];

/**
 * The SystemError type of Node.js.
 * @see https://nodejs.org/api/errors.html#class-systemerror
 */
export interface SystemError {
  code: string;
}

export function isSystemError(value: unknown): value is SystemError {
  return (
    isObject(value) &&
    hasProp(value, 'constructor') &&
    isObject(value.constructor) &&
    hasProp(value.constructor, 'name') &&
    value.constructor.name === 'Error' &&
    hasProp(value, 'code') &&
    typeof value.code === 'string'
  );
}

export function isObject(value: unknown): value is object {
  return (typeof value === 'object' || typeof value === 'function') && value !== null;
}

export function hasProp<T extends string>(obj: object, prop: T): obj is { [key in T]: unknown } {
  return prop in obj;
}

export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function uniqueBy<T, U>(arr: T[], fn: (el: T) => U): T[] {
  const result: T[] = [];
  const keys = new Set<U>();
  for (const el of arr) {
    const key = fn(el);
    if (!keys.has(key)) {
      keys.add(key);
      result.push(el);
    }
  }
  return result;
}

export function sleepSync(ms: number) {
  const start = Date.now();
  // eslint-disable-next-line no-empty
  while (Date.now() - start < ms) {}
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
}

export function isMatchByGlob(filePath: string, pattern: string, options: { cwd: string }): boolean {
  return minimatch(filePath, join(options.cwd, pattern));
}

export async function fetchRevision(url: string): Promise<string> {
  // TODO: `--cache-strategy` option will allow users to switch between `content` and `metadata` modes.
  // TODO: Implement a cache algorithm compliant with RFC 9111 and RFC 5861 for performance.

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
  // TODO: Implement a cache algorithm compliant with RFC 9111 and RFC 5861 for performance.

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
