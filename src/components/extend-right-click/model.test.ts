import { describe, expect, it } from 'vitest';

import { DEFAULT_RUN_EVENT, parseExtendRightClickData } from './model';

/** The documented example, verbatim. */
const example = (): unknown => ({
  targets: [
    {
      selector: '.dpk-card',
      label: 'card',
      groups: [
        {
          id: 'card',
          heading: 'Card',
          entries: [
            { kind: 'item', id: 'copy-id', label: 'Copy id', copy: 'data-id' },
            { kind: 'item', id: 'open', label: 'Open', event: 'card:open' },
            {
              kind: 'item',
              id: 'delete',
              label: 'Delete',
              danger: true,
              event: 'card:delete',
              detail: { reason: 'menu' },
            },
            {
              kind: 'submenu',
              id: 'links',
              label: 'Links',
              entries: [{ kind: 'item', id: 'links-doc', label: 'Docs', event: 'card:open-doc' }],
            },
          ],
        },
      ],
    },
  ],
});

describe('parseExtendRightClickData', () => {
  it('parses the documented example', () => {
    const config = parseExtendRightClickData(example());
    expect(config.targets).toHaveLength(1);
    const target = config.targets[0];
    expect(target?.selector).toBe('.dpk-card');
    expect(target?.label).toBe('card');
    const group = target?.groups[0];
    expect(group?.id).toBe('card');
    expect(group?.heading).toBe('Card');
    expect(group?.entries.map((entry) => entry.id)).toEqual(['copy-id', 'open', 'delete', 'links']);
    const deleteItem = group?.entries[2];
    expect(deleteItem).toMatchObject({ kind: 'item', danger: true, event: 'card:delete', detail: { reason: 'menu' } });
    const links = group?.entries[3];
    expect(links).toMatchObject({ kind: 'submenu', label: 'Links' });
    expect(links?.kind === 'submenu' ? links.entries : []).toHaveLength(1);
  });

  it('is idempotent: a parsed config parses again unchanged', () => {
    const once = parseExtendRightClickData(example());
    expect(parseExtendRightClickData(once)).toEqual(once);
  });

  it('defaults to no items of its own; the default run event is a constant', () => {
    expect(DEFAULT_RUN_EVENT).toBe('dpk-extend-right-click-run');
  });

  it('accepts an empty target list and optional headings', () => {
    expect(parseExtendRightClickData({ targets: [] })).toEqual({ targets: [] });
    const parsed = parseExtendRightClickData({
      targets: [{ selector: '.a', groups: [{ id: 'g', entries: [{ kind: 'item', id: 'i', label: 'I' }] }] }],
    });
    expect(parsed.targets[0]?.groups[0]?.heading).toBeUndefined();
  });

  it('rejects a missing or empty config', () => {
    expect(() => parseExtendRightClickData(null)).toThrow();
    expect(() => parseExtendRightClickData({})).toThrow();
    expect(() => parseExtendRightClickData({ targets: [{ selector: '.a' }] })).toThrow();
    expect(() => parseExtendRightClickData({ targets: [{ selector: '.a', groups: [{ id: 'g' }] }] })).toThrow();
  });

  it('rejects an unknown key anywhere (strict)', () => {
    const extraTop = { ...(example() as Record<string, unknown>), extra: true };
    expect(() => parseExtendRightClickData(extraTop)).toThrow();
    expect(() =>
      parseExtendRightClickData({
        targets: [
          { selector: '.a', groups: [{ id: 'g', entries: [{ kind: 'item', id: 'i', label: 'I', icon: 'x' }] }] },
        ],
      }),
    ).toThrow();
  });

  it('rejects an empty selector, id or label', () => {
    const withSelector = (selector: string): unknown => ({
      targets: [{ selector, groups: [{ id: 'g', entries: [{ kind: 'item', id: 'i', label: 'I' }] }] }],
    });
    expect(() => parseExtendRightClickData(withSelector(''))).toThrow();
    expect(() => parseExtendRightClickData(withSelector('   '))).toThrow();
    expect(() => parseExtendRightClickData(withSelector(' .dpk-card '))).not.toThrow();
    expect(parseExtendRightClickData(withSelector(' .dpk-card ')).targets[0]?.selector).toBe('.dpk-card');
    expect(() =>
      parseExtendRightClickData({
        targets: [{ selector: '.a', groups: [{ id: '', entries: [] }] }],
      }),
    ).toThrow();
    expect(() =>
      parseExtendRightClickData({
        targets: [{ selector: '.a', groups: [{ id: 'g', entries: [{ kind: 'item', id: 'i', label: '' }] }] }],
      }),
    ).toThrow();
  });

  it('rejects an id used twice among entries', () => {
    expect(() =>
      parseExtendRightClickData({
        targets: [
          {
            selector: '.a',
            groups: [
              {
                id: 'g',
                entries: [
                  { kind: 'item', id: 'x', label: 'X' },
                  { kind: 'item', id: 'x', label: 'Again' },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate id: x/);
  });

  it('rejects an id repeated inside a submenu or across groups', () => {
    expect(() =>
      parseExtendRightClickData({
        targets: [
          {
            selector: '.a',
            groups: [
              {
                id: 'g',
                entries: [
                  { kind: 'submenu', id: 'more', label: 'More', entries: [{ kind: 'item', id: 'more', label: 'M' }] },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate id: more/);
    expect(() =>
      parseExtendRightClickData({
        targets: [
          {
            selector: '.a',
            groups: [
              { id: 'g', entries: [{ kind: 'item', id: 'x', label: 'X' }] },
              { id: 'g', entries: [{ kind: 'item', id: 'y', label: 'Y' }] },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate id: g/);
  });

  it('rejects a group sharing an id with an entry', () => {
    expect(() =>
      parseExtendRightClickData({
        targets: [
          {
            selector: '.a',
            groups: [
              { id: 'shared', entries: [{ kind: 'item', id: 'x', label: 'X' }] },
              { id: 'other', entries: [{ kind: 'item', id: 'shared', label: 'S' }] },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate id: shared/);
  });
});
