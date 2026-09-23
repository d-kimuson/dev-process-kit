import { RuleTester } from 'oxlint/plugins-dev';
import { describe, it } from 'vitest';

import {
  colocatedTests,
  coreTemplateBoundaries,
  elementNaming,
  entrypointImports,
  libBoundaries,
  pureLayerBoundaries,
  templateIsolation,
} from './conventions.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } });

const CORE = '/project/src/core';
const LIB = '/project/src/lib';
const USM = '/project/src/templates/usm';
const PROTOTYPE = '/project/src/templates/prototype';

ruleTester.run('core-template-boundaries', coreTemplateBoundaries, {
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
      name: 'templates may import core',
      code: "import { parseTemplateAction } from '../../core/schema';",
      filename: `${USM}/apply.ts`,
    },
  ],
  invalid: [
    {
      name: 'core must not import a template',
      code: "import type { UsmState } from '../templates/usm/model';",
      filename: `${CORE}/controller.ts`,
      errors: [{ message: /Core must not import a template or a component/ }],
    },
    {
      name: 'core must not import a component',
      code: "import { DpkComponentCommentPanel } from '../components/comment-panel';",
      filename: `${CORE}/element.ts`,
      errors: [{ message: /Core must not import a template or a component/ }],
    },
    {
      name: 'core must not dynamically import a template',
      code: "export const load = () => import('../templates/usm/model');",
      filename: `${CORE}/controller.ts`,
      errors: [{ message: /Core must not import a template/ }],
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
      code: "import { DpkComponentCommentPanel } from '../../components/comment-panel';",
      filename: `${LIB}/dom/events.ts`,
      errors: [{ message: /lib must stay dependency-free/ }],
    },
    {
      name: 'lib must not import a template',
      code: "import { usmDefinition } from '../../templates/usm/definition';",
      filename: `${LIB}/dom/events.ts`,
      errors: [{ message: /lib must stay dependency-free/ }],
    },
  ],
});

ruleTester.run('template-isolation', templateIsolation, {
  valid: [
    {
      name: 'a template may import itself',
      code: "import { findStep } from './model';",
      filename: `${USM}/apply.ts`,
    },
    {
      name: 'a template may import core',
      code: "import { defineAction } from '../../core/schema';",
      filename: `${USM}/actions.ts`,
    },
  ],
  invalid: [
    {
      name: 'a template must not import another template',
      code: "import { prototypeDefinition } from '../prototype/definition';",
      filename: `${USM}/definition.ts`,
      errors: [{ message: /must not import template 'prototype'/ }],
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
      filename: '/project/src/templates/event-storming/gesture.ts',
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
      name: 'pure modules must not import another template',
      code: "import { usmDefinition } from '../usm/definition';",
      filename: `${PROTOTYPE}/present.ts`,
      errors: [{ message: /must not depend on another template/ }],
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
      name: 'a template registers dpk-template-<its directory>',
      code: define('dpk-template-usm', 'DpkTemplateUsm'),
      filename: `${USM}/element.ts`,
    },
    {
      name: 'a template-owned sub-element is dpk-internal-<template>-*',
      code: define('dpk-internal-usm-story-card', 'DpkInternalUsmStoryCard'),
      filename: `${USM}/components/story-card.ts`,
    },
    {
      name: 'a component registers dpk-component-<its directory>',
      code: define('dpk-component-er-diagram', 'DpkComponentErDiagram'),
      filename: '/project/src/components/er-diagram/index.ts',
    },
    {
      name: 'tests may register fixtures under any name',
      code: define('tiny-diagram', 'TinyDiagram'),
      filename: '/project/src/components/diagram/element.test.ts',
    },
  ],
  invalid: [
    {
      name: 'the old artifact-* prefix is rejected',
      code: define('artifact-usm', 'DpkTemplateUsm'),
      filename: `${USM}/element.ts`,
      errors: [{ message: /must be `dpk-template-usm` or `dpk-internal-usm-\*`/ }],
    },
    {
      name: 'a template must not register another template',
      code: define('dpk-template-prototype', 'DpkTemplatePrototype'),
      filename: `${USM}/element.ts`,
      errors: [{ message: /must be `dpk-template-usm`/ }],
    },
    {
      name: 'a component tag follows its directory',
      code: define('dpk-component-erd', 'DpkComponentErd'),
      filename: '/project/src/components/er-diagram/index.ts',
      errors: [{ message: /must be `dpk-component-er-diagram`/ }],
    },
    {
      name: 'the class is the PascalCase of the tag',
      code: define('dpk-template-usm', 'UsmElement'),
      filename: `${USM}/element.ts`,
      errors: [{ message: /must be named `DpkTemplateUsm`/ }],
    },
    {
      name: 'the tag must be a string literal',
      code: "const tag = 'dpk-template-usm'; customElements.define(tag, DpkTemplateUsm);",
      filename: `${USM}/element.ts`,
      errors: [{ message: /string literal/ }],
    },
    {
      name: 'nothing outside templates and components registers elements',
      code: define('dpk-component-thing', 'DpkComponentThing'),
      filename: `${CORE}/element.ts`,
      errors: [{ message: /registered only in src\/templates/ }],
    },
  ],
});
