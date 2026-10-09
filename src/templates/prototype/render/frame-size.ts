import type { PreviewKind, PreviewViewport } from '../model';

export const VIEWPORT_WIDTH: Record<PreviewViewport, string> = {
  mobile: '390px',
  tablet: '834px',
  desktop: '1180px',
  fluid: '100%',
};

/**
 * In the scenario view preview frames are content sized: a mock that is taller
 * than this simply makes the frame taller and the page scrolls as a whole. The
 * minimum only keeps a short mock looking like a device screen. The app view
 * runs a screen in a window of a fixed size instead (`FrameWindow`).
 */
export const VIEWPORT_MIN_HEIGHT: Record<PreviewViewport, string> = {
  mobile: '620px',
  tablet: '640px',
  desktop: '520px',
  fluid: '420px',
};

/**
 * The window a frame of the app view runs in: a fixed size (a device's screen,
 * drawn `zoom` times smaller to fit), or the whole space it is given (a demo's
 * desktop browser). Either way the mock scrolls inside it.
 */
export type FrameWindow =
  | { readonly kind: 'device'; readonly width: number; readonly height: number; readonly zoom: number }
  | { readonly kind: 'fill' };

/** What a frame draws around a device's screen, both sides together: a phone app's bezel. */
export const DEVICE_BEZEL: Record<PreviewKind, number> = { browser: 0, native: 22, mail: 0, plain: 0 };

/** The inline style of a frame: its scenario size, and its window in the app view. */
export const frameStyle = (kind: PreviewKind, viewport: PreviewViewport, frame: FrameWindow | null): string => {
  const base = `--frame-width:${VIEWPORT_WIDTH[viewport]};--frame-min-height:${VIEWPORT_MIN_HEIGHT[viewport]}`;
  if (frame?.kind !== 'device') return base;
  const bezel = DEVICE_BEZEL[kind];
  return `${base};--device-width:${frame.width + bezel}px;--device-height:${frame.height + bezel}px;zoom:${frame.zoom}`;
};
