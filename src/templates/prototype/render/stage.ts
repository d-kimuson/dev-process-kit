import { html, nothing, type TemplateResult } from 'lit';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { PrototypeMessages } from '../messages';

import { findStep, flattenSteps, type PreviewViewport, type PrototypePreview, type PrototypeState } from '../model';
import { prototypePreviewUrl } from '../present';

export const VIEWPORT_WIDTH: Record<PreviewViewport, string> = {
  mobile: '390px',
  tablet: '834px',
  desktop: '1180px',
  fluid: '100%',
};

/**
 * Preview frames are content sized: a mock that is taller than this simply makes
 * the frame taller and the page scrolls as a whole. The minimum only keeps a
 * short mock looking like a device screen.
 */
export const VIEWPORT_MIN_HEIGHT: Record<PreviewViewport, string> = {
  mobile: '620px',
  tablet: '640px',
  desktop: '520px',
  fluid: '420px',
};

export type StageOptions = {
  /** Whether the light DOM holds markup for the preview (else a placeholder is shown). */
  readonly hasPreviewContent: (previewId: string) => boolean;
};

/** Tabs (when a step has several previews), the active frame and the parked slots. */
export const renderStage = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  options: StageOptions,
): TemplateResult => {
  const { state, navigation } = context;
  const location = findStep(state, navigation['step']);
  const active = location
    ? (location.step.previews.find((preview) => preview.id === navigation['preview']) ?? location.step.previews[0])
    : undefined;
  const parked = renderParkedPreviews(state, active?.id);

  if (!location) {
    return html`
      <div class="stage">
        <p class="stage-empty">
          ${m.noStepBefore}<strong>Activity › UserStory › Step › Preview</strong>${m.noStepAfter}
        </p>
        ${parked}
      </div>
    `;
  }

  const previews = location.step.previews;
  return html`
    <div class="stage">
      ${previews.length > 1 ? renderPreviewTabs(context, previews, active?.id) : nothing}
      <div class="canvas">
        ${active ? renderFrame(context, active, options.hasPreviewContent(active.id)) : nothing}
        ${previews.length === 0 ? html`<p class="dpk-label">${m.noPreviewMetadata}</p>` : nothing}
      </div>
      ${parked}
    </div>
  `;
};

const renderPreviewTabs = (
  context: TemplateRenderContext<PrototypeState>,
  previews: readonly PrototypePreview[],
  activeId: string | undefined,
): TemplateResult => {
  return html`<div class="stage-bar">
    <div class="tabs" role="tablist">
      ${previews.map(
        (preview) =>
          html`<a
            class="tab"
            role="tab"
            data-current=${String(preview.id === activeId)}
            aria-selected=${preview.id === activeId ? 'true' : 'false'}
            href=${context.hashFor({ preview: preview.id })}
            >${preview.label ?? preview.viewport}</a
          >`,
      )}
    </div>
  </div>`;
};

export const renderFrame = (
  context: TemplateRenderContext<PrototypeState>,
  preview: PrototypePreview,
  hasContent: boolean,
): TemplateResult => {
  return html`
    <figure
      class="frame"
      data-kind=${preview.kind}
      data-viewport=${preview.viewport}
      style=${`--frame-width:${VIEWPORT_WIDTH[preview.viewport]};--frame-min-height:${VIEWPORT_MIN_HEIGHT[preview.viewport]}`}
    >
      ${
        preview.kind === 'browser'
          ? html`<div class="chrome">
              <span class="dots"><i></i><i></i><i></i></span>
              <span class="url">${prototypePreviewUrl(context.state, preview)}</span>
            </div>`
          : nothing
      }
      <div class="viewport">
        ${preview.kind === 'native' ? renderStatusBar() : nothing}
        <slot name=${`preview:${preview.id}`}></slot>
        ${
          hasContent
            ? nothing
            : html`<div class="frame-placeholder">
                <span class="dpk-label">light dom preview</span>
                <code>&lt;div slot="preview" data-preview-id="${preview.id}"&gt;</code>
              </div>`
        }
      </div>
    </figure>
  `;
};

const renderStatusBar = (): TemplateResult => {
  return html`<div class="status-bar">
    <span class="status-time">9:41</span>
    <span class="punch-hole" aria-hidden="true"></span>
    <svg class="status-wifi" viewBox="0 0 16 12" aria-hidden="true">
      <path d="M8 9.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
      <path
        d="M4.7 7.4a4.8 4.8 0 0 1 6.6 0"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <path
        d="M2.1 4.7a8.4 8.4 0 0 1 11.8 0"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  </div>`;
};

/**
 * Every declared preview except the one on screen needs a slot somewhere in
 * this shadow root, otherwise its light DOM element would fall back to the
 * generic `slot="preview"` bucket and show up as an orphan.
 */
export const renderParkedPreviews = (state: PrototypeState, activePreviewId: string | undefined): TemplateResult => {
  const parked = flattenSteps(state).flatMap((entry) =>
    entry.step.previews.filter((preview) => preview.id !== activePreviewId),
  );
  if (parked.length === 0) return html`${nothing}`;
  return html`<div class="parked" aria-hidden="true">
    ${parked.map((preview) => html`<slot name=${`preview:${preview.id}`}></slot>`)}
  </div>`;
};
