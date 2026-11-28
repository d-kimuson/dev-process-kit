/**
 * A story's detail, as the side panel shows it.
 *
 * The panel draws it in its own shadow root, where the view's CSS does not
 * reach, so the detail carries its styles and the state only it uses: the
 * text it just copied and the search typed into a dependency picker. The panel
 * keys it on the story, so both go when another story is shown.
 *
 * Internal to the USM view: registered by the `usm` entry, not exported from
 * `components.js`.
 */
import { LitElement, nothing, type CSSResultGroup, type PropertyDeclarations, type TemplateResult } from 'lit';

import type { ViewRenderContext } from '../../../core/shell/contracts';
import type { UsmMessages } from '../messages';
import type { UserStory, UsmState } from '../model';

import { controlAtom } from '../../../components/atoms/controls';
import { linkStyles } from '../../../components/atoms/link';
import { controls, tokens } from '../../../core/theme';
import { copyText } from '../../../lib/dom/clipboard';
import { dependencyPickerStyles, type DependencyPicker, type DependencySearch } from '../render/dependency-picker';
import { renderStoryDetail, storyDetailStyles, type StoryManage } from '../render/story-detail';
import { statusStyles } from '../render/tone';

/** How long the copy buttons say what they copied. */
const COPIED_MS = 1500;

export class DpkInternalUsmStoryDetail extends LitElement {
  static override styles: CSSResultGroup = [
    tokens,
    controls,
    controlAtom,
    linkStyles,
    statusStyles,
    dependencyPickerStyles,
    storyDetailStyles,
  ];

  static override properties: PropertyDeclarations = {
    story: { attribute: false },
    context: { attribute: false },
    messages: { attribute: false },
    manage: { attribute: false },
    copied: { state: true },
    search: { state: true },
  };

  declare story: UserStory | null;
  declare context: ViewRenderContext<UsmState> | null;
  declare messages: UsmMessages | null;
  declare manage: StoryManage | null;
  /** The text the last press copied, while the buttons say so. */
  declare copied: string | null;
  /** What is typed into the dependency picker whose list is open; one is open at most. */
  declare search: DependencySearch | null;
  #copiedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super();
    this.story = null;
    this.context = null;
    this.messages = null;
    this.manage = null;
    this.copied = null;
    this.search = null;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearTimeout(this.#copiedTimer);
    this.copied = null;
  }

  async #copy(text: string): Promise<void> {
    if (!(await copyText(text))) return;
    clearTimeout(this.#copiedTimer);
    this.copied = text;
    this.#copiedTimer = setTimeout(() => {
      this.copied = null;
    }, COPIED_MS);
  }

  protected override render(): TemplateResult | typeof nothing {
    const { story, context, messages, manage } = this;
    if (story === null || context === null || messages === null || manage === null) return nothing;
    const picker: DependencyPicker = {
      search: this.search,
      set: (search) => (this.search = search),
    };
    return renderStoryDetail(
      messages,
      context,
      story,
      picker,
      { copied: this.copied, copy: (text) => void this.#copy(text) },
      manage,
    );
  }

  /**
   * The picker's choices show while its field has the focus; once the focus
   * left, the search goes with it. The highlighted choice is kept in sight as
   * the arrow keys move it.
   */
  protected override updated(): void {
    if (this.search === null) return;
    const field = this.shadowRoot?.activeElement ?? null;
    if (!field?.matches('.sp-dep-search')) {
      this.search = null;
      return;
    }
    const active = field.getAttribute('aria-activedescendant');
    if (active) this.renderRoot.querySelector(`#${CSS.escape(active)}`)?.scrollIntoView?.({ block: 'nearest' });
  }
}

export const defineInternalUsmStoryDetail = (): void => {
  if (!customElements.get('dpk-internal-usm-story-detail'))
    customElements.define('dpk-internal-usm-story-detail', DpkInternalUsmStoryDetail);
};
