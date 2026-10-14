/** What a field is set to: the text typed into it (or the option picked), or whether a box is checked. */
export type FieldValue = string | boolean;

const matches = (root: ParentNode, selector: string): readonly Element[] => {
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    // Not a selector at all: it matches nothing, and the caller reports it like any other miss.
    return [];
  }
};

/**
 * Sets a value through the prototype's own setter, as typing does, so a
 * script that wraps the element's `value` (a framework's controlled input)
 * still sees the change.
 */
const setValue = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void => {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
  if (descriptor?.set) descriptor.set.call(element, value);
  else element.value = value;
};

const isToggle = (element: Element): element is HTMLInputElement =>
  element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio');

/** Sets one element; returns whether it changed something the page should hear about. */
const fillOne = (element: Element, value: FieldValue): boolean => {
  if (isToggle(element)) {
    // A string names the one of a group to check; a boolean checks or clears every match.
    const checked = typeof value === 'boolean' ? value : element.value === value;
    if (typeof value === 'string' && !checked) return false;
    element.checked = checked;
    return true;
  }
  const text = String(value);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    setValue(element, text);
    return true;
  }
  element.textContent = text;
  return false;
};

/**
 * Fills `root`'s fields as a user would: each selector's matches get the
 * value (a field's text, the option of a select, the radio of that value, a
 * checkbox's state, or the text of any other element) and hear `input` and
 * `change`, so the page reacts as to typing. Returns the selectors that
 * matched nothing.
 */
export const fillFields = (root: ParentNode, fill: Readonly<Record<string, FieldValue>>): readonly string[] => {
  const missed: string[] = [];
  for (const [selector, value] of Object.entries(fill)) {
    const found = matches(root, selector);
    if (found.length === 0) missed.push(selector);
    for (const element of found) {
      if (!fillOne(element, value)) continue;
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
  return missed;
};

/** Clicks the first match of each selector, in order. Returns the selectors that matched nothing. */
export const clickElements = (root: ParentNode, selectors: readonly string[]): readonly string[] => {
  const missed: string[] = [];
  for (const selector of selectors) {
    const [element] = matches(root, selector);
    if (element instanceof HTMLElement) element.click();
    else missed.push(selector);
  }
  return missed;
};
