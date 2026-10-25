import { RuleTester } from 'oxlint/plugins-dev';
import { describe, it } from 'vitest';

import {
  colocatedTests,
  coreContentBoundaries,
  discardOnCancel,
  elementNaming,
  entrypointImports,
  libBoundaries,
  localizedText,
  noSideStripe,
  pureLayerBoundaries,
  contentIsolation,
} from './conventions.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } });

const CORE = '/project/src/core';
const LIB = '/project/src/lib';
const USM = '/project/src/views/usm';
const PROTOTYPE = '/project/src/views/prototype';

ruleTester.run('core-content-boundaries', coreContentBoundaries, {
  valid: [
    {
      name: 'core may import core',
      code: "import { derive } from './derive';",
      filename: `${CORE}/controller.ts`,
    },
    {
      name: 'core may import a package',
      code: "import { z } from 'zod';",
      filename: `${CORE}/schema.ts`,
    },
    {
      name: 'views may import core',
      code: "import { parseTemplateAction } from '../../core/schema';",
      filename: `${USM}/apply.ts`,
    },
  ],
  invalid: [
    {
      name: 'core must not import a view',
      code: "import type { UsmState } from '../views/usm/model';",
      filename: `${CORE}/controller.ts`,
      errors: [{ message: /Core must not import a view, a board or a component/ }],
    },
    {
      name: 'core must not import a component',
      code: "import { DpkCommentPanel } from '../components/comment-panel';",
      filename: `${CORE}/element.ts`,
      errors: [{ message: /Core must not import a view, a board or a component/ }],
    },
    {
      name: 'core must not dynamically import a view',
      code: "export const load = () => import('../views/usm/model');",
      filename: `${CORE}/controller.ts`,
      errors: [{ message: /Core must not import a view/ }],
    },
  ],
});

ruleTester.run('lib-boundaries', libBoundaries, {
  valid: [
    {
      name: 'lib may import lib',
      code: "import { placeWithin } from './drag';",
      filename: `${LIB}/dom/popover.ts`,
    },
    {
      name: 'lib may import a package',
      code: "import { LitElement } from 'lit';",
      filename: `${LIB}/dom/drag.ts`,
    },
    {
      name: 'core may import lib',
      code: "import { DragController } from '../../lib/dom/drag';",
      filename: `${CORE}/element.ts`,
    },
  ],
  invalid: [
    {
      name: 'lib must not import core',
      code: "import { derive } from '../../core/derive';",
      filename: `${LIB}/dom/drag.ts`,
      errors: [{ message: /lib must stay dependency-free/ }],
    },
    {
      name: 'lib must not import a component',
      code: "import { DpkCommentPanel } from '../../components/comment-panel';",
      filename: `${LIB}/dom/events.ts`,
      errors: [{ message: /lib must stay dependency-free/ }],
    },
    {
      name: 'lib must not import a template',
      code: "import { usmDefinition } from '../../views/usm/definition';",
      filename: `${LIB}/dom/events.ts`,
      errors: [{ message: /lib must stay dependency-free/ }],
    },
  ],
});

ruleTester.run('content-isolation', contentIsolation, {
  valid: [
    {
      name: 'a view may import itself',
      code: "import { findStep } from './model';",
      filename: `${USM}/apply.ts`,
    },
    {
      name: 'a view may import core',
      code: "import { defineAction } from '../../core/schema';",
      filename: `${USM}/actions.ts`,
    },
  ],
  invalid: [
    {
      name: 'a view must not import another view',
      code: "import { prototypeDefinition } from '../prototype/definition';",
      filename: `${USM}/definition.ts`,
      errors: [{ message: /must not import view 'prototype'/ }],
    },
  ],
});

ruleTester.run('pure-layer-boundaries', pureLayerBoundaries, {
  valid: [
    {
      name: 'pure modules may use local variables named like globals',
      code: 'const location = findStep(state, id);\nexport const ref = location.id;',
      filename: `${PROTOTYPE}/model.ts`,
    },
    {
      name: 'pure modules may destructure a field named like a global',
      code: 'export const pick = ({ location }: { location: string }) => ({ location });',
      filename: `${PROTOTYPE}/model.ts`,
    },
    {
      name: 'pure modules may import zod',
      code: "import { z } from 'zod';\nexport const schema = z.object({});",
      filename: `${PROTOTYPE}/model.ts`,
    },
  ],
  invalid: [
    {
      name: 'component models cannot read DOM globals',
      code: 'export const initial = () => document.title;',
      filename: '/project/src/components/comment-panel/model.ts',
      errors: [{ message: /must not read the 'document' global/ }],
    },
    {
      name: 'component presentation cannot import the view',
      code: "import { renderPanel } from './view';",
      filename: '/project/src/components/comment-panel/present.ts',
      errors: [{ message: /must not import a DOM adapter or view/ }],
    },
    {
      name: 'component models cannot reach clipboard',
      code: 'export const copy = () => navigator.clipboard;',
      filename: '/project/src/components/comment-panel/model.ts',
      errors: [{ message: /must not read the 'navigator' global/ }],
    },
    {
      name: 'gesture transitions cannot import a DOM adapter',
      code: "import { openPopover } from '../../lib/dom/popover';",
      filename: '/project/src/boards/event-storming/gesture.ts',
      errors: [{ message: /must not import a DOM adapter or view/ }],
    },
    {
      name: 'pure modules must not read document',
      code: 'export const read = () => document.body;',
      filename: `${PROTOTYPE}/model.ts`,
      errors: [{ message: /must not read the 'document' global/ }],
    },
    {
      name: 'pure modules must not read window',
      code: 'export const read = () => window.location.href;',
      filename: `${PROTOTYPE}/model.ts`,
      errors: [{ message: /must not read the 'window' global/ }],
    },
    {
      name: 'pure modules must not import Lit',
      code: "import { LitElement } from 'lit';\nexport class X extends LitElement {}",
      filename: `${PROTOTYPE}/apply.ts`,
      errors: [{ message: /must not import Lit/ }],
    },
    {
      name: 'pure modules must not import another view',
      code: "import { usmDefinition } from '../usm/definition';",
      filename: `${PROTOTYPE}/present.ts`,
      errors: [{ message: /must not depend on another view or board/ }],
    },
    {
      name: 'reading a global through globalThis is still a global read',
      code: 'export const title = () => globalThis.document.title;',
      filename: `${PROTOTYPE}/model.ts`,
      errors: [{ message: /must not read the 'document' global/ }],
    },
  ],
});

ruleTester.run('entrypoint-imports', entrypointImports, {
  valid: [
    {
      name: 'internal modules may import concrete modules',
      code: "import { derive } from './derive';",
      filename: `${CORE}/controller.ts`,
    },
    {
      name: 'the entrypoint itself is exempt',
      code: "import { TemplateElement } from './core/index';",
      filename: '/project/src/index.ts',
    },
    {
      name: 'an entry may import the entry-side helpers',
      code: "import { announce } from './announce';",
      filename: '/project/src/entries/prototype.ts',
    },
  ],
  invalid: [
    {
      name: 'internal modules must not import the public entrypoint',
      code: "import { registerAllElements } from '../index';",
      filename: `${CORE}/element.ts`,
      errors: [{ message: /must not import the public entrypoint/ }],
    },
    {
      name: 'the directory form of the entrypoint is the same boundary',
      code: "export { registerAllElements } from '..';",
      filename: `${CORE}/element.ts`,
      errors: [{ message: /must not import the public entrypoint/ }],
    },
    {
      name: 'a shipped entry is an entrypoint too',
      code: "import { definePrototypeElement } from '../entries/prototype';",
      filename: `${CORE}/element.ts`,
      errors: [{ message: /must not import the public entrypoint/ }],
    },
  ],
});

ruleTester.run('colocated-tests', colocatedTests, {
  valid: [
    {
      name: 'a colocated test is fine',
      code: 'export const x = 1;',
      filename: `${CORE}/controller.test.ts`,
    },
    {
      name: 'a non-test file is ignored',
      code: 'export const x = 1;',
      filename: `${CORE}/controller.ts`,
    },
  ],
  invalid: [
    {
      name: 'tests must not live in __tests__',
      code: 'export const x = 1;',
      filename: `/project/src/core/__tests__/controller.test.ts`,
      errors: [{ message: /must be colocated/ }],
    },
  ],
});

const define = (tag, className) => `customElements.define('${tag}', ${className});`;

ruleTester.run('element-naming', elementNaming, {
  valid: [
    {
      name: 'a view registers dpk-view-<its directory>',
      code: define('dpk-view-usm', 'DpkViewUsm'),
      filename: `${USM}/element.ts`,
    },
    {
      name: 'a template-owned sub-element is dpk-internal-<template>-*',
      code: define('dpk-internal-usm-story-card', 'DpkInternalUsmStoryCard'),
      filename: `${USM}/components/story-card.ts`,
    },
    {
      name: 'a component registers dpk-<its directory>',
      code: define('dpk-board-er-diagram', 'DpkBoardErDiagram'),
      filename: '/project/src/boards/er-diagram/index.ts',
    },
    {
      name: 'a component-owned sub-element is dpk-internal-<component>-*',
      code: define('dpk-internal-event-storming-note', 'DpkInternalEventStormingNote'),
      filename: '/project/src/boards/event-storming/components/note-card.ts',
    },
    {
      name: 'tests may register fixtures under any name',
      code: define('tiny-diagram', 'TinyDiagram'),
      filename: '/project/src/boards/base/element.test.ts',
    },
    {
      name: 'a layout registers dpk-internal-layout-<its directory>',
      code: define('dpk-internal-layout-sidebar', 'DpkInternalLayoutSidebar'),
      filename: '/project/src/core/layouts/sidebar/index.ts',
    },
    {
      name: 'the page host is dpk-page',
      code: define('dpk-page', 'DpkPage'),
      filename: '/project/src/page/index.ts',
    },
  ],
  invalid: [
    {
      name: 'the page directory registers nothing but the page',
      code: define('dpk-template-page', 'DpkTemplatePage'),
      filename: '/project/src/page/index.ts',
      errors: [{ message: /must be `dpk-page`/ }],
    },
    {
      name: 'the old artifact-* prefix is rejected',
      code: define('artifact-usm', 'DpkTemplateUsm'),
      filename: `${USM}/element.ts`,
      errors: [{ message: /must be `dpk-view-usm` or `dpk-internal-usm-\*`/ }],
    },
    {
      name: 'a view must not register another view',
      code: define('dpk-view-prototype', 'DpkViewPrototype'),
      filename: `${USM}/element.ts`,
      errors: [{ message: /must be `dpk-view-usm`/ }],
    },
    {
      name: 'a component tag follows its directory',
      code: define('dpk-erd', 'DpkErd'),
      filename: '/project/src/boards/er-diagram/index.ts',
      errors: [{ message: /must be `dpk-board-er-diagram`/ }],
    },
    {
      name: 'a layout tag follows its directory',
      code: define('dpk-internal-layout-split', 'DpkInternalLayoutSplit'),
      filename: '/project/src/core/layouts/sidebar/index.ts',
      errors: [{ message: /must be `dpk-internal-layout-sidebar`/ }],
    },
    {
      name: 'the class is the PascalCase of the tag',
      code: define('dpk-view-usm', 'UsmElement'),
      filename: `${USM}/element.ts`,
      errors: [{ message: /must be named `DpkViewUsm`/ }],
    },
    {
      name: 'the tag must be a string literal',
      code: "const tag = 'dpk-view-usm'; customElements.define(tag, DpkViewUsm);",
      filename: `${USM}/element.ts`,
      errors: [{ message: /string literal/ }],
    },
    {
      name: 'nothing outside views, boards and components registers elements',
      code: define('dpk-thing', 'DpkThing'),
      filename: `${CORE}/element.ts`,
      errors: [{ message: /registered only in src\/views/ }],
    },
  ],
});

ruleTester.run('localized-text', localizedText, {
  valid: [
    {
      name: 'English text in code',
      code: "export const label = 'Add note';",
      filename: `${USM}/present.ts`,
    },
    {
      name: 'symbols the dictionaries do not own',
      code: 'export const line = (a, b) => `${a} · ${b} → ✓ ×`;',
      filename: `${USM}/present.ts`,
    },
    {
      name: 'Japanese in a dictionary',
      code: "export const ja = { add: '追加' };",
      filename: `${USM}/messages.ts`,
    },
    {
      name: 'Japanese in a comment',
      code: "// 追加する\nexport const add = 'Add';",
      filename: `${USM}/present.ts`,
    },
    {
      name: 'Japanese fixture data in a test',
      code: "const story = { name: '注文する' };",
      filename: `${USM}/usm.test.ts`,
    },
    {
      name: 'files outside src',
      code: "export const title = 'サンプル';",
      filename: '/project/dev/qa/browser-smoke.ts',
    },
  ],
  invalid: [
    {
      name: 'Japanese in a string literal',
      code: "export const label = 'メモを追加';",
      filename: `${USM}/present.ts`,
      errors: [{ message: /messages\.ts/ }],
    },
    {
      name: 'Japanese in a template literal',
      code: 'export const label = (name) => `${name}にコメント`;',
      filename: '/project/src/components/diagram/element.ts',
      errors: [{ message: /messages\.ts/ }],
    },
    {
      name: 'full-width symbols',
      code: "export const plus = '＋';",
      filename: `${CORE}/element.ts`,
      errors: [{ message: /messages\.ts/ }],
    },
  ],
});

ruleTester.run('no-side-stripe', noSideStripe, {
  valid: [
    {
      name: 'a 1px divider between columns',
      code: 'export const styles = css`.col + .col { border-left: 1px solid var(--dpk-rule); }`;',
      filename: `${USM}/styles.ts`,
    },
    {
      name: 'a ring and a tint on every side',
      code: 'export const styles = css`.card { border: 1px solid var(--dpk-blue); box-shadow: inset 0 0 0 1px var(--dpk-blue-soft); }`;',
      filename: `${USM}/styles.ts`,
    },
    {
      name: 'an insertion bar outside the box',
      code: "export const styles = css`.slot::before { content: ''; position: absolute; top: -6px; bottom: -6px; left: -10px; width: 3px; }`;",
      filename: `${USM}/styles.ts`,
    },
    {
      name: 'a bar in a test fixture',
      code: 'const fixture = `<div style="border-left: 4px solid red"></div>`;',
      filename: `${USM}/usm.test.ts`,
    },
  ],
  invalid: [
    {
      name: 'a thick left border',
      code: 'export const styles = css`.card { border-left: 3px solid var(--tone); }`;',
      filename: `${USM}/styles.ts`,
      errors: [{ message: /side stripe/ }],
    },
    {
      name: 'a thick start border',
      code: 'export const styles = css`.card { border-inline-start: 2px solid var(--tone); }`;',
      filename: `${USM}/styles.ts`,
      errors: [{ message: /side stripe/ }],
    },
    {
      name: 'a state that recolours or widens only the left border',
      code: 'export const styles = css`.card.is-done { border-left-color: var(--dpk-green); }`;',
      filename: `${USM}/styles.ts`,
      errors: [{ message: /side stripe/ }],
    },
    {
      name: 'an inset shadow on the left edge',
      code: 'export const styles = css`.row.is-added { box-shadow: inset 2px 0 0 var(--dpk-green); }`;',
      filename: '/project/src/components/er-diagram/styles.ts',
      errors: [{ message: /side stripe/ }],
    },
    {
      name: 'a pseudo-element bar along the left edge',
      code: "export const styles = css`.item::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; }`;",
      filename: '/project/src/components/comment-panel/styles.ts',
      errors: [{ message: /side stripe/ }],
    },
  ],
});

ruleTester.run('discard-on-cancel', discardOnCancel, {
  valid: [
    {
      name: 'a Cancel that throws the text beside it away',
      code: 'const view = html`<textarea .value=${body}></textarea><button data-dpk-text-discard @click=${() => cancel()}>${m.cancel}</button>`;',
      filename: `${PROTOTYPE}/render/ui-notes.ts`,
    },
    {
      name: 'a Cancel with no text field beside it',
      code: 'const view = html`<input type="checkbox" .checked=${skip} /><button @click=${cancel}>${m.confirmCancel}</button>`;',
      filename: '/project/src/views/delegation-poker/render/confirm.ts',
    },
    {
      name: 'a text field whose other buttons keep the text',
      code: 'const view = html`<input class="dpk-input" /><button @click=${close}>${m.close}</button>`;',
      filename: `${USM}/render/map-filter.ts`,
    },
  ],
  invalid: [
    {
      name: 'a Cancel beside a textarea',
      code: 'const view = html`<textarea></textarea><button class="dpk-btn" @click=${() => send({ kind: "edit-cancel" })}>${m.cancelEdit}</button>`;',
      filename: '/project/src/components/comment-panel/view.ts',
      errors: [{ message: /data-dpk-text-discard/ }],
    },
    {
      name: 'a Cancel beside a text input',
      code: 'const view = html`<input type="text" .value=${name} /><div><button @click=${() => (this.naming = undefined)}>${m.cancel}</button></div>`;',
      filename: '/project/src/boards/event-storming/element.ts',
      errors: [{ message: /data-dpk-text-discard/ }],
    },
  ],
});
