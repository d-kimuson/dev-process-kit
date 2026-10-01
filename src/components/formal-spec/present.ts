import type { FormalSpecMessages } from './messages';

import {
  claimGroups,
  isConditional,
  plainText,
  type Assurance,
  type Claim,
  type FormalSpecData,
  type RichText,
} from './model';

/**
 * Green: holds everywhere. Amber: holds with a caveat the reader must accept.
 * Red: not guaranteed. Blue: not attempted yet, proposed for agreement.
 */
export type AssuranceTone = 'sound' | 'caveat' | 'unsound' | 'planned';

export type AssuranceView = {
  readonly tone: AssuranceTone;
  readonly label: string;
  /** What the label means, for the badge's tooltip. */
  readonly detail: string;
  /** What the items are (assumptions, bound, gaps), or null when there are none to show. */
  readonly itemsLabel: string | null;
  readonly items: readonly RichText[];
};

const listed = (label: string, items: readonly RichText[]) =>
  items.length === 0 ? { itemsLabel: null, items } : { itemsLabel: label, items };

export const presentAssurance = (m: FormalSpecMessages, assurance: Assurance): AssuranceView => {
  switch (assurance.kind) {
    case 'proved':
      return isConditional(assurance)
        ? {
            tone: 'caveat',
            label: m.conditional,
            detail: m.conditionalDetail,
            ...listed(m.assumptions, assurance.assumptions),
          }
        : { tone: 'sound', label: m.proved, detail: m.provedDetail, ...listed('', []) };
    case 'bounded':
      return { tone: 'caveat', label: m.bounded, detail: m.boundedDetail, ...listed(m.bound, [assurance.bound]) };
    case 'incomplete':
      return { tone: 'unsound', label: m.incomplete, detail: m.incompleteDetail, ...listed(m.gaps, assurance.gaps) };
    case 'planned':
      return { tone: 'planned', label: m.planned, detail: m.plannedDetail, ...listed('', []) };
  }
};

/** Where an element comment points, before the component prefixes its own id. */
export type SpecTarget =
  | { readonly kind: 'target'; readonly target: string }
  | { readonly kind: 'claim'; readonly claim: string }
  | { readonly kind: 'clause'; readonly claim: string; readonly clause: string };

export const targetSegments = (target: SpecTarget): readonly [string, ...string[]] => {
  switch (target.kind) {
    case 'target':
      return ['target', target.target];
    case 'claim':
      return ['claim', target.claim];
    case 'clause':
      return ['clause', target.claim, target.clause];
  }
};

const clauses = (claim: Claim) => [
  ...claim.subjects,
  ...claim.premises,
  ...claim.conclusions,
  ...claim.examples,
  ...claim.notClaimed,
];

type LabelledTarget = { readonly target: SpecTarget; readonly label: string };

const CLAIM_LABEL_LENGTH = 32;

/** A claim has no name of its own: the review rail shows the start of its statement. */
export const claimLabel = (claim: Claim): string => {
  const statement = plainText(claim.statement);
  return statement.length <= CLAIM_LABEL_LENGTH ? statement : `${statement.slice(0, CLAIM_LABEL_LENGTH).trimEnd()}…`;
};

const claimTargets = (claim: Claim): readonly LabelledTarget[] => [
  { target: { kind: 'claim', claim: claim.id }, label: claimLabel(claim) },
  ...clauses(claim).map((clause) => ({
    target: { kind: 'clause' as const, claim: claim.id, clause: clause.id },
    label: `${claimLabel(claim)} › ${plainText(clause.text)}`,
  })),
];

/**
 * Every commentable element with the label the review rail shows for it, in
 * reading order. A clause is labelled with its claim, since its text alone
 * rarely says which.
 */
export const specTargets = (data: FormalSpecData): readonly LabelledTarget[] =>
  claimGroups(data).flatMap((group) => [
    ...(group.target === null
      ? []
      : [{ target: { kind: 'target' as const, target: group.target.id }, label: group.target.name }]),
    ...group.claims.flatMap(claimTargets),
  ]);
