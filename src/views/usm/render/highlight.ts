import { css, html, nothing, type TemplateResult } from 'lit';
import { Route } from 'lucide';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { UsmState } from '../model';

import { lucide } from '../../../core/icons';
import { criticalPathOf, highlightOf } from '../critical-path';

const iconCriticalPath = lucide(Route);

/**
 * The toggle that highlights the critical path on the map. It is navigation,
 * like the filters: what the reader looks at, never a change. While it is on
 * it says how many stories the path runs through.
 */
export const renderHighlightToggle = (m: UsmMessages, context: ViewRenderContext<UsmState>): TemplateResult => {
  const on = highlightOf(context.navigation) === 'critical-path';
  const count = on ? criticalPathOf(context.state).ids.size : null;
  return html`<button
    class="dpk-btn dpk-btn--ghost highlight-toggle"
    type="button"
    data-highlight-toggle="critical-path"
    aria-pressed=${String(on)}
    title=${m.criticalPathHint}
    @click=${() => context.navigate({ highlight: on ? null : 'critical-path' })}
  >
    ${iconCriticalPath()}<span>${m.criticalPathButton}</span>
    ${count === null ? nothing : html`<span class="highlight-count">${m.criticalPathCount(count)}</span>`}
  </button>`;
};

export const highlightStyles = css`
  .highlight-toggle {
    gap: 6px;
    margin-left: auto;
  }
  .highlight-toggle svg {
    width: 14px;
    height: 14px;
  }
  .highlight-toggle[aria-pressed='true'] {
    border-color: color-mix(in oklab, var(--dpk-accent) 55%, var(--dpk-rule-strong));
    background: color-mix(in oklab, var(--dpk-accent) 12%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
  }
  .highlight-toggle[aria-pressed='true'] svg {
    color: var(--dpk-accent);
  }
  .highlight-count {
    color: var(--dpk-ink-soft);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
  }
`;
