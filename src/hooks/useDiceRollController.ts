import { DIE_MAX, DIE_MIN } from "@/game/constants";
import { type DiceValues, rollDiceWithCrypto } from "@/game/dice";
import type { GameState } from "@/game/models";
import type { GameAction } from "@/game/reducer";
import { useCallback, useEffect, useRef, useState } from "react";

const DICE_ANIMATION_DURATION_MS = 800;
const DICE_ANIMATION_STEP_MS = 100;

const DEFAULT_MANUAL_DICE_INPUTS = {
  dieOne: String(DIE_MIN),
  dieTwo: String(DIE_MIN)
};
const DEFAULT_DICE_DISPLAY = {
  dieOne: DIE_MIN,
  dieTwo: DIE_MIN,
  isAnimating: false
};

export type ManualDieField = "dieOne" | "dieTwo";

interface UseDiceRollControllerParams {
  gameState: GameState | null;
  dispatchGameAction: (action: GameAction) => void;
}

interface UseDiceRollControllerResult {
  diceOne: number;
  diceTwo: number;
  isDiceAnimating: boolean;
  pendingRoll: DiceValues | null;
  isManualMode: boolean;
  isManualInputValid: boolean;
  diceInputError: string | null;
  manualDieOneValue: string;
  manualDieTwoValue: string;
  resetDiceState: () => void;
  setStableDiceDisplay: (diceValues: DiceValues | null) => void;
  handleRoll: () => void;
  handleManualDieInputChange: (field: ManualDieField, nextValue: string) => void;
}

function parseManualDieInput(value: string): number | null {
  const trimmedValue = value.trim();
  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);
  if (parsedValue < DIE_MIN || parsedValue > DIE_MAX) {
    return null;
  }

  return parsedValue;
}

function getManualDiceInputError(dieOne: number | null, dieTwo: number | null): string | null {
  if (dieOne === null || dieTwo === null) {
    return `Enter both dice as whole numbers from ${DIE_MIN} to ${DIE_MAX}.`;
  }

  return null;
}

export default function useDiceRollController({
  gameState,
  dispatchGameAction
}: UseDiceRollControllerParams): UseDiceRollControllerResult {
  const [diceDisplay, setDiceDisplay] = useState(DEFAULT_DICE_DISPLAY);
  const [pendingRoll, setPendingRoll] = useState<DiceValues | null>(null);
  const [manualDiceInputs, setManualDiceInputs] = useState(
    DEFAULT_MANUAL_DICE_INPUTS
  );
  const [builtInDiceError, setBuiltInDiceError] = useState<string | null>(null);
  const diceAnimationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const diceAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const isManualMode = gameState?.settings.diceMode === "manual";
  const manualDieOne = parseManualDieInput(manualDiceInputs.dieOne);
  const manualDieTwo = parseManualDieInput(manualDiceInputs.dieTwo);
  const manualDiceInputError = isManualMode
    ? getManualDiceInputError(manualDieOne, manualDieTwo)
    : null;
  const diceInputError = isManualMode ? manualDiceInputError : builtInDiceError;

  const resetDiceState = useCallback(() => {
    clearDiceAnimationTimers();
    setPendingRoll(null);
    setDiceDisplay(DEFAULT_DICE_DISPLAY);
    setManualDiceInputs(DEFAULT_MANUAL_DICE_INPUTS);
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
              isAnimating: false
            }
          : DEFAULT_DICE_DISPLAY
      );
    },
    [clearDiceAnimationTimers]
  );

  function handleManualDieInputChange(field: ManualDieField, nextValue: string) {
    setManualDiceInputs((currentState) => ({
      ...currentState,
      [field]: nextValue
    }));
    setBuiltInDiceError(null);
  }

  function handleRoll() {
    if (!gameState || diceDisplay.isAnimating) {
      return;
    }

    if (gameState.settings.diceMode === "manual") {
      const dieOne = parseManualDieInput(manualDiceInputs.dieOne);
      const dieTwo = parseManualDieInput(manualDiceInputs.dieTwo);
      if (dieOne === null || dieTwo === null) {
        return;
      }

      setBuiltInDiceError(null);
      setPendingRoll(null);
      setDiceDisplay({
        dieOne,
        dieTwo,
        isAnimating: false
      });
      dispatchGameAction({
        type: "resolve-roll",
        dieOne,
        dieTwo
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
    setDiceDisplay({
      ...previewRoll,
      isAnimating: true
    });

    diceAnimationIntervalRef.current = setInterval(() => {
      try {
        const nextPreviewRoll = rollDiceWithCrypto();
        setDiceDisplay({
          ...nextPreviewRoll,
          isAnimating: true
        });
      } catch {
        setDiceDisplay((currentState) => ({
          ...currentState,
          isAnimating: true
        }));
      }
    }, DICE_ANIMATION_STEP_MS);

    diceAnimationTimeoutRef.current = setTimeout(() => {
      clearDiceAnimationTimers();
      setPendingRoll(null);
      setDiceDisplay({
        ...committedRoll,
        isAnimating: false
      });
      dispatchGameAction({
        type: "resolve-roll",
        dieOne: committedRoll.dieOne,
        dieTwo: committedRoll.dieTwo
      });
    }, DICE_ANIMATION_DURATION_MS);
  }

  return {
    diceOne: diceDisplay.dieOne,
    diceTwo: diceDisplay.dieTwo,
    isDiceAnimating: diceDisplay.isAnimating,
    pendingRoll,
    isManualMode,
    isManualInputValid: !manualDiceInputError,
    diceInputError,
    manualDieOneValue: manualDiceInputs.dieOne,
    manualDieTwoValue: manualDiceInputs.dieTwo,
    resetDiceState,
    setStableDiceDisplay,
    handleRoll,
    handleManualDieInputChange
  };
}
