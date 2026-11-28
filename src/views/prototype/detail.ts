import { css, html, LitElement, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import type { PrototypeMessages } from './messages';
import type { PrototypeScreen, PrototypeStep } from './model';

import { prose, tokens } from '../../core/theme';
import { onCommit } from '../../lib/dom/events';
import { renderMarkdown } from '../../lib/markdown';

/** A screen as the detail lists it: the app it belongs to, and the hash that opens it in the app view. */
export type DetailScreen = {
  readonly appName: string;
  readonly screen: PrototypeScreen;
  readonly href: string;
};

/** What the side panel shows: the step on stage in the scenario view, or the screen in the app view. */
export type PrototypeDetailView =
  | { readonly kind: 'step'; readonly step: PrototypeStep; readonly screens: readonly DetailScreen[] }
  | { readonly kind: 'screen'; readonly appName: string; readonly screen: PrototypeScreen };

/** What the detail asks of its view: each returns whether the edit entered the draft. */
export type PrototypeDetailActions = {
  setStepName(name: string): boolean;
  setStepDescription(description: string): boolean;
};

const detailStyles = css`
  :host {
    display: grid;
    /* As wide as the panel, not as a description's widest table or code line: those scroll. */
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    gap: 18px;
  }
  .detail-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 7px;
  }
  .detail-field > dpk-inline-edit {
    display: block;
    margin: 0 -4px;
  }
  .detail-value {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 13px;
  }
  .step-screens {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .step-screen {
    color: var(--dpk-ink);
    font-size: 13px;
    font-weight: 600;
  }
  .screen-description {
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--dpk-ink);
  }
`;

const markdown = (source: string): TemplateResult =>
  html`<div class="screen-description dpk-prose">${unsafeHTML(renderMarkdown(source))}</div>`;

/**
 * The detail of the step or screen on stage, drawn in the side panel. A
 * step's name and description are edited in place through the view's
 * actions; the screens it shows link to the app view. The panel keys it on
 * the step or screen, so what is half typed never moves to another one.
 */
export class DpkInternalPrototypeDetail extends LitElement {
  static override styles: CSSResultGroup = [tokens, prose, detailStyles];

  static override properties = {
    view: { attribute: false },
    messages: { attribute: false },
    actions: { attribute: false },
  };

  declare view: PrototypeDetailView | null;
  declare messages: PrototypeMessages | null;
  declare actions: PrototypeDetailActions | null;

  constructor() {
    super();
    this.view = null;
    this.messages = null;
    this.actions = null;
  }

  protected override render(): TemplateResult | typeof nothing {
    const { view, messages: m } = this;
    if (view === null || m === null) return nothing;
    return view.kind === 'step' ? this.#renderStep(m, view.step, view.screens) : this.#renderScreen(m, view);
  }

  #renderStep(m: PrototypeMessages, step: PrototypeStep, screens: readonly DetailScreen[]): TemplateResult {
    return html`
      <section class="detail-field" data-field="name">
        <span class="dpk-label">${m.stepNameLabel}</span>
        <dpk-inline-edit
          wrap
          .value=${step.name}
          .label=${m.stepNameLabel}
          @dpk-commit=${onCommit((value) => this.actions?.setStepName(value))}
        ></dpk-inline-edit>
      </section>
      <section class="detail-field" data-field="description">
        <span class="dpk-label">${m.descriptionLabel}</span>
        <dpk-inline-edit
          multiline
          markdown
          .value=${step.description ?? ''}
          .placeholder=${m.descriptionPlaceholder}
          .label=${m.descriptionLabel}
          @dpk-commit=${onCommit((value) => this.actions?.setStepDescription(value))}
        ></dpk-inline-edit>
      </section>
      ${
        screens.length === 0
          ? nothing
          : html`<section class="detail-field" data-field="screens">
              <span class="dpk-label">${m.screenGroup}</span>
              <ul class="step-screens">
                ${screens.map(
                  ({ appName, screen, href }) =>
                    html`<li>
                      <a class="step-screen" href=${href} title=${m.openInApp}>${appName} › ${screen.title}</a>
                      ${screen.description ? markdown(screen.description) : nothing}
                    </li>`,
                )}
              </ul>
            </section>`
      }
    `;
  }

  #renderScreen(m: PrototypeMessages, view: Extract<PrototypeDetailView, { kind: 'screen' }>): TemplateResult {
    return html`
      <section class="detail-field" data-field="app">
        <span class="dpk-label">${m.appSelectLabel}</span>
        <p class="detail-value">${view.appName}</p>
      </section>
      ${
        view.screen.description
          ? html`<section class="detail-field" data-field="description">
              <span class="dpk-label">${m.descriptionLabel}</span>
              ${markdown(view.screen.description)}
            </section>`
          : nothing
      }
    `;
  }
}

export const definePrototypeDetail = (): void => {
  if (!customElements.get('dpk-internal-prototype-detail'))
    customElements.define('dpk-internal-prototype-detail', DpkInternalPrototypeDetail);
};
