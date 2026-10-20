import { describe, expect, it } from 'vitest';

import type { DraftAction, TemplateDefinition } from '../types';
import type { BoardSpec } from './definition';

import { boardsSection, withBoards } from './brief';

const spec = (id: string, label: string, name: string): BoardSpec => ({
  id,
  label,
  definition: { name } as TemplateDefinition<unknown>,
});

const action = (type: string, targetType: string, id: string): DraftAction => ({
  id: `${type}-${id}`,
  type,
  target: { type: targetType, id },
  payload: {},
  createdAt: '2026-10-20T00:00:00.000Z',
});

describe('page brief', () => {
  it('names every board with what the draft asks of it', () => {
    const section = boardsSection(
      [spec('scope', 'Scope', 'usm'), spec('domain', 'Domain', 'event-storming')],
      [
        action('rename-story', 'story', 'pay@scope'),
        action('comment', 'story', 'pay@scope'),
        action('comment', 'page', 'page'),
      ],
    );
    expect(section).toContain('- `scope` — Scope (`usm`): 1 change(s), 1 comment(s)');
    expect(section).toContain('- `domain` — Domain (`event-storming`): 0 change(s), 0 comment(s)');
  });

  it('goes right before the instructions on how to apply the draft', () => {
    expect(withBoards('# Brief\n\n## How to apply\n\nx', ['## Boards (0)', ''])).toBe(
      '# Brief\n\n## Boards (0)\n\n## How to apply\n\nx',
    );
  });
});
