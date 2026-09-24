import { css } from 'lit';

/** Sidebar navigation, stage and preview frames of `<dpk-template-prototype>`. */
export const prototypeStyles = css`
  :host {
    --dpk-prototype-accent: var(--dpk-blue);
  }

  /* ---------------------------------------------------------------- sidebar */

  .nav {
    display: grid;
    gap: 14px;
    align-content: start;
    min-width: 188px;
  }

  .field {
    display: grid;
    gap: 5px;
  }

  .steps-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--dpk-rule);
  }

  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
    max-height: 38vh;
    overflow: auto;
  }

  .step-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px 0 9px;
    border-radius: var(--dpk-radius-sm);
    transition:
      background 140ms ease,
      box-shadow 140ms ease;
  }

  .step-row:hover {
    background: var(--dpk-paper-inset);
  }

  .step-row[data-current='true'] {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-prototype-accent) 10%, var(--dpk-paper-raised)),
      color-mix(in srgb, var(--dpk-prototype-accent) 5%, var(--dpk-paper-raised))
    );
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--dpk-prototype-accent) 22%, transparent),
      var(--dpk-shadow-xs);
  }

  .step-row[data-current='true']::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: var(--dpk-radius-xs);
    background: linear-gradient(180deg, var(--dpk-blue), var(--dpk-blue-strong));
    box-shadow: 0 0 8px color-mix(in srgb, var(--dpk-prototype-accent) 45%, transparent);
  }

  .step-link {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 7px;
    padding: 7px 0;
    text-decoration: none;
    color: var(--dpk-ink-soft);
    font-size: 12.5px;
    font-weight: 460;
  }

  .step-row[data-current='true'] .step-link {
    color: var(--dpk-ink);
    font-weight: 550;
  }

  .step-index {
    flex: 0 0 auto;
    min-width: 17px;
    padding: 1px 4px;
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-inset);
    font-family: var(--dpk-mono);
    font-size: 9.5px;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--dpk-ink-faint);
    transition:
      background 140ms ease,
      color 140ms ease;
  }

  .step-row[data-current='true'] .step-index {
    background: linear-gradient(180deg, var(--dpk-blue), var(--dpk-blue-strong));
    color: #fff;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28);
  }

  .step-name {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .step-note {
    margin-left: auto;
    min-width: 16px;
    padding: 1px 5px;
    border-radius: 999px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
    font-family: var(--dpk-mono);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .row-tools {
    display: flex;
    gap: 0;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .step-row:hover .row-tools,
  .step-row[data-current='true'] .row-tools {
    opacity: 1;
  }

  .detail {
    display: grid;
    gap: 12px;
    padding: 12px 12px 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }

  .detail-row {
    display: grid;
    gap: 4px;
  }

  .detail-value {
    font-size: 12.5px;
    color: var(--dpk-ink-soft);
  }

  .nav-empty {
    font-size: 12px;
    line-height: 1.6;
    color: var(--dpk-ink-faint);
  }

  /* ------------------------------------------------------------------ stage */

  .stage {
    display: grid;
    gap: 14px;
    width: 100%;
    min-width: 0;
  }

  .stage-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .tabs {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--dpk-rule);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
  }

  .tab {
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    text-decoration: none;
    color: var(--dpk-ink-soft);
    white-space: nowrap;
    transition:
      background 120ms ease,
      color 120ms ease;
  }

  .tab:hover {
    color: var(--dpk-ink);
    background: var(--dpk-paper-raised);
  }

  .tab[data-current='true'] {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-weight: 600;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .stage-empty {
    max-width: 62ch;
    padding: 16px 18px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-sunken);
    font-size: 13px;
    line-height: 1.7;
    color: var(--dpk-ink-soft);
  }

  /* ----------------------------------------------------------------- canvas */

  /*
   * The work surface the frame sits on: a quiet dot lattice that reads as a
   * canvas rather than empty page background, giving the frame somewhere to
   * cast its shadow.
   */
  .canvas {
    display: flex;
    justify-content: center;
    padding: 30px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-xl);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
  }

  /* ------------------------------------------------------------------ frame */

  .frame {
    width: min(var(--frame-width), 100%);
    max-width: 100%;
    margin: 0;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    overflow: hidden;
    transition: box-shadow 200ms var(--dpk-ease);
  }

  .chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-paper-raised) 88%, transparent),
      color-mix(in srgb, var(--dpk-paper-inset) 88%, transparent)
    );
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--dpk-rule);
    box-shadow: inset 0 1px 0 var(--dpk-highlight);
  }

  .dots {
    display: inline-flex;
    gap: 5px;
  }

  .dots i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--dpk-rule-strong);
  }

  .dots i:nth-child(1) {
    background: #ff5f57;
  }

  .dots i:nth-child(2) {
    background: #febc2e;
  }

  .dots i:nth-child(3) {
    background: #28c840;
  }

  .chrome .url {
    flex: 1;
    min-width: 0;
    padding: 4px 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    color: var(--dpk-ink-faint);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /*
   * Native previews are recognised by their device shape: a slim bezel, a status
   * bar with a punch-hole camera, and a home indicator. No address bar.
   */
  .frame[data-kind='native'] {
    padding: 10px;
    border-color: #22262e;
    border-radius: 28px;
    background: linear-gradient(160deg, #2e3440, #1a1d24);
    box-shadow:
      var(--dpk-shadow-lg),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .frame[data-kind='native'] .viewport {
    overflow: hidden;
    border-radius: 18px;
  }

  /* A phone is portrait: derive the screen height from its width (~1:2.05)
     instead of reusing the browser preview heights. */
  .frame[data-kind='native'][data-viewport='mobile'] .viewport {
    min-height: calc((var(--frame-width, 390px) - 16px) * 2.05);
  }

  .status-bar {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    padding: 0 12px;
    background: #0c0e13;
    color: #e9edf4;
    font-size: 11.5px;
    font-weight: 550;
    font-variant-numeric: tabular-nums;
  }

  .status-time {
    letter-spacing: 0.02em;
  }

  .punch-hole {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 10px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: #04060a;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
  }

  .status-wifi {
    width: 15px;
    height: 12px;
    fill: currentColor;
    color: #e9edf4;
  }

  /* Home indicator. */
  .frame[data-kind='native'] .viewport::after {
    content: '';
    position: absolute;
    bottom: 8px;
    left: 50%;
    width: 88px;
    height: 4px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(138, 146, 160, 0.55);
  }

  /*
   * The preview is never scrolled on its own: it shows everything it contains and
   * the page scrolls as a whole. The flex column keeps a short mock filling
   * the frame's minimum height without pinning a maximum.
   */
  .viewport {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: var(--frame-min-height, 480px);
    /* A preview is the product's screen, not the kit's chrome: it stays light in a dark theme. */
    color-scheme: light;
    background: #fff;
  }

  /*
   * The author's wrapper becomes the frame's filling layer: a one-cell grid makes
   * its height definite, so a mock that asks for height:100% fills the frame
   * instead of collapsing to its content.
   */
  /*
   * The author's wrapper is a stretch row: a mock fills a short frame and grows
   * the frame when its own content is taller. Stretching (rather than a
   * percentage height) is what makes the fill reliable.
   */
  /* Only the viewport carries the minimum height; the wrapper grows to fill it. */
  .viewport ::slotted(*) {
    display: grid;
    flex: 1 0 auto;
    min-width: 0;
  }

  .frame-placeholder {
    position: absolute;
    inset: 12px;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 8px;
    padding: 12px;
    text-align: center;
    color: var(--dpk-ink-faint);
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
  }

  .frame-placeholder code {
    padding: 3px 7px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    font-family: var(--dpk-mono);
    font-size: 10px;
  }

  .parked {
    display: none;
  }
`;
