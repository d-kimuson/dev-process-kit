/**
 * The language that applies to a node: the closest `lang` attribute on the node
 * or an ancestor. A shadow root continues at its host, so an element inside a
 * component inherits the page's language the way text does.
 */
export const closestLang = (node: Node): string | null => {
  let current: Node | null = node;
  while (current !== null) {
    if (current instanceof Element) {
      const lang = current.getAttribute('lang');
      if (lang !== null) return lang;
    }
    current = current instanceof ShadowRoot ? current.host : current.parentNode;
  }
  return null;
};
