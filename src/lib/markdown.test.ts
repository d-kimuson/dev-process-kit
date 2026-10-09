import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('keeps a single line break as a break, the way the text was typed', () => {
    expect(renderMarkdown('one\ntwo')).toBe('<p>one<br>two</p>\n');
  });

  it('renders the usual inline and block syntax', () => {
    const html = renderMarkdown('**bold** and `code`\n\n- a\n- b');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul>\n<li>a</li>\n<li>b</li>\n</ul>');
  });

  it('shows raw HTML as text instead of running it', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\nhi <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('drops a link or image whose address could run script, keeping its text', () => {
    const html = renderMarkdown('[click](javascript:alert(1)) ![pic](JaVaScRiPt:alert(1)) [data](data:text/html,x)');
    expect(html).not.toContain('href');
    expect(html).not.toContain('<img');
    expect(html).toContain('click');
    expect(html).toContain('pic');
    expect(html).toContain('data');
  });

  it('opens a web link in a new tab and keeps a link into the page in place', () => {
    expect(renderMarkdown('[spec](https://example.com/a?b=1&c=2 "The spec")')).toBe(
      '<p><a href="https://example.com/a?b=1&amp;c=2" title="The spec" target="_blank" rel="noopener noreferrer">spec</a></p>\n',
    );
    expect(renderMarkdown('[next](#step=confirm)')).toBe('<p><a href="#step=confirm">next</a></p>\n');
  });
});
