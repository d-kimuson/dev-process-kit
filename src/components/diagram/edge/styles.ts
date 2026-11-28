import { css } from 'lit';

/**
 * The paint every diagram's edges share: the dash patterns, the end glyphs and
 * the flow overlay. The line's own colour lives on the base `.d-edge-path` rule
 * (`src/boards/base/styles.ts`), which reads the same `--d-edge-line`; a board paints its own
 * colours through `--d-edge-line` (path, glyphs and flow together) and
 * `--d-edge-paper` (a hollow glyph's interior) rather than restating these
 * rules, so a change here reaches every diagram at once.
 *
 * Concatenated into `canvasStyles` (`src/boards/base/styles.ts`), so every board that takes
 * the shared diagram shell gets it before its own styles.
 */
export const edgeStyles = css`
  /* A dashed or dotted line: a removed relation, a message flow, an association. */
  .d-edge.is-dashed .d-edge-path {
    stroke-dasharray: 5 4;
  }

  .d-edge.is-dotted .d-edge-path {
    stroke-dasharray: 0.1 4;
    stroke-linecap: round;
  }

  /*
   * End glyphs take the line's own colour; a closed shape's interior is either
   * the line, the paper behind it, or left hollow. Drawn as shapes (not
   * <marker>s), so they keep a fixed size instead of scaling with the stroke.
   */
  .d-edge-end {
    stroke: var(--d-edge-line, var(--dpk-rule-strong));
    fill: none;
    pointer-events: none;
  }

  .d-edge-end [data-paint='line'] {
    fill: var(--d-edge-line, var(--dpk-rule-strong));
  }

  .d-edge-end [data-paint='paper'] {
    fill: var(--d-edge-paper, var(--dpk-paper-sunken));
  }

  /* The flow overlay: dots running along the line while it is active, lit or selected. */
  .d-edge-flow {
    fill: none;
    stroke: none;
    pointer-events: none;
  }

  .d-edge:is(.is-flowing, .is-lit, .is-selected) .d-edge-flow {
    stroke: var(--d-edge-line, var(--dpk-rule-strong));
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 0.1 13;
    animation: d-edge-flow 900ms linear infinite;
  }

  @keyframes d-edge-flow {
    to {
      stroke-dashoffset: -13.1;
    }
  }

  /* Reduced motion keeps the dots, just still. */
  @media (prefers-reduced-motion: reduce) {
    .d-edge:is(.is-flowing, .is-lit, .is-selected) .d-edge-flow {
      animation: none;
    }
  }
`;
