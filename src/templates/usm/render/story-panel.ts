import { css, html, nothing, type TemplateResult } from 'lit';
import * as v from 'valibot';

import type { TemplateRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';

import { iconClose, iconTrash } from '../../../core/icons';
import { onCommit } from '../../../lib/dom/events';
import { describeLink } from '../../../lib/link-label';
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
 * status, description and links. A click on a card opens it (`#story=<id>`);
 * closing it clears the story from the navigation.
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
    @keydown=${(event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return;
      event.preventDefault();
      close();
    }}
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
      <section class="sp-field">
        <h3>${m.storyDescriptionLabel}</h3>
        <dpk-component-inline-edit
          multiline
          class="sp-description"
          .value=${story.description ?? ''}
          .label=${m.storyDescriptionLabel}
          @dpk-commit=${onCommit((description) =>
            context.dispatch({ type: 'SET_STORY_DESCRIPTION', target, payload: { description } }),
          )}
        ></dpk-component-inline-edit>
      </section>
      ${renderLinksField(m, context, story)}
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
  const options = [
    ...statusViews(context.state).map((view) => ({ id: view.id as string | null, name: view.name, view })),
    { id: null, name: m.statusUnset, view: undefined },
  ];
  const current = story.statusId ?? null;
  return html`<section class="sp-field">
    <h3 id="sp-status-label">${m.storyStatusLabel}</h3>
    <div class="sp-statuses" role="radiogroup" aria-labelledby="sp-status-label">
      ${options.map(
        (option) => html`<button
          class="sp-status"
          type="button"
          role="radio"
          data-status=${option.id ?? ''}
          aria-checked=${String(option.id === current)}
          style=${statusToneStyle(option.view?.tone)}
          @click=${() => {
            if (option.id === current) return;
            context.dispatch({
              type: 'SET_STORY_STATUS',
              target: { type: 'story', id: story.id },
              payload: { statusId: option.id },
            });
          }}
        >
          ${statusIcon(option.view)}<span>${option.name}</span>
        </button>`,
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

export const storyPanelStyles = css`
  .story-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    width: min(420px, 100vw);
    border-left: 1px solid var(--dpk-rule-strong);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-lg);
    animation: sp-slide-in 220ms var(--dpk-ease);
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
    /* Like the shell header, stay clear of the fixed review button. */
    padding: 14px 72px 12px 22px;
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
    border-color: color-mix(in srgb, var(--usm-tone) 60%, var(--dpk-rule-strong));
  }
  .sp-status:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }
  .sp-status[aria-checked='true'] {
    border-color: var(--usm-tone);
    background: color-mix(in srgb, var(--usm-tone) 14%, var(--dpk-paper-raised));
    box-shadow: inset 0 0 0 1px var(--usm-tone);
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
