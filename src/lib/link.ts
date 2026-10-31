import * as v from 'valibot';

/** Only web links: a link never points at `javascript:` or a local file. */
export const httpUrlSchema = v.pipe(
  v.string(),
  v.url(),
  v.check((url) => /^https?:\/\//i.test(url), 'a link must be an http(s) URL'),
);
