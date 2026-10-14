import { html, nothing, type TemplateResult } from 'lit';

import type { PrototypeMessages } from '../messages';

import { iconClose } from '../../../core/icons';
import { renderActionsToggle, type ActionsMenuView } from './actions-menu';
import { renderUiCommentToggle, type UiCommentView } from './ui-comment';

/** What a running demo offers over the app: the screen's actions, commenting on the UI, and the way out. */
export type DemoControls = {
  readonly onExit: () => void;
  readonly uiComment: UiCommentView;
  readonly actions: ActionsMenuView;
};

export const renderDemoControls = (m: PrototypeMessages, controls: DemoControls): TemplateResult => {
  return html`<div class="demo-controls">
    ${controls.actions.groups.length > 0 ? renderActionsToggle(m, controls.actions, 'demo') : nothing}
    ${renderUiCommentToggle(m, controls.uiComment, 'demo')}
    <button class="demo-control demo-exit" type="button" title=${m.exitDemo} @click=${controls.onExit}>
      ${iconClose()} ${m.exitDemo} <kbd>Esc</kbd>
    </button>
  </div>`;
};
