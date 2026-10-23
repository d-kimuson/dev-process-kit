import { css } from 'lit';

/**
 * The mock atoms: what makes a drawn screen read as a product screen, back-ported
 * from the UX prototype's frames and its native app sample. A browser window
 * (traffic lights and an address bar), a phone (bezel, status bar, home
 * indicator), an opened mail, the native app's bars and notifications, an
 * agent's chat transcript, a terminal window and a handwritten paper memo.
 *
 * A product screen is not the kit's chrome: it stays light (or, for a
 * terminal, its own dark) in a dark theme, so the screen surfaces fix their
 * own colors instead of reading the kit's tokens. The frame around a screen —
 * its title bar, its border, its elevation — reads the kit's tokens like any
 * other surface, so it sits in the page the way a card or a panel does. The
 * prototype template adopts `mockAtom` in its shadow root and renders the
 * same classes, so a frame on any page looks like a prototype's.
 */
export const mockAtom = css`
  /* ------------------------------------------------------------ browser window */

  :where(.dpk-browser-frame) {
    display: flex;
    flex-direction: column;
    margin: 0;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    overflow: hidden;
  }

  /* The title bar: traffic lights, then the address. Shared with the terminal's bar below. */
  :where(.dpk-browser-frame-bar, .dpk-terminal-bar) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--dpk-paper-raised) 88%, transparent),
      color-mix(in srgb, var(--dpk-paper-inset) 88%, transparent)
    );
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--dpk-rule);
    box-shadow: inset 0 1px 0 var(--dpk-highlight);
  }

  :where(.dpk-browser-frame-bar, .dpk-terminal-bar)::before {
    content: '';
    flex: none;
    width: 10px;
    height: 10px;
    margin-right: 30px;
    border-radius: 50%;
    background: #ff5f57;
    box-shadow:
      15px 0 #febc2e,
      30px 0 #28c840;
  }

  :where(.dpk-browser-frame-url) {
    flex: 1;
    min-width: 0;
    padding: 4px 14px;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-sm);
    background: var(--dpk-paper-raised);
    box-shadow: inset 0 1px 2px rgba(20, 28, 44, 0.04);
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* The page: the product's own light surface. */
  :where(.dpk-browser-frame-body, .dpk-smartphone-screen) {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: var(--dpk-screen-min-height, 0);
    color-scheme: light;
    background: #fff;
    color: #1f2430;
  }

  /* ------------------------------------------------------------ phone */

  /* A device is recognised by its shape: a slim bezel, a punch-hole camera and a home indicator. */
  :where(.dpk-smartphone) {
    --_smartphone-width: var(--dpk-smartphone-width, 320px);
    width: min(var(--_smartphone-width), 100%);
    margin: 0;
    padding: 10px;
    border: 1px solid #22262e;
    border-radius: 28px;
    background: linear-gradient(160deg, #2e3440, #1a1d24);
    box-shadow:
      var(--dpk-shadow-lg),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  /* Portrait (~1:2.05), and taller when the content is; clip-path keeps the corners without capping the height. */
  :where(.dpk-smartphone-screen) {
    min-height: calc((var(--_smartphone-width) - 22px) * 2.05);
    clip-path: inset(0 round 18px);
  }

  /* The tabs sit above the home indicator. */
  :where(.dpk-smartphone-screen) > :where(.dpk-tabbar) {
    padding-bottom: 22px;
  }

  /* The home indicator. */
  :where(.dpk-smartphone-screen)::after {
    content: '';
    position: absolute;
    z-index: 2;
    bottom: 8px;
    left: 50%;
    width: 88px;
    height: 4px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: rgba(138, 146, 160, 0.55);
  }

  /* The status bar: the time as its text; the camera and the signal are drawn. */
  :where(.dpk-status-bar) {
    position: relative;
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    padding: 0 12px;
    background: #0c0e13;
    color: #e9edf4;
    font-size: 11.5px;
    font-weight: 550;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
  }

  :where(.dpk-status-bar)::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 10px;
    height: 10px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: #04060a;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.07);
  }

  :where(.dpk-status-bar)::after {
    content: '';
    width: 15px;
    height: 12px;
    margin-left: auto;
    background: currentColor;
    mask: var(--dpk-wifi) center / contain no-repeat;
    -webkit-mask: var(--dpk-wifi) center / contain no-repeat;
    --dpk-wifi: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 12'><path d='M8 9.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z'/><path d='M4.7 7.4a4.8 4.8 0 0 1 6.6 0M2.1 4.7a8.4 8.4 0 0 1 11.8 0' fill='none' stroke='%23000' stroke-width='1.5' stroke-linecap='round'/></svg>");
  }

  /* ------------------------------------------------------------ mail */

  /* One opened message: the subject, the sender's avatar and the envelope rows, above the body. */
  :where(.dpk-received-mail) {
    display: grid;
    gap: 12px;
    padding: 18px 22px 14px;
    border-bottom: 1px solid #e3e6ec;
    background: #fff;
    color: #1f2430;
    color-scheme: light;
  }

  :where(.dpk-received-mail-subject) {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
    line-height: 1.35;
    letter-spacing: -0.01em;
  }

  :where(.dpk-received-mail-envelope) {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  :where(.dpk-received-mail-envelope) > :where(.dpk-avatar) {
    background: linear-gradient(160deg, #6b8af5, #3f5fd8);
    color: #fff;
  }

  :where(dl.dpk-received-mail-meta) {
    display: grid;
    gap: 2px;
    min-width: 0;
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
  }

  :where(dl.dpk-received-mail-meta) > :where(div) {
    display: flex;
    gap: 8px;
    min-width: 0;
  }

  :where(dl.dpk-received-mail-meta) :where(dt) {
    flex: none;
    min-width: 3.5em;
    color: #7a8294;
  }

  :where(dl.dpk-received-mail-meta) :where(dd) {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    color: #1f2430;
  }

  :where(dl.dpk-received-mail-meta) > :where(div:first-child) > :where(dd) {
    font-weight: 600;
  }

  /* ------------------------------------------------------------ native app */

  /* The app's top bar: back, title, an action. It stays put while the screen scrolls. */
  :where(.dpk-appbar) {
    position: sticky;
    top: 0;
    z-index: 1;
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 28px;
    align-items: center;
    padding: 14px 16px 10px;
    border-bottom: 1px solid #e3e6ec;
    background: #fff;
    color: #1f2430;
  }

  :where(.dpk-appbar) > :where(:first-child:not(:only-child)) {
    color: #7a8294;
    font-size: 20px;
    line-height: 1;
  }

  :where(.dpk-appbar) > :where(strong, h1, h2, h3) {
    grid-column: 2;
    justify-self: center;
    max-width: 100%;
    margin: 0;
    overflow: hidden;
    font-size: 14px;
    font-weight: 650;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* The app's bottom tabs; the current one is aria-current="page". */
  :where(.dpk-tabbar) {
    position: sticky;
    bottom: 0;
    z-index: 1;
    display: flex;
    margin-top: auto;
    padding: 10px 4px;
    border-top: 1px solid #e3e6ec;
    background: #fff;
  }

  :where(.dpk-tabbar) > :where(*) {
    flex: 1;
    color: #7a8294;
    font-size: 10.5px;
    text-align: center;
    text-decoration: none;
  }

  :where(.dpk-tabbar) > :where([aria-current='page'], [aria-selected='true']) {
    color: var(--dpk-mock-accent, #2f6fe4);
    font-weight: 650;
  }

  /* A lock screen: the clock, then the notifications. */
  :where(.dpk-lockscreen) {
    display: grid;
    flex: 1 1 auto;
    align-content: start;
    gap: 10px;
    padding: 56px 14px 18px;
    background: var(--dpk-lockscreen-wallpaper, linear-gradient(180deg, #3e5a52, #1f2c29));
    color: #fff;
  }

  :where(.dpk-lockscreen) > :where(time) {
    margin-bottom: 18px;
    font-size: 54px;
    font-weight: 300;
    line-height: 1;
    text-align: center;
  }

  :where(.dpk-lockscreen) > :where(time) > :where(small) {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    opacity: 0.8;
  }

  /* A notification: the app's icon, then who sent it and what it says. */
  :where(.dpk-push) {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 10px;
    padding: 12px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.86);
    backdrop-filter: blur(12px);
    color: #1f2430;
    font-size: 12.5px;
    line-height: 1.45;
  }

  :where(.dpk-push) > :where(:first-child) {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--dpk-mock-accent, #2f6fe4);
    color: #fff;
    font-weight: 700;
  }

  :where(.dpk-push) :where(p) {
    margin: 0;
  }

  :where(.dpk-push) :where(small) {
    display: block;
    color: #7a8294;
    font-size: 11px;
  }

  /* ------------------------------------------------------------ agent chat */

  /* A transcript between the user and an agent: a scrolling log, above an input bar. */
  :where(.dpk-agent-chat) {
    display: flex;
    flex-direction: column;
    min-width: 0;
    margin: 0;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    overflow: hidden;
  }

  :where(.dpk-agent-chat-log) {
    display: grid;
    gap: 12px;
    max-height: var(--dpk-agent-chat-height, 360px);
    padding: 16px;
    overflow: auto;
    background: var(--dpk-paper-sunken);
  }

  /* One turn: its step line (if any) above its bubble, both aligned the same way. */
  :where(.dpk-agent-chat-turn) {
    display: grid;
    gap: 4px;
    max-width: 85%;
  }

  :where(.dpk-agent-chat-turn[data-from='user']) {
    justify-self: end;
    justify-items: end;
  }

  :where(.dpk-agent-chat-turn[data-from='agent']) {
    justify-self: start;
    justify-items: start;
  }

  :where(.dpk-agent-chat-bubble) {
    max-width: 100%;
    margin: 0;
    padding: 9px 13px;
    border-radius: var(--dpk-radius);
    overflow-wrap: anywhere;
    font-size: 13px;
    line-height: 1.55;
  }

  :where(.dpk-agent-chat-turn[data-from='user']) > :where(.dpk-agent-chat-bubble) {
    border-bottom-right-radius: 4px;
    background: var(--dpk-accent);
    color: var(--dpk-accent-ink);
  }

  :where(.dpk-agent-chat-turn[data-from='agent']) > :where(.dpk-agent-chat-bubble) {
    border: 1px solid var(--dpk-rule);
    border-bottom-left-radius: 4px;
    background: var(--dpk-paper-raised);
    color: var(--dpk-ink);
  }

  /* A tool call or a working step: a quiet line above the turn's bubble, not a message of its own. */
  :where(.dpk-agent-chat-step) {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    padding: 0 2px;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 11px;
  }

  :where(.dpk-agent-chat-step)::before {
    content: '';
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--dpk-violet);
  }

  :where(.dpk-agent-chat-composer) {
    display: flex;
    flex: none;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-top: 1px solid var(--dpk-rule);
    background: var(--dpk-paper-raised);
  }

  /* A drawn text field: this is a mock, not a working composer. */
  :where(.dpk-agent-chat-field) {
    flex: 1;
    min-width: 0;
    padding: 7px 12px;
    border: 1px solid var(--dpk-rule-strong);
    border-radius: 999px;
    background: var(--dpk-paper-sunken);
    color: var(--dpk-ink-faint);
    font-size: 12.5px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* ------------------------------------------------------------ terminal */

  /* A terminal window: the title bar shares the browser's glass chrome and traffic lights. */
  :where(.dpk-terminal) {
    display: flex;
    flex-direction: column;
    margin: 0;
    border: 1px solid var(--dpk-rule);
    border-radius: var(--dpk-radius-lg);
    background: var(--dpk-paper-raised);
    box-shadow: var(--dpk-bevel), var(--dpk-shadow-lg);
    overflow: hidden;
  }

  :where(.dpk-terminal-title) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: var(--dpk-ink-faint);
    font-family: var(--dpk-mono);
    font-size: 10.5px;
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  /* The output pane: a terminal reads the same dark palette regardless of the page's theme. */
  :where(.dpk-terminal-body) {
    flex: 1 1 auto;
    min-height: var(--dpk-screen-min-height, 0);
    margin: 0;
    padding: 14px 16px;
    overflow: auto;
    background: #14161c;
    color: #d7dae2;
    color-scheme: dark;
    font-family: var(--dpk-mono);
    font-size: 12.5px;
    line-height: 1.65;
    white-space: pre-wrap;
  }

  /* The prompt is the user@host; the "$" is drawn here so authors never type it. */
  :where(.dpk-terminal-prompt) {
    color: #58d68d;
    font-weight: 600;
  }

  :where(.dpk-terminal-prompt)::after {
    content: ' $';
  }

  :where(.dpk-terminal-command) {
    color: #eef0f5;
  }

  :where(.dpk-terminal-output) {
    color: #9aa1b4;
  }

  :where(.dpk-terminal-success) {
    color: #4fd486;
  }

  :where(.dpk-terminal-error) {
    color: #ff6b7a;
  }

  /* ------------------------------------------------------------ paper */

  /* A handwritten memo: a tilted sheet with its own fixed paper color and a
     handwriting webfont — Klee One for kana/kanji, Caveat for Latin, falling
     back to a system hand-like font if the request is blocked or offline.
     The font is requested by \`ensurePaperFont()\` (see mock.ts) as a
     document-level link, not declared inside this stylesheet: this stylesheet
     is also adopted into shadow roots, where a shadow-scoped font face is not
     reliably applied, and declaring it here would repeat the request once
     per adopting shadow root. */
  :where(.dpk-paper) {
    --_paper-tilt: var(--dpk-paper-tilt, -1.1deg);
    display: block;
    margin: 0;
    padding: 26px 28px;
    border-radius: 2px;
    background: #fbf8f0;
    color: #2d2a22;
    color-scheme: light;
    box-shadow: var(--dpk-shadow-lg);
    transform: rotate(var(--_paper-tilt));
    font-family: 'Klee One', 'Caveat', 'Segoe Print', 'Bradley Hand', 'Chalkboard SE', 'Comic Sans MS', cursive;
    font-size: 15px;
    line-height: 1.75;
  }

  /* Ruled paper: faint horizontal lines, opt in with data-lines="ruled" (plain by default). */
  :where(.dpk-paper[data-lines='ruled']) {
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 27px,
      rgba(68, 110, 196, 0.22) 28px
    );
    background-position: 0 2px;
  }

  :where(.dpk-paper) > :where(*) {
    margin: 0;
  }

  :where(.dpk-paper) > :where(* + *) {
    margin-top: 10px;
  }

  :where(.dpk-paper) :where(h1, h2, h3, h4) {
    font-family: inherit;
    font-size: 1.3em;
    font-weight: 700;
  }

  /* A hand-written sign-off at the end of the note. */
  :where(.dpk-paper-signoff) {
    margin-top: 16px;
    text-align: right;
    font-size: 1.05em;
  }
`;

/** The Google Fonts stylesheet `.dpk-paper` reads its handwriting faces from. */
const PAPER_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&family=Caveat:wght@500;600&display=swap';

let paperFontRequested = false;

/**
 * Requests the paper mock's handwriting webfont, once, and only when the page
 * actually has a `.dpk-paper` on it — a page without the mock never makes the
 * request. This loads a `<link>` at the document level rather than an
 * `@font-face`/`@import` inside `mockAtom` itself: `mockAtom` is adopted into
 * shadow roots (e.g. the prototype template's shell), and a font face
 * declared inside a shadow root is not reliably applied there, while an
 * `@import` would also repeat the request once per adopting shadow root.
 *
 * Google Fonts is deliberately the only source: it is the one stylesheet/font
 * origin most CSP-restricted hosts (e.g. a Claude Artifact) allow, which is
 * also why this is the one webfont exception to the kit's otherwise
 * system-font-only styling (see `core/theme.ts`). `.dpk-paper`'s font stack
 * keeps a system hand-like fallback, so the mock still reads as handwriting
 * if the request is blocked or the page is offline.
 */
export const ensurePaperFont = (): void => {
  if (typeof document === 'undefined' || paperFontRequested) return;
  if (document.querySelector('.dpk-paper') === null) return;
  paperFontRequested = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = PAPER_FONT_HREF;
  document.head.append(link);
};
