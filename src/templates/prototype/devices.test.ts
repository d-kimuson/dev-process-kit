import { describe, expect, it } from 'vitest';

import { chooseDevice, deviceClassOf, deviceFor, deviceLabel, devicesOf, deviceZoom, hasDevice } from './devices';
import { prototypeMessages } from './messages';

describe('the devices of the app view', () => {
  it('runs a preview on a device of its class, a fluid page in a desktop window', () => {
    expect(deviceClassOf('mobile')).toBe('phone');
    expect(deviceClassOf('tablet')).toBe('tablet');
    expect(deviceClassOf('desktop')).toBe('desktop');
    expect(deviceClassOf('fluid')).toBe('desktop');
  });

  it('gives every screen a device but paper, which stays as tall as it is drawn', () => {
    expect(hasDevice('browser')).toBe(true);
    expect(hasDevice('native')).toBe(true);
    expect(hasDevice('mail')).toBe(true);
    expect(hasDevice('plain')).toBe(false);
  });

  it('offers the common phones, tablets and desktop windows', () => {
    expect(devicesOf('phone').map((device) => device.id)).toContain('iphone-se');
    expect(devicesOf('tablet').map((device) => device.id)).toContain('ipad-mini');
    expect(devicesOf('desktop').map((device) => device.id)).toEqual([
      'laptop-13',
      'laptop-15',
      'full-hd',
      'monitor-27',
      'ultrawide',
    ]);
  });

  it('starts each class on a device close to the width the scenario view draws it at', () => {
    expect(deviceFor('mobile', {})).toMatchObject({ id: 'iphone-16', width: 393, height: 852 });
    expect(deviceFor('tablet', {})).toMatchObject({ id: 'ipad-pro-11', width: 834 });
    expect(deviceFor('desktop', {})).toMatchObject({ id: 'laptop-13', width: 1280, height: 800 });
  });

  it('keeps the reader’s pick per class', () => {
    const choice = chooseDevice(chooseDevice({}, 'iphone-se'), 'monitor-27');
    expect(choice).toEqual({ phone: 'iphone-se', desktop: 'monitor-27' });
    expect(deviceFor('mobile', choice).id).toBe('iphone-se');
    expect(deviceFor('fluid', choice).id).toBe('monitor-27');
    expect(deviceFor('tablet', choice).id).toBe('ipad-pro-11');
  });

  it('ignores an unknown device', () => {
    const choice = { phone: 'iphone-se' };
    expect(chooseDevice(choice, 'nokia-3310')).toBe(choice);
    expect(chooseDevice(choice, 'iphone-se')).toBe(choice);
    expect(deviceFor('mobile', { phone: 'nokia-3310' }).id).toBe('iphone-16');
  });

  it('names a device with its size', () => {
    const [se] = devicesOf('phone');
    expect(deviceLabel(prototypeMessages('en'), se!)).toBe('iPhone SE · 375×667');
    expect(deviceLabel(prototypeMessages('en'), deviceFor('desktop', { desktop: 'monitor-27' }))).toBe(
      '27" monitor · 2560×1440',
    );
  });

  it('draws a device smaller only when it does not fit, in whole percents', () => {
    expect(deviceZoom({ width: 393, height: 852 }, { width: 1000 })).toBe(1);
    expect(deviceZoom({ width: 2560, height: 1440 }, { width: 1050 })).toBe(0.41);
    // A demo fits the height of the tab as well.
    expect(deviceZoom({ width: 393, height: 852 }, { width: 1400, height: 700 })).toBe(0.82);
    // Nothing measured yet (no layout): drawn at its size.
    expect(deviceZoom({ width: 393, height: 852 }, { width: Number.NaN })).toBe(1);
  });
});
