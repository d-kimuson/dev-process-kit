/**
 * The frame both native dialogs share: the public `dpk-dialog` element and the
 * shell's settings surface. The engine's own UA sheet supplies the modal
 * centering, the backdrop and the top layer; this styles the panel and its
 * three parts (head, body, foot), and nothing of the content.
 *
 * Every box here is either the panel or a row inside it, so the rules mark a
 * state with a tint or a ring rather than a stripe (see `conventions/no-side-stripe`).
 */
import { css } from 'lit';

export const dialogStyles = css`
  .dpk-dialog {
    box-sizing: border-box;
    /* One column as wide as the panel: a long label wraps instead of widening it. */
    width: min(var(--dpk-dialog-width, 560px), calc(100vw - 32px));
    max-width: none;
    max-height: calc(100dvh - 48px);
    padding: 0;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
    font-size: 13px;
    line-height: 1.5;
    overflow: hidden;
  }

  .dpk-dialog[data-size='sm'] {
    --dpk-dialog-width: 380px;
  }

  .dpk-dialog[data-size='md'] {
    --dpk-dialog-width: 560px;
  }

  .dpk-dialog[data-size='lg'] {
    --dpk-dialog-width: 800px;
  }

  /*
   * One height whatever the panel holds (the settings dialog): the body scrolls
   * inside it, the head and the nav stay put, and switching content never
   * resizes the frame or moves where it sits.
   */
  .dpk-dialog[data-height='fixed'] {
    height: min(84dvh, 760px);
  }

  /* The panel and the backdrop behind it arrive together. One-shot entrances,
     so closing stays the engine's own immediate dismissal. */
  .dpk-dialog[open] {
    display: flex;
    flex-direction: column;
    animation: dpk-rise-in var(--dpk-dur) var(--dpk-ease-out);
  }

  .dpk-dialog[open]::backdrop {
    background: color-mix(in srgb, var(--dpk-shade) 45%, transparent);
    animation: dpk-fade-in var(--dpk-dur-fast) var(--dpk-ease);
  }

  .dpk-dialog:focus-visible {
    outline: none;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg), var(--dpk-focus);
  }

  .dpk-dialog-head {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
    min-height: 48px;
    padding: 10px 12px 10px 18px;
    border-bottom: 1px solid var(--dpk-rule);
    background: linear-gradient(180deg, var(--dpk-paper-raised), var(--dpk-paper));
  }

  .dpk-dialog-title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    font-family: var(--dpk-display);
    font-size: 14.5px;
    font-weight: 650;
    letter-spacing: -0.015em;
    color: var(--dpk-ink);
  }

  .dpk-dialog-close {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    cursor: pointer;
    transition:
      background var(--dpk-dur-fast) var(--dpk-ease),
      color var(--dpk-dur-fast) var(--dpk-ease);
  }

  .dpk-dialog-close svg {
    width: 15px;
    height: 15px;
  }

  .dpk-dialog-close:hover {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }

  .dpk-dialog-close:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* A secondary nav under the title (the settings sections). One row, scrolling
     sideways on a narrow panel, so the head keeps one height. */
  .dpk-dialog-nav {
    display: flex;
    flex: none;
    gap: 2px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--dpk-rule);
    background: var(--dpk-paper);
    overflow-x: auto;
  }

  .dpk-dialog-nav-item {
    flex: none;
    padding: 5px 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-weight: 550;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background var(--dpk-dur-fast) var(--dpk-ease),
      color var(--dpk-dur-fast) var(--dpk-ease);
  }

  .dpk-dialog-nav-item:hover {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }

  .dpk-dialog-nav-item[aria-current='true'] {
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent-strong);
  }

  .dpk-dialog-nav-item:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* The content scrolls inside the panel; the head and the foot stay put. */
  .dpk-dialog-body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 16px 18px;
    overflow: auto;
    overscroll-behavior: contain;
  }

  .dpk-dialog-footer {
    display: flex;
    flex: none;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    padding: 12px 18px;
    border-top: 1px solid var(--dpk-rule);
    background: var(--dpk-paper);
  }

  .dpk-dialog-footer[hidden] {
    display: none;
  }
`;
