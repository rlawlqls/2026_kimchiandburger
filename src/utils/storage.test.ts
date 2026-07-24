import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { storageKey } from "./storage";

// Minimal stand-in — the tests run in node, where localStorage does not exist.
function fakeStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

let store: ReturnType<typeof fakeStorage>;
const install = (seed?: Record<string, string>) => {
  store = fakeStorage(seed);
  Object.defineProperty(globalThis, "localStorage", { value: store, configurable: true });
};

beforeEach(() => install());
afterEach(() => {
  Reflect.deleteProperty(globalThis, "localStorage");
});

describe("storageKey", () => {
  it("namespaces under the current prefix", () => {
    expect(storageKey("profile")).toBe("marketmate.profile");
  });

  it("carries a Jangbogi-era value over and drops the old entry", () => {
    install({ "jangbogi.profile": '{"name":"Mina"}' });
    storageKey("profile");
    expect(store.map.get("marketmate.profile")).toBe('{"name":"Mina"}');
    expect(store.map.has("jangbogi.profile")).toBe(false);
  });

  it("keeps the newer value when both keys exist", () => {
    install({ "jangbogi.history": "[1]", "marketmate.history": "[2]" });
    storageKey("history");
    expect(store.map.get("marketmate.history")).toBe("[2]");
    expect(store.map.has("jangbogi.history")).toBe(false);
  });

  it("leaves an untouched key alone", () => {
    storageKey("uploadConsent");
    expect(store.map.size).toBe(0);
  });

  it("still returns a usable key when storage throws (private mode)", () => {
    Object.defineProperty(globalThis, "localStorage", {
      get() {
        throw new Error("blocked");
      },
      configurable: true,
    });
    expect(storageKey("profile")).toBe("marketmate.profile");
  });
});
