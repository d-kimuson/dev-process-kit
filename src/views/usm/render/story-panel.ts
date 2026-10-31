import { css, html, nothing, type TemplateResult } from 'lit';
import { FileText, Tag } from 'lucide';
import * as v from 'valibot';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';

import { linkIcon } from '../../../components/atoms/link';
import { iconCheck, iconClose, iconComment, iconCopy, iconTrash, lucide } from '../../../core/icons';
import { createEntityId } from '../../../core/target';
import { onCommit } from '../../../lib/dom/events';
import { describeLink } from '../../../lib/link-label';
import { dependencyOf, isFinished } from '../dependencies';
import {
  allUsmIds,
  findMilestone,
  findStep,
  findStory,
  hasFeature,
  linkUrlSchema,
  type UserStory,
  type UsmState,
} from '../model';
import { statusViews } from '../status-view';
import { storyIdTitle, storyInfoMarkdown } from '../story-copy';
import { storyKey } from '../story-key';
import { initialOf } from './avatar';
import { renderDependencyPicker, type DependencyPicker } from './dependency-picker';
import { statusIcon, statusToneStyle } from './tone';

const iconIdTitle = lucide(Tag);
const iconCardInfo = lucide(FileText);

/** The story the panel shows: the one the reader navigated to, if it still exists. */
export const panelStoryOf = (context: ViewRenderContext<UsmState>): UserStory | undefined => {
  return findStory(context.state, context.navigation['story']);
};

/** Copying from the panel: the host keeps the text it last copied. */
export type StoryCopy = {
  /** The text the last press copied, while the buttons say so; `null` once they may have been. */
  readonly copied: string | null;
  readonly copy: (text: string) => void;
};

/**
 * The panel's "Manage …" links point at the definitions its fields read, and
 * those live in the settings dialog: the host opens it on that section.
 */
export type StoryManage = {
  readonly open: (section: 'labels' | 'members') => void;
};

/**
 * The story panel: a drawer on the right that edits one story — its title,
 * status, labels, description and links. A click on a card opens it (`#story=<id>`);
 * closing it clears the story from the navigation. The host moves the focus
 * in and out and closes it on Escape or a press outside (`DismissController`).
 */
export const renderStoryPanel = (
  m: UsmMessages,
  context: ViewRenderContext<UsmState>,
  story: UserStory,
  picker: DependencyPicker,
  copy: StoryCopy,
  manage: StoryManage,
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
      ${renderReviewButton(m, context, story)}
      <button class="dpk-icon-btn" type="button" data-role="close" aria-label=${m.closePanelAria} @click=${close}>
        ${iconClose()}
      </button>
    </header>
    <div class="sp-body">
      <div class="sp-heading">
        <div class="sp-copy-row">
          ${renderKeyButton(m, story, copy)}
          ${renderCopyButton(m, copy, {
            role: 'copy-id-title',
            label: m.copyIdTitle,
            text: storyIdTitle(story),
            icon: iconIdTitle,
          })}
          ${renderCopyButton(m, copy, {
            role: 'copy-info',
            label: m.copyStoryInfo,
            text: storyInfoMarkdown(m, state, story),
            icon: iconCardInfo,
          })}
        </div>
        <h2 class="sp-title">
          <dpk-inline-edit
            wrap
            .value=${story.name}
            .label=${m.storyTitleLabel}
            @dpk-commit=${onCommit((name) => context.dispatch({ type: 'SET_STORY_NAME', target, payload: { name } }))}
          ></dpk-inline-edit>
        </h2>
      </div>
      ${state.statuses.length === 0 ? nothing : renderStatusField(m, context, story)}
      ${hasFeature(state, 'estimates') ? renderEstimateField(m, context, story) : nothing}
      ${hasFeature(state, 'assignees') ? renderAssigneeField(m, context, story, manage) : nothing}
      ${renderLabelsField(m, context, story, manage)} ${renderDependenciesField(m, context, story, picker)}
      <section class="sp-field">
        <h3>${m.storyDescriptionLabel}</h3>
        <dpk-inline-edit
          multiline
          markdown
          class="sp-description"
          .value=${story.description ?? ''}
          .label=${m.storyDescriptionLabel}
          @dpk-commit=${onCommit((description) =>
            context.dispatch({ type: 'SET_STORY_DESCRIPTION', target, payload: { description } }),
          )}
        ></dpk-inline-edit>
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

/** The story's key, which a press copies so the reader can name the story to someone else. */
const renderKeyButton = (m: UsmMessages, story: UserStory, copy: StoryCopy): TemplateResult => {
  const key = storyKey(story);
  const copied = copy.copied === key;
  const label = copied ? m.storyKeyCopied : m.copyStoryKey(key);
  return html`<button
    class="sp-key"
    type="button"
    data-role="copy-key"
    data-copied=${copied ? 'true' : 'false'}
    title=${label}
    aria-label=${label}
    @click=${() => copy.copy(key)}
  >
    <span>${key}</span>${copied ? iconCheck() : iconCopy()}
  </button>`;
};

/**
 * The heading's other copy buttons: the key and title people call the story by,
 * and the whole card as Markdown. Both say they copied the same way the key
 * button does — a check and "Copied" for a moment.
 */
const renderCopyButton = (
  m: UsmMessages,
  copy: StoryCopy,
  button: { readonly role: string; readonly label: string; readonly text: string; readonly icon: () => TemplateResult },
): TemplateResult => {
  const copied = copy.copied === button.text;
  const label = copied ? m.storyKeyCopied : button.label;
  return html`<button
    class="dpk-icon-btn sp-copy"
    type="button"
    data-role=${button.role}
    data-copied=${copied ? 'true' : 'false'}
    title=${label}
    aria-label=${label}
    @click=${() => copy.copy(button.text)}
  >
    ${copied ? iconCheck() : button.icon()}
  </button>`;
};

const renderStatusField = (m: UsmMessages, context: ViewRenderContext<UsmState>, story: UserStory): TemplateResult => {
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
  context: ViewRenderContext<UsmState>,
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

/** Who the story is assigned to, one member or no one; the members are kept in the settings. */
const renderAssigneeField = (
  m: UsmMessages,
  context: ViewRenderContext<UsmState>,
  story: UserStory,
  manage: StoryManage,
): TemplateResult => {
  const current = story.assigneeId ?? null;
  const pick = (memberId: string | null) => (): void => {
    if (memberId === current) return;
    context.dispatch({ type: 'SET_STORY_ASSIGNEE', target: { type: 'story', id: story.id }, payload: { memberId } });
  };
  return html`<section class="sp-field">
    <h3 id="sp-assignee-label" class="sp-field-head">
      <span>${m.storyAssigneeLabel}</span>
      <button class="sp-manage" type="button" @click=${() => manage.open('members')}>${m.manageMembers}</button>
    </h3>
    ${
      context.state.members.length === 0
        ? html`<p class="sp-empty">${m.storyNoMembers}</p>`
        : html`<div class="sp-assignees" role="radiogroup" aria-labelledby="sp-assignee-label">
            <button
              class="sp-assignee"
              type="button"
              role="radio"
              data-assignee=""
              aria-checked=${String(current === null)}
              @click=${pick(null)}
            >
              ${m.noAssignee}
            </button>
            ${context.state.members.map(
              (member) => html`<button
                class="sp-assignee"
                type="button"
                role="radio"
                data-assignee=${member.id}
                aria-checked=${String(member.id === current)}
                style=${statusToneStyle(member.tone)}
                @click=${pick(member.id)}
              >
                <span class="sp-avatar" aria-hidden="true">${initialOf(member.name)}</span>${member.name}
              </button>`,
            )}
          </div>`
    }
  </section>`;
};

/**
 * Every label of the map as a toggle: pressing one puts it on the story or
 * takes it off. The labels themselves are kept in the settings.
 */
const renderLabelsField = (
  m: UsmMessages,
  context: ViewRenderContext<UsmState>,
  story: UserStory,
  manage: StoryManage,
): TemplateResult => {
  const target = { type: 'story', id: story.id };
  const carried = new Set(story.labelIds ?? []);
  return html`<section class="sp-field">
    <h3 id="sp-labels-label" class="sp-field-head">
      <span>${m.storyLabelsLabel}</span>
      <button class="sp-manage" type="button" @click=${() => manage.open('labels')}>${m.manageLabels}</button>
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
  context: ViewRenderContext<UsmState>,
  story: UserStory,
  picker: DependencyPicker,
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
      ${renderDependencyPicker(m, context, story.id, 'blocker', picker, (id) =>
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
      ${renderDependencyPicker(m, context, story.id, 'dependent', picker, (id) =>
        edge('ADD_STORY_BLOCKER', id, story.id),
      )}
    </div>
  </section>`;
};

const renderLinksField = (m: UsmMessages, context: ViewRenderContext<UsmState>, story: UserStory): TemplateResult => {
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
 * Opens the review rail at a review comment on this story: a request to the
 * agent, which leaves with the draft. The count is the review comments on it.
 */
const renderReviewButton = (m: UsmMessages, context: ViewRenderContext<UsmState>, story: UserStory): TemplateResult => {
  const count = context.commentCount({ type: 'story', id: story.id });
  return html`<button
    class="sp-review"
    type="button"
    data-role="review-story"
    title=${m.reviewStoryTitle}
    aria-label=${count > 0 ? `${m.reviewStoryButton} (${count})` : m.reviewStoryButton}
    @click=${() => context.requestComment({ type: 'story', id: story.id })}
  >
    ${iconComment()}<span>${m.reviewStoryButton}</span>${
      count > 0 ? html`<span class="sp-review-count">${count}</span>` : nothing
    }
  </button>`;
};

/**
 * The comments kept on the story, oldest first, and a field to add one. They
 * are part of the map, like the description: adding or deleting one is a
 * change in the draft, which the agent writes into the base data.
 */
const renderComments = (m: UsmMessages, context: ViewRenderContext<UsmState>, story: UserStory): TemplateResult => {
  const target = { type: 'story', id: story.id };
  return html`<section class="sp-field sp-comments">
    <h3>${m.storyCommentsLabel}</h3>
    <dpk-comment-thread
      inline
      .comments=${story.comments ?? []}
      draft-key=${`story-comment:${story.id}`}
      @dpk-thread-comment-add=${(event: CustomEvent<{ body: string }>) => {
        const id = createEntityId('comment', allUsmIds(context.state));
        const outcome = context.dispatch({
          type: 'ADD_STORY_COMMENT',
          target,
          payload: { id, body: event.detail.body, createdAt: new Date().toISOString() },
        });
        if (outcome.ok) event.preventDefault();
      }}
      @dpk-thread-comment-delete=${(event: CustomEvent<{ id: string }>) => {
        context.dispatch({ type: 'DELETE_STORY_COMMENT', target, payload: { commentId: event.detail.id } });
      }}
    ></dpk-comment-thread>
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
    /* The close button keeps clear of a floating menu docked at the right edge. */
    padding: 14px calc(22px + var(--dpk-floating-menu-clearance, 0px)) 12px 22px;
    min-height: 60px;
    box-sizing: border-box;
    border-bottom: 1px solid var(--dpk-rule);
  }
  .sp-heading {
    display: grid;
    justify-items: start;
    gap: 6px;
  }
  .sp-heading .sp-title {
    justify-self: stretch;
  }
  /* The three copy buttons sit on one line, the key's chip first. */
  .sp-copy-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .sp-copy {
    width: 22px;
    height: 22px;
  }
  .sp-copy svg {
    width: 13px;
    height: 13px;
  }
  .sp-copy[data-copied='true'] {
    color: var(--dpk-green);
  }
  .sp-key {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 7px;
    border: 1px solid var(--dpk-rule);
    border-radius: 6px;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-soft);
    font: inherit;
    font-family: var(--dpk-mono);
    font-size: 11px;
    font-weight: 650;
    line-height: 18px;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  .sp-key:hover {
    border-color: var(--dpk-rule-strong);
    color: var(--dpk-ink);
  }
  .sp-key:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .sp-key[data-copied='true'] {
    color: var(--dpk-green);
  }
  .sp-key svg {
    flex: none;
    width: 12px;
    height: 12px;
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
  /* A dependency's name is one nowrap line with an ellipsis, and every grid
     box between it and the panel keeps the default min-width (auto): the line
     would then become the grid's minimum width and make the whole body scroll
     sideways instead of cropping the name. Each level opts out. */
  .sp-body > *,
  .sp-deps > *,
  .sp-dep-side > *,
  .sp-dep-list > li {
    min-width: 0;
  }
  .sp-title {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    letter-spacing: -0.015em;
    line-height: 1.35;
  }
  .sp-title dpk-inline-edit {
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
  .sp-assignees {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .sp-assignee {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px 3px 4px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 140ms var(--dpk-ease),
      border-color 140ms var(--dpk-ease);
  }
  .sp-assignee[data-assignee=''] {
    padding-left: 10px;
  }
  .sp-assignee:hover {
    border-color: var(--dpk-rule-hover);
  }
  .sp-assignee:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .sp-assignee[aria-checked='true'] {
    border-color: var(--usm-tone, var(--dpk-ink));
    background: color-mix(in oklab, var(--usm-tone, var(--dpk-ink)) 12%, var(--dpk-paper-raised));
    color: var(--dpk-ink);
  }
  .sp-avatar {
    display: inline-grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--usm-tone);
    color: var(--dpk-paper-raised);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }
  .sp-field-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .sp-manage {
    /* A button, since it opens the settings dialog rather than moving the page. */
    padding: 0;
    border: 0;
    background: none;
    color: var(--dpk-ink-faint);
    font: inherit;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    cursor: pointer;
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
  .sp-comments dpk-comment-thread {
    margin-top: 6px;
  }
  /* A request to the agent, not part of the story: it carries the review rail's comment icon. */
  .sp-review {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .sp-review:hover {
    color: var(--dpk-accent);
    border-color: color-mix(in srgb, var(--dpk-accent) 45%, transparent);
  }
  .sp-review:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .sp-review svg {
    width: 14px;
    height: 14px;
  }
  .sp-review-count {
    min-width: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--dpk-accent-soft);
    color: var(--dpk-accent);
    font-family: var(--dpk-mono);
    font-size: 10px;
    line-height: 16px;
    text-align: center;
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
