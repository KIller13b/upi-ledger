// Web Audio API sound synthesizer + haptics (Android + iOS).
// Operates 100% offline with zero external audio assets.

type SoundType = 'tap' | 'pop' | 'success' | 'delete' | 'toggle';

// ── Audio state ───────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

const STORAGE_KEY         = 'upi_sound_enabled';
const HAPTICS_STORAGE_KEY = 'upi_haptics_enabled';

// ── Haptics state ─────────────────────────────────────────────────────────────
let hapticsEnabled = true;

// Vibration patterns — Android uses ms durations, iOS uses tap count
const HAPTIC_PATTERNS: Record<SoundType, { android: number | number[]; iosTaps: number }> = {
  tap:     { android: 200,             iosTaps: 1 },
  pop:     { android: 200,             iosTaps: 1 },
  success: { android: [150, 100, 250], iosTaps: 2 },
  delete:  { android: 500,             iosTaps: 3 },
  toggle:  { android: [150, 80, 150],  iosTaps: 2 },
};

// ── iOS hidden-switch haptic trick ────────────────────────────────────────────
// WebKit fires native haptic feedback when an <input switch> is toggled.
// We programmatically click a hidden one on every haptic event.
let _iosSwitch: HTMLInputElement | null = null;

function getIOSSwitch(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null;
  if (_iosSwitch) return _iosSwitch;
  const el = document.createElement('input');
  el.type = 'checkbox';
  el.setAttribute('switch', '');         // WebKit-specific attribute
  el.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(el);
  _iosSwitch = el;
  return el;
}


function hasVibrate(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof (navigator as unknown as Record<string, unknown>).vibrate === 'function';
}

/** Fire haptic feedback — works on Android (vibrate API) and iOS (switch trick).
 *  The FIRST iOS click is always synchronous — must be called within a user gesture. */
export function triggerRawHaptic(androidPattern: number | number[], iosTaps: number) {
  if (hasVibrate()) {
    try { navigator.vibrate(androidPattern); } catch { /* ignore */ }
  } else {
    // First click must be synchronous — setTimeout loses WebKit gesture context
    const el = getIOSSwitch();
    if (!el) return;
    try { el.click(); } catch { /* ignore */ }
    for (let i = 1; i < iosTaps; i++) {
      setTimeout(() => { try { el.click(); } catch { /* ignore */ } }, i * 100);
    }
  }
}

// Load preferences from localStorage
if (typeof window !== 'undefined') {
  try {
    const savedSound    = localStorage.getItem(STORAGE_KEY);
    const savedHaptics  = localStorage.getItem(HAPTICS_STORAGE_KEY);
    if (savedSound   !== null) soundEnabled   = savedSound   === 'true';
    if (savedHaptics !== null) hapticsEnabled = savedHaptics === 'true';
  } catch { /* ignore */ }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean   { return soundEnabled;   }
export function isHapticsEnabled(): boolean { return hapticsEnabled; }

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch { /* ignore */ }
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled)); } catch { /* ignore */ }
  }
}

/**
 * Creates a DynamicsCompressorNode so sounds stay loud but never clip on
 * mobile speakers. All oscillators route through this before ctx.destination.
 */
function mkCompressor(ctx: AudioContext): DynamicsCompressorNode {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -6;   // dB — starts compressing early
  comp.knee.value      = 3;
  comp.ratio.value     = 8;
  comp.attack.value    = 0.001;
  comp.release.value   = 0.05;
  comp.connect(ctx.destination);
  return comp;
}

/**
 * Play a synthesized tactile sound effect at maximum audible volume.
 * Also triggers the matching haptic vibration pattern via the Vibration API.
 */
export function playSound(type: SoundType = 'tap'): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now  = ctx.currentTime;
  const comp = mkCompressor(ctx);

  try {
    if (type === 'tap') {
      // Crisp mechanical/haptic tap — maxed gain, routed through compressor
      const osc    = ctx.createOscillator();
      const gain   = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.022);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(comp);

      osc.start(now);
      osc.stop(now + 0.025);
    } else if (type === 'pop') {
      // Warm resonant pop for tabs & toggles
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(comp);

      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'toggle') {
      // Subtle double micro-click
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.setValueAtTime(900, now + 0.015);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(comp);

      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'success') {
      // Two-tone ascending chime (C5 -> E5)
      const playTone = (freq: number, startOffset: number) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + startOffset);

        gain.gain.setValueAtTime(0.85, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 0.12);

        osc.connect(gain);
        gain.connect(comp);

        osc.start(now + startOffset);
        osc.stop(now + startOffset + 0.13);
      };

      playTone(523.25, 0);     // C5
      playTone(659.25, 0.08);  // E5
    } else if (type === 'delete') {
      // Low damped thud
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.06);

      gain.gain.setValueAtTime(1.0, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(comp);

      osc.start(now);
      osc.stop(now + 0.07);
    }
  } catch {
    // Graceful fallback if Web Audio is restricted
  }
}

/**
 * Initializes a global delegation listener so all interactive buttons,
 * tabs, selects and controls play a tactile click sound automatically.
 */
let listenerAttached = false;
export function initSoundListener(): () => void {
  if (typeof window === 'undefined' || listenerAttached) {
    return () => {};
  }
  listenerAttached = true;

  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if clicked element or ancestor is a button / interactive element
    const interactive = target.closest('button, [role="button"], a[href], select, input[type="checkbox"], input[type="radio"], summary');
    if (!interactive) return;

    // Don't play if disabled or explicitly disabled via attribute
    if (interactive.hasAttribute('disabled') || interactive.getAttribute('data-no-sound') === 'true') {
      return;
    }

    const customSound = interactive.getAttribute('data-sound') as SoundType | null;
    const soundType   = (customSound || 'tap') as SoundType;

    // ── Haptics first, synchronously in the gesture handler ──────────────────
    // This is critical for iOS: the WebKit user-gesture window closes as soon
    // as this call stack ends. Any async path (setTimeout, Promise) loses it.
    if (hapticsEnabled) {
      const p = HAPTIC_PATTERNS[soundType];
      if (hasVibrate()) {
        try { navigator.vibrate(p.android); } catch { /* ignore */ }
      } else {
        // iOS switch trick — synchronous click right here
        const el = getIOSSwitch();
        if (el) { try { el.click(); } catch { /* ignore */ } }
      }
    }

    // ── Sound (can be async) ─────────────────────────────────────────────────
    playSound(soundType);
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true });

  return () => {
    window.removeEventListener('pointerdown', handlePointerDown);
    listenerAttached = false;
  };
}
