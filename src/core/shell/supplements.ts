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
