import { css } from 'lit';

/**
 * Mind map styling. Each main topic's branch takes one theme accent
 * (`--mind-color`), and everything beneath it inherits that color, so a
 * branch reads as one unit across its curves and topics.
 */
export const mindMapStyles = css`
  .branch-root {
    --mind-color: var(--dpk-ink);
    --mind-soft: var(--dpk-paper-sunken);
  }
  .branch-0 {
    --mind-color: var(--dpk-blue);
    --mind-soft: var(--dpk-blue-soft);
  }
  .branch-1 {
    --mind-color: var(--dpk-green);
    --mind-soft: var(--dpk-green-soft);
  }
  .branch-2 {
    --mind-color: var(--dpk-violet);
    --mind-soft: var(--dpk-violet-soft);
  }
  .branch-3 {
    --mind-color: var(--dpk-amber);
    --mind-soft: var(--dpk-amber-soft);
  }
  .branch-4 {
    --mind-color: var(--dpk-accent);
    --mind-soft: var(--dpk-accent-soft);
  }

  .mind-topic {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    border: 1px solid color-mix(in srgb, var(--mind-color) 45%, transparent);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
    font-size: 12.5px;
    line-height: 1.3;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    transition:
      border-color 160ms var(--dpk-ease),
      box-shadow 160ms var(--dpk-ease),
      transform 160ms var(--dpk-ease);
  }

  .mind-label {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mind-topic.depth-0 {
    padding: 0 22px;
    border: 0;
    background: linear-gradient(155deg, color-mix(in srgb, var(--dpk-ink) 88%, transparent), var(--dpk-ink));
    color: var(--dpk-paper-raised);
    font-size: 16px;
    font-weight: 680;
    letter-spacing: -0.01em;
    box-shadow:
      inset 0 1px 0 var(--dpk-highlight),
      var(--dpk-shadow-sm);
  }

  .mind-topic.depth-1 {
    padding: 0 15px;
    border-width: 1.5px;
    border-color: var(--mind-color);
    background: var(--mind-soft);
    font-size: 13.5px;
    font-weight: 620;
  }

  .mind-topic.depth-1 .mind-label {
    color: color-mix(in srgb, var(--mind-color) 70%, var(--dpk-ink));
  }

  .mind-topic:hover {
    border-color: var(--mind-color);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
    transform: translateY(-1px);
  }

  .mind-topic.is-selected {
    border-color: var(--mind-color);
    box-shadow:
      var(--dpk-bevel),
      var(--dpk-shadow-sm),
      0 0 0 3px color-mix(in srgb, var(--mind-color) 22%, transparent);
  }

  .mind-topic.depth-0.is-selected {
    box-shadow:
      inset 0 1px 0 var(--dpk-highlight),
      var(--dpk-shadow-sm),
      0 0 0 3px var(--dpk-blue-soft);
  }

  .mind-topic.is-related {
    border-color: var(--mind-color);
  }

  .mind-topic:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  /* Added on this page by a draft action: not authored yet. */
  .mind-topic.is-added {
    border-style: dashed;
    border-color: var(--mind-color);
  }

  .mind-actions {
    position: absolute;
    z-index: 3;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    width: 220px;
  }

  .mind-actions .dpk-btn {
    padding: 3px 9px;
    font-size: 12px;
    box-shadow: var(--dpk-shadow-xs);
  }

  .mind-actions .dpk-input {
    width: 100%;
    font-size: 12.5px;
    box-shadow: var(--dpk-shadow-xs);
  }

  .mind-actions-error {
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--dpk-accent);
  }

  .mind-branch {
    fill: none;
    stroke: color-mix(in srgb, var(--mind-color) 55%, transparent);
    stroke-width: 1.5;
    stroke-linecap: round;
    cursor: default;
    transition: opacity 150ms ease;
  }

  .mind-branch.depth-1 {
    stroke-width: 3;
  }

  .mind-branch.depth-2 {
    stroke-width: 2;
  }

  .mind-branch.is-related {
    stroke: var(--mind-color);
  }

  .mind-toggle {
    position: absolute;
    z-index: 1;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    transform: translate(-50%, -50%);
    border: 1.5px solid var(--mind-color);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--mind-color);
    font-family: var(--dpk-mono);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
    transition:
      opacity 120ms ease,
      box-shadow 160ms var(--dpk-ease);
  }

  .mind-toggle:hover,
  .mind-toggle:focus-visible {
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-sm);
  }

  /* Expanded toggles appear with their topic; folded ones always show the count. */
  .mind-topic:hover + .mind-toggle,
  .mind-toggle:hover,
  .mind-toggle:focus-visible,
  .mind-toggle.is-folded {
    opacity: 1;
  }

  .mind-toggle.is-dimmed {
    opacity: 0;
  }

  .mind-toggle.is-folded.is-dimmed {
    opacity: 0.26;
  }

  .mind-toggle:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  @media (hover: none) {
    .mind-toggle {
      opacity: 1;
    }
  }
`;
