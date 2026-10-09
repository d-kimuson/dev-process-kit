import { describe, expect, it } from 'vitest';

import { describeLink } from './link-label';

describe('describeLink', () => {
  it.each([
    ['https://github.com/acme/web/issues/86', 'github', '#86', 'acme/web#86'],
    ['https://github.com/acme/web/pull/120/files', 'github', '#120', 'acme/web#120'],
    ['https://github.com/acme/web/commit/0123456789abcdef', 'github', '0123456', 'acme/web@0123456789abcdef'],
    ['https://github.com/acme/web', 'github', 'acme/web', 'acme/web'],
    ['https://gitlab.com/acme/shop/web/-/merge_requests/7', 'gitlab', '!7', 'acme/shop/web!7'],
    ['https://gitlab.com/acme/web/-/issues/3', 'gitlab', '#3', 'acme/web#3'],
    ['https://acme.atlassian.net/browse/SHOP-123', 'jira', 'SHOP-123', 'acme.atlassian.net SHOP-123'],
    [
      'https://acme.atlassian.net/jira/software/projects/SHOP/boards/1?selectedIssue=SHOP-9',
      'jira',
      'SHOP-9',
      'acme.atlassian.net SHOP-9',
    ],
    ['https://linear.app/acme/issue/ENG-42/fix-the-cart', 'linear', 'ENG-42', 'ENG-42'],
    ['https://www.figma.com/design/AbC123/Checkout-flow?node-id=1-2', 'figma', 'Checkout flow', 'Checkout flow'],
    [
      'https://www.notion.so/acme/Refund-policy-0123456789abcdef0123456789abcdef',
      'notion',
      'Refund policy',
      'Refund policy',
    ],
    ['https://docs.example.com/guide/refunds', 'web', 'docs.example.com', 'https://docs.example.com/guide/refunds'],
  ])('reads %s as %s %s', (url, kind, text, title) => {
    expect(describeLink(url)).toEqual({ kind, text, title });
  });

  it('keeps an unparsable link as it was written', () => {
    expect(describeLink('not a url')).toEqual({ kind: 'web', text: 'not a url', title: 'not a url' });
  });
});
