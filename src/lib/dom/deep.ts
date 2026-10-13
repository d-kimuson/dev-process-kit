/**
 * Queries that cross open shadow roots, for finding an element a component
 * rendered somewhere below a host without knowing how it is nested.
 */

/** Every element matching `selector` in `root` and in each open shadow root below it, in tree order. */
export const queryAllDeep = (root: ParentNode, selector: string): Element[] => {
  const found: Element[] = [];
  const visit = (scope: ParentNode): void => {
    for (const element of scope.querySelectorAll('*')) {
      if (element.matches(selector)) found.push(element);
      if (element.shadowRoot) visit(element.shadowRoot);
    }
  };
  visit(root);
  // A host's own light DOM comes before what its shadow root renders.
  if (root instanceof Element && root.shadowRoot) visit(root.shadowRoot);
  return found;
};

/** `element`'s ancestors through shadow hosts, nearest first, stopping before `stop`. */
export const composedAncestors = (element: Element, stop: Element): Element[] => {
  const ancestors: Element[] = [];
  let node: Node | null = element;
  while (node) {
    const next: Node | null = node instanceof Element && node.assignedSlot ? node.assignedSlot : node.parentNode;
    node = next instanceof ShadowRoot ? next.host : next;
    if (!(node instanceof Element) || node === stop) break;
    ancestors.push(node);
  }
  return ancestors;
};
