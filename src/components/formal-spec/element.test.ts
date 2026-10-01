import { afterEach, describe, expect, it, vi } from 'vitest';

import { DpkComponentFormalSpec } from './element';
import { defineFormalSpec } from './index';
import { formalSpecMessages } from './messages';

const m = formalSpecMessages('en');

defineFormalSpec();

const raw = {
  targets: [
    { id: 'sorter', name: 'Order list sorting', code: 'sortOrders', summary: 'Puts orders [[sorted|in order]]' },
  ],
  terms: [{ id: 'sorted', name: 'sorted', meaning: 'each item is at most the next one' }],
  claims: [
    {
      id: 'sort',
      target: 'sorter',
      statement: 'Sorting any list gives a [[sorted]] list',
      subjects: [{ id: 'list', text: 'any list of numbers' }],
      conclusions: [{ id: 'ordered', text: 'the result is [[sorted|in order]]' }],
      notClaimed: [{ id: 'stable', text: 'equal items keep their order' }],
      assurance: { kind: 'proved' },
      source: { tool: 'Lean 4', ref: 'Sort.lean · sort_correct' },
    },
    {
      id: 'mutex',
      statement: 'Two processes are never both inside',
      premises: [{ id: 'fair', text: 'the scheduler is fair' }],
      conclusions: [{ id: 'never-both', text: 'at most one is inside' }],
      assurance: { kind: 'bounded', bound: 'up to 3 processes' },
    },
  ],
};

afterEach(() => {
  document.body.replaceChildren();
});

const mount = async (data: unknown = raw, id = 'spec'): Promise<DpkComponentFormalSpec> => {
  const element = document.createElement('dpk-component-formal-spec');
  if (!(element instanceof DpkComponentFormalSpec)) throw new Error('did not upgrade');
  if (id) element.id = id;
  element.innerHTML = `<script type="application/json">${JSON.stringify(data)}</script>`;
  document.body.append(element);
  for (let index = 0; index < 3; index++) await element.updateComplete;
  return element;
};

const query = (element: DpkComponentFormalSpec, selector: string): HTMLElement => {
  const found = element.renderRoot.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

/** Opens every claim, as a reader clicking each one would. */
const expandAll = async (element: DpkComponentFormalSpec): Promise<DpkComponentFormalSpec> => {
  for (const toggle of element.renderRoot.querySelectorAll<HTMLElement>('.claim-toggle')) toggle.click();
  await element.updateComplete;
  return element;
};

const text = (element: DpkComponentFormalSpec, selector: string): string =>
  query(element, selector).textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('dpk-component-formal-spec', () => {
  it('shows each claim as its statement and assurance, its parts folded away', async () => {
    const element = await mount();
    expect(text(element, '[data-claim="sort"] .claim-statement')).toBe('Sorting any list gives a sorted list');
    expect(text(element, '[data-claim="sort"] .assurance-badge')).toBe(m.proved);
    expect(element.renderRoot.querySelector('[data-claim="sort"] .claim-body')).toBeNull();
    expect(query(element, '[data-claim="sort"] .claim-toggle').getAttribute('aria-expanded')).toBe('false');
  });

  it('unfolds a claim from its toggle or its statement, but not from a term in it', async () => {
    const element = await mount();
    query(element, '[data-claim="sort"] .claim-statement .term').click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('[data-claim="sort"] .claim-body')).toBeNull();
    query(element, '[data-claim="sort"] .claim-statement').click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('[data-claim="sort"] .claim-body')).not.toBeNull();
    expect(query(element, '[data-claim="sort"] .claim-toggle').getAttribute('aria-expanded')).toBe('true');
    query(element, '[data-claim="sort"] .claim-toggle').click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('[data-claim="sort"] .claim-body')).toBeNull();
    expect(element.renderRoot.querySelector('[data-claim="mutex"] .claim-body')).toBeNull();
  });

  it('renders an unfolded claim with its parts and its assurance', async () => {
    const element = await expandAll(await mount());
    expect(text(element, '[data-claim="sort"] .claim-statement')).toBe('Sorting any list gives a sorted list');
    expect(text(element, '[data-claim="sort"] [data-part="subjects"]')).toContain('any list of numbers');
    expect(text(element, '[data-claim="sort"] [data-part="conclusions"]')).toContain('the result is in order');
    expect(text(element, '[data-claim="sort"] .assurance-badge')).toBe(m.proved);
    expect(text(element, '[data-claim="mutex"] .assurance-badge')).toBe(m.bounded);
    expect(text(element, '[data-claim="mutex"] .assurance')).toContain('up to 3 processes');
  });

  it('groups claims under what they are about, naming it in words and in code', async () => {
    const element = await mount();
    expect(text(element, '[data-target="sorter"] .target-name')).toBe('Order list sorting');
    expect(text(element, '[data-target="sorter"] .target-code')).toBe('sortOrders');
    expect(text(element, '[data-target="sorter"] .target-summary')).toBe('Puts orders in order');
    expect(element.renderRoot.querySelector('[data-target="sorter"] [data-claim="sort"]')).not.toBeNull();
    expect(element.renderRoot.querySelector('[data-target] [data-claim="mutex"]')).toBeNull();
    expect(element.renderRoot.querySelector('[data-claim="mutex"]')).not.toBeNull();
  });

  it('lists what a caveat rests on, and nothing for a plain proof', async () => {
    const element = await expandAll(await mount());
    expect(element.renderRoot.querySelector('[data-claim="sort"] .assurance')).toBeNull();
    expect(text(element, '[data-claim="mutex"] .assurance-label')).toBe(m.bound);
  });

  it('says so when a claim has no premises, instead of leaving the row out', async () => {
    const element = await expandAll(await mount());
    expect(text(element, '[data-claim="sort"] [data-part="premises"]')).toContain(m.noPremises);
    expect(text(element, '[data-claim="mutex"] [data-part="premises"]')).toContain('the scheduler is fair');
  });

  it('shows what a claim does not claim, its terms and its source', async () => {
    const element = await expandAll(await mount());
    expect(text(element, '[data-claim="sort"] [data-part="not-claimed"]')).toContain('equal items keep their order');
    expect(text(element, '[data-claim="sort"] .term-chip')).toBe('sorted');
    expect(text(element, '[data-claim="sort"] .claim-source')).toContain('Sort.lean · sort_correct');
    expect(element.renderRoot.querySelector('[data-claim="mutex"] .claim-foot')).toBeNull();
  });

  it('lists no definitions apart: a term is defined only in its tooltip', async () => {
    const element = await expandAll(await mount());
    expect(element.renderRoot.querySelector('.glossary')).toBeNull();
  });

  it('points the toggle at the body only while the body is there', async () => {
    const element = await mount();
    const toggle = query(element, '[data-claim="sort"] .claim-toggle');
    expect(toggle.hasAttribute('aria-controls')).toBe(false);
    toggle.click();
    await element.updateComplete;
    const body = query(element, '[data-claim="sort"] .claim-body');
    expect(toggle.getAttribute('aria-controls')).toBe(body.id);
  });

  it('describes only the element whose tooltip is open by the tooltip', async () => {
    const element = await mount();
    const badge = query(element, '[data-claim="sort"] .assurance-badge');
    const other = query(element, '[data-claim="mutex"] .assurance-badge');
    expect(badge.hasAttribute('aria-describedby')).toBe(false);
    badge.dispatchEvent(new FocusEvent('focus'));
    await element.updateComplete;
    expect(badge.getAttribute('aria-describedby')).toBe(query(element, '.spec-tip').id);
    expect(other.hasAttribute('aria-describedby')).toBe(false);
    badge.dispatchEvent(new FocusEvent('blur'));
    await element.updateComplete;
    expect(badge.hasAttribute('aria-describedby')).toBe(false);
  });

  it('keeps a tooltip open when folding another claim, and closes one inside the folded body', async () => {
    const element = await expandAll(await mount());
    query(element, '[data-claim="mutex"] .assurance-badge').dispatchEvent(new FocusEvent('focus'));
    await element.updateComplete;
    query(element, '[data-claim="sort"] .claim-toggle').click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.spec-tip')).not.toBeNull();

    query(element, '[data-claim="sort"] .claim-toggle').click();
    await element.updateComplete;
    query(element, '[data-claim="sort"] .claim-body .term').dispatchEvent(new FocusEvent('focus'));
    await element.updateComplete;
    query(element, '[data-claim="sort"] .claim-toggle').click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.spec-tip')).toBeNull();
  });

  it('shows the meaning of a term in a tooltip where it is used', async () => {
    const element = await mount();
    expect(element.renderRoot.querySelector('.spec-tip')).toBeNull();
    query(element, '[data-claim="sort"] .claim-statement .term').dispatchEvent(new FocusEvent('focus'));
    await element.updateComplete;
    expect(text(element, '.spec-tip')).toBe('sorted each item is at most the next one');
    query(element, '[data-claim="sort"] .claim-statement .term').dispatchEvent(new FocusEvent('blur'));
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.spec-tip')).toBeNull();
  });

  it('explains an assurance badge in a tooltip on hover', async () => {
    const element = await mount();
    const badge = query(element, '[data-claim="sort"] .assurance-badge');
    badge.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    await element.updateComplete;
    expect(text(element, '.spec-tip')).toBe(`${m.proved} ${m.provedDetail}`);
    badge.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.spec-tip')).toBeNull();
  });

  it('closes a tooltip on Escape', async () => {
    const element = await mount();
    query(element, '[data-claim="sort"] .assurance-badge').click();
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.spec-tip')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await element.updateComplete;
    expect(element.renderRoot.querySelector('.spec-tip')).toBeNull();
  });

  it('registers targets, claims and clauses as comment targets', async () => {
    const element = await mount();
    const values = element.commentTargets.map((target) => target.value);
    expect(values).toEqual([
      'element:spec/target/sorter',
      'element:spec/claim/sort',
      'element:spec/clause/sort/list',
      'element:spec/clause/sort/ordered',
      'element:spec/clause/sort/stable',
      'element:spec/claim/mutex',
      'element:spec/clause/mutex/fair',
      'element:spec/clause/mutex/never-both',
    ]);
    expect(element.commentTargets[3]?.label).toBe('Sorting any list gives a sorted… › the result is in order');
  });

  it('has no comment targets or triggers without an id', async () => {
    const element = await mount(raw, '');
    expect(element.commentTargets).toEqual([]);
    expect(element.renderRoot.querySelector('.comment-trigger')).toBeNull();
  });

  it('submits a clause comment to the enclosing template', async () => {
    const element = await expandAll(await mount());
    const submitted = vi.fn((event: Event) => event.preventDefault());
    element.addEventListener('dpk-comment-submit', submitted);
    query(element, '[data-comment-ref="element:spec/clause/sort/ordered"]').click();
    await element.updateComplete;
    const textarea = element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea');
    if (!textarea) throw new Error('no composer');
    textarea.value = 'Should be strictly increasing?';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    query(element, '.comment-pop .dpk-btn--accent').click();
    await element.updateComplete;
    expect(submitted).toHaveBeenCalledOnce();
    const event = submitted.mock.calls[0]?.[0];
    expect(event instanceof CustomEvent ? event.detail : null).toEqual({
      target: 'element:spec/clause/sort/ordered',
      body: 'Should be strictly increasing?',
    });
    expect(element.renderRoot.querySelector('.comment-pop')).toBeNull();
  });

  it('keeps the comment and says why when no template saves it', async () => {
    const element = await mount();
    query(element, '[data-comment-ref="element:spec/claim/sort"]').click();
    await element.updateComplete;
    const textarea = element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea');
    if (!textarea) throw new Error('no composer');
    textarea.value = 'Too weak';
    textarea.dispatchEvent(new Event('input'));
    await element.updateComplete;
    query(element, '.comment-pop .dpk-btn--accent').click();
    await element.updateComplete;
    expect(text(element, '.comment-pop .comment-error')).toBe(m.sendFailed);
    expect(element.renderRoot.querySelector<HTMLTextAreaElement>('.comment-pop textarea')?.value).toBe('Too weak');
  });

  it('shows the validation error instead of claims for invalid data', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const element = await mount({ claims: [{ ...raw.claims[1], statement: '[[missing]]' }] });
    expect(element.dataError).toContain('unknown term reference');
    expect(text(element, '.spec-notice')).toContain(m.dataError);
    expect(element.renderRoot.querySelector('[data-claim]')).toBeNull();
    expect(element.commentTargets).toEqual([]);
  });

  it('summarizes the claims that are not plainly proved', async () => {
    const element = await mount();
    expect(text(element, '.spec-stats')).toBe(`${m.claims(2)} ${m.bounded} 1`);
    const conditional = { ...raw.claims[1], id: 'conditional', assurance: { kind: 'proved', assumptions: ['x'] } };
    const planned = { ...raw.claims[1], id: 'planned', assurance: { kind: 'planned' } };
    const mixed = await mount({ ...raw, claims: [...raw.claims, conditional, planned] }, 'mixed');
    const chips = [...mixed.renderRoot.querySelectorAll('.spec-chip')].map((chip) => chip.textContent?.trim());
    expect(chips).toEqual([`${m.bounded} 1`, `${m.conditional} 1`, `${m.planned} 1`]);
  });
});
