import type { PrototypeMessages } from './messages';
import type { PreviewKind, PreviewViewport } from './model';

/**
 * The windows the app view runs a screen in. The scenario view shows a screen
 * as tall as its content; the app view is a simulation, so the screen is a
 * device of a fixed size and what does not fit scrolls inside it, as on the
 * real device. The reader picks the device among the common ones of the
 * preview's class: a phone, a tablet or a desktop window.
 *
 * The size is in CSS pixels and is the device's screen: a phone's display (the
 * bezel goes around it), or a desktop browser's whole window (tabs and toolbar
 * included).
 */

export type DeviceClass = 'phone' | 'tablet' | 'desktop';

export type DevicePreset = {
  readonly id: string;
  readonly deviceClass: DeviceClass;
  readonly width: number;
  readonly height: number;
};

/** The reader's pick for each class; a class with none uses its default. */
export type DeviceChoice = Readonly<Partial<Record<DeviceClass, string>>>;

const preset = (deviceClass: DeviceClass, id: string, width: number, height: number): DevicePreset => ({
  id,
  deviceClass,
  width,
  height,
});

export const DEVICE_PRESETS: readonly DevicePreset[] = [
  preset('phone', 'iphone-se', 375, 667),
  preset('phone', 'iphone-16', 393, 852),
  preset('phone', 'iphone-16-pro-max', 440, 956),
  preset('phone', 'pixel-7', 412, 915),
  preset('phone', 'galaxy-s24', 360, 780),
  preset('tablet', 'ipad-mini', 744, 1133),
  preset('tablet', 'ipad-air-11', 820, 1180),
  preset('tablet', 'ipad-pro-11', 834, 1194),
  preset('tablet', 'ipad-pro-13', 1024, 1366),
  preset('desktop', 'laptop-13', 1280, 800),
  preset('desktop', 'laptop-15', 1440, 900),
  preset('desktop', 'full-hd', 1920, 1080),
  preset('desktop', 'monitor-27', 2560, 1440),
  preset('desktop', 'ultrawide', 3440, 1440),
];

/** Close to the widths the scenario view draws each viewport at (390 · 834 · 1180). */
const DEFAULT_DEVICE: Record<DeviceClass, DevicePreset> = {
  phone: preset('phone', 'iphone-16', 393, 852),
  tablet: preset('tablet', 'ipad-pro-11', 834, 1194),
  desktop: preset('desktop', 'laptop-13', 1280, 800),
};

/** A fluid preview has no width of its own: in a window, it is a desktop page. */
export const deviceClassOf = (viewport: PreviewViewport): DeviceClass =>
  viewport === 'mobile' ? 'phone' : viewport === 'tablet' ? 'tablet' : 'desktop';

/** A `plain` preview is not a screen (a memo, a FAX): it has no device and stays as tall as it is drawn. */
export const hasDevice = (kind: PreviewKind): boolean => kind !== 'plain';

export const devicesOf = (deviceClass: DeviceClass): readonly DevicePreset[] =>
  DEVICE_PRESETS.filter((candidate) => candidate.deviceClass === deviceClass);

/** The device a preview runs on: the reader's pick for its class, else the class's default. */
export const deviceFor = (viewport: PreviewViewport, choice: DeviceChoice): DevicePreset => {
  const deviceClass = deviceClassOf(viewport);
  const picked = choice[deviceClass];
  return devicesOf(deviceClass).find((candidate) => candidate.id === picked) ?? DEFAULT_DEVICE[deviceClass];
};

/** Picks `id` for its class; an unknown id changes nothing. */
export const chooseDevice = (choice: DeviceChoice, id: string): DeviceChoice => {
  const picked = DEVICE_PRESETS.find((candidate) => candidate.id === id);
  if (picked === undefined || choice[picked.deviceClass] === id) return choice;
  return { ...choice, [picked.deviceClass]: id };
};

/** A device's name, then its size: `iPhone SE · 375×667`. */
export const deviceLabel = (m: PrototypeMessages, device: DevicePreset): string =>
  `${m.deviceName(device.id)} · ${device.width}×${device.height}`;

/**
 * How much a device is drawn smaller so it fits `available` CSS pixels across
 * (and, when given, down): never larger than life, and rounded to whole
 * percents so it reads as the zoom of a browser's device mode.
 */
export const deviceZoom = (
  size: { readonly width: number; readonly height: number },
  available: { readonly width: number; readonly height?: number },
): number => {
  const fits = [1, available.width / size.width];
  if (available.height !== undefined) fits.push(available.height / size.height);
  const zoom = Math.min(...fits);
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  return Math.max(0.1, Math.floor(zoom * 100) / 100);
};
