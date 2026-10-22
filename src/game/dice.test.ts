import {
  normalizeRandomByteToDieValue,
  rollDiceWithCrypto
} from "@/game/dice";

describe("normalizeRandomByteToDieValue", () => {
  it("maps unbiased byte values into die faces", () => {
    expect(normalizeRandomByteToDieValue(0)).toBe(1);
    expect(normalizeRandomByteToDieValue(5)).toBe(6);
    expect(normalizeRandomByteToDieValue(6)).toBe(1);
    expect(normalizeRandomByteToDieValue(251)).toBe(6);
  });

  it("rejects biased and invalid byte values", () => {
    expect(normalizeRandomByteToDieValue(252)).toBeNull();
    expect(normalizeRandomByteToDieValue(255)).toBeNull();
    expect(normalizeRandomByteToDieValue(-1)).toBeNull();
    expect(normalizeRandomByteToDieValue(1.5)).toBeNull();
  });
});

describe("rollDiceWithCrypto", () => {
  it("retries until it gets two valid die values", () => {
    let callCount = 0;
    const sequences = [
      [255, 252],
      [0, 5]
    ];
    const cryptoApi = {
      getRandomValues: jest.fn((buffer: Uint8Array) => {
        const selectedSequence = sequences[callCount] ?? [0, 0];
        buffer.set(selectedSequence);
        callCount += 1;
        return buffer;
      })
    } as unknown as Crypto;

    expect(rollDiceWithCrypto(cryptoApi)).toEqual({
      dieOne: 1,
      dieTwo: 6
    });
    expect(cryptoApi.getRandomValues).toHaveBeenCalledTimes(2);
  });

  it("throws when getRandomValues is unavailable", () => {
    expect(() => rollDiceWithCrypto(null as unknown as Crypto)).toThrow(
      "crypto.getRandomValues is unavailable."
    );
  });
});

describe("dice fairness", () => {
  it("maps every accepted byte evenly onto the six faces", () => {
    const counts = new Map<number, number>();
    for (let byte = 0; byte <= 255; byte += 1) {
      const face = normalizeRandomByteToDieValue(byte);
      if (face !== null) {
        counts.set(face, (counts.get(face) ?? 0) + 1);
      }
    }
    expect([...counts.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(counts.values())).toEqual(new Set([42]));
  });

  it("only produces faces 1-6 from the real crypto source", () => {
    const { webcrypto } = jest.requireActual("crypto") as typeof import("crypto");
    const seen = new Set<number>();
    for (let index = 0; index < 500; index += 1) {
      const roll = rollDiceWithCrypto(webcrypto as unknown as Crypto);
      for (const value of [roll.dieOne, roll.dieTwo]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(6);
        seen.add(value);
      }
    }
    expect(seen.size).toBe(6);
  });
});
