// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import type { DraftAction } from '../../core/types';
import type { DpkViewUsm } from './element';

import '../../index';
import { applyUsmAction } from './apply';
import { burndownMilestoneOf, burndownOf, measureOf, remainingSharesOf, tallyOf } from './burndown';
import { layoutChart, readoutAt, timeTicks, valueTicks } from './burndown-chart';
import { usmDefinitionFor } from './definition';
import { usmMessages } from './messages';
import { parseUsmBase, type UsmState } from './model';
import { resolveUsmNavigation } from './present';

const m = usmMessages('en');
const definition = usmDefinitionFor('en');

// Idea → Demo costs 7, Demo → Ready 2, Ready → Done 1: a story at Idea has 10 to go.
const raw = {
  features: ['estimates'],
  activities: [{ id: 'a1', name: 'A1', steps: [{ id: 's1', name: 'S1' }] }],
  milestones: [
    { id: 'mvp', name: 'MVP', dueDate: '2026-11-30' },
    { id: 'v1', name: 'v1' },
  ],
  statuses: [
    { id: 'idea', name: 'Idea', weight: 7 },
    { id: 'demo', name: 'Demo', weight: 2 },
    { id: 'ready', name: 'Ready', weight: 1 },
    { id: 'done', name: 'Done' },
  ],
  estimates: [
    { id: 'S', name: 'S', points: 1 },
    { id: 'M', name: 'M', points: 3 },
    { id: 'L', name: 'L', points: 5 },
  ],
  stories: [
    { id: 'a', name: 'A', activityId: 'a1', stepId: 's1', milestoneId: 'mvp', statusId: 'idea', estimateId: 'L' },
    { id: 'b', name: 'B', activityId: 'a1', stepId: 's1', milestoneId: 'mvp', statusId: 'demo', estimateId: 'M' },
    { id: 'c', name: 'C', activityId: 'a1', stepId: 's1', milestoneId: 'mvp', statusId: 'ready', estimateId: 'S' },
    { id: 'd', name: 'D', activityId: 'a1', stepId: 's1', milestoneId: 'mvp', statusId: 'done', estimateId: 'M' },
    { id: 'e', name: 'E', activityId: 'a1', stepId: 's1', milestoneId: 'mvp', statusId: 'idea' },
    { id: 'f', name: 'F', activityId: 'a1', stepId: 's1', statusId: 'idea', estimateId: 'S' },
  ],
  snapshots: [
    {
      id: 'snap1',
      at: '2026-10-01T00:00:00.000Z',
      tally: [
        { milestoneId: 'mvp', statusId: 'idea', stories: 4, points: 12 },
        { milestoneId: 'mvp', statusId: 'demo', stories: 1, points: 3 },
      ],
    },
  ],
};

const base = parseUsmBase(raw);
const NOW = Date.parse('2026-10-16T00:00:00.000Z');

const act = (type: string, target: { type: string; id: string }, payload: unknown): DraftAction => {
  return { id: 'x', type, target, payload, createdAt: '2026-01-01T00:00:00Z' };
};

const apply = (state: UsmState, type: string, target: { type: string; id: string }, payload: unknown) => {
  return applyUsmAction(state, act(type, target, payload));
};

/** Sums of fractions drift in the last bits; compare them to 9 places. */
const rounded = (values: readonly number[]) => values.map((value) => Math.round(value * 1e9) / 1e9);

const storyOf = (state: UsmState | null, id: string) => state?.stories.find((story) => story.id === id);

describe('usm estimates and burndown: model', () => {
  it('rejects an unknown estimate, a bad due date and a tally of unknown statuses', () => {
    const withStory = (patch: object) => ({
      ...raw,
      stories: raw.stories.map((story) => (story.id === 'a' ? { ...story, ...patch } : story)),
    });
    expect(() => parseUsmBase(withStory({ estimateId: 'XL' }))).toThrow(/unknown estimateId/);
    expect(() =>
      parseUsmBase({ ...raw, milestones: [{ id: 'mvp', name: 'MVP', dueDate: '2026-13-01' }, raw.milestones[1]] }),
    ).toThrow();
    expect(() =>
      parseUsmBase({
        ...raw,
        snapshots: [
          { id: 'snap1', at: '2026-10-01T00:00:00.000Z', tally: [{ statusId: 'nope', stories: 1, points: 1 }] },
        ],
      }),
    ).toThrow(/unknown statusId/);
    expect(() => parseUsmBase({ ...raw, estimates: [{ id: 'S', name: 'S', points: -1 }] })).toThrow();
  });

  it('tallies the map by milestone and status, with the points of each estimate (1 while there is none)', () => {
    expect(tallyOf(base)).toEqual([
      { milestoneId: 'mvp', statusId: 'idea', stories: 2, points: 5 + 1 },
      { milestoneId: 'mvp', statusId: 'demo', stories: 1, points: 3 },
      { milestoneId: 'mvp', statusId: 'ready', stories: 1, points: 1 },
      { milestoneId: 'mvp', statusId: 'done', stories: 1, points: 3 },
      { statusId: 'idea', stories: 1, points: 1 },
    ]);
  });

  it('shares a story out between the statuses by their weights, read as parts of 10', () => {
    const shares = (weights: readonly (number | undefined)[], measure = 'weighted') =>
      remainingSharesOf(
        parseUsmBase({
          ...raw,
          measure,
          statuses: [
            ...weights.map((weight, index) => ({
              id: `w${index}`,
              name: `W${index}`,
              ...(weight === undefined ? {} : { weight }),
            })),
            { id: 'done', name: 'Done' },
          ],
          stories: [],
          snapshots: [],
        }),
      );
    // 7 + 2 + 1 = 10: Idea still has all of it ahead, Demo 3 of 10, Ready 1 of 10, Done none.
    expect(rounded(remainingSharesOf({ ...base, measure: 'weighted' }))).toEqual([1, 0.3, 0.1, 0]);
    // other totals read as a ratio, and no weight at all as equal shares
    expect(shares([2, 1, 1])).toEqual([1, 0.5, 0.25, 0]);
    expect(shares([0, 0])).toEqual([1, 0.5, 0]);
    expect(shares([undefined, undefined])).toEqual([1, 0.5, 0]);
    // measured otherwise, every status but the last still has the whole story ahead
    expect(shares([7, 2, 1], 'points')).toEqual([1, 1, 1, 0]);
    expect(shares([7, 2, 1], 'stories')).toEqual([1, 1, 1, 0]);
    // the weights go with the estimates: while those are off, so are they
    expect(remainingSharesOf({ ...base, features: [], measure: 'weighted' })).toEqual([1, 1, 1, 0]);
  });

  it('measures by what the map names, else by points once there is a scale, and by stories without estimates', () => {
    expect(measureOf(base)).toBe('points');
    expect(measureOf(parseUsmBase({ ...raw, estimates: [], stories: [] }))).toBe('stories');
    expect(measureOf({ ...base, measure: 'stories' })).toBe('stories');
    expect(measureOf({ ...base, measure: 'weighted' })).toBe('weighted');
    expect(measureOf({ ...base, features: [], measure: 'weighted' })).toBe('stories');
    expect(() => parseUsmBase({ ...raw, measure: 'hours' })).toThrow();
  });

  it('burns down each status and the work left, ending at today', () => {
    const points = burndownOf(base, 'mvp', NOW);
    const snapAt = Date.parse('2026-10-01T00:00:00.000Z');
    // By points: the points of every story not done yet.
    expect(points.combined).toEqual([
      { at: snapAt, value: 12 + 3, snapshotId: 'snap1' },
      { at: NOW, value: 6 + 3 + 1 },
    ]);
    // One line per status a story can reach: what has not reached it yet.
    expect(points.byStatus.map((line) => [line.status.id, line.points.map((point) => point.value)])).toEqual([
      ['demo', [12, 6]],
      ['ready', [15, 9]],
      ['done', [15, 10]],
    ]);
    expect(points.due).toBe(new Date(2026, 10, 30, 23, 59, 59).getTime());
    // By stories: each story not done yet counts one, whatever its status.
    const stories = burndownOf({ ...base, measure: 'stories' }, 'mvp', NOW);
    expect(stories.combined.map((point) => point.value)).toEqual([4 + 1, 2 + 1 + 1]);
    expect(burndownOf(base, 'v1', NOW).due).toBeNull();
    // Weighted: points × the share still ahead (Idea 10/10, Demo 3/10, Ready 1/10, Done 0).
    const weighted = burndownOf({ ...base, measure: 'weighted' }, 'mvp', NOW);
    expect(rounded(weighted.combined.map((point) => point.value))).toEqual([12.9, 7]);
  });
});

describe('usm estimates and burndown: actions', () => {
  it('picks how the work left is measured, keeping the scale and the weights whichever it is', () => {
    const page = { type: 'page', id: 'usm' };
    expect(base).not.toHaveProperty('measure');
    const weighted = apply(base, 'SET_MEASURE', page, { measure: 'weighted' });
    expect(weighted?.measure).toBe('weighted');
    const stories = apply(weighted!, 'SET_MEASURE', page, { measure: 'stories' });
    expect(stories?.measure).toBe('stories');
    expect(stories?.estimates).toEqual(base.estimates);
    expect(stories?.statuses).toEqual(base.statuses);
    // set the way it already stands, the map stays as it is
    expect(apply(weighted!, 'SET_MEASURE', page, { measure: 'weighted' })).toBe(weighted);
    expect(apply(base, 'SET_MEASURE', page, { measure: 'points' })).toBe(base);
    expect(apply(base, 'SET_MEASURE', page, { measure: 'hours' })).toBeNull();
  });

  it('estimates a story, and clears it again', () => {
    const target = { type: 'story', id: 'e' };
    const estimated = apply(base, 'SET_STORY_ESTIMATE', target, { estimateId: 'M' });
    expect(storyOf(estimated, 'e')?.estimateId).toBe('M');
    expect(storyOf(apply(estimated!, 'SET_STORY_ESTIMATE', target, { estimateId: null }), 'e')).not.toHaveProperty(
      'estimateId',
    );
    expect(apply(base, 'SET_STORY_ESTIMATE', target, { estimateId: 'XL' })).toBeNull();
  });

  it('edits the scale; deleting an estimate leaves its stories unestimated', () => {
    const added = apply(base, 'ADD_ESTIMATE', { type: 'page', id: 'usm' }, { id: 'XL', name: 'XL', points: 8 });
    expect(added?.estimates.map((estimate) => estimate.id)).toEqual(['S', 'M', 'L', 'XL']);
    const renamed = apply(base, 'SET_ESTIMATE_NAME', { type: 'estimate', id: 'L' }, { name: 'Large' });
    expect(renamed?.estimates[2]).toEqual({ id: 'L', name: 'Large', points: 5 });
    const repointed = apply(base, 'SET_ESTIMATE_POINTS', { type: 'estimate', id: 'L' }, { points: 8 });
    expect(repointed?.estimates[2]?.points).toBe(8);
    expect(apply(base, 'SET_ESTIMATE_POINTS', { type: 'estimate', id: 'L' }, { points: -1 })).toBeNull();
    const reordered = apply(base, 'REORDER_ESTIMATE', { type: 'estimate', id: 'L' }, { after: null });
    expect(reordered?.estimates.map((estimate) => estimate.id)).toEqual(['L', 'S', 'M']);
    const deleted = apply(base, 'DELETE_ESTIMATE', { type: 'estimate', id: 'M' }, {});
    expect(storyOf(deleted, 'b')).not.toHaveProperty('estimateId');
    expect(storyOf(deleted, 'd')).not.toHaveProperty('estimateId');
  });

  it('sets a status weight and a milestone due date', () => {
    const weighted = apply(base, 'SET_STATUS_WEIGHT', { type: 'status', id: 'demo' }, { weight: 4 });
    expect(weighted?.statuses[1]?.weight).toBe(4);
    const due = apply(base, 'SET_MILESTONE_DUE_DATE', { type: 'milestone', id: 'v1' }, { dueDate: '2027-01-31' });
    expect(due?.milestones[1]).toEqual({ id: 'v1', name: 'v1', dueDate: '2027-01-31' });
    const cleared = apply(base, 'SET_MILESTONE_DUE_DATE', { type: 'milestone', id: 'mvp' }, { dueDate: null });
    expect(cleared?.milestones[0]).not.toHaveProperty('dueDate');
    expect(
      apply(base, 'SET_MILESTONE_DUE_DATE', { type: 'milestone', id: 'mvp' }, { dueDate: '2026-02-30' }),
    ).toBeNull();
  });

  it('records a snapshot of the tally, and deletes it', () => {
    const page = { type: 'page', id: 'usm' };
    const payload = { id: 'snap2', at: '2026-10-16T00:00:00.000Z', tally: tallyOf(base) };
    const recorded = apply(base, 'RECORD_SNAPSHOT', page, payload);
    expect(recorded?.snapshots.at(-1)).toEqual(payload);
    expect(apply(recorded!, 'RECORD_SNAPSHOT', page, payload)).toBe(recorded);
    const unknown = { ...payload, tally: [{ statusId: 'nope', stories: 1, points: 0 }] };
    expect(apply(base, 'RECORD_SNAPSHOT', page, unknown)).toBeNull();
    const deleted = apply(recorded!, 'DELETE_SNAPSHOT', { type: 'snapshot', id: 'snap1' }, {});
    expect(deleted?.snapshots.map((snapshot) => snapshot.id)).toEqual(['snap2']);
  });

  it('keeps the recorded tallies when their status or milestone goes away', () => {
    const noDemo = apply(base, 'DELETE_STATUS', { type: 'status', id: 'demo' }, {});
    expect(noDemo?.snapshots[0]?.tally).toEqual([{ milestoneId: 'mvp', statusId: 'idea', stories: 5, points: 15 }]);
    const noMvp = apply(base, 'DELETE_MILESTONE', { type: 'milestone', id: 'mvp' }, {});
    expect(noMvp?.snapshots[0]?.tally).toEqual([
      { statusId: 'idea', stories: 4, points: 12 },
      { statusId: 'demo', stories: 1, points: 3 },
    ]);
  });

  it('describes the new actions', () => {
    expect(
      definition.describe(act('SET_STORY_ESTIMATE', { type: 'story', id: 'e' }, { estimateId: 'M' }), base, base),
    ).toMatchObject({ title: m.setStoryEstimate, targetLabel: 'Story · E', summary: '→ “M”' });
    const snapshot = act(
      'RECORD_SNAPSHOT',
      { type: 'page', id: 'usm' },
      { id: 'snap2', at: '2026-10-16T00:00:00.000Z', tally: [] },
    );
    expect(definition.describe(snapshot, base, base)).toMatchObject({ title: m.recordSnapshot });
    expect(
      definition.describe(act('SET_MEASURE', { type: 'page', id: 'usm' }, { measure: 'weighted' }), base, base),
    ).toMatchObject({ title: m.setMeasure, summary: `“${m.measureName('points')}” → “${m.measureName('weighted')}”` });
  });
});

describe('usm estimates and burndown: navigation and chart', () => {
  it('shows the first milestone with a due date', () => {
    expect(burndownMilestoneOf(base, {})?.id).toBe('mvp');
    expect(burndownMilestoneOf(base, { milestone: 'v1' })?.id).toBe('v1');
  });

  it('keeps only a real milestone in the navigation', () => {
    const nav = resolveUsmNavigation(base, { tab: 'burndown', milestone: 'nope' });
    expect(nav).toMatchObject({ tab: 'burndown' });
    expect(nav).not.toHaveProperty('milestone');
    expect(resolveUsmNavigation(base, { tab: 'burndown', milestone: 'v1' })).toMatchObject({ milestone: 'v1' });
  });

  it('ticks the value axis on round whole numbers above the highest value', () => {
    expect(valueTicks(0)).toEqual([0, 1]);
    expect(valueTicks(1)).toEqual([0, 1]);
    expect(valueTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(valueTicks(24)).toEqual([0, 10, 20, 30]);
    expect(valueTicks(129)).toEqual([0, 50, 100, 150]);
    expect(valueTicks(233)).toEqual([0, 100, 200, 300]);
  });

  it('draws the ideal line from the first point down to 0 at the due date', () => {
    const size = { width: 100, height: 100, inset: { top: 0, right: 0, bottom: 0, left: 0 } };
    const day = 24 * 60 * 60 * 1000;
    const layout = layoutChart(
      [
        { at: 0, value: 10, snapshotId: 's' },
        { at: day, value: 5 },
      ],
      2 * day,
      day,
      size,
    );
    expect(layout.line).toBe('0,0 50,50');
    expect(layout.ideal).toEqual({ x1: 0, y1: 0, x2: 100, y2: 100 });
    expect(layout.nowX).toBe(50);
    expect(layout.dueX).toBe(100);
    expect(layoutChart([{ at: day, value: 5 }], null, day, size).ideal).toBeNull();
  });

  it('ticks the time axis by the finest unit that fits: days, weeks, two weeks, months', () => {
    const at = (month: number, day: number, hour = 0) => new Date(2026, month - 1, day, hour).getTime();
    expect(timeTicks(at(10, 1, 12), at(10, 5, 12), 10)).toEqual({
      unit: 'day',
      ats: [at(10, 2), at(10, 3), at(10, 4), at(10, 5)],
    });
    // 2026-10-05 is a Monday: weeks start there
    const weeks = timeTicks(at(10, 1, 12), at(11, 30, 12), 10);
    expect(weeks.unit).toBe('week');
    expect(weeks.ats).toHaveLength(9);
    expect(weeks.ats[0]).toBe(at(10, 5));
    expect(timeTicks(at(10, 1, 12), at(11, 30, 12), 5)).toEqual({
      unit: 'biweek',
      ats: [at(10, 5), at(10, 19), at(11, 2), at(11, 16), at(11, 30)],
    });
    expect(timeTicks(at(10, 1, 12), at(11, 30, 12), 3)).toEqual({ unit: 'month', ats: [at(11, 1)] });
    const long = timeTicks(at(1, 15), new Date(2028, 0, 15).getTime(), 10);
    expect(long.unit).toBe('quarter');
    expect(long.ats[0]).toBe(at(4, 1));
  });

  it('reads both lines where the pointer is, snapping to a point close by', () => {
    const size = { width: 100, height: 100, inset: { top: 0, right: 0, bottom: 0, left: 0 } };
    const day = 24 * 60 * 60 * 1000;
    // actual 10 → 6 over the first two days; ideal 10 → 0 over four
    const layout = layoutChart(
      [
        { at: 0, value: 10, snapshotId: 's' },
        { at: 2 * day, value: 6 },
      ],
      4 * day,
      2 * day,
      size,
    );
    expect(readoutAt(layout, 25)).toMatchObject({ at: day, actual: 8, ideal: 7.5, dot: null, actualY: 20, idealY: 25 });
    expect(readoutAt(layout, 49)).toMatchObject({ x: 50, at: 2 * day, actual: 6, ideal: 5, dot: { value: 6 } });
    // past the last point there is only the ideal; past the due date, nothing
    expect(readoutAt(layout, 75)).toMatchObject({ actual: null, ideal: 2.5, actualY: null, idealY: 75 });
    expect(readoutAt(layout, 140)).toMatchObject({ x: 100, actual: null, ideal: 0 });
  });
});

describe('usm estimates and burndown: element', () => {
  const settle = async (el: DpkViewUsm): Promise<void> => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  };

  const mount = async (hash: string): Promise<DpkViewUsm> => {
    window.location.hash = hash;
    document.body.innerHTML = `
      <dpk-view-usm storage="memory">
        <script type="application/json">${JSON.stringify(raw)}</script>
      </dpk-view-usm>`;
    const el = document.querySelector('dpk-view-usm') as DpkViewUsm;
    await el.api.ready;
    await settle(el);
    return el;
  };

  beforeEach(() => {
    window.location.hash = '';
    document.body.innerHTML = '';
  });

  it('shows the estimate on the card and picks it in the story panel', async () => {
    const el = await mount('#story=e');
    const card = el.shadowRoot!.querySelector('dpk-internal-usm-story-card[data-story="a"]') as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector('[data-kind="estimate"]')?.textContent?.trim()).toBe('L');
    const panel = el.shadowRoot!.querySelector('[data-testid="usm-story-panel"]')!;
    (panel.querySelector('[data-estimate="M"]') as HTMLButtonElement).click();
    await settle(el);
    expect(el.api.state.stories.find((story) => story.id === 'e')?.estimateId).toBe('M');
  });

  it('picks one measure on top, and shows only the settings that measure takes, kept across the measures', async () => {
    const el = await mount('#tab=burndown');
    const root = el.shadowRoot!;
    const radio = (measure: string) =>
      root.querySelector(`input[name="bd-measure"][value="${measure}"]`) as HTMLInputElement;
    const pick = async (measure: string) => {
      radio(measure).click();
      await settle(el);
    };
    const settings = () => root.querySelector('[data-testid="usm-measure-settings"]') as HTMLDetailsElement | null;
    const shown = () => ({
      estimates: (settings()?.querySelector('[data-testid="usm-estimates"]') ?? null) !== null,
      weights: (settings()?.querySelector('dpk-internal-usm-weight-bar') ?? null) !== null,
    });
    // the map has an estimate scale, so it measures by points: the scale shows, open, and nothing else
    expect(radio('points').checked).toBe(true);
    expect(settings()?.open).toBe(true);
    expect(shown()).toEqual({ estimates: true, weights: false });
    expect(settings()?.querySelector('summary')?.textContent).toContain('S 1 · M 3 · L 5');
    // by stories there is nothing to set
    await pick('stories');
    expect(el.api.state.measure).toBe('stories');
    expect(settings()).toBeNull();
    expect(root.querySelector('.bd-chart--combined .bd-chart-latest')?.textContent).toBe(m.chartLatest(4));
    // weighted, the scale and the weights both
    await pick('weighted');
    expect(shown()).toEqual({ estimates: true, weights: true });
    expect(settings()?.querySelector('summary')?.textContent).toContain('Idea 7 · Demo 2 · Ready 1');
    expect(root.querySelector('.bd-chart--combined .bd-chart-latest')?.textContent).toBe(m.chartLatest(7));
    // picked again and again, the draft keeps the last pick only
    expect(el.api.actions.map((action) => [action.type, action.payload])).toEqual([
      ['SET_MEASURE', { measure: 'weighted' }],
    ]);
    // folded, the settings stay folded while the measure moves between those that have them
    settings()!.open = false;
    await pick('points');
    expect(settings()?.open).toBe(false);
    expect(shown()).toEqual({ estimates: true, weights: false });
    // picked from one without settings, they open to be set
    await pick('stories');
    await pick('points');
    expect(settings()?.open).toBe(true);
  });

  it('splits 10 between the statuses on a bar while the work left is weighted', async () => {
    const el = await mount('#tab=burndown');
    const pick = async (measure: string) => {
      (el.shadowRoot!.querySelector(`input[name="bd-measure"][value="${measure}"]`) as HTMLInputElement).click();
      await settle(el);
    };
    await pick('weighted');
    const bar = () =>
      el.shadowRoot!.querySelector('[data-testid="usm-measure-settings"] dpk-internal-usm-weight-bar') as
        | (HTMLElement & { updateComplete: Promise<boolean> })
        | null;
    let root = bar()!.shadowRoot!;
    const read = async () => {
      await settle(el);
      await bar()!.updateComplete;
      root = bar()!.shadowRoot!;
      return {
        parts: [...root.querySelectorAll('[data-part]')].map((part) => [
          part.getAttribute('data-part'),
          part.querySelector('.wb-value')?.textContent,
        ]),
        lines: [...root.querySelectorAll('[role="slider"]')].map((line) => [
          line.getAttribute('aria-valuemin'),
          line.getAttribute('aria-valuenow'),
          line.getAttribute('aria-valuemax'),
        ]),
      };
    };
    // the last status ends the bar and holds no part
    expect(await read()).toEqual({
      parts: [
        ['idea', '7'],
        ['demo', '2'],
        ['ready', '1'],
      ],
      lines: [
        ['0', '7', '9'],
        ['7', '9', '10'],
      ],
    });
    expect(root.querySelector('[data-end]')?.textContent?.trim()).toBe('Done');
    expect(el.shadowRoot!.querySelector('input[data-role="weight"]')).toBeNull();
    const line = (index: number) => root.querySelectorAll<HTMLElement>('[role="slider"]')[index]!;
    // a key moves a line by one part, taking it from one side and giving it to the other
    line(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect((await read()).parts).toEqual([
      ['idea', '6'],
      ['demo', '3'],
      ['ready', '1'],
    ]);
    line(1).dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect((await read()).parts).toEqual([
      ['idea', '6'],
      ['demo', '4'],
      ['ready', '0'],
    ]);
    expect(el.api.state.statuses.map((status) => status.weight)).toEqual([6, 4, 0, undefined]);
    // a drag snaps the line to the whole part under the pointer and sets the weights once it is let go
    const track = root.querySelector<HTMLElement>('.wb-track')!;
    track.getBoundingClientRect = () => DOMRect.fromRect({ x: 100, y: 0, width: 200, height: 24 });
    const pointer = (target: EventTarget, type: string, clientX: number) =>
      target.dispatchEvent(new MouseEvent(type, { clientX, bubbles: true, composed: true }));
    const before = el.api.actions.length;
    pointer(line(0), 'pointerdown', 220);
    // the line taken hold of keeps the focus, so the arrow keys go on from where it was let go
    expect(root.activeElement).toBe(line(0));
    pointer(document, 'pointermove', 141);
    expect((await read()).parts).toEqual([
      ['idea', '2'],
      ['demo', '8'],
      ['ready', '0'],
    ]);
    expect(el.api.actions).toHaveLength(before);
    pointer(document, 'pointerup', 141);
    await settle(el);
    expect(el.api.state.statuses.map((status) => status.weight)).toEqual([2, 8, 0, undefined]);
    // measured otherwise, the bar goes; the weights and the scale stay for when it comes back
    await pick('stories');
    expect(bar()).toBeNull();
    await pick('weighted');
    expect(el.api.state.statuses.map((status) => status.weight)).toEqual([2, 8, 0, undefined]);
    expect((await read()).parts).toEqual([
      ['idea', '2'],
      ['demo', '8'],
      ['ready', '0'],
    ]);
    expect(el.api.state.estimates).toEqual(base.estimates);
  });

  it('asks for statuses before the done one when there is nothing to weigh', async () => {
    const el = await mount('#tab=burndown');
    el.api.dispatch({ type: 'SET_MEASURE', target: { type: 'page', id: 'usm' }, payload: { measure: 'weighted' } });
    el.api.dispatch({ type: 'SET_DONE_STATUS', target: { type: 'status', id: 'demo' }, payload: {} });
    await settle(el);
    const settings = el.shadowRoot!.querySelector('[data-testid="usm-measure-settings"]')!;
    expect(settings.querySelector('dpk-internal-usm-weight-bar')).toBeNull();
    expect(settings.textContent).toContain(m.weightsNeedStatuses);
  });

  it('keeps the weights off the statuses section of the settings', async () => {
    const el = await mount('');
    el.api.dispatch({ type: 'SET_MEASURE', target: { type: 'page', id: 'usm' }, payload: { measure: 'weighted' } });
    await settle(el);
    el.openSettings('statuses');
    await settle(el);
    const section = el
      .shadowRoot!.querySelector('dpk-internal-usm-settings-section')!
      .shadowRoot!.querySelector('[data-testid="usm-statuses"]')!;
    expect(section.querySelector('dpk-internal-usm-weight-bar')).toBeNull();
  });

  it('draws the combined chart and one per status, and records a snapshot', async () => {
    const el = await mount('#tab=burndown');
    const root = el.shadowRoot!;
    expect(root.querySelector('[data-testid="usm-burndown"]')).not.toBeNull();
    expect(root.querySelectorAll('dpk-internal-usm-burndown-chart[data-chart="combined"]')).toHaveLength(1);
    expect(
      [...root.querySelectorAll('dpk-internal-usm-burndown-chart[data-chart="status"]')].map((chart) =>
        chart.getAttribute('data-status'),
      ),
    ).toEqual(['demo', 'ready', 'done']);
    (root.querySelector('[data-role="record-snapshot"]') as HTMLButtonElement).click();
    await settle(el);
    expect(el.api.state.snapshots).toHaveLength(2);
    expect(el.api.state.snapshots[1]?.tally).toEqual(tallyOf(base));
  });

  it('reads both lines out on the point the keyboard reaches', async () => {
    const el = await mount('#tab=burndown');
    const chart = el.shadowRoot!.querySelector(
      'dpk-internal-usm-burndown-chart[data-chart="combined"]',
    ) as HTMLElement & {
      updateComplete: Promise<boolean>;
    };
    await chart.updateComplete;
    const plot = chart.shadowRoot!.querySelector('.bd-plot') as HTMLElement;
    const readout = () => chart.shadowRoot!.querySelector('[data-testid="usm-chart-readout"]');
    expect(readout()).toBeNull();
    plot.dispatchEvent(new FocusEvent('focus'));
    await chart.updateComplete;
    expect(readout()?.querySelector('.bd-tip-at')?.textContent).toContain(m.chartNow);
    const actual = readout()?.querySelector('[data-line="actual"] b')?.textContent ?? '';
    expect(el.shadowRoot!.querySelector('.bd-chart--combined .bd-chart-latest')?.textContent).toBe(
      m.chartLatest(Number(actual)),
    );
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    await chart.updateComplete;
    expect(readout()?.querySelector('.bd-tip-at')?.textContent).not.toContain(m.chartNow);
    plot.dispatchEvent(new FocusEvent('blur'));
    await chart.updateComplete;
    expect(readout()).toBeNull();
  });

  it('filters the map by estimate, offering only the filters the map has choices for', async () => {
    const el = await mount('#estimate=~none,L');
    const root = el.shadowRoot!;
    const bar = root.querySelector('[data-testid="usm-map-filter"]')!;
    // no labels yet: no label filter
    expect(
      [...bar.querySelectorAll('[data-filter-trigger]')].map((each) => each.getAttribute('data-filter-trigger')),
    ).toEqual(['status', 'estimate']);
    expect(bar.querySelector('[data-filter-trigger="estimate"] .filter-value')?.textContent).toBe('L +1');
    expect(el.api.navigation['estimate']).toBe('L,~none');
    const shown = [...root.querySelectorAll('dpk-internal-usm-story-card')].map((card) =>
      card.getAttribute('data-story'),
    );
    expect(shown).toEqual(expect.arrayContaining(['a', 'e']));
    expect(shown).toHaveLength(2);
  });

  it('sets the due date of the milestone it shows', async () => {
    const el = await mount('#tab=burndown&milestone=v1');
    const input = el.shadowRoot!.querySelector('input[data-role="due-date"]') as HTMLInputElement;
    expect(input.value).toBe('');
    input.value = '2027-01-31';
    input.dispatchEvent(new Event('change'));
    await settle(el);
    expect(el.api.state.milestones[1]?.dueDate).toBe('2027-01-31');
  });
});
