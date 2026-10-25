import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FRAMEWORK_VERSION } from './version';
import { startEntry } from './version-loader';

const visit = (search: string): void => {
  history.replaceState(null, '', `/page.html${search}`);
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('startEntry', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'devProcessKit');
    document.body.innerHTML = '<dpk-view-demo lang="ja"></dpk-view-demo>';
  });

  afterEach(() => {
    visit('');
    document.body.innerHTML = '';
  });

  it('runs the page itself when no other version is asked for', () => {
    for (const search of ['', `?dpk-version=${FRAMEWORK_VERSION}`, '?dpk-version=latest']) {
      visit(search);
      const register = vi.fn();
      const importModule = vi.fn(async () => undefined);
      startEntry({
        entry: 'views/demo.js',
        views: ['demo'],
        url: 'https://example.test/dist/views/demo.js',
        register,
        importModule,
      });
      expect(register).toHaveBeenCalledOnce();
      expect(importModule).not.toHaveBeenCalled();
    }
    expect(window).toHaveProperty('devProcessKit', {
      version: FRAMEWORK_VERSION,
      views: ['demo'],
      versionParam: 'dpk-version',
      entryUrl: 'https://example.test/dist/views/demo.js',
    });
  });

  it('hands the page to the same entry of the version asked for, and defines nothing itself', async () => {
    visit('?dpk-version=0.0.1');
    const register = vi.fn();
    const importModule = vi.fn(async () => {
      Object.assign(window, { devProcessKit: { version: '0.0.1', views: ['demo'], versionParam: 'dpk-version' } });
    });
    startEntry({
      entry: 'views/demo.js',
      views: ['demo'],
      url: 'https://example.test/dist/views/demo.js',
      register,
      importModule,
    });
    await settle();
    expect(importModule).toHaveBeenCalledWith('https://cdn.jsdelivr.net/npm/dev-process-kit@0.0.1/dist/views/demo.js');
    expect(register).not.toHaveBeenCalled();
    // That version renders its own select.
    expect(document.querySelector('select')).toBeNull();
  });

  it('gives a version without a select of its own one in the header slot', async () => {
    visit('?dpk-version=0.0.1');
    const importModule = vi.fn(async () => {
      Object.assign(window, { devProcessKit: { version: '0.0.1', views: ['demo'] } });
    });
    startEntry({
      entry: 'views/demo.js',
      views: ['demo'],
      url: 'https://example.test/dist/views/demo.js',
      register: vi.fn(),
      importModule,
    });
    startEntry({
      entry: 'components.js',
      views: [],
      url: 'https://example.test/dist/components.js',
      register: vi.fn(),
      importModule,
    });
    await settle();
    const selects = document.querySelectorAll('dpk-view-demo > select');
    expect(selects).toHaveLength(1);
    const select = selects[0];
    expect(select?.getAttribute('slot')).toBe('header');
    expect(select?.getAttribute('aria-label')).toContain('バージョン');
    expect([...(select?.querySelectorAll('option') ?? [])].map((option) => option.value)).toEqual(['', '0.0.1']);
  });

  it('runs the page itself when the version asked for cannot be loaded', async () => {
    visit('?dpk-version=0.0.1');
    const register = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    startEntry({
      entry: 'views/demo.js',
      views: ['demo'],
      url: 'https://example.test/dist/views/demo.js',
      register,
      importModule: async () => {
        throw new TypeError('Failed to fetch dynamically imported module');
      },
    });
    expect(register).not.toHaveBeenCalled();
    await settle();
    expect(register).toHaveBeenCalledOnce();
  });
});
