import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { UiCommentView } from './render/ui-comment';

import { composerMessages } from '../../components/comment-composer/messages';
import { COMMENT_ACTION } from '../../core/action';
import { commentBody } from '../../core/comment';
import { TemplateElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { popoverSurface } from '../../core/theme';
import { findLocated, locateElement, pickableElement } from '../../lib/dom/locator';
import { prototypeDefinitionFor } from './definition';
import { prototypeMessages } from './messages';
import { findPreview, uiTargetId, UI_TARGET, type PrototypeState, type UiTarget } from './model';
import {
  locatePrototype,
  prototypeLinkProblem,
  prototypeStageFrames,
  prototypeUiCommentPins,
  prototypeUiTargetName,
} from './present';
import { renderNav } from './render/nav';
import { renderStage } from './render/stage';
import { prototypeStyles } from './styles';
import { reduceUiComment, UI_COMMENT_OFF, type UiCommentIntent, type UiCommentMode } from './ui-mode';

const COMPOSER_SIZE = { width: 300, height: 300 };

/**
 * `<dpk-template-prototype>`.
 *
 * Navigation is a pair of selects (Activity, UserStory) plus the step list of the
 * selected story. A step may declare several previews; they are shown as tabs so
 * one experience state is visible at a time (mobile / desktop / native), or side
 * by side when the user sees them together.
 *
 * Preview markup stays in the light DOM (`slot="preview"` + `data-preview-id`)
 * and is routed into the frame slot of the matching preview metadata. Frames
 * must be rendered by this element (not by a nested custom element) because slot
 * assignment does not cross shadow roots — which is why the stage is a render
 * function, not a child element.
 *
 * Everything the template shows is a function of the template state and the
 * navigation hash, except the reader's "comment on UI" mode: an ephemeral
 * picking state (see `ui-mode.ts`) whose comments enter the draft like any
 * other. Whether the stage is full screen belongs to the browser
 * (`:fullscreen`), not to this element.
 */
export class DpkTemplatePrototype extends TemplateElement<PrototypeState> {
  static override styles = [TemplateElement.styles, popoverSurface, prototypeStyles];

  #uiComment: UiCommentMode = UI_COMMENT_OFF;
  #composerOpen = false;
  /** The element the open composer comments on, in the author's markup. */
  #anchor: Element | null = null;
  /** Ids of the previews on screen at the last render. */
  #shownIds: readonly string[] = [];
  readonly #popovers = new PopoverController(this);
  #linksChecked = false;

  protected override definitionFor(locale: Locale) {
    return prototypeDefinitionFor(locale);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.#onKeydown);
    window.addEventListener('resize', this.#onLayoutChange);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.#onKeydown);
    window.removeEventListener('resize', this.#onLayoutChange);
  }

  protected override renderRegions(context: TemplateRenderContext<PrototypeState>): ShellRegions {
    const m = prototypeMessages(this.locale);
    const located = locatePrototype(context.state, context.navigation);
    this.#shownIds =
      located?.kind === 'step'
        ? prototypeStageFrames(located.step, context.navigation).shown.map((preview) => preview.id)
        : [];
    return {
      sidebar: renderNav(context, m),
      main: renderStage(context, m, {
        hasPreviewContent: (previewId) => this.#hasPreviewContent(previewId),
        canFullscreen: document.fullscreenEnabled === true,
        onToggleFullscreen: () => this.#toggleFullscreen(),
        uiComment: this.#uiCommentView(context),
        canvasEvents: {
          click: this.#onCanvasClick,
          pointermove: this.#onCanvasPointerMove,
          pointerleave: this.#onCanvasPointerLeave,
          scroll: this.#onLayoutChange,
        },
      }),
    };
  }

  protected override updated(): void {
    super.updated();
    this.#checkLinks();
    const mode = this.#uiComment;
    // The step changed under an open composer: its element is no longer on screen.
    if (mode.kind === 'composing' && !this.#shownIds.includes(mode.target.previewId)) {
      this.#send({ kind: 'dismiss' });
      return;
    }
    this.#placeUiLayer();
    const opened = mode.kind === 'composing' && !this.#composerOpen;
    this.#composerOpen = mode.kind === 'composing';
    if (mode.kind !== 'composing' || this.#anchor === null) return;
    const surface = this.renderRoot.querySelector<HTMLElement>('.comment-pop');
    if (!surface) return;
    this.#popovers.open(surface, this.#anchor, COMPOSER_SIZE, { placement: 'right-start' });
    if (opened) surface.querySelector('textarea')?.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------ comment on UI

  #uiCommentView(context: TemplateRenderContext<PrototypeState>): UiCommentView {
    const mode = this.#uiComment;
    const target = mode.kind === 'composing' ? mode.target : undefined;
    const preview = target ? findPreview(context.state, target.previewId)?.preview : undefined;
    const ref = target ? uiTargetId(target) : undefined;
    return {
      mode,
      pins: mode.kind === 'off' ? [] : prototypeUiCommentPins(context.comments, this.#shownIds),
      ...(target && preview ? { targetLabel: prototypeUiTargetName(preview, target) } : {}),
      notes: context.comments
        .filter((comment) => comment.target.type === UI_TARGET && comment.target.id === ref)
        .map((comment) => commentBody(comment)),
      composer: composerMessages(this.locale),
      send: (intent) => this.#send(intent),
      submit: (body) => this.#submitUiComment(body),
    };
  }

  #send(intent: UiCommentIntent): void {
    const next = reduceUiComment(this.#uiComment, intent);
    if (next === this.#uiComment) return;
    this.#uiComment = next;
    if (next.kind !== 'composing') this.#anchor = null;
    this.requestUpdate();
  }

  #submitUiComment(body: string): void {
    const mode = this.#uiComment;
    if (mode.kind !== 'composing') return;
    const outcome = this.dispatch({
      type: COMMENT_ACTION,
      target: { type: UI_TARGET, id: uiTargetId(mode.target) },
      payload: { body },
    });
    if (outcome.ok) this.#send({ kind: 'submitted' });
  }

  /** The author's preview element the event happened in, and the element it is about. */
  #pickFrom(event: Event): { readonly element: Element; readonly target: UiTarget } | null {
    const path = event.composedPath();
    const wrapper = path.find(
      (node): node is Element =>
        node instanceof Element && node.parentElement === this && node.hasAttribute('data-preview-id'),
    );
    const previewId = wrapper?.getAttribute('data-preview-id');
    const origin = path[0];
    if (!wrapper || !previewId || !(origin instanceof Element) || !wrapper.contains(origin)) return null;
    const element = pickableElement(origin, wrapper);
    const location = locateElement(element, wrapper);
    return {
      element,
      target: {
        previewId,
        selector: location.selector,
        ...(location.text === undefined ? {} : { text: location.text }),
      },
    };
  }

  /** While picking, a click inside a preview is a pick: the mock's own links and handlers do not run. */
  #onCanvasClick = (event: MouseEvent): void => {
    if (this.#uiComment.kind === 'off') return;
    const picked = this.#pickFrom(event);
    if (!picked) return;
    event.preventDefault();
    event.stopPropagation();
    this.#anchor = picked.element;
    this.#send({ kind: 'pick', target: picked.target });
  };

  #onCanvasPointerMove = (event: PointerEvent): void => {
    if (this.#uiComment.kind === 'off') return;
    const picked = this.#pickFrom(event);
    this.#placeBox('.ui-hover', picked?.element ?? null);
  };

  #onCanvasPointerLeave = (): void => {
    this.#placeBox('.ui-hover', null);
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented || this.#uiComment.kind === 'off') return;
    this.#send({ kind: 'exit' });
  };

  #onLayoutChange = (): void => {
    if (this.#uiComment.kind !== 'off') this.#placeUiLayer();
  };

  /** Pins sit on the top-right corner of their element; one whose element is gone stays hidden. */
  #placeUiLayer(): void {
    if (this.#uiComment.kind === 'off') return;
    this.#placeBox('.ui-picked', this.#anchor);
    const canvas = this.renderRoot.querySelector<HTMLElement>('.canvas');
    if (!canvas) return;
    for (const pin of this.renderRoot.querySelectorAll<HTMLElement>('.ui-pin')) {
      const wrapper = this.#previewElement(pin.dataset['preview'] ?? '');
      const element = wrapper ? findLocated(wrapper, pin.dataset['selector'] ?? '') : null;
      const rect = element?.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        pin.hidden = true;
        continue;
      }
      const origin = this.#canvasOrigin(canvas);
      pin.hidden = false;
      pin.style.left = `${rect.right - origin.left}px`;
      pin.style.top = `${rect.top - origin.top}px`;
    }
  }

  #placeBox(selector: string, element: Element | null): void {
    const box = this.renderRoot.querySelector<HTMLElement>(selector);
    const canvas = this.renderRoot.querySelector<HTMLElement>('.canvas');
    if (!box || !canvas) return;
    const rect = element?.getBoundingClientRect();
    if (!rect) {
      box.hidden = true;
      return;
    }
    const origin = this.#canvasOrigin(canvas);
    box.hidden = false;
    box.style.left = `${rect.left - origin.left}px`;
    box.style.top = `${rect.top - origin.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  }

  /** Where the canvas's content box starts, in viewport coordinates, scroll included. */
  #canvasOrigin(canvas: HTMLElement): { readonly left: number; readonly top: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      left: rect.left + canvas.clientLeft - canvas.scrollLeft,
      top: rect.top + canvas.clientTop - canvas.scrollTop,
    };
  }

  #previewElement(previewId: string): Element | undefined {
    return Array.from(this.children).find((child) => child.getAttribute('data-preview-id') === previewId);
  }

  /**
   * A prototype is clicked through: a link that leads nowhere reads as a dead
   * end to the reader. Reported once, on the console, for the author.
   */
  #checkLinks(): void {
    if (this.#linksChecked || this.renderRoot.querySelector('.stage') === null) return;
    this.#linksChecked = true;
    const state = this.derivation.state;
    const problems: string[] = [];
    for (const wrapper of Array.from(this.children)) {
      const previewId = wrapper.getAttribute('data-preview-id');
      if (previewId === null) continue;
      for (const link of wrapper.querySelectorAll('a, [data-dpk-navigate]')) {
        const problem = prototypeLinkProblem(state, {
          href: link.getAttribute('href'),
          navigate: link.getAttribute('data-dpk-navigate'),
        });
        if (problem === null) continue;
        const text = (link.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
        const where = link.getAttribute('data-dpk-navigate') ?? link.getAttribute('href') ?? '(no href)';
        problems.push(`  ${previewId}: <${link.tagName.toLowerCase()}> "${text}" → ${where} (${problem})`);
      }
    }
    if (problems.length === 0) return;
    console.warn(
      `[dev-process-kit] <dpk-template-prototype>: ${problems.length} link(s) in the previews lead nowhere. ` +
        'Point each at the step it leads to (data-dpk-navigate="step=…") or the user story it serves ' +
        '(data-dpk-navigate="story=…"):\n' +
        problems.join('\n'),
    );
  }

  // ---------------------------------------------------------------- full screen

  #toggleFullscreen(): void {
    const stage = this.renderRoot.querySelector('.stage');
    if (!(stage instanceof HTMLElement)) return;
    // Refused when the frame is not allowed full screen; the page stays as it is.
    if (this.shadowRoot?.fullscreenElement === stage) document.exitFullscreen().catch(() => undefined);
    else stage.requestFullscreen().catch(() => undefined);
  }

  #hasPreviewContent(previewId: string): boolean {
    return Array.from(this.querySelectorAll('[data-preview-id]')).some(
      (element) => element.getAttribute('data-preview-id') === previewId,
    );
  }
}

export const definePrototypeElement = (): void => {
  if (!customElements.get('dpk-template-prototype'))
    customElements.define('dpk-template-prototype', DpkTemplatePrototype);
};
