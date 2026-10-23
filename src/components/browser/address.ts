/**
 * Addresses as a browser reads them: what the reader types into the address
 * bar, and whether two addresses lead to the same page.
 */

/** What an input means as an address: a path stays on the site on screen; a bare host is https. */
export const parseAddress = (input: string, current: string): URL | null => {
  const text = input.trim();
  if (text === '') return null;
  try {
    if (text.startsWith('/')) return new URL(text, current);
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
};

/** Where an address points, the query and the fragment aside. */
export const addressKey = (url: URL): string => `${url.origin}${url.pathname.replace(/\/+$/, '')}`;

/** Whether two addresses lead to the same page. */
export const sameAddress = (a: string, b: string, current: string): boolean => {
  const left = parseAddress(a, current);
  const right = parseAddress(b, current);
  return left !== null && right !== null && addressKey(left) === addressKey(right);
};

/** The address an input that leads nowhere is shown as on the unreachable page. */
export const typedAddress = (input: string, current: string): string => {
  const text = input.trim();
  if (text.startsWith('/')) return parseAddress(text, current)?.href ?? text;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
};

/** The host an address shows as a tab title or a shortcut. */
export const hostOf = (url: string): string => {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
};
