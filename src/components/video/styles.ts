import { css } from 'lit';

/**
 * The player is dark and sits over the picture: the progress bar and the buttons fade in at the bottom of the
 * stage, the subtitle rises above them while they show. The side panel is paper, like the rest of the kit, and
 * as tall as the player; on a narrow container it moves below it.
 */
export const videoStyles = css`
  :host {
    --dpk-video-aspect: 16 / 9;
    --dpk-video-progress: var(--dpk-accent);
    --panel-width: 320px;
    --on-video: #fff;
    --on-video-soft: rgb(255 255 255 / 0.78);
    --on-video-faint: rgb(255 255 255 / 0.32);
    --dpk-video-safe-bottom: 0px;
    display: block;
    container-type: inline-size;
    color: var(--dpk-ink);
    font-family: var(--dpk-body);
  }

  .frame {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  :host([controls-visible]) {
    --dpk-video-safe-bottom: 64px;
  }

  :host([panel-open]) .frame {
    grid-template-columns: minmax(0, 1fr) var(--panel-width);
  }

  @container (max-width: 720px) {
    :host([panel-open]) .frame {
      grid-template-columns: minmax(0, 1fr);
    }

    .panel {
      height: 360px;
    }
  }

  .frame[data-fullscreen] {
    grid-template-rows: minmax(0, 1fr);
    gap: 0;
    height: 100%;
    background: #000;
  }

  /* ------------------------------------------------------------ player */

  .player {
    position: relative;
    overflow: hidden;
    border-radius: var(--dpk-radius);
    background: #000;
    outline: none;
    box-shadow: var(--dpk-shadow-sm);
  }

  .player:focus-visible {
    box-shadow: var(--dpk-focus);
  }

  .player[data-idle] {
    cursor: none;
  }

  /* The open panel takes its width from the player, not its height: the picture shrinks between black bars. */
  :host([panel-open]) .player,
  .frame[data-fullscreen] .player {
    display: grid;
    place-items: center;
    container-type: size;
  }

  :host([panel-open]) .frame:not([data-fullscreen]) .player {
    height: calc(100cqw / (var(--dpk-video-aspect)));
  }

  .frame[data-fullscreen] .player {
    height: 100%;
    border-radius: 0;
    box-shadow: none;
  }

  .stage {
    position: relative;
    overflow: hidden;
    width: 100%;
    aspect-ratio: var(--dpk-video-aspect);
    container: dpk-stage / size;
    cursor: pointer;
  }

  :host([panel-open]) .stage,
  .frame[data-fullscreen] .stage {
    width: min(100cqw, 100cqh * (var(--dpk-video-aspect)));
  }

  ::slotted(*) {
    position: absolute;
    inset: 0;
  }

  :host(:not([scene])) ::slotted([data-scene]) {
    visibility: hidden;
  }

  .subtitle {
    --fill: #fff;
    --edge: #111;
    --rim: #111;
    --rim-line: var(--dpk-video-caption-rim, var(--rim));
    position: absolute;
    left: 50%;
    bottom: calc(2.5cqh + var(--dpk-video-safe-bottom));
    z-index: 2;
    width: max-content;
    max-width: 84%;
    margin: 0;
    color: var(--dpk-video-caption-fill, var(--fill));
    font-size: clamp(14px, 2.6cqw, 36px);
    font-weight: 800;
    letter-spacing: 0.03em;
    line-height: 1.4;
    text-align: center;
    text-wrap: balance;
    word-break: auto-phrase;
    -webkit-text-stroke: 0.22em var(--dpk-video-caption-edge, var(--edge));
    paint-order: stroke fill;
    filter: drop-shadow(0.05em 0 0 var(--rim-line)) drop-shadow(-0.05em 0 0 var(--rim-line))
      drop-shadow(0 0.05em 0 var(--rim-line)) drop-shadow(0 -0.05em 0 var(--rim-line))
      drop-shadow(0 0.08em 0.12em rgb(0 0 0 / 0.5));
    translate: -50% 0;
    transition: bottom var(--dpk-dur) var(--dpk-ease);
  }

  .subtitle[data-tone='yellow'] {
    --fill: #ffe14a;
    --edge: #2a1f00;
    --rim: #2a1f00;
  }

  .subtitle[data-tone='green'] {
    --fill: #2fb344;
    --edge: #fff;
    --rim: #0f4a1a;
  }

  .subtitle[data-tone='pink'] {
    --fill: #f0368c;
    --edge: #fff;
    --rim: #5c0d33;
  }

  .subtitle[data-tone='blue'] {
    --fill: #1f86f0;
    --edge: #fff;
    --rim: #0a2f5c;
  }

  .subtitle[data-tone='orange'] {
    --fill: #f2730f;
    --edge: #fff;
    --rim: #5c2700;
  }

  .voice {
    margin-right: 0.6em;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .big-play {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    margin: auto;
    width: clamp(48px, 9cqw, 88px);
    height: clamp(48px, 9cqw, 88px);
    border-radius: 50%;
    background: rgb(0 0 0 / 0.55);
    color: var(--on-video);
    pointer-events: none;
    box-shadow: 0 0 0 1px var(--on-video-faint);
  }

  .big-play svg {
    width: 42%;
    height: 42%;
    translate: 6% 0;
    fill: currentColor;
  }

  .error {
    margin: 0;
    padding: 12px 14px;
    border: 1px solid var(--dpk-danger);
    border-radius: var(--dpk-radius-sm);
    color: var(--dpk-danger);
    font-family: var(--dpk-mono);
    font-size: var(--dpk-text-xs);
  }

  /* ------------------------------------------------------------ chrome */

  .chrome {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 3;
    padding: 28px 12px 6px;
    background: linear-gradient(transparent, rgb(0 0 0 / 0.7));
    color: var(--on-video);
    transition: opacity var(--dpk-dur) var(--dpk-ease);
  }

  .frame[data-fullscreen] .chrome {
    position: fixed;
  }

  :host([panel-open]) .frame[data-fullscreen] .chrome {
    right: var(--panel-width);
  }

  .player[data-idle] .chrome {
    opacity: 0;
    pointer-events: none;
  }

  .bar {
    position: relative;
    display: flex;
    align-items: center;
    height: 18px;
    outline: none;
    cursor: pointer;
    touch-action: none;
  }

  .segments {
    display: flex;
    gap: 3px;
    width: 100%;
  }

  .segment {
    position: relative;
    flex-basis: 0;
    min-width: 2px;
    height: 4px;
    overflow: hidden;
    border-radius: 2px;
    background: var(--on-video-faint);
    transition: transform var(--dpk-dur-fast) var(--dpk-ease);
  }

  .segment::before,
  .segment::after {
    content: '';
    position: absolute;
    inset: 0;
    transform-origin: left;
  }

  .segment::before {
    background: rgb(255 255 255 / 0.4);
    transform: scaleX(var(--hover));
  }

  .segment::after {
    background: var(--dpk-video-progress);
    transform: scaleX(var(--fill));
  }

  .segment[data-hovered] {
    transform: scaleY(1.6);
  }

  .thumb {
    position: absolute;
    left: calc(var(--progress) * 100%);
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--dpk-video-progress);
    translate: -50% 0;
    scale: 0;
    transition: scale var(--dpk-dur-fast) var(--dpk-ease-spring);
    pointer-events: none;
  }

  .bar:hover .thumb,
  .bar:focus-visible .thumb {
    scale: 1;
  }

  .bar:focus-visible .segments {
    border-radius: 3px;
    box-shadow: 0 0 0 3px rgb(255 255 255 / 0.5);
  }

  .tooltip {
    position: absolute;
    bottom: 24px;
    left: clamp(72px, calc(var(--at) * 100%), calc(100% - 72px));
    display: grid;
    justify-items: center;
    gap: 1px;
    max-width: 240px;
    padding: 5px 9px;
    border-radius: var(--dpk-radius-sm);
    background: rgb(20 20 20 / 0.92);
    color: var(--on-video);
    font-size: var(--dpk-text-2xs);
    line-height: 1.35;
    white-space: nowrap;
    translate: -50% 0;
    pointer-events: none;
    box-shadow: var(--dpk-shadow-sm);
  }

  .tooltip b {
    max-width: 100%;
    overflow: hidden;
    font-weight: 650;
    text-overflow: ellipsis;
  }

  .tooltip span {
    color: var(--on-video-soft);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 40px;
  }

  .ctl {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--on-video);
    cursor: pointer;
    transition:
      background var(--dpk-dur-fast) var(--dpk-ease),
      transform var(--dpk-dur-fast) var(--dpk-ease);
  }

  .ctl:hover:not([disabled]) {
    background: rgb(255 255 255 / 0.14);
  }

  .ctl:active:not([disabled]) {
    transform: scale(0.92);
  }

  .ctl:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgb(255 255 255 / 0.7);
  }

  .ctl[disabled] {
    opacity: 0.4;
    cursor: default;
  }

  .ctl[aria-pressed='true'] {
    background: rgb(255 255 255 / 0.2);
  }

  .ctl svg {
    width: 20px;
    height: 20px;
  }

  .volume {
    display: flex;
    align-items: center;
  }

  .volume input {
    width: 0;
    height: 4px;
    margin: 0;
    border-radius: 2px;
    background: linear-gradient(
      to right,
      var(--on-video) calc(var(--level) * 100%),
      var(--on-video-faint) calc(var(--level) * 100%)
    );
    opacity: 0;
    appearance: none;
    cursor: pointer;
    transition:
      width var(--dpk-dur) var(--dpk-ease),
      opacity var(--dpk-dur) var(--dpk-ease),
      margin var(--dpk-dur) var(--dpk-ease);
  }

  .volume:hover input,
  .volume:focus-within input {
    width: 72px;
    margin: 0 8px 0 4px;
    opacity: 1;
  }

  .volume input::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--on-video);
    appearance: none;
  }

  .volume input::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 0;
    border-radius: 50%;
    background: var(--on-video);
  }

  .volume input:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgb(255 255 255 / 0.4);
  }

  .time {
    padding: 0 8px;
    color: var(--on-video-soft);
    font-size: var(--dpk-text-xs);
    white-space: nowrap;
  }

  .spacer {
    flex: 1;
  }

  /* ------------------------------------------------------------- panel */

  .panel {
    position: relative;
    min-height: 240px;
    overflow: hidden;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-shadow-xs);
  }

  .frame[data-fullscreen] .panel {
    border-width: 0 0 0 1px;
    border-radius: 0;
  }

  .panel-body {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
  }

  .panel-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 10px 12px;
    border-bottom: 1px solid var(--dpk-rule);
  }

  .panel-head .comment-kinds {
    flex: 1;
    font-size: var(--dpk-text-xs);
  }

  .panel-title {
    flex: 1;
    margin: 0;
    font-size: var(--dpk-text-sm);
    font-weight: 650;
  }

  .count {
    display: inline-block;
    min-width: 1.6em;
    margin-left: 2px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--dpk-paper-inset);
    color: var(--dpk-ink-soft);
    font-size: var(--dpk-text-2xs);
    text-align: center;
  }

  .chapters,
  .moments {
    flex: 1;
    display: grid;
    align-content: start;
    gap: 2px;
    margin: 0;
    padding: 6px;
    overflow: auto;
    list-style: none;
  }

  .chapter {
    position: relative;
    display: grid;
    grid-template-columns: 3.2em minmax(0, 1fr);
    gap: 10px;
    width: 100%;
    padding: 8px 10px;
    overflow: hidden;
    border: 0;
    border-radius: var(--dpk-radius-sm);
    background: transparent;
    color: var(--dpk-ink-soft);
    font: inherit;
    font-size: var(--dpk-text-sm);
    text-align: left;
    cursor: pointer;
    transition: background var(--dpk-dur-fast) var(--dpk-ease);
  }

  .chapter:hover {
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink);
  }

  .chapter:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .chapter[aria-current='true'] {
    background: var(--dpk-blue-soft);
    color: var(--dpk-ink);
    font-weight: 600;
  }

  .chapter[aria-current='true']::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: calc(var(--progress) * 100%);
    height: 2px;
    background: var(--dpk-blue);
  }

  .chapter-time {
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: var(--dpk-text-2xs);
    line-height: 1.7;
  }

  .chapter-title {
    overflow-wrap: anywhere;
  }

  .empty {
    flex: 1;
    margin: 0;
    padding: 16px 14px;
    color: var(--dpk-ink-faint);
    font-size: var(--dpk-text-sm);
  }

  .moment {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px 8px;
    padding: 8px 8px 10px;
    border-radius: var(--dpk-radius-sm);
  }

  .moment + .moment {
    border-top: 1px solid var(--dpk-rule);
  }

  .moment-time {
    padding: 1px 7px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: var(--dpk-radius-xs);
    background: var(--dpk-paper-raised);
    color: var(--dpk-blue-strong);
    font-family: var(--dpk-mono);
    font-size: var(--dpk-text-2xs);
    cursor: pointer;
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-xs);
  }

  .moment-time:hover {
    background: var(--dpk-blue-soft);
  }

  .moment-time:focus-visible {
    outline: none;
    box-shadow: var(--dpk-focus);
  }

  .moment-scene {
    overflow: hidden;
    color: var(--dpk-ink-faint);
    font-size: var(--dpk-text-2xs);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .moment-kind {
    display: inline-grid;
    color: var(--dpk-ink-faint);
  }

  .moment-kind svg {
    width: 13px;
    height: 13px;
  }

  .moment-body {
    grid-column: 1 / -1;
    margin: 0;
    font-size: var(--dpk-text-sm);
    line-height: 1.55;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .composer {
    display: grid;
    gap: 6px;
    padding: 10px 12px 12px;
    border-top: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-sunken);
  }
`;
