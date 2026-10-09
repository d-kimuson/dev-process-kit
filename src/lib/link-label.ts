/**
 * The short label a link reads as, derived from its URL: `#86` for a GitHub
 * issue, `PROJ-123` for a Jira or Linear issue, a file or page name for a
 * design or a doc, and the host for anything else. `kind` says which service
 * it is, so a view can put that service's icon next to the label.
 */
export type LinkKind = 'github' | 'gitlab' | 'jira' | 'linear' | 'figma' | 'notion' | 'web';

export type LinkLabel = {
  readonly kind: LinkKind;
  /** The short form shown on a chip. */
  readonly text: string;
  /** The longer form for a tooltip: where the short one is ambiguous (`owner/repo#86`). */
  readonly title: string;
};

const ISSUE_KEY = /^[A-Z][A-Z0-9]+-\d+$/;

/** A slug as words: `Checkout-flow` → `Checkout flow`. */
const words = (slug: string): string => {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // A malformed escape stays as it was written.
  }
  return decoded.replace(/[-_+]+/g, ' ').trim();
};

const github = (host: string, parts: readonly string[]): LinkLabel | null => {
  if (host !== 'github.com') return null;
  const [owner, repo, section, number] = parts;
  if (owner === undefined) return { kind: 'github', text: 'GitHub', title: 'github.com' };
  if (repo === undefined) return { kind: 'github', text: owner, title: owner };
  const slug = `${owner}/${repo}`;
  if ((section === 'issues' || section === 'pull' || section === 'discussions') && number && /^\d+$/.test(number)) {
    return { kind: 'github', text: `#${number}`, title: `${slug}#${number}` };
  }
  if (section === 'commit' && number) {
    return { kind: 'github', text: number.slice(0, 7), title: `${slug}@${number}` };
  }
  return { kind: 'github', text: slug, title: slug };
};

const gitlab = (host: string, parts: readonly string[]): LinkLabel | null => {
  if (host !== 'gitlab.com') return null;
  const dash = parts.indexOf('-');
  const project = (dash < 0 ? parts : parts.slice(0, dash)).join('/');
  const section = dash < 0 ? undefined : parts[dash + 1];
  const number = dash < 0 ? undefined : parts[dash + 2];
  if (number && /^\d+$/.test(number)) {
    if (section === 'issues') return { kind: 'gitlab', text: `#${number}`, title: `${project}#${number}` };
    if (section === 'merge_requests') return { kind: 'gitlab', text: `!${number}`, title: `${project}!${number}` };
  }
  return { kind: 'gitlab', text: project || 'GitLab', title: project || host };
};

const jira = (url: URL, host: string, parts: readonly string[]): LinkLabel | null => {
  if (!host.endsWith('.atlassian.net') && !host.startsWith('jira.')) return null;
  const key =
    (parts[0] === 'browse' ? parts[1] : undefined) ??
    url.searchParams.get('selectedIssue') ??
    parts.find((part) => ISSUE_KEY.test(part));
  if (key && ISSUE_KEY.test(key)) return { kind: 'jira', text: key, title: `${host} ${key}` };
  return { kind: 'jira', text: 'Jira', title: host };
};

const linear = (host: string, parts: readonly string[]): LinkLabel | null => {
  if (host !== 'linear.app') return null;
  const key = parts[1] === 'issue' ? parts[2]?.toUpperCase() : undefined;
  if (key && ISSUE_KEY.test(key)) return { kind: 'linear', text: key, title: key };
  return { kind: 'linear', text: 'Linear', title: host };
};

const figma = (host: string, parts: readonly string[]): LinkLabel | null => {
  if (host !== 'figma.com') return null;
  const [section, , name] = parts;
  if ((section === 'file' || section === 'design' || section === 'proto' || section === 'board') && name) {
    const text = words(name);
    return { kind: 'figma', text, title: text };
  }
  return { kind: 'figma', text: 'Figma', title: host };
};

const notion = (host: string, parts: readonly string[]): LinkLabel | null => {
  if (host !== 'notion.so' && !host.endsWith('.notion.site')) return null;
  const page = parts.at(-1) ?? '';
  // A page path ends in its 32-hex id, after the title slug when there is one.
  const title = page.replace(/-?[0-9a-f]{32}$/i, '');
  const text = title === '' ? 'Notion' : words(title);
  return { kind: 'notion', text, title: text };
};

export const describeLink = (href: string): LinkLabel => {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { kind: 'web', text: href, title: href };
  }
  const host = url.hostname.replace(/^www\./, '');
  const parts = url.pathname.split('/').filter((part) => part !== '');
  return (
    github(host, parts) ??
    gitlab(host, parts) ??
    jira(url, host, parts) ??
    linear(host, parts) ??
    figma(host, parts) ??
    notion(host, parts) ?? { kind: 'web', text: host, title: href }
  );
};
