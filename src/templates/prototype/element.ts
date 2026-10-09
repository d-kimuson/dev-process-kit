import type { Locale } from '../../core/i18n';
import type { ShellRegions, TemplateRenderContext } from '../../core/shell/contracts';
import type { BrowserCommand } from './render/browser';
import type { UiCommentView } from './render/ui-comment';

import { composerMessages } from '../../components/comment-composer/messages';
import { COMMENT_ACTION } from '../../core/action';
import { commentBody } from '../../core/comment';
import { TemplateElement } from '../../core/element';
import { parseHash } from '../../core/navigation';
import { PopoverController } from '../../core/popover-controller';
import { popoverSurface, prose } from '../../core/theme';
import { containDialog, releaseModalDialog } from '../../lib/dom/contained-dialog';
import { findLocated, locateElement, pickableElement } from '../../lib/dom/locator';
import { closePopover } from '../../lib/dom/popover';
import {
  activeEntry,
  reduceBrowser,
  startBrowser,
  type BrowserIntent,
  type BrowserPage,
  type BrowserSim,
} from './browser-sim';
import {
  presentBrowser,
  prototypeBrowserHome,
  prototypeBrowserPage,
  prototypeNewTabShortcuts,
  prototypePageAt,
} from './browser-view';
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
import { renderStage, type StageLift, type StageOptions } from './render/stage';
import { containedDialogDocumentStyles, prototypeStyles } from './styles';
import { reduceUiComment, UI_COMMENT_OFF, type UiCommentIntent, type UiCommentMode } from './ui-mode';
import { prototypeViewOf } from './view-mode';

const COMPOSER_SIZE = { width: 300, height: 300 };
/** How long a reload of the app view's browser takes, so the reader sees it happen. */
const RELOAD_MS = 360;
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
 * maximize) or runs a demo is ephemeral view state of this element too, and so
 * is the app view's browser: its tabs and their history (see `browser-sim.ts`).
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
  /** Set while the stage fills the tab (in the top layer where the browser has one). */
  #lift: StageLift | null = null;
  /** The app view's browser, from the first web page the app view showed. */
  #browser: BrowserSim | null = null;
  /** Whether the browser was on stage at the last render, so its links open tabs. */
  #browserShown = false;
  /** Whether a phone browser shows its tab overview. */
  #tabSwitcher = false;
  /** Set when the keyboard picked a tab: the focus moves to it once it is drawn. */
  #focusTab = false;
  /** A reload under way: the page it reloads, and the moment it is done. */
  #pendingReload: { readonly page: string; readonly timer: ReturnType<typeof setTimeout> } | null = null;
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
    // Before the shell's own link handling, which navigates in place.
    this.addEventListener('click', this.#onLinkClick, true);
    this.addEventListener('auxclick', this.#onLinkClick, true);
    installDocumentStyles();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.#onKeydown);
    window.removeEventListener('resize', this.#onLayoutChange);
    this.removeEventListener('toggle', this.#onToggle, true);
    this.removeEventListener('click', this.#onLinkClick, true);
    this.removeEventListener('auxclick', this.#onLinkClick, true);
    this.#stopReload();
  }

  protected override renderRegions(context: TemplateRenderContext<PrototypeState>): ShellRegions {
    const m = prototypeMessages(this.locale);
    const located = locatePrototype(context.state, context.navigation);
    const app = prototypeViewOf(context.navigation) === 'app';
    // Maximize belongs to the scenario view and the demo to the app view.
    if (this.#lift !== null && (this.#lift.mode === 'demo') !== app) this.#dropLift();
    const browser = app ? this.#browserFrame(context, m) : null;
    this.#browserShown = browser !== null;
    this.#shownIds =
      located !== undefined && located.kind !== 'story' && (browser === null || browser.view.entry?.kind === 'page')
        ? prototypeStageFrames(context.state, located, context.navigation).shown.map((preview) => preview.id)
        : [];
    // Leaving the page before it is back stops the reload, as in a browser.
    if (this.#pendingReload !== null && this.#pendingReload.page !== this.#shownIds.join(' ')) this.#stopReload();
    return {
      sidebar: renderNav(context, m),
      main: renderStage(context, m, {
        hasPreviewContent: (previewId) => this.#hasPreviewContent(previewId),
        lift: this.#lift,
        onToggleMaximize: () => this.#setLift(this.#lift === null ? 'maximized' : null),
        onToggleDemo: () => this.#setLift(this.#lift === null ? 'demo' : null),
        onLiftedWheel: this.#onLiftedWheel,
        // Read after the check above: leaving the page has just stopped its reload.
        browser: browser === null ? null : { ...browser, loading: this.#pendingReload !== null },
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
    this.#syncLift();
    if (this.#focusTab) {
      this.#focusTab = false;
      this.renderRoot.querySelector<HTMLElement>('.browser-tab[aria-selected="true"]')?.focus();
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

  /** Escape ends commenting on the UI first; with that off, it restores a maximized stage or ends the demo. */
  #onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (this.#uiComment.kind !== 'off') this.#send({ kind: 'exit' });
    else this.#setLift(null);
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
        'Point each at the screen it opens (data-dpk-navigate="screen=…"); a link that only moves the ' +
        'scenario on can name a step (data-dpk-navigate="step=…") or a user story (data-dpk-navigate="story=…"):\n' +
        problems.join('\n'),
    );
  }

  // ------------------------------------------------------------ maximize, demo

  #setLift(mode: StageLift['mode'] | null): void {
    if (mode === (this.#lift?.mode ?? null)) return;
    const stage = this.renderRoot.querySelector<HTMLElement>('.stage');
    // Going from one lift to the other passes through the page first.
    const height = this.#lift?.height ?? stage?.offsetHeight ?? 0;
    this.#dropLift();
    if (mode === 'demo' && this.#uiComment.kind !== 'off') this.#send({ kind: 'exit' });
    if (mode !== null) this.#lift = { mode, height };
    if (mode !== null && this.#uiComment.kind === 'composing') {
      // The top layer stacks in the order things entered it: an open composer
      // would stay beneath the lifted stage, so it is shown again above it.
      closePopover(this.renderRoot.querySelector<HTMLElement>('.comment-pop'));
      this.#composerOpen = false;
    }
    this.requestUpdate();
  }

  /** Back into the page; the next render drops the `popover` attribute, which leaves the top layer. */
  #dropLift(): void {
    this.#lift = null;
    this.#liftedStage = null;
  }

  /**
   * Lifts the stage into the top layer, so no ancestor's overflow, transform
   * or stacking context can clip it. Without the Popover API the fixed
   * positioning of `.is-maximized` / `.is-demo` alone covers the tab.
   */
  #syncLift(): void {
    const stage = this.renderRoot.querySelector<HTMLElement>('.stage');
    if (this.#lift === null || !stage || typeof stage.showPopover !== 'function') return;
    if (stage === this.#liftedStage) return;
    this.#liftedStage = stage;
    try {
      stage.showPopover();
    } catch {
      /* not in a document yet */
    }
  }

  /** Nothing of the page shows behind the lifted stage, so only the canvas scrolls. */
  #onLiftedWheel = (event: WheelEvent): void => {
    const canvas = this.renderRoot.querySelector('.canvas');
    if (canvas === null || !event.composedPath().includes(canvas)) event.preventDefault();
  };

  // ------------------------------------------------------------ app view browser

  /**
   * The browser around the app view's web page. Every page the hash shows is
   * observed into the history of the active tab; a screen outside the browser
   * (a mail, a phone app) is shown in its own frame and leaves it alone.
   */
  #browserFrame(
    context: TemplateRenderContext<PrototypeState>,
    m: ReturnType<typeof prototypeMessages>,
  ): Omit<NonNullable<StageOptions['browser']>, 'loading'> | null {
    const page = prototypeBrowserPage(context.state, context.navigation);
    this.#browser =
      this.#browser === null
        ? page === null
          ? null
          : startBrowser(page)
        : reduceBrowser(this.#browser, { kind: 'observe', page });
    const sim = this.#browser;
    if (sim === null) return null;
    const entry = activeEntry(sim);
    // On the new tab page the hash still names the page it covers.
    const covering = entry?.kind !== 'page' && sim.seen !== null;
    if (page === null && !covering) return null;
    // With no page left in any tab, the page the hash names still tells whose window it is.
    const home = prototypeBrowserHome(sim) ?? page;
    return {
      view: presentBrowser(context.state, sim, m, home),
      shortcuts: entry?.kind === 'new-tab' ? prototypeNewTabShortcuts(context.state, home) : [],
      switcher: this.#tabSwitcher,
      send: (command) => this.#onBrowserCommand(command),
    };
  }

  #sendBrowser(intent: BrowserIntent): void {
    if (this.#browser === null) return;
    const next = reduceBrowser(this.#browser, intent);
    if (next === this.#browser) return;
    this.#browser = next;
    const entry = activeEntry(next);
    // The hash follows the page the tab now shows; anything else is drawn by the browser itself.
    if (entry?.kind === 'page') this.#goTo(entry.page);
    this.requestUpdate();
  }

  #goTo(page: BrowserPage): void {
    this.navigate({ screen: page.screen ?? null, preview: page.preview ?? null });
  }

  #onBrowserCommand(command: BrowserCommand): void {
    switch (command.kind) {
      case 'reload':
        this.#reload();
        return;
      case 'address':
        this.#openAddress(command.input);
        return;
      case 'back':
      case 'forward':
      case 'new-tab':
        this.#tabSwitcher = false;
        this.#sendBrowser({ kind: command.kind });
        return;
      case 'switcher':
        this.#tabSwitcher = command.open;
        this.requestUpdate();
        return;
      case 'activate':
        // Picking a tab on the overview goes back to the page.
        this.#tabSwitcher = false;
        this.#focusTab = command.focus === true;
        this.#sendBrowser({ kind: 'activate', id: command.id });
        // The tab was already the active one: nothing redraws, so nothing is left to focus.
        this.requestUpdate();
        return;
      case 'close-tab':
        this.#sendBrowser({ kind: command.kind, id: command.id });
        return;
      case 'visit':
        this.#sendBrowser({ kind: 'visit', page: command.page });
        return;
      default:
        return;
    }
  }

  #openAddress(input: string): void {
    const sim = this.#browser;
    if (sim === null) return;
    const state = this.derivation.state;
    const current = presentBrowser(state, sim, prototypeMessages(this.locale)).url || 'https://page.example.com/';
    const page = prototypePageAt(state, input, current);
    if (page !== null) {
      this.#sendBrowser({ kind: 'visit', page });
      return;
    }
    const text = input.trim();
    const url = text.startsWith('/')
      ? new URL(text, current).href
      : /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
        ? text
        : `https://${text}`;
    this.#sendBrowser({ kind: 'unreachable', url });
  }

  /**
   * Reloads the page on screen: a moment of loading, then its forms start
   * over, its dialogs close, it scrolls back to the top, and the mock hears a
   * `dpk-reload` event to reset whatever else it keeps.
   */
  #reload(): void {
    if (this.#pendingReload !== null) return;
    const timer = setTimeout(() => {
      this.#pendingReload = null;
      for (const wrapper of this.#previewWrappers()) {
        for (const form of wrapper.querySelectorAll('form')) form.reset();
        for (const dialog of wrapper.querySelectorAll('dialog')) dialog.close();
        wrapper.scrollTop = 0;
        wrapper.dispatchEvent(new CustomEvent('dpk-reload', { bubbles: true }));
      }
      this.renderRoot.querySelector('.browser .viewport')?.scrollTo?.({ top: 0 });
      this.requestUpdate();
    }, RELOAD_MS);
    this.#pendingReload = { page: this.#shownIds.join(' '), timer };
    this.requestUpdate();
  }

  #stopReload(): void {
    if (this.#pendingReload === null) return;
    clearTimeout(this.#pendingReload.timer);
    this.#pendingReload = null;
  }

  /**
   * A link of the mock that opens a new tab: `target="_blank"`, a Ctrl / Cmd
   * click or a middle click (a background tab). Any other click is the shell's
   * to navigate in place.
   */
  #onLinkClick = (event: MouseEvent): void => {
    if (!this.#browserShown || this.#uiComment.kind !== 'off' || this.#browser === null) return;
    if (event.type === 'auxclick' && event.button !== 1) return;
    const link = this.#mockLink(event);
    if (link === null) return;
    const background = event.metaKey || event.ctrlKey || event.button === 1;
    if (!link.blank && !background) return;
    event.preventDefault();
    event.stopPropagation();
    const page = prototypeBrowserPage(this.derivation.state, parseHash(this.hashFor(link.patch)));
    if (page === null) {
      // A screen outside the browser opens where it is, whatever the link asks.
      if (!background) this.navigate(link.patch);
      return;
    }
    this.#sendBrowser({ kind: 'open-tab', entry: { kind: 'page', page }, background });
  };

  /** The link of a preview the event went through, and where it leads. */
  #mockLink(event: Event): { readonly patch: Record<string, string>; readonly blank: boolean } | null {
    const path = event.composedPath();
    const inPreview = path.some(
      (node) => node instanceof Element && node.parentElement === this && node.hasAttribute('data-preview-id'),
    );
    if (!inPreview) return null;
    for (const node of path) {
      if (!(node instanceof Element) || node === this) break;
      const nav = node.getAttribute('data-dpk-navigate');
      const href = node instanceof HTMLAnchorElement ? node.getAttribute('href') : null;
      const target = nav ?? (href?.startsWith('#') ? href : null);
      if (target === null) continue;
      const hash = nav !== null && !nav.includes('=') ? `step=${nav}` : target;
      return { patch: { ...parseHash(hash) }, blank: node.getAttribute('target') === '_blank' };
    }
    return null;
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
