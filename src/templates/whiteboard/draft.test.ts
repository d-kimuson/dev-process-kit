import { describe, expect, it } from 'vitest';

import { DraftController } from '../../core/controller';
import { whiteboardAction } from './actions';
import { whiteboardDefinitionFor } from './definition';
import { parseWhiteboardBase } from './model';

const base = parseWhiteboardBase({
  items: [
    { id: 'frame', kind: 'frame', x: 0, y: 0, w: 400, h: 300, title: 'Ideas' },
    { id: 'a', kind: 'sticky', x: 20, y: 20, text: 'A' },
    { id: 'b', kind: 'sticky', x: 600, y: 20, text: 'B' },
  ],
});

const controller = () => new DraftController({ definition: whiteboardDefinitionFor('en'), base, storage: null });

describe('whiteboard draft', () => {
  it('keeps only the last position of an item dragged twice in a row', () => {
    const c = controller();
    c.dispatch(whiteboardAction.move('a', 40, 40));
    c.dispatch(whiteboardAction.move('a', 80, 90));
    expect(c.actions.map((action) => action.payload)).toEqual([{ x: 80, y: 90 }]);
  });

  it('cancels an item dragged away and back to where it was', () => {
    const c = controller();
    c.dispatch(whiteboardAction.move('a', 500, 40));
    c.dispatch(whiteboardAction.setColor('b', 'pink'));
    c.dispatch(whiteboardAction.move('a', 20, 20));
    expect(c.actions.map((action) => action.type)).toEqual(['SET_ITEM_COLOR']);
  });

  it('cancels a sticky added, edited, connected and deleted again', () => {
    const c = controller();
    c.dispatch(whiteboardAction.addItem({ id: 'n', kind: 'sticky', x: 100, y: 100 }));
    c.dispatch(whiteboardAction.setText('n', 'New idea'));
    c.dispatch(whiteboardAction.connect('n-b', 'n', 'b'));
    c.dispatch(whiteboardAction.deleteItem('n'));
    expect(c.actions).toEqual([]);
  });

  it('keeps a frame move and the moves of what it carried as one change', () => {
    const c = controller();
    expect(c.dispatchBatch([whiteboardAction.move('frame', 100, 0), whiteboardAction.move('a', 120, 20)]).ok).toBe(
      true,
    );
    expect(c.actions).toHaveLength(2);
    c.dispatchBatch([whiteboardAction.move('frame', 0, 0), whiteboardAction.move('a', 20, 20)]);
    expect(c.actions).toEqual([]);
  });
});
