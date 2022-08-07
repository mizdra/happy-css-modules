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
