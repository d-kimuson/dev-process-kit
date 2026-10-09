import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { UiCommentView } from './render/ui-comment';

import { composerMessages } from '../../components/comment-composer/messages';
import { COMMENT_ACTION } from '../../core/action';
import { commentBody } from '../../core/comment';
import { TemplateElement } from '../../core/element';
import { PopoverController } from '../../core/popover-controller';
import { popoverSurface, prose } from '../../core/theme';
import { containDialog, releaseModalDialog } from '../../lib/dom/contained-dialog';
import { findLocated, locateElement, pickableElement } from '../../lib/dom/locator';
import { closePopover } from '../../lib/dom/popover';
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
import { containedDialogDocumentStyles, prototypeStyles } from './styles';
import { reduceUiComment, UI_COMMENT_OFF, type UiCommentIntent, type UiCommentMode } from './ui-mode';

const COMPOSER_SIZE = { width: 300, height: 300 };
const DOCUMENT_STYLES_ID = 'dpk-template-prototype-document-styles';

/** The document half of the template's styles, added once per document. */
const installDocumentStyles = (): void => {
  if (document.getElementById(DOCUMENT_STYLES_ID) !== null) return;
  const style = Object.assign(document.createElement('style'), {
    id: DOCUMENT_STYLES_ID,
    textContent: containedDialogDocumentStyles,
  });
  document.head.append(style);
};

/** Whether `element` can still scroll by the wheel's delta. */
const scrollsBy = (element: Element, dx: number, dy: number): boolean => {
  const style = getComputedStyle(element);
  const canX = /auto|scroll/.test(style.overflowX) && element.scrollWidth > element.clientWidth;
  const canY = /auto|scroll/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
  const roomX =
    dx < 0 ? element.scrollLeft > 0 : dx > 0 && element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
  const roomY =
    dy < 0 ? element.scrollTop > 0 : dy > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  return (canX && roomX) || (canY && roomY);
};

/** The parent in the flat tree: a slotted element sits in its slot, a shadow root's child under its host. */
const flatParent = (element: Element): Element | null => {
  if (element.assignedSlot !== null) return element.assignedSlot;
  if (element.parentElement !== null) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
};

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
 * other. Whether the stage is maximized (it fills the tab, like a diagram's
 * maximize) is ephemeral view state of this element too.
 */
export class DpkTemplatePrototype extends TemplateElement<PrototypeState> {
  static override styles = [TemplateElement.styles, popoverSurface, prose, prototypeStyles];

  #uiComment: UiCommentMode = UI_COMMENT_OFF;
  #composerOpen = false;
  /** The element the open composer comments on, in the author's markup. */
  #anchor: Element | null = null;
  /** Ids of the previews on screen at the last render. */
  #shownIds: readonly string[] = [];
  readonly #popovers = new PopoverController(this);
  #linksChecked = false;
  /**
   * Set while the stage fills the tab (in the top layer where the browser has
   * one). `height` is what the stage took in the page, kept by a placeholder.
   */
  #maximized: { readonly height: number } | null = null;
  /** The stage element shown in the top layer, so it is shown there once. */
  #liftedStage: Element | null = null;

  protected override definitionFor(locale: Locale) {
    return prototypeDefinitionFor(locale);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('keydown', this.#onKeydown);
    window.addEventListener('resize', this.#onLayoutChange);
    // `toggle` does not bubble: caught on the way down to a dialog the mock opens.
    this.addEventListener('toggle', this.#onToggle, true);
    installDocumentStyles();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.#onKeydown);
    window.removeEventListener('resize', this.#onLayoutChange);
    this.removeEventListener('toggle', this.#onToggle, true);
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
        maximized: this.#maximized,
        onToggleMaximize: () => this.#setMaximized(this.#maximized === null),
        onMaximizedWheel: this.#onMaximizedWheel,
        uiComment: this.#uiCommentView(context),
        canvasEvents: {
          click: this.#onCanvasClick,
          pointermove: this.#onCanvasPointerMove,
          pointerleave: this.#onCanvasPointerLeave,
          wheel: this.#onCanvasWheel,
          scroll: this.#onLayoutChange,
        },
      }),
    };
  }

  protected override updated(): void {
    super.updated();
    this.#checkLinks();
    this.#containDialogs();
    const mode = this.#uiComment;
    // The step changed under an open composer: its element is no longer on screen.
    if (mode.kind === 'composing' && !this.#shownIds.includes(mode.target.previewId)) {
      this.#send({ kind: 'dismiss' });
      return;
    }
    // The stage enters the top layer before the composer, so the composer stacks above it.
    this.#syncMaximized();
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

  /**
   * The author's preview element under the pointer, and the element it is
   * about. Over the canvas the pointer is on the catcher sheet, so what lies
   * beneath it is hit tested; what the mock shows above the page (its own
   * popover) receives the event itself.
   */
  #pickFrom(event: MouseEvent): { readonly element: Element; readonly target: UiTarget } | null {
    const path = event.composedPath();
    const origin = path[0];
    if (origin instanceof Element && origin.classList.contains('ui-catcher')) {
      return this.#pickAt(event.clientX, event.clientY);
    }
    const wrapper = path.find(
      (node): node is Element =>
        node instanceof Element && node.parentElement === this && node.hasAttribute('data-preview-id'),
    );
    if (!wrapper || !(origin instanceof Element) || !wrapper.contains(origin)) return null;
    return this.#picked(origin, wrapper);
  }

  #pickAt(x: number, y: number): { readonly element: Element; readonly target: UiTarget } | null {
    const hit = this.#hitAt(x, y);
    return hit === null ? null : this.#picked(hit.element, hit.wrapper);
  }

  /** The topmost element of a preview at a point of the viewport. */
  #hitAt(x: number, y: number): { readonly element: Element; readonly wrapper: Element } | null {
    if (typeof document.elementsFromPoint !== 'function') return null;
    const wrappers = this.#previewWrappers();
    // The shadow root's own elements come back as this host, so the first light DOM hit is the mock's.
    for (const element of document.elementsFromPoint(x, y)) {
      const wrapper = wrappers.find((candidate) => candidate.contains(element));
      if (wrapper !== undefined) return { element, wrapper };
    }
    return null;
  }

  #picked(origin: Element, wrapper: Element): { readonly element: Element; readonly target: UiTarget } | null {
    const previewId = wrapper.getAttribute('data-preview-id');
    if (!previewId) return null;
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

  /** The preview wrappers on screen. */
  #previewWrappers(): readonly Element[] {
    return Array.from(this.children).filter((child) => {
      const id = child.getAttribute('data-preview-id');
      return id !== null && this.#shownIds.includes(id);
    });
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

  /**
   * The catcher sheet lies over the mock, so a wheel over it would scroll the
   * canvas only: it is handed to the scrolling area of the mock (a long list,
   * a row of panes) under the pointer, as if the sheet were not there.
   */
  #onCanvasWheel = (event: WheelEvent): void => {
    const origin = event.composedPath()[0];
    if (!(origin instanceof Element) || !origin.classList.contains('ui-catcher')) return;
    const canvas = this.renderRoot.querySelector('.canvas');
    let node = this.#hitAt(event.clientX, event.clientY)?.element ?? null;
    while (node !== null && node !== canvas) {
      if (scrollsBy(node, event.deltaX, event.deltaY)) {
        event.preventDefault();
        node.scrollBy({ left: event.deltaX, top: event.deltaY });
        return;
      }
      node = flatParent(node);
    }
  };

  /** Escape ends commenting on the UI first; with that off, it restores a maximized stage. */
  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (this.#uiComment.kind !== 'off') this.#send({ kind: 'exit' });
    else this.#setMaximized(false);
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
    const catcher = this.renderRoot.querySelector<HTMLElement>('.ui-catcher');
    if (catcher) {
      catcher.style.width = `${canvas.scrollWidth}px`;
      catcher.style.height = `${canvas.scrollHeight}px`;
    }
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

  // ------------------------------------------------------------ modal dialogs

  /** A mock's modal dialog opens inside its frame; see `lib/dom/contained-dialog.ts`. */
  #containDialogs(): void {
    for (const wrapper of this.querySelectorAll(':scope > [data-preview-id]')) {
      for (const dialog of wrapper.querySelectorAll('dialog')) {
        containDialog(dialog);
        releaseModalDialog(this, dialog);
      }
    }
  }

  /** A dialog the mock made modal some other way (one it created after the last render). */
  #onToggle = (event: Event): void => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLDialogElement) || !dialog.open) return;
    if (!Array.from(this.children).some((child) => child.hasAttribute('data-preview-id') && child.contains(dialog)))
      return;
    containDialog(dialog);
    releaseModalDialog(this, dialog);
  };

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

  // ------------------------------------------------------------------ maximize

  #setMaximized(maximized: boolean): void {
    if (maximized === (this.#maximized !== null)) return;
    const stage = this.renderRoot.querySelector<HTMLElement>('.stage');
    this.#maximized = maximized ? { height: stage?.offsetHeight ?? 0 } : null;
    this.#liftedStage = null;
    if (maximized && this.#uiComment.kind === 'composing') {
      // The top layer stacks in the order things entered it: an open composer
      // would stay beneath the lifted stage, so it is shown again above it.
      closePopover(this.renderRoot.querySelector<HTMLElement>('.comment-pop'));
      this.#composerOpen = false;
    }
    this.requestUpdate();
  }

  /**
   * Lifts the maximized stage into the top layer, so no ancestor's overflow,
   * transform or stacking context can clip it. Without the Popover API the
   * fixed positioning of `.is-maximized` alone covers the tab. Restoring drops
   * the `popover` attribute, which takes the stage out of the top layer again.
   */
  #syncMaximized(): void {
    const stage = this.renderRoot.querySelector<HTMLElement>('.stage');
    if (this.#maximized === null || !stage || typeof stage.showPopover !== 'function') return;
    if (stage === this.#liftedStage) return;
    this.#liftedStage = stage;
    try {
      stage.showPopover();
    } catch {
      /* not in a document yet */
    }
  }

  /** Nothing of the page shows behind the maximized stage, so only the canvas scrolls. */
  #onMaximizedWheel = (event: WheelEvent): void => {
    const canvas = this.renderRoot.querySelector('.canvas');
    if (canvas === null || !event.composedPath().includes(canvas)) event.preventDefault();
  };

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
