import { afterEach, describe, expect, it } from 'vitest';

import { announce, announcedEntryUrl } from './announce';

afterEach(() => {
  Reflect.deleteProperty(window, 'devProcessKit');
});

describe('announce', () => {
  it('announces the first entry as-is', () => {
    announce('0.3.0', ['prototype'], 'dpk-version', 'https://host/views/prototype.js');

    expect(announcedEntryUrl()).toBe('https://host/views/prototype.js');
    expect((window as unknown as { devProcessKit: { views: readonly string[] } }).devProcessKit.views).toEqual([
      'prototype',
    ]);
  });

  it("keeps a view entry's url when a later, view-less entry announces (components.js loaded alongside a template)", () => {
    announce('0.3.0', ['prototype'], 'dpk-version', 'https://host/views/prototype.js');
    announce('0.3.0', [], 'dpk-version', 'https://host/components.js');

    // Still the template entry's own URL: a sibling view entry resolves against this one, not components.js's.
    expect(announcedEntryUrl()).toBe('https://host/views/prototype.js');
  });

  it('unions the views named by every entry that has announced', () => {
    announce('0.3.0', ['usm'], 'dpk-version', 'https://host/views/usm.js');
    announce('0.3.0', ['event-storming'], 'dpk-version', 'https://host/views/event-storming.js');

    const { views, entryUrl } = (window as unknown as { devProcessKit: { views: readonly string[]; entryUrl: string } })
      .devProcessKit;
    expect(views).toEqual(['usm', 'event-storming']);
    // Both name views: the later entry's own URL wins, and it still resolves siblings correctly.
    expect(entryUrl).toBe('https://host/views/event-storming.js');
  });
});
