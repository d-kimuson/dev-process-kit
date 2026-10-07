/**
 * The header's version select: the version running the page, and every
 * published one once the reader reaches for the select. Picking one reloads
 * the page with `?dpk-version=`, and the entry the page loads hands it to that
 * version (`startEntry`). The listing is fetched lazily — on the first hover or
 * focus, not on every page view — and a page that cannot reach it still shows
 * the running version.
 */
import { html, type ReactiveController, type ReactiveControllerHost, type TemplateResult } from 'lit';

import { onSelectChange } from '../../lib/dom/events';
import { type Locale } from '../i18n';
import { coreMessages } from '../messages';
import { FRAMEWORK_VERSION } from '../version';
import { fetchPublishedVersions, switchPageTo, type FetchVersions } from '../version-loader';
import { presentVersionSelect, requestedVersion, type PublishedVersions } from '../version-switch';

export type VersionChoiceOptions = {
  readonly fetchVersions?: FetchVersions;
  readonly switchTo?: (version: string | null) => void;
};

export class VersionChoiceController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #fetchVersions: FetchVersions;
  readonly #switchTo: (version: string | null) => void;
  #published: PublishedVersions | null = null;
  #loading = false;

  constructor(host: ReactiveControllerHost, options: VersionChoiceOptions = {}) {
    this.#host = host;
    this.#fetchVersions = options.fetchVersions ?? fetchPublishedVersions;
    this.#switchTo = options.switchTo ?? switchPageTo;
    host.addController(this);
  }

  hostConnected(): void {}

  /** Fetches the listing the first time the reader reaches for the select; again after a failure. */
  load(): void {
    if (this.#loading || this.#published !== null) return;
    this.#loading = true;
    this.#fetchVersions().then(
      (published) => {
        this.#published = published;
        this.#loading = false;
        this.#host.requestUpdate();
      },
      (error: unknown) => {
        this.#loading = false;
        console.warn('dev-process-kit: could not list the published versions', error);
      },
    );
  }

  pick(value: string): void {
    if (value === FRAMEWORK_VERSION) return;
    this.#switchTo(value === '' ? null : value);
  }

  render(locale: Locale): TemplateResult {
    const messages = coreMessages(locale);
    const model = presentVersionSelect({
      current: FRAMEWORK_VERSION,
      requested: requestedVersion(location.search) !== null,
      published: this.#published,
      text: { pinned: messages.versionPinned, latest: messages.versionLatest },
    });
    const load = (): void => this.load();
    return html`<span class="dpk-version"
      >dev-process-kit@<select
        class="dpk-version-select"
        aria-label=${messages.versionLabel}
        title=${messages.versionLabel}
        @pointerenter=${load}
        @focus=${load}
        @change=${onSelectChange((value) => this.pick(value))}
      >
        ${model.options.map(
          (option) =>
            html`<option value=${option.value} ?selected=${option.value === model.value}>${option.label}</option>`,
        )}
      </select></span
    >`;
  }
}
