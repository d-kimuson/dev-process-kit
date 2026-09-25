import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

/**
 * Meaning model of the task board: where one collaborative task stands.
 *
 * The agent writes the base data — the task and why it is done (a short design
 * doc), its todos (with the ones it proposes on its own), what it has
 * produced, the conversation so far and what it needs to ask. The reader's side is draft actions: replies to questions, decisions on
 * proposals, and changes to the todo list. Replies and decisions therefore
 * never live in the base JSON.
 */

/** Where the task as a whole stands, from the agent's point of view. */
export const TASK_STATUSES = ['working', 'waiting', 'blocked', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TODO_STATUSES = ['todo', 'doing', 'blocked', 'done'] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

export const MEMBER_KINDS = ['agent', 'human'] as const;
export type MemberKind = (typeof MEMBER_KINDS)[number];

export const PROPOSAL_DECISIONS = ['accept', 'decline'] as const;
export type ProposalDecision = (typeof PROPOSAL_DECISIONS)[number];

export type Member = {
  readonly id: string;
  readonly name: string;
  readonly kind: MemberKind;
};

export type Todo = {
  readonly id: string;
  readonly title: string;
  readonly status: TodoStatus;
  /** A member id, or `null` for nobody yet. */
  readonly assignee: string | null;
  readonly note: string | null;
  /**
   * The agent proposes it on its own: not asked for, but it thinks it should be
   * done. It stays a proposal until the reader accepts it.
   */
  readonly proposed: boolean;
  /** Why the agent thinks it should be done. */
  readonly reason: string | null;
  /** Added by the reader in this draft, not by the agent. */
  readonly added: boolean;
};

export type Output = {
  readonly id: string;
  /** Display name. Without one the board shows `href` itself. */
  readonly label: string | null;
  /** A URL, or a file path the reader copies. */
  readonly href: string;
  /** A short tag such as `PR` or `Doc`. */
  readonly kind: string | null;
  readonly description: string | null;
};

/**
 * What the task is about, design-doc style: what anyone — the agent coming back
 * to it, or the person — reads to recall what is being done and why.
 */
export type TaskContext = {
  readonly why: string | null;
  readonly what: string | null;
  /** What counts as done. */
  readonly goals: readonly string[];
  /** What is deliberately left out. */
  readonly nonGoals: readonly string[];
};

export const CONTEXT_PARTS = ['why', 'what', 'goals', 'nonGoals'] as const;
export type ContextPart = (typeof CONTEXT_PARTS)[number];

/**
 * One exchange between the person and the agent: what was asked, agreed or
 * reported, not every step of the work (the todos carry that).
 */
export type LogEntry = {
  readonly id: string;
  /** A member id, or `null` for the agent. */
  readonly from: string | null;
  /** When it happened, as the agent wrote it (`2026-09-25 14:10`). */
  readonly at: string | null;
  readonly title: string | null;
  readonly body: string | null;
  readonly points: readonly string[];
};

export type Question = {
  readonly id: string;
  /** Display reference (`Q1`). Defaults to the 1-based position. */
  readonly ref: string;
  readonly title: string;
  readonly description: string | null;
  /**
   * The agent cannot go on until the reader decides. A question that does not
   * block is asked with an assumption the agent works on in the meantime.
   */
  readonly blocking: boolean;
  /**
   * What the agent assumes until it hears otherwise (for a blocking question,
   * what it recommends). Required unless the question blocks.
   */
  readonly assumption: string | null;
};

/** The reader either approves the assumption or answers with what they expect instead. */
export type Answer = { readonly kind: 'approve' } | { readonly kind: 'answer'; readonly text: string };

export type TaskBoardState = {
  readonly title: string;
  readonly status: TaskStatus | null;
  readonly updatedAt: string | null;
  readonly context: TaskContext;
  readonly members: readonly Member[];
  readonly todos: readonly Todo[];
  readonly outputs: readonly Output[];
  /** In the order it happened, oldest first. */
  readonly log: readonly LogEntry[];
  readonly questions: readonly Question[];
  /** Keyed by question id. An unanswered question has no entry. */
  readonly answers: Readonly<Record<string, Answer>>;
  /** Keyed by the id of a proposed todo. An undecided proposal has no entry. */
  readonly decisions: Readonly<Record<string, ProposalDecision>>;
};

const text = v.pipe(v.string(), v.minLength(1));

const memberSchema = v.strictObject({
  id: entityIdSchema,
  name: text,
  kind: v.optional(v.picklist(MEMBER_KINDS), 'agent'),
});

const todoSchema = v.strictObject({
  id: entityIdSchema,
  title: text,
  status: v.optional(v.picklist(TODO_STATUSES), 'todo'),
  assignee: v.optional(entityIdSchema),
  note: v.optional(v.string()),
  proposed: v.optional(v.boolean(), false),
  reason: v.optional(v.string()),
});

const outputSchema = v.strictObject({
  id: entityIdSchema,
  label: v.optional(v.string()),
  href: text,
  kind: v.optional(v.string()),
  description: v.optional(v.string()),
});

const contextSchema = v.strictObject({
  why: v.optional(v.string()),
  what: v.optional(v.string()),
  goals: v.optional(v.array(v.string()), []),
  nonGoals: v.optional(v.array(v.string()), []),
});

const logEntrySchema = v.strictObject({
  id: entityIdSchema,
  from: v.optional(entityIdSchema),
  at: v.optional(v.string()),
  title: v.optional(v.string()),
  body: v.optional(v.string()),
  points: v.optional(v.array(v.string()), []),
});

const questionSchema = v.strictObject({
  id: entityIdSchema,
  ref: v.optional(text),
  title: text,
  description: v.optional(v.string()),
  blocking: v.optional(v.boolean(), false),
  assumption: v.optional(v.string()),
});

export const taskBoardBaseSchema = v.strictObject({
  title: v.optional(v.string(), ''),
  status: v.optional(v.picklist(TASK_STATUSES)),
  updatedAt: v.optional(v.string()),
  context: v.optional(contextSchema, {}),
  members: v.optional(v.array(memberSchema), []),
  todos: v.optional(v.array(todoSchema), []),
  outputs: v.optional(v.array(outputSchema), []),
  log: v.optional(v.array(logEntrySchema), []),
  questions: v.optional(v.array(questionSchema), []),
});

const assertUnique = (kind: string, ids: readonly string[]): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`duplicate ${kind} id: ${id}`);
    seen.add(id);
  }
};

/** An empty string reads as "not given", so the board never renders a blank line. */
const present = (value: string | undefined): string | null =>
  value === undefined || value.trim() === '' ? null : value;

const presentItems = (values: readonly string[]): readonly string[] => values.filter((value) => value.trim() !== '');

export const parseTaskBoardBase = (input: unknown): TaskBoardState => {
  const parsed = v.parse(taskBoardBaseSchema, input);
  assertUnique(
    'member',
    parsed.members.map((member) => member.id),
  );
  assertUnique(
    'todo',
    parsed.todos.map((todo) => todo.id),
  );
  assertUnique(
    'output',
    parsed.outputs.map((output) => output.id),
  );
  assertUnique(
    'log',
    parsed.log.map((entry) => entry.id),
  );
  assertUnique(
    'question',
    parsed.questions.map((question) => question.id),
  );
  const memberIds = new Set(parsed.members.map((member) => member.id));
  for (const todo of parsed.todos) {
    if (todo.assignee !== undefined && !memberIds.has(todo.assignee)) {
      throw new Error(`todo ${todo.id} is assigned to ${todo.assignee}, which is not in members`);
    }
  }
  for (const entry of parsed.log) {
    if (entry.from !== undefined && !memberIds.has(entry.from)) {
      throw new Error(`log entry ${entry.id} is from ${entry.from}, which is not in members`);
    }
    if (present(entry.title) === null && present(entry.body) === null) {
      throw new Error(`log entry ${entry.id} needs a title or a body`);
    }
  }
  for (const question of parsed.questions) {
    if (!question.blocking && present(question.assumption) === null) {
      throw new Error(`question ${question.id} does not block, so it needs the assumption the agent works on`);
    }
  }
  return {
    title: parsed.title,
    status: parsed.status ?? null,
    updatedAt: present(parsed.updatedAt),
    context: {
      why: present(parsed.context.why),
      what: present(parsed.context.what),
      goals: presentItems(parsed.context.goals),
      nonGoals: presentItems(parsed.context.nonGoals),
    },
    members: parsed.members,
    todos: parsed.todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      status: todo.status,
      assignee: todo.assignee ?? null,
      note: present(todo.note),
      proposed: todo.proposed,
      reason: present(todo.reason),
      added: false,
    })),
    outputs: parsed.outputs.map((output) => ({
      id: output.id,
      label: present(output.label),
      href: output.href,
      kind: present(output.kind),
      description: present(output.description),
    })),
    log: parsed.log.map((entry) => ({
      id: entry.id,
      from: entry.from ?? null,
      at: present(entry.at),
      title: present(entry.title),
      body: present(entry.body),
      points: presentItems(entry.points),
    })),
    questions: parsed.questions.map((question, index) => ({
      id: question.id,
      ref: question.ref ?? `Q${index + 1}`,
      title: question.title,
      description: present(question.description),
      blocking: question.blocking,
      assumption: present(question.assumption),
    })),
    answers: {},
    decisions: {},
  };
};

export const emptyTaskBoardBase = (): TaskBoardState => ({
  title: '',
  status: null,
  updatedAt: null,
  context: { why: null, what: null, goals: [], nonGoals: [] },
  members: [],
  todos: [],
  outputs: [],
  log: [],
  questions: [],
  answers: {},
  decisions: {},
});

/* ---------------------------------------------------------------- lookups */

export const findMember = (state: TaskBoardState, id: string | null): Member | undefined =>
  id === null ? undefined : state.members.find((member) => member.id === id);

export const findTodo = (state: TaskBoardState, id: string): Todo | undefined =>
  state.todos.find((todo) => todo.id === id);

export const findLogEntry = (state: TaskBoardState, id: string): LogEntry | undefined =>
  state.log.find((entry) => entry.id === id);

export const isContextPart = (id: string): id is ContextPart => (CONTEXT_PARTS as readonly string[]).includes(id);

/** The agent wrote this part of the design doc. */
export const hasContextPart = (state: TaskBoardState, part: ContextPart): boolean => {
  const value = state.context[part];
  return typeof value === 'string' || (value !== null && value.length > 0);
};

export const findQuestion = (state: TaskBoardState, id: string): Question | undefined =>
  state.questions.find((question) => question.id === id);

/**
 * The reader has replied: approved the assumption, or written what they expect
 * instead. A blank answer is still being written.
 */
export const isAnswered = (state: TaskBoardState, question: Question): boolean => {
  const answer = state.answers[question.id];
  if (answer === undefined) return false;
  return answer.kind === 'approve' || answer.text.trim() !== '';
};

/** Part of the plan: the agent's own todo, or a proposal the reader accepted. */
export const isPlanned = (state: TaskBoardState, todo: Todo): boolean =>
  !todo.proposed || state.decisions[todo.id] === 'accept';

/**
 * A planned todo a person has: the only kind whose status the reader sets. The
 * agent reports its own progress by rewriting the board.
 */
export const isHumanTodo = (state: TaskBoardState, todo: Todo): boolean =>
  isPlanned(state, todo) && findMember(state, todo.assignee)?.kind === 'human';

/* ------------------------------------------------------------ transitions */

const withEntry = <T>(record: Readonly<Record<string, T>>, key: string, value: T | null): Record<string, T> => {
  const next = { ...record };
  if (value === null) delete next[key];
  else next[key] = value;
  return next;
};

/** `null` clears the answer. */
export const withAnswer = (state: TaskBoardState, questionId: string, answer: Answer | null): TaskBoardState => ({
  ...state,
  answers: withEntry(state.answers, questionId, answer),
});

/** `null` clears the decision. */
export const withDecision = (
  state: TaskBoardState,
  todoId: string,
  decision: ProposalDecision | null,
): TaskBoardState => ({ ...state, decisions: withEntry(state.decisions, todoId, decision) });

export const withTodo = (state: TaskBoardState, todoId: string, change: (todo: Todo) => Todo): TaskBoardState => ({
  ...state,
  todos: state.todos.map((todo) => (todo.id === todoId ? change(todo) : todo)),
});
