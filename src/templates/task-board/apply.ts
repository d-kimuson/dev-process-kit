import type { DraftAction } from '../../core/types';

import { assertNever, parseTemplateAction } from '../../core/schema';
import { taskBoardActions } from './actions';
import {
  findMember,
  findQuestion,
  findTodo,
  isHumanTodo,
  withAnswer,
  withDecision,
  withTodo,
  type TaskBoardState,
} from './model';

/**
 * Pure reducer for one reader action. `null` means "not applicable to this
 * base": a reply to a question that is gone, an approval of an assumption the
 * question no longer has, a decision on a todo that is no longer a proposal, a
 * status for a todo that is no longer a person's, a new todo assigned to a
 * member who left or whose id the agent has since used. The core keeps those as
 * stale instead of dropping them.
 */
export const applyTaskBoardAction = (state: TaskBoardState, action: DraftAction): TaskBoardState | null => {
  const typed = parseTemplateAction(taskBoardActions, action);
  if (typed === null) return null;
  const id = typed.target.id;
  switch (typed.type) {
    case 'ANSWER_QUESTION': {
      const question = findQuestion(state, id);
      if (question === undefined) return null;
      const answer = typed.payload;
      if (answer.kind === 'clear') return withAnswer(state, id, null);
      if (answer.kind === 'approve') {
        return question.assumption === null ? null : withAnswer(state, id, { kind: 'approve' });
      }
      return withAnswer(state, id, { kind: 'answer', text: answer.text });
    }
    case 'DECIDE_PROPOSAL': {
      if (findTodo(state, id)?.proposed !== true) return null;
      const { decision } = typed.payload;
      return withDecision(state, id, decision === 'clear' ? null : decision);
    }
    case 'SET_TODO_STATUS': {
      const todo = findTodo(state, id);
      if (todo === undefined || !isHumanTodo(state, todo)) return null;
      const { status } = typed.payload;
      return withTodo(state, id, (current) => ({ ...current, status }));
    }
    case 'ADD_TODO': {
      const { payload } = typed;
      if (findTodo(state, payload.id) !== undefined) return null;
      if (payload.assignee !== null && findMember(state, payload.assignee) === undefined) return null;
      return {
        ...state,
        todos: [
          ...state.todos,
          {
            id: payload.id,
            title: payload.title,
            status: 'todo',
            assignee: payload.assignee,
            note: null,
            proposed: false,
            reason: null,
            added: true,
          },
        ],
      };
    }
    case 'DELETE_TODO': {
      if (findTodo(state, id)?.added !== true) return null;
      return { ...state, todos: state.todos.filter((todo) => todo.id !== id) };
    }
    default:
      return assertNever(typed);
  }
};
