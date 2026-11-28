/** One choice in an action's menu. */
export type SelectionBarOption = {
  readonly value: string;
  readonly label: string;
  /**
   * Set for an on/off choice: whether the selection has it (`'mixed'`: some of
   * it does). Such a menu stays open, so several can be switched in a row.
   */
  readonly checked?: boolean | 'mixed';
  readonly disabled?: boolean;
  /** A short figure beside the label, such as `2/3`. */
  readonly hint?: string;
};

/**
 * One button on the bar. With `options` (or `entry`) it opens a menu of
 * choices instead of acting at once.
 */
export type SelectionBarAction = {
  readonly name: string;
  readonly label: string;
  readonly tone?: 'accent';
  readonly disabled?: boolean;
  readonly options?: readonly SelectionBarOption[];
  /** A text field at the end of the menu; Enter sends its text as the value. */
  readonly entry?: { readonly placeholder: string };
};

/** `dpk-selection-action`: the action pressed, and the menu's choice or the entry's text. */
export type SelectionBarActionDetail = {
  readonly action: string;
  readonly value: string | null;
  /** Whether `value` was typed into the entry rather than chosen from the options. */
  readonly entered: boolean;
  /** Where the pressed control is on screen, for a popup the host opens from it. */
  readonly rect: DOMRect;
};
