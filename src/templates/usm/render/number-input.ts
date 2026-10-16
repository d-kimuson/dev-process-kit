import { onInputChange } from '../../../lib/dom/events';

/**
 * A `change` handler for a number input that only takes a finite number of
 * at least 0. Anything else (empty, negative) puts `current` back in the
 * input; the same number is no change. A changed one goes to `commit`.
 */
export const onNumberChange = (current: number, commit: (value: number) => void): ((event: Event) => void) =>
  onInputChange((text, input) => {
    const value = text.trim() === '' ? Number.NaN : Number(text);
    if (!Number.isFinite(value) || value < 0) {
      input.value = String(current);
      return;
    }
    if (value !== current) commit(value);
  });
