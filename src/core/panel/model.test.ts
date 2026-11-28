import { describe, expect, it } from 'vitest';

import {
  authoredSectionName,
  detailChange,
  initialSection,
  panelOpenState,
  panelTabs,
  parsePanelMode,
  parsePanelRecord,
  tabKeyTarget,
  type PanelTab,
} from './model';

const tabs = (detail: boolean, ...authored: string[]): readonly PanelTab[] =>
  panelTabs({
    detail: detail ? { label: 'Detail' } : null,
    components: [],
    authored: authored.map((name) => ({ name, label: name, badge: null, hidden: false })),
  });

describe('panelTabs', () => {
  it('puts the detail first, then component sections, then the author sections', () => {
    const result = panelTabs({
      detail: { label: 'Detail' },
      components: [{ name: 'bulk', label: 'Bulk' }],
      authored: [{ name: 'issues', label: 'Issues', badge: '3', hidden: false }],
    });
    expect(result.map((tab) => [tab.name, tab.kind, tab.badge])).toEqual([
      ['detail', 'detail', null],
      ['bulk', 'component', null],
      ['issues', 'author', '3'],
    ]);
  });

  it('leaves out hidden sections but keeps the position-based names of the others', () => {
    const result = panelTabs({
      detail: null,
      components: [],
      authored: [
        { name: null, label: 'A', badge: null, hidden: true },
        { name: null, label: 'B', badge: null, hidden: false },
      ],
    });
    expect(result.map((tab) => tab.name)).toEqual(['section-2']);
  });

  it('does not let an author section take the reserved detail name', () => {
    expect(authoredSectionName({ name: 'detail', label: 'X', badge: null, hidden: false }, 0)).toBe('section-1');
  });
});

describe('initialSection', () => {
  it("keeps the reader's section while it still exists", () => {
    expect(initialSection({ tabs: tabs(true, 'issues', 'decided'), stored: 'decided', selected: true })).toBe(
      'decided',
    );
  });

  it('falls back when the stored section is gone', () => {
    expect(initialSection({ tabs: tabs(true, 'issues'), stored: 'gone', selected: false })).toBe('issues');
  });

  it('shows the detail while an element is selected', () => {
    expect(initialSection({ tabs: tabs(true, 'issues'), stored: null, selected: true })).toBe('detail');
  });

  it('shows the first author section when nothing is selected', () => {
    expect(initialSection({ tabs: tabs(true, 'issues', 'decided'), stored: null, selected: false })).toBe('issues');
  });

  it('shows the detail when there is nothing else', () => {
    expect(initialSection({ tabs: tabs(true), stored: null, selected: false })).toBe('detail');
  });
});

describe('detailChange', () => {
  it('opens the panel on the detail for an explicit open', () => {
    expect(detailChange({ intent: 'open', open: false, section: 'issues', selected: true }).kind).toBe('open-detail');
  });

  it('only replaces the detail while the reader looks at it', () => {
    expect(detailChange({ intent: 'select', open: true, section: 'detail', selected: true }).kind).toBe('show');
  });

  it('marks the detail unread instead of switching away from another section', () => {
    expect(detailChange({ intent: 'select', open: true, section: 'issues', selected: true }).kind).toBe('mark-unread');
    expect(detailChange({ intent: 'select', open: false, section: 'detail', selected: true }).kind).toBe('mark-unread');
  });

  it('does nothing to a panel the reader is not looking at when the selection clears', () => {
    expect(detailChange({ intent: 'select', open: false, section: 'detail', selected: false }).kind).toBe('none');
  });
});

describe('tabKeyTarget', () => {
  const names = ['detail', 'issues', 'decided'];

  it('moves with the arrows and wraps around', () => {
    expect(tabKeyTarget(names, 'detail', 'ArrowRight')).toBe('issues');
    expect(tabKeyTarget(names, 'decided', 'ArrowRight')).toBe('detail');
    expect(tabKeyTarget(names, 'detail', 'ArrowLeft')).toBe('decided');
  });

  it('jumps with Home and End', () => {
    expect(tabKeyTarget(names, 'issues', 'Home')).toBe('detail');
    expect(tabKeyTarget(names, 'issues', 'End')).toBe('decided');
  });

  it('ignores other keys', () => {
    expect(tabKeyTarget(names, 'issues', 'Enter')).toBeNull();
  });
});

describe('stored state', () => {
  it('reads a record back', () => {
    expect(parsePanelRecord({ open: true, section: 'issues' })).toEqual({ open: true, section: 'issues' });
    expect(parsePanelRecord({ open: false, section: null })).toEqual({ open: false, section: null });
  });

  it('rejects a value that is not a record', () => {
    expect(parsePanelRecord({ open: 'yes', section: 'issues' })).toBeNull();
    expect(parsePanelRecord(null)).toBeNull();
    expect(parsePanelRecord({ section: 'issues' })).toBeNull();
  });

  it("lets the reader's record win over panel=open", () => {
    expect(panelOpenState({ open: false, section: null }, 'open')).toBe(false);
    expect(panelOpenState(null, 'open')).toBe(true);
    expect(panelOpenState(null, 'auto')).toBe(false);
  });

  it('reads the panel mode', () => {
    expect(parsePanelMode('none')).toBe('none');
    expect(parsePanelMode('bogus')).toBe('auto');
    expect(parsePanelMode(null)).toBe('auto');
  });
});
