import * as v from 'valibot';

import { grillMarkEntry, questionRefsSchema } from '../../core/grill';
import { entityIdSchema } from '../../core/schema';

/**
 * Meaning model of the task board: where a body of work shared by an agent and
 * a person stands.
 *
 * The agent writes the base data — the design docs, the todos each doc groups
 * (with the ones it proposes on its own), what it has produced and what it
 * needs to ask. A design doc is the unit of intent and a todo is one step
 * under it, so one doc can carry many todos. The reader's side is draft
 * actions: replies to questions, decisions on proposals, and changes to the
 * todo list. Replies and decisions therefore never live in the base JSON.
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
  /** The design doc this todo belongs to, or `null` when it stands on its own. */
  readonly design: string | null;
  /**
   * The agent proposes it on its own: not asked for, but it thinks it should be
   * done. It stays a proposal until the reader accepts it.
   */
  readonly proposed: boolean;
  /** Why the agent thinks it should be done. */
  readonly reason: string | null;
  /** Added by the reader in this draft, not by the agent. */
  readonly added: boolean;
  /** The page's questions (grill) this is about, space-separated refs (`Q1 Q4`): its Q badges. */
  readonly questions?: string;
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
  /** The page's questions (grill) this is about, space-separated refs (`Q1 Q4`): its Q badges. */
  readonly questions?: string;
};

/**
 * A design doc: the intent behind a group of todos and the place to explain
 * what prose does badly. It is written in Markdown and can be as long as the
 * subject needs; todos point at it with their `design` id.
 */
export type DesignDoc = {
  readonly id: string;
  readonly title: string;
  /** The doc itself, in Markdown. */
  readonly body: string | null;
  /** The page's questions (grill) this is about, space-separated refs (`Q1 Q4`): its Q badges. */
  readonly questions?: string;
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
  /** The design docs, in the agent's order. Todos point at them by id. */
  readonly designs: readonly DesignDoc[];
  readonly members: readonly Member[];
  readonly todos: readonly Todo[];
  readonly outputs: readonly Output[];
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
  design: v.optional(entityIdSchema),
  proposed: v.optional(v.boolean(), false),
  reason: v.optional(v.string()),
  questions: questionRefsSchema,
});

const outputSchema = v.strictObject({
  id: entityIdSchema,
  label: v.optional(v.string()),
  href: text,
  kind: v.optional(v.string()),
  description: v.optional(v.string()),
  questions: questionRefsSchema,
});

const designSchema = v.strictObject({
  id: entityIdSchema,
  title: text,
  body: v.optional(v.string()),
  questions: questionRefsSchema,
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
  designs: v.optional(v.array(designSchema), []),
  members: v.optional(v.array(memberSchema), []),
  todos: v.optional(v.array(todoSchema), []),
  outputs: v.optional(v.array(outputSchema), []),
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

export const parseTaskBoardBase = (input: unknown): TaskBoardState => {
  const parsed = v.parse(taskBoardBaseSchema, input);
  assertUnique(
    'member',
    parsed.members.map((member) => member.id),
  );
  assertUnique(
    'design',
    parsed.designs.map((design) => design.id),
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
    'question',
    parsed.questions.map((question) => question.id),
  );
  const memberIds = new Set(parsed.members.map((member) => member.id));
  for (const todo of parsed.todos) {
    if (todo.assignee !== undefined && !memberIds.has(todo.assignee)) {
      throw new Error(`todo ${todo.id} is assigned to ${todo.assignee}, which is not in members`);
    }
  }
  const designIds = new Set(parsed.designs.map((design) => design.id));
  for (const todo of parsed.todos) {
    if (todo.design !== undefined && !designIds.has(todo.design)) {
      throw new Error(`todo ${todo.id} belongs to ${todo.design}, which is not in designs`);
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
    designs: parsed.designs.map((design) => ({
      id: design.id,
      title: design.title,
      body: present(design.body),
      ...grillMarkEntry(design.questions),
    })),
    members: parsed.members,
    todos: parsed.todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      status: todo.status,
      assignee: todo.assignee ?? null,
      note: present(todo.note),
      design: todo.design ?? null,
      proposed: todo.proposed,
      reason: present(todo.reason),
      added: false,
      ...grillMarkEntry(todo.questions),
    })),
    outputs: parsed.outputs.map((output) => ({
      id: output.id,
      label: present(output.label),
      href: output.href,
      kind: present(output.kind),
      description: present(output.description),
      ...grillMarkEntry(output.questions),
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
  designs: [],
  members: [],
  todos: [],
  outputs: [],
  questions: [],
  answers: {},
  decisions: {},
});

/* ---------------------------------------------------------------- lookups */

export const findMember = (state: TaskBoardState, id: string | null): Member | undefined =>
  id === null ? undefined : state.members.find((member) => member.id === id);

export const findTodo = (state: TaskBoardState, id: string): Todo | undefined =>
  state.todos.find((todo) => todo.id === id);

export const findDesign = (state: TaskBoardState, id: string): DesignDoc | undefined =>
  state.designs.find((design) => design.id === id);

/** The todos a design doc groups, in the agent's order. */
export const todosOfDesign = (state: TaskBoardState, designId: string): readonly Todo[] =>
  state.todos.filter((todo) => todo.design === designId);

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
