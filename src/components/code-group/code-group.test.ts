// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import { defineCodeGroup, type DpkCodeGroup } from './index';
import { parseCodeGroupData } from './model';

defineCodeGroup();

const data = {
  label: 'Install',
  variants: [
    { label: 'npm', language: 'sh', code: 'npm create dev-process-kit' },
    { label: 'pnpm', language: 'sh', code: 'pnpm create dev-process-kit' },
  ],
} as const;

const mount = async (value: unknown): Promise<DpkCodeGroup> => {
  const group = document.createElement('dpk-code-group') as DpkCodeGroup;
  group.data = value as never;
  document.body.append(group);
  await group.updateComplete;
  return group;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('parseCodeGroupData', () => {
  it('reads the label and variants', () => {
    const parsed = parseCodeGroupData(data);
    expect(parsed.label).toBe('Install');
    expect(parsed.variants.map((variant) => variant.label)).toEqual(['npm', 'pnpm']);
  });

  it('rejects duplicate tab labels and unknown keys', () => {
    expect(() =>
      parseCodeGroupData({
        variants: [
          { label: 'npm', code: 'a' },
          { label: 'npm', code: 'b' },
        ],
      }),
    ).toThrow(/duplicate variant label/);
    expect(() => parseCodeGroupData({ ...data, extra: true })).toThrow();
  });

  it('requires at least one variant', () => {
    expect(() => parseCodeGroupData({ variants: [] })).toThrow();
  });
});

describe('dpk-code-group', () => {
  it('renders one tab per variant and shows the first panel', async () => {
    const group = await mount(data);
    const tabs = group.shadowRoot?.querySelectorAll('[role="tab"]') ?? [];
    const panels = group.shadowRoot?.querySelectorAll('[role="tabpanel"]') ?? [];
    expect([...tabs].map((tab) => tab.textContent?.trim())).toEqual(['npm', 'pnpm']);
    expect([...panels].map((panel) => panel.hasAttribute('hidden'))).toEqual([false, true]);
    expect(group.shadowRoot?.querySelector('.name')?.textContent).toBe('Install');
  });

  it('switches the visible panel when a tab is clicked', async () => {
    const group = await mount(data);
    const tabs = group.shadowRoot?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [];
    tabs[1]?.click();
    await group.updateComplete;
    const panels = group.shadowRoot?.querySelectorAll('[role="tabpanel"]') ?? [];
    expect([...panels].map((panel) => panel.hasAttribute('hidden'))).toEqual([true, false]);
    expect(panels[1]?.querySelector('code')?.textContent).toBe('pnpm create dev-process-kit');
  });

  it('reads the same shape from a JSON child', async () => {
    const group = document.createElement('dpk-code-group') as DpkCodeGroup;
    group.innerHTML = `<script type="application/json">${JSON.stringify(data)}</script>`;
    document.body.append(group);
    await group.updateComplete;
    expect(group.shadowRoot?.querySelectorAll('[role="tab"]')).toHaveLength(2);
  });

  it('reads a JSON child that the parser adds after connecting', async () => {
    document.body.innerHTML = `<dpk-code-group><script type="application/json">${JSON.stringify(data)}</script></dpk-code-group>`;
    const group = document.querySelector('dpk-code-group') as DpkCodeGroup;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await group.updateComplete;
    expect(group.shadowRoot?.querySelectorAll('[role="tab"]')).toHaveLength(2);
  });

  it('reports invalid data without throwing', async () => {
    const group = await mount({ ...data, extra: true });
    expect(group.shadowRoot?.querySelector('.empty')?.textContent).toContain('Invalid code group');
  });
});
