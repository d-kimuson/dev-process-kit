// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { parseGrill } from '../grill';
import { boardOfMark, pageGrill, refCandidates } from './grill';

const own = parseGrill({ questions: [{ id: 'scope', title: 'Which release?' }] });
const before = parseGrill({
  questions: [
    { id: 'retry', title: 'Retry twice?', options: [{ id: 'key', label: 'Idempotency key' }] },
    { id: 'notify', title: 'Who hears of it?' },
  ],
  history: [{ label: 'kickoff', questions: [{ id: 'deadline', title: 'Deadline?' }] }],
});
const after = parseGrill({ questions: [{ id: 'retry', ref: 'R', title: 'Retry after the change?' }] });

describe('pageGrill', () => {
  it('keeps the page’s own questions and qualifies each board’s with its board', () => {
    const grill = pageGrill(own, [
      { board: 'before', grill: before },
      { board: 'after', grill: after },
    ]);
    expect(grill.questions.map((question) => [question.id, question.ref, question.title])).toEqual([
      ['scope', 'Q1', 'Which release?'],
      ['retry@before', 'Q1@before', 'Retry twice?'],
      ['notify@before', 'Q2@before', 'Who hears of it?'],
      ['retry@after', 'R@after', 'Retry after the change?'],
    ]);
    expect(grill.questions[1]?.options).toEqual([{ id: 'key', label: 'Idempotency key' }]);
  });

  it('lines the earlier rounds up by position', () => {
    const grill = pageGrill(own, [{ board: 'before', grill: before }]);
    expect(grill.rounds).toEqual([
      {
        label: 'kickoff',
        questions: [expect.objectContaining({ id: 'deadline@before', ref: 'Q1@before', answer: null })],
      },
    ]);
  });

  it('is the page’s own questions when no board asks anything', () => {
    expect(pageGrill(own, [{ board: 'before', grill: parseGrill({ questions: [] }) }])).toEqual(own);
  });
});

describe('refCandidates', () => {
  it('reads a mark inside a board as that board’s question first, then the page’s', () => {
    expect(refCandidates('Q1', 'before')).toEqual(['Q1@before', 'Q1']);
    expect(refCandidates('Q1@after', 'before')).toEqual(['Q1@after']);
    expect(refCandidates('Q1', null)).toEqual(['Q1']);
  });
});

describe('boardOfMark', () => {
  it('finds the board a mark sits in, through the shadow roots of components', () => {
    const page = document.createElement('dpk-page');
    const board = document.createElement('div');
    board.setAttribute('board', 'before');
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const node = document.createElement('span');
    shadow.append(node);
    board.append(host);
    page.append(board, document.createElement('p'));
    expect(boardOfMark(node)).toBe('before');
    expect(boardOfMark(board)).toBe('before');
    expect(boardOfMark(page.lastElementChild ?? page)).toBeNull();
  });
});
