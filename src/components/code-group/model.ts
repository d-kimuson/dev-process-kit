import * as v from 'valibot';

export type CodeGroupVariant = {
  readonly label: string;
  readonly language: string;
  readonly code: string;
};

export type CodeGroupData = {
  readonly label: string;
  readonly variants: readonly CodeGroupVariant[];
};

export const emptyCodeGroupData = (): CodeGroupData => ({ label: '', variants: [] });

const variantSchema = v.strictObject({
  label: v.pipe(v.string(), v.minLength(1)),
  language: v.optional(v.string(), ''),
  code: v.pipe(v.string(), v.minLength(1)),
});

const codeGroupSchema = v.strictObject({
  label: v.optional(v.string(), ''),
  variants: v.pipe(v.array(variantSchema), v.minLength(1)),
});

export const parseCodeGroupData = (input: unknown): CodeGroupData => {
  const parsed = v.parse(codeGroupSchema, input);
  const labels = new Set<string>();
  for (const variant of parsed.variants) {
    if (labels.has(variant.label)) throw new Error(`duplicate variant label: ${variant.label}`);
    labels.add(variant.label);
  }
  return parsed;
};
