import { LitElement, html, nothing, type CSSResultGroup, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { repeat } from 'lit/directives/repeat.js';

import type { CommentTargetOption } from '../../core/types';

import { iconChevronRight, iconComment } from '../../core/icons';
import { LocaleController } from '../../core/locale-controller';
import { PopoverController } from '../../core/popover-controller';
import { observeJsonChild } from '../../lib/dom/base-data';
import { composerMessages } from '../comment-composer/messages';
import { presentComposer } from '../comment-composer/present';
import { renderComposer, type ComposerIntent } from '../comment-composer/view';
import { formalSpecMessages, type FormalSpecMessages } from './messages';
import {
  assuranceCounts,
  claimGroups,
  emptyFormalSpecData,
  parseFormalSpecData,
  plainText,
  type Claim,
  type Clause,
  type ClaimGroup,
  type FormalSpecData,
  type RichText,
  type Term,
} from './model';
import { claimLabel, presentAssurance, specTargets, targetSegments, type SpecTarget } from './present';
import { formalSpecStyles } from './styles';

/** What the tooltip explains: a term's meaning, or what a claim's assurance badge means. */
type Tip = { readonly kind: 'term'; readonly term: string } | { readonly kind: 'assurance'; readonly claim: string };

const claimBodyId = (claim: string): string => `claim-body-${claim}`;

/**
 * `<dpk-component-formal-spec>` — formally verified claims, written for people
 * who do not read the formal language.
 *
 * It is a document, not a canvas: claims read top to bottom, grouped under the
 * function or feature they are about, each split into its inputs, what it
 * assumes and what it concludes, with how strongly it is guaranteed and what it
 * deliberately does not say. A term's meaning and what an assurance means are
 * tooltips where they are used, and nowhere else: a list of definitions would
 * only repeat them away from where they matter.
 *
 * Targets, claims and their clauses are comment targets; there are no edits.
 */
export class DpkComponentFormalSpec extends LitElement {
  static override styles: CSSResultGroup = formalSpecStyles;
  static override properties = {
    data: { attribute: false },
    id: { type: String, reflect: true },
    heading: { type: String },
    subject: { type: String },
  };

  /** The whole specification as a typed property. The JSON child is the HTML-side path. */
  declare data: FormalSpecData | null;
  declare heading: string | null;
  declare subject: string | null;

  #spec: FormalSpecData | null = null;
  #terms: ReadonlyMap<string, Term> = new Map();
  #dataError: string | null = null;
  #stopJsonChild: (() => void) | null = null;
  #targetSignature = '';
  /** The target whose composer is open, and the one open on the previous render. */
  #commenting: string | null = null;
  #previousCommenting: string | null = null;
  #drafts: ReadonlyMap<string, string> = new Map();
  #failedTarget: string | null = null;
  /** The claims the reader unfolded; every claim starts folded. */
  #expanded: ReadonlySet<string> = new Set();
  /** The open tooltip and the element it explains. */
  #tip: { readonly tip: Tip; readonly anchor: HTMLElement } | null = null;
  #previousTipAnchor: HTMLElement | null = null;
  readonly #popovers = new PopoverController(this);
  readonly #i18n = new LocaleController(this, () => {
    this.#targetSignature = '';
  });

  constructor() {
    super();
    this.id = this.getAttribute('id') ?? '';
    this.data = null;
    this.heading = null;
    this.subject = null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#targetSignature = '';
    document.addEventListener('keydown', this.#onKeydown);
    document.addEventListener('pointerdown', this.#onPointerdown);
    this.#stopJsonChild = observeJsonChild(this, parseFormalSpecData, (result) => {
      if (result.ok) this.#apply(result.value);
      else this.#fail(result.error);
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.#onKeydown);
    document.removeEventListener('pointerdown', this.#onPointerdown);
    this.#stopJsonChild?.();
    this.#stopJsonChild = null;
  }

  protected override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('data') && this.data !== null) this.#apply(this.data);
  }

  protected override updated(): void {
    this.#syncTargets();
    this.#syncComposer();
    this.#syncTip();
  }

  // ------------------------------------------------------------------- public

  /** Full-data targets for the enclosing template's review rail. */
  get commentTargets(): readonly CommentTargetOption[] {
    if (!this.id || this.#spec === null) return [];
    const group = `${this.subject ?? this.heading ?? this.#m.heading} · ${this.id}`;
    return specTargets(this.#spec).map(({ target, label }) => ({ value: this.#ref(target), label, group }));
  }

  /** Validation error from the JSON child (read-only). */
  get dataError(): string | null {
    return this.#dataError;
  }

  // ---------------------------------------------------------------- internals

  get #m(): FormalSpecMessages {
    return formalSpecMessages(this.#i18n.locale);
  }

  #current(): FormalSpecData {
    return this.#spec ?? emptyFormalSpecData();
  }

  #apply(spec: FormalSpecData): void {
    this.#spec = spec;
    this.#terms = new Map(spec.terms.map((term) => [term.id, term]));
    this.#dataError = null;
    this.requestUpdate();
  }

  #fail(error: string): void {
    this.#spec = null;
    this.#terms = new Map();
    this.#dataError = error;
    console.error('[dev-process-kit] invalid formal spec data:', error);
    this.requestUpdate();
  }

  #ref(target: SpecTarget): string {
    return `element:${[this.id, ...targetSegments(target)].map((id) => encodeURIComponent(id)).join('/')}`;
  }

  #syncTargets(): void {
    const signature = JSON.stringify(this.commentTargets);
    if (signature === this.#targetSignature) return;
    this.#targetSignature = signature;
    this.dispatchEvent(new CustomEvent('dpk-comment-targets-change', { bubbles: true, composed: true }));
  }

  /** Anchors an open composer to its trigger; focus moves in only when it opens. */
  #syncComposer(): void {
    const opened = this.#previousCommenting !== this.#commenting;
    this.#previousCommenting = this.#commenting;
    const surface = this.renderRoot.querySelector<HTMLElement>('.comment-pop');
    const anchor = this.#trigger(this.#commenting);
    if (!surface || !anchor) return;
    this.#popovers.open(surface, anchor, { width: 300, height: 280 }, { placement: 'right-start' });
    if (opened) surface.querySelector('textarea')?.focus({ preventScroll: true });
  }

  #trigger(ref: string | null): HTMLButtonElement | null {
    if (ref === null) return null;
    return (
      [...this.renderRoot.querySelectorAll<HTMLButtonElement>('[data-comment-ref]')].find(
        (button) => button.dataset['commentRef'] === ref,
      ) ?? null
    );
  }

  #commentIntent(ref: string, intent: ComposerIntent): void {
    if (intent.kind === 'input') {
      this.#drafts = new Map(this.#drafts).set(ref, intent.body);
      this.#failedTarget = null;
      this.requestUpdate();
      return;
    }
    if (intent.kind === 'comment') {
      // Only an enclosing template that saved the comment cancels the event.
      const accepted = !this.dispatchEvent(
        new CustomEvent('dpk-comment-submit', {
          detail: { target: ref, body: intent.body },
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
      if (!accepted) {
        this.#failedTarget = ref;
        this.requestUpdate();
        return;
      }
      const drafts = new Map(this.#drafts);
      drafts.delete(ref);
      this.#drafts = drafts;
    }
    this.#failedTarget = null;
    const anchor = this.#trigger(ref);
    this.#commenting = null;
    this.requestUpdate();
    anchor?.focus({ preventScroll: true });
  }

  #toggleClaim(id: string): void {
    const expanded = new Set(this.#expanded);
    if (!expanded.delete(id)) expanded.add(id);
    this.#expanded = expanded;
    // Folding removes the clause triggers and terms a composer or tooltip may be anchored to.
    if (!expanded.has(id)) {
      const clausePrefix = this.#ref({ kind: 'clause', claim: id, clause: '' });
      if (this.#commenting?.startsWith(clausePrefix)) this.#commenting = null;
      const anchor = this.#tip?.anchor;
      if (anchor?.closest('.claim-body')?.id === claimBodyId(id)) this.#hideTip(anchor);
    }
    this.requestUpdate();
  }

  /** The statement row unfolds the claim too, unless the click meant a control in it or selected text. */
  #onHeadClick(event: MouseEvent, id: string): void {
    const origin = event.composedPath()[0];
    if (origin instanceof Element && origin.closest('button, a')) return;
    if ((document.getSelection()?.toString() ?? '') !== '') return;
    this.#toggleClaim(id);
  }

  /** Anchors the tooltip to what it explains, once per anchor; only that element is described by it. */
  #syncTip(): void {
    const anchor = this.#tip?.anchor ?? null;
    const opened = this.#previousTipAnchor !== anchor;
    if (opened) {
      this.#previousTipAnchor?.removeAttribute('aria-describedby');
      anchor?.setAttribute('aria-describedby', 'spec-tip');
    }
    this.#previousTipAnchor = anchor;
    const surface = this.renderRoot.querySelector<HTMLElement>('.spec-tip');
    if (!surface || !anchor || !opened) return;
    this.#popovers.open(surface, anchor, { width: 300, height: 240 }, { placement: 'top-start' });
  }

  #showTip(tip: Tip, anchor: HTMLElement): void {
    if (this.#tip?.anchor === anchor) return;
    this.#tip = { tip, anchor };
    this.requestUpdate();
  }

  #hideTip(anchor?: HTMLElement): void {
    if (this.#tip === null || (anchor !== undefined && this.#tip.anchor !== anchor)) return;
    this.#tip = null;
    this.requestUpdate();
  }

  readonly #onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.#hideTip();
  };

  /** A tap elsewhere closes a tooltip that touch opened, since there is no hover to leave. */
  readonly #onPointerdown = (event: PointerEvent): void => {
    if (this.#tip !== null && !event.composedPath().includes(this.#tip.anchor)) this.#hideTip();
  };

  /**
   * Hover (with a mouse), focus or a click/tap opens the tooltip; leaving,
   * blurring, Escape or a tap elsewhere closes it.
   */
  #tipHandlers(tip: Tip) {
    const on = (event: Event, act: (anchor: HTMLElement) => void) => {
      if (event.currentTarget instanceof HTMLElement) act(event.currentTarget);
    };
    const byMouse = (event: PointerEvent) => event.pointerType !== 'touch';
    return {
      enter: (event: PointerEvent) => byMouse(event) && on(event, (anchor) => this.#showTip(tip, anchor)),
      leave: (event: PointerEvent) => byMouse(event) && on(event, (anchor) => this.#hideTip(anchor)),
      show: (event: Event) => on(event, (anchor) => this.#showTip(tip, anchor)),
      hide: (event: Event) => on(event, (anchor) => this.#hideTip(anchor)),
    };
  }

  // -------------------------------------------------------------------- views

  protected override render(): TemplateResult {
    const m = this.#m;
    const spec = this.#current();
    return html`
      <section class="spec">
        <header class="spec-toolbar">
          <span class="spec-title">${this.heading ?? m.heading}</span>
          ${this.subject ? html`<span class="spec-subject">${this.subject}</span>` : nothing}
          <span class="spec-stats">${this.#renderStats(spec)}</span>
        </header>
        ${
          this.#dataError === null
            ? nothing
            : html`<p class="spec-notice" role="alert">${m.dataError}<br />${this.#dataError}</p>`
        }
        ${this.#dataError === null && spec.claims.length === 0 ? html`<p class="spec-empty">${m.empty}</p>` : nothing}
        <div class="spec-groups">
          ${repeat(
            claimGroups(spec),
            (group) => group.target?.id ?? '',
            (group) => this.#renderGroup(group),
          )}
        </div>
      </section>
      ${this.#renderTip()} ${this.#renderComposer()}
    `;
  }

  #renderStats(spec: FormalSpecData): TemplateResult {
    const m = this.#m;
    const counts = assuranceCounts(spec);
    const chips = [
      { tone: 'unsound', label: m.incomplete, count: counts.incomplete },
      { tone: 'caveat', label: m.bounded, count: counts.bounded },
      { tone: 'caveat', label: m.conditional, count: counts.conditional },
      { tone: 'planned', label: m.planned, count: counts.planned },
    ].filter((chip) => chip.count > 0);
    return html`${m.claims(spec.claims.length)}
    ${chips.map((chip) => html`<span class="spec-chip" data-tone=${chip.tone}>${chip.label} ${chip.count}</span>`)}`;
  }

  /** Claims about one function or feature, under its name in words and in code. */
  #renderGroup(group: ClaimGroup): TemplateResult {
    const claims = html`<div class="spec-claims">
      ${repeat(
        group.claims,
        (claim) => claim.id,
        (claim) => this.#renderClaim(claim),
      )}
    </div>`;
    const target = group.target;
    if (target === null) return claims;
    return html`<section class="target-group" data-target=${target.id}>
      <header class="target-head">
        <span class="target-label">${this.#m.target}</span>
        <h3 class="target-name">${target.name}</h3>
        ${target.code === null ? nothing : html`<code class="target-code">${target.code}</code>`}
        ${this.#renderTrigger({ kind: 'target', target: target.id }, target.name)}
      </header>
      ${target.summary === null ? nothing : html`<p class="target-summary">${this.#rich(target.summary)}</p>`}
      ${group.claims.length === 0 ? html`<p class="spec-empty">${this.#m.noClaims}</p>` : claims}
    </section>`;
  }

  /**
   * Folded, a claim is its statement and how strongly it holds; the reader
   * unfolds the ones worth a closer look, from the chevron or the statement.
   */
  #renderClaim(claim: Claim): TemplateResult {
    const m = this.#m;
    const assurance = presentAssurance(m, claim.assurance);
    const open = this.#expanded.has(claim.id);
    const tip = this.#tipHandlers({ kind: 'assurance', claim: claim.id });
    const bodyId = claimBodyId(claim.id);
    return html`
      <article class="claim" data-claim=${claim.id} data-tone=${assurance.tone}>
        <div class="claim-head" @click=${(event: MouseEvent) => this.#onHeadClick(event, claim.id)}>
          <button
            type="button"
            class="claim-toggle"
            aria-expanded=${open ? 'true' : 'false'}
            aria-controls=${open ? bodyId : nothing}
            aria-label=${open ? m.hideDetails : m.showDetails}
            @click=${() => this.#toggleClaim(claim.id)}
          >
            ${iconChevronRight()}
          </button>
          <h4 class="claim-statement">${this.#rich(claim.statement)}</h4>
          <button
            type="button"
            class="assurance-badge"
            data-tone=${assurance.tone}
            @pointerenter=${tip.enter}
            @pointerleave=${tip.leave}
            @focus=${tip.show}
            @blur=${tip.hide}
            @click=${tip.show}
          >
            ${assurance.label}
          </button>
          ${this.#renderTrigger({ kind: 'claim', claim: claim.id }, claimLabel(claim))}
        </div>
        ${open ? this.#renderClaimBody(claim, bodyId) : nothing}
      </article>
    `;
  }

  #renderClaimBody(claim: Claim, id: string): TemplateResult {
    const m = this.#m;
    const assurance = presentAssurance(m, claim.assurance);
    return html`<div class="claim-body" id=${id}>
      <dl class="claim-parts">
        ${claim.subjects.length === 0 ? nothing : this.#renderPart('subjects', m.subjects, claim, claim.subjects)}
        ${
          claim.premises.length === 0
            ? html`<div class="claim-part" data-part="premises">
                <dt>${m.premises}</dt>
                <dd><p class="claim-none">${m.noPremises}</p></dd>
              </div>`
            : this.#renderPart('premises', m.premises, claim, claim.premises)
        }
        ${this.#renderPart('conclusions', m.conclusions, claim, claim.conclusions)}
      </dl>
      ${
        assurance.itemsLabel === null
          ? nothing
          : html`<div class="assurance" data-tone=${assurance.tone}>
              <p class="assurance-label">${assurance.itemsLabel}</p>
              <ul>
                ${assurance.items.map((item) => html`<li>${this.#rich(item)}</li>`)}
              </ul>
            </div>`
      }
      ${
        claim.examples.length === 0
          ? nothing
          : html`<section class="claim-aside" data-part="examples">
              <h5>${m.examples}</h5>
              ${this.#renderClauses(claim, claim.examples)}
            </section>`
      }
      ${
        claim.notClaimed.length === 0
          ? nothing
          : html`<section class="claim-aside" data-part="not-claimed">
              <h5>${m.notClaimed}</h5>
              ${this.#renderClauses(claim, claim.notClaimed)}
            </section>`
      }
      ${this.#renderFooter(claim)}
    </div>`;
  }

  #renderPart(part: string, label: string, claim: Claim, clauses: readonly Clause[]): TemplateResult {
    return html`<div class="claim-part" data-part=${part}>
      <dt>${label}</dt>
      <dd>${this.#renderClauses(claim, clauses)}</dd>
    </div>`;
  }

  #renderClauses(claim: Claim, clauses: readonly Clause[]): TemplateResult {
    return html`<ul class="clauses">
      ${repeat(
        clauses,
        (clause) => clause.id,
        (clause) =>
          html`<li class="clause" data-clause=${clause.id}>
            <span class="clause-text">${this.#rich(clause.text)}</span>
            ${this.#renderTrigger(
              { kind: 'clause', claim: claim.id, clause: clause.id },
              `${claimLabel(claim)} › ${plainText(clause.text)}`,
            )}
          </li>`,
      )}
    </ul>`;
  }

  #renderFooter(claim: Claim): TemplateResult | typeof nothing {
    const m = this.#m;
    const used = claim.terms.flatMap((id) => this.#terms.get(id) ?? []);
    if (used.length === 0 && claim.source === null) return nothing;
    return html`<footer class="claim-foot">
      ${
        used.length === 0
          ? nothing
          : html`<span class="claim-foot-label">${m.usesTerms}</span> ${used.map((term) =>
                this.#renderTermButton('term-chip', term.id, term.name),
              )}`
      }
      ${
        claim.source === null
          ? nothing
          : html`<span class="claim-source"
              >${m.source}: ${claim.source.tool === null ? nothing : html`${claim.source.tool} · `}<code
                >${claim.source.ref}</code
              ></span
            >`
      }
    </footer>`;
  }

  /** A term reads as part of the sentence; its definition is a hover (or a tap) away. */
  #rich(text: RichText): TemplateResult {
    return html`${text.map((inline) =>
      inline.kind === 'text' ? inline.text : this.#renderTermButton('term', inline.id, inline.label),
    )}`;
  }

  /** Inside a tooltip a term is only marked: the tooltip is not interactive. */
  #richStatic(text: RichText): TemplateResult {
    return html`${text.map((inline) =>
      inline.kind === 'text' ? inline.text : html`<span class="term-static">${inline.label}</span>`,
    )}`;
  }

  #renderTermButton(className: string, id: string, label: string): TemplateResult {
    const tip = this.#tipHandlers({ kind: 'term', term: id });
    return html`<button
      type="button"
      class=${className}
      data-term=${id}
      @pointerenter=${tip.enter}
      @pointerleave=${tip.leave}
      @focus=${tip.show}
      @blur=${tip.hide}
      @click=${tip.show}
    >
      ${label}
    </button>`;
  }

  #renderTip(): TemplateResult | typeof nothing {
    const tip = this.#tip?.tip;
    if (tip === undefined) return nothing;
    const content = this.#tipContent(tip);
    if (content === null) return nothing;
    return html`<div
      id="spec-tip"
      class="spec-tip"
      role="tooltip"
      popover="manual"
      data-tone=${content.tone ?? nothing}
    >
      <p class="tip-title">${content.title}</p>
      <p class="tip-body">${content.body}</p>
    </div>`;
  }

  #tipContent(tip: Tip): { title: string; body: TemplateResult | string; tone?: string } | null {
    if (tip.kind === 'term') {
      const term = this.#terms.get(tip.term);
      return term === undefined ? null : { title: term.name, body: this.#richStatic(term.meaning) };
    }
    const claim = this.#spec?.claims.find((candidate) => candidate.id === tip.claim);
    if (claim === undefined) return null;
    const assurance = presentAssurance(this.#m, claim.assurance);
    return { title: assurance.label, body: assurance.detail, tone: assurance.tone };
  }

  /** The comment icon of one element; needs a component id, like every element comment. */
  #renderTrigger(target: SpecTarget, label: string): TemplateResult | typeof nothing {
    if (!this.id) return nothing;
    const ref = this.#ref(target);
    const title = this.#m.commentOn(label);
    return html`<button
      type="button"
      class="comment-trigger"
      data-comment-ref=${ref}
      aria-label=${title}
      title=${title}
      aria-haspopup="dialog"
      aria-expanded=${this.#commenting === ref ? 'true' : 'false'}
      @click=${() => {
        this.#commenting = this.#commenting === ref ? null : ref;
        this.requestUpdate();
      }}
    >
      ${iconComment()}
    </button>`;
  }

  #renderComposer(): TemplateResult | typeof nothing {
    const ref = this.#commenting;
    const label = ref === null ? undefined : this.commentTargets.find((target) => target.value === ref)?.label;
    if (ref === null || label === undefined) return nothing;
    const vm = presentComposer(this.#drafts.get(ref) ?? '', [], {
      label,
      ...(this.#failedTarget === ref ? { error: this.#m.sendFailed } : {}),
    });
    return html`${keyed(
      ref,
      renderComposer(composerMessages(this.#i18n.locale), vm, (intent) => this.#commentIntent(ref, intent)),
    )}`;
  }
}
