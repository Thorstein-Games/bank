import { useCallback, useEffect, useRef } from "react";

interface UseGameAudioParams {
  isMuted: boolean;
  hasUserInteracted: boolean;
}

interface UseGameAudioResult {
  playRollSound: () => void;
  playBankSound: () => void;
}

interface AudioTone {
  startOffsetMs: number;
  durationMs: number;
  startFrequency: number;
  endFrequency?: number;
  gain: number;
  type: OscillatorType;
}

type WindowWithWebkitAudioContext = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function scheduleTone(context: AudioContext, tone: AudioTone) {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startTime = context.currentTime + tone.startOffsetMs / 1000;
  const endTime = startTime + tone.durationMs / 1000;

  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(tone.startFrequency, startTime);
  if (typeof tone.endFrequency === "number") {
    oscillator.frequency.linearRampToValueAtTime(tone.endFrequency, endTime);
  }

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(tone.gain, startTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startTime);
  oscillator.stop(endTime);
}

export default function useGameAudio({
  isMuted,
  hasUserInteracted
}: UseGameAudioParams): UseGameAudioResult {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback((): AudioContext | null => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    if (typeof window === "undefined") {
      return null;
    }

    const audioContextConstructor =
      window.AudioContext ||
      (window as WindowWithWebkitAudioContext).webkitAudioContext;
    if (!audioContextConstructor) {
      return null;
    }

    audioContextRef.current = new audioContextConstructor();
    return audioContextRef.current;
  }, []);

  const canPlayAudio = useCallback(
    () => hasUserInteracted && !isMuted,
    [hasUserInteracted, isMuted]
  );

  const playRollSound = useCallback(() => {
    if (!canPlayAudio()) {
      return;
    }

    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    scheduleTone(audioContext, {
      startOffsetMs: 0,
      durationMs: 90,
      startFrequency: 220,
      endFrequency: 340,
      gain: 0.045,
      type: "triangle"
    });
    scheduleTone(audioContext, {
      startOffsetMs: 85,
      durationMs: 120,
      startFrequency: 260,
      endFrequency: 420,
      gain: 0.038,
      type: "triangle"
    });
  }, [canPlayAudio, getAudioContext]);

  const playBankSound = useCallback(() => {
    if (!canPlayAudio()) {
      return;
    }

    const audioContext = getAudioContext();
    if (!audioContext) {
      return;
    }

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    scheduleTone(audioContext, {
      startOffsetMs: 0,
      durationMs: 100,
      startFrequency: 430,
      gain: 0.045,
      type: "sine"
    });
    scheduleTone(audioContext, {
      startOffsetMs: 110,
      durationMs: 180,
      startFrequency: 620,
      gain: 0.052,
      type: "sine"
    });
  }, [canPlayAudio, getAudioContext]);

  useEffect(
    () => () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    },
    []
  );

  return {
    playRollSound,
    playBankSound
  };
}
