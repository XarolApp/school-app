/** Keep auth return destinations inside this app, including in native link navigation. */
export function internalReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  // Browsers treat backslashes as authority separators and strip URL controls.
  // eslint-disable-next-line no-control-regex -- Reject controls stripped by URL parsing.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}
