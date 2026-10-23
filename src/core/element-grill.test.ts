// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DpkCommentPanel } from '../components/comment-panel';
import type { DpkTemplatePlain } from '../templates/plain/element';

import { coreMessages } from './messages';
import { changeLogScript, showChange } from './testing/change-notices';
import '../index';

const messages = coreMessages('en');

const grill = {
  questions: [
    {
      id: 'retry',
      title: 'Retry twice?',
      options: [
        { id: 'key', label: 'Use an idempotency key' },
        { id: 'lookup', label: 'Look the result up first' },
      ],
    },
    { id: 'notify', title: 'Who hears of it?' },
  ],
  history: [{ questions: [{ id: 'deadline', title: 'Deadline?', answer: { kind: 'free', text: 'Before dispatch' } }] }],
};

const mount = (questions: unknown = grill, attributes = '', log = ''): DpkTemplatePlain => {
  window.location.hash = '';
  document.body.innerHTML = `
    <dpk-template-plain storage="memory" ${attributes}>
      ${log}
      <script type="application/json">${JSON.stringify({ title: 'Cancel orders' })}</script>
      ${questions === null ? '' : `<script type="application/json" data-dpk-grill>${JSON.stringify(questions)}</script>`}
      <section slot="main"><p id="retry-mark" data-grill-questions="Q1 Q2">Payment</p></section>
    </dpk-template-plain>`;
  const element = document.querySelector('dpk-template-plain');
  if (!(element instanceof HTMLElement)) throw new Error('element did not upgrade');
  return element as DpkTemplatePlain;
};

const settle = async (element: DpkTemplatePlain): Promise<void> => {
  await element.api.ready;
  for (let i = 0; i < 3; i += 1) {
    await element.updateComplete;
    await Promise.resolve();
  }
};

const root = (element: DpkTemplatePlain): ShadowRoot => {
  if (!element.shadowRoot) throw new Error('no shadow root');
  return element.shadowRoot;
};

const toggle = (element: DpkTemplatePlain, section: string): HTMLElement | null =>
  root(element).querySelector<HTMLElement>(`.dpk-review-toggle[data-section="${section}"]`);

afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
  vi.restoreAllMocks();
});

describe('questions on any template', () => {
  it('puts the questions toggle between the changes and the comments, counting answers', async () => {
    const element = mount();
    await settle(element);
    const sections = [...root(element).querySelectorAll('.dpk-review-toggle')].map((button) =>
      button.getAttribute('data-section'),
    );
    expect(sections).toEqual(['changes', 'questions', 'comments']);
    expect(toggle(element, 'questions')?.getAttribute('data-tooltip')).toBe(messages.grill);
    expect(toggle(element, 'questions')?.querySelector('.dpk-review-badge')?.textContent).toBe('0/2');
  });

  it('asks nothing and watches nothing on a page without questions', async () => {
    const element = mount(null);
    await settle(element);
    expect(toggle(element, 'questions')).toBeNull();
    expect(root(element).querySelector('.dpk-grill-badges')).toBeNull();
    expect(root(element).querySelector('.dpk-main-body')?.hasAttribute('data-grill-gutter')).toBe(false);
  });

  it('opens the questions in the review in place of the comment panel, which keeps its draft', async () => {
    const element = mount();
    await settle(element);
    toggle(element, 'questions')?.click();
    await settle(element);
    const review = root(element).querySelector('#dpk-review');
    expect(element.notesOpen).toBe(true);
    expect(review?.getAttribute('data-section')).toBe('questions');
    expect(review?.querySelector('.dpk-grill')).not.toBeNull();
    expect(review?.querySelector('dpk-comment-panel')).not.toBeNull();
    expect(toggle(element, 'questions')?.getAttribute('aria-pressed')).toBe('true');
    // The first question opens; the earlier round is a choice of its own.
    expect(review?.querySelector('[data-question="retry"] .dpk-grill-heading')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
    review?.querySelector<HTMLButtonElement>('.dpk-grill-round')?.click();
    await settle(element);
    expect(
      [...(review?.querySelectorAll('.dpk-grill-rounds [role="option"] .dpk-rich-select-option-label') ?? [])].map(
        (option) => option.textContent,
      ),
    ).toEqual([messages.grillRoundOption(messages.grillCurrentRound, 2), messages.grillRoundOption('v1', 1)]);
  });

  it('opens from notes="questions", and falls back to the comments without questions', async () => {
    const asked = mount(grill, 'notes="questions" notes-open');
    await settle(asked);
    expect(root(asked).querySelector('#dpk-review')?.getAttribute('data-section')).toBe('questions');
    const silent = mount(null, 'notes="questions" notes-open');
    await settle(silent);
    expect(root(silent).querySelector('#dpk-review')?.getAttribute('data-section')).toBe('comments');
  });

  it('records a picked option as an answer, advances to the next question, and keeps one answer each', async () => {
    const element = mount();
    await settle(element);
    toggle(element, 'questions')?.click();
    await settle(element);
    const pick = (id: string): void => {
      const input = root(element).querySelector<HTMLInputElement>(`[data-choice="${id}"] input`);
      if (!input) throw new Error(`no choice ${id}`);
      input.checked = true;
      input.dispatchEvent(new Event('change'));
    };
    pick('key');
    await settle(element);
    expect(element.api.snapshot().answers).toEqual({ retry: { kind: 'option', optionId: 'key' } });
    expect(toggle(element, 'questions')?.querySelector('.dpk-review-badge')?.textContent).toBe('1/2');
    // Answers stay out of the changes count; they are counted on the questions.
    expect(toggle(element, 'changes')?.querySelector('.dpk-review-badge')).toBeNull();
    expect(
      root(element).querySelector('[data-question="notify"] .dpk-grill-heading')?.getAttribute('aria-expanded'),
    ).toBe('true');

    root(element).querySelector<HTMLButtonElement>('[data-question="retry"] .dpk-grill-heading')?.click();
    await settle(element);
    pick('lookup');
    await settle(element);
    expect(element.api.snapshot().answers).toEqual({ retry: { kind: 'option', optionId: 'lookup' } });
    expect(element.controller.actions.filter((action) => action.type === 'answer')).toHaveLength(1);
    expect(element.api.exportBrief()).toContain('`grill:retry`');
  });

  it('hands the draft off from the foot of the questions, where the comment panel cannot be seen', async () => {
    const element = mount();
    await settle(element);
    element.api.comment('page:plain', 'Looks fine');
    toggle(element, 'questions')?.click();
    await settle(element);
    expect(root(element).querySelector('.dpk-grill-footer .dpk-dock-actions button')).not.toBeNull();
    expect(root(element).querySelector('.dpk-overlay > .dpk-dock')).toBeNull();
  });

  it('lays a badge per mark, and opens its question when pressed', async () => {
    const element = mount();
    await settle(element);
    const badges = [...root(element).querySelectorAll<HTMLButtonElement>('.dpk-grill-badge')];
    expect(badges.map((badge) => badge.textContent?.trim())).toEqual(['Q1', 'Q2']);
    expect(root(element).querySelector('.dpk-main-body')?.hasAttribute('data-grill-gutter')).toBe(true);
    badges[1]?.click();
    await settle(element);
    expect(element.notesOpen).toBe(true);
    expect(
      root(element).querySelector('[data-question="notify"] .dpk-grill-heading')?.getAttribute('aria-expanded'),
    ).toBe('true');
    expect(root(element).querySelectorAll('.dpk-grill-badge')[1]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('moves the badges when a part of the shell scrolls on its own', async () => {
    const element = mount();
    await settle(element);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    // A scroll inside the shadow root never reaches the document.
    root(element).querySelector('.dpk-body')?.dispatchEvent(new Event('scroll'));
    expect(frame).toHaveBeenCalledTimes(1);
  });

  it('follows marks the author adds later', async () => {
    const element = mount();
    await settle(element);
    const mark = document.createElement('p');
    mark.slot = 'main';
    mark.dataset['grillQuestions'] = 'Q2';
    element.append(mark);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle(element);
    expect(root(element).querySelectorAll('.dpk-grill-badge')).toHaveLength(3);
  });

  it('"Show" on a change about a question opens it', async () => {
    const element = mount(grill, '', changeLogScript('grill:notify'));
    await settle(element);
    const shown = await showChange(element);
    expect(element.notesOpen).toBe(true);
    expect(shown?.getAttribute('data-question')).toBe('notify');
    expect(
      root(element).querySelector('[data-question="notify"] .dpk-grill-heading')?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('lets a review comment point at a question', async () => {
    const element = mount();
    await settle(element);
    expect(element.api.comment('grill:notify', 'Ask the seller too').ok).toBe(true);
    const panel = root(element).querySelector('dpk-comment-panel') as DpkCommentPanel;
    expect(panel).not.toBeNull();
    expect(element.api.exportBrief()).toContain('grill:notify');
  });

  it('reports a malformed block and keeps the page', async () => {
    const element = mount({ questions: [{ id: 'a' }] });
    await settle(element);
    const banner = root(element).querySelector('.dpk-banner');
    expect(banner?.textContent).toContain(messages.grillError);
    expect(root(element).querySelector('.dpk-header h1')?.textContent).toBe('Cancel orders');
    expect(toggle(element, 'questions')).toBeNull();
  });
});
