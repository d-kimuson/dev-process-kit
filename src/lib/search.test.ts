import { describe, expect, it } from 'vitest';

import { matchesQuery } from './search';

describe('matchesQuery', () => {
  it('matches everything for an empty query', () => {
    expect(matchesQuery('Checkout', '')).toBe(true);
    expect(matchesQuery('Checkout', '   ')).toBe(true);
  });

  it('finds a part of the text, whatever its case', () => {
    expect(matchesQuery('Search by keyword', 'KEY')).toBe(true);
    expect(matchesQuery('Search by keyword', 'cart')).toBe(false);
  });

  it('needs every word of the query, in any order', () => {
    expect(matchesQuery('Pay by card at checkout', 'checkout card')).toBe(true);
    expect(matchesQuery('Pay by card at checkout', 'checkout coupon')).toBe(false);
  });

  it('reads full-width and half-width forms, and katakana and hiragana, as the same', () => {
    expect(matchesQuery('カートに入れる', 'かーと')).toBe(true);
    expect(matchesQuery('ＳＫＵで検索', 'sku')).toBe(true);
    expect(matchesQuery('ｶｰﾄ', 'カート')).toBe(true);
    expect(matchesQuery('商品を探す', '商品　探す')).toBe(true);
  });
});
