import type {
  ActionDescription,
  ActionTarget,
  ActionTone,
  CommentTargetOption,
  DraftAction,
  Navigation,
} from '../../core/types';
import type { TaskBoardMessages } from './messages';

import { payloadFor } from '../../core/schema';
import { targetRef } from '../../core/target';
import { taskBoardActions } from './actions';
import {
  CONTEXT_PARTS,
  TODO_STATUSES,
  findLogEntry,
  findMember,
  findQuestion,
  findTodo,
  hasContextPart,
  isAnswered,
  isContextPart,
  isHumanTodo,
  isPlanned,
  type ContextPart,
  type LogEntry,
  type MemberKind,
  type ProposalDecision,
  type Question,
  type TaskBoardState,
  type Todo,
  type TaskStatus,
  type TodoStatus,
} from './model';

/* ----------------------------------------------------------------- labels */

export const taskStatusLabel = (m: TaskBoardMessages, status: TaskStatus): string => {
  switch (status) {
    case 'working':
      return m.statusWorking;
    case 'waiting':
      return m.statusWaiting;
    case 'blocked':
      return m.statusBlocked;
    case 'done':
      return m.statusDone;
  }
};

export const todoStatusLabel = (m: TaskBoardMessages, status: TodoStatus): string => {
  switch (status) {
    case 'todo':
      return m.todoTodo;
    case 'doing':
      return m.todoDoing;
    case 'blocked':
      return m.todoBlocked;
    case 'done':
      return m.todoDone;
  }
};

export const memberKindLabel = (m: TaskBoardMessages, kind: MemberKind): string =>
  kind === 'agent' ? m.kindAgent : m.kindHuman;

export const contextPartTitle = (m: TaskBoardMessages, part: ContextPart): string => {
  switch (part) {
    case 'why':
      return m.contextWhy;
    case 'what':
      return m.contextWhat;
    case 'goals':
      return m.contextGoals;
    case 'nonGoals':
      return m.contextNonGoals;
  }
};

/** How long a log entry's label runs before it is cut short. */
const LOG_LABEL_MAX = 48;

/** A log entry's title, or its body cut short when it has none. */
const logLabel = (entry: LogEntry): string => {
  const label = entry.title ?? entry.body ?? entry.id;
  return label.length <= LOG_LABEL_MAX ? label : `${label.slice(0, LOG_LABEL_MAX - 1)}…`;
};

const assigneeName = (m: TaskBoardMessages, state: TaskBoardState, assignee: string | null): string =>
  assignee === null ? m.unassigned : (findMember(state, assignee)?.name ?? assignee);

/* ------------------------------------------------------------ review rail */

export const taskBoardTitle = (state: TaskBoardState): string =>
  state.title === '' ? 'Task Context Board' : state.title;

/** Never throws: an unknown target falls back to its raw id. */
export const taskBoardTargetLabel = (m: TaskBoardMessages, state: TaskBoardState, target: ActionTarget): string => {
  switch (target.type) {
    case 'todo': {
      const todo = findTodo(state, target.id);
      return `${todo?.proposed === true ? m.proposalGroup : m.todoGroup} · ${todo?.title ?? target.id}`;
    }
    case 'log': {
      const entry = findLogEntry(state, target.id);
      return `${m.logGroup} · ${entry === undefined ? target.id : logLabel(entry)}`;
    }
    case 'context':
      return `${m.contextGroup} · ${isContextPart(target.id) ? contextPartTitle(m, target.id) : target.id}`;
    case 'question': {
      const question = findQuestion(state, target.id);
      return question === undefined ? target.id : `${question.ref} · ${question.title}`;
    }
    case 'page':
      return m.wholeBoard;
    default:
      return target.id;
  }
};

type Summary = {
  readonly title: string;
  readonly tone: ActionTone;
  readonly body?: string;
  /** Overrides the label derived from the target (a new todo has no target of its own). */
  readonly targetLabel?: string;
};

const decisionTitle = (m: TaskBoardMessages, decision: ProposalDecision | 'clear'): Summary => {
  switch (decision) {
    case 'accept':
      return { title: m.accepted, tone: 'update' };
    case 'decline':
      return { title: m.declined, tone: 'update' };
    case 'clear':
      return { title: m.decisionCleared, tone: 'delete' };
  }
};

/** `before` is the pre-draft state: the "from" side of a change. */
const summarize = (m: TaskBoardMessages, before: TaskBoardState, action: DraftAction): Summary => {
  switch (action.type) {
    case 'ANSWER_QUESTION': {
      const payload = payloadFor(taskBoardActions.ANSWER_QUESTION, action);
      if (payload.kind === 'clear') return { title: m.answerCleared, tone: 'delete' };
      if (payload.kind === 'approve') {
        const assumption = findQuestion(before, action.target.id)?.assumption ?? null;
        return { title: m.approved, tone: 'update', ...(assumption === null ? {} : { body: m.quoted(assumption) }) };
      }
      return { title: m.answered, tone: 'update', body: m.quoted(payload.text.slice(0, 120)) };
    }
    case 'DECIDE_PROPOSAL':
      return decisionTitle(m, payloadFor(taskBoardActions.DECIDE_PROPOSAL, action).decision);
    case 'SET_TODO_STATUS': {
      const { status } = payloadFor(taskBoardActions.SET_TODO_STATUS, action);
      const from = findTodo(before, action.target.id)?.status;
      const to = todoStatusLabel(m, status);
      return {
        title: m.statusChanged,
        tone: 'update',
        body: from === undefined ? to : m.change(todoStatusLabel(m, from), to),
      };
    }
    case 'ADD_TODO': {
      const payload = payloadFor(taskBoardActions.ADD_TODO, action);
      return {
        title: m.todoAdded,
        tone: 'create',
        targetLabel: `${m.todoGroup} · ${payload.title}`,
        ...(payload.assignee === null ? {} : { body: `${m.assignee}: ${assigneeName(m, before, payload.assignee)}` }),
      };
    }
    case 'DELETE_TODO':
      return { title: m.todoRemoved, tone: 'delete' };
    default:
      return { title: action.type, tone: 'meta' };
  }
};

export const describeTaskBoardAction = (
  m: TaskBoardMessages,
  action: DraftAction,
  state: TaskBoardState,
  base?: TaskBoardState,
): ActionDescription => {
  let summary: Summary;
  try {
    summary = summarize(m, base ?? state, action);
  } catch {
    summary = { title: action.type, tone: 'meta' };
  }
  return {
    title: summary.title,
    targetLabel: summary.targetLabel ?? taskBoardTargetLabel(m, state, action.target),
    tone: summary.tone,
    ...(summary.body === undefined ? {} : { summary: summary.body }),
  };
};

export const serializeTaskBoardAction = (action: DraftAction): string =>
  `${action.type} ${targetRef(action.target)} ${JSON.stringify(action.payload)}`;

/** Outputs carry a copy button instead: a link or a path is not something to discuss in place. */
export const taskBoardCommentTargets = (
  m: TaskBoardMessages,
  state: TaskBoardState,
): readonly CommentTargetOption[] => [
  ...state.questions.map((question) => ({
    value: `question:${question.id}`,
    label: `${question.ref} · ${question.title}`,
    group: m.questionGroup,
  })),
  ...state.todos.map((todo) => ({
    value: `todo:${todo.id}`,
    label: todo.title,
    group: todo.proposed ? m.proposalGroup : m.todoGroup,
  })),
  ...state.log.map((entry) => ({ value: `log:${entry.id}`, label: logLabel(entry), group: m.logGroup })),
  ...CONTEXT_PARTS.filter((part) => hasContextPart(state, part)).map((part) => ({
    value: `context:${part}`,
    label: contextPartTitle(m, part),
    group: m.contextGroup,
  })),
];

/** The board is one page: nothing to resolve. */
export const resolveTaskBoardNavigation = (_state: TaskBoardState, navigation: Navigation): Navigation => navigation;

/* ------------------------------------------------------------- view data */

/** How many notes are attached to a target, e.g. `todo:write-tests`. */
export type CommentCount = (target: string) => number;

export type ContextPartViewModel = {
  readonly id: ContextPart;
  readonly title: string;
  /** Prose (why, what)… */
  readonly text: string | null;
  /** …or a list (goals, non-goals). */
  readonly items: readonly string[];
  readonly comments: number;
};

export type ContextViewModel = {
  /** Only the parts the agent wrote, in design-doc order. */
  readonly parts: readonly ContextPartViewModel[];
};

export const presentContext = (
  m: TaskBoardMessages,
  state: TaskBoardState,
  comments: CommentCount,
): ContextViewModel => ({
  parts: CONTEXT_PARTS.filter((part) => hasContextPart(state, part)).map((part) => {
    const value = state.context[part];
    return {
      id: part,
      title: contextPartTitle(m, part),
      text: typeof value === 'string' ? value : null,
      items: typeof value === 'string' || value === null ? [] : value,
      comments: comments(`context:${part}`),
    };
  }),
});

/** What the reader has done with a question so far. */
export type QuestionReply = 'none' | 'approve' | 'answer';

export type QuestionViewModel = {
  readonly id: string;
  readonly ref: string;
  readonly title: string;
  readonly description: string | null;
  readonly blocking: boolean;
  /** Without one (a blocking question only) there is nothing to approve: the reader answers. */
  readonly assumption: string | null;
  readonly reply: QuestionReply;
  /** Approved, or answered with more than blanks. */
  readonly resolved: boolean;
  /** The answer being written. */
  readonly draft: string;
  readonly comments: number;
};

export type QuestionsViewModel = {
  /** The agent cannot go on until these are decided: always shown first. */
  readonly blocking: readonly QuestionViewModel[];
  /** The agent goes ahead on its assumption and adjusts if the reader answers otherwise. */
  readonly provisional: readonly QuestionViewModel[];
  readonly resolved: number;
  readonly total: number;
  /** Not replied to yet. */
  readonly open: number;
  /** Blockers not replied to yet: while any is left, the agent is stuck. */
  readonly blockingOpen: number;
};

const presentQuestion = (state: TaskBoardState, question: Question, comments: CommentCount): QuestionViewModel => {
  const answer = state.answers[question.id];
  return {
    id: question.id,
    ref: question.ref,
    title: question.title,
    description: question.description,
    blocking: question.blocking,
    assumption: question.assumption,
    reply: answer?.kind ?? 'none',
    resolved: isAnswered(state, question),
    draft: answer?.kind === 'answer' ? answer.text : '',
    comments: comments(`question:${question.id}`),
  };
};

export const presentQuestions = (state: TaskBoardState, comments: CommentCount): QuestionsViewModel => {
  const questions = state.questions.map((question) => presentQuestion(state, question, comments));
  const resolved = questions.filter((question) => question.resolved).length;
  return {
    blocking: questions.filter((question) => question.blocking),
    provisional: questions.filter((question) => !question.blocking),
    resolved,
    total: questions.length,
    open: questions.length - resolved,
    blockingOpen: questions.filter((question) => question.blocking && !question.resolved).length,
  };
};

export type MemberOption = {
  readonly id: string;
  readonly label: string;
};

/** Where a proposed todo stands: `null` for a todo the agent was asked to do. */
export type ProposalState = 'pending' | ProposalDecision | null;

export type TodoViewModel = {
  readonly id: string;
  readonly title: string;
  readonly note: string | null;
  readonly reason: string | null;
  readonly status: TodoStatus;
  readonly statusLabel: string;
  readonly assignee: string | null;
  readonly assigneeName: string | null;
  readonly assigneeKind: MemberKind | null;
  /** A person has it, so the reader sets its status; the agent reports its own. */
  readonly editable: boolean;
  readonly proposal: ProposalState;
  readonly added: boolean;
  /** The reader changed its status in this draft. */
  readonly changed: boolean;
  readonly comments: number;
};

/** The whole list, or only the todos people have. */
export type TodoFilter = 'all' | 'human';

export type TodoProgress = {
  readonly done: number;
  readonly total: number;
  readonly label: string;
};

export type TodosViewModel = {
  /** What is still open (and what the reader finished in this draft), in the agent's order. */
  readonly todos: readonly TodoViewModel[];
  /** Done before this draft: folded away until the reader opens them. */
  readonly done: readonly TodoViewModel[];
  /** `all` whenever the board names no person to filter by. */
  readonly filter: TodoFilter;
  readonly canFilter: boolean;
  /** How many todos people have, done ones included. */
  readonly humanCount: number;
  /** Over the planned todos: a proposal counts once the reader accepts it. */
  readonly progress: TodoProgress;
  readonly statuses: readonly { readonly value: TodoStatus; readonly label: string }[];
  /** Empty when the board names nobody: then there is nothing to assign to. */
  readonly members: readonly MemberOption[];
};

const presentTodo = (
  m: TaskBoardMessages,
  state: TaskBoardState,
  base: TaskBoardState,
  todo: Todo,
  comments: CommentCount,
): TodoViewModel => {
  const before = findTodo(base, todo.id);
  const member = findMember(state, todo.assignee);
  return {
    id: todo.id,
    title: todo.title,
    note: todo.note,
    reason: todo.reason,
    status: todo.status,
    statusLabel: todoStatusLabel(m, todo.status),
    assignee: todo.assignee,
    assigneeName: member?.name ?? null,
    assigneeKind: member?.kind ?? null,
    editable: isHumanTodo(state, todo),
    proposal: todo.proposed ? (state.decisions[todo.id] ?? 'pending') : null,
    added: todo.added,
    changed: before !== undefined && before.status !== todo.status,
    comments: comments(`todo:${todo.id}`),
  };
};

export const presentTodos = (
  m: TaskBoardMessages,
  state: TaskBoardState,
  base: TaskBoardState,
  comments: CommentCount,
  requested: TodoFilter = 'all',
): TodosViewModel => {
  const planned = state.todos.filter((todo) => isPlanned(state, todo));
  const done = planned.filter((todo) => todo.status === 'done').length;
  const canFilter = state.members.some((member) => member.kind === 'human');
  const filter = canFilter ? requested : 'all';
  const human = (todo: TodoViewModel): boolean => todo.assigneeKind === 'human';
  const todos = state.todos.map((todo) => presentTodo(m, state, base, todo, comments));
  const shown = filter === 'human' ? todos.filter(human) : todos;
  // Folded only when it was done before this draft and still is, so nothing jumps away under the reader.
  const folded = (todo: TodoViewModel): boolean => todo.status === 'done' && findTodo(base, todo.id)?.status === 'done';
  return {
    todos: shown.filter((todo) => !folded(todo)),
    done: shown.filter(folded),
    filter,
    canFilter,
    humanCount: todos.filter(human).length,
    progress: {
      done,
      total: planned.length,
      label: planned.length === 0 ? m.noTodosYet : m.progress(done, planned.length),
    },
    statuses: TODO_STATUSES.map((value) => ({ value, label: todoStatusLabel(m, value) })),
    members: state.members.map((member) => ({
      id: member.id,
      label: m.memberOption(member.name, memberKindLabel(m, member.kind)),
    })),
  };
};

/** A URL opens in a new tab; anything else is a path the reader copies. */
export type OutputLocation = { readonly kind: 'url'; readonly host: string } | { readonly kind: 'path' };

/**
 * A URL has a scheme followed by `//` (`https://`, `file://`). A drive letter
 * (`C:\work`) or a relative path does not, so it stays a path.
 */
export const outputLocation = (href: string): OutputLocation => {
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(href)) return { kind: 'path' };
  try {
    return { kind: 'url', host: new URL(href).host };
  } catch {
    return { kind: 'path' };
  }
};

export type OutputViewModel = {
  readonly id: string;
  /** The label, or the href itself when there is none. */
  readonly title: string;
  /** A label was given, so the href is shown on its own line too. */
  readonly labelled: boolean;
  readonly href: string;
  readonly kind: string | null;
  readonly description: string | null;
  readonly place: OutputLocation;
};

export const presentOutputs = (state: TaskBoardState): readonly OutputViewModel[] =>
  state.outputs.map((output) => ({
    id: output.id,
    title: output.label ?? output.href,
    labelled: output.label !== null,
    href: output.href,
    kind: output.kind,
    description: output.description,
    place: outputLocation(output.href),
  }));

export type LogEntryViewModel = {
  readonly id: string;
  /** `null` when the agent wrote it without naming itself. */
  readonly author: { readonly name: string; readonly kind: MemberKind } | null;
  readonly at: string | null;
  readonly title: string | null;
  readonly body: string | null;
  readonly points: readonly string[];
  /** What names the entry in the review: its title, or its body cut short. */
  readonly label: string;
  readonly latest: boolean;
  readonly comments: number;
};

/** Where the task stands: shown on the newest entry, which is where the reader starts. */
export type TaskStatusViewModel = {
  readonly status: TaskStatus | null;
  readonly label: string | null;
  readonly updatedAt: string | null;
};

export type LogViewModel = {
  /** Newest first: the last exchange is what the reader wants first. */
  readonly entries: readonly LogEntryViewModel[];
  /** `null` when the agent gave neither a status nor an update time. */
  readonly status: TaskStatusViewModel | null;
};

export const presentLog = (m: TaskBoardMessages, state: TaskBoardState, comments: CommentCount): LogViewModel => ({
  entries: state.log
    .map((entry, index) => {
      const member = findMember(state, entry.from);
      return {
        id: entry.id,
        author: member === undefined ? null : { name: member.name, kind: member.kind },
        at: entry.at,
        title: entry.title,
        body: entry.body,
        points: entry.points,
        label: logLabel(entry),
        latest: index === state.log.length - 1,
        comments: comments(`log:${entry.id}`),
      };
    })
    .reverse(),
  status:
    state.status === null && state.updatedAt === null
      ? null
      : {
          status: state.status,
          label: state.status === null ? null : taskStatusLabel(m, state.status),
          updatedAt: state.updatedAt,
        },
});
