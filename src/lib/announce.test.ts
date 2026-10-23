import { afterEach, describe, expect, it } from 'vitest';

import { announce, announcedEntryUrl } from './announce';

afterEach(() => {
  Reflect.deleteProperty(window, 'devProcessKit');
});

describe('announce', () => {
  it('announces the first entry as-is', () => {
    announce('0.3.0', ['prototype'], 'dpk-version', 'https://host/templates/prototype.js');

    expect(announcedEntryUrl()).toBe('https://host/templates/prototype.js');
    expect((window as unknown as { devProcessKit: { templates: readonly string[] } }).devProcessKit.templates).toEqual([
      'prototype',
    ]);
  });

  it("keeps a template entry's url when a later, template-less entry announces (components.js loaded alongside a template)", () => {
    announce('0.3.0', ['prototype'], 'dpk-version', 'https://host/templates/prototype.js');
    announce('0.3.0', [], 'dpk-version', 'https://host/components.js');

    // Still the template entry's own URL: a sibling template entry resolves against this one, not components.js's.
    expect(announcedEntryUrl()).toBe('https://host/templates/prototype.js');
  });

  it('unions the templates named by every entry that has announced', () => {
    announce('0.3.0', ['usm'], 'dpk-version', 'https://host/templates/usm.js');
    announce('0.3.0', ['event-storming'], 'dpk-version', 'https://host/templates/event-storming.js');

    const { templates, entryUrl } = (
      window as unknown as { devProcessKit: { templates: readonly string[]; entryUrl: string } }
    ).devProcessKit;
    expect(templates).toEqual(['usm', 'event-storming']);
    // Both name templates: the later entry's own URL wins, and it still resolves siblings correctly.
    expect(entryUrl).toBe('https://host/templates/event-storming.js');
  });
});
