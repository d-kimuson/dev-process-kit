import { afterEach, describe, expect, it, vi } from 'vitest';

import { defineAlternatives, type DpkAlternatives } from './index';
import { alternativesStyles } from './styles';

defineAlternatives();

const JSON_CHILD = `<script type="application/json">
  {
    "options": [
      { "id": "b", "label": "B", "status": "rejected", "summary": "Queue the retry", "reason": "Nothing to consume it" },
      { "id": "c", "label": "C", "status": "adopted", "summary": "Retry in the request", "tradeoffs": ["Slower p99"] },
      { "id": "d", "status": "considered", "summary": "Defer to the client" }
    ]
  }
</script>`;

const mount = async (html = JSON_CHILD): Promise<DpkAlternatives> => {
  const element = document.createElement('dpk-alternatives') as DpkAlternatives;
  element.innerHTML = html;
  document.body.append(element);
  for (let index = 0; index < 3; index++) await element.updateComplete;
  return element;
};

const root = (element: DpkAlternatives): ShadowRoot => {
  if (element.shadowRoot === null) throw new Error('the element rendered no shadow root');
  return element.shadowRoot;
};

const cards = (element: DpkAlternatives): HTMLElement[] => [
  ...root(element).querySelectorAll<HTMLElement>('li.option > .dpk-card'),
];

/** The component's own sheet: the `cardAtom` and `tokens` it adopts are shared, not its to police. */
const ownStyles = (): string => alternativesStyles.at(-1)?.cssText ?? '';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-alternatives', () => {
  it('renders one neutral card per option, in the authored order', async () => {
    const element = await mount();
    expect(cards(element)).toHaveLength(3);
    expect(cards(element).map((card) => card.querySelector('.dpk-card-title')?.textContent)).toEqual(['B', 'C', 'd']);
    // Every option is the kit's own card, so none of them restyles a card of its own.
    for (const card of cards(element)) expect(card.classList.contains('dpk-card')).toBe(true);
  });

  it('shows each status as a chip in the card head', async () => {
    const element = await mount();
    const statuses = [...root(element).querySelectorAll<HTMLElement>('li.option')].map((option) => ({
      status: option.dataset['status'],
      chip: option.querySelector('.status')?.getAttribute('data-tone'),
      label: option.querySelector('.status')?.textContent?.trim(),
    }));
    expect(statuses).toEqual([
      { status: 'rejected', chip: 'rejected', label: 'Rejected' },
      { status: 'adopted', chip: 'adopted', label: 'Adopted' },
      { status: 'considered', chip: 'considered', label: 'Considered' },
    ]);
  });

  it('shows the id as a key beside a title that reads as something else', async () => {
    const element = await mount();
    const [rejected, adopted, noLabel] = root(element).querySelectorAll<HTMLElement>('li.option');
    expect(rejected?.querySelector('.dpk-card-key')?.textContent).toBe('b');
    expect(adopted?.querySelector('.dpk-card-key')?.textContent).toBe('c');
    // The third option has no label, so its title is its id and a key would repeat it.
    expect(noLabel?.querySelector('.dpk-card-key')).toBeNull();
    expect(noLabel?.querySelector('.dpk-card-title')?.textContent).toBe('d');
  });

  it('shows the reason and the tradeoffs only where the author wrote them', async () => {
    const element = await mount();
    const [rejected, adopted] = root(element).querySelectorAll<HTMLElement>('li.option');
    expect(rejected?.querySelector('.option-fact > dt')?.textContent).toBe('Reason');
    expect(rejected?.querySelector('.option-fact > dd')?.textContent?.trim()).toBe('Nothing to consume it');
    expect(rejected?.querySelector('.option-tradeoffs')).toBeNull();

    expect(adopted?.querySelector('.option-fact > dt')?.textContent).toBe('Tradeoffs');
    expect(adopted?.querySelectorAll('.option-tradeoffs > li')).toHaveLength(1);
  });

  it('marks the taken option with the card tone and a ring, never a stripe down one side', async () => {
    const element = await mount();
    const statuses = [...root(element).querySelectorAll<HTMLElement>('li.option')].map(
      (option) => option.dataset['status'],
    );
    // Only the adopted option is called out; the rest stay neutral cards.
    expect(statuses.filter((status) => status === 'adopted')).toEqual(['adopted']);

    const css = ownStyles();
    expect(css).toMatch(/\.option\[data-status='adopted'\] \.dpk-card/);
    expect(css).toContain('--dpk-card-tone: var(--dpk-green)');
  });

  it('draws no side stripe, in the stylesheet or on any rendered element', async () => {
    const element = await mount();
    expect(ownStyles()).not.toMatch(/border-(?:left|inline-start)/);
    const inlined = [...root(element).querySelectorAll('*')].filter((node) =>
      /border-left|border-inline-start/.test(node.getAttribute('style') ?? ''),
    );
    expect(inlined).toEqual([]);
  });

  it('says so inline when there is nothing to compare', async () => {
    const element = await mount('');
    expect(root(element).querySelector('.alternatives-empty')?.textContent).toBe('No alternatives to compare.');
    expect(cards(element)).toEqual([]);
  });

  it('says so inline, without throwing, when the data is invalid', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const element = await mount(`<script type="application/json">
      { "options": [{ "id": "a", "status": "adopted" }, { "id": "a", "status": "rejected" }] }
    </script>`);

    expect(root(element).querySelector('[role="alert"]')?.textContent).toContain('duplicate option id: a');
    expect(root(element).querySelector('.alternatives-notice')?.textContent).toContain(
      'The alternatives could not be read.',
    );
    expect(cards(element)).toEqual([]);
    expect(element.dataError).toMatch(/duplicate option id: a/);
    error.mockRestore();
  });

  it('labels the section, defaults the label, and hides it when the author asks for none', async () => {
    const element = await mount();
    expect(root(element).querySelector('.alternatives-label')?.textContent).toBe('Alternatives');
    element.heading = 'What we weighed';
    for (let index = 0; index < 3; index++) await element.updateComplete;
    expect(root(element).querySelector('.alternatives-label')?.textContent).toBe('What we weighed');
    element.heading = '';
    for (let index = 0; index < 3; index++) await element.updateComplete;
    expect(root(element).querySelector('.alternatives-label')).toBeNull();
  });

  it('takes the comparison as a property as well as a JSON child', async () => {
    const element = await mount('');
    element.data = {
      options: [{ id: 'only', status: 'adopted', label: 'One', summary: null, reason: null, tradeoffs: [] }],
    };
    for (let index = 0; index < 3; index++) await element.updateComplete;
    expect(cards(element)).toHaveLength(1);
    expect(cards(element)[0]?.querySelector('.dpk-card-title')?.textContent).toBe('One');
  });

  it('renders its own text in the page language', async () => {
    const page = document.createElement('div');
    page.lang = 'ja';
    const element = document.createElement('dpk-alternatives') as DpkAlternatives;
    element.innerHTML = JSON_CHILD;
    page.append(element);
    document.body.append(page);
    for (let index = 0; index < 3; index++) await element.updateComplete;
    expect(root(element).querySelector('.alternatives-label')?.textContent).toBe('代替案');
    expect(root(element).querySelector('.status')?.textContent).toBe('却下');
  });
});
