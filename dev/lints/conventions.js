/**
 * oxlint JS plugin — dev-process-kit project conventions.
 *
 * Rules:
 *   - core-template-boundaries: `src/core/**` must not import `src/templates/**` or `src/components/**`
 *   - lib-boundaries:           `src/lib/**` must not import core / components / templates
 *   - template-isolation:       a template must not import another template
 *   - pure-layer-boundaries:    pure modules must not reach DOM / Lit / other templates
 *   - entrypoint-imports:       internal modules must not import the public entrypoint
 *                              (`src/index.ts`, `src/entries/*`)
 *   - colocated-tests:          test files must sit next to their source, not in `__tests__/`
 *   - element-naming:           custom element tags are `dpk-template-<name>` / `dpk-internal-<template>-*`
 *                              (in src/templates) or `dpk-component-<name>` (in src/components), and the
 *                              registered class is the tag in PascalCase
 *
 * The architecture this encodes is the one `dev-docs/guidelines/architecture.md`
 * describes: `lib` holds dependency-free helpers, `core` owns the pipeline and
 * must stay template-agnostic, `components` and `templates` are the shipped
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
  // The template barrel is a composition root: it registers every template, so
  // it is the one place allowed to import them all.
  if (normalized.endsWith('/src/templates/index.ts')) return { kind: 'entrypoint' };
  // `src/entries/*` are the shipped entrypoints (`components.js`,
  // `templates/<name>.js`): they register elements and export the public API, so
  // nothing inside the framework may import one back either.
  if (/\/src\/entries\/[^/]+$/.test(target)) return { kind: 'entrypoint' };
  if (/\/src\/core(\/|$)/.test(target)) return { kind: 'core' };
  if (/\/src\/components(\/|$)/.test(target)) return { kind: 'components' };
  if (/\/src\/lib(\/|$)/.test(target)) return { kind: 'lib' };
  const template = target.match(/\/src\/templates\/([^/]+)(?:\/|$)/);
  if (template) return { kind: 'template', name: template[1] };
  if (/\/src\/templates(\/|$)/.test(target)) return { kind: 'template', name: 'index' };
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

const coreTemplateBoundaries = {
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (classify(filename).kind !== 'core') return {};
    const check = (edge) => {
      const target = classify(edge.resolved);
      if (target.kind !== 'template' && target.kind !== 'components') return;
      context.report({
        node: edge.node,
        message:
          'Core must not import a template or a component: the core is template-agnostic, and templates/components depend on the core, never the reverse.',
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
      if (target.kind === 'core' || target.kind === 'components' || target.kind === 'template') {
        context.report({
          node: edge.node,
          message: `lib must stay dependency-free: it must not import '${target.kind}'. Move the shared behaviour into lib instead.`,
        });
      }
    };
    return { ...onImports(context, check), ...onDynamicImport(context, check) };
  },
};

const templateIsolation = {
  create(context) {
    const filename = context.filename ?? context.getFilename();
    const self = classify(filename);
    if (self.kind !== 'template') return {};
    const check = (edge) => {
      const target = classify(edge.resolved);
      if (target.kind !== 'template' || target.name === self.name) return;
      context.report({
        node: edge.node,
        message: `Template '${self.name}' must not import template '${target.name}'. Share the behaviour through src/core instead.`,
      });
    };
    return { ...onImports(context, check), ...onDynamicImport(context, check) };
  },
};

/** Modules that must stay pure: no DOM, no Lit, no template knowledge. */
const PURE_FILE =
  /\/src\/(?:core\/derive\.ts|templates\/[^/]+\/(?:model|apply|present|layout|drop|commands|ui-mode|gesture|interactions)\.ts|components\/[^/]+\/(?:model|present)\.ts)$/;

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
      if (target.kind === 'template' && target.name !== self.name) {
        context.report({ node: edge.node, message: 'pure modules must not depend on another template' });
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
 * Where a file may register elements, and the tags it may use: a template
 * registers `dpk-template-<name>` plus sub-elements `dpk-internal-<name>-*`,
 * a component registers `dpk-component-<directory>`.
 */
const allowedTags = (filename) => {
  const template = filename.match(/\/src\/templates\/([^/]+)\//);
  if (template) {
    const name = template[1];
    return {
      matches: (tag) => tag === `dpk-template-${name}` || tag.startsWith(`dpk-internal-${name}-`),
      expected: `\`dpk-template-${name}\` or \`dpk-internal-${name}-*\``,
    };
  }
  const component = filename.match(/\/src\/components\/([^/]+)\//);
  if (component) {
    const name = component[1];
    return { matches: (tag) => tag === `dpk-component-${name}`, expected: `\`dpk-component-${name}\`` };
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
            message: 'Custom elements are registered only in src/templates/** and src/components/**.',
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

const plugin = {
  meta: {
    name: 'conventions',
  },
  rules: {
    'core-template-boundaries': coreTemplateBoundaries,
    'lib-boundaries': libBoundaries,
    'template-isolation': templateIsolation,
    'pure-layer-boundaries': pureLayerBoundaries,
    'entrypoint-imports': entrypointImports,
    'colocated-tests': colocatedTests,
    'element-naming': elementNaming,
  },
};

export default plugin;

export {
  coreTemplateBoundaries,
  libBoundaries,
  templateIsolation,
  pureLayerBoundaries,
  entrypointImports,
  colocatedTests,
  elementNaming,
  classify,
  resolveImportPath,
};
