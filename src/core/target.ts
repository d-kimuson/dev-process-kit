import type { ActionTarget } from './types';

/** `step:google-auth` — the canonical string form used in DOM attributes. */
export const targetRef = (target: ActionTarget): string => {
  return `${target.type}:${target.id}`;
};

export const parseTargetRef = (ref: string): ActionTarget => {
  const index = ref.indexOf(':');
  if (index <= 0) return { type: 'unknown', id: ref };
  return { type: ref.slice(0, index), id: ref.slice(index + 1) };
};

export const toTarget = (value: string | ActionTarget, fallbackType: string): ActionTarget => {
  if (typeof value === 'string') return parseTargetRef(value.includes(':') ? value : `${fallbackType}:${value}`);
  return { type: value.type, id: value.id };
};

export const sameTarget = (a: ActionTarget, b: ActionTarget): boolean => {
  return a.type === b.type && a.id === b.id;
};

/** Stable-ish ids for entities created from the UI (drafts keep them afterwards). */
export const slugify = (input: string): string => {
  const slug = input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug.length > 0 ? slug : 'item';
};

export const createEntityId = (name: string, taken: Iterable<string>): string => {
  const base = slugify(name);
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
};

/** Identity for draft actions themselves (not for artifact entities). */
export const createActionId = (): string => {
  const globalCrypto = globalThis.crypto as Crypto | undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
