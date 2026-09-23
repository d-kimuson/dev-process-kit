import { describe, expect, it } from 'vitest';

import { ArtifactController } from '../../core/controller';
import { answerQuestion } from './actions';
import { grillDefinition } from './definition';
import { parseGrillBase } from './model';

const base = parseGrillBase({
  title: 'Review',
  questions: [
    { id: 'q1', title: 'Retry?', options: [{ id: 'yes', label: 'Yes' }] },
    { id: 'q2', title: 'Cancel?', options: [{ id: 'yes', label: 'Yes' }] },
  ],
});

const controller = () => new ArtifactController({ definition: grillDefinition, base, storage: null });

describe('grill draft', () => {
  it('keeps only the answers that still stand', () => {
    const c = controller();
    c.dispatch(answerQuestion('q1', { kind: 'option', optionId: 'yes' }));
    c.dispatch(answerQuestion('q2', { kind: 'option', optionId: 'yes' }));
    c.dispatch(answerQuestion('q1', { kind: 'clear' }));
    expect(c.actions.map((action) => action.target.id)).toEqual(['q2']);
  });
});
