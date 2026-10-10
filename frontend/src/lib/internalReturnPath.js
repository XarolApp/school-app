/** Keep auth return destinations inside this app, including in native link navigation. */
export function internalReturnPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  // Browsers treat backslashes as authority separators and strip URL controls.
  // eslint-disable-next-line no-control-regex -- Reject controls stripped by URL parsing.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

/** Router state for a link into a school page: where "Zpět" should go back to, and its label. */
export function returnState(location, label) {
  return { from: location.pathname + location.search, fromLabel: label };
}
