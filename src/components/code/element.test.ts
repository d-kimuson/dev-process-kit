import { afterEach, describe, expect, it } from 'vitest';

import { defineCode, type DpkCode } from './index';

defineCode();

const mount = async (attributes: string, source: string): Promise<DpkCode> => {
  document.body.innerHTML = `<dpk-code ${attributes}><script type="text/plain">${source}</script></dpk-code>`;
  const code = document.querySelector('dpk-code') as DpkCode;
  await code.updateComplete;
  return code;
};

const shown = (code: DpkCode): HTMLElement | null => code.shadowRoot?.querySelector('pre code') ?? null;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dpk-code', () => {
  it('colours the tokens of a known language and keeps the text as written', async () => {
    const code = await mount('language="ts"', 'const a = "<b>";');
    expect(shown(code)?.textContent).toBe('const a = "<b>";');
    expect(
      [...(shown(code)?.querySelectorAll('span') ?? [])].map((span) => `${span.className}:${span.textContent}`),
    ).toEqual(['keyword:const', 'string:"<b>"']);
  });

  it('shows the code of an unknown language plain', async () => {
    const code = await mount('language="cobol"', 'MOVE A TO B.');
    expect(shown(code)?.textContent).toBe('MOVE A TO B.');
    expect(shown(code)?.querySelector('span')).toBeNull();
  });
});
