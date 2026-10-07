/**
 * Describes an element inside a container in words a person and a program can
 * both follow: a short CSS selector relative to the container, the element's
 * tag, and the text it shows.
 */
export type ElementLocation = {
  /** Shortest `>`-chained selector, from the container, that matches this element only. */
  readonly selector: string;
  readonly tag: string;
  /** What the element says (its text, label, placeholder or alt), shortened. */
  readonly text?: string;
};

const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="tab"]';
const IDENTIFIER = /^-?[A-Za-z_][\w-]*$/;
const TEXT_LIMIT = 40;

/**
 * What a click on `element` is about: the control it belongs to (a click on the
 * icon inside a button is about the button), else the element itself.
 */
export const pickableElement = (element: Element, container: Element): Element => {
  const control = element.closest(INTERACTIVE);
  return control !== null && control !== container && container.contains(control) ? control : element;
};

const shorten = (value: string): string | undefined => {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed === '') return undefined;
  const characters = Array.from(collapsed);
  return characters.length > TEXT_LIMIT ? `${characters.slice(0, TEXT_LIMIT).join('')}…` : collapsed;
};

const textOf = (element: Element): string | undefined => {
  const labelled = element.getAttribute('aria-label') ?? element.getAttribute('title');
  if (labelled) return shorten(labelled);
  const tag = element.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return shorten(element.getAttribute('placeholder') ?? element.getAttribute('name') ?? '');
  }
  if (tag === 'img') return shorten(element.getAttribute('alt') ?? '');
  return shorten(element.textContent ?? '');
};

const segmentOf = (element: Element): string => {
  const id = element.getAttribute('id');
  if (id && IDENTIFIER.test(id)) return `#${id}`;
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter((name) => IDENTIFIER.test(name))
    .slice(0, 2)
    .map((name) => `.${name}`)
    .join('');
  const parent = element.parentElement;
  const sameTag = parent ? Array.from(parent.children).filter((child) => child.tagName === element.tagName) : [];
  const nth = sameTag.length > 1 ? `:nth-of-type(${sameTag.indexOf(element) + 1})` : '';
  return `${tag}${classes}${nth}`;
};

const matchesOnly = (container: Element, selector: string, element: Element): boolean => {
  try {
    const matches = container.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
};

/** Locates `element` (a descendant of `container`) by the shortest unique selector chain. */
export const locateElement = (element: Element, container: Element): ElementLocation => {
  const segments: string[] = [];
  let node: Element | null = element;
  while (node !== null && node !== container) {
    const segment = segmentOf(node);
    segments.unshift(segment);
    if (segment.startsWith('#') || matchesOnly(container, segments.join(' > '), element)) break;
    node = node.parentElement;
  }
  const text = textOf(element);
  return {
    selector: segments.length === 0 ? ':scope' : segments.join(' > '),
    tag: element.tagName.toLowerCase(),
    ...(text === undefined ? {} : { text }),
  };
};

/** The element a selector from `locateElement` names, or `null` once the markup no longer has it. */
export const findLocated = (container: Element, selector: string): Element | null => {
  if (selector === ':scope') return container;
  try {
    return container.querySelector(selector);
  } catch {
    return null;
  }
};
