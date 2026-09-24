import { describe, expect, it } from 'vitest';

import { closestLang } from './lang';

describe('closestLang', () => {
  it('reads the element itself first, then its ancestors', () => {
    const outer = document.createElement('div');
    outer.lang = 'ja';
    const inner = document.createElement('span');
    outer.append(inner);
    expect(closestLang(inner)).toBe('ja');
    inner.lang = 'en-US';
    expect(closestLang(inner)).toBe('en-US');
  });

  it('crosses shadow roots to their host', () => {
    const host = document.createElement('div');
    host.setAttribute('lang', 'ja-JP');
    const root = host.attachShadow({ mode: 'open' });
    const child = document.createElement('p');
    root.append(child);
    expect(closestLang(child)).toBe('ja-JP');
  });

  it('returns null when nothing declares a language', () => {
    expect(closestLang(document.createElement('p'))).toBeNull();
  });
});
