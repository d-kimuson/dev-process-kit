/** One kind of comment the composer can write, such as feedback or a note kept on the element. */
export type ComposerOption = {
  readonly value: string;
  readonly label: string;
  /** What this kind of comment does, shown under the choice while it is picked. */
  readonly hint?: string;
};

/** A choice of what kind of comment to write, above the text box. */
export type ComposerChoice = {
  readonly label: string;
  readonly value: string;
  readonly options: readonly ComposerOption[];
};

export type ComposerViewModel = {
  readonly body: string;
  readonly notes: readonly string[];
  readonly submission: string | null;
  readonly label: string | null;
  readonly error: string | null;
  /** What the comment is on (its target), so unsent text comes back to this composer only. */
  readonly key: string | null;
  readonly choice: ComposerChoice | null;
  /** The submit button's text, when it is not the plain "Send". */
  readonly submitLabel: string | null;
};

export const presentComposer = (
  body: string,
  notes: readonly string[],
  context: {
    readonly label?: string;
    readonly error?: string;
    readonly key?: string;
    readonly choice?: ComposerChoice;
    readonly submitLabel?: string;
  } = {},
): ComposerViewModel => ({
  body,
  notes,
  submission: body.trim() || null,
  label: context.label ?? null,
  error: context.error ?? null,
  key: context.key ?? null,
  choice: context.choice ?? null,
  submitLabel: context.submitLabel ?? null,
});
