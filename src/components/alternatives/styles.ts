import { css } from 'lit';

import { tokens } from '../../core/theme';
import { cardAtom } from '../atoms/card';

/**
 * Alternatives styling. The options are the kit's card atom (`atoms/card`), laid
 * out as a comparison grid; what is local to this component is the grid, the
 * status chip and the taken option's emphasis.
 *
 * Every option is a neutral card. The taken one is marked the way a card may be
 * marked — its own tone on all four sides, a soft green face and a ring outside
 * the edge — never a stripe down one side (see the card principle in
 * `dev-docs/guidelines/coding.md`).
 */
export const alternativesStyles = [
  tokens,
  cardAtom,
  css`
    :host {
      display: block;
      color: var(--dpk-ink);
      font-family: var(--dpk-body);
    }

    .alternatives {
      display: grid;
      gap: 10px;
    }

    /* A concise section label, quiet enough to sit above cards in a document. */
    .alternatives-label {
      margin: 0;
      padding: 0 2px;
    }

    /* Cards wrap into columns once the page has room; one option takes the row. */
    .options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(216px, 100%), 1fr));
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    /* A grid item that stretches, so the cards in a row share their height. */
    .option {
      display: grid;
      min-width: 0;
    }

    /*
     * The taken option: the card's own tone (a green hairline edge and a barely
     * green face), plus a ring outside the edge so the eye finds it in a row of
     * neutral cards. Weight and hue, not a bar down one side.
     */
    .option[data-status='adopted'] .dpk-card {
      --dpk-card-tone: var(--dpk-green);
      box-shadow:
        0 0 0 2px color-mix(in oklab, var(--dpk-green) 26%, transparent),
        var(--dpk-bevel),
        0 10px 22px -14px color-mix(in oklab, var(--dpk-green) 60%, var(--dpk-shade-3));
    }

    /* ------------------------------------------------------------ status */

    [data-tone='adopted'] {
      --tone: var(--dpk-green);
      --tone-soft: var(--dpk-green-soft);
    }

    [data-tone='rejected'] {
      --tone: var(--dpk-amber);
      --tone-soft: var(--dpk-amber-soft);
    }

    [data-tone='considered'] {
      --tone: var(--dpk-blue);
      --tone-soft: var(--dpk-blue-soft);
    }

    /* The chip's box comes from the card atom; only its tone is set here. */
    .status {
      background: var(--tone-soft);
      color: var(--tone);
      font-weight: 650;
    }

    /* -------------------------------------------------------------- body */

    .option-summary {
      margin: 0;
      color: var(--dpk-ink-soft);
      font-size: 12.5px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .option-facts {
      display: grid;
      gap: 8px;
      margin: 0;
    }

    .option-fact {
      display: grid;
      gap: 1px;
    }

    .option-fact > dd {
      margin: 0;
      color: var(--dpk-ink-soft);
      font-size: 12.5px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .option-tradeoffs {
      display: grid;
      gap: 2px;
      margin: 0;
      padding-left: 16px;
    }

    .option-tradeoffs > li::marker {
      color: var(--dpk-ink-faint);
    }

    /* ------------------------------------------------------- notice/empty */

    .alternatives-notice,
    .alternatives-empty {
      margin: 0;
      padding: 12px 14px;
      border-radius: var(--dpk-radius);
      font-size: 12.5px;
      line-height: 1.6;
    }

    .alternatives-notice {
      background: var(--dpk-danger-soft);
      color: var(--dpk-danger);
    }

    .alternatives-empty {
      color: var(--dpk-ink-faint);
      text-align: center;
    }
  `,
];
