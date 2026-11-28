import { LitElement, html, nothing, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import type { ElementActionResult } from '../../core/element-actions';
import type { CommentTargetOption, DraftAction } from '../../core/types';

import {
  iconClose,
  iconComment,
  iconCaptions,
  iconCaptionsOff,
  iconFullscreen,
  iconFullscreenExit,
  iconNote,
  iconPanelRight,
  iconPause,
  iconPlay,
  iconVolume,
  iconVolumeLow,
  iconVolumeOff,
} from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { controls, iconButtonCss, popoverSurface, tokens } from '../../core/theme';
import { composerMessages } from '../comment-composer/messages';
import { presentComposer } from '../comment-composer/present';
import { inlineComposerCss, renderInlineComposer, type ComposerIntent } from '../comment-composer/view';
import { videoMessages, type VideoMessages } from './messages';
import { VideoMixer } from './mixer';
import {
  ADD_NOTE,
  audioSources,
  emptyVideoData,
  formatTime,
  cueAt,
  layoutTimeline,
  momentOf,
  momentTarget,
  parseVideoData,
  replayNotes,
  sceneIndexAt,
  sceneTarget,
  type Moment,
  type Timeline,
  type VideoData,
} from './model';
import { videoStyles } from './styles';

const SOURCE_SELECTOR = ':scope > script[type="application/json"]';
/** A stage this wide (px) draws a picture at its own size: `--dpk-video-scale` is 1. */
const DEFAULT_DESIGN_WIDTH = 1280;
const SCENE_SELECTOR = ':scope > [data-scene]';
const BACKGROUND_SELECTOR = ':scope > :not([data-scene], script)';
/** Seconds a cue stays current after its end, so a short pause does not blink the caption and the host state away. */
const CUE_LINGER = 0.25;
/** Milliseconds without pointer movement after which the controls hide while playing. */
const IDLE_AFTER = 2500;
const SEEK_STEP = 5;

type PanelTab = 'chapters' | 'comments';

type CommentKind = 'comment' | 'note';

/** A review comment or a note, placed at its time in the video. */
type MomentEntry = {
  readonly id: string;
  readonly kind: CommentKind;
  readonly time: number;
  readonly scene: string;
  readonly body: string;
};

const noteId = (): string => `note-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const momentLabel = ({ scene, time }: Moment): string => `${formatTime(time)} · ${scene.title}`;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

const bodyOf = (comment: DraftAction): string => {
  const payload = comment.payload;
  return typeof payload === 'object' && payload !== null && 'body' in payload && typeof payload.body === 'string'
    ? payload.body
    : '';
};

/** The keys a focused native control answers itself: a slider's arrows, a button's Space and Enter. */
const CONTROL_KEYS = new Set([' ', 'enter', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'home', 'end']);

const isTyping = (event: Event): boolean =>
  event
    .composedPath()
    .some(
      (node) =>
        node instanceof HTMLTextAreaElement ||
        (node instanceof HTMLInputElement && node.type !== 'range') ||
        (node instanceof HTMLElement && node.isContentEditable),
    );

const isNativeControl = (event: Event): boolean => {
  const origin = event.composedPath()[0];
  return origin instanceof HTMLInputElement || origin instanceof HTMLButtonElement;
};

/** The open shadow trees under `root`, nested ones included. A component of the kit in them is made inert. */
const shadowTrees = (root: Element): ShadowRoot[] => {
  const found: ShadowRoot[] = [];
  const visit = (element: Element): void => {
    if (element instanceof HTMLElement && element.localName.startsWith('dpk-') && !element.inert) element.inert = true;
    const shadow = element.shadowRoot;
    if (shadow === null) return;
    found.push(shadow);
    for (const inner of shadow.querySelectorAll('*')) visit(inner);
  };
  visit(root);
  for (const element of root.querySelectorAll('*')) visit(element);
  return found;
};

/**
 * Holds the keyframe animations under each child of the video and moves them to a time. An animation without
 * a forwards fill leaves `getAnimations()` once it ends, so the ones found before are kept to seek back into.
 * A CSS transition answers a state change and runs on its own.
 */
class AnimationClock {
  readonly #known = new WeakMap<Element, Set<Animation>>();

  /** `deep` also reaches into the shadow trees under `root` (a component's own animations), and makes each component inert. */
  drive(root: Element, ms: number, deep: boolean): void {
    const known = this.#known.get(root) ?? new Set<Animation>();
    this.#known.set(root, known);
    const animations = root.getAnimations({ subtree: true });
    if (deep) for (const shadow of shadowTrees(root)) animations.push(...shadow.getAnimations());
    for (const animation of animations) if (!('transitionProperty' in animation)) known.add(animation);
    for (const animation of known) {
      const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
      if (animation.playState === 'idle' || target === null || !target.isConnected) {
        known.delete(animation);
        continue;
      }
      animation.pause();
      animation.currentTime = ms;
    }
  }
}

/**
 * `<dpk-video>` — a video made of the page's own HTML, CSS and scripts, played against one clock.
 *
 * The JSON child lists the scenes, the cues in each (a caption, a recording, or only a mark in time) and the
 * background tracks. Each direct child with `data-scene` is one scene's picture: it crossfades with its scene, and
 * its CSS keyframe animations follow the clock, so they play, pause and seek with the video. Each cue's start is a
 * custom property on its scene's picture (`--dpk-cue-<id or index>`) for delays that follow the cues. Every other
 * child stays on screen the whole time, its keyframe animations on the clock of the whole video. Each child fills
 * the stage.
 *
 * The host reflects what plays (`playing`, `scene`, `cue`, `voice`) for CSS, and `dpk-video-timeupdate` tells a
 * script (a canvas, a 3D scene) each frame. `var(--dpk-video-safe-bottom)` is the height the controls cover at the
 * bottom of the stage while they show (`controls-visible`).
 *
 * With an `id`, each scene and each moment of the video is a comment target of the enclosing view; the side panel
 * writes a review comment at the current time and lists the comments in time order.
 */
export class DpkVideo extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    controls,
    popoverSurface,
    iconButtonCss(),
    inlineComposerCss,
    videoStyles,
  ];
  static override properties = {
    id: { type: String, reflect: true },
    heading: { type: String },
    panelOpen: { type: Boolean, reflect: true, attribute: 'panel-open' },
    designWidth: { type: Number, attribute: 'design-width' },
    _time: { state: true },
    _playing: { state: true },
    _timeline: { state: true },
    _dataError: { state: true },
    _volume: { state: true },
    _muted: { state: true },
    _captions: { state: true },
    _idle: { state: true },
    _fullscreen: { state: true },
    _tab: { state: true },
    _hover: { state: true },
    _draft: { state: true },
    _kind: { state: true },
    _unrecorded: { state: true },
  };

  /** The title, read by assistive technology and used to group the comment targets. */
  declare heading: string | null;
  /** Whether the side panel is open; reflected. */
  declare panelOpen: boolean;
  /** The stage width, in px, that `--dpk-video-scale` is 1 at. */
  declare designWidth: number;
  declare private _time: number;
  declare private _captions: boolean;
  declare private _playing: boolean;
  declare private _timeline: Timeline | null;
  declare private _dataError: string | null;
  declare private _volume: number;
  declare private _muted: boolean;
  declare private _idle: boolean;
  declare private _fullscreen: boolean;
  declare private _tab: PanelTab;
  declare private _hover: { readonly ratio: number; readonly time: number } | null;
  declare private _draft: string;
  declare private _kind: CommentKind;
  declare private _unrecorded: boolean;

  readonly #i18n = new LocaleController(this, () => {
    this.#targetSignature = '';
    this.#replay();
  });
  readonly #mixer = new VideoMixer();
  readonly #clock = new AnimationClock();
  /** Watches the children and their `data-scene`; the JSON's own text is watched by `#sourceObserver`. */
  readonly #childObserver = new MutationObserver(() => {
    void this.#read();
  });
  readonly #sceneObserver = new MutationObserver(() => {
    void this.#read();
  });
  readonly #sourceObserver = new MutationObserver(() => {
    void this.#read();
  });
  #sourceElement: Element | null = null;
  /** The data as the JSON child writes it; `#data` adds the notes of `elementActions`. */
  #authored: VideoData = emptyVideoData();
  #data: VideoData = emptyVideoData();
  #actions: readonly DraftAction[] = [];
  #results: readonly ElementActionResult[] = [];
  #source: string | null = null;
  #anchor = { time: 0, now: 0 };
  #raf = 0;
  #idleTimer = 0;
  #loading = 0;
  #comments: readonly DraftAction[] = [];
  /** Moments a comment was just submitted on, kept as targets until the view hands the comment back. */
  #submitted: ReadonlySet<string> = new Set();
  #targetSignature = '';
  /** The comment targets or the results may have changed since they were last announced. */
  #targetsDirty = true;
  #scrubbing = false;
  #stageWidth = 0;
  readonly #stageObserver = new ResizeObserver(([entry]) => {
    if (entry === undefined) return;
    this.#stageWidth = entry.contentRect.width;
    this.#scale();
  });

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.heading = null;
    this.panelOpen = false;
    this.designWidth = DEFAULT_DESIGN_WIDTH;
    this._time = 0;
    this._playing = false;
    this._timeline = null;
    this._dataError = null;
    this._volume = 1;
    this._muted = false;
    this._captions = true;
    this._idle = false;
    this._fullscreen = false;
    this._tab = 'chapters';
    this._hover = null;
    this._draft = '';
    this._kind = 'comment';
    this._unrecorded = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#targetSignature = '';
    this.#targetsDirty = true;
    document.addEventListener('fullscreenchange', this.#onFullscreenChange);
    this.toggleAttribute('playing', this._playing);
    this.#childObserver.observe(this, { childList: true });
    this.#sceneObserver.observe(this, { attributes: true, attributeFilter: ['data-scene'], subtree: true });
    void this.#read();
    void this.updateComplete.then(() => {
      const stage = this.renderRoot.querySelector('.stage');
      if (stage !== null && this.isConnected) this.#stageObserver.observe(stage);
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#stageObserver.disconnect();
    this.#childObserver.disconnect();
    this.#sceneObserver.disconnect();
    this.#sourceObserver.disconnect();
    this.#sourceElement = null;
    document.removeEventListener('fullscreenchange', this.#onFullscreenChange);
    this.pause();
    clearTimeout(this.#idleTimer);
  }

  protected override updated(changed: PropertyValues): void {
    if (this.#targetsDirty || changed.has('_timeline') || changed.has('id') || changed.has('heading')) {
      this.#targetsDirty = false;
      this.#syncTargets();
    }
    this.toggleAttribute('controls-visible', !this._playing || !this._idle);
    if (changed.has('_timeline')) this.#paint();
    if (changed.has('designWidth')) this.#scale();
  }

  // ------------------------------------------------------------------- public

  /** Why the data could not be read, or `null`. */
  get dataError(): string | null {
    return this._dataError;
  }

  get duration(): number {
    return this._timeline?.duration ?? 0;
  }

  get currentTime(): number {
    return this._time;
  }

  set currentTime(time: number) {
    this.seek(time);
  }

  get paused(): boolean {
    return !this._playing;
  }

  play(): void {
    const start = this._timeline;
    if (start === null || this._playing) return;
    if (this._time >= start.duration - 0.05) this._time = 0;
    this._playing = true;
    this.toggleAttribute('playing', true);
    this.#anchor = { time: this._time, now: performance.now() };
    this.#mixer.sync(this._time, true, true);
    this.#wake();
    const tick = (): void => {
      const timeline = this._timeline;
      if (!this._playing || timeline === null) return;
      const time = this.#anchor.time + (performance.now() - this.#anchor.now) / 1000;
      if (time >= timeline.duration) {
        this._time = timeline.duration;
        this.pause();
        return;
      }
      this._time = time;
      this.#mixer.sync(time, true, false);
      this.#paint();
      this.#raf = requestAnimationFrame(tick);
    };
    this.#raf = requestAnimationFrame(tick);
  }

  pause(): void {
    cancelAnimationFrame(this.#raf);
    this._playing = false;
    this.toggleAttribute('playing', false);
    this.#mixer.stop();
    this.#paint();
  }

  toggle(): void {
    if (this._playing) this.pause();
    else this.play();
  }

  seek(time: number): void {
    this._time = clamp(time, 0, this.duration);
    this.#anchor = { time: this._time, now: performance.now() };
    if (this._playing) this.#mixer.sync(this._time, true, true);
    this.#paint();
  }

  /** Every scene and every commented moment, for the enclosing view's review rail. */
  get commentTargets(): readonly CommentTargetOption[] {
    const timeline = this._timeline;
    if (!this.id || timeline === null) return [];
    const group = `${this.heading ?? this.#m.heading} · ${this.id}`;
    const moments = new Set([...this.#comments.map((comment) => `element:${comment.target.id}`), ...this.#submitted]);
    const momentTargets = [...moments].flatMap((value) => {
      const moment = momentOf(this.id, timeline, value);
      return moment === null ? [] : [{ value, label: momentLabel(moment), group }];
    });
    return [
      ...timeline.scenes.map((scene) => ({ value: sceneTarget(this.id, scene.id), label: scene.title, group })),
      ...momentTargets,
    ];
  }

  /** The review comments on this video, assigned by the enclosing view; listed in the side panel. */
  get elementComments(): readonly DraftAction[] {
    return this.#comments;
  }

  set elementComments(comments: readonly DraftAction[]) {
    this.#comments = comments;
    this.#targetsDirty = true;
    const known = new Set(comments.map((comment) => `element:${comment.target.id}`));
    this.#submitted = new Set([...this.#submitted].filter((target) => !known.has(target)));
    this.requestUpdate();
  }

  /** The reviewer's notes added in this draft (`ADD_NOTE`), assigned by the enclosing view. */
  get elementActions(): readonly DraftAction[] {
    return this.#actions;
  }

  set elementActions(actions: readonly DraftAction[]) {
    this.#actions = actions;
    this.#replay();
  }

  /** How each of `elementActions` applied. */
  get elementActionResults(): readonly ElementActionResult[] {
    return this.#results;
  }

  // ---------------------------------------------------------------- internals

  get #m(): VideoMessages {
    return videoMessages(this.#i18n.locale);
  }

  get #moments(): readonly MomentEntry[] {
    const timeline = this._timeline;
    if (timeline === null) return [];
    const comments = this.#comments.flatMap((comment): MomentEntry[] => {
      const moment = momentOf(this.id, timeline, `element:${comment.target.id}`, { scenes: true });
      return moment === null
        ? []
        : [{ id: comment.id, kind: 'comment', time: moment.time, scene: moment.scene.title, body: bodyOf(comment) }];
    });
    const notes = this.#data.scenes.flatMap((scene): MomentEntry[] => {
      const timed = timeline.scenes.find((candidate) => candidate.id === scene.id);
      if (timed === undefined) return [];
      return scene.notes.map((note) => ({
        id: note.id,
        kind: 'note',
        time: timed.start + clamp(note.at ?? 0, 0, timed.end - timed.start),
        scene: timed.title,
        body: note.body,
      }));
    });
    return [...comments, ...notes].sort((a, b) => a.time - b.time);
  }

  #replay(): void {
    const replayed = replayNotes(this.#m, this.#authored, this.#actions);
    this.#data = replayed.data;
    this.#results = replayed.results;
    this.#targetsDirty = true;
    this.requestUpdate();
  }

  async #read(): Promise<void> {
    const element = this.querySelector(SOURCE_SELECTOR);
    if (element !== this.#sourceElement) {
      this.#sourceObserver.disconnect();
      if (element !== null)
        this.#sourceObserver.observe(element, { childList: true, subtree: true, characterData: true });
      this.#sourceElement = element;
    }
    const source = element?.textContent ?? '';
    if (source === this.#source) {
      this.#decorate();
      this.#paint();
      return;
    }
    this.#source = source;
    const loading = ++this.#loading;
    try {
      this.#authored = parseVideoData(JSON.parse(source));
      this._dataError = null;
    } catch (error) {
      this.pause();
      this.#authored = emptyVideoData();
      this.#replay();
      this._dataError = error instanceof Error ? error.message : String(error);
      this._timeline = null;
      console.error('[dev-process-kit] invalid video data:', this._dataError);
      return;
    }
    this.#replay();
    const lengths = await this.#mixer.measure(audioSources(this.#data), (src) => new URL(src, document.baseURI).href);
    if (loading !== this.#loading) return;
    const timeline = layoutTimeline(this.#data, (src) => lengths.get(src) ?? null);
    this.#mixer.load(timeline);
    this.#mixer.setVolume(this._volume, this._muted);
    this._time = clamp(this._time, 0, timeline.duration);
    this._timeline = timeline;
    this.#decorate();
  }

  /** `--dpk-video-scale`: how much a picture drawn for `designWidth` grows or shrinks to fit the stage. */
  #scale(): void {
    if (this.#stageWidth === 0 || !(this.designWidth > 0)) return;
    this.style.setProperty('--dpk-video-scale', (this.#stageWidth / this.designWidth).toFixed(4));
  }

  /** Gives each scene's picture its cue starts and length; a picture of no scene is an error in the page. */
  #decorate(): void {
    const timeline = this._timeline;
    if (timeline === null) return;
    this._dataError = null;
    for (const layer of this.querySelectorAll<HTMLElement>(SCENE_SELECTOR)) {
      const scene = timeline.scenes.find((candidate) => candidate.id === layer.dataset['scene']);
      if (scene === undefined) {
        this.pause();
        this._dataError = `data-scene="${layer.dataset['scene'] ?? ''}" names no scene of the video`;
        console.error('[dev-process-kit] invalid video data:', this._dataError);
        return;
      }
      for (const cue of scene.cues)
        layer.style.setProperty(`--dpk-cue-${cue.key}`, `${(cue.start - scene.start).toFixed(3)}s`);
      layer.style.setProperty('--dpk-scene-duration', `${(scene.end - scene.start).toFixed(3)}s`);
    }
  }

  /** Draws the light DOM for the current time: scene opacity, keyframe animations and the host's state. */
  #paint(): void {
    const timeline = this._timeline;
    if (timeline === null) return;
    const time = this._time;
    const last = timeline.scenes.length - 1;
    const index = sceneIndexAt(timeline, time);
    const scene = timeline.scenes[index];
    const cue = cueAt(timeline, time, CUE_LINGER);
    this.#reflect('scene', scene?.id ?? null);
    this.#reflect('cue', cue?.key ?? null);
    this.#reflect('voice', cue?.voice ?? null);
    for (const layer of this.querySelectorAll<HTMLElement>(SCENE_SELECTOR)) {
      const at = timeline.scenes.findIndex((candidate) => candidate.id === layer.dataset['scene']);
      const own = timeline.scenes[at];
      if (own === undefined) continue;
      const local = time - own.start;
      const fade = this.#data.fade;
      const fadeIn = at === 0 ? 1 : fade === 0 ? Number(local >= 0) : local / fade + 1;
      const fadeOut = at === last ? 1 : fade === 0 ? Number(time < own.end) : (own.end - time) / fade;
      const opacity = clamp(Math.min(fadeIn, fadeOut), 0, 1);
      layer.style.opacity = String(opacity);
      layer.style.visibility = opacity > 0 ? 'visible' : 'hidden';
      layer.inert = at !== index;
      this.#clock.drive(layer, clamp(local, 0, own.end - own.start) * 1000, opacity > 0);
    }
    for (const child of this.querySelectorAll(BACKGROUND_SELECTOR)) this.#clock.drive(child, time * 1000, true);
    this.dispatchEvent(
      new CustomEvent('dpk-video-timeupdate', {
        detail: {
          time,
          scene: scene?.id ?? null,
          sceneTime: time - (scene?.start ?? 0),
          sceneDuration: scene === undefined ? 0 : scene.end - scene.start,
          cue: cue?.key ?? null,
          cueTime: cue === null ? null : time - cue.start,
          playing: this._playing,
        },
      }),
    );
  }

  #reflect(name: string, value: string | null): void {
    if (value === null) this.removeAttribute(name);
    else if (this.getAttribute(name) !== value) this.setAttribute(name, value);
  }

  #syncTargets(): void {
    const signature = JSON.stringify([this.commentTargets, this.#results]);
    if (signature === this.#targetSignature) return;
    this.#targetSignature = signature;
    this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
  }

  #submit(): void {
    if (this._kind === 'note') this.#keepNote();
    else this.#sendComment();
  }

  #keepNote(): void {
    const body = this._draft.trim();
    const timeline = this._timeline;
    const scene = timeline?.scenes[sceneIndexAt(timeline, this._time)];
    if (!body || !this.id || scene === undefined) return;
    const at = Math.round((this._time - scene.start) * 1000) / 1000;
    const accepted = !this.dispatchEvent(
      new CustomEvent('dpk-element-action', {
        detail: { type: ADD_NOTE, target: sceneTarget(this.id, scene.id), payload: { id: noteId(), at, body } },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    this._unrecorded = !accepted;
    if (accepted) this._draft = '';
  }

  #sendComment(): void {
    const body = this._draft.trim();
    if (!body || !this.id || this._timeline === null) return;
    const target = momentTarget(this.id, this._timeline, this._time);
    this.#submitted = new Set(this.#submitted).add(target);
    this.#targetsDirty = true;
    const accepted = !this.dispatchEvent(
      new CustomEvent('dpk-comment-submit', {
        detail: { target, body },
        bubbles: true,
        composed: true,
        cancelable: true,
      }),
    );
    if (!accepted) {
      const submitted = new Set(this.#submitted);
      submitted.delete(target);
      this.#submitted = submitted;
    }
    this._unrecorded = !accepted;
    if (accepted) this._draft = '';
  }

  #setVolume(volume: number, muted: boolean): void {
    this._volume = volume;
    this._muted = muted;
    this.#mixer.setVolume(volume, muted);
    if (this._playing) this.#mixer.sync(this._time, true, false);
  }

  /** Shows the controls, and hides them again after a while if the video keeps playing. */
  #wake = (): void => {
    this._idle = false;
    clearTimeout(this.#idleTimer);
    this.#idleTimer = window.setTimeout(() => {
      const frame = this.renderRoot.querySelector('.player');
      this._idle = this._playing && !this.#scrubbing && !(frame?.matches(':focus-within') ?? false);
    }, IDLE_AFTER);
  };

  #toggleFullscreen(): void {
    const frame = this.renderRoot.querySelector('.frame');
    if (document.fullscreenElement !== null) void document.exitFullscreen();
    else if (frame instanceof HTMLElement) void frame.requestFullscreen();
  }

  #onFullscreenChange = (): void => {
    this._fullscreen = this.renderRoot instanceof ShadowRoot && this.renderRoot.fullscreenElement !== null;
  };

  #onKeydown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || isTyping(event)) return;
    const key = event.key.toLowerCase();
    if (CONTROL_KEYS.has(key) && isNativeControl(event)) return;
    if (key === ' ' || key === 'k') this.toggle();
    else if (key === 'arrowleft' || key === 'j') this.seek(this._time - SEEK_STEP);
    else if (key === 'arrowright' || key === 'l') this.seek(this._time + SEEK_STEP);
    else if (key === 'home') this.seek(0);
    else if (key === 'end') this.seek(this.duration);
    else if (key === 'm') this.#setVolume(this._volume, !this._muted);
    else if (key === 'f') this.#toggleFullscreen();
    else if (key === 'c') this._captions = !this._captions;
    else return;
    event.preventDefault();
    this.#wake();
  };

  #ratioAt(event: PointerEvent): number {
    const bar = event.currentTarget;
    if (!(bar instanceof HTMLElement)) return 0;
    const rect = bar.getBoundingClientRect();
    return clamp((event.clientX - rect.left) / rect.width, 0, 1);
  }

  #onBarPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    this.#scrubbing = true;
    this.seek(this.#ratioAt(event) * this.duration);
  };

  #onBarPointerMove = (event: PointerEvent): void => {
    const ratio = this.#ratioAt(event);
    this._hover = { ratio, time: ratio * this.duration };
    if (this.#scrubbing) this.seek(ratio * this.duration);
  };

  #onBarPointerUp = (): void => {
    this.#scrubbing = false;
  };

  // ------------------------------------------------------------------- render

  override render(): TemplateResult {
    const m = this.#m;
    if (this._dataError !== null) return html`<p class="error" role="alert">${this._dataError}</p>`;
    const timeline = this._timeline;
    const caption = timeline === null ? null : cueAt(timeline, this._time, CUE_LINGER);
    const chromeShown = !this._playing || !this._idle;
    return html`<div class="frame" ?data-fullscreen=${this._fullscreen}>
      <div
        class="player"
        role="region"
        aria-label=${this.heading ?? m.heading}
        tabindex="0"
        ?data-idle=${!chromeShown}
        @pointermove=${this.#wake}
        @pointerdown=${this.#wake}
        @keydown=${this.#onKeydown}
        @focusin=${this.#wake}
      >
        <div
          class="stage"
          @click=${(event: Event) => {
            if (!event.defaultPrevented) this.toggle();
          }}
        >
          <slot></slot>
          ${
            !this._captions || caption?.text === undefined
              ? nothing
              : html`<p class="subtitle" part="subtitle" data-tone=${caption.captionTone ?? 'white'}>
                  ${
                    caption.voice === undefined
                      ? nothing
                      : html`<span class=${caption.captionTone === null ? 'voice' : 'voice sr-only'} part="voice"
                          >${caption.voice}</span
                        >`
                  }
                  <span>${caption.text}</span>
                </p>`
          }
          ${
            !this._playing && this._time === 0 && timeline !== null
              ? html`<span class="big-play" aria-hidden="true">${iconPlay()}</span>`
              : nothing
          }
        </div>
        ${this.#renderChrome(m, timeline)}
      </div>
      ${this.panelOpen ? this.#renderPanel(m, timeline) : nothing}
    </div>`;
  }

  #renderChrome(m: VideoMessages, timeline: Timeline | null): TemplateResult {
    const duration = timeline?.duration ?? 0;
    const ratio = duration === 0 ? 0 : this._time / duration;
    const hoverScene =
      this._hover === null || timeline === null ? null : timeline.scenes[sceneIndexAt(timeline, this._hover.time)];
    const volume = this._muted ? 0 : this._volume;
    const volumeIcon = volume === 0 ? iconVolumeOff : volume < 0.5 ? iconVolumeLow : iconVolume;
    return html`<div class="chrome" part="controls">
      <div
        class="bar"
        role="slider"
        tabindex="0"
        aria-label=${m.seek}
        aria-valuemin="0"
        aria-valuemax=${Math.round(duration)}
        aria-valuenow=${Math.round(this._time)}
        aria-valuetext=${`${formatTime(this._time)} / ${formatTime(duration)}`}
        style=${`--progress:${ratio}`}
        @pointerdown=${this.#onBarPointerDown}
        @pointermove=${this.#onBarPointerMove}
        @pointerup=${this.#onBarPointerUp}
        @pointercancel=${this.#onBarPointerUp}
        @pointerleave=${() => {
          this._hover = null;
        }}
      >
        <div class="segments">
          ${(timeline?.scenes ?? []).map((scene) => {
            const length = scene.end - scene.start;
            const fill = length === 0 ? 0 : clamp((this._time - scene.start) / length, 0, 1);
            const hover = this._hover === null ? 0 : clamp((this._hover.time - scene.start) / (length || 1), 0, 1);
            return html`<span
              class="segment"
              style=${`flex-grow:${length};--fill:${fill};--hover:${hover}`}
              ?data-hovered=${hoverScene?.id === scene.id}
            ></span>`;
          })}
        </div>
        <span class="thumb"></span>
        ${
          this._hover === null
            ? nothing
            : html`<span class="tooltip" style=${`--at:${this._hover.ratio}`}>
                ${hoverScene === null || hoverScene === undefined ? nothing : html`<b>${hoverScene.title}</b>`}
                <span class="dpk-num">${formatTime(this._hover.time)}</span>
              </span>`
        }
      </div>
      <div class="controls">
        <button
          class="ctl"
          type="button"
          aria-label=${this._playing ? m.pause : m.play}
          title=${this._playing ? m.pause : m.play}
          ?disabled=${timeline === null}
          @click=${() => this.toggle()}
        >
          ${this._playing ? iconPause() : iconPlay()}
        </button>
        <div class="volume">
          <button
            class="ctl"
            type="button"
            aria-label=${this._muted ? m.unmute : m.mute}
            title=${this._muted ? m.unmute : m.mute}
            @click=${() => this.#setVolume(this._volume === 0 ? 1 : this._volume, !this._muted)}
          >
            ${volumeIcon()}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            aria-label=${m.volume}
            .value=${String(volume)}
            style=${`--level:${volume}`}
            @input=${(event: Event) => {
              if (event.currentTarget instanceof HTMLInputElement) {
                const value = Number(event.currentTarget.value);
                this.#setVolume(value, value === 0);
              }
            }}
          />
        </div>
        <span class="time dpk-num">${formatTime(this._time)} / ${formatTime(duration)}</span>
        <span class="spacer"></span>
        ${
          timeline?.scenes.some((scene) => scene.cues.some((cue) => cue.text !== undefined))
            ? html`<button
                class="ctl"
                type="button"
                aria-label=${m.captions}
                title=${m.captions}
                aria-pressed=${this._captions ? 'true' : 'false'}
                @click=${() => {
                  this._captions = !this._captions;
                }}
              >
                ${this._captions ? iconCaptions() : iconCaptionsOff()}
              </button>`
            : nothing
        }
        <button
          class="ctl"
          type="button"
          aria-label=${this._fullscreen ? m.exitFullscreen : m.fullscreen}
          title=${this._fullscreen ? m.exitFullscreen : m.fullscreen}
          @click=${() => this.#toggleFullscreen()}
        >
          ${this._fullscreen ? iconFullscreenExit() : iconFullscreen()}
        </button>
        <button
          class="ctl"
          type="button"
          aria-label=${m.openPanel}
          title=${m.openPanel}
          aria-pressed=${this.panelOpen ? 'true' : 'false'}
          @click=${() => {
            this.panelOpen = !this.panelOpen;
          }}
        >
          ${iconPanelRight()}
        </button>
      </div>
    </div>`;
  }

  #renderPanel(m: VideoMessages, timeline: Timeline | null): TemplateResult {
    const commentable = Boolean(this.id);
    const tab = commentable ? this._tab : 'chapters';
    const moments = this.#moments;
    return html`<aside class="panel" aria-label=${m.openPanel}>
      <div class="panel-body">
        <header class="panel-head">
          ${
            commentable
              ? html`<fieldset class="comment-kinds" @keydown=${(event: Event) => event.stopPropagation()}>
                  <legend>${m.openPanel}</legend>
                  ${(['chapters', 'comments'] as const).map(
                    (value) =>
                      html`<label class="comment-kind">
                        <input
                          type="radio"
                          name="panel-tab"
                          .checked=${tab === value}
                          @change=${() => {
                            this._tab = value;
                          }}
                        />
                        <span
                          >${value === 'chapters' ? m.chapters : m.comments}${
                            value === 'comments' && moments.length > 0
                              ? html` <span class="count dpk-num">${moments.length}</span>`
                              : nothing
                          }</span
                        >
                      </label>`,
                  )}
                </fieldset>`
              : html`<h2 class="panel-title">${m.chapters}</h2>`
          }
          <button
            class="dpk-icon-btn"
            type="button"
            aria-label=${m.closePanel}
            title=${m.closePanel}
            @click=${() => {
              this.panelOpen = false;
            }}
          >
            ${iconClose()}
          </button>
        </header>
        ${tab === 'chapters' ? this.#renderChapters(timeline) : this.#renderComments(m, moments)}
      </div>
    </aside>`;
  }

  #renderChapters(timeline: Timeline | null): TemplateResult {
    const current = timeline === null ? -1 : sceneIndexAt(timeline, this._time);
    return html`<ol class="chapters">
      ${repeat(
        timeline?.scenes ?? [],
        (scene) => scene.id,
        (scene, index) => {
          const length = scene.end - scene.start;
          const progress = index === current && length > 0 ? clamp((this._time - scene.start) / length, 0, 1) : 0;
          return html`<li>
            <button
              class="chapter"
              type="button"
              aria-current=${index === current ? 'true' : 'false'}
              style=${`--progress:${progress}`}
              @click=${() => this.seek(scene.start)}
            >
              <span class="chapter-time dpk-num">${formatTime(scene.start)}</span>
              <span class="chapter-title">${scene.title}</span>
            </button>
          </li>`;
        },
      )}
    </ol>`;
  }

  #renderComments(m: VideoMessages, moments: readonly MomentEntry[]): TemplateResult {
    const timeline = this._timeline;
    const scene = timeline?.scenes[sceneIndexAt(timeline, this._time)];
    const at = scene === undefined ? formatTime(this._time) : momentLabel({ scene, time: this._time });
    const note = this._kind === 'note';
    const vm = presentComposer(this._draft, [], {
      label: note ? m.noteAt(at) : m.commentAt(at),
      placeholder: note ? m.notePlaceholder : m.commentPlaceholder,
      submitLabel: note ? m.keepNote : m.submit,
      choice: {
        label: m.kind,
        value: this._kind,
        options: [
          { value: 'comment', label: m.reviewComment },
          { value: 'note', label: m.note },
        ],
      },
      ...(this._unrecorded ? { error: m.notSaved } : {}),
    });
    const send = (intent: ComposerIntent): void => {
      if (intent.kind === 'input') {
        this._draft = intent.body;
        this._unrecorded = false;
      } else if (intent.kind === 'choose') {
        this._kind = intent.value === 'note' ? 'note' : 'comment';
        this._unrecorded = false;
      } else if (intent.kind === 'comment') this.#submit();
    };
    return html`${
        moments.length === 0
          ? html`<p class="empty">${m.noComments}</p>`
          : html`<ol class="moments">
              ${repeat(
                moments,
                (moment) => `${moment.kind}:${moment.id}`,
                (moment) =>
                  html`<li class="moment" data-kind=${moment.kind}>
                    <button class="moment-time dpk-num" type="button" @click=${() => this.seek(moment.time)}>
                      ${formatTime(moment.time)}
                    </button>
                    <span class="moment-scene">${moment.scene}</span>
                    <span class="moment-kind" role="img" aria-label=${moment.kind === 'note' ? m.note : m.reviewComment}
                      >${moment.kind === 'note' ? iconNote() : iconComment()}</span
                    >
                    <p class="moment-body">${moment.body}</p>
                  </li>`,
              )}
            </ol>`
      }
      <div class="composer" @keydown=${(event: Event) => event.stopPropagation()}>
        ${renderInlineComposer(composerMessages(this.#i18n.locale), vm, send)}
      </div>`;
  }
}
