import { describe, it, expect, beforeEach } from 'vitest';
import { isSoundEnabled, setSoundEnabled, playSound, initSoundListener } from './sound';

describe('sound module', () => {
  beforeEach(() => {
    setSoundEnabled(true);
  });

  it('can get and set sound enabled flag', () => {
    expect(isSoundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('handles playSound safely without throwing even without AudioContext', () => {
    expect(() => {
      playSound('tap');
      playSound('pop');
      playSound('success');
      playSound('delete');
      playSound('toggle');
    }).not.toThrow();
  });

  it('attaches and detaches pointer listener safely', () => {
    const cleanup = initSoundListener();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
