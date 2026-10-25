import { describe, expect, it } from 'vitest';

import type { DraftAction, ViewDefinition } from '../types';
import type { PageSpec } from './definition';

import { pagesSection, withPages } from './brief';

const spec = (id: string, label: string, name: string): PageSpec => ({
  id,
  label,
  definition: { kind: 'view', name } as ViewDefinition<unknown>,
});

const action = (type: string, targetType: string, id: string): DraftAction => ({
  id: `${type}-${id}`,
  type,
  target: { type: targetType, id },
  payload: {},
  createdAt: '2026-10-20T00:00:00.000Z',
});

describe('app brief', () => {
  it('names every page with what the draft asks of it', () => {
    const section = pagesSection(
      [spec('scope', 'Scope', 'usm'), spec('domain', 'Domain', 'event-storming')],
      [
        action('rename-story', 'story', 'pay@scope'),
        action('comment', 'story', 'pay@scope'),
        action('comment', 'app', 'app'),
      ],
    );
    expect(section).toContain('- `scope` — Scope (`view:usm`): 1 change(s), 1 comment(s)');
    expect(section).toContain('- `domain` — Domain (`view:event-storming`): 0 change(s), 0 comment(s)');
  });

  it('goes right before the instructions on how to apply the draft', () => {
    expect(withPages('# Brief\n\n## How to apply\n\nx', ['## Pages (0)', ''])).toBe(
      '# Brief\n\n## Pages (0)\n\n## How to apply\n\nx',
    );
  });
});
