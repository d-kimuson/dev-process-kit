import type { Locale } from '../../core/i18n';
import type { ActionTarget, ViewDefinition } from '../../core/types';

import { taskBoardActions } from './actions';
import { applyTaskBoardAction } from './apply';
import { taskBoardMessages } from './messages';
import {
  emptyTaskBoardBase,
  findDesign,
  findQuestion,
  findTodo,
  parseTaskBoardBase,
  type TaskBoardState,
} from './model';
import {
  describeTaskBoardAction,
  resolveTaskBoardNavigation,
  serializeTaskBoardAction,
  taskBoardCommentTargets,
  taskBoardTitle,
} from './present';

/** Outputs take no notes: they carry a copy button instead. */
export const taskBoardHasTarget = (state: TaskBoardState, target: ActionTarget): boolean => {
  switch (target.type) {
    case 'todo':
      return findTodo(state, target.id) !== undefined;
    case 'design':
      return findDesign(state, target.id) !== undefined;
    case 'question':
      return findQuestion(state, target.id) !== undefined;
    case 'page':
      return true;
    default:
      return false;
  }
};

/** The task board template, describing its actions in `locale`. */
export const taskBoardDefinitionFor = (locale: Locale): ViewDefinition<TaskBoardState> => {
  const m = taskBoardMessages(locale);
  return {
    kind: 'view',
    name: 'task-board',
    label: 'Task Context Board',
    // Holds the agent's own work breakdown; empty, there is nothing for a reader to add to.
    addable: false,
    parseBase: parseTaskBoardBase,
    emptyBase: emptyTaskBoardBase,
    actions: taskBoardActions,
    apply: applyTaskBoardAction,
    hasTarget: taskBoardHasTarget,
    describe: (action, state, base) => describeTaskBoardAction(m, action, state, base),
    serialize: serializeTaskBoardAction,
    resolveNavigation: resolveTaskBoardNavigation,
    commentTargets: (state) => taskBoardCommentTargets(m, state),
    title: taskBoardTitle,
  };
};
