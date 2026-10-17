/**
 * Supplements: author markup that backs the page up (an ERD, a checklist, a
 * sequence diagram), each slotted as `slot="supplement"` with a `data-name`.
 * The shell lines their names up in a bar at the bottom of the main column and
 * the reader opens one at a time.
 */
export const SUPPLEMENT_SLOT = 'supplement';

/** The slot supplements replaced; content left in it is no longer shown. */
export const LEGACY_MEMO_SLOT = 'memo';

export type Supplement = {
  readonly name: string;
  readonly element: Element;
};

/** The host's supplements in the order the author wrote them; one without a name takes `fallback`. */
export const supplementsOf = (host: Element, fallback: string): readonly Supplement[] =>
  [...host.children]
    .filter((element) => element.getAttribute('slot') === SUPPLEMENT_SLOT)
    .map((element) => {
      const name = element.getAttribute('data-name')?.trim() ?? '';
      return { name: name === '' ? fallback : name, element };
    });

/**
 * Hides every slotted supplement but the open one, leaving the author's light
 * DOM as written. `!important` because a page style on the element itself would
 * otherwise win over `::slotted`.
 */
export const openSupplementRule = (host: Element, open: Supplement): string => {
  const position = [...host.children].indexOf(open.element) + 1;
  return `.dpk-supplements-body ::slotted(:not(:nth-child(${position}))) { display: none !important; }`;
};

/** Which supplement the bar points at, and whether it is open; folding keeps the pick to reopen. */
export type SupplementView = {
  readonly selected: Element | null;
  readonly open: boolean;
};

export const FOLDED_SUPPLEMENTS: SupplementView = { selected: null, open: false };

/** The open supplement, if the one picked is still slotted. */
export const openSupplementOf = (view: SupplementView, supplements: readonly Supplement[]): Supplement | null =>
  view.open ? (supplements.find((supplement) => supplement.element === view.selected) ?? null) : null;

/** A tab opens its supplement, or folds it when it is the open one. */
export const pressSupplement = (view: SupplementView, element: Element): SupplementView => ({
  selected: element,
  open: !(view.open && view.selected === element),
});

/** The chevron folds the bar, or reopens the supplement last opened (the first, failing that). */
export const toggleSupplements = (view: SupplementView, supplements: readonly Supplement[]): SupplementView => {
  if (view.open) return { ...view, open: false };
  const kept = supplements.some((supplement) => supplement.element === view.selected);
  return { selected: kept ? view.selected : (supplements[0]?.element ?? null), open: true };
};
