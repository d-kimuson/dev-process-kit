import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  constrainView,
  createViewport,
  expandedBounds,
  MAX_SCALE,
  MIN_SCALE,
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
    for (const sample of centred) expect(sample.begin).toBeCloseTo(sample.centred, 6);
    for (const sample of overflowing) {
      expect(sample.begin).toBeLessThanOrEqual(1e-6);
      expect(sample.end).toBeGreaterThanOrEqual(sample.viewport - 1e-6);
    }
    const empty: ViewportBounds = expandedBounds([]);
    expect(constrainView({ x: 1e6, y: -1e6, scale: 1 }, empty, 500, 350)).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('pins content that fits to the top-left corner when aligned to the start', () => {
    const area = expandedBounds([{ x: 0, y: 0, width: 300, height: 200 }]);
    expect(constrainView({ x: 1e6, y: -1e6, scale: 1 }, area, 500, 350, 'start')).toEqual({ x: 16, y: 16, scale: 1 });
    expect(constrainView({ x: 0, y: 0, scale: 0.5 }, area, 500, 350, 'start')).toEqual({ x: 16, y: 16, scale: 0.5 });
    // An overflowing axis pans exactly as it does when centred.
    const wide = expandedBounds([{ x: 0, y: 0, width: 900, height: 200 }]);
    const view = { x: -100, y: 0, scale: 1 };
    expect(constrainView(view, wide, 500, 350, 'start').x).toBe(constrainView(view, wide, 500, 350).x);
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
