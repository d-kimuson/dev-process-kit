import type { Navigation, NavigationPatch } from './types';

export const EMPTY_NAVIGATION: Navigation = Object.freeze({});

/** `#activity=signup&step=google-auth` -> `{ activity: 'signup', step: 'google-auth' }` */
export const parseHash = (hash: string): Navigation => {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (raw.length === 0) return EMPTY_NAVIGATION;
  const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  const result: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key.length > 0 && value.length > 0) result[key] = value;
  }
  return result;
};

export const formatHash = (navigation: Navigation): string => {
  const params = new URLSearchParams();
  for (const key of Object.keys(navigation).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const value = navigation[key];
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const serialized = params.toString();
  return serialized.length === 0 ? '' : `#${serialized}`;
};

export const patchNavigation = (navigation: Navigation, patch: NavigationPatch): Navigation => {
  const next: Record<string, string> = { ...navigation };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined || value === '') delete next[key];
    else next[key] = value;
  }
  return next;
};

export const navigateHash = (navigation: Navigation): string => {
  return `${location.pathname}${location.search}${formatHash(navigation)}`;
};
