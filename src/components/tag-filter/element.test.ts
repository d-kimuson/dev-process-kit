import { afterEach, describe, expect, it } from 'vitest';

import { defineTagFilter, type DpkTagFilter } from './index';

defineTagFilter();

const mount = async (): Promise<DpkTagFilter> => {
  const filter = document.createElement('dpk-tag-filter') as DpkTagFilter;
  filter.innerHTML = `<script type="application/json">{ "tags": [{ "tag": "BC:auth", "count": 2 }, "BC:order", "changed"] }</script>`;
  document.body.append(filter);
  for (let index = 0; index < 3; index++) await filter.updateComplete;
  return filter;
};

const chip = (filter: DpkTagFilter, tag: string): HTMLButtonElement | null =>
  filter.shadowRoot?.querySelector<HTMLButtonElement>(`[data-tag="${tag}"]`) ?? null;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-tag-filter', () => {
  it('offers the tags from its JSON child, with counts where given', async () => {
    const filter = await mount();
    expect(chip(filter, 'BC:auth')?.textContent?.replace(/\s+/g, '')).toBe('BC:auth2');
    expect(chip(filter, 'BC:order')?.querySelector('.dpk-tag-count')).toBeNull();
  });

  it('picks one tag at a time in Single, several in OR, and announces each change', async () => {
    const filter = await mount();
    const changes: unknown[] = [];
    filter.addEventListener('dpk-tag-filter-change', (event) => changes.push((event as CustomEvent).detail));
    chip(filter, 'BC:auth')?.click();
    chip(filter, 'BC:order')?.click();
    expect(filter.active).toEqual(['BC:order']);
    filter.shadowRoot?.querySelector<HTMLButtonElement>('[data-match="any"]')?.click();
    chip(filter, 'changed')?.click();
    expect(filter.active).toEqual(['BC:order', 'changed']);
    expect(changes.at(-1)).toEqual({ active: ['BC:order', 'changed'], match: 'any' });
  });

  it('answers whether an item passes', async () => {
    const filter = await mount();
    expect(filter.passes([])).toBe(true);
    chip(filter, 'BC:auth')?.click();
    expect(filter.passes(['BC:auth', 'changed'])).toBe(true);
    expect(filter.passes(['BC:order'])).toBe(false);
  });

  it('renders nothing, including the Single/AND/OR toggle, when there are no tags to filter by', async () => {
    const filter = document.createElement('dpk-tag-filter') as DpkTagFilter;
    document.body.append(filter);
    for (let index = 0; index < 3; index++) await filter.updateComplete;
    expect(filter.shadowRoot?.querySelector('.diagram-match')).toBeNull();
    expect(filter.shadowRoot?.querySelector('.diagram-tags')).toBeNull();
    expect(filter.shadowRoot?.textContent?.trim()).toBe('');
  });

  it('renders BC: chips ahead of plain tags regardless of authored order', async () => {
    const filter = document.createElement('dpk-tag-filter') as DpkTagFilter;
    filter.innerHTML = `<script type="application/json">["changed", "BC:order", "added"]</script>`;
    document.body.append(filter);
    for (let index = 0; index < 3; index++) await filter.updateComplete;
    const order = [...(filter.shadowRoot?.querySelectorAll<HTMLButtonElement>('.dpk-tag') ?? [])].map(
      (button) => button.dataset['tag'],
    );
    expect(order).toEqual(['BC:order', 'changed', 'added']);
  });
});
