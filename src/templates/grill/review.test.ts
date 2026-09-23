// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtifactCommentPanel } from '../../components/comment-panel';
import { ArtifactErDiagram } from '../../components/er-diagram/element';
import { parseErData } from '../../components/er-diagram/model';
import { GrillElement } from './element';
import '../../index';

const er = {
  before: { tables: [] },
  after: { tables: [{ id: 'users', name: 'Users', fields: [{ id: 'id', type: 'uuid', key: 'PK' }] }] },
};
const mount = async () => {
  document.body.innerHTML = `<artifact-grill storage="memory"><script type="application/json">${JSON.stringify({ questions: [{ id: 'q', title: 'Question', options: [{ id: 'yes', label: 'Yes' }] }] })}</script><artifact-er-diagram id="schema" slot="main"><script type="application/json">${JSON.stringify(er)}</script></artifact-er-diagram></artifact-grill>`;
  const host = document.querySelector('artifact-grill');
  const diagram = document.querySelector('artifact-er-diagram');
  if (!(host instanceof GrillElement) || !(diagram instanceof ArtifactErDiagram)) throw new Error('not upgraded');
  await host.artifact.ready;
  await diagram.updateComplete;
  await host.updateComplete;
  return { host, diagram };
};
const panelOf = async (host: GrillElement) => {
  await host.updateComplete;
  const panel = host.shadowRoot?.querySelector('artifact-comment-panel');
  if (!(panel instanceof ArtifactCommentPanel)) throw new Error('no panel');
  await panel.updateComplete;
  return panel;
};
const post = async (panel: ArtifactCommentPanel | ArtifactErDiagram, body: string) => {
  const area = panel.shadowRoot?.querySelector('textarea');
  if (!area) throw new Error('no composer');
  area.value = body;
  area.dispatchEvent(new Event('input'));
  await panel.updateComplete;
  area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
  await panel.updateComplete;
};
afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
  vi.unstubAllGlobals();
});

describe('Grill integrated review', () => {
  it('replaces filters with tabs, preserves unsent input and copies answers with comments', async () => {
    const { host } = await mount();
    const root = host.shadowRoot;
    expect(root?.querySelector('[data-filter]')).toBeNull();
    expect(root?.querySelectorAll('[role="tab"]')).toHaveLength(2);
    expect(root?.querySelectorAll('artifact-comment-panel')).toHaveLength(1);
    root?.querySelector<HTMLButtonElement>('[data-tab="review"]')?.click();
    const panel = await panelOf(host);
    await post(panel, 'General feedback');
    host.artifact.dispatch({
      type: 'ANSWER_QUESTION',
      target: 'question:q',
      payload: { kind: 'option', optionId: 'yes' },
    });
    await host.updateComplete;
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    root?.querySelector<HTMLButtonElement>('.grill-copy')?.click();
    await host.updateComplete;
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('General feedback'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Yes'));
    const area = panel.shadowRoot?.querySelector('textarea');
    if (!area) throw new Error('no textarea');
    area.value = 'Unsent';
    area.dispatchEvent(new Event('input'));
    await panel.updateComplete;
    root?.querySelector<HTMLButtonElement>('[data-tab="questions"]')?.click();
    await host.updateComplete;
    root?.querySelector<HTMLButtonElement>('.grill-toggle')?.click();
    await host.updateComplete;
    host.requestComment('question:q');
    await host.updateComplete;
    expect(root?.querySelector('[data-tab="review"]')?.getAttribute('aria-selected')).toBe('true');
    expect(root?.querySelector('.af-sidebar')?.hasAttribute('hidden')).toBe(false);
    expect((await panelOf(host)).shadowRoot?.querySelector('textarea')?.value).toBe('Unsent');
  });

  it('posts ER comments beside the selected table without opening or shifting the review rail', async () => {
    const { host, diagram } = await mount();
    host.shadowRoot?.querySelector<HTMLButtonElement>('.grill-toggle')?.click();
    await host.updateComplete;
    diagram.select({ kind: 'node', id: 'users' });
    await diagram.updateComplete;
    expect(diagram.shadowRoot?.querySelector('.diagram-details')).toBeNull();
    expect(diagram.shadowRoot?.querySelector('[data-field-comment]')).toBeNull();
    expect(diagram.commentTargets.some((target) => target.value.includes('/field/'))).toBe(false);
    expect(diagram.shadowRoot?.querySelector('.comment-pop')).toBeNull();
    diagram.shadowRoot?.querySelector<HTMLButtonElement>('[data-comment-id="users"]')?.click();
    await diagram.updateComplete;
    expect(diagram.shadowRoot?.querySelector('.comment-pop')).not.toBeNull();
    await post(diagram, 'Table note');
    await host.updateComplete;
    expect(host.artifact.comments[0]?.target).toEqual({ type: 'element', id: 'schema/node/users' });
    expect(diagram.shadowRoot?.querySelector('.comment-pop')).toBeNull();
    expect(host.shadowRoot?.querySelector('.af-sidebar')?.hasAttribute('hidden')).toBe(true);
    expect(host.shadowRoot?.querySelector('[aria-selected="true"]')?.getAttribute('data-tab')).toBe('questions');
    const panel = await panelOf(host);
    expect(panel.shadowRoot?.querySelector('.item-body')?.textContent).toContain('Table note');
    diagram.tagFilter = { match: 'single', active: ['absent'] };
    await diagram.updateComplete;
    await host.updateComplete;
    expect(host.artifact.stale).toEqual([]);
    const actions = host.artifact.actions;
    diagram.remove();
    await Promise.resolve();
    await host.updateComplete;
    expect(host.artifact.stale).toHaveLength(1);
    host.append(diagram);
    await diagram.updateComplete;
    await host.updateComplete;
    expect(host.artifact.comments).toHaveLength(1);
    expect(host.artifact.actions).toEqual(actions);
    expect(host.artifact.exportBrief()).toContain('ERD · schema · users');
    const restored = await mount();
    restored.host.artifact.importDraft(actions);
    expect(restored.host.artifact.comments).toHaveLength(1);
    restored.diagram.data = parseErData({ before: { tables: [] }, after: { tables: [] } });
    await restored.diagram.updateComplete;
    await restored.host.updateComplete;
    expect(restored.host.artifact.stale).toHaveLength(1);
  });

  it('isolates repeated element ids across diagrams and refuses ambiguous diagram ids', async () => {
    const { host, diagram } = await mount();
    const second = document.createElement('artifact-er-diagram');
    if (!(second instanceof ArtifactErDiagram)) throw new Error('not upgraded');
    second.id = 'schema-two';
    second.data = parseErData(er);
    host.append(second);
    await second.updateComplete;
    await host.updateComplete;
    host.artifact.comment('element:schema/node/users', 'first');
    host.artifact.comment('element:schema-two/node/users', 'second');
    expect(host.artifact.comments).toHaveLength(2);
    second.id = diagram.id;
    await second.updateComplete;
    await host.updateComplete;
    expect(host.artifact.stale).toHaveLength(2);
  });

  it('opens questions from badges while folded on Review and supports keyboard tabs', async () => {
    const { host } = await mount();
    const marker = document.createElement('div');
    marker.setAttribute('data-grill-questions', 'Q1');
    host.append(marker);
    await Promise.resolve();
    await host.updateComplete;
    host.requestComment('question:q');
    await host.updateComplete;
    host.shadowRoot?.querySelector<HTMLButtonElement>('.grill-toggle')?.click();
    await host.updateComplete;
    host.shadowRoot?.querySelector<HTMLButtonElement>('.grill-label')?.click();
    await host.updateComplete;
    expect(host.shadowRoot?.querySelector('.af-sidebar')?.hasAttribute('hidden')).toBe(false);
    const questions = host.shadowRoot?.querySelector<HTMLButtonElement>('[data-tab="questions"]');
    expect(questions?.getAttribute('aria-selected')).toBe('true');
    questions?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await host.updateComplete;
    const review = host.shadowRoot?.querySelector('[data-tab="review"]');
    expect(review?.getAttribute('aria-selected')).toBe('true');
    expect(host.shadowRoot?.activeElement).toBe(review);
    expect(host.artifact.actions).toEqual([]);
  });
});
