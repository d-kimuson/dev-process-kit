import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  constrainView,
  createViewport,
  expandedBounds,
  MAX_SCALE,
  MIN_SCALE,
  openingCorner,
  PAN_SLACK_FRACTION,
  pinchZoomFactor,
  wheelPan,
  type ViewportBounds,
} from './viewport';

describe('viewport geometry', () => {
  it('grows the content box by 10% per side', () => {
    expect(expandedBounds([{ x: 100, y: 200, width: 1000, height: 500 }])).toEqual({
      x: 0,
      y: 150,
      width: 1200,
      height: 600,
    });
    expect(expandedBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('keeps the content reachable at every zoom level', () => {
    const area = expandedBounds([{ x: 0, y: 0, width: 800, height: 400 }]);
    const axes = ['x', 'y'] as const;
    const samples = [MIN_SCALE, 0.5, 1, MAX_SCALE].flatMap((scale) =>
      [-1e6, 1e6].flatMap((offset) => {
        const view = constrainView({ x: offset, y: offset, scale }, area, 500, 350);
        return axes.map((axis) => {
          const start = view[axis] + area[axis] * scale;
          const viewport = axis === 'x' ? 500 : 350;
          return {
            axis,
            scale,
            offset,
            begin: start,
            end: start + area[axis === 'x' ? 'width' : 'height'] * scale,
            centred: (viewport - area[axis === 'x' ? 'width' : 'height'] * scale) / 2,
            viewport,
            fits: area[axis === 'x' ? 'width' : 'height'] * scale <= viewport,
          };
        });
      }),
    );
    const centred = samples.filter((sample) => sample.fits);
    const overflowing = samples.filter((sample) => !sample.fits);
    // Both branches have to be exercised, or this test would pass vacuously.
    expect(centred.length).toBeGreaterThan(0);
    expect(overflowing.length).toBeGreaterThan(0);
    for (const sample of centred) {
      // A fitting axis also has `PAN_SLACK_FRACTION * viewport` of room to
      // move away from its centred rest position (see the dedicated slack
      // test below) — dragged this far (±1e6), it sits exactly at that edge
      // of the slack, not pinned to `centred` regardless of how far it was
      // dragged.
      const slack = sample.viewport * PAN_SLACK_FRACTION;
      const edge = sample.centred + Math.sign(sample.offset) * slack;
      expect(sample.begin).toBeCloseTo(edge, 6);
    }
    for (const sample of overflowing) {
      // An overflowing axis may be dragged `PAN_SLACK_FRACTION * viewport` past
      // either edge (see the dedicated slack test below) — it is no longer
      // flush against 0/viewport the instant it overflows.
      const slack = sample.viewport * PAN_SLACK_FRACTION;
      expect(sample.begin).toBeLessThanOrEqual(slack + 1e-6);
      expect(sample.end).toBeGreaterThanOrEqual(sample.viewport - slack - 1e-6);
    }
    const empty: ViewportBounds = expandedBounds([]);
    expect(constrainView({ x: 1e6, y: -1e6, scale: 1 }, empty, 500, 350)).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('allows a symmetric, zoom-independent pan slack around overflowing content (#156)', () => {
    // A wide, short board: the content margin `expandedBounds` grows (10% of
    // the content's own size) is far smaller vertically than horizontally —
    // exactly the asymmetry reported in #156 ("especially upward"). The pan
    // slack below must not depend on it: it is a fraction of the *viewport*,
    // identical on every side and at every zoom level. Both dimensions are
    // large enough that the content still overflows the viewport even at
    // MIN_SCALE, so every sampled scale exercises the overflow branch.
    const content = { x: 0, y: 0, width: 20_000, height: 6000 };
    const area = expandedBounds([content]);
    const width = 800;
    const height = 500;
    for (const scale of [MIN_SCALE, 0.5, 1, MAX_SCALE]) {
      const past = { x: 1e7, y: 1e7, scale };
      const before = { x: -1e7, y: -1e7, scale };
      const top = constrainView(past, area, width, height);
      const bottom = constrainView(before, area, width, height);
      const left = constrainView(past, area, width, height);
      const right = constrainView(before, area, width, height);

      const slackX = width * PAN_SLACK_FRACTION;
      const slackY = height * PAN_SLACK_FRACTION;
      // Panned as far as possible in one direction, the content's leading edge
      // sits exactly `slack` past the canvas edge — not flush against it — and
      // that distance is the same whether it is the top or the left edge.
      expect(top.y + area.y * scale).toBeCloseTo(slackY, 6);
      expect(left.x + area.x * scale).toBeCloseTo(slackX, 6);
      // Panned the other way, the trailing edge sits `slack` short of the far
      // canvas edge — symmetric with the leading-edge case above.
      expect(bottom.y + (area.y + area.height) * scale).toBeCloseTo(height - slackY, 6);
      expect(right.x + (area.x + area.width) * scale).toBeCloseTo(width - slackX, 6);
      // The slack itself never depends on `scale`: only the viewport size.
      expect(slackX).toBe(width * PAN_SLACK_FRACTION);
      expect(slackY).toBe(height * PAN_SLACK_FRACTION);
    }
  });

  it('rests content that fits at the top-left corner when aligned to the start, with the same slack as centred content', () => {
    const area = expandedBounds([{ x: 0, y: 0, width: 300, height: 200 }]);
    // Dragged as far as possible, the view clamps to `rest ± slack` around the
    // start-aligned rest position (16, 16) — not around the centred one, and
    // not pinned to it outright regardless of how far it was dragged.
    expect(constrainView({ x: 1e6, y: -1e6, scale: 1 }, area, 500, 350, 'start')).toEqual({
      x: 16 + 500 * PAN_SLACK_FRACTION,
      y: 16 - 350 * PAN_SLACK_FRACTION,
      scale: 1,
    });
    // A nudge well inside the slack passes through rather than snapping back
    // to rest — the start corner is a resting position with room to move,
    // not a rigid pin.
    expect(constrainView({ x: 20, y: 10, scale: 0.5 }, area, 500, 350, 'start')).toEqual({
      x: 20,
      y: 10,
      scale: 0.5,
    });
    // An overflowing axis pans exactly as it does when centred.
    const wide = expandedBounds([{ x: 0, y: 0, width: 900, height: 200 }]);
    const view = { x: -100, y: 0, scale: 1 };
    expect(constrainView(view, wide, 500, 350, 'start').x).toBe(constrainView(view, wide, 500, 350).x);
  });

  it('allows a symmetric, zoom-independent pan slack around content that fits the canvas (#156)', () => {
    // #156: an ER diagram wide enough to overflow horizontally but short
    // enough to fit vertically. Before this, the vertical axis — the one
    // "fitting" — was pinned outright: a drag or an arrow key could not move
    // it at all, which is the "hits the upper limit immediately" report. The
    // slack here must be symmetric and the same at every zoom level, exactly
    // like the overflow case.
    const content = { x: 0, y: 0, width: 3000, height: 100 };
    const area = expandedBounds([content]);
    const width = 800;
    const height = 500;
    for (const scale of [MIN_SCALE, 0.1, 0.2]) {
      // Vertical still fits the canvas at every one of these scales
      // (area.height * scale <= height); horizontal overflows.
      expect(area.height * scale).toBeLessThanOrEqual(height);
      const rest = (height - area.height * scale) / 2 - area.y * scale;
      const slack = height * PAN_SLACK_FRACTION;
      const past = constrainView({ x: 0, y: 1e7, scale }, area, width, height);
      const before = constrainView({ x: 0, y: -1e7, scale }, area, width, height);
      expect(past.y).toBeCloseTo(rest + slack, 6);
      expect(before.y).toBeCloseTo(rest - slack, 6);
      // The slack is a fraction of the viewport alone, not of `scale` or of
      // the content's own (tiny, vertically) size.
      expect(slack).toBe(height * PAN_SLACK_FRACTION);
    }
  });
});

describe('openingCorner', () => {
  const box = (x: number, y: number) => ({ x, y, width: 200, height: 100 });

  it('is the top-left of the content when something stands there', () => {
    expect(openingCorner([box(0, 0), box(300, 200)], 500)).toEqual({ x: 0, y: 0 });
  });

  it('skips an outlier further down the left than the first screenful reaches', () => {
    // Everything starts at y 0 from x 400, but one box sits far down at x 0.
    expect(openingCorner([box(400, 0), box(800, 0), box(0, 800)], 500)).toEqual({ x: 400, y: 0 });
  });

  it('keeps a box on the left that the first screenful does reach', () => {
    expect(openingCorner([box(400, 0), box(0, 300)], 500)).toEqual({ x: 0, y: 0 });
  });

  it('has nothing to open on without content', () => {
    expect(openingCorner([], 500)).toBeNull();
  });
});

describe('wheel pan', () => {
  // 800×500 content in a 500×350 viewport: overflowing on both axes.
  const area = expandedBounds([{ x: 0, y: 0, width: 800, height: 500 }]);
  const top = constrainView({ x: 0, y: 1e6, scale: 1 }, area, 500, 350);
  const bottom = constrainView({ x: 0, y: -1e6, scale: 1 }, area, 500, 350);

  it('pans the diagram while it can still move along the scrolled axis', () => {
    expect(wheelPan(top, area, 500, 350, 0, 40)).toEqual({ ...top, y: top.y - 40 });
    expect(wheelPan(bottom, area, 500, 350, 0, -40)).toEqual({ ...bottom, y: bottom.y + 40 });
  });

  it('hands a vertical scroll to the page once the diagram is at that edge', () => {
    expect(wheelPan(bottom, area, 500, 350, 0, 40)).toBeNull();
    expect(wheelPan(top, area, 500, 350, 0, -40)).toBeNull();
    // Trackpad jitter on the other axis does not keep the page from scrolling.
    expect(wheelPan(bottom, area, 500, 350, 3, 40)).toBeNull();
  });

  it('hands every vertical scroll to the page when the content fits vertically', () => {
    const short = expandedBounds([{ x: 0, y: 0, width: 800, height: 100 }]);
    const view = constrainView({ x: 0, y: 0, scale: 1 }, short, 500, 350);
    expect(wheelPan(view, short, 500, 350, 0, 40)).toBeNull();
  });

  it('keeps a horizontal scroll inside the diagram even at its edge', () => {
    const right = constrainView({ x: -1e6, y: 0, scale: 1 }, area, 500, 350);
    expect(wheelPan(right, area, 500, 350, 40, 0)).toEqual(right);
  });
});

describe('pinch zoom factor', () => {
  it('matches the whiteboard and event-storming canvases, exp(-deltaY * 0.01)', () => {
    expect(pinchZoomFactor(-10)).toBeCloseTo(Math.exp(0.1), 10);
    expect(pinchZoomFactor(10)).toBeCloseTo(Math.exp(-0.1), 10);
    expect(pinchZoomFactor(0)).toBe(1);
  });

  it('compounds a pinch-like sequence (10 events of deltaY -10) to a clear zoom-in, not an imperceptible one', () => {
    // Before the fix this used a 0.0012 coefficient instead of 0.01: the same
    // sequence only reached exp(0.12) ≈ 1.127, which read as "almost nothing"
    // on a pinch gesture that strong.
    const factor = Array.from({ length: 10 }, () => pinchZoomFactor(-10)).reduce((acc, f) => acc * f, 1);
    expect(factor).toBeCloseTo(Math.exp(1), 10);
    expect(factor).toBeGreaterThan(2.5);
  });
});

describe('viewport controller', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  const mount = (onClearSelection = () => undefined, align?: 'center' | 'start') => {
    const canvas = document.createElement('div');
    const world = document.createElement('div');
    canvas.append(world);
    document.body.append(canvas);
    return {
      canvas,
      world,
      viewport: createViewport({ canvas, world, onClearSelection, ...(align === undefined ? {} : { align }) }),
    };
  };

  it('does not clear selection on the click synthesized after a completed drag', () => {
    const clear = vi.fn();
    const { canvas, viewport } = mount(clear);
    canvas.setPointerCapture = vi.fn();
    try {
      canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }));
      canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 120, clientY: 100 }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 120, clientY: 100 }));
      canvas.dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 }));
      canvas.click();
      expect(clear).not.toHaveBeenCalled();
      canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2 }));
      canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2 }));
      canvas.click();
      expect(clear).toHaveBeenCalledOnce();
    } finally {
      viewport.destroy();
    }
  });

  it('starts a mouse pan without starting a text selection, and still focuses the canvas', () => {
    const { canvas, world, viewport } = mount();
    canvas.tabIndex = 0;
    canvas.setPointerCapture = vi.fn();
    const card = document.createElement('div');
    card.textContent = 'customer_id';
    const button = document.createElement('button');
    world.append(card, button);
    const press = (target: Element, pointerType: string, pointerId: number): boolean => {
      const allowed = target.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId, pointerType, bubbles: true, cancelable: true }),
      );
      canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId, bubbles: true }));
      return allowed;
    };
    try {
      // A cancelled pointerdown suppresses the mousedown whose default action selects text.
      expect(press(card, 'mouse', 1)).toBe(false);
      expect(document.activeElement).toBe(canvas);
      expect(press(canvas, 'pen', 2)).toBe(false);
      // Controls keep their own press behavior, and touch never selects on a pan.
      expect(press(button, 'mouse', 3)).toBe(true);
      expect(press(card, 'touch', 4)).toBe(true);
    } finally {
      viewport.destroy();
    }
  });

  it('opens at 100% and returns to it after zooming or fitting', () => {
    const { canvas, world, viewport } = mount();
    try {
      viewport.setContent({ x: 0, y: 0, width: 900, height: 600 });
      viewport.reset();
      expect(viewport.view().scale).toBe(1);
      expect(world.style.transform).toContain('scale(1)');

      viewport.zoom(1 / 1.1);
      expect(viewport.view().scale).toBeLessThan(1);
      viewport.reset();
      expect(viewport.view().scale).toBe(1);

      viewport.fit();
      expect(viewport.view().scale).toBeLessThanOrEqual(1);
      expect(viewport.view().scale).toBeGreaterThanOrEqual(MIN_SCALE);
      viewport.fitWidth();
      expect(canvas.style.transform).toBe('');
    } finally {
      viewport.destroy();
    }
  });

  it('opens on a given corner of the content instead of the content box’s own', () => {
    const { viewport } = mount();
    try {
      viewport.setContent({ x: 0, y: 0, width: 1200, height: 900 });
      viewport.reset({ x: 200, y: 0 });
      expect(viewport.view()).toEqual({ x: 16 - 200, y: 16, scale: 1 });
    } finally {
      viewport.destroy();
    }
  });

  it('opens with the content itself, not its pan margin, at the top-left corner', () => {
    // happy-dom lays nothing out: the canvas falls back to 1000×560.
    const { viewport } = mount();
    try {
      viewport.setContent({ x: 0, y: 0, width: 1200, height: 900 });
      viewport.reset();
      expect(viewport.view()).toEqual({ x: 16, y: 16, scale: 1 });
    } finally {
      viewport.destroy();
    }
  });

  it('keeps content that fits at the top-left corner when aligned to the start', () => {
    const { viewport } = mount(undefined, 'start');
    try {
      viewport.setContent({ x: 0, y: 0, width: 400, height: 300 });
      viewport.reset();
      expect(viewport.view()).toEqual({ x: 16, y: 16, scale: 1 });
      viewport.fit();
      expect(viewport.view()).toMatchObject({ x: 16, y: 16 });
    } finally {
      viewport.destroy();
    }
  });

  it('moves a fitting axis with the keyboard, within the new pan slack, and fit/reset recentre through it (#156)', () => {
    // A wide, short board: horizontal overflows, vertical fits — exactly the
    // #156 report ("hits the upper limit immediately, especially upward").
    // happy-dom lays nothing out, so the canvas falls back to 1000×560; this
    // content is short enough (100px tall) to fit that fallback height.
    const { canvas, viewport } = mount();
    canvas.tabIndex = 0;
    const arrow = (key: string): boolean =>
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    try {
      viewport.setContent({ x: 0, y: 0, width: 5000, height: 100 });
      viewport.reset();
      const resting = viewport.view().y;
      // Before this fix, a fitting axis was pinned to `resting` outright: the
      // very first ArrowUp/ArrowDown would have had no effect at all.
      arrow('ArrowDown');
      expect(viewport.view().y).toBeLessThan(resting);
      // Keep going well past the slack: it must clamp, not pan forever.
      for (let index = 0; index < 50; index++) arrow('ArrowDown');
      const clamped = viewport.view().y;
      expect(clamped).toBeGreaterThan(resting - 560 * PAN_SLACK_FRACTION - 1);
      expect(clamped).toBeLessThan(resting);
      arrow('ArrowDown');
      expect(viewport.view().y).toBe(clamped);
      // `reset` lands exactly back on rest, not wherever the slack-aware drag
      // left the view — the slack is room to move away from rest, not a new
      // place for the default view to open on.
      viewport.reset();
      expect(viewport.view().y).toBe(resting);
      // Same guarantee for `fit`, at whatever scale it settles on: record its
      // own rest, drag away within the slack, and confirm it lands back on
      // that exact rest rather than passing the dragged offset through.
      viewport.fit();
      const fitRest = viewport.view().y;
      arrow('ArrowDown');
      expect(viewport.view().y).toBeLessThan(fitRest);
      viewport.fit();
      expect(viewport.view().y).toBe(fitRest);
    } finally {
      viewport.destroy();
    }
  });

  it('lets the page scroll once a wheel reaches the bottom of the diagram', () => {
    const { canvas, viewport } = mount();
    const wheel = (deltaY: number): boolean =>
      canvas.dispatchEvent(new WheelEvent('wheel', { deltaY, cancelable: true, bubbles: true }));
    try {
      viewport.setContent({ x: 0, y: 0, width: 900, height: 1200 });
      viewport.reset();
      // `dispatchEvent` is false when the diagram consumed (cancelled) the wheel.
      expect(wheel(200)).toBe(false);
      const panned = viewport.view().y;
      for (let index = 0; index < 20; index++) wheel(200);
      expect(wheel(200)).toBe(true);
      expect(viewport.view().y).toBeLessThan(panned);
      expect(wheel(-200)).toBe(false);
    } finally {
      viewport.destroy();
    }
  });

  it('zooms a trackpad pinch (ctrl-wheel) at the same sensitivity as the whiteboard and event-storming canvases', () => {
    const { canvas, viewport } = mount();
    const pinch = (deltaY: number): void => {
      const event = new WheelEvent('wheel', { deltaY, cancelable: true, bubbles: true });
      // happy-dom's WheelEvent extends UIEvent, not MouseEvent, so `ctrlKey`
      // is not settable through the constructor's init dict as it is in a
      // real browser; set it directly to simulate a trackpad pinch.
      Object.defineProperty(event, 'ctrlKey', { value: true });
      canvas.dispatchEvent(event);
    };
    try {
      viewport.setContent({ x: 0, y: 0, width: 2000, height: 2000 });
      viewport.reset();
      expect(viewport.view().scale).toBe(1);
      // Three events of deltaY -10, as a slow pinch sends: factor exp(-deltaY * 0.01) per event.
      for (let index = 0; index < 3; index++) pinch(-10);
      expect(viewport.view().scale).toBeCloseTo(Math.exp(0.3), 5);
    } finally {
      viewport.destroy();
    }
  });

  it('clamps zoom to the supported range', () => {
    const { viewport } = mount();
    try {
      viewport.setContent({ x: 0, y: 0, width: 200, height: 200 });
      viewport.zoom(100);
      expect(viewport.view().scale).toBe(MAX_SCALE);
      viewport.zoom(0.0001);
      expect(viewport.view().scale).toBe(MIN_SCALE);
    } finally {
      viewport.destroy();
    }
  });
});
