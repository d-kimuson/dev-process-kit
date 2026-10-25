import { html, nothing, type TemplateResult } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { Monitor, Play, Smartphone, Tablet, User } from 'lucide';

import type { SelectController } from '../../../core/select/controller';
import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { PrototypeMessages } from '../messages';

import { iconMaximize, iconMinimize, lucide } from '../../../core/icons';
import { renderMarkdown } from '../../../lib/markdown';
import {
  deviceClassOf,
  deviceFor,
  deviceLabel,
  devicesOf,
  hasDevice,
  type DeviceChoice,
  type DeviceClass,
  type DevicePreset,
} from '../devices';
import { allScreens, flattenSteps, stepMaterials, type PrototypePreview, type PrototypeState } from '../model';
import {
  locatePrototype,
  prototypeMailHeader,
  prototypePageHeading,
  prototypePreviewUrl,
  prototypeRenditionSelection,
  prototypeStageFrames,
  prototypeStageTargets,
  prototypeStoryHeading,
  type MailHeader,
  type PageHeading,
  type StageFrames,
  type StagePane,
} from '../present';
import { prototypeViewOf } from '../view-mode';
import { renderActionsMenu, renderActionsToggle, type ActionsMenuView } from './actions-menu';
import { renderBrowser, type BrowserFrame } from './browser';
import { renderDemoControls, type DemoControls } from './demo-controls';
import { frameStyle, type FrameWindow } from './frame-size';
import {
  renderUiCommentHint,
  renderUiCommentLayer,
  renderUiCommentToggle,
  renderUiComposer,
  type UiCommentView,
} from './ui-comment';
import { renderUiNoteBadges, renderUiNotesPop, type UiNotesView } from './ui-notes';

export { VIEWPORT_MIN_HEIGHT, VIEWPORT_WIDTH } from './frame-size';

/**
 * How the stage is lifted over the page into the top layer: maximized (the
 * scenario's stage across the tab) or a demo (the app view's browser alone,
 * edge to edge). `height` is what the stage took in the page: a placeholder
 * keeps it, so the page behind neither reflows nor scrolls.
 */
export type StageLift = { readonly mode: 'maximized' | 'demo'; readonly height: number };

/** The app view's devices: the reader's pick for each class, and how much smaller the one on stage is drawn. */
export type StageDevices = {
  readonly choice: DeviceChoice;
  readonly zoom: number;
  readonly onPick: (id: string) => void;
};

export type StageOptions = {
  /** Whether the light DOM holds markup for the preview (else a placeholder is shown). */
  readonly hasPreviewContent: (previewId: string) => boolean;
  /** Set while the stage fills the tab. */
  readonly lift: StageLift | null;
  /** Maximizes the stage, or restores it when it already fills the tab (the scenario view). */
  readonly onToggleMaximize: () => void;
  /** Starts the demo, or ends it (the app view). */
  readonly onToggleDemo: () => void;
  /** A wheel over the lifted stage, which must not scroll the hidden page. */
  readonly onLiftedWheel: (event: WheelEvent) => void;
  /** The browser the app view runs its web page in; `null` for any other frame. */
  readonly browser: Omit<BrowserFrame, 'preview' | 'hasContent' | 'viewport' | 'window' | 'demo'> | null;
  /** Set in the app view, where a screen runs in a window of a fixed size; `null` in the scenario view. */
  readonly devices: StageDevices | null;
  /** The device picker's own select state. */
  readonly deviceSelect: SelectController;
  /** Commenting on the UI: the mode, the pins and the composer. */
  readonly uiComment: UiCommentView;
  /** The notes kept on the elements on screen, as badges. */
  readonly uiNotes: UiNotesView;
  /** What the reader can make the screens on stage do, and their menu. */
  readonly actions: ActionsMenuView;
  /** Pointer events on the canvas, read by the element while the reader comments on the UI. */
  readonly canvasEvents: {
    readonly click: (event: MouseEvent) => void;
    readonly pointermove: (event: PointerEvent) => void;
    readonly pointerleave: () => void;
    /** A wheel over the sheet that takes the pointer while the reader comments on the UI. */
    readonly wheel: (event: WheelEvent) => void;
    /** A row of panes scrolled sideways: what is drawn over it follows. */
    readonly scroll: () => void;
  };
};

/** The panes of what is on stage, a screen's renditions as tabs, and the parked slots. */
export const renderStage = (
  context: ViewRenderContext<PrototypeState>,
  m: PrototypeMessages,
  options: StageOptions,
): TemplateResult => {
  const { state, navigation } = context;
  const located = locatePrototype(state, navigation);
  const location = located === undefined || located.kind === 'story' ? undefined : located;
  const app = prototypeViewOf(navigation) === 'app';
  const parked = renderParkedPreviews(state, []);

  if (located?.kind === 'story') {
    // A story nothing has prototyped yet is still a destination: a mock links
    // its menu item here instead of leaving it dead.
    const { activity, story } = located;
    return html`
      <div class="stage">
        <section class="stage-story" data-dpk-target=${prototypeStageTargets(located, null)}>
          ${renderPageHead(m, prototypeStoryHeading(activity, story))}
          ${
            story.description
              ? html`<div class="story-description dpk-prose">${unsafeHTML(renderMarkdown(story.description))}</div>`
              : nothing
          }
          <p class="stage-empty">${m.storyWithoutSteps}</p>
        </section>
        ${parked}
      </div>
    `;
  }

  if (!location) {
    return html`
      <div class="stage">
        ${
          app
            ? html`<p class="stage-empty">${m.noScreens}</p>`
            : html`<p class="stage-empty">
                ${m.noStepBefore}<strong>Activity › UserStory › Step</strong>${m.noStepAfter}
              </p>`
        }
        ${parked}
      </div>
    `;
  }

  const frames = prototypeStageFrames(state, location, navigation);
  const { layout, panes, shown } = frames;
  // Alone on stage, a screen's tabs sit in the stage bar; side by side, each pane carries its own.
  const [single] = layout === 'single' ? panes : [];
  const ui = options.uiComment;
  const lift = options.lift;
  const demo = lift?.mode === 'demo';
  const browser = options.browser;
  // The new tab page (or an unreachable address) covers the page the hash names.
  const onScreen = browser !== null && browser.view.entry?.kind !== 'page' ? [] : shown;
  const [browserPreview] = onScreen;
  const viewport = (browserPreview ?? shown[0])?.viewport ?? 'desktop';
  // A desktop browser has room for the demo's controls at the free end of its tab strip.
  const controlsInBrowser = demo && browser !== null && viewport !== 'mobile';
  const demoControls: DemoControls = { onExit: options.onToggleDemo, uiComment: ui, actions: options.actions };
  const devicePreview = browserPreview ?? shown[0];
  const kind = browser !== null ? 'browser' : (devicePreview?.kind ?? 'browser');
  // A demo's desktop browser is the reader's own screen: it fills the tab rather than a device's size.
  const fills = demo && kind === 'browser' && deviceClassOf(viewport) === 'desktop';
  const devices = options.devices;
  const device = devices === null || fills || !hasDevice(kind) ? null : deviceFor(viewport, devices.choice);
  const frameWindow: FrameWindow | null =
    device !== null && devices !== null
      ? { kind: 'device', width: device.width, height: device.height, zoom: devices.zoom }
      : fills
        ? { kind: 'fill' }
        : null;
  return html`
    ${lift === null ? nothing : html`<div class="stage-placeholder" style=${`height:${lift.height}px`}></div>`}
    <div
      class=${lift === null ? 'stage' : demo ? 'stage is-demo' : 'stage is-maximized'}
      data-ui-comment=${ui.mode.kind}
      popover=${lift === null ? nothing : 'manual'}
      @wheel=${lift === null ? nothing : { handleEvent: options.onLiftedWheel, passive: false }}
    >
      ${
        demo
          ? // A demo is the app alone: no title, no tools, only commenting on it and a way out.
            controlsInBrowser
            ? nothing
            : renderDemoControls(m, demoControls)
          : html`<div class="stage-bar">
              ${renderPageHead(m, prototypePageHeading(state, location))}
              <div class="stage-tools">
                ${single?.kind === 'screen' && single.tabs.length > 0 ? renderPreviewTabs(context, frames, single) : nothing}
                ${
                  device !== null && devices !== null
                    ? renderDevicePicker(m, device, devices, options.deviceSelect)
                    : nothing
                }
                ${options.actions.groups.length > 0 ? renderActionsToggle(m, options.actions) : nothing}
                ${shown.length > 0 ? renderUiCommentToggle(m, ui) : nothing}
                ${
                  shown.length === 0
                    ? nothing
                    : app
                      ? renderDemoToggle(m, options.onToggleDemo)
                      : renderMaximizeToggle(m, lift !== null, options.onToggleMaximize)
                }
              </div>
            </div>`
      }
      ${
        // The situation belongs to the scenario: a screen of the app view has none.
        location.kind === 'step' && location.step.situation !== undefined
          ? renderSituation(m, location.step.situation)
          : nothing
      }
      ${demo ? nothing : renderUiCommentHint(m, ui)}
      <div
        class="canvas"
        data-layout=${layout}
        data-dpk-target=${prototypeStageTargets(location, frames)}
        @click=${{ handleEvent: options.canvasEvents.click, capture: true }}
        @pointermove=${{ handleEvent: options.canvasEvents.pointermove, capture: true }}
        @pointerleave=${options.canvasEvents.pointerleave}
        @wheel=${{ handleEvent: options.canvasEvents.wheel, passive: false }}
        @scroll=${{ handleEvent: options.canvasEvents.scroll, capture: true }}
      >
        ${
          browser !== null
            ? renderBrowser(context, m, {
                ...browser,
                ...(browserPreview === undefined ? {} : { preview: browserPreview }),
                ...(controlsInBrowser ? { demo: demoControls } : {}),
                hasContent: browserPreview === undefined || options.hasPreviewContent(browserPreview.id),
                viewport,
                window: frameWindow ?? { kind: 'fill' },
              })
            : layout === 'side-by-side'
              ? html`<div class="panes">
                  ${panes.map(
                    (pane) =>
                      html`<div class="pane" data-viewport=${pane.preview.viewport} data-pane=${pane.kind}>
                        ${renderPaneHead(context, frames, pane)}
                        ${renderFrame(context, m, pane.preview, options.hasPreviewContent(pane.preview.id))}
                      </div>`,
                  )}
                </div>`
              : shown.map((preview) =>
                  renderFrame(context, m, preview, options.hasPreviewContent(preview.id), frameWindow),
                )
        }
        ${shown.length === 0 ? html`<p class="dpk-label">${m.noPreviewMetadata}</p>` : nothing}
        ${renderUiNoteBadges(m, options.uiNotes)} ${renderUiCommentLayer(m, ui)}
      </div>
      ${renderUiComposer(m, ui)} ${renderUiNotesPop(m, options.uiNotes)} ${renderActionsMenu(m, options.actions)}
      ${renderParkedPreviews(
        state,
        onScreen.map((preview) => preview.id),
      )}
    </div>
  `;
};

const iconActor = lucide(User);
const iconPlay = lucide(Play);
const DEVICE_ICONS = {
  phone: lucide(Smartphone),
  tablet: lucide(Tablet),
  desktop: lucide(Monitor),
} as const satisfies Record<DeviceClass, () => TemplateResult>;

/** Who uses the page and its title, above the frame like the top of a real screen spec. */
const renderPageHead = (m: PrototypeMessages, heading: PageHeading): TemplateResult => {
  return html`<div class="page-head">
    ${
      heading.actor === undefined
        ? nothing
        : html`<span class="page-actor" role="note" aria-label=${m.pageActor(heading.actor)} title=${heading.actor}>
            ${iconActor()} <span class="page-actor-name">${heading.actor}</span>
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

/** The renditions of one screen pane; switching one keeps what the other panes show. */
const renderPreviewTabs = (
  context: ViewRenderContext<PrototypeState>,
  frames: StageFrames,
  pane: Extract<StagePane, { kind: 'screen' }>,
): TemplateResult => {
  return html`<div class="dpk-segmented tabs" role="tablist">
    ${pane.tabs.map((preview) => {
      const current = preview.id === pane.preview.id;
      return html`<a
        class="tab"
        role="tab"
        data-current=${String(current)}
        aria-selected=${current ? 'true' : 'false'}
        href=${context.hashFor({ preview: prototypeRenditionSelection(frames, preview.id) })}
        >${preview.label ?? preview.viewport}</a
      >`;
    })}
  </div>`;
};

/**
 * Above a pane side by side: which screen of the product it is, with its
 * renditions to switch between, or the label of a material at hand.
 */
const renderPaneHead = (
  context: ViewRenderContext<PrototypeState>,
  frames: StageFrames,
  pane: StagePane,
): TemplateResult | typeof nothing => {
  if (pane.kind === 'material') {
    return pane.preview.label === undefined
      ? nothing
      : html`<span class="pane-label" title=${pane.preview.label}>${pane.preview.label}</span>`;
  }
  return html`<div class="pane-head">
    <span class="pane-label" title=${pane.screen.screen.title}>${pane.screen.screen.title}</span>
    ${pane.tabs.length > 0 ? renderPreviewTabs(context, frames, pane) : nothing}
  </div>`;
};

/**
 * The device the app view runs the screen on, among the common ones of its
 * class, and how much smaller it is drawn when it is wider than the stage.
 */
const renderDevicePicker = (
  m: PrototypeMessages,
  device: DevicePreset,
  devices: StageDevices,
  select: SelectController,
): TemplateResult => {
  const percent = Math.round(devices.zoom * 100);
  return html`<span class="device-pick" title=${m.deviceHint}>
    ${DEVICE_ICONS[device.deviceClass]()}
    ${select.render({
      options: devicesOf(device.deviceClass).map((candidate) => ({
        value: candidate.id,
        label: deviceLabel(m, candidate),
      })),
      value: device.id,
      onChange: (value) => devices.onPick(value),
      ariaLabel: m.device,
      className: 'device-select',
    })}
    ${percent < 100 ? html`<span class="device-zoom" title=${m.deviceZoom(percent)}>${percent}%</span>` : nothing}
  </span>`;
};

/** The app view's demo: the browser alone across the tab, as if the reader were using the app. */
const renderDemoToggle = (m: PrototypeMessages, onToggle: () => void): TemplateResult => {
  return html`<button class="dpk-btn stage-demo" type="button" title=${m.demoHint} @click=${onToggle}>
    ${iconPlay()} ${m.demo}
  </button>`;
};

/** One button both maximizes the stage within the tab and restores it, like a diagram's. */
const renderMaximizeToggle = (m: PrototypeMessages, maximized: boolean, onToggle: () => void): TemplateResult => {
  return html`<button
    class="dpk-btn stage-maximize"
    type="button"
    aria-pressed=${maximized ? 'true' : 'false'}
    title=${m.maximizeHint}
    @click=${onToggle}
  >
    ${maximized ? html`${iconMinimize()} ${m.restore}` : html`${iconMaximize()} ${m.maximize}`}
  </button>`;
};

export const renderFrame = (
  context: ViewRenderContext<PrototypeState>,
  m: PrototypeMessages,
  preview: PrototypePreview,
  hasContent: boolean,
  /** The app view's window; `null` in the scenario view, where the frame is as tall as its content. */
  frameWindow: FrameWindow | null = null,
): TemplateResult => {
  return html`
    <figure
      class="frame"
      data-kind=${preview.kind}
      data-viewport=${preview.viewport}
      data-window=${frameWindow?.kind ?? nothing}
      ?data-empty=${!hasContent}
      style=${frameStyle(preview.kind, preview.viewport, frameWindow)}
    >
      ${
        preview.kind === 'browser'
          ? html`<div class="dpk-browser-frame-bar">
              <span class="dpk-browser-frame-url">${prototypePreviewUrl(context.state, preview)}</span>
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
  return html`<header class="dpk-received-mail">
    ${header.subject === undefined ? nothing : html`<h3 class="dpk-received-mail-subject">${header.subject}</h3>`}
    <div class="dpk-received-mail-envelope">
      ${
        header.initial === undefined
          ? nothing
          : html`<span class="dpk-avatar" data-size="lg" aria-hidden="true">${header.initial}</span>`
      }
      <dl class="dpk-received-mail-meta">
        ${header.rows.map(
          (row) =>
            html`<div>
              <dt>${row.label}</dt>
              <dd>${row.value}</dd>
            </div>`,
        )}
      </dl>
    </div>
  </header>`;
};

/** The phone's status bar: the time; the atom draws the camera and the signal. */
const renderStatusBar = (): TemplateResult => html`<div class="dpk-status-bar"><span>9:41</span></div>`;

/**
 * Every declared preview except the one on screen needs a slot somewhere in
 * this shadow root, otherwise its light DOM element would fall back to the
 * generic `slot="preview"` bucket and show up as an orphan.
 */
export const renderParkedPreviews = (state: PrototypeState, shownIds: readonly string[]): TemplateResult => {
  const declared = [
    ...allScreens(state).flatMap((entry) => entry.screen.previews),
    ...flattenSteps(state).flatMap((entry) => stepMaterials(entry.step)),
  ];
  const parked = declared.filter((preview) => !shownIds.includes(preview.id));
  if (parked.length === 0) return html`${nothing}`;
  return html`<div class="parked" aria-hidden="true">
    ${parked.map((preview) => html`<slot name=${`preview:${preview.id}`}></slot>`)}
  </div>`;
};
