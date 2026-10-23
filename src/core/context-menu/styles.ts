/**
 * Only what `.dpk-settings` / `.dpk-settings-option` (the shell's existing
 * floating-menu chrome, `src/core/shell/styles.ts`) do not already cover:
 * the highlighted row a keyboard arrow lands on, the destructive tone, group
 * headings/dividers, and the one-level submenu flyout.
 */
import { css, type CSSResultGroup } from 'lit';

export const contextMenuStyles: CSSResultGroup = css`
  .dpk-context-menu {
    min-width: 180px;
  }

  .dpk-context-menu-option.is-active {
    outline: none;
    background: var(--dpk-paper-sunken);
  }

  .dpk-context-menu-option.is-danger .dpk-settings-name {
    color: var(--dpk-danger);
  }

  .dpk-context-menu-heading {
    padding: 6px 8px 2px;
    color: var(--dpk-ink-faint);
    font-size: 10.5px;
    font-weight: 650;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .dpk-context-menu-divider {
    margin: 4px 2px;
    border: 0;
    border-top: 1px solid var(--dpk-rule);
  }

  .dpk-context-menu-submenu-wrap {
    position: relative;
  }

  .dpk-context-menu-submenu {
    position: absolute;
    top: 0;
    left: 100%;
    z-index: 1;
  }
`;
