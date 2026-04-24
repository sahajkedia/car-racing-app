/**
 * System sound player — plays a subtle click/haptic tone on every user action.
 * Uses the Web Audio API (no external assets needed — tones are synthesized).
 * Falls back silently if audio is unavailable (mobile restrictions, etc.)
 */

type SoundType = "tap" | "success" | "pass" | "send" | "notify";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

/**
 * Play a synthesized tone. All sounds are generated in-browser with Web Audio —
 * no file downloads, no latency, works offline.
 *
 * Sound design philosophy: short (< 150ms), low volume, non-intrusive.
 * These feel like physical button clicks, not notification sounds.
 */
export function playSound(type: SoundType = "tap"): void {
  const context = getCtx();
  if (!context) return;

  // Resume context if suspended (required by browsers after user gesture)
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const now = context.currentTime;
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.connect(gain);
  gain.connect(context.destination);

  switch (type) {
    case "tap":
      // Subtle click: 600Hz, 60ms
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
      break;

    case "success":
      // Gentle chime: 800Hz → 1200Hz, 120ms
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case "pass":
      // Descending soft tone: 400Hz → 300Hz, 80ms
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case "send":
      // Whoosh: 500Hz → 900Hz, 100ms
      osc.type = "triangle";
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
      break;

    case "notify":
      // Notification ding: 1000Hz, short
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
  }
}

/**
 * Hook-style wrapper for use in React event handlers.
 * Usage: onClick={() => { withSound("tap"); doSomething(); }}
 */
export function withSound(type: SoundType = "tap") {
  playSound(type);
}
