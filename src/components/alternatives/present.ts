import type { AlternativesMessages } from './messages';
import type { AlternativeOption, AlternativeStatus, AlternativesData } from './model';

/**
 * What one option card shows, derived from the domain model and the dictionary.
 *
 * Presentation only: no DOM, no element state. The status is the tone — the one
 * place that mapping lives, so the element never decides that "rejected" means
 * amber.
 */
export type AlternativeView = {
  readonly id: string;
  readonly status: AlternativeStatus;
  /** The option's id, shown as a key only when the title is something else. */
  readonly key: string | null;
  readonly title: string;
  readonly statusLabel: string;
  readonly summary: string | null;
  readonly reason: { readonly label: string; readonly text: string } | null;
  readonly tradeoffs: { readonly label: string; readonly items: readonly string[] } | null;
};

export const presentStatus = (m: AlternativesMessages, status: AlternativeStatus): string => {
  switch (status) {
    case 'adopted':
      return m.adopted;
    case 'rejected':
      return m.rejected;
    case 'considered':
      return m.considered;
  }
};

export const presentAlternative = (m: AlternativesMessages, option: AlternativeOption): AlternativeView => ({
  id: option.id,
  status: option.status,
  key: option.label === option.id ? null : option.id,
  title: option.label,
  statusLabel: presentStatus(m, option.status),
  summary: option.summary,
  reason: option.reason === null ? null : { label: m.reason, text: option.reason },
  tradeoffs: option.tradeoffs.length === 0 ? null : { label: m.tradeoffs, items: option.tradeoffs },
});

/** Every option card, in authored order. */
export const presentAlternatives = (m: AlternativesMessages, data: AlternativesData): readonly AlternativeView[] =>
  data.options.map((option) => presentAlternative(m, option));
