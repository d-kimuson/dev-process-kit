/**
 * Whether the reader is on an Apple platform, where the command key (⌘) takes
 * the place other platforms give to Ctrl in shortcuts.
 */
export const isApplePlatform = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const hinted = (navigator as Navigator & { readonly userAgentData?: { readonly platform?: string } }).userAgentData
    ?.platform;
  return /mac|iphone|ipad|ipod/i.test(hinted ?? navigator.platform);
};
