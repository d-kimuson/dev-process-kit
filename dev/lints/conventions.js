/**
 * oxlint JS plugin — dev-process-kit project conventions.
 *
 * Rules:
 *   - core-content-boundaries: `src/core/**` must not import a view, a board or a component
 *   - lib-boundaries:           `src/lib/**` must not import core / components / views / boards
 *   - content-isolation:       a view or board must not import another of its kind
 *   - pure-layer-boundaries:    pure modules must not reach DOM / Lit / other views or boards
 *   - entrypoint-imports:       internal modules must not import the public entrypoint
 *                              (`src/index.ts`, `src/entries/*`)
 *   - colocated-tests:          test files must sit next to their source, not in `__tests__/`
 *   - element-naming:           custom element tags are `dpk-view-<name>` or `dpk-board-<name>`, plus `dpk-internal-<name>-*`
 *                              (in src/views), `dpk-<name>` / `dpk-internal-<name>-*` (in src/components) or
 *                              `dpk-internal-layout-<name>` (in src/core/layouts), and the registered class is
 *                              the tag in PascalCase
 *   - localized-text:           Japanese text in `src/**` lives only in `messages.ts` dictionaries
 *   - no-side-stripe:           styles in `src/**` draw no colored stripe down one side of a box
 *
 * The architecture this encodes is the one `dev-docs/guidelines/architecture.md`
 * describes: `lib` holds dependency-free helpers, `core` owns the pipeline and
 * must stay content-agnostic, `components`, `views` and `boards` are the shipped
 * elements, and the public entrypoint composes them without being re-imported
 * from inside.
 *
 * oxlint's plugin API exposes per-node visitors (no `sourceCode.getDescendants`),
 * so every rule reports from the import-shaped visitors below.
 */

const normalize = (path) => path.replaceAll('\\', '/');

/** Classifies a file path into the layer that owns it. */
const classify = (path) => {
  const normalized = normalize(path);
  // `../../core` (a directory index) resolves without the `/index` suffix, so
  // strip it before matching; otherwise the boundary rules can be bypassed by
  // importing a layer's barrel instead of a concrete module.
  const target = normalized.replace(/\/index(\.ts)?$/, '');
  // `src/index.ts`, and `..` from `src/core` (which resolves to `src`), are both
  // the public entrypoint.
  if (target.endsWith('/src')) return { kind: 'entrypoint' };
  // The view and board barrels are composition roots: they register every
  // content, so they are the one place allowed to import them all.
  if (normalized.endsWith('/src/views/index.ts') || normalized.endsWith('/src/boards/index.ts')) {
    return { kind: 'entrypoint' };
  }
  // `src/entries/*` are the shipped entrypoints (`components.js`, `boards.js`,
  // `views/<name>.js`): they register elements and export the public API, so
  // nothing inside the framework may import one back either.
  if (/\/src\/entries\/[^/]+$/.test(target)) return { kind: 'entrypoint' };
  if (/\/src\/core(\/|$)/.test(target)) return { kind: 'core' };
  if (/\/src\/components(\/|$)/.test(target)) return { kind: 'components' };
  if (/\/src\/lib(\/|$)/.test(target)) return { kind: 'lib' };
  const view = target.match(/\/src\/views\/([^/]+)(?:\/|$)/);
  if (view) return { kind: 'view', name: view[1] };
  const board = target.match(/\/src\/boards\/([^/]+)(?:\/|$)/);
  if (board) return { kind: 'board', name: board[1] };
  if (/\/src\/views(\/|$)/.test(target)) return { kind: 'view', name: 'index' };
  if (/\/src\/boards(\/|$)/.test(target)) return { kind: 'board', name: 'index' };
  return { kind: 'other' };
};

/**
 * Resolves an import specifier to a comparable path. Relative specifiers are
 * resolved against the importing file's directory; bare package names are
 * returned unchanged so package imports never match `src/...` patterns.
 */
const resolveImportPath = (specifier, fromFile) => {
  if (!specifier.startsWith('.')) return specifier;
  const stack = normalize(fromFile).split('/').slice(0, -1);
  for (const part of specifier.split('/')) {
    if (part === '.' || part === '') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
};

/** Collects `{ node, specifier, resolved }` for every import edge in a file. */
const collectImports = (programNode, filename) => {
  const edges = [];
  const push = (node) => {
    if (typeof node.source?.value !== 'string') return;
    edges.push({
      node,
      specifier: node.source.value,
      resolved: resolveImportPath(node.source.value, filename),
    });
  };
  for (const statement of programNode.body) {
    if (
      statement.type === 'ImportDeclaration' ||
      statement.type === 'ExportNamedDeclaration' ||
      statement.type === 'ExportAllDeclaration'
    ) {
      push(statement);
    }
  }
  return edges;
};

/**
 * Runs `check(edge)` over every import edge, reporting once per program.
 *
 * Building the edge list in `Program` keeps the rules simple; `Program` is
 * entered before its children, so all imports are already present.
 */
const onImports = (context, check) => ({
  Program(node) {
    const filename = context.filename ?? context.getFilename();
    for (const edge of collectImports(node, filename)) check(edge, filename);
  },
});

/** Dynamic `import()` is a separate visitor because it is an expression. */
const onDynamicImport = (context, check) => ({
  ImportExpression(node) {
    if (typeof node.source?.value !== 'string') return;
    const filename = context.filename ?? context.getFilename();
    check(
      {
        node,
        specifier: node.source.value,
        resolved: resolveImportPath(node.source.value, filename),
      },
      filename,
    );
  },
});

const coreContentBoundaries = {
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (classify(filename).kind !== 'core') return {};
    const check = (edge) => {
      const target = classify(edge.resolved);
      if (target.kind !== 'view' && target.kind !== 'board' && target.kind !== 'components') return;
      context.report({
        node: edge.node,
        message:
          'Core must not import a view, a board or a component: the core is content-agnostic, and the three tiers depend on the core, never the reverse.',
      });
    };
    return { ...onImports(context, check), ...onDynamicImport(context, check) };
  },
};

/**
 * `src/lib` holds small, reusable helpers (DOM interaction, formatting). It is
 * the lowest layer, so it must not know about dev-process-kit at all.
 */
const libBoundaries = {
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (classify(filename).kind !== 'lib') return {};
    const check = (edge) => {
      const target = classify(edge.resolved);
      if (target.kind === 'core' || target.kind === 'components' || target.kind === 'view' || target.kind === 'board') {
        context.report({
          node: edge.node,
          message: `lib must stay dependency-free: it must not import '${target.kind}'. Move the shared behaviour into lib instead.`,
        });
      }
    };
    return { ...onImports(context, check), ...onDynamicImport(context, check) };
  },
};

const contentIsolation = {
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const self = classify(filename);
    if (self.kind !== 'view' && self.kind !== 'board') return {};
    const check = (edge) => {
      const target = classify(edge.resolved);
      if (target.kind !== self.kind || target.name === self.name) return;
      // A board may build on the shared board base; it is not another board.
      if (self.kind === 'board' && target.name === 'base') return;
      context.report({
        node: edge.node,
        message: `${self.kind === 'view' ? 'View' : 'Board'} '${self.name}' must not import ${self.kind} '${target.name}'. Share the behaviour through src/core or src/boards/base instead.`,
      });
    };
    return { ...onImports(context, check), ...onDynamicImport(context, check) };
  },
};

/** Modules that must stay pure: no DOM, no Lit, no content knowledge. */
const PURE_FILE =
  /\/src\/(?:core\/derive\.ts|views\/[^/]+\/(?:model|apply|present|layout|drop|commands|ui-mode|gesture|interactions)\.ts|boards\/[^/]+\/(?:model|apply|present|layout|drop|commands|ui-mode|gesture|interactions)\.ts|components\/[^/]+\/(?:model|present)\.ts)$/;

const FORBIDDEN_PURE_IMPORTS = [
  { pattern: /^lit(?:$|\/)/, message: 'pure modules must not import Lit' },
  { pattern: /^(?:dompurify|@floating-ui\/dom)$/, message: 'pure modules must not import DOM libraries' },
  { pattern: /^marked$/, message: 'pure modules must not import rendering libraries' },
];

const PURE_FORBIDDEN_GLOBALS = [
  'document',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
  'history',
  'location',
  'MutationObserver',
  'ResizeObserver',
  'IntersectionObserver',
  'requestAnimationFrame',
];

/** Generic AST walk; oxlint's plugin API has no descendant helper. */
const walk = (node, visit) => {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visit);
    } else if (value && typeof value.type === 'string') {
      walk(value, visit);
    }
  }
};

/** Names bound by a binding pattern: `a`, `{ a }`, `[a]`, `a = 1`, `...a`. */
const collectPatternNames = (pattern, names) => {
  if (!pattern || typeof pattern.type !== 'string') return;
  switch (pattern.type) {
    case 'Identifier':
      names.add(pattern.name);
      return;
    case 'ObjectPattern':
      for (const property of pattern.properties ?? []) {
        if (property.type === 'RestElement') collectPatternNames(property.argument, names);
        else collectPatternNames(property.value, names);
      }
      return;
    case 'ArrayPattern':
      for (const element of pattern.elements ?? []) collectPatternNames(element, names);
      return;
    case 'AssignmentPattern':
      collectPatternNames(pattern.left, names);
      return;
    case 'RestElement':
      collectPatternNames(pattern.argument, names);
      return;
    default:
      return;
  }
};

/**
 * Every value name bound anywhere in the file.
 *
 * A name in this set shadows the global, so a local `const location = …` is not
 * a DOM read. Whole-file granularity is deliberately conservative: it can only
 * miss a violation that shadows a global in one scope and reads the real global
 * in another, which does not happen in practice.
 */
const collectDeclaredNames = (programNode) => {
  const names = new Set();
  walk(programNode, (node) => {
    if (node.type === 'VariableDeclarator') collectPatternNames(node.id, names);
    if (node.type === 'CatchClause') collectPatternNames(node.param, names);
    if (
      node.type === 'FunctionDeclaration' ||
      node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression'
    ) {
      if (node.id) names.add(node.id.name);
      for (const param of node.params ?? []) collectPatternNames(param, names);
    }
    if ((node.type === 'ClassDeclaration' || node.type === 'ClassExpression') && node.id) {
      names.add(node.id.name);
    }
    if (node.type === 'ImportDefaultSpecifier' || node.type === 'ImportNamespaceSpecifier') {
      names.add(node.local.name);
    }
    if (node.type === 'ImportSpecifier') names.add(node.local.name);
  });
  return names;
};

const pureLayerBoundaries = {
  create(context) {
    const filename = normalize(context.filename ?? context.getFilename());
    if (!PURE_FILE.test(filename)) return {};
    const self = classify(filename);
    let declared = new Set();

    const checkImport = (edge) => {
      const forbidden = FORBIDDEN_PURE_IMPORTS.find((entry) => entry.pattern.test(edge.specifier));
      if (forbidden) {
        context.report({ node: edge.node, message: forbidden.message });
        return;
      }
      const typeOnly = edge.node.importKind === 'type' || edge.node.exportKind === 'type';
      if (!typeOnly && /\/(?:lib\/dom\/|render\/|(?:view|styles|element|index)(?:\.ts)?$)/.test(edge.resolved)) {
        context.report({ node: edge.node, message: 'pure modules must not import a DOM adapter or view' });
        return;
      }
      const target = classify(edge.resolved);
      if ((target.kind === 'view' || target.kind === 'board') && target.name !== self.name) {
        // The shared board base is the one pure foundation both a board and a
        // component may read; it is not another content element.
        if (self.kind === 'board' && target.name === 'base') return;
        context.report({ node: edge.node, message: 'pure modules must not depend on another view or board' });
      }
    };

    return {
      ...onDynamicImport(context, checkImport),
      Program(node) {
        declared = collectDeclaredNames(node);
        for (const edge of collectImports(node, filename)) checkImport(edge, filename);
      },
      Identifier(node) {
        if (!PURE_FORBIDDEN_GLOBALS.includes(node.name)) return;
        if (declared.has(node.name)) return;
        const parent = node.parent;
        if (parent?.type === 'MemberExpression' && parent.property === node && !parent.computed) {
          // `obj.document` is a field read. `globalThis.document` (and the same
          // through window/self) is the global itself; when the object is also a
          // forbidden global (`window.location`) that read is reported instead,
          // so one chain never produces two findings.
          const object = parent.object;
          const viaGlobalObject =
            object?.type === 'Identifier' && ['globalThis', 'window', 'self', 'global'].includes(object.name);
          if (!viaGlobalObject) return;
          if (object.type === 'Identifier' && PURE_FORBIDDEN_GLOBALS.includes(object.name)) return;
        }
        // `{ document: x }` and `{ document }` keys are not global reads.
        if (parent?.type === 'Property' && parent.key === node && !parent.computed) return;
        context.report({
          node,
          message: `pure modules must not read the '${node.name}' global; keep DOM access in the element layer`,
        });
      },
    };
  },
};

const entrypointImports = {
  create(context) {
    const filename = normalize(context.filename ?? context.getFilename());
    if (!/\/src\//.test(filename)) return {};
    // A composition root composes the entries; nothing else may import one back.
    if (classify(filename).kind === 'entrypoint') return {};
    const check = (edge) => {
      if (classify(edge.resolved).kind !== 'entrypoint') return;
      context.report({
        node: edge.node,
        message:
          'Internal modules must not import the public entrypoint (src/index.ts, src/entries/*); import the concrete module instead.',
      });
    };
    return { ...onImports(context, check), ...onDynamicImport(context, check) };
  },
};

const RE_TEST_DIR = /(?:^|[/\\])__tests?__(?:[/\\]|$)/;

const colocatedTests = {
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!RE_TEST_DIR.test(filename)) return {};

    return {
      Program(node) {
        context.report({
          node,
          message: 'Test files must be colocated with their source files, not placed in __tests__/ directories.',
        });
      },
    };
  },
};

const pascalCase = (tag) =>
  tag
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const isDefineCall = (node) => {
  const callee = node.callee;
  if (callee?.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.property?.name !== 'define') return false;
  const object = callee.object;
  if (object?.type === 'Identifier') return object.name === 'customElements';
  return object?.type === 'MemberExpression' && !object.computed && object.property?.name === 'customElements';
};

/**
 * Where a file may register elements, and the tags it may use: a view
 * registers `dpk-view-<name>` plus sub-elements `dpk-internal-<name>-*`, a
 * board registers `dpk-board-<name>` plus the same `dpk-internal-<name>-*`
 * sub-elements, and a component registers `dpk-<directory>` plus its own
 * `dpk-internal-<directory>-*` (a nested Custom Element still adds a shadow
 * boundary, so a piece composed by one of them follows that tier's naming
 * rather than inventing its own).
 */
const allowedTags = (filename) => {
  const view = filename.match(/\/src\/views\/([^/]+)\//);
  if (view) {
    const name = view[1];
    return {
      matches: (tag) => tag === `dpk-view-${name}` || tag.startsWith(`dpk-internal-${name}-`),
      expected: `\`dpk-view-${name}\` or \`dpk-internal-${name}-*\``,
    };
  }
  const board = filename.match(/\/src\/boards\/([^/]+)\//);
  if (board) {
    const name = board[1];
    return {
      matches: (tag) => tag === `dpk-board-${name}` || tag.startsWith(`dpk-internal-${name}-`),
      expected: `\`dpk-board-${name}\` or \`dpk-internal-${name}-*\``,
    };
  }
  // The app and page hosts are the two roles named without a tier prefix.
  if (/\/src\/app\//.test(filename)) {
    return { matches: (tag) => tag === 'dpk-app', expected: '`dpk-app`' };
  }
  if (/\/src\/page\//.test(filename)) {
    return { matches: (tag) => tag === 'dpk-page', expected: '`dpk-page`' };
  }
  // The layouts divide the whole screen for the shell; they are internal to it, not a public element.
  const layout = filename.match(/\/src\/core\/layouts\/([^/]+)\//);
  if (layout) {
    const name = layout[1];
    return { matches: (tag) => tag === `dpk-internal-layout-${name}`, expected: `\`dpk-internal-layout-${name}\`` };
  }
  const component = filename.match(/\/src\/components\/([^/]+)\//);
  if (component) {
    const name = component[1];
    return {
      matches: (tag) => tag === `dpk-${name}` || tag.startsWith(`dpk-internal-${name}-`),
      expected: `\`dpk-${name}\` or \`dpk-internal-${name}-*\``,
    };
  }
  return null;
};

const elementNaming = {
  create(context) {
    const filename = normalize(context.filename ?? context.getFilename());
    if (!/\/src\//.test(filename) || /\.test\.[cm]?[jt]sx?$/.test(filename)) return {};
    const allowed = allowedTags(filename);
    return {
      CallExpression(node) {
        if (!isDefineCall(node)) return;
        if (!allowed) {
          context.report({
            node,
            message:
              'Custom elements are registered only in src/views/**, src/boards/**, src/components/**, src/core/layouts/**, src/app/** and src/page/**.',
          });
          return;
        }
        const [tagNode, classNode] = node.arguments;
        if (tagNode?.type !== 'Literal' || typeof tagNode.value !== 'string') {
          context.report({
            node,
            message: 'Pass the custom element tag as a string literal so its name can be checked.',
          });
          return;
        }
        const tag = tagNode.value;
        if (!allowed.matches(tag)) {
          context.report({ node: tagNode, message: `Tag \`${tag}\` must be ${allowed.expected} here.` });
          return;
        }
        const className = pascalCase(tag);
        if (classNode?.type === 'Identifier' && classNode.name !== className) {
          context.report({
            node: classNode,
            message: `The class registered as \`${tag}\` must be named \`${className}\`.`,
          });
        }
      },
    };
  },
};

/**
 * Hiragana, katakana, CJK ideographs, CJK symbols and punctuation, and the
 * full-width forms. Symbols such as `·`, `→`, `✓` are outside these ranges and
 * stay usable inline.
 */
const RE_JAPANESE = /[\u3000-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;

/**
 * The kit's own text follows the page's `lang` (see the UI localization ADR),
 * so Japanese UI text belongs in a module's `messages.ts`. Tests keep their
 * Japanese fixture data; comments are not literals and are never checked.
 */
const localizedText = {
  create(context) {
    const filename = normalize(context.filename ?? context.getFilename());
    if (!/\/src\//.test(filename) || /\.test\.[cm]?[jt]sx?$/.test(filename)) return {};
    if (filename.endsWith('/messages.ts')) return {};
    const report = (node) =>
      context.report({
        node,
        message: "Japanese text belongs in the module's messages.ts dictionary, so it follows the page's `lang`.",
      });
    return {
      Literal(node) {
        if (typeof node.value === 'string' && RE_JAPANESE.test(node.value)) report(node);
      },
      TemplateElement(node) {
        if (RE_JAPANESE.test(node.value?.cooked ?? node.value?.raw ?? '')) report(node);
      },
    };
  },
};

/** A border thicker than a 1px divider, or a state that restyles only that one side. */
const RE_SIDE_BORDER = /border-(?:left|inline-start)(?:\s*:\s*(?:[2-9]|\d{2,})px|-(?:width|color)\s*:)/;
/** An inset shadow that paints only the left edge: `inset 2px 0 0 …`. */
const RE_SIDE_SHADOW = /inset\s+(?:[2-9]|\d{2,})px\s+0(?:px)?\s+0(?:px)?\b/;
/** One `selector { body }` rule; nested blocks are matched innermost first. */
const RE_RULE = /([^{}]*)\{([^{}]*)\}/g;

/** A pseudo-element laid along the left edge from top to bottom, a few pixels wide. */
const isSideBar = (selector, body) =>
  /::?(?:before|after)/.test(selector) &&
  /(?:^|[\s;])left\s*:\s*0(?:px)?\s*;/.test(body) &&
  /(?:^|[\s;])width\s*:\s*[1-5]px\s*;/.test(body) &&
  /(?:^|[\s;])top\s*:/.test(body) &&
  /(?:^|[\s;])bottom\s*:/.test(body);

/**
 * A colored stripe down one side of a card is the stock look of generated UI,
 * and it says nothing a tint, a ring, or a chip in the head would not say
 * better. A 1px `border-left` stays usable as a divider between columns.
 */
const noSideStripe = {
  create(context) {
    const filename = normalize(context.filename ?? context.getFilename());
    if (!/\/src\//.test(filename) || /\.test\.[cm]?[jt]sx?$/.test(filename)) return {};
    const report = (node) =>
      context.report({
        node,
        message: 'Draw no side stripe: mark the box with a tint, a ring on every side, or a chip in its head instead.',
      });
    return {
      TemplateElement(node) {
        const text = node.value?.raw ?? '';
        if (RE_SIDE_BORDER.test(text) || RE_SIDE_SHADOW.test(text)) return report(node);
        for (const [, selector, body] of text.matchAll(RE_RULE)) {
          if (isSideBar(selector, body)) return report(node);
        }
      },
    };
  },
};

/**
 * A Cancel beside a text field throws the reader's typed text away, while an
 * Escape keeps it for the next time the field opens (`text-recovery.ts`). The
 * kit tells the two apart by `data-dpk-text-discard` on the button, so every
 * Cancel an `html` template draws beside a text field carries it.
 */
const RE_TEXT_FIELD =
  /<textarea\b|<input\b(?![^>]*\btype=["']?(?:checkbox|radio|range|color|file|hidden|submit|button|reset|image)\b)/;
const RE_BUTTON = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
const CANCEL_LABEL = '\u0000cancel\u0000';

/** The template's markup, its expressions blanked out except the labels that read as Cancel. */
const markupOf = (quasi) =>
  quasi.quasis
    .map((element, index) => {
      const expression = quasi.expressions[index];
      if (expression === undefined) return element.value.raw;
      const label =
        expression.type === 'MemberExpression' &&
        expression.property.type === 'Identifier' &&
        /cancel/i.test(expression.property.name);
      return element.value.raw + (label ? CANCEL_LABEL : '\u0000');
    })
    .join('');

const discardOnCancel = {
  create(context) {
    const filename = normalize(context.filename ?? context.getFilename());
    if (!/\/src\//.test(filename) || /\.test\.[cm]?[jt]sx?$/.test(filename)) return {};
    return {
      TaggedTemplateExpression(node) {
        if (node.tag.type !== 'Identifier' || node.tag.name !== 'html') return;
        const markup = markupOf(node.quasi);
        if (!RE_TEXT_FIELD.test(markup)) return;
        for (const [, attributes, content] of markup.matchAll(RE_BUTTON)) {
          if (!content.includes(CANCEL_LABEL) || /\bdata-dpk-text-discard\b/.test(attributes)) continue;
          context.report({
            node,
            message:
              'Mark a Cancel beside a text field with data-dpk-text-discard: cancelling throws the typed text away, while Escape keeps it.',
          });
        }
      },
    };
  },
};

const plugin = {
  meta: {
    name: 'conventions',
  },
  rules: {
    'core-content-boundaries': coreContentBoundaries,
    'lib-boundaries': libBoundaries,
    'content-isolation': contentIsolation,
    'pure-layer-boundaries': pureLayerBoundaries,
    'entrypoint-imports': entrypointImports,
    'colocated-tests': colocatedTests,
    'element-naming': elementNaming,
    'localized-text': localizedText,
    'no-side-stripe': noSideStripe,
    'discard-on-cancel': discardOnCancel,
  },
};

export default plugin;

export {
  coreContentBoundaries,
  libBoundaries,
  contentIsolation,
  pureLayerBoundaries,
  entrypointImports,
  colocatedTests,
  elementNaming,
  localizedText,
  noSideStripe,
  discardOnCancel,
  classify,
  resolveImportPath,
};
