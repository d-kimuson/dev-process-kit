/**
 * Reaches the settings the side panel draws, from the tests of the element
 * that owns the panel (`<dpk-page>`, a standalone view or board).
 */
type Updating = HTMLElement & { readonly updateComplete: Promise<unknown> };

const isUpdating = (element: Element | null | undefined): element is Updating =>
  element instanceof HTMLElement && 'updateComplete' in element;

/** The panel frame of the owner, once it and the owner have drawn. */
export const panelFrameOf = async (owner: Element): Promise<ShadowRoot> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (isUpdating(owner)) await owner.updateComplete;
  const frame = owner.shadowRoot?.querySelector('dpk-internal-layout-panel');
  if (!isUpdating(frame)) throw new Error('no panel frame');
  await frame.updateComplete;
  if (frame.shadowRoot === null) throw new Error('no panel shadow root');
  return frame.shadowRoot;
};

/** The shadow root of the settings the owner's panel shows. */
export const shownSettingsOf = async (owner: Element): Promise<ShadowRoot> => {
  const frame = await panelFrameOf(owner);
  const settings = frame.querySelector('dpk-internal-layout-settings');
  if (!isUpdating(settings)) throw new Error('no settings in the panel');
  await settings.updateComplete;
  if (settings.shadowRoot === null) throw new Error('no settings shadow root');
  return settings.shadowRoot;
};
