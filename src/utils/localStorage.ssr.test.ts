/**
 * @jest-environment node
 */
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "@/utils/localStorage";

// The static export prerenders without window; storage helpers must not throw.
describe("localStorage helpers without window", () => {
  it("fall back quietly", () => {
    expect(readLocalStorage("k", "fallback")).toBe("fallback");
    expect(writeLocalStorage("k", 1)).toBe(false);
    expect(removeLocalStorage("k")).toBe(false);
  });
});
