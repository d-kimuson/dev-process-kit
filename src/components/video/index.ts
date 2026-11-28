export { DpkVideo } from './element';
export { videoMessages } from './messages';
export type { VideoMessages } from './messages';
export { parseVideoData } from './model';
export type { VideoCue, VideoData, VideoPacing, VideoScene, VideoTrack } from './model';

import { DpkVideo } from './element';

export const defineVideo = (): void => {
  if (!customElements.get('dpk-video')) customElements.define('dpk-video', DpkVideo);
};
