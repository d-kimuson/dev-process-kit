import type { Locale } from '../../core/i18n';
import type { ActionTarget, TemplateDefinition } from '../../core/types';

import { taskBoardActions } from './actions';
import { applyTaskBoardAction } from './apply';
import { taskBoardMessages } from './messages';
import {
  emptyTaskBoardBase,
  findLogEntry,
  findQuestion,
  findTodo,
  hasContextPart,
  isContextPart,
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
    case 'log':
      return findLogEntry(state, target.id) !== undefined;
    case 'context':
      return isContextPart(target.id) && hasContextPart(state, target.id);
    case 'question':
      return findQuestion(state, target.id) !== undefined;
    case 'page':
      return true;
    default:
      return false;
  }
};

/** The task board template, describing its actions in `locale`. */
export const taskBoardDefinitionFor = (locale: Locale): TemplateDefinition<TaskBoardState> => {
  const m = taskBoardMessages(locale);
  return {
    name: 'task-board',
    label: 'Task Context Board',
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
