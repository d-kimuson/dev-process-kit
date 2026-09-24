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

  .outline-list {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .outline-row {
    position: relative;
  }

  .outline-row::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: var(--dpk-radius-xs);
    background: transparent;
    transition: background 140ms var(--dpk-ease);
  }

  .outline-row a {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 7px 8px 7px 14px;
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-ink-soft);
    font-size: 13px;
    line-height: 1.4;
    text-decoration: none;
    transition:
      background 140ms var(--dpk-ease),
      color 140ms var(--dpk-ease),
      box-shadow 140ms var(--dpk-ease);
  }

  .outline-row a:hover {
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
  }

  .outline-row a:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .outline-row[data-current='true']::before {
    background: linear-gradient(180deg, var(--dpk-accent-bright), var(--dpk-accent-strong));
    box-shadow: 0 0 8px color-mix(in srgb, var(--dpk-accent) 45%, transparent);
  }

  .outline-row[data-current='true'] a {
    background: color-mix(in srgb, var(--dpk-accent) 8%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
    box-shadow:
      inset 0 0 0 1px color-mix(in srgb, var(--dpk-accent) 20%, transparent),
      var(--dpk-shadow-xs);
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
    margin: 48px auto;
    color: var(--dpk-ink-faint);
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
    padding: 5.5cqw 6.5cqw 5cqw;
    overflow: auto;
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

  .slide-number {
    position: absolute;
    right: 2.6cqw;
    bottom: 2cqw;
    font-family: var(--dpk-mono);
    font-size: 1.2cqw;
    font-variant-numeric: tabular-nums;
    color: var(--dpk-ink-faint);
  }

  /* The cover: large title, the subtitle beneath, an accent rule on the left. */
  .slide[data-layout='title'] .slide-content {
    justify-content: center;
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
    justify-content: center;
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

  /* Full screen: the stage alone, the slide as large as the screen allows. */
  .stage:fullscreen {
    align-items: center;
    padding: 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: var(--dpk-dots), var(--dpk-paper-sunken);
  }

  .stage:fullscreen .slide {
    width: min(100vw, calc(100vh * 16 / 9));
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  /* ---------------------------------------------------------------- bar */

  .deck-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
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
    padding: 6px 6px 6px 12px;
    border-left: 2px solid var(--dpk-accent);
    border-radius: 0 var(--dpk-radius-sm) var(--dpk-radius-sm) 0;
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
