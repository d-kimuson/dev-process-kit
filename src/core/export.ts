import type { TemplateSnapshot } from './shell/contracts';
import type { DraftAction, TemplateDefinition } from './types';

import { COMMENT_ACTION, serializeDraft } from './action';
import { commentBody } from './comment';
import { isElementAction } from './element-actions';
import { formatHash } from './navigation';
import { targetRef } from './target';

const fenced = (code: string, language = 'json'): string => {
  return `\`\`\`${language}\n${code}\n\`\`\``;
};

const actionBlock = (action: DraftAction): string => {
  return JSON.stringify(
    {
      type: action.type,
      target: action.target,
      payload: action.payload,
      ...(action.note === undefined ? {} : { note: action.note }),
    },
    null,
    2,
  );
};

/**
 * The hand-off document an agent reads after a review round. Comments and
 * structural changes share one channel on purpose, so they are
 * presented as one ordered change request.
 */
export const buildAgentBrief = <S>(
  snapshot: TemplateSnapshot<S>,
  definition: TemplateDefinition<S>,
  frameworkVersion: string,
): string => {
  const { actions, state } = snapshot;
  // Stale actions stay in the reader's draft (interpretive drafts) but no longer
  // fit the base, so they are reported apart instead of as pending work.
  const staleIds = new Set(snapshot.stale.map((entry) => entry.action.id));
  const pending = actions.filter((action) => !staleIds.has(action.id));
  const comments = pending.filter((action) => action.type === COMMENT_ACTION);
  const changes = pending.filter((action) => action.type !== COMMENT_ACTION);
  const lines: string[] = [];

  lines.push(`# Review draft — ${definition.label}`);
  lines.push('');
  lines.push(`- template: \`${definition.name}\``);
  lines.push(`- framework: \`dev-process-kit@${frameworkVersion}\``);
  lines.push(`- navigation: \`${formatHash(snapshot.navigation) || '(none)'}\``);
  lines.push(`- pending: ${changes.length} change(s), ${comments.length} comment(s)`);
  if (snapshot.stale.length > 0) {
    lines.push(`- stale (not applicable to the current base): ${snapshot.stale.length}`);
  }
  lines.push('');
  lines.push('## How to apply');
  lines.push('');
  lines.push(
    'These are patches against the base HTML, not a command log. Apply the requested end state to the meaning model, ' +
      'keep the stable ids of surviving concepts, and keep the base JSON free of any draft envelope.',
  );
  if (changes.some(isElementAction)) {
    lines.push('');
    lines.push(
      'Changes targeting `element:<id>/…` belong to the component with that `id` (for example a diagram): ' +
        "apply them to that component's own JSON, following its documented action vocabulary.",
    );
  }
  lines.push('');

  if (comments.length > 0) {
    lines.push(`## Comments (${comments.length})`);
    lines.push('');
    for (const [index, action] of comments.entries()) {
      const description = definition.describe(action, state, snapshot.base);
      lines.push(`${index + 1}. **${description.targetLabel}** — \`${targetRef(action.target)}\``);
      lines.push(`   > ${commentBody(action).replace(/\n/g, '\n   > ')}`);
    }
    lines.push('');
  }

  if (changes.length > 0) {
    lines.push(`## Requested changes (${changes.length})`);
    lines.push('');
    for (const [index, action] of changes.entries()) {
      const description = definition.describe(action, state, snapshot.base);
      const summary = description.summary ? ` — ${description.summary}` : '';
      lines.push(`${index + 1}. **${description.title}**${summary}`);
      lines.push(`   target: \`${targetRef(action.target)}\` (${action.target.type})`);
      lines.push(`   \`\`\`json\n   ${actionBlock(action).replace(/\n/g, '\n   ')}\n   \`\`\``);
    }
    lines.push('');
  }

  if (changes.length === 0 && comments.length === 0) {
    lines.push('_No pending draft actions._');
    lines.push('');
  }

  if (snapshot.stale.length > 0) {
    lines.push(`## Not applicable to the current base (${snapshot.stale.length})`);
    lines.push('');
    lines.push(
      'These actions were made against an earlier base and no longer fit it. Do not apply them; ' +
        'mention them if they still matter. The reader can remove them from the review rail.',
    );
    lines.push('');
    for (const [index, { action, reason }] of snapshot.stale.entries()) {
      const description = definition.describe(action, state, snapshot.base);
      const detail = action.type === COMMENT_ACTION ? commentBody(action) : description.title;
      lines.push(`${index + 1}. \`${action.type}\` on \`${targetRef(action.target)}\` (${reason}) — ${detail}`);
    }
    lines.push('');
  }

  lines.push('## Canonical draft (JSON)');
  lines.push('');
  lines.push(fenced(serializeDraft(actions)));
  lines.push('');

  return lines.join('\n');
};
