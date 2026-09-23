import * as v from 'valibot';

/**
 * Domain model and row layout of the sequence diagram.
 *
 * The `items` tree is recursive, so the tree is validated one level at a time
 * with a strict schema and the recursion is written by hand. The layout is a
 * pure function of the data plus the active filter, which keeps row numbers and
 * Y positions testable without a DOM.
 */

export type MessageStyle = 'request' | 'response' | 'async';
export type FragmentOperator = 'alt' | 'opt' | 'loop' | 'par';

export type SequenceMessage = {
  readonly kind: 'message';
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly title: string;
  readonly style: MessageStyle;
  readonly tags: readonly string[];
  readonly guard: string | null;
  readonly detail: string | null;
  /** Space-separated `artifact-grill-panel` references. */
  readonly questions: string | null;
};

export type SequenceBranch = {
  readonly label: string;
  readonly items: readonly SequenceItem[];
};

export type SequenceFragment = {
  readonly kind: 'fragment';
  readonly id: string;
  readonly operator: FragmentOperator;
  readonly title: string;
  readonly collapsed: boolean;
  readonly branches: readonly SequenceBranch[];
};

export type SequenceItem = SequenceMessage | SequenceFragment;

export type SequenceParticipant = {
  readonly id: string;
  readonly name: string;
  readonly role: string | null;
  readonly symbol: string | null;
  readonly external: boolean;
  readonly description: string | null;
  readonly questions: string | null;
};

export type SequenceDiagramData = {
  readonly participants: readonly SequenceParticipant[];
  readonly items: readonly SequenceItem[];
};

const messageSchema = v.strictObject({
  kind: v.literal('message'),
  id: v.pipe(v.string(), v.minLength(1)),
  from: v.pipe(v.string(), v.minLength(1)),
  to: v.pipe(v.string(), v.minLength(1)),
  title: v.pipe(v.string(), v.minLength(1)),
  style: v.optional(v.picklist(['request', 'response', 'async']), 'request'),
  tags: v.optional(v.array(v.string()), []),
  guard: v.optional(v.string()),
  detail: v.optional(v.string()),
  questions: v.optional(v.string()),
});

/** Nested items stay `unknown` here; `parseItems` recurses into them. */
const branchSchema = v.strictObject({
  label: v.pipe(v.string(), v.minLength(1)),
  items: v.array(v.unknown()),
});

const fragmentSchema = v.strictObject({
  kind: v.literal('fragment'),
  id: v.pipe(v.string(), v.minLength(1)),
  operator: v.picklist(['alt', 'opt', 'loop', 'par']),
  title: v.pipe(v.string(), v.minLength(1)),
  collapsed: v.optional(v.boolean(), false),
  branches: v.pipe(v.array(branchSchema), v.minLength(1)),
});

const itemSchema = v.variant('kind', [messageSchema, fragmentSchema]);

const participantSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  name: v.pipe(v.string(), v.minLength(1)),
  role: v.optional(v.string()),
  symbol: v.optional(v.string()),
  kind: v.optional(v.picklist(['internal', 'external']), 'internal'),
  description: v.optional(v.string()),
  questions: v.optional(v.string()),
});

const diagramSchema = v.strictObject({
  participants: v.pipe(v.array(participantSchema), v.minLength(1)),
  items: v.optional(v.array(v.unknown()), []),
});

export const PARTICIPANT_PITCH = 240;

const claimId = (ids: Set<string>, id: string, label: string): void => {
  if (ids.has(id)) throw new Error(`duplicate ${label} id: ${id}`);
  ids.add(id);
};

const parseItems = (
  entries: readonly unknown[],
  participantIds: ReadonlySet<string>,
  ids: Set<string>,
): readonly SequenceItem[] =>
  entries.map((entry) => {
    const item = v.parse(itemSchema, entry);
    if (item.kind === 'message') {
      claimId(ids, item.id, 'message');
      if (!participantIds.has(item.from)) throw new Error(`unknown sender: ${item.from}`);
      if (!participantIds.has(item.to)) throw new Error(`unknown receiver: ${item.to}`);
      const message: SequenceMessage = {
        kind: 'message',
        id: item.id,
        from: item.from,
        to: item.to,
        title: item.title,
        style: item.style,
        tags: item.tags,
        guard: item.guard ?? null,
        detail: item.detail ?? null,
        questions: item.questions ?? null,
      };
      return message;
    }
    claimId(ids, item.id, 'fragment');
    const fragment: SequenceFragment = {
      kind: 'fragment',
      id: item.id,
      operator: item.operator,
      title: item.title,
      collapsed: item.collapsed,
      branches: item.branches.map((branch) => ({
        label: branch.label,
        items: parseItems(branch.items, participantIds, ids),
      })),
    };
    return fragment;
  });

export const parseSequenceData = (input: unknown): SequenceDiagramData => {
  const parsed = v.parse(diagramSchema, input);
  const participantIds = new Set<string>();
  for (const participant of parsed.participants) claimId(participantIds, participant.id, 'participant');
  return {
    participants: parsed.participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      role: participant.role ?? null,
      symbol: participant.symbol ?? null,
      external: participant.kind === 'external',
      description: participant.description ?? null,
      questions: participant.questions ?? null,
    })),
    items: parseItems(parsed.items, participantIds, new Set()),
  };
};

export const emptySequenceData = (): SequenceDiagramData => ({ participants: [], items: [] });

const collectMessages = (items: readonly SequenceItem[], into: SequenceMessage[]): void => {
  for (const item of items) {
    if (item.kind === 'message') into.push(item);
    else for (const branch of item.branches) collectMessages(branch.items, into);
  }
};

export const flattenMessages = (items: readonly SequenceItem[]): readonly SequenceMessage[] => {
  const messages: SequenceMessage[] = [];
  collectMessages(items, messages);
  return messages;
};

/** Stable numbering: the number follows declaration order, not the filter. */
export const messageNumbers = (data: SequenceDiagramData): ReadonlyMap<string, string> =>
  new Map(flattenMessages(data.items).map((message, index) => [message.id, String(index + 1).padStart(2, '0')]));

export const countMessages = (items: readonly SequenceItem[]): number => flattenMessages(items).length;

/** Drops filtered messages, and the fragments that lose every message. */
export const pruneItems = (
  items: readonly SequenceItem[],
  matches: (message: SequenceMessage) => boolean,
): readonly SequenceItem[] => {
  const kept: SequenceItem[] = [];
  for (const item of items) {
    if (item.kind === 'message') {
      if (matches(item)) kept.push(item);
      continue;
    }
    const branches = item.branches
      .map((branch) => ({ label: branch.label, items: pruneItems(branch.items, matches) }))
      .filter((branch) => branch.items.length > 0);
    if (branches.length > 0) kept.push({ ...item, branches });
  }
  return kept;
};

/* ------------------------------------------------------------------- layout */

export type MessageRow = {
  readonly message: SequenceMessage;
  readonly y: number;
  readonly depth: number;
};

export type FrameBox = {
  readonly fragment: SequenceFragment;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly count: number;
};

export type BranchRow = { readonly label: string; readonly x: number; readonly y: number };
export type DividerRow = { readonly x: number; readonly y: number; readonly width: number };
export type FoldRow = { readonly fragment: SequenceFragment; readonly x: number; readonly y: number };

export type SequenceLayout = {
  readonly width: number;
  readonly height: number;
  readonly participants: readonly SequenceParticipant[];
  readonly rows: readonly MessageRow[];
  readonly frames: readonly FrameBox[];
  readonly branches: readonly BranchRow[];
  readonly dividers: readonly DividerRow[];
  readonly folds: readonly FoldRow[];
  readonly x: ReadonlyMap<string, number>;
};

const ROW_HEIGHT = 64;
const SELF_ROW_HEIGHT = 86;
const FRAME_HEADER = 31;
const BRANCH_ROW = 32;
const FOLD_ROW = 40;

/** Rows, frames and lifeline positions for the currently visible messages. */
export const layoutSequence = (
  data: SequenceDiagramData,
  matches: (message: SequenceMessage) => boolean,
): SequenceLayout => {
  const items = pruneItems(data.items, matches);
  const used = new Set<string>();
  for (const message of flattenMessages(items)) {
    used.add(message.from);
    used.add(message.to);
  }
  const participants = data.participants.filter((participant) => used.has(participant.id));
  const x = new Map(participants.map((participant, index) => [participant.id, 120 + index * PARTICIPANT_PITCH]));
  const width = Math.max(360, participants.length * PARTICIPANT_PITCH);
  const rows: MessageRow[] = [];
  const frames: FrameBox[] = [];
  const branches: BranchRow[] = [];
  const dividers: DividerRow[] = [];
  const folds: FoldRow[] = [];
  let y = 25;

  const walk = (entries: readonly SequenceItem[], depth: number): void => {
    for (const entry of entries) {
      if (entry.kind === 'message') {
        rows.push({ message: entry, y: y + 29, depth });
        y += entry.from === entry.to ? SELF_ROW_HEIGHT : ROW_HEIGHT;
        continue;
      }
      const frameX = 22 + depth * 13;
      const frameY = y;
      const frameWidth = width - 44 - depth * 26;
      y += FRAME_HEADER;
      if (entry.collapsed) {
        folds.push({ fragment: entry, x: frameX, y: y + 6 });
        y += FOLD_ROW;
      } else {
        entry.branches.forEach((branch, index) => {
          if (index > 0) {
            dividers.push({ x: frameX, y, width: frameWidth });
            y += 8;
          }
          branches.push({ label: branch.label, x: frameX + 12, y });
          y += BRANCH_ROW;
          walk(branch.items, depth + 1);
          y += 8;
        });
      }
      frames.push({
        fragment: entry,
        x: frameX,
        y: frameY,
        width: frameWidth,
        height: y - frameY,
        count: countMessages([entry]),
      });
      y += 14;
    }
  };
  walk(items, 0);
  return { width, height: y + 24, participants, rows, frames, branches, dividers, folds, x };
};
