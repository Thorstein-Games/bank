import { useEffect } from "react";
import styles from "./AppShell.module.css";

interface ConfettiBurstProps {
  isActive: boolean;
}

type ConfettiFire = (options: Record<string, unknown>) => Promise<null> | null;

declare global {
  interface Window {
    confetti?: ConfettiFire & {
      create?: (
        canvas?: HTMLCanvasElement | null,
        options?: {
          resize?: boolean;
          useWorker?: boolean;
          disableForReducedMotion?: boolean;
        },
      ) => ConfettiFire;
    };
  }
}

const CONFETTI_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js";
const CONFETTI_SCRIPT_ID = "canvas-confetti-script";
const CONFETTI_DURATION_MS = 3000;
const CANNON_PARTICLE_COUNT = 2;
const CONFETTI_COLORS = ["#f0b64e", "#57b3d8", "#ff8b6e", "#64d79b", "#f0574a"];

function getConfettiFire(): ConfettiFire | null {
  if (!window.confetti) {
    return null;
  }

  if (typeof window.confetti.create === "function") {
    return window.confetti.create(null, {
      resize: true,
      useWorker: true,
      disableForReducedMotion: true,
    });
  }

  return window.confetti;
}

function fireSideCannons(onFrameRequest: (callback: () => void) => void) {
  const confettiFire = getConfettiFire();
  if (!confettiFire) {
    return;
  }

  const endTime = Date.now() + CONFETTI_DURATION_MS;
  const fireFrame = () => {
    confettiFire({
      particleCount: CANNON_PARTICLE_COUNT,
      angle: 60,
      spread: 55,
      startVelocity: 52,
      origin: { x: 0, y: 0.62 },
      colors: CONFETTI_COLORS,
    });
    confettiFire({
      particleCount: CANNON_PARTICLE_COUNT,
      angle: 120,
      spread: 55,
      startVelocity: 52,
      origin: { x: 1, y: 0.62 },
      colors: CONFETTI_COLORS,
    });

    if (Date.now() < endTime) {
      onFrameRequest(fireFrame);
    }
  };

  fireFrame();
}

export default function ConfettiBurst({ isActive }: ConfettiBurstProps) {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    let frameId: number | null = null;
    const queueFrame = (callback: () => void) => {
      frameId = window.requestAnimationFrame(callback);
    };
    const startConfetti = () => fireSideCannons(queueFrame);

    if (window.confetti) {
      startConfetti();
      return () => {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
      };
    }

    let confettiScript = document.getElementById(
      CONFETTI_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (!confettiScript) {
      confettiScript = document.createElement("script");
      confettiScript.id = CONFETTI_SCRIPT_ID;
      confettiScript.src = CONFETTI_SCRIPT_SRC;
      confettiScript.async = true;
      document.body.appendChild(confettiScript);
    }

    confettiScript.addEventListener("load", startConfetti);
    return () => {
      confettiScript?.removeEventListener("load", startConfetti);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <div className={styles.confettiLayer} data-testid="confetti-burst" aria-hidden="true" />
  );
}
