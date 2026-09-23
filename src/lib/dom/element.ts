/**
 * Narrows an unknown value to a DOM element type using `instanceof`.
 *
 * `event.target`, `event.currentTarget` and queried nodes are typed loosely, and
 * reading a control's value needs a runtime check. `instanceof` keeps that check
 * honest, where a type assertion would only silence the compiler.
 */
export const elementOf = <T extends Element>(value: unknown, type: new () => T): T | null => {
  return value instanceof type ? value : null;
};
