import { describe, expect, it } from 'vitest';

import { PIN_H, stackPins } from './pin-stack';

describe('stackPins', () => {
  it('reaches nowhere when a note carries no pin', () => {
    expect(stackPins([])).toEqual({ lifts: [], extent: 0 });
  });

  it('hangs a single pin clear of the note it names', () => {
    expect(stackPins([PIN_H])).toEqual({ lifts: [18], extent: 18 + PIN_H });
  });

  it('lets a pin with a long name grow upward, away from its note', () => {
    expect(stackPins([120])).toEqual({ lifts: [18], extent: 138 });
  });

  it('stacks each pin above the full height of the ones below it', () => {
    expect(stackPins([PIN_H, 80, 60])).toEqual({ lifts: [18, 76, 160], extent: 220 });
  });
});
