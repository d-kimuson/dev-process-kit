/** What the dependency graph needs of a story: who it is and whom it waits on. */
type Node = { readonly id: string; readonly blockedBy?: readonly string[] };

const edgesOf = (stories: readonly Node[]): ReadonlyMap<string, readonly string[]> =>
  new Map(stories.map((story) => [story.id, story.blockedBy ?? []]));

/** Whether `from` waits on `to`, directly or through the stories it waits on. */
export const waitsOn = (stories: readonly Node[], from: string, to: string): boolean => {
  const edges = edgesOf(stories);
  const seen = new Set<string>();
  const stack = [...(edges.get(from) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop();
    if (id === undefined || seen.has(id)) continue;
    if (id === to) return true;
    seen.add(id);
    stack.push(...(edges.get(id) ?? []));
  }
  return false;
};

/** The first cycle of stories waiting on one another, as the ids along it; `null` when there is none. */
export const findBlockerCycle = (stories: readonly Node[]): readonly string[] | null => {
  const edges = edgesOf(stories);
  const done = new Set<string>();
  const visit = (id: string, path: readonly string[]): readonly string[] | null => {
    const at = path.indexOf(id);
    if (at >= 0) return [...path.slice(at), id];
    if (done.has(id)) return null;
    for (const next of edges.get(id) ?? []) {
      const cycle = visit(next, [...path, id]);
      if (cycle) return cycle;
    }
    done.add(id);
    return null;
  };
  for (const story of stories) {
    const cycle = visit(story.id, []);
    if (cycle) return cycle;
  }
  return null;
};
