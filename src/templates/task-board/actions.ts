import * as v from 'valibot';

import type { ActionInput } from '../../core/types';

import {
  defineAction,
  entityDedupeKey,
  entityIdSchema,
  type ActionSpecs,
  type TemplateAction,
} from '../../core/schema';
import { TODO_STATUSES, type Answer, type ProposalDecision, type TodoStatus } from './model';

/**
 * What the reader sends back to the agent. A reply and a decision are one
 * action per question / proposed todo (last write wins); the todo list takes
 * the status of a todo a person has, and todos the reader asks the agent to
 * take on. The agent's own statuses and who has which todo stay the agent's.
 */
export const taskBoardActions = {
  ANSWER_QUESTION: defineAction(
    'ANSWER_QUESTION',
    'question',
    v.variant('kind', [
      v.strictObject({ kind: v.literal('approve') }),
      v.strictObject({ kind: v.literal('answer'), text: v.string() }),
      v.strictObject({ kind: v.literal('clear') }),
    ]),
  ),
  /** Only on a todo the agent proposed: accepting it makes it part of the plan. */
  DECIDE_PROPOSAL: defineAction(
    'DECIDE_PROPOSAL',
    'todo',
    v.strictObject({ decision: v.picklist(['accept', 'decline', 'clear']) }),
  ),
  /** Only on a todo assigned to a person: the agent reports its own progress. */
  SET_TODO_STATUS: defineAction('SET_TODO_STATUS', 'todo', v.strictObject({ status: v.picklist(TODO_STATUSES) })),
  ADD_TODO: defineAction(
    'ADD_TODO',
    'page',
    v.strictObject({
      id: entityIdSchema,
      title: v.pipe(v.string(), v.trim(), v.minLength(1)),
      assignee: v.nullable(entityIdSchema),
    }),
    { dedupeKey: entityDedupeKey },
  ),
  /** Only a todo this draft added: the agent's own todos are the agent's to drop. */
  DELETE_TODO: defineAction('DELETE_TODO', 'todo', v.strictObject({})),
} satisfies ActionSpecs;

export type TaskBoardAction = TemplateAction<typeof taskBoardActions>;

/** The page-wide target: `page:task-board`. */
export const TASK_BOARD_PAGE = { type: 'page', id: 'task-board' } as const;

/** Approve the assumption, answer with something else, or `clear` to take the reply back. */
export type AnswerInput = Answer | { readonly kind: 'clear' };

export const answerQuestion = (questionId: string, answer: AnswerInput): ActionInput => ({
  type: 'ANSWER_QUESTION',
  target: { type: 'question', id: questionId },
  payload: answer,
});

export const decideProposal = (todoId: string, decision: ProposalDecision | 'clear'): ActionInput => ({
  type: 'DECIDE_PROPOSAL',
  target: { type: 'todo', id: todoId },
  payload: { decision },
});

export const setTodoStatus = (todoId: string, status: TodoStatus): ActionInput => ({
  type: 'SET_TODO_STATUS',
  target: { type: 'todo', id: todoId },
  payload: { status },
});

export const addTodo = (id: string, title: string, assignee: string | null): ActionInput => ({
  type: 'ADD_TODO',
  target: TASK_BOARD_PAGE,
  payload: { id, title, assignee },
});

export const deleteTodo = (todoId: string): ActionInput => ({
  type: 'DELETE_TODO',
  target: { type: 'todo', id: todoId },
  payload: {},
});
