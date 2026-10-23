// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE } from '../core/i18n';
import '../index';
import { delegationPokerDefinitionFor } from '../templates/delegation-poker/definition';
import { plainDefinitionFor } from '../templates/plain/definition';
import { prototypeDefinitionFor } from '../templates/prototype/definition';
import { slidesDefinitionFor } from '../templates/slides/definition';
import { taskBoardDefinitionFor } from '../templates/task-board/definition';
import { usmDefinitionFor } from '../templates/usm/definition';
import { DpkPage } from './index';

const page = document.createElement('dpk-page');
if (!(page instanceof DpkPage)) throw new Error('not upgraded');

// `BOARD_TEMPLATES` (in `index.ts`) duplicates each template's own `label` and `addable` so the
// add menu can read them before an unloaded template's entry is fetched. This guards the two
// sources of truth against drift.
const DEFINITIONS = {
  usm: usmDefinitionFor,
  prototype: prototypeDefinitionFor,
  'task-board': taskBoardDefinitionFor,
  'delegation-poker': delegationPokerDefinitionFor,
  slides: slidesDefinitionFor,
  plain: plainDefinitionFor,
} as const;

// `boardTemplates` is `protected` (an implementation seam for `PageElement` subclasses, not public
// API); this reaches it the same way `PageElement` itself does, without widening its visibility.
type WithBoardTemplates = {
  boardTemplates(): readonly { readonly name: string; readonly label: string; readonly addable?: boolean }[];
};

describe('BOARD_TEMPLATES', () => {
  const boardTemplates = (page as unknown as WithBoardTemplates).boardTemplates();

  it('lists exactly the shipped templates', () => {
    expect(boardTemplates.map((template) => template.name).sort()).toEqual(Object.keys(DEFINITIONS).sort());
  });

  for (const template of boardTemplates) {
    it(`"${template.name}" matches its own definition's label and addable`, () => {
      const definition = DEFINITIONS[template.name as keyof typeof DEFINITIONS](DEFAULT_LOCALE);
      expect(template.label).toBe(definition.label);
      expect(template.addable ?? true).toBe(definition.addable ?? true);
    });
  }
});
