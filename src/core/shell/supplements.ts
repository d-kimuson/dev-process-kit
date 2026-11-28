/**
 * Supplements: author markup that backs the page up (an ERD, a checklist, a
 * sequence diagram), each slotted as `slot="supplement"` with a `data-name`.
 * Each one is a section of the side panel, labelled by its name, kept by
 * whichever element owns the panel: a standalone view, or the page around it.
 */
import { css } from 'lit';

export const SUPPLEMENT_SLOT = 'supplement';

/** The slot supplements replaced; content left in it is no longer shown. */
export const LEGACY_MEMO_SLOT = 'memo';

/** The element's own supplements, in the order written. */
export const supplementsOf = (host: Element): readonly Element[] =>
  Array.from(host.children).filter((child) => child.getAttribute('slot') === SUPPLEMENT_SLOT);

/** For the panel owner's shadow root: a supplement shows only while the panel is on it. */
export const supplementStyles = css`
  ::slotted([slot='supplement']:not([data-dpk-panel-active])) {
    display: none !important;
  }

  ::slotted([slot='supplement']) {
    display: block;
    max-width: 100%;
    font-size: 12.5px;
    line-height: 1.7;
    color: var(--dpk-ink-soft);
  }
`;
