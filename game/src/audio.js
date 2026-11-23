// Sound, synthesised with WebAudio and nothing else: no audio files, no
// network. Every call is guarded, and the context only starts after the
// first gesture, so a silent browser (or a headless one taking screenshots)
// never breaks the game.
export function createAudio() {
  let context = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (AudioContext === undefined) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** Unlock the context from a user gesture. */
  function unlock() {
    const audio = ensure();
    if (audio !== null && audio.state === 'suspended') audio.resume().catch(() => {});
  }

  function tone(frequency, duration, type, gainValue, slideTo) {
    const audio = ensure();
    if (audio === null) return;
    try {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      if (slideTo !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(slideTo, audio.currentTime + duration);
      }
      gain.gain.setValueAtTime(gainValue, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch {
      // Sound is garnish: never let it stop the game.
    }
  }

  return {
    unlock,
    click() {
      tone(660, 0.06, 'triangle', 0.08);
    },
    playCard() {
      tone(520, 0.12, 'triangle', 0.12, 880);
    },
    resonance() {
      tone(880, 0.1, 'triangle', 0.1, 1320);
      window.setTimeout(() => tone(1320, 0.14, 'triangle', 0.08), 90);
    },
    hit() {
      tone(180, 0.18, 'sawtooth', 0.12, 90);
    },
    heal() {
      tone(520, 0.22, 'sine', 0.1, 780);
    },
    shield() {
      tone(340, 0.16, 'sine', 0.1, 420);
    },
    draw() {
      tone(760, 0.08, 'triangle', 0.07, 980);
    },
    turn() {
      tone(440, 0.1, 'triangle', 0.09, 560);
    },
    win() {
      [523, 659, 784, 1047].forEach((note, i) => {
        window.setTimeout(() => tone(note, 0.3, 'triangle', 0.12), i * 110);
      });
    },
    lose() {
      [392, 330, 262, 196].forEach((note, i) => {
        window.setTimeout(() => tone(note, 0.3, 'sine', 0.1), i * 130);
      });
    },
  };
}
