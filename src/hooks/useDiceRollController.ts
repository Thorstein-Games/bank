import {
  BUST_TOTAL,
  DIE_MIN,
  EARLY_SEVEN_BONUS,
  EARLY_TURN_WINDOW,
} from "@/game/constants";
import { type DiceValues, rollDiceWithCrypto } from "@/game/dice";
import type { GameState } from "@/game/models";
import type { GameAction } from "@/game/reducer";
import { useCallback, useEffect, useRef, useState } from "react";

const DICE_ANIMATION_DURATION_MS = 800;
const DICE_ANIMATION_STEP_MS = 100;

const DEFAULT_DICE_DISPLAY = {
  dieOne: DIE_MIN,
  dieTwo: DIE_MIN,
  isAnimating: false,
};

export type ManualOutcome = number | "doubles";

interface UseDiceRollControllerParams {
  gameState: GameState | null;
  dispatchGameAction: (action: GameAction) => void;
  onBuiltInRollStart?: () => void;
  onRollResolved?: (rollResult: RollResolutionFeedback) => void;
}

export interface RollResolutionFeedback {
  dieOne: number;
  dieTwo: number;
  total: number;
  nextBankTotal: number;
  isBust: boolean;
}

interface UseDiceRollControllerResult {
  diceOne: number;
  diceTwo: number;
  isDiceAnimating: boolean;
  pendingRoll: DiceValues | null;
  isManualMode: boolean;
  isManualOutcomeSelected: boolean;
  diceInputError: string | null;
  selectedOutcome: ManualOutcome | null;
  resetDiceState: () => void;
  setStableDiceDisplay: (diceValues: DiceValues | null) => void;
  handleRoll: () => void;
  handleManualOutcomeSelect: (outcome: ManualOutcome) => void;
}

function getDiceFromOutcome(outcome: ManualOutcome): {
  dieOne: number;
  dieTwo: number;
} {
  if (outcome === "doubles") {
    return { dieOne: 6, dieTwo: 6 };
  }
  // For sums, use predefined combinations
  const combinations: Record<number, { dieOne: number; dieTwo: number }> = {
    2: { dieOne: 1, dieTwo: 1 },
    3: { dieOne: 1, dieTwo: 2 },
    4: { dieOne: 1, dieTwo: 3 },
    5: { dieOne: 1, dieTwo: 4 },
    6: { dieOne: 1, dieTwo: 5 },
    7: { dieOne: 1, dieTwo: 6 },
    8: { dieOne: 2, dieTwo: 6 },
    9: { dieOne: 3, dieTwo: 6 },
    10: { dieOne: 4, dieTwo: 6 },
    11: { dieOne: 5, dieTwo: 6 },
    12: { dieOne: 6, dieTwo: 6 },
  };
  return combinations[outcome] || { dieOne: 1, dieTwo: 1 };
}

function buildRollResolutionFeedback(
  gameState: GameState,
  diceValues: DiceValues,
): RollResolutionFeedback {
  const total = diceValues.dieOne + diceValues.dieTwo;
  const isDouble = diceValues.dieOne === diceValues.dieTwo;
  const isEarlyTurn = gameState.round.turnCountInRound < EARLY_TURN_WINDOW;

  if (total === BUST_TOTAL) {
    if (isEarlyTurn) {
      return {
        dieOne: diceValues.dieOne,
        dieTwo: diceValues.dieTwo,
        total,
        nextBankTotal: gameState.round.bankTotal + EARLY_SEVEN_BONUS,
        isBust: false,
      };
    }

    return {
      dieOne: diceValues.dieOne,
      dieTwo: diceValues.dieTwo,
      total,
      nextBankTotal: gameState.round.bankTotal,
      isBust: true,
    };
  }

  if (isDouble && !isEarlyTurn) {
    return {
      dieOne: diceValues.dieOne,
      dieTwo: diceValues.dieTwo,
      total,
      nextBankTotal: gameState.round.bankTotal * 2 + total,
      isBust: false,
    };
  }

  return {
    dieOne: diceValues.dieOne,
    dieTwo: diceValues.dieTwo,
    total,
    nextBankTotal: gameState.round.bankTotal + total,
    isBust: false,
  };
}

export default function useDiceRollController({
  gameState,
  dispatchGameAction,
  onBuiltInRollStart,
  onRollResolved,
}: UseDiceRollControllerParams): UseDiceRollControllerResult {
  const [diceDisplay, setDiceDisplay] = useState(DEFAULT_DICE_DISPLAY);
  const [pendingRoll, setPendingRoll] = useState<DiceValues | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<ManualOutcome | null>(
    null,
  );
  const [builtInDiceError, setBuiltInDiceError] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const diceAnimationIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const diceAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const clearDiceAnimationTimers = useCallback(() => {
    if (diceAnimationIntervalRef.current !== null) {
      clearInterval(diceAnimationIntervalRef.current);
      diceAnimationIntervalRef.current = null;
    }

    if (diceAnimationTimeoutRef.current !== null) {
      clearTimeout(diceAnimationTimeoutRef.current);
      diceAnimationTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearDiceAnimationTimers(), [clearDiceAnimationTimers]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncPreference);
      return () => mediaQuery.removeEventListener("change", syncPreference);
    }

    mediaQuery.addListener(syncPreference);
    return () => mediaQuery.removeListener(syncPreference);
  }, []);

  const isManualMode = gameState?.settings.diceMode === "manual";
  const isManualOutcomeSelected = selectedOutcome !== null;
  const diceInputError =
    isManualMode && !isManualOutcomeSelected
      ? "Select a dice outcome."
      : builtInDiceError;

  const resetDiceState = useCallback(() => {
    clearDiceAnimationTimers();
    setPendingRoll(null);
    setDiceDisplay(DEFAULT_DICE_DISPLAY);
    setSelectedOutcome(null);
    setBuiltInDiceError(null);
  }, [clearDiceAnimationTimers]);

  const setStableDiceDisplay = useCallback(
    (diceValues: DiceValues | null) => {
      clearDiceAnimationTimers();
      setPendingRoll(null);
      setDiceDisplay(
        diceValues
          ? {
              dieOne: diceValues.dieOne,
              dieTwo: diceValues.dieTwo,
              isAnimating: false,
            }
          : DEFAULT_DICE_DISPLAY,
      );
    },
    [clearDiceAnimationTimers],
  );

  function handleManualOutcomeSelect(outcome: ManualOutcome) {
    if (!gameState || diceDisplay.isAnimating) {
      return;
    }

    setSelectedOutcome(outcome);
    setBuiltInDiceError(null);

    const diceValues = getDiceFromOutcome(outcome);

    setPendingRoll(null);
    setDiceDisplay({
      ...diceValues,
      isAnimating: false,
    });
    onRollResolved?.(buildRollResolutionFeedback(gameState, diceValues));
    dispatchGameAction({
      type: "resolve-roll",
      dieOne: diceValues.dieOne,
      dieTwo: diceValues.dieTwo,
    });
  }

  function handleRoll() {
    if (!gameState || diceDisplay.isAnimating) {
      return;
    }

    if (gameState.settings.diceMode === "manual") {
      if (!selectedOutcome) {
        return;
      }

      const diceValues = getDiceFromOutcome(selectedOutcome);

      setBuiltInDiceError(null);
      setPendingRoll(null);
      setDiceDisplay({
        ...diceValues,
        isAnimating: false,
      });
      onRollResolved?.(buildRollResolutionFeedback(gameState, diceValues));
      dispatchGameAction({
        type: "resolve-roll",
        dieOne: diceValues.dieOne,
        dieTwo: diceValues.dieTwo,
      });
      return;
    }

    let committedRoll: DiceValues;
    try {
      committedRoll = rollDiceWithCrypto();
    } catch {
      setBuiltInDiceError("Secure dice are unavailable in this browser.");
      return;
    }

    clearDiceAnimationTimers();

    let previewRoll: DiceValues;
    try {
      previewRoll = rollDiceWithCrypto();
    } catch {
      previewRoll = committedRoll;
    }

    setBuiltInDiceError(null);
    setPendingRoll(committedRoll);
    onBuiltInRollStart?.();

    const rollResolutionFeedback = buildRollResolutionFeedback(
      gameState,
      committedRoll,
    );

    if (prefersReducedMotion) {
      setPendingRoll(null);
      setDiceDisplay({
        ...committedRoll,
        isAnimating: false,
      });
      onRollResolved?.(rollResolutionFeedback);
      dispatchGameAction({
        type: "resolve-roll",
        dieOne: committedRoll.dieOne,
        dieTwo: committedRoll.dieTwo,
      });
      return;
    }

    setDiceDisplay({
      ...previewRoll,
      isAnimating: true,
    });

    diceAnimationIntervalRef.current = setInterval(() => {
      try {
        const nextPreviewRoll = rollDiceWithCrypto();
        setDiceDisplay({
          ...nextPreviewRoll,
          isAnimating: true,
        });
      } catch {
        setDiceDisplay((currentState) => ({
          ...currentState,
          isAnimating: true,
        }));
      }
    }, DICE_ANIMATION_STEP_MS);

    diceAnimationTimeoutRef.current = setTimeout(() => {
      clearDiceAnimationTimers();
      setPendingRoll(null);
      setDiceDisplay({
        ...committedRoll,
        isAnimating: false,
      });
      onRollResolved?.(rollResolutionFeedback);
      dispatchGameAction({
        type: "resolve-roll",
        dieOne: committedRoll.dieOne,
        dieTwo: committedRoll.dieTwo,
      });
    }, DICE_ANIMATION_DURATION_MS);
  }

  return {
    diceOne: diceDisplay.dieOne,
    diceTwo: diceDisplay.dieTwo,
    isDiceAnimating: diceDisplay.isAnimating,
    pendingRoll,
    isManualMode,
    isManualOutcomeSelected,
    diceInputError,
    selectedOutcome,
    resetDiceState,
    setStableDiceDisplay,
    handleRoll,
    handleManualOutcomeSelect,
  };
}
