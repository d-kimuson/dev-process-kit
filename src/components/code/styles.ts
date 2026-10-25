import { css } from 'lit';

/** The code frame and token colors, shared by `dpk-code` and `dpk-code-group`. */
export const codeStyles = css`
  :host {
    display: block;
    overflow: hidden;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-sunken);
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 0 6px 0 12px;
    border-bottom: 1px solid var(--dpk-rule);
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-font-mono);
    font-size: 12px;
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .language {
    color: var(--dpk-ink-faint);
  }

  button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 24px;
    padding: 0 8px;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  button:hover {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }

  button:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  button[data-state='copied'] {
    color: var(--dpk-green);
  }

  button[data-state='failed'] {
    color: var(--dpk-danger);
  }

  button svg {
    width: 13px;
    height: 13px;
  }

  pre {
    margin: 0;
    padding: 12px 14px;
    overflow: auto;
    max-height: var(--dpk-code-max-height, 480px);
    color: var(--dpk-ink);
    font-family: var(--dpk-font-mono);
    font-size: 12.5px;
    line-height: 1.6;
    tab-size: 2;
  }

  .comment {
    color: var(--dpk-code-comment, var(--dpk-ink-faint));
    font-style: italic;
  }

  .string {
    color: var(--dpk-code-string, var(--dpk-green));
  }

  .number {
    color: var(--dpk-code-number, var(--dpk-amber));
  }

  .keyword {
    color: var(--dpk-code-keyword, var(--dpk-violet));
  }

  .function {
    color: var(--dpk-code-function, var(--dpk-blue));
  }

  .tag {
    color: var(--dpk-code-tag, var(--dpk-accent-strong));
  }

  .attr {
    color: var(--dpk-code-attr, var(--dpk-blue));
  }

  .property {
    color: var(--dpk-code-property, var(--dpk-blue));
  }

  .punct {
    color: var(--dpk-code-punct, var(--dpk-ink-soft));
  }
`;
