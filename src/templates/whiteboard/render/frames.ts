import { html, type TemplateResult } from 'lit';

import type { WhiteboardMessages } from '../messages';

import { frameMembers, type WbFrame, type WhiteboardState } from '../model';
import { colorStyle } from './palette';

export type WbFramesProps = {
  readonly m: WhiteboardMessages;
  readonly state: WhiteboardState;
  /** The frame in focus (`#frame=`). */
  readonly focused: string | undefined;
  readonly focusFrame: (frameId: string) => void;
  readonly showBoard: () => void;
};

/** The sidebar outline: every frame, in board order, as a way to fly to it. */
export const renderFrames = (props: WbFramesProps): TemplateResult => {
  const { m, state, focused } = props;
  const frames = state.items.filter((item): item is WbFrame => item.kind === 'frame');
  return html`<nav class="wb-frames" aria-label=${m.framesHeading}>
    <p class="dpk-label">${m.framesHeading}</p>
    <p class="wb-frames-hint">${m.framesHint}</p>
    <ul>
      <li>
        <button
          type="button"
          class="wb-frame-link"
          aria-current=${String(focused === undefined)}
          @click=${props.showBoard}
        >
          <span class="wb-frame-dot wb-frame-dot--board" aria-hidden="true"></span>
          <span class="wb-frame-name">${m.wholeBoard}</span>
          <span class="wb-frame-count">${m.memberCount(state.items.length)}</span>
        </button>
      </li>
      ${frames.map(
        (frame) =>
          html`<li>
            <button
              type="button"
              class="wb-frame-link"
              data-frame=${frame.id}
              aria-current=${String(focused === frame.id)}
              @click=${() => props.focusFrame(frame.id)}
            >
              <span class="wb-frame-dot" style=${colorStyle(frame.color)} aria-hidden="true"></span>
              <span class="wb-frame-name">${frame.title}</span>
              <span class="wb-frame-count">${m.memberCount(frameMembers(state, frame).length)}</span>
            </button>
          </li>`,
      )}
    </ul>
  </nav>`;
};
