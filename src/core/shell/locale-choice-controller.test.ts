import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCALE_CHANGE_EVENT } from '../i18n';
import { LocaleChoiceController } from './locale-choice-controller';

const STORAGE_KEY = 'dev-process-kit:locale';

/** A bare host: just enough of `ReactiveControllerHost & HTMLElement` for the controller to drive. */
const makeHost = (lang: string | null): { host: HTMLElement; requestUpdate: () => void; updateCount: number } => {
  const host = document.createElement('div');
  if (lang !== null) host.setAttribute('lang', lang);
  document.body.append(host);
  const state = { updateCount: 0 };
  Object.assign(host, {
    addController: () => {},
    requestUpdate: () => {
      state.updateCount += 1;
    },
  });
  return { host, requestUpdate: () => state.updateCount, updateCount: state.updateCount };
};

describe('LocaleChoiceController', () => {
  afterEach(() => {
    document.body.replaceChildren();
    localStorage.removeItem(STORAGE_KEY);
  });

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('persists a pick and resolves it again on a later connect (root usage)', () => {
    const { host } = makeHost('ja');
    const onChange = () => {};
    const first = new LocaleChoiceController(
      host as never,
      () => true,
      () => true,
      onChange,
    );
    first.hostConnected();
    first.pick('en');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('"en"');

    // A fresh controller over a fresh host, as a reload would produce.
    const { host: host2 } = makeHost('ja');
    const second = new LocaleChoiceController(
      host2 as never,
      () => true,
      () => true,
      onChange,
    );
    second.hostConnected();
    expect(second.locale).toBe('en');
  });

  it('an inactive (board) controller never reads, writes, or dispatches: it leaves the page pick alone', () => {
    // A page already persisted "en".
    localStorage.setItem(STORAGE_KEY, JSON.stringify('en'));

    const { host } = makeHost(null);
    let dispatched = 0;
    document.addEventListener(LOCALE_CHANGE_EVENT, () => {
      dispatched += 1;
    });

    const board = new LocaleChoiceController(
      host as never,
      () => true,
      () => false, // inactive: this host is a board, not the page
      () => {},
    );
    board.hostConnected();

    // Inactive: never read the stored preference, never touched the host's own `lang`,
    // never dispatched the global change event the page's own pick would fire.
    expect(host.hasAttribute('lang')).toBe(false);
    expect(dispatched).toBe(0);
    // And, critically, the page's real preference in storage is untouched.
    expect(localStorage.getItem(STORAGE_KEY)).toBe('"en"');
  });

  it('an inactive controller ignores pick(), so it cannot clobber the page storage key', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify('en'));
    const { host } = makeHost(null);
    const board = new LocaleChoiceController(
      host as never,
      () => true,
      () => false,
      () => {},
    );
    board.hostConnected();
    board.pick('ja');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('"en"');
  });
});
