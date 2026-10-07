import { html, nothing, type TemplateResult } from 'lit';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { PrototypeMessages } from '../messages';

import { iconMaximize, iconMinimize } from '../../../core/icons';
import { flattenSteps, type PreviewViewport, type PrototypePreview, type PrototypeState } from '../model';
import {
  locatePrototype,
  prototypeMailHeader,
  prototypePageHeading,
  prototypePreviewUrl,
  prototypeStageFrames,
  prototypeStoryHeading,
  type MailHeader,
  type PageHeading,
} from '../present';

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
  /** Whether the browser lets this page go full screen (a sandboxed frame may not). */
  readonly canFullscreen: boolean;
  /** Enters full screen, or leaves it when the stage is already there. */
  readonly onToggleFullscreen: () => void;
};

/** Tabs or panes (when a step has several previews), the frames on screen and the parked slots. */
export const renderStage = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  options: StageOptions,
): TemplateResult => {
  const { state, navigation } = context;
  const located = locatePrototype(state, navigation);
  const location = located?.kind === 'step' ? located : undefined;
  const frames = location ? prototypeStageFrames(location.step, navigation) : undefined;
  const parked = renderParkedPreviews(state, frames?.shown.map((preview) => preview.id) ?? []);

  if (located?.kind === 'story') {
    // A story nothing has prototyped yet is still a destination: a mock links
    // its menu item here instead of leaving it dead.
    const { activity, story } = located;
    return html`
      <div class="stage">
        <section class="stage-story">
          ${renderPageHead(m, prototypeStoryHeading(activity, story))}
          ${story.description ? html`<p class="story-description">${story.description}</p>` : nothing}
          <p class="stage-empty">${m.storyWithoutSteps}</p>
        </section>
        ${parked}
      </div>
    `;
  }

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

  const { layout, shown, tabs, activeId } = frames ?? prototypeStageFrames(location.step, navigation);
  return html`
    <div class="stage">
      <div class="stage-bar">
        ${renderPageHead(m, prototypePageHeading(location))}
        <div class="stage-tools">
          ${tabs.length > 0 ? renderPreviewTabs(context, tabs, activeId) : nothing}
          ${shown.length > 0 && options.canFullscreen ? renderFullscreenToggle(m, options.onToggleFullscreen) : nothing}
        </div>
      </div>
      ${location.step.situation === undefined ? nothing : renderSituation(m, location.step.situation)}
      <div class="canvas" data-layout=${layout}>
        ${
          layout === 'side-by-side'
            ? html`<div class="panes">
                ${shown.map(
                  (preview) =>
                    html`<div class="pane" data-viewport=${preview.viewport}>
                      ${preview.label === undefined ? nothing : html`<span class="pane-label">${preview.label}</span>`}
                      ${renderFrame(context, m, preview, options.hasPreviewContent(preview.id))}
                    </div>`,
                )}
              </div>`
            : shown.map((preview) => renderFrame(context, m, preview, options.hasPreviewContent(preview.id)))
        }
        ${shown.length === 0 ? html`<p class="dpk-label">${m.noPreviewMetadata}</p>` : nothing}
      </div>
      ${parked}
    </div>
  `;
};

/** Who uses the page and its title, above the frame like the top of a real screen spec. */
const renderPageHead = (m: PrototypeMessages, heading: PageHeading): TemplateResult => {
  return html`<div class="page-head">
    ${
      heading.actor === undefined
        ? nothing
        : html`<span class="page-actor" role="note" aria-label=${m.pageActor(heading.actor)}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="5.2" r="2.7" />
              <path d="M2.8 14c.5-3 2.6-4.6 5.2-4.6s4.7 1.6 5.2 4.6Z" />
            </svg>
            ${heading.actor}
          </span>`
    }
    <h2 class="page-title">${heading.title}</h2>
  </div>`;
};

/** The scene around the previews, read just before looking at them. */
const renderSituation = (m: PrototypeMessages, situation: string): TemplateResult => {
  return html`<aside class="situation">
    <span class="situation-label">${m.situation}</span>
    <p class="situation-text">${situation}</p>
  </aside>`;
};

const renderPreviewTabs = (
  context: TemplateRenderContext<PrototypeState>,
  previews: readonly PrototypePreview[],
  activeId: string | undefined,
): TemplateResult => {
  return html`<div class="tabs" role="tablist">
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
  </div>`;
};

/**
 * One button both enters and leaves full screen. Which label shows is decided by
 * `.stage:fullscreen` in the styles, so the browser stays the only owner of
 * whether the stage is full screen.
 */
const renderFullscreenToggle = (m: PrototypeMessages, onToggle: () => void): TemplateResult => {
  return html`<button class="dpk-btn stage-fullscreen" type="button" title=${m.fullscreenHint} @click=${onToggle}>
    <span class="fullscreen-enter">${iconMaximize()} ${m.fullscreen}</span>
    <span class="fullscreen-exit">${iconMinimize()} ${m.exitFullscreen}</span>
  </button>`;
};

export const renderFrame = (
  context: TemplateRenderContext<PrototypeState>,
  m: PrototypeMessages,
  preview: PrototypePreview,
  hasContent: boolean,
): TemplateResult => {
  return html`
    <figure
      class="frame"
      data-kind=${preview.kind}
      data-viewport=${preview.viewport}
      ?data-empty=${!hasContent}
      style=${`--frame-width:${VIEWPORT_WIDTH[preview.viewport]};--frame-min-height:${VIEWPORT_MIN_HEIGHT[preview.viewport]}`}
    >
      ${
        preview.kind === 'browser'
          ? html`<div class="chrome">
              <span class="dots"><i></i><i></i><i></i></span>
              <span class="url">${prototypePreviewUrl(context.state, preview)}</span>
            </div>`
          : preview.kind === 'mail'
            ? renderMailHeader(prototypeMailHeader(m, preview))
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

/** A received message: subject, the sender's avatar and the envelope rows, above the body. */
const renderMailHeader = (header: MailHeader): TemplateResult => {
  return html`<header class="mail-head">
    ${header.subject === undefined ? nothing : html`<h3 class="mail-subject">${header.subject}</h3>`}
    <div class="mail-envelope">
      ${header.initial === undefined ? nothing : html`<span class="mail-avatar" aria-hidden="true">${header.initial}</span>`}
      <dl class="mail-meta">
        ${header.rows.map(
          (row) =>
            html`<div class="mail-row">
              <dt>${row.label}</dt>
              <dd>${row.value}</dd>
            </div>`,
        )}
      </dl>
    </div>
  </header>`;
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
export const renderParkedPreviews = (state: PrototypeState, shownIds: readonly string[]): TemplateResult => {
  const parked = flattenSteps(state).flatMap((entry) =>
    entry.step.previews.filter((preview) => !shownIds.includes(preview.id)),
  );
  if (parked.length === 0) return html`${nothing}`;
  return html`<div class="parked" aria-hidden="true">
    ${parked.map((preview) => html`<slot name=${`preview:${preview.id}`}></slot>`)}
  </div>`;
};
