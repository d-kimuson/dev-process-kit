import { css } from 'lit';

/**
 * The slide is a 16:9 container, and everything on it is sized in `cqw` (a
 * percentage of the slide's width): the same slide reads the same in the
 * review layout, in a narrow window and in full screen. Author markup in the
 * body inherits the font size, so text sized in `em` scales with it too.
 */
export const slidesStyles = css`
  /* ------------------------------------------------------------ outline */

  .outline-head {
    display: flex;
    justify-content: space-between;
    padding: 0 6px 8px;
    border-bottom: 1px solid var(--dpk-rule);
    margin-bottom: 6px;
  }

  .outline-row {
    position: relative;
  }

  .outline-row a {
    align-items: baseline;
    gap: 10px;
    padding: 7px 8px;
  }

  /* A section slide opens a chapter: it reads as a heading in the outline. */
  .outline-row[data-layout='section']:not(:first-child) {
    margin-top: 10px;
  }

  .outline-row[data-layout='section'] .outline-title,
  .outline-row[data-layout='title'] .outline-title {
    font-weight: 620;
    color: var(--dpk-ink);
  }

  .outline-index {
    flex: none;
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  .outline-row[data-current='true'] .outline-index {
    color: var(--dpk-accent);
  }

  .outline-title {
    flex: 1;
    min-width: 0;
  }

  .outline-note {
    flex: none;
    min-width: 18px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-family: var(--dpk-mono);
    font-size: 10px;
    text-align: center;
  }

  /* -------------------------------------------------------------- deck */

  .deck {
    display: grid;
    /* The column follows the main area, not the widest thing in it. */
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    justify-items: center;
  }

  .deck-empty {
    display: block;
    max-width: none;
    margin: 48px auto;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: var(--dpk-ink-faint);
    font-size: inherit;
    line-height: inherit;
    text-align: start;
  }

  /*
   * The work surface the slide is projected onto: a quiet dot lattice, sunken
   * a shade below the page, so the slide's own shadow has somewhere to land.
   */
  .stage {
    display: flex;
    justify-content: center;
    width: 100%;
    padding: 28px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-xl);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
    box-shadow: inset 0 1px 3px var(--dpk-shade-1);
  }

  /*
   * As wide as the column allows, but never taller than the window leaves room
   * for: the header, the bar and the comments beneath (the list at its full
   * height and the form) and the padding around them. The form stays on screen.
   */
  .slide {
    position: relative;
    width: min(100%, 1180px, max(420px, calc((100dvh - 340px) * 16 / 9)));
    aspect-ratio: 16 / 9;
    overflow: hidden;
    container-type: inline-size;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
  }

  .slide-content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 2.2cqw;
    /* The bottom keeps the last line clear of the page number once it scrolls. */
    padding: 5.5cqw 6.5cqw 6cqw;
    overflow: auto;
    overflow-wrap: anywhere;
    font-size: 2.1cqw;
    line-height: 1.55;
    color: var(--dpk-ink-soft);
  }

  .slide-title {
    font-size: 3.6cqw;
    font-weight: 680;
    line-height: 1.2;
    letter-spacing: -0.015em;
    color: var(--dpk-ink);
  }

  .slide-subtitle {
    margin: 0;
    font-size: 2.4cqw;
    color: var(--dpk-ink-soft);
  }

  .slide-points {
    display: grid;
    gap: 1.3cqw;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 2.5cqw;
    color: var(--dpk-ink);
  }

  .slide-points li {
    position: relative;
    padding-left: 2.6cqw;
  }

  .slide-points li::before {
    content: '';
    position: absolute;
    left: 0.2cqw;
    top: 0.62em;
    width: 0.9cqw;
    height: 0.9cqw;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--dpk-accent) 14%, transparent);
  }

  .slide-body {
    flex: 1 1 auto;
    min-height: 0;
  }

  .slide-body ::slotted(*) {
    margin: 0;
  }

  /* Over the content, which may scroll beneath it: a backdrop keeps both legible. */
  .slide-number {
    position: absolute;
    right: 2cqw;
    bottom: 1.6cqw;
    z-index: 1;
    padding: 0.3cqw 0.7cqw;
    border-radius: 999px;
    background: color-mix(in srgb, var(--dpk-paper-raised) 88%, transparent);
    font-family: var(--dpk-mono);
    font-size: 1.2cqw;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  /* The cover: large title, the subtitle beneath, an accent rule on the left. */
  /* \`safe\`: content taller than the slide starts at the top, where scrolling reaches it. */
  .slide[data-layout='title'] .slide-content {
    justify-content: safe center;
    padding-left: 9cqw;
  }

  .slide[data-layout='title'] .slide-content::before {
    content: '';
    position: absolute;
    left: 6.5cqw;
    top: 50%;
    width: 0.55cqw;
    height: 16cqw;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
    box-shadow: 0 0 20px color-mix(in srgb, var(--dpk-accent) 35%, transparent);
    transform: translateY(-50%);
  }

  .slide[data-layout='title'] .slide-title {
    font-size: 5.6cqw;
  }

  .slide[data-layout='title'] .slide-body,
  .slide[data-layout='section'] .slide-body {
    flex: 0 0 auto;
  }

  /* A chapter divider: the title alone, on the accent tint. */
  .slide[data-layout='section'] {
    background: linear-gradient(135deg, var(--dpk-accent-soft), transparent 70%), var(--dpk-paper-raised);
  }

  .slide[data-layout='section'] .slide-content {
    justify-content: safe center;
  }

  .slide[data-layout='section'] .slide-title {
    font-size: 4.8cqw;
  }

  .slide[data-layout='section'] .slide-title::after {
    content: '';
    display: block;
    width: 7cqw;
    height: 0.5cqw;
    margin-top: 2.4cqw;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
  }

  /* Full screen, entered from the presentation surface: the slide as large as the screen allows. */
  .presentation:fullscreen {
    align-items: center;
    padding: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: var(--dpk-dots), var(--dpk-paper-sunken);
  }
  .presentation:fullscreen .slide {
    width: min(100vw, calc(100vh * 16 / 9));
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  /* ------------------------------------------------------------ notes */

  /*
   * The presenter's material, under the stage and never on it: what is written
   * here is shown to the presenter alone (here, and in presentation mode).
   */
  .slide-notes {
    display: grid;
    gap: 8px;
    width: min(100%, 1180px);
    padding: 12px 14px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper);
  }

  .slide-notes-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
  }

  .slide-notes-hint {
    font-size: 11.5px;
    color: var(--dpk-ink-faint);
  }

  .slide-notes-input {
    min-height: 56px;
    resize: vertical;
    font-size: 13px;
  }

  .slide-notes-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }

  .slide-notes-submit-hint {
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    color: var(--dpk-ink-faint);
    white-space: nowrap;
  }

  /* ------------------------------------------------------ presentation */

  /*
   * Presentation mode: the slide as the whole screen, owned by the view rather
   * than by the browser's full screen API, so it works in a sandboxed frame and
   * can be exercised without a browser. It covers the shell, including the
   * outline and the deck bar, which are not rendered while it is open.
   */
  .presentation {
    position: fixed;
    inset: 0;
    /*
     * It is a manual popover, and the UA's [popover] rule sizes that to the
     * content (width: fit-content) and centres it with margin: auto, which
     * would leave the stage a small box in the middle of the screen rather than
     * the screen itself. Pinned to all four edges with an automatic size, it
     * covers the viewport.
     */
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    margin: 0;
    z-index: 60;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto;
    justify-items: center;
    align-content: center;
    gap: 14px;
    padding: 20px clamp(16px, 3vw, 40px);
    background: var(--dpk-dots), var(--dpk-paper-sunken);
  }

  .presentation:focus-visible {
    outline: none;
  }

  .presentation-stage {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 0;
  }

  /* As large as the screen allows, leaving room for the bar and the notes. */
  .presentation .slide {
    width: min(100%, calc((100dvh - 200px) * 16 / 9));
    border: none;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
  }

  .presentation-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-glass);
    backdrop-filter: blur(12px);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .presentation-move {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .presentation-move .dpk-icon-btn {
    width: 30px;
    height: 30px;
  }

  .presentation-bar .dpk-btn svg {
    width: 14px;
    height: 14px;
  }

  .presentation-notes {
    width: min(100%, 1180px);
    max-height: 22dvh;
    overflow-y: auto;
    padding: 10px 14px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper);
  }

  .presentation-notes-body {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--dpk-ink);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* ---------------------------------------------------------------- bar */

  .deck-bar {
    width: min(100%, 1180px);
    padding: 8px 12px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-glass);
    backdrop-filter: blur(12px);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .deck-move {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .deck-move .dpk-icon-btn {
    width: 30px;
    height: 30px;
  }

  .deck-counter {
    min-width: 54px;
    font-family: var(--dpk-mono);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: center;
    color: var(--dpk-ink-faint);
  }

  .deck-counter strong {
    color: var(--dpk-ink);
    font-weight: 600;
  }

  .deck-progress {
    flex: 1 1 80px;
    height: 4px;
    border-radius: 999px;
    background: var(--dpk-paper-inset);
    box-shadow: inset 0 1px 2px var(--dpk-shade-1);
    overflow: hidden;
  }

  .deck-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--dpk-accent);
    transition: width 200ms ease;
  }

  .deck-bar .dpk-btn svg {
    width: 14px;
    height: 14px;
  }

  /* ----------------------------------------------------------- comments */

  .slide-comments {
    display: grid;
    gap: 10px;
    width: min(100%, 1180px);
    padding: 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  /* About three short comments; more scroll inside the list, not the page. */
  .slide-comment-list {
    display: grid;
    align-content: start;
    gap: 6px;
    max-height: 96px;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    list-style: none;
  }

  .slide-comment-list li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 6px 6px 10px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
    font-size: 13px;
    line-height: 1.55;
    color: var(--dpk-ink);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .slide-comment-body {
    flex: 1;
    min-width: 0;
  }

  .slide-comment-delete {
    flex: none;
    width: 22px;
    height: 22px;
    opacity: 0.55;
  }

  .slide-comment-list li:hover .slide-comment-delete,
  .slide-comment-delete:focus-visible {
    opacity: 1;
  }

  .slide-comment-delete svg {
    width: 12px;
    height: 12px;
  }

  .slide-comment-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: start;
  }

  .slide-comment-input {
    height: 60px;
    min-height: 60px;
    resize: none;
  }

  .slide-comment-actions {
    display: grid;
    justify-items: end;
    gap: 6px;
  }

  .slide-comment-hint {
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    color: var(--dpk-ink-faint);
    white-space: nowrap;
  }

  @media (max-width: 560px) {
    .slide-comment-body {
      flex: 1;
      min-width: 0;
    }

    .slide-comment-delete {
      flex: none;
      width: 22px;
      height: 22px;
      opacity: 0.55;
    }

    .slide-comment-list li:hover .slide-comment-delete,
    .slide-comment-delete:focus-visible {
      opacity: 1;
    }

    .slide-comment-delete svg {
      width: 12px;
      height: 12px;
    }

    .slide-comment-form {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .parked {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .deck-progress span {
      transition: none;
    }
  }
`;
