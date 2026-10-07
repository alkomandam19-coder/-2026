// Web Audio Tone Synthesizer for Staff & Sales Reps
// Provides 6 distinct, crystal-clear synthesized tones without relying on external MP3 downloads

export type AlertToneId =
  | "crystal_chime"
  | "golden_bell"
  | "modern_pulse"
  | "marimba_bounce"
  | "official_alert"
  | "messenger_pop";

export interface AlertToneOption {
  id: AlertToneId;
  name: string;
  description: string;
  icon: string;
}

export const ALERT_TONE_OPTIONS: AlertToneOption[] = [
  {
    id: "crystal_chime",
    name: "كريستال صاعد (Crystal Chime)",
    description: "نغمة ناعمة راقية متصاعدة مستوحاة من الأجراس الكريستالية",
    icon: "💎"
  },
  {
    id: "golden_bell",
    name: "جرس ذهبي مبهج (Golden Bell)",
    description: "رنين جرس مبهج عالي الوضوح يجذب الانتباه فوراً",
    icon: "🔔"
  },
  {
    id: "modern_pulse",
    name: "نبض رقمي متطور (Modern Pulse)",
    description: "نغمة تقنية ذكية حديثة مزدوجة النبضات وسريعة",
    icon: "⚡"
  },
  {
    id: "marimba_bounce",
    name: "ماريمبا خشبية مرحة (Marimba Bounce)",
    description: "نغمة خفيفة دافئة بإيقاع مريح وسلس للأذن",
    icon: "🎵"
  },
  {
    id: "official_alert",
    name: "تنبيه إداري رسمي (Official Chime)",
    description: "نغمة هادئة وجادة ملائمة للبيئة المكتبية والإدارية",
    icon: "🏛️"
  },
  {
    id: "messenger_pop",
    name: "رنة المحادثة السريعة (Messenger Ding)",
    description: "صوت بوب تشيرب مميز ومختصر للتنبيه الفوري",
    icon: "💬"
  }
];

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!globalAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (e) {
    console.warn("AudioContext could not be initialized:", e);
    return null;
  }
}

export function playSynthesizedTone(toneId: AlertToneId = "crystal_chime", volume: number = 0.8) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const masterVol = Math.max(0.05, Math.min(volume, 1.0));
  const now = ctx.currentTime;

  const playBeep = (
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    vol: number,
    decayExponential: boolean = true
  ) => {
    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      const targetVol = vol * masterVol;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(targetVol, startTime + 0.03);

      if (decayExponential) {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      } else {
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      }

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    } catch (err) {
      console.warn("Synthesizer tone render error:", err);
    }
  };

  switch (toneId) {
    case "crystal_chime": {
      // Warm crystalline E major 7 ascending arpeggio
      playBeep(659.25, "sine", now, 0.75, 0.12);        // E5
      playBeep(830.61, "sine", now + 0.11, 0.75, 0.12);   // G#5
      playBeep(987.77, "sine", now + 0.22, 0.9, 0.12);    // B5
      playBeep(1318.51, "sine", now + 0.33, 1.2, 0.15);  // E6
      break;
    }

    case "golden_bell": {
      // Resonant bell chime with harmonics
      playBeep(880.00, "sine", now, 1.0, 0.16);         // A5 fundamental
      playBeep(1760.00, "sine", now, 0.8, 0.06);        // 2nd harmonic
      playBeep(2640.00, "triangle", now, 0.5, 0.03);    // 3rd harmonic
      playBeep(1109.73, "sine", now + 0.18, 1.2, 0.18); // C#6 harmonic follow-up
      playBeep(1318.51, "sine", now + 0.36, 1.4, 0.2);  // E6 resolve
      break;
    }

    case "modern_pulse": {
      // Tech dual pulse
      playBeep(740, "triangle", now, 0.12, 0.14, false);
      playBeep(987, "sine", now + 0.12, 0.25, 0.16);
      playBeep(1318, "sine", now + 0.24, 0.4, 0.18);
      break;
    }

    case "marimba_bounce": {
      // Marimba warm bounce (C5, E5, G5, C6)
      playBeep(523.25, "sine", now, 0.35, 0.16);
      playBeep(659.25, "sine", now + 0.09, 0.35, 0.16);
      playBeep(783.99, "sine", now + 0.18, 0.35, 0.16);
      playBeep(1046.50, "sine", now + 0.27, 0.6, 0.18);
      break;
    }

    case "official_alert": {
      // Two-tone dignified administrative alert (D5 -> A5)
      playBeep(587.33, "sine", now, 0.45, 0.14);
      playBeep(880.00, "sine", now + 0.18, 0.8, 0.18);
      break;
    }

    case "messenger_pop": {
      // Fast cheerful notification ding
      playBeep(987.77, "sine", now, 0.15, 0.16);
      playBeep(1318.51, "sine", now + 0.08, 0.5, 0.18);
      break;
    }

    default: {
      playBeep(880.00, "sine", now, 0.8, 0.12);
      playBeep(1318.51, "sine", now + 0.15, 1.0, 0.15);
      break;
    }
  }
}

export function playAlertToneForUser(userPrefix: string = "user") {
  if (typeof window === "undefined") return;
  const tone = (localStorage.getItem(`app_alert_tone_${userPrefix}`) as AlertToneId) || "crystal_chime";
  const volStr = localStorage.getItem(`app_alert_vol_${userPrefix}`);
  const vol = volStr ? Number(volStr) : 0.8;
  playSynthesizedTone(tone, vol);
}

