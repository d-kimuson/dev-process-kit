import * as v from 'valibot';

import { entityIdSchema } from '../../core/schema';

/**
 * Domain model of a formal specification read by people who do not read the
 * formal language: what each claim is about (its target: a function, a
 * protocol …), what it says, under which premises, about which terms, and how
 * strongly it is guaranteed — or that it is only planned. How it was proved is deliberately
 * absent — the checker already vouches for that; the reader's job is to judge
 * whether the statement says what was meant.
 *
 * Text may reference a term as `[[id]]` or `[[id|label]]`. A reference to an
 * unknown term (or an unknown target) is a parse error, so a claim can never
 * point at something the page does not show.
 */

/* ------------------------------------------------------------------- schema */

const textSchema = v.pipe(v.string(), v.trim(), v.minLength(1));

const clauseSchema = v.strictObject({ id: entityIdSchema, text: textSchema });

const assuranceSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('proved'), assumptions: v.optional(v.array(textSchema)) }),
  v.strictObject({ kind: v.literal('bounded'), bound: textSchema }),
  v.strictObject({ kind: v.literal('incomplete'), gaps: v.optional(v.array(textSchema)) }),
  v.strictObject({ kind: v.literal('planned') }),
]);

const claimSchema = v.strictObject({
  id: entityIdSchema,
  target: v.optional(entityIdSchema),
  statement: textSchema,
  subjects: v.optional(v.array(clauseSchema)),
  premises: v.optional(v.array(clauseSchema)),
  conclusions: v.pipe(v.array(clauseSchema), v.minLength(1, 'a claim needs at least one conclusion')),
  examples: v.optional(v.array(clauseSchema)),
  notClaimed: v.optional(v.array(clauseSchema)),
  assurance: assuranceSchema,
  source: v.optional(v.strictObject({ tool: v.optional(textSchema), ref: textSchema })),
});

const termSchema = v.strictObject({ id: entityIdSchema, name: textSchema, meaning: textSchema });

const targetSchema = v.strictObject({
  id: entityIdSchema,
  name: textSchema,
  code: v.optional(textSchema),
  summary: v.optional(textSchema),
});

const specSchema = v.strictObject({
  targets: v.optional(v.array(targetSchema)),
  terms: v.optional(v.array(termSchema)),
  claims: v.array(claimSchema),
});

/* -------------------------------------------------------------------- types */

/** A run of plain text, or a reference to a term shown with its own label. */
export type Inline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'term'; readonly id: string; readonly label: string };

export type RichText = readonly Inline[];

/** One line of a claim (a subject, a premise, a conclusion, an example …): a comment target. */
export type Clause = { readonly id: string; readonly text: RichText };

/**
 * How strongly a claim holds, independent of the tool that checked it.
 * - `proved` — for every case; `assumptions` lists what it additionally trusts (axioms, external code).
 * - `bounded` — exhaustively checked, but only within `bound` (model checking).
 * - `incomplete` — the proof has holes (`sorry`, `Admitted`); nothing is guaranteed.
 * - `planned` — not attempted yet: a property proposed for agreement before the work starts.
 */
export type Assurance =
  | { readonly kind: 'proved'; readonly assumptions: readonly RichText[] }
  | { readonly kind: 'bounded'; readonly bound: RichText }
  | { readonly kind: 'incomplete'; readonly gaps: readonly RichText[] }
  | { readonly kind: 'planned' };

/** What a group of claims is about: a function, a module, a protocol … */
export type Target = {
  readonly id: string;
  /** How a reader calls it, in plain words. */
  readonly name: string;
  /** Its identifier in the code, for the readers who look it up. */
  readonly code: string | null;
  readonly summary: RichText | null;
};

export type Claim = {
  readonly id: string;
  readonly target: string | null;
  /** The claim itself, in one sentence: what the card shows folded. */
  readonly statement: RichText;
  readonly subjects: readonly Clause[];
  readonly premises: readonly Clause[];
  readonly conclusions: readonly Clause[];
  readonly examples: readonly Clause[];
  readonly notClaimed: readonly Clause[];
  readonly assurance: Assurance;
  readonly source: { readonly tool: string | null; readonly ref: string } | null;
  /** Terms the claim's text references, in order of first appearance. Derived, never authored. */
  readonly terms: readonly string[];
};

export type Term = {
  readonly id: string;
  readonly name: string;
  readonly meaning: RichText;
};

export type FormalSpecData = {
  readonly targets: readonly Target[];
  readonly terms: readonly Term[];
  readonly claims: readonly Claim[];
};

export const emptyFormalSpecData = (): FormalSpecData => ({ targets: [], terms: [], claims: [] });

/* ---------------------------------------------------------------- rich text */

const TERM_REFERENCE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Splits `[[id]]` / `[[id|label]]` references out of a text. Unknown ids throw. */
export const parseRichText = (source: string, terms: ReadonlyMap<string, string>): RichText => {
  const inlines: Inline[] = [];
  let cursor = 0;
  for (const match of source.matchAll(TERM_REFERENCE)) {
    const id = (match[1] ?? '').trim();
    const name = terms.get(id);
    if (name === undefined) throw new Error(`unknown term reference: [[${id}]]`);
    if (match.index > cursor) inlines.push({ kind: 'text', text: source.slice(cursor, match.index) });
    inlines.push({ kind: 'term', id, label: match[2]?.trim() || name });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) inlines.push({ kind: 'text', text: source.slice(cursor) });
  return inlines;
};

export const plainText = (text: RichText): string =>
  text.map((inline) => (inline.kind === 'text' ? inline.text : inline.label)).join('');

const termIds = (texts: readonly RichText[]): readonly string[] => [
  ...new Set(texts.flatMap((text) => text.flatMap((inline) => (inline.kind === 'term' ? [inline.id] : [])))),
];

/* ------------------------------------------------------------------ parsing */

const unique = (ids: readonly string[], what: string): void => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`duplicate ${what} id: ${id}`);
    seen.add(id);
  }
};

export const parseFormalSpecData = (input: unknown): FormalSpecData => {
  const parsed = v.parse(specSchema, input);
  const rawTargets = parsed.targets ?? [];
  const rawTerms = parsed.terms ?? [];
  unique(
    rawTargets.map((target) => target.id),
    'target',
  );
  unique(
    rawTerms.map((term) => term.id),
    'term',
  );
  unique(
    parsed.claims.map((claim) => claim.id),
    'claim',
  );
  const names = new Map(rawTerms.map((term) => [term.id, term.name]));
  const rich = (text: string): RichText => parseRichText(text, names);

  const terms = rawTerms.map((term): Term => ({ id: term.id, name: term.name, meaning: rich(term.meaning) }));
  const targets = rawTargets.map((target): Target => ({
    id: target.id,
    name: target.name,
    code: target.code ?? null,
    summary: target.summary === undefined ? null : rich(target.summary),
  }));
  const targetIds = new Set(targets.map((target) => target.id));
  const claims = parsed.claims.map((claim): Claim => {
    if (claim.target !== undefined && !targetIds.has(claim.target))
      throw new Error(`unknown target (in claim ${claim.id}): ${claim.target}`);
    const clauses = (list: readonly { id: string; text: string }[] | undefined): readonly Clause[] =>
      (list ?? []).map((clause) => ({ id: clause.id, text: rich(clause.text) }));
    const subjects = clauses(claim.subjects);
    const premises = clauses(claim.premises);
    const conclusions = clauses(claim.conclusions);
    const examples = clauses(claim.examples);
    const notClaimed = clauses(claim.notClaimed);
    const all = [...subjects, ...premises, ...conclusions, ...examples, ...notClaimed];
    unique(
      all.map((clause) => clause.id),
      `clause (in claim ${claim.id})`,
    );
    const assurance = parseAssurance(claim.assurance, rich);
    const statement = rich(claim.statement);
    return {
      id: claim.id,
      target: claim.target ?? null,
      statement,
      subjects,
      premises,
      conclusions,
      examples,
      notClaimed,
      assurance,
      source: claim.source === undefined ? null : { tool: claim.source.tool ?? null, ref: claim.source.ref },
      terms: termIds([statement, ...all.map((clause) => clause.text), ...assuranceTexts(assurance)]),
    };
  });
  return { targets, terms, claims };
};

const parseAssurance = (raw: v.InferOutput<typeof assuranceSchema>, rich: (text: string) => RichText): Assurance => {
  switch (raw.kind) {
    case 'proved':
      return { kind: 'proved', assumptions: (raw.assumptions ?? []).map(rich) };
    case 'bounded':
      return { kind: 'bounded', bound: rich(raw.bound) };
    case 'incomplete':
      return { kind: 'incomplete', gaps: (raw.gaps ?? []).map(rich) };
    case 'planned':
      return { kind: 'planned' };
  }
};

const assuranceTexts = (assurance: Assurance): readonly RichText[] => {
  switch (assurance.kind) {
    case 'proved':
      return assurance.assumptions;
    case 'bounded':
      return [assurance.bound];
    case 'incomplete':
      return assurance.gaps;
    case 'planned':
      return [];
  }
};

/* ---------------------------------------------------------------- structure */

/** How the claims split by assurance, for the toolbar summary: a proof with assumptions counts apart. */
export const assuranceCounts = (data: FormalSpecData): Readonly<Record<Assurance['kind'] | 'conditional', number>> => {
  const counts = { proved: 0, conditional: 0, bounded: 0, incomplete: 0, planned: 0 };
  for (const claim of data.claims) counts[isConditional(claim.assurance) ? 'conditional' : claim.assurance.kind] += 1;
  return counts;
};

/** A proof that trusts extra assumptions reads differently from a plain one. */
export const isConditional = (assurance: Assurance): boolean =>
  assurance.kind === 'proved' && assurance.assumptions.length > 0;

export type ClaimGroup = { readonly target: Target | null; readonly claims: readonly Claim[] };

/**
 * Claims grouped by what they are about, in reading order: a group starts where
 * its first claim appears, claims without a target form one group of their own,
 * and a target without claims yet (a plan in progress) closes the list.
 */
export const claimGroups = (data: FormalSpecData): readonly ClaimGroup[] => {
  const byTarget = new Map(data.targets.map((target) => [target.id, target]));
  const groups = new Map<string | null, Claim[]>();
  for (const claim of data.claims) groups.set(claim.target, [...(groups.get(claim.target) ?? []), claim]);
  for (const target of data.targets) if (!groups.has(target.id)) groups.set(target.id, []);
  return [...groups].map(([id, claims]) => ({ target: id === null ? null : (byTarget.get(id) ?? null), claims }));
};
