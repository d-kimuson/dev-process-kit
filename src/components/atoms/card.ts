import { css } from 'lit';

/**
 * The card atom and the small pieces a card is built from, back-ported from the
 * user story map's story card (the kit's most worked-on card).
 *
 * A card wears a tone the way a modern board does: a flat, barely tinted face
 * and a hairline edge in that hue, with a neutral, soft elevation. Tints are
 * mixed in OKLab so every hue stays clean instead of turning muddy. The tone is
 * `data-tone` (a named tone) or `--dpk-card-tone` (any color, set on the card
 * or an ancestor).
 *
 * A component that draws cards in its own shadow root adopts `cardAtom` and
 * renders `.dpk-card`, so a page's cards and the templates' cards are one
 * design.
 */
export const cardAtom = css`
  :where(.dpk-card) {
    --_card-tone: var(--dpk-card-tone, var(--dpk-ink-faint));
    position: relative;
    display: flow-root;
    min-width: 0;
    padding: 12px 13px;
    border: 1px solid color-mix(in oklab, var(--_card-tone) 24%, var(--dpk-rule));
    border-radius: 12px;
    background: color-mix(in oklab, var(--_card-tone) 6%, var(--dpk-paper-raised));
    color: var(--dpk-ink-soft);
    box-shadow:
      0 1px 1px var(--dpk-shade-1),
      0 2px 6px -3px var(--dpk-shade-2);
    transition:
      box-shadow var(--dpk-dur) var(--dpk-ease),
      transform var(--dpk-dur) var(--dpk-ease),
      border-color var(--dpk-dur) var(--dpk-ease),
      opacity var(--dpk-dur) var(--dpk-ease),
      filter var(--dpk-dur) var(--dpk-ease);
  }

  :where(.dpk-card[data-tone]) {
    --_card-tone: var(--tone);
  }

  /* Flow layout, not grid: inline author content stays on one line. */
  :where(.dpk-card) > :where(*) {
    margin: 0;
  }

  :where(.dpk-card) > :where(* + *) {
    margin-top: var(--dpk-card-gap, 8px);
  }

  :where(.dpk-card) :where(h3, h4) {
    color: var(--dpk-ink);
    font-size: 13.5px;
  }

  /* A card that opens something lifts under the pointer. */
  :where(a.dpk-card, button.dpk-card, .dpk-card[tabindex], .dpk-card[data-interactive]) {
    cursor: pointer;
  }

  :where(a.dpk-card) {
    color: inherit;
    text-decoration: none;
  }

  :where(button.dpk-card) {
    width: 100%;
    font: inherit;
    text-align: start;
  }

  /* A card that opens something lifts under the pointer: it rises by the kit's
     one lift step, its edge warms toward its own tone and its elevation grows
     into the room the rise leaves under it. Transform only — the cards beside
     it never move. */
  :where(a.dpk-card:hover, button.dpk-card:hover, .dpk-card[tabindex]:hover, .dpk-card[data-interactive]:hover) {
    border-color: color-mix(in oklab, var(--_card-tone) 45%, var(--dpk-rule));
    box-shadow:
      0 1px 2px var(--dpk-shade-1),
      0 8px 20px -10px var(--dpk-shade-3);
    transform: translateY(var(--dpk-lift));
  }

  /* Pressed, it settles back down: the gesture a button makes under the finger. */
  :where(a.dpk-card:active, button.dpk-card:active, .dpk-card[tabindex]:active, .dpk-card[data-interactive]:active) {
    transform: translateY(0) scale(var(--dpk-press));
  }

  :where(.dpk-card:focus-visible) {
    outline: none;
    border-color: var(--dpk-blue);
    box-shadow: var(--dpk-focus);
  }

  /* The card the reader has open or picked. */
  :where(
    .dpk-card[aria-current='true'],
    .dpk-card[aria-selected='true'],
    .dpk-card[aria-pressed='true'],
    .dpk-card[data-chosen],
    .dpk-card[data-state~='selected']
  ) {
    border-color: var(--dpk-blue);
    box-shadow:
      0 0 0 3px color-mix(in oklab, var(--dpk-blue) 20%, transparent),
      0 8px 20px -10px var(--dpk-shade-3);
  }

  /* A highlight across many cards (a path, a search hit): the cards on it stand out, the rest step back. */
  :where(.dpk-card[data-state~='highlight']) {
    border-color: color-mix(in oklab, var(--dpk-accent) 70%, var(--dpk-rule));
    box-shadow:
      0 0 0 2px color-mix(in oklab, var(--dpk-accent) 28%, transparent),
      0 8px 20px -10px var(--dpk-shade-3);
  }

  :where(.dpk-card[data-state~='dimmed']) {
    opacity: 0.4;
    filter: saturate(0.4);
  }

  :where(.dpk-card[data-state~='dimmed']:is(:hover, :focus-visible, [data-state~='selected'])) {
    opacity: 0.85;
    filter: none;
  }

  :where(.dpk-card[data-state~='dragging']) {
    opacity: 0.45;
    transform: none;
  }

  /* A card related to the one in focus: a dashed ring in its tone, outside the edge. */
  :where(.dpk-card[data-state~='marked']) {
    outline: 2px dashed var(--dpk-card-mark, var(--dpk-amber));
    outline-offset: 2px;
  }

  :where(.dpk-card[data-variant='sunken']) {
    border-color: transparent;
    background: var(--dpk-paper-sunken);
    box-shadow: none;
  }

  /* ------------------------------------------------------------ card parts */

  :where(.dpk-card-head) {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
  }

  :where(.dpk-card-title) {
    flex: 1 1 auto;
    min-width: 0;
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  /* The size and the owner at the end of the head, small, like a ticket's. */
  :where(.dpk-card-meta) {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  /* The body, cut after --dpk-card-lines lines (3). */
  :where(.dpk-card-text) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: var(--dpk-card-lines, 3);
    overflow: hidden;
    color: var(--dpk-ink-soft);
    font-size: 12px;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  :where(.dpk-card-text) > :where(*) {
    margin: 0;
  }

  :where(.dpk-card-text) :where(h1, h2, h3, h4, h5, h6) {
    font-size: inherit;
    font-weight: 650;
  }

  :where(.dpk-card-text) :where(ul, ol) {
    padding-left: 1.2em;
  }

  :where(.dpk-card-text) :where(code) {
    padding: 0 3px;
    border-radius: 4px;
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 0.92em;
  }

  :where(.dpk-card-text) :where(a) {
    color: var(--dpk-blue);
  }

  /* A row of chips (labels, links, dependencies). */
  :where(.dpk-card-row) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  /* Where the item sits and what was said about it. */
  :where(.dpk-card-foot) {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  /* The key people call the item by, quiet like a ticket number. */
  :where(.dpk-card-key) {
    flex: none;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-weight: 600;
    line-height: 18px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  :where(.dpk-card-chip) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 1px 7px;
    border-radius: 6px;
    background: color-mix(in oklab, var(--_card-tone, var(--dpk-ink-faint)) 10%, var(--dpk-paper-sunken));
    color: var(--dpk-ink-soft);
    font-size: 10.5px;
    font-weight: 600;
    line-height: 18px;
    white-space: nowrap;
  }

  :where(.dpk-card-chip) > :where(span) {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :where(.dpk-card-chip) > :where(svg) {
    flex: none;
    width: 12px;
    height: 12px;
  }

  /* A count (comments, reviews): bare mono figures; a data-tone colors it. */
  :where(.dpk-card-chip[data-variant='count']) {
    background: transparent;
    color: var(--tone, var(--dpk-ink-faint));
    font-family: var(--dpk-mono);
    font-variant-numeric: tabular-nums;
  }

  /* The counts sit at the right end of the foot. */
  :where(.dpk-card-foot) > :where(:not([data-variant='count'])) + :where([data-variant='count']) {
    margin-left: auto;
  }

  /* A size (an estimate, a version): a small boxed mono figure. */
  :where(.dpk-card-chip[data-variant='outline']) {
    padding: 0 6px;
    border: 1px solid color-mix(in oklab, var(--_card-tone, var(--dpk-ink-faint)) 30%, var(--dpk-rule-strong));
    border-radius: 5px;
    background: var(--dpk-paper-raised);
    font-family: var(--dpk-mono);
    font-weight: 650;
    line-height: 17px;
    font-variant-numeric: tabular-nums;
  }

  /* ------------------------------------------------------------ pill / avatar */

  /* A label in its own color: a dot and a name on a tinted pill. Any color through --tone. */
  :where(.dpk-pill) {
    --_pill-tone: var(--tone, var(--dpk-ink-faint));
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    max-width: 100%;
    padding: 0 7px;
    border: 1px solid color-mix(in oklab, var(--_pill-tone) 35%, transparent);
    border-radius: 999px;
    background: color-mix(in oklab, var(--_pill-tone) 12%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    font-size: 10.5px;
    font-weight: 600;
    line-height: 17px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(.dpk-pill)::before {
    content: '';
    flex: none;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--_pill-tone);
  }

  /* A person by their initial, in their color. data-size: sm (18px, default), md (24px), lg (34px). */
  :where(.dpk-avatar) {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--tone, var(--dpk-blue));
    color: var(--dpk-paper-raised);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }

  :where(.dpk-avatar[data-size='md']) {
    width: 24px;
    height: 24px;
    font-size: 11.5px;
  }

  :where(.dpk-avatar[data-size='lg']) {
    width: 34px;
    height: 34px;
    font-size: 14px;
    font-weight: 650;
  }

  /* Overlapping avatars: a team on one card. */
  :where(.dpk-avatars) {
    display: inline-flex;
  }

  :where(.dpk-avatars) > :where(.dpk-avatar) {
    box-shadow: 0 0 0 2px var(--dpk-paper-raised);
  }

  :where(.dpk-avatars) > :where(.dpk-avatar + .dpk-avatar) {
    margin-left: -5px;
  }

  /* A label and a face land in their place: the same pop a count uses, so the
     small figures on a card read as one family of "just appeared" marks. */
  @media (prefers-reduced-motion: no-preference) {
    :where(.dpk-pill, .dpk-avatar) {
      animation: dpk-pop var(--dpk-dur) var(--dpk-ease-spring);
    }
  }
`;
