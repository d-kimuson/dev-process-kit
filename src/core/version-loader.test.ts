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
    document.body.innerHTML = '<dpk-template-demo lang="ja"></dpk-template-demo>';
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
      startEntry({ entry: 'templates/demo.js', templates: ['demo'], register, importModule });
      expect(register).toHaveBeenCalledOnce();
      expect(importModule).not.toHaveBeenCalled();
    }
    expect(window).toHaveProperty('devProcessKit', {
      version: FRAMEWORK_VERSION,
      templates: ['demo'],
      versionParam: 'dpk-version',
    });
  });

  it('hands the page to the same entry of the version asked for, and defines nothing itself', async () => {
    visit('?dpk-version=0.0.1');
    const register = vi.fn();
    const importModule = vi.fn(async () => {
      Object.assign(window, { devProcessKit: { version: '0.0.1', templates: ['demo'], versionParam: 'dpk-version' } });
    });
    startEntry({ entry: 'templates/demo.js', templates: ['demo'], register, importModule });
    await settle();
    expect(importModule).toHaveBeenCalledWith(
      'https://cdn.jsdelivr.net/npm/dev-process-kit@0.0.1/dist/templates/demo.js',
    );
    expect(register).not.toHaveBeenCalled();
    // That version renders its own select.
    expect(document.querySelector('select')).toBeNull();
  });

  it('gives a version without a select of its own one in the header slot', async () => {
    visit('?dpk-version=0.0.1');
    const importModule = vi.fn(async () => {
      Object.assign(window, { devProcessKit: { version: '0.0.1', templates: ['demo'] } });
    });
    startEntry({ entry: 'templates/demo.js', templates: ['demo'], register: vi.fn(), importModule });
    startEntry({ entry: 'components.js', templates: [], register: vi.fn(), importModule });
    await settle();
    const selects = document.querySelectorAll('dpk-template-demo > select');
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
      entry: 'templates/demo.js',
      templates: ['demo'],
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
