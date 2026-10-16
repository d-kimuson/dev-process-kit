/** Katakana (ァ–ヶ) sits 0x60 above the hiragana with the same reading. */
const KATAKANA = /[ァ-ヶ]/g;

/**
 * The form text is compared in: full-width and half-width forms unified
 * (NFKC), lower case, and katakana read as hiragana, so a reader finds
 * "カート" by typing "かーと".
 */
const fold = (text: string): string =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(KATAKANA, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));

/**
 * Whether `text` holds every word of `query` (split at white space, in any
 * order), compared in the folded form. An empty query matches everything.
 */
export const matchesQuery = (text: string, query: string): boolean => {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const folded = fold(text);
  return words.every((word) => folded.includes(word));
};
