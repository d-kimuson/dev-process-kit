import { css } from 'lit';

/**
 * A board drawn with `chrome="none"`: the legend moves out of the overlay
 * (which floats over a canvas) and into the panel's footer, in the page's own
 * flow below the figure. It reads as a caption, not as a floating key.
 */
export const chromelessCanvasStyles = css`
  .diagram-legend-flow .diagram-legend {
    position: static;
    max-width: none;
    margin: 4px 12px 0;
    backdrop-filter: none;
    box-shadow: none;
  }
`;
