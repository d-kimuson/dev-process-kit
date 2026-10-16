import { css, html, nothing, type TemplateResult } from 'lit';
import { Blocks } from 'lucide';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';

import { iconCheck, lucide } from '../../../core/icons';
import { hasFeature, USM_FEATURES, type UsmFeature, type UsmState } from '../model';

const iconFeatures = lucide(Blocks);

/** Whether the features menu is open, and how to open or close it. */
export type FeaturesMenu = {
  readonly open: boolean;
  readonly toggle: () => void;
  readonly close: () => void;
};

/**
 * The trigger of the optional features and, while open, their menu: each
 * feature as a checkbox. Turning one on or off is a change of the draft
 * (`SET_FEATURE`), so the agent sees which parts of the map the reader wants;
 * the menu stays open for the next one.
 */
export const renderFeaturesMenu = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  menu: FeaturesMenu,
): TemplateResult => html`<span class="features-field">
  <button
    class="dpk-btn dpk-btn--ghost features-trigger"
    type="button"
    data-features-trigger
    aria-haspopup="menu"
    aria-expanded=${String(menu.open)}
    @click=${menu.toggle}
  >
    ${iconFeatures()}<span>${m.featuresButton}</span>
  </button>
  ${
    menu.open
      ? html`<div
          id="features-menu"
          class="comment-pop features-menu"
          popover="manual"
          role="menu"
          aria-label=${m.featuresMenuLabel}
          @keydown=${(event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            menu.close();
          }}
        >
          ${USM_FEATURES.map((feature) => renderFeatureOption(m, context, feature))}
          <p class="features-note">${m.featuresNote}</p>
        </div>`
      : nothing
  }
</span>`;

const renderFeatureOption = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  feature: UsmFeature,
): TemplateResult => {
  const on = hasFeature(context.state, feature);
  return html`<button
    class="feature-option"
    type="button"
    role="menuitemcheckbox"
    data-feature=${feature}
    aria-checked=${String(on)}
    @click=${() =>
      context.dispatch({
        type: 'SET_FEATURE',
        target: { type: 'page', id: 'usm' },
        payload: { feature, enabled: !on },
      })}
  >
    <span class="feature-check" aria-hidden="true">${on ? iconCheck() : nothing}</span>
    <span class="feature-text">
      <span class="feature-name">${m.featureName(feature)}</span>
      <span class="feature-hint">${m.featureHint(feature)}</span>
    </span>
  </button>`;
};

export const featuresMenuStyles = css`
  .features-field {
    display: inline-flex;
  }
  .features-trigger {
    gap: 6px;
  }
  .features-trigger svg {
    width: 14px;
    height: 14px;
  }
  .features-trigger[aria-expanded='true'] {
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink);
  }
  .comment-pop.features-menu {
    gap: 2px;
    padding: 6px;
  }
  .feature-option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    padding: 8px;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: none;
    color: var(--dpk-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .feature-option:hover,
  .feature-option:focus-visible {
    outline: none;
    background: var(--dpk-paper-sunken);
  }
  .feature-check {
    flex: none;
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    margin-top: 1px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 4px;
    background: var(--dpk-paper-raised);
  }
  .feature-option[aria-checked='true'] .feature-check {
    border-color: var(--dpk-usm-accent);
    background: var(--dpk-usm-accent);
    color: var(--dpk-paper-raised);
  }
  .feature-check svg {
    width: 12px;
    height: 12px;
    stroke-width: 3;
  }
  .feature-text {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .feature-name {
    font-size: 13px;
    font-weight: 650;
  }
  .feature-hint {
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    line-height: 1.45;
  }
  .features-note {
    margin: 4px 8px 4px;
    padding-top: 8px;
    border-top: 1px solid var(--dpk-rule);
    color: var(--dpk-ink-faint);
    font-size: 11px;
    line-height: 1.45;
  }
`;
