const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** The letter a member's avatar shows: the first character of their name, or "?" for a blank one. */
export const initialOf = (name: string): string => {
  const [first] = graphemes.segment(name.trim());
  return first ? first.segment.toUpperCase() : '?';
};
