import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { hasSideStripe } from './conventions.js';

/** The tracked sample pages: the ones the landing site publishes. */
const pages = execFileSync('git', ['ls-files', 'lp/*.html'], { encoding: 'utf8' }).split('\n').filter(Boolean);

const styleOf = (html) => [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(([, css]) => css).join('\n');

describe('landing sample styles', () => {
  it.each(pages)('%s draws no edge stripe', (page) => {
    expect(hasSideStripe(styleOf(readFileSync(page, 'utf8')))).toBe(false);
  });
});
