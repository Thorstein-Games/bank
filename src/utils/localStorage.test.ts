import {
  buildVersionedStorageKey,
  readLocalStorage,
  removeLocalStorage,
  safeJsonParse,
  safeJsonStringify,
  writeLocalStorage,
} from "@/utils/localStorage";

beforeEach(() => window.localStorage.clear());

describe("buildVersionedStorageKey", () => {
  it("namespaces and versions keys", () => {
    expect(buildVersionedStorageKey("x")).toBe("bank-game:v1:x");
    expect(buildVersionedStorageKey("x", 3)).toBe("bank-game:v3:x");
  });
});

describe("safeJsonParse / safeJsonStringify", () => {
  it("parses JSON and falls back on null or garbage", () => {
    expect(safeJsonParse('{"a":1}', null)).toEqual({ a: 1 });
    expect(safeJsonParse(null, "fallback")).toBe("fallback");
    expect(safeJsonParse("{oops", "fallback")).toBe("fallback");
  });

  it("returns null for values that cannot be serialized", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(safeJsonStringify(circular)).toBeNull();
    expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
  });
});

describe("read/write/remove", () => {
  it("round-trips values", () => {
    expect(writeLocalStorage("k", { n: 1 })).toBe(true);
    expect(readLocalStorage("k", null)).toEqual({ n: 1 });
    expect(removeLocalStorage("k")).toBe(true);
    expect(readLocalStorage("k", "gone")).toBe("gone");
  });

  it("refuses to write unserializable values", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(writeLocalStorage("k", circular)).toBe(false);
    expect(window.localStorage.getItem("k")).toBeNull();
  });

  it("returns false when removal throws", () => {
    const spy = jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(removeLocalStorage("k")).toBe(false);
    spy.mockRestore();
  });
});
