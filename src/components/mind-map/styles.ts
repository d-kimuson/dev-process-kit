import { css } from 'lit';

/**
 * Mind map styling. Each main topic's branch takes one theme accent
 * (`--mind-colour`), and everything beneath it inherits that colour, so a
 * branch reads as one unit across its curves and topics.
 */
export const mindMapStyles = css`
  .branch-root {
    --mind-colour: var(--af-ink);
    --mind-soft: var(--af-paper-sunken);
  }
  .branch-0 {
    --mind-colour: var(--af-blue);
    --mind-soft: var(--af-blue-soft);
  }
  .branch-1 {
    --mind-colour: var(--af-green);
    --mind-soft: var(--af-green-soft);
  }
  .branch-2 {
    --mind-colour: var(--af-violet);
    --mind-soft: var(--af-violet-soft);
  }
  .branch-3 {
    --mind-colour: var(--af-amber);
    --mind-soft: var(--af-amber-soft);
  }
  .branch-4 {
    --mind-colour: var(--af-accent);
    --mind-soft: var(--af-accent-soft);
  }

  .mind-topic {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    border: 1px solid color-mix(in srgb, var(--mind-colour) 45%, transparent);
    border-radius: 999px;
    background: var(--af-paper-raised);
    color: var(--af-ink);
    font-family: var(--af-body);
    font-size: 12.5px;
    line-height: 1.3;
    box-shadow: var(--af-shadow-xs);
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
    background: var(--af-ink);
    color: var(--af-paper-raised);
    font-size: 16px;
    font-weight: 680;
    letter-spacing: -0.01em;
    box-shadow: var(--af-shadow-sm);
  }

  .mind-topic.depth-1 {
    padding: 0 15px;
    border-width: 1.5px;
    border-color: var(--mind-colour);
    background: var(--mind-soft);
    font-size: 13.5px;
    font-weight: 620;
  }

  .mind-topic.depth-1 .mind-label {
    color: color-mix(in srgb, var(--mind-colour) 70%, var(--af-ink));
  }

  .mind-topic:hover {
    border-color: var(--mind-colour);
  }

  .mind-topic.is-selected {
    border-color: var(--mind-colour);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--mind-colour) 22%, transparent);
  }

  .mind-topic.depth-0.is-selected {
    box-shadow: 0 0 0 3px var(--af-blue-soft);
  }

  .mind-topic.is-related {
    border-color: var(--mind-colour);
  }

  .mind-topic:focus-visible {
    outline: none;
    box-shadow: var(--af-focus);
  }

  /* Added on this page by a draft action: not authored yet. */
  .mind-topic.is-added {
    border-style: dashed;
    border-color: var(--mind-colour);
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

  .mind-actions .af-btn {
    padding: 3px 9px;
    font-size: 12px;
    box-shadow: var(--af-shadow-xs);
  }

  .mind-actions .af-input {
    width: 100%;
    font-size: 12.5px;
    box-shadow: var(--af-shadow-xs);
  }

  .mind-actions-error {
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--af-accent);
  }

  .mind-branch {
    fill: none;
    stroke: color-mix(in srgb, var(--mind-colour) 55%, transparent);
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
    stroke: var(--mind-colour);
  }

  .mind-toggle {
    position: absolute;
    z-index: 1;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    transform: translate(-50%, -50%);
    border: 1.5px solid var(--mind-colour);
    border-radius: 999px;
    background: var(--af-paper-raised);
    color: var(--mind-colour);
    font-family: var(--af-mono);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: opacity 120ms ease;
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
    box-shadow: var(--af-focus);
  }

  @media (hover: none) {
    .mind-toggle {
      opacity: 1;
    }
  }
`;
