// Web Audio API tactile sound synthesizer + Web Vibration API haptics.
// Operates 100% offline with zero external audio assets.

type SoundType = 'tap' | 'pop' | 'success' | 'delete' | 'toggle';

// ── Audio state ───────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

const STORAGE_KEY         = 'upi_sound_enabled';
const HAPTICS_STORAGE_KEY = 'upi_haptics_enabled';

// ── Haptics state ─────────────────────────────────────────────────────────────
let hapticsEnabled = true;

// Vibration patterns per sound type — maxed to practical ceiling of Web Vibration API
const HAPTIC_PATTERNS: Record<SoundType, number | number[]> = {
  tap:     200,                    // solid strong tick
  pop:     [200],                  // heavy punch
  success: [150, 100, 250],        // strong double-beat confirm
  delete:  [500],                  // full deep rumble
  toggle:  [150, 80, 150],         // powerful double-click
};

function vibrate(pattern: number | number[]) {
  if (!hapticsEnabled) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch { /* silently ignore */ }
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
  // Fire haptics immediately — independent of whether audio is available
  vibrate(HAPTIC_PATTERNS[type]);

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
    playSound(customSound || 'tap');
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true });

  return () => {
    window.removeEventListener('pointerdown', handlePointerDown);
    listenerAttached = false;
  };
}
