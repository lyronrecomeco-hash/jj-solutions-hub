// Tiny WebAudio beep — no external assets needed.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function playNotificationSound(volume = 0.18) {
  try {
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    const now = c.currentTime;

    const tone = (freq: number, start: number, dur: number, vol: number) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(vol, start + 0.01);
      g.gain.linearRampToValueAtTime(0, start + dur);
      o.connect(g).connect(c.destination);
      o.start(start);
      o.stop(start + dur + 0.02);
    };

    tone(880, now, 0.12, volume);
    tone(1320, now + 0.09, 0.16, volume * 0.85);
  } catch {
    // ignore
  }
}
