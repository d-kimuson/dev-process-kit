# dpk-video

A video made of the page's own HTML, CSS and scripts, played against one clock. The element plays the scenes in order with a crossfade, runs their CSS animations on its clock (so they pause, seek and scrub with the video), plays the recorded audio and the background tracks in step, and shows a player: a progress bar split into the scenes, play / volume / time / captions / full screen, and a side panel with the chapters, the review comments and the notes.

Reviewers comment on a scene or on the current moment; each comment keeps its time, so the agent reads where in the video the reviewer was. A reviewer can instead keep a **note**: it is not a request to the agent but part of the video, which the agent carries into the JSON.

```html
<dpk-video id="intro" heading="紹介動画">
  <script type="application/json">
    {
      "scenes": [
        {
          "id": "problem",
          "title": "課題",
          "cues": [{ "text": "レビューのたびに説明が要る。", "audio": "audio/problem-0.m4a" }]
        },
        { "id": "logo", "title": "ロゴ", "duration": 3 }
      ],
      "tracks": [{ "audio": "audio/bgm.m4a", "volume": 0.3, "duck": 0.1, "loop": true, "fade": 1.5 }]
    }
  </script>
  <div class="backdrop"></div>
  <section data-scene="problem"><h2 class="title">説明が要る</h2></section>
  <section data-scene="logo"><img src="logo.svg" alt="" /></section>
</dpk-video>

<style>
  #intro .title {
    animation: rise 0.6s ease var(--dpk-cue-0) both;
  }
  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 1em;
    }
  }
</style>
```

Load `components.js` (or the all-in-one `index.js`). Put the element in a view — usually `dpk-view-plain` (`docs/views/plain.md`) — to keep the comments.

## Data

The JSON child (`<script type="application/json">`) describes the timing. The element follows edits to it.

| Field    | Type                          | Meaning                                                                                                                                              |
| -------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scenes` | scene[] (at least one)        | Played in order                                                                                                                                      |
| `tracks` | track[] (default `[]`)        | Background audio: music, a sound effect at the start of a scene                                                                                      |
| `pacing` | `{ lead, gap, tail }` seconds | Silence before the first cue without `at`, between such cues and after the last (default `0` each; a narration reads well with `0.8`, `0.35`, `1.1`) |
| `voices` | `{ [voice]: { tone? } }`      | How the captions of each `voice` look (default `{}`)                                                                                                 |
| `fade`   | seconds (default `0.45`)      | How long two scenes crossfade; `0` cuts                                                                                                              |

A **scene** is `{ id, title, cues?, duration?, notes? }`. `id` uses letters, digits, `_` and `-`; `title` names the chapter. A scene lasts until its last cue and the `tail`, and at least `duration`; a scene without cues needs a `duration`.

A **note** is `{ id, at?, body }`: `id` uses letters, digits, `_` and `-` and is unique across all the scenes (a second one is a data error). `at` is seconds from the scene's start, like a cue's; without it the note sits at the scene's start, and past the scene's end at its end. The side panel lists the notes with the comments.

A **cue** is one timed thing in a scene: a caption, a recording, or only a mark that the pictures follow.

| Field      | Meaning                                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | Names the cue for CSS (`--dpk-cue-<id>`, the host's `cue`); without it the cue is named by its index                                                                                                 |
| `text`     | The caption shown while it plays. Without text, no caption                                                                                                                                           |
| `voice`    | Whose voice it is, like a WebVTT `<v>`; reflected on the host. Shown before the caption unless the caption has a tone                                                                                |
| `tone`     | The caption's color preset; wins over the tone of its voice                                                                                                                                          |
| `audio`    | A recording played while it plays; its length is the cue's length                                                                                                                                    |
| `duration` | Seconds; wins over the audio's length. Without both, a caption lasts as long as it takes to read, and a cue with neither text marks only a time (its CSS property) and never becomes the current cue |
| `at`       | Seconds from the scene's start. Without it the cue follows the previous one after the `gap`                                                                                                          |

A caption is outlined text over the picture. A **tone** is one of its color presets: `white` (the default) and `yellow` have a dark outline, `green`, `pink`, `blue` and `orange` a white one inside a dark line. A caption with a tone tells its voice by the color alone, so `"voices": { "Ann": { "tone": "green" }, "Bob": { "tone": "pink" } }` colors a dialogue.

The audio sets the timing: re-recording a line moves everything after it, and the pictures follow because their delays are relative to the cues. Paths resolve against the page.

A **track** is `{ audio, volume?, duck?, loop?, from?, to?, offset?, fade? }`. It plays from the start of scene `from` (default: the first) plus `offset`, to the end of scene `to` (default: the last) or the end of the file. `loop` repeats it, `fade` fades it in and out over that many seconds, and `duck` is the lower volume it eases to while a cue's recording plays.

Data that cannot be read (an unknown field, a duplicate id, a track naming an unknown scene) renders the reason instead of the player (`dataError`).

## Pictures

Each direct child with `data-scene="<scene id>"` is that scene's picture. It is shown only during its scene, crossfading with the next, and its CSS keyframe animations follow the video's clock from the scene's start. A `data-scene` that names no scene is an error. The element sets on each picture:

| Custom property         | Value                                                 |
| ----------------------- | ----------------------------------------------------- |
| `--dpk-cue-<id\|index>` | When that cue starts, in seconds from the scene start |
| `--dpk-scene-duration`  | The scene's length in seconds                         |
| `--dpk-video-scale`     | The stage width over `design-width` (set on the host) |

so `animation-delay: calc(var(--dpk-cue-1) + 0.2s)` starts with the second cue whatever its recording's length. Every other child stays on screen the whole time (a backdrop, a logo, characters), its keyframe animations on the clock of the whole video. Each child fills the stage, and the pictures stay hidden until the recordings' lengths are known. CSS transitions run on their own, so a child can transition when a host attribute below changes.

A component of the kit (`dpk-*`) can be part of a picture. Its own animations follow the clock too, and it is inert: a picture shows it, the reader does not operate it. It draws in px, so give it the stage's scale: `zoom: var(--dpk-video-scale)` draws it at its own size on a stage `design-width` px wide and scales it with the player. A whole view or app keeps its header and floating controls where its window says, so it needs a window of its own: show its page in an inert `<iframe>` scaled the same way, with `storage="memory"` on the view so it keeps no draft. The animations in a frame run on their own clock.

A canvas, WebGL or Three.js scene draws each frame from `dpk-video-timeupdate` (`sceneTime`, or `cue` and `cueTime` to start something with a cue); it then pauses and seeks with the video too. A click on the stage plays and pauses unless the scene calls `preventDefault()` on it, so a scene can take its own clicks.

## Attributes and properties

| Attribute      | Meaning                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| `id`           | Enables comments; keep it stable across revisions                              |
| `heading`      | The player's accessible name and the comment group (default: `Video` / `動画`) |
| `panel-open`   | The side panel is open; reflected                                              |
| `design-width` | The stage width in px at which `--dpk-video-scale` is `1` (default `1280`)     |

The element writes these on itself, for CSS such as `#intro[voice="Ann"] .ann { opacity: 1 }`:

| Attribute          | While                                                        |
| ------------------ | ------------------------------------------------------------ |
| `playing`          | The video plays                                              |
| `scene`            | The id of the current scene                                  |
| `cue`              | The id (or index) of the cue that plays; absent between cues |
| `voice`            | The `voice` of that cue; absent without one                  |
| `controls-visible` | The controls show over the bottom of the stage               |

| Property                                      | Type                         | Meaning                                                  |
| --------------------------------------------- | ---------------------------- | -------------------------------------------------------- |
| `currentTime`                                 | seconds (writable)           | Where the video is; setting it seeks                     |
| `duration`                                    | seconds (read-only)          | Known once every recording's length is loaded            |
| `paused`                                      | `boolean` (read-only)        |                                                          |
| `play()`, `pause()`, `toggle()`, `seek(time)` | methods                      |                                                          |
| `dataError`                                   | `string \| null` (read-only) | Why the data could not be read                           |
| `elementComments`                             | draft comments (writable)    | Assigned by the enclosing view, listed in the side panel |
| `elementActions`                              | draft actions (writable)     | The notes added in this draft, assigned by the view      |
| `elementActionResults`                        | results (read-only)          | How each of `elementActions` applied                     |
| `commentTargets`                              | `{ value, label, group? }[]` | Every scene and every commented moment (read-only)       |

`parseVideoData(json)` is exported from `components.js` for code that checks the data before it reaches a page.

Keys while the player has focus: Space or `k` plays and pauses, ← / → (`j` / `l`) move 5 seconds, Home / End, `m` mutes, `c` shows and hides the captions, `f` toggles full screen. A focused button or the volume slider keeps its own keys.

## Comment targets

| Target                               | What                                   | Label in the review rail |
| ------------------------------------ | -------------------------------------- | ------------------------ |
| `element:<id>/scene/<scene>`         | A scene                                | `課題`                   |
| `element:<id>/scene/<scene>/at/<ms>` | A moment: `ms` milliseconds into scene | `0:05 · 課題`            |

A moment names its scene, so the comment stays on its picture when a recording before it changes length. The Comments tab of the side panel writes a review comment or a note at the current time (the page's [text submit key](../index.md#text-submit-key) sends it, Ctrl/Cmd+Enter by default) and lists the comments and the notes in time order; an entry's time seeks there.

## Notes

A note is an element action on its scene:

| Type       | Target                       | Payload             | Result                                                                      |
| ---------- | ---------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `ADD_NOTE` | `element:<id>/scene/<scene>` | `{ id, at?, body }` | Adds the note to the scene; stale when the scene is gone or the id is taken |

`at` in the payload is seconds as well. The payload has the shape of a note, so the agent applies it by appending the payload to that scene's `notes`. Keep the notes when regenerating the page, and move them with their scene when its id changes. A page with `notes` needs a version of the element that reads them.

## Events

| Event                        | Detail                                                             | Fired when                                                   |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `dpk-video-timeupdate`       | `{ time, scene, sceneTime, sceneDuration, cue, cueTime, playing }` | Each frame while playing, and on every seek                  |
| `dpk-comment-submit`         | `{ target, body }`                                                 | The reader adds a comment — bubbling, **cancelable**         |
| `dpk-element-action`         | `{ type, target, payload }`                                        | The reader keeps a note — bubbling, **cancelable**           |
| `dpk-comment-targets-change` | none                                                               | The scenes, the commented moments or a note's result changed |

`dpk-comment-submit` and `dpk-element-action` follow the acceptance protocol of every component: the nearest view stores it and calls `preventDefault()`. If nothing accepts one, the composer keeps the text and says it was not recorded.

## Styling

The stage keeps `--dpk-video-aspect` (default `16 / 9`), and the progress bar is `--dpk-video-progress` (default `--dpk-accent`); sizes inside are best in `cqw` / `cqh` of the stage, so the picture scales with the player and in full screen. `var(--dpk-video-safe-bottom)` is the height the controls cover at the bottom of the stage while they show (`0px` otherwise): keep things there above it. `::part(subtitle)` is the caption, `::part(voice)` its voice label, `::part(controls)` the controls. `--dpk-video-caption-fill`, `--dpk-video-caption-edge` and `--dpk-video-caption-rim` override the colors of every tone: the text, its outline and the thin line outside the outline.

## Slots

The default slot holds the pictures; the JSON child is read, not shown.

## Out of scope

Exporting a video file, autoplay, looping the whole video, and recording the audio: record it with any tool and point `audio` at the files (the landing page records its narration with a script, `lp/promo/generate.ts`).
