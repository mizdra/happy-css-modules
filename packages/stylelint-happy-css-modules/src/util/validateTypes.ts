/**
 * Checks if the value is a boolean or a Boolean object.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean' || value instanceof Boolean;
}

export type Option = {
  tsConfigFilePath: string;
};
export function isOption(value: unknown): value is Option {
  return typeof value === 'object' && value !== null && 'tsConfigFilePath' in value;
}
