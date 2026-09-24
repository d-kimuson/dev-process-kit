import { describe, expect, it } from 'vitest';

import { DraftController } from '../../core/controller';
import { eventStormingAction } from './actions';
import { eventStormingDefinitionFor } from './definition';
import { sliceMovePlan } from './interactions';
import { buildSlices } from './layout';
import { parseEventStormingBase, type EventStormingState } from './model';

// `c1 -> e1` folds into one slice, so the base interleaves the slices.
const base = parseEventStormingBase({
  title: 'Draft',
  contexts: [],
  elements: [
    { id: 'c1', type: 'command', name: 'Place order' },
    { id: 'e2', type: 'event', name: 'Order shipped' },
    { id: 'e1', type: 'event', name: 'Order placed' },
  ],
  links: [{ id: 'l1', from: 'c1', to: 'e1' }],
});

const controller = () => new DraftController({ definition: eventStormingDefinitionFor('en'), base, storage: null });

const moveSlice = (
  c: DraftController<EventStormingState>,
  moving: string,
  target: string,
  side: 'before' | 'after',
) => {
  const slices = buildSlices(c.derivation.state);
  const members = (id: string) =>
    slices.find((slice) => slice.notes.some((note) => note.id === id))?.notes.map((note) => note.id) ?? [];
  const steps = sliceMovePlan(
    c.derivation.state.elements.map((note) => note.id),
    members(moving),
    members(target),
    side,
  );
  return c.dispatchBatch(steps.map((step) => eventStormingAction.moveElement(step.id, step.after)));
};

describe('event storming draft', () => {
  it('cancels a note that is deleted again, with its link and edits', () => {
    const c = controller();
    c.dispatch(eventStormingAction.addElement('x', 'policy', 'New policy'));
    c.dispatch(eventStormingAction.setElementName('x', 'Renamed'));
    c.dispatch({
      type: 'LINK_ELEMENTS',
      target: { type: 'page', id: 'event-storming' },
      payload: { id: 'lx', from: 'x', to: 'c1' },
    });
    c.dispatch(eventStormingAction.deleteElement('x'));
    expect(c.actions).toEqual([]);
    expect(c.derivation.state).toEqual(base);
  });

  it('cancels a link that is unlinked again', () => {
    const c = controller();
    c.dispatch({
      type: 'LINK_ELEMENTS',
      target: { type: 'page', id: 'event-storming' },
      payload: { id: 'l2', from: 'e1', to: 'e2' },
    });
    c.dispatch({
      type: 'UNLINK_ELEMENTS',
      target: { type: 'page', id: 'event-storming' },
      payload: { from: 'e1', to: 'e2' },
    });
    expect(c.actions).toEqual([]);
  });

  it('cancels a slice moved away and back, although the notes are regrouped', () => {
    const c = controller();
    expect(moveSlice(c, 'c1', 'e2', 'after').ok).toBe(true);
    expect(buildSlices(c.derivation.state).map((slice) => slice.id)).toEqual(['e2', 'c1']);
    expect(c.actions.length).toBeGreaterThan(0);
    expect(moveSlice(c, 'c1', 'e2', 'before').ok).toBe(true);
    expect(c.actions).toEqual([]);
    expect(c.derivation.state).toEqual(base);
  });
});
