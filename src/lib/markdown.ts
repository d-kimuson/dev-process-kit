import { Marked, type Tokens } from 'marked';

/**
 * Markdown -> HTML for text a person wrote into the page (an author's base
 * data, a reader's edit), so it is shown, never run: raw HTML comes out as
 * text, and a link or image only keeps an address that cannot run script.
 * A single line break stays a break, the way the text was typed.
 */

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);

/** A relative address, a fragment, or a scheme that only navigates. */
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto']);

const safeHref = (href: string): boolean => {
  // Browsers ignore whitespace and control characters inside a scheme.
  // oxlint-disable-next-line no-control-regex -- matching them is the point
  const compact = href.replace(/[\u0000- \u007f]/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1];
  return scheme === undefined || SAFE_SCHEMES.has(scheme.toLowerCase());
};

const external = (href: string): boolean => /^https?:/i.test(href.trim());

const markdown = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag): string {
      return escapeHtml(text);
    },
    link({ href, title, tokens }: Tokens.Link): string {
      const text = this.parser.parseInline(tokens);
      if (!safeHref(href)) return text;
      const titled = title ? ` title="${escapeHtml(title)}"` : '';
      const target = external(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${escapeHtml(href)}"${titled}${target}>${text}</a>`;
    },
    image({ href, title, text }: Tokens.Image): string {
      if (!safeHref(href)) return escapeHtml(text);
      const titled = title ? ` title="${escapeHtml(title)}"` : '';
      return `<img src="${escapeHtml(href)}" alt="${escapeHtml(text)}"${titled}>`;
    },
  },
});

export const renderMarkdown = (source: string): string => {
  return markdown.parse(source, { async: false });
};
