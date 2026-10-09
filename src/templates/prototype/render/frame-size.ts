import type { PreviewViewport } from '../model';

export const VIEWPORT_WIDTH: Record<PreviewViewport, string> = {
  mobile: '390px',
  tablet: '834px',
  desktop: '1180px',
  fluid: '100%',
};

/**
 * Preview frames are content sized: a mock that is taller than this simply makes
 * the frame taller and the page scrolls as a whole. The minimum only keeps a
 * short mock looking like a device screen.
 */
export const VIEWPORT_MIN_HEIGHT: Record<PreviewViewport, string> = {
  mobile: '620px',
  tablet: '640px',
  desktop: '520px',
  fluid: '420px',
};
