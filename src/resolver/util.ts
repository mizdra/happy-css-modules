/**
 * Check whether a specifier is an absolute URL
 */
export function isAbsoluteURL(specifier: string): boolean {
  let url: URL;
  try {
    // Check if the URL is valid
    url = new URL(specifier);
  } catch (e) {
    // If the URL is invalid, return false.
    return false;
  }
  // Support file://, http://, https:// URLs only.
  return url.protocol === 'file:' || url.protocol === 'http:' || url.protocol === 'https:';
}
