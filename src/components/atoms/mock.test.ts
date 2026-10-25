// @vitest-environment-options {"settings":{"disableCSSFileLoading":true}}
// ensurePaperFont() below injects a real <link rel="stylesheet"> to Google Fonts; this keeps
// happy-dom from actually fetching it (no network access in tests, and no reason to want it).
import { afterEach, describe, expect, it } from 'vitest';

import { ensurePaperFont, mockAtom } from './mock';

/**
 * `mockAtom` is pure CSS (no presentation-derivation logic of its own), so the
 * only thing worth guarding at this layer is that each class a mock is built
 * from is still declared in the stylesheet — a cheap trip wire against a typo
 * or an accidental deletion while editing the sheet. Real rendering is
 * verified in the browser via the sample catalog (see `lp/index.html`).
 */
describe('mockAtom', () => {
  const css = mockAtom.cssText;

  it('keeps the existing mocks (browser frame, smartphone, received mail)', () => {
    expect(css).toContain('.dpk-browser-frame');
    expect(css).toContain('.dpk-browser-frame-bar');
    expect(css).toContain('.dpk-browser-frame-url');
    expect(css).toContain('.dpk-smartphone');
    expect(css).toContain('.dpk-smartphone-screen');
    expect(css).toContain('.dpk-received-mail');
    expect(css).toContain('.dpk-received-mail-subject');
  });

  it('declares the agent chat atom and its parts', () => {
    expect(css).toContain('.dpk-agent-chat');
    expect(css).toContain('.dpk-agent-chat-log');
    expect(css).toContain('.dpk-agent-chat-turn');
    expect(css).toContain(".dpk-agent-chat-turn[data-from='user']");
    expect(css).toContain(".dpk-agent-chat-turn[data-from='agent']");
    expect(css).toContain('.dpk-agent-chat-bubble');
    expect(css).toContain('.dpk-agent-chat-step');
    expect(css).toContain('.dpk-agent-chat-composer');
    expect(css).toContain('.dpk-agent-chat-field');
  });

  it('declares the terminal atom, sharing the browser bar chrome, and its color roles', () => {
    expect(css).toContain('.dpk-terminal');
    // The title bar (and its traffic lights) is shared with .dpk-browser-frame-bar.
    expect(css).toContain('.dpk-browser-frame-bar, .dpk-terminal-bar');
    expect(css).toContain('.dpk-terminal-title');
    expect(css).toContain('.dpk-terminal-body');
    expect(css).toContain('.dpk-terminal-prompt');
    // The "$" is drawn by CSS, so authors write "user@host" and never the "$" itself.
    expect(css).toMatch(/\.dpk-terminal-prompt\)::after\s*{\s*content: ' \$';/);
    expect(css).toContain('.dpk-terminal-command');
    expect(css).toContain('.dpk-terminal-output');
    expect(css).toContain('.dpk-terminal-success');
    expect(css).toContain('.dpk-terminal-error');
  });

  it('declares the paper atom with a handwriting font stack, requested elsewhere (not by @import here)', () => {
    expect(css).toContain('.dpk-paper');
    expect(css).toContain(".dpk-paper[data-lines='ruled']");
    expect(css).toContain('.dpk-paper-signoff');
    expect(css).toContain("font-family: 'Klee One', 'Caveat'");
    // The CSS text itself never requests the font: it only reads the font-family.
    // ensurePaperFont() (tested below) is what asks the document for it.
    expect(css).not.toMatch(/@import|fonts\.googleapis|fonts\.gstatic/);
  });
});

/**
 * `ensurePaperFont` is a document-level side effect (not CSS), so it is
 * guarded separately from the stylesheet trip wires above: it must ask for
 * the webfont only when `.dpk-paper` is actually on the page, and only once.
 */
describe('ensurePaperFont', () => {
  afterEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('does not request the font when no .dpk-paper is on the page', () => {
    ensurePaperFont();
    expect(document.head.querySelector('link[href*="fonts.googleapis.com"]')).toBeNull();
  });

  it('requests Klee One and Caveat from Google Fonts once a .dpk-paper appears, and only once', () => {
    document.body.innerHTML = '<div class="dpk-paper">memo</div>';

    ensurePaperFont();
    ensurePaperFont();

    const links = document.head.querySelectorAll('link[href*="fonts.googleapis.com"]');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('rel')).toBe('stylesheet');
    expect(links[0]?.getAttribute('href')).toContain('family=Klee+One');
    expect(links[0]?.getAttribute('href')).toContain('family=Caveat');
  });
});
