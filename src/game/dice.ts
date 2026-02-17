import { DICE_PER_ROLL, DIE_MAX, DIE_MIN } from "@/game/constants";

export interface DiceValues {
  dieOne: number;
  dieTwo: number;
}

const RANDOM_BYTE_MAX = 255;
const DIE_FACE_COUNT = DIE_MAX - DIE_MIN + 1;
const MAX_UNBIASED_BYTE =
  Math.floor((RANDOM_BYTE_MAX + 1) / DIE_FACE_COUNT) * DIE_FACE_COUNT - 1;

export function normalizeRandomByteToDieValue(randomByte: number): number | null {
  if (
    !Number.isInteger(randomByte) ||
    randomByte < 0 ||
    randomByte > RANDOM_BYTE_MAX ||
    randomByte > MAX_UNBIASED_BYTE
  ) {
    return null;
  }

  return DIE_MIN + (randomByte % DIE_FACE_COUNT);
}

export function rollDiceWithCrypto(cryptoApi: Crypto = globalThis.crypto): DiceValues {
  if (!cryptoApi?.getRandomValues) {
    throw new Error("crypto.getRandomValues is unavailable.");
  }

  const dieValues: number[] = [];

  while (dieValues.length < DICE_PER_ROLL) {
    const randomBytes = cryptoApi.getRandomValues(new Uint8Array(DICE_PER_ROLL));

    for (const randomByte of randomBytes) {
      const dieValue = normalizeRandomByteToDieValue(randomByte);

      if (dieValue === null) {
        continue;
      }

      dieValues.push(dieValue);
      if (dieValues.length === DICE_PER_ROLL) {
        break;
      }
    }
  }

  return {
    dieOne: dieValues[0],
    dieTwo: dieValues[1]
  };
}
