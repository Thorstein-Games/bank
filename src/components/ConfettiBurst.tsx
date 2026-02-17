import type { CSSProperties } from "react";
import { useMemo } from "react";
import styles from "./AppShell.module.css";

interface ConfettiBurstProps {
  isActive: boolean;
}

const CONFETTI_PIECE_COUNT = 48;

export default function ConfettiBurst({ isActive }: ConfettiBurstProps) {
  const confettiPieces = useMemo(
    () => Array.from({ length: CONFETTI_PIECE_COUNT }, (_, index) => index),
    []
  );

  if (!isActive) {
    return null;
  }

  return (
    <div className={styles.confettiLayer} data-testid="confetti-burst" aria-hidden="true">
      {confettiPieces.map((pieceIndex) => (
        <span
          key={`confetti-piece-${pieceIndex}`}
          className={styles.confettiPiece}
          style={
            {
              "--confetti-piece-index": pieceIndex,
              "--confetti-piece-hue": `${(pieceIndex * 43) % 360}`
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
