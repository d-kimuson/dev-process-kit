export type ComposerViewModel = {
  readonly body: string;
  readonly notes: readonly string[];
  readonly submission: string | null;
  readonly label: string | null;
  readonly error: string | null;
};

export const presentComposer = (
  body: string,
  notes: readonly string[],
  context: { readonly label?: string; readonly error?: string } = {},
): ComposerViewModel => ({
  body,
  notes,
  submission: body.trim() || null,
  label: context.label ?? null,
  error: context.error ?? null,
});
