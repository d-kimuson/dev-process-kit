import { css, html, nothing, type TemplateResult } from 'lit';
import * as v from 'valibot';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';

import { commentBody } from '../../../core/comment';
import { iconClose, iconTrash } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { describeLink } from '../../../lib/link-label';
import { blockerOptions, dependencyOf, dependentOptions, isFinished } from '../dependencies';
import { findMilestone, findStep, findStory, linkUrlSchema, type UserStory, type UsmState } from '../model';
import { statusViews } from '../status-view';
import { linkIcon } from './link-icon';
import { statusIcon, statusToneStyle } from './tone';

/** The story the panel shows: the one the reader navigated to, if it still exists. */
export const panelStoryOf = (context: TemplateRenderContext<UsmState>): UserStory | undefined => {
  return findStory(context.state, context.navigation['story']);
};

/**
 * The story panel: a drawer on the right that edits one story — its title,
 * status, labels, description and links. A click on a card opens it (`#story=<id>`);
 * closing it clears the story from the navigation. The host moves the focus
 * in and out and closes it on Escape or a press outside (`DismissController`).
 */
export const renderStoryPanel = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  story: UserStory,
): TemplateResult => {
  const { state } = context;
  const target = { type: 'story', id: story.id };
  const close = (): void => context.navigate({ story: null });
  const located = findStep(state, `${story.activityId}.${story.stepId}`);
  const milestone = findMilestone(state, story.milestoneId);
  return html`<aside
    class="story-panel"
    role="dialog"
    aria-label=${m.panelLabel(story.name)}
    data-testid="usm-story-panel"
    data-story=${story.id}
    tabindex="-1"
  >
    <header class="sp-head">
      <span class="sp-where">
        ${located ? html`<span>${located.activity.name}</span><span>${located.step.name}</span>` : nothing}
        <span>${milestone?.name ?? m.unassigned}</span>
      </span>
      <button class="dpk-icon-btn" type="button" data-role="close" aria-label=${m.closePanelAria} @click=${close}>
        ${iconClose()}
      </button>
    </header>
    <div class="sp-body">
      <h2 class="sp-title">
        <dpk-component-inline-edit
          wrap
          .value=${story.name}
          .label=${m.storyTitleLabel}
          @dpk-commit=${onCommit((name) => context.dispatch({ type: 'SET_STORY_NAME', target, payload: { name } }))}
        ></dpk-component-inline-edit>
      </h2>
      ${state.statuses.length === 0 ? nothing : renderStatusField(m, context, story)}
      ${renderEstimateField(m, context, story)} ${renderLabelsField(m, context, story)}
      ${renderDependenciesField(m, context, story)}
      <section class="sp-field">
        <h3>${m.storyDescriptionLabel}</h3>
        <dpk-component-inline-edit
          multiline
          markdown
          class="sp-description"
          .value=${story.description ?? ''}
          .label=${m.storyDescriptionLabel}
          @dpk-commit=${onCommit((description) =>
            context.dispatch({ type: 'SET_STORY_DESCRIPTION', target, payload: { description } }),
          )}
        ></dpk-component-inline-edit>
      </section>
      ${renderLinksField(m, context, story)} ${renderComments(m, context, story)}
    </div>
    <footer class="sp-foot">
      <button
        class="dpk-btn dpk-btn--ghost sp-delete"
        type="button"
        @click=${() => {
          const outcome = context.dispatch({ type: 'DELETE_STORY', target, payload: {} });
          if (outcome.ok) close();
        }}
      >
        ${iconTrash()}<span>${m.deleteStoryButton}</span>
      </button>
    </footer>
  </aside>`;
};

const renderStatusField = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  story: UserStory,
): TemplateResult => {
  const options = statusViews(context.state);
  const current = story.statusId;
  return html`<section class="sp-field">
    <h3 id="sp-status-label">${m.storyStatusLabel}</h3>
    <div class="sp-statuses" role="radiogroup" aria-labelledby="sp-status-label">
      ${options.map(
        (option) => html`<button
          class="sp-status"
          type="button"
          role="radio"
          data-status=${option.id}
          aria-checked=${String(option.id === current)}
          style=${statusToneStyle(option.tone)}
          @click=${() => {
            if (option.id === current) return;
            context.dispatch({
              type: 'SET_STORY_STATUS',
              target: { type: 'story', id: story.id },
              payload: { statusId: option.id },
            });
          }}
        >
          ${statusIcon(option)}<span>${option.name}</span>
        </button>`,
      )}
    </div>
  </section>`;
};

/**
 * The estimate scale as a radio group, with "none" first: a story need not be
 * estimated. The scale itself is kept on the burndown tab.
 */
const renderEstimateField = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  story: UserStory,
): TemplateResult => {
  const current = story.estimateId ?? null;
  const pick = (estimateId: string | null) => (): void => {
    if (estimateId === current) return;
    context.dispatch({ type: 'SET_STORY_ESTIMATE', target: { type: 'story', id: story.id }, payload: { estimateId } });
  };
  const options = [
    { id: null, name: m.unestimated, title: m.unestimated },
    ...context.state.estimates.map((estimate) => ({
      id: estimate.id,
      name: estimate.name,
      title: m.estimateText(estimate.name, estimate.points),
    })),
  ];
  return html`<section class="sp-field">
    <h3 id="sp-estimate-label" class="sp-field-head">
      <span>${m.storyEstimateLabel}</span>
      <a class="sp-manage" href=${context.hashFor({ tab: 'burndown', story: null })}>${m.manageEstimates}</a>
    </h3>
    ${
      context.state.estimates.length === 0
        ? html`<p class="sp-empty">${m.noEstimates}</p>`
        : html`<div class="sp-estimates" role="radiogroup" aria-labelledby="sp-estimate-label">
            ${options.map(
              (option) => html`<button
                class="sp-estimate"
                type="button"
                role="radio"
                data-estimate=${option.id ?? ''}
                title=${option.title}
                aria-checked=${String(option.id === current)}
                @click=${pick(option.id)}
              >
                ${option.name}
              </button>`,
            )}
          </div>`
    }
  </section>`;
};

/**
 * Every label of the map as a toggle: pressing one puts it on the story or
 * takes it off. The labels themselves are kept on the labels tab.
 */
const renderLabelsField = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  story: UserStory,
): TemplateResult => {
  const target = { type: 'story', id: story.id };
  const carried = new Set(story.labelIds ?? []);
  return html`<section class="sp-field">
    <h3 id="sp-labels-label" class="sp-field-head">
      <span>${m.storyLabelsLabel}</span>
      <a class="sp-manage" href=${context.hashFor({ tab: 'labels', story: null })}>${m.manageLabels}</a>
    </h3>
    ${
      context.state.labels.length === 0
        ? html`<p class="sp-empty">${m.storyNoLabels}</p>`
        : html`<div class="sp-labels" role="group" aria-labelledby="sp-labels-label">
            ${context.state.labels.map((label) => {
              const on = carried.has(label.id);
              return html`<button
                class="sp-label"
                type="button"
                data-label=${label.id}
                aria-pressed=${String(on)}
                style=${statusToneStyle(label.tone)}
                @click=${() =>
                  context.dispatch({
                    type: on ? 'REMOVE_STORY_LABEL' : 'ADD_STORY_LABEL',
                    target,
                    payload: { labelId: label.id },
                  })}
              >
                <span class="sp-label-dot" aria-hidden="true"></span><span>${label.name}</span>
              </button>`;
            })}
          </div>`
    }
  </section>`;
};

/**
 * What the story waits on and what waits on it. Either side is edited from
 * here: a story taking on a dependent is the same edge seen from its blocker.
 * The pickers offer only the stories that keep the graph free of cycles.
 */
const renderDependenciesField = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  story: UserStory,
): TemplateResult => {
  const { state } = context;
  const dependency = dependencyOf(state, story.id);
  const edge = (type: 'ADD_STORY_BLOCKER' | 'REMOVE_STORY_BLOCKER', storyId: string, blockerId: string) =>
    context.dispatch({ type, target: { type: 'story', id: storyId }, payload: { blockerId } });
  const row = (
    attribute: 'data-blocker' | 'data-dependent',
    id: string,
    removeAria: (name: string) => string,
    remove: () => void,
  ): TemplateResult | typeof nothing => {
    const other = findStory(state, id);
    if (!other) return nothing;
    const status = statusViews(state).find((view) => view.id === other.statusId);
    return html`<li
      data-blocker=${attribute === 'data-blocker' ? id : nothing}
      data-dependent=${attribute === 'data-dependent' ? id : nothing}
      data-finished=${String(isFinished(state, other))}
    >
      <a class="sp-dep-name" href=${context.hashFor({ story: id })} style=${statusToneStyle(status?.tone)}>
        ${status ? statusIcon(status) : nothing}<span>${other.name}</span>
      </a>
      <button
        class="dpk-icon-btn"
        type="button"
        data-role="remove"
        aria-label=${removeAria(other.name)}
        @click=${remove}
      >
        ${iconClose()}
      </button>
    </li>`;
  };
  const picker = (
    role: 'add-blocker' | 'add-dependent',
    placeholder: string,
    options: readonly UserStory[],
    pick: (id: string) => void,
  ): TemplateResult | typeof nothing =>
    options.length === 0
      ? nothing
      : html`<select
          class="dpk-select sp-dep-add"
          data-role=${role}
          aria-label=${placeholder}
          @change=${(event: Event) => {
            const select = event.currentTarget instanceof HTMLSelectElement ? event.currentTarget : null;
            if (!select || select.value === '') return;
            pick(select.value);
            select.value = '';
          }}
        >
          <option value="" selected>${placeholder}</option>
          ${options.map((option) => html`<option value=${option.id}>${option.name}</option>`)}
        </select>`;
  return html`<section class="sp-field sp-deps">
    <h3>${m.storyDependenciesLabel}</h3>
    <div class="sp-dep-side">
      <h4>${m.storyBlockersLabel}</h4>
      ${
        dependency.blockers.length === 0
          ? html`<p class="sp-empty">${m.storyNoBlockers}</p>`
          : html`<ul class="sp-dep-list">
              ${dependency.blockers.map((id) =>
                row('data-blocker', id, m.removeBlockerAria, () => edge('REMOVE_STORY_BLOCKER', story.id, id)),
              )}
            </ul>`
      }
      ${picker('add-blocker', m.addBlockerPlaceholder, blockerOptions(state, story.id), (id) =>
        edge('ADD_STORY_BLOCKER', story.id, id),
      )}
    </div>
    <div class="sp-dep-side">
      <h4>${m.storyDependentsLabel}</h4>
      ${
        dependency.dependents.length === 0
          ? html`<p class="sp-empty">${m.storyNoDependents}</p>`
          : html`<ul class="sp-dep-list">
              ${dependency.dependents.map((id) =>
                row('data-dependent', id, m.removeDependentAria, () => edge('REMOVE_STORY_BLOCKER', id, story.id)),
              )}
            </ul>`
      }
      ${picker('add-dependent', m.addDependentPlaceholder, dependentOptions(state, story.id), (id) =>
        edge('ADD_STORY_BLOCKER', id, story.id),
      )}
    </div>
  </section>`;
};

const renderLinksField = (
  m: UsmMessages,
  context: TemplateRenderContext<UsmState>,
  story: UserStory,
): TemplateResult => {
  const target = { type: 'story', id: story.id };
  const links = story.links ?? [];
  const add = (event: Event): void => {
    event.preventDefault();
    const form = event.currentTarget instanceof HTMLFormElement ? event.currentTarget : null;
    const input = form?.querySelector('input');
    if (!form || !input) return;
    const url = input.value.trim();
    // An invalid URL stays in the field, marked, so nothing typed is lost.
    if (!v.safeParse(linkUrlSchema, url).success) {
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    const outcome = context.dispatch({ type: 'ADD_STORY_LINK', target, payload: { url } });
    if (!outcome.ok) return;
    input.removeAttribute('aria-invalid');
    form.reset();
  };
  return html`<section class="sp-field">
    <h3>${m.storyLinksLabel}</h3>
    ${
      links.length === 0
        ? nothing
        : html`<ul class="sp-links">
            ${links.map((link) => {
              const label = describeLink(link.url);
              const text = link.label ?? label.text;
              return html`<li data-kind=${label.kind}>
                <a class="sp-link" href=${link.url} target="_blank" rel="noopener noreferrer" title=${link.url}>
                  ${linkIcon(label.kind)}
                  <span class="sp-link-text">${text}</span>
                  <span class="sp-link-url">${label.title === text ? link.url : label.title}</span>
                </a>
                <button
                  class="dpk-icon-btn"
                  type="button"
                  aria-label=${m.removeLinkAria(text)}
                  @click=${() => context.dispatch({ type: 'REMOVE_STORY_LINK', target, payload: { url: link.url } })}
                >
                  ${iconClose()}
                </button>
              </li>`;
            })}
          </ul>`
    }
    <form class="sp-add-link" @submit=${add}>
      <input
        class="dpk-input"
        type="url"
        inputmode="url"
        placeholder="https://"
        aria-label=${m.linkUrlLabel}
        @input=${(event: Event) => {
          if (event.currentTarget instanceof HTMLInputElement) event.currentTarget.removeAttribute('aria-invalid');
        }}
      />
      <button class="dpk-btn" type="submit">${m.addLinkButton}</button>
    </form>
  </section>`;
};

/**
 * The story's comments, oldest first, and a field to add one. A comment is a
 * draft action like any other, so it reaches the agent with the rest.
 */
const renderComments = (m: UsmMessages, context: TemplateRenderContext<UsmState>, story: UserStory): TemplateResult => {
  const notes = context.comments.filter((note) => note.target.type === 'story' && note.target.id === story.id);
  const send = (form: HTMLFormElement): void => {
    const field = form.querySelector('textarea');
    const body = field?.value.trim() ?? '';
    if (!field || body === '') return;
    // The text stays in the field unless the comment was taken.
    const outcome = context.dispatch({ type: 'comment', target: `story:${story.id}`, payload: { body } });
    if (outcome.ok) field.value = '';
  };
  return html`<section class="sp-field sp-comments">
    <h3>${m.storyCommentsLabel}${notes.length > 0 ? html`<span class="sp-count">${notes.length}</span>` : nothing}</h3>
    ${
      notes.length === 0
        ? nothing
        : html`<ol class="sp-comment-list">
            ${notes.map((note) => html`<li>${commentBody(note)}</li>`)}
          </ol>`
    }
    <form
      class="sp-comment-form"
      @submit=${(event: Event) => {
        event.preventDefault();
        if (event.currentTarget instanceof HTMLFormElement) send(event.currentTarget);
      }}
    >
      <textarea
        class="dpk-textarea"
        rows="3"
        aria-label=${m.storyCommentsLabel}
        data-dpk-text-key=${`story:${story.id}`}
        @keydown=${(event: KeyboardEvent) => {
          if (event.isComposing || event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
          event.preventDefault();
          const form = event.currentTarget instanceof HTMLElement ? event.currentTarget.closest('form') : null;
          if (form) send(form);
        }}
      ></textarea>
      <div class="sp-comment-actions">
        <button class="dpk-btn dpk-btn--accent" type="submit">${m.commentSubmit}</button>
      </div>
    </form>
  </section>`;
};

export const storyPanelStyles = css`
  /* Over the main column's edge, below the header: the page's own controls stay in reach. */
  .story-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    width: min(420px, 100%);
    border-left: 1px solid var(--dpk-rule-strong);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-lg);
    animation: sp-slide-in 220ms var(--dpk-ease);
  }
  /* The panel takes the focus when it opens; the ring belongs to its controls. */
  .story-panel:focus {
    outline: none;
  }
  @keyframes sp-slide-in {
    from {
      opacity: 0;
      transform: translateX(24px);
    }
  }
  .sp-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 22px 12px;
    min-height: 60px;
    box-sizing: border-box;
    border-bottom: 1px solid var(--dpk-rule);
  }
  .sp-where {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 0;
    flex: 1 1 auto;
    min-width: 0;
    color: var(--dpk-ink-faint);
    font-size: 11.5px;
    font-weight: 600;
  }
  .sp-where > span + span::before {
    content: '›';
    margin: 0 6px;
    color: var(--dpk-rule-strong);
  }
  .sp-body {
    display: grid;
    align-content: start;
    gap: 22px;
    overflow: auto;
    padding: 18px 22px 24px;
  }
  .sp-title {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.015em;
    line-height: 1.35;
  }
  .sp-title dpk-component-inline-edit {
    display: block;
    margin: 0 -4px;
  }
  .sp-field {
    display: grid;
    gap: 8px;
  }
  .sp-field h3 {
    margin: 0;
    color: var(--dpk-ink-faint);
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .sp-statuses {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .sp-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 12px 5px 9px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }
  .sp-status:hover {
    border-color: color-mix(in oklab, var(--usm-tone) 60%, var(--dpk-rule-strong));
  }
  .sp-status:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .sp-status[aria-checked='true'] {
    border-color: var(--usm-tone);
    background: color-mix(in oklab, var(--usm-tone) 14%, var(--dpk-paper-raised));
    box-shadow: inset 0 0 0 1px var(--usm-tone);
  }
  .sp-estimates {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .sp-estimate {
    min-width: 34px;
    padding: 4px 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font: inherit;
    font-family: var(--dpk-mono);
    font-size: 12px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }
  .sp-estimate[data-estimate=''] {
    font-family: inherit;
    font-weight: 550;
  }
  .sp-estimate:hover {
    border-color: var(--dpk-rule-hover);
  }
  .sp-estimate:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .sp-estimate[aria-checked='true'] {
    border-color: var(--dpk-ink);
    background: var(--dpk-ink);
    color: var(--dpk-paper-raised);
  }
  .sp-field-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .sp-manage {
    color: var(--dpk-ink-faint);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
  }
  .sp-manage:hover {
    color: var(--dpk-blue);
  }
  .sp-empty {
    margin: 0;
    color: var(--dpk-ink-faint);
    font-size: 12.5px;
  }
  .sp-labels {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .sp-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px 3px 8px;
    border: 1px dashed var(--dpk-rule-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }
  .sp-label:hover {
    border-color: color-mix(in oklab, var(--usm-tone) 60%, var(--dpk-rule-strong));
  }
  .sp-label:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .sp-label[aria-pressed='true'] {
    border-style: solid;
    border-color: color-mix(in oklab, var(--usm-tone) 55%, transparent);
    background: color-mix(in oklab, var(--usm-tone) 14%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
  }
  .sp-label-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--usm-tone);
    opacity: 0.5;
  }
  .sp-label[aria-pressed='true'] .sp-label-dot {
    opacity: 1;
  }
  .sp-deps {
    gap: 12px;
  }
  .sp-dep-side {
    display: grid;
    gap: 6px;
  }
  .sp-dep-side h4 {
    margin: 0;
    color: var(--dpk-ink-soft);
    font-size: 11.5px;
    font-weight: 650;
  }
  .sp-dep-list {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sp-dep-list li {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }
  .sp-dep-name {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    padding: 6px 4px 6px 10px;
    color: var(--dpk-ink);
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none;
  }
  .sp-dep-name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sp-dep-name:hover span {
    text-decoration: underline;
  }
  .sp-dep-list li[data-finished='true'] .sp-dep-name span {
    color: var(--dpk-ink-faint);
    text-decoration: line-through;
  }
  .sp-dep-add {
    width: 100%;
  }
  .sp-description {
    display: block;
    margin: 0 -4px;
    color: var(--dpk-ink-soft);
    font-size: 13px;
    line-height: 1.65;
  }
  .sp-links {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sp-links li {
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
  }
  .sp-link {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr);
    column-gap: 9px;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    padding: 7px 4px 7px 10px;
    color: var(--dpk-ink);
    text-decoration: none;
  }
  .sp-link:hover .sp-link-text {
    text-decoration: underline;
  }
  .sp-link svg {
    grid-row: span 2;
    width: 16px;
    height: 16px;
    color: var(--dpk-ink-soft);
  }
  .sp-link-text {
    overflow: hidden;
    font-family: var(--dpk-mono);
    font-size: 12.5px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sp-link-url {
    overflow: hidden;
    color: var(--dpk-ink-faint);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sp-add-link {
    display: flex;
    gap: 6px;
  }
  .sp-add-link input {
    flex: 1 1 auto;
    min-width: 0;
  }
  .sp-add-link input[aria-invalid='true'] {
    border-color: var(--dpk-accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--dpk-accent) 22%, transparent);
  }
  /* The handoff dock floats at the bottom right, so the footer keeps left. */
  .sp-field h3 .sp-count {
    margin-left: 6px;
    font-family: var(--dpk-mono);
    letter-spacing: 0;
  }
  .sp-comment-list {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .sp-comment-list li {
    padding: 8px 11px;
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
    font-size: 12.5px;
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .sp-comment-form {
    display: grid;
    gap: 6px;
  }
  .sp-comment-form textarea {
    resize: vertical;
    min-height: 64px;
  }
  .sp-comment-actions {
    display: flex;
    justify-content: flex-end;
  }
  .sp-foot {
    display: flex;
    justify-content: flex-start;
    padding: 12px 22px;
    border-top: 1px solid var(--dpk-rule);
  }
  .sp-delete {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--dpk-ink-soft);
  }
  .sp-delete svg {
    width: 14px;
    height: 14px;
  }
`;
