import { describe, expect, it } from "vitest";
import { buildOrderPhrase, clampQty, MAX_QTY } from "./orderPhrase";
import type { MenuItem } from "../types";

const tteok = { hangul: "떡볶이", roman: "tteok-bokki" } as MenuItem;

describe("clampQty", () => {
  it("keeps values within 1..MAX", () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(3)).toBe(3);
    expect(clampQty(999)).toBe(MAX_QTY);
    expect(clampQty(NaN)).toBe(1);
    expect(clampQty(2.6)).toBe(3);
  });
});

describe("buildOrderPhrase", () => {
  it("uses native Korean counters for 1..10", () => {
    expect(buildOrderPhrase(tteok, 1).ko).toBe("떡볶이 한 개 주세요");
    expect(buildOrderPhrase(tteok, 3).ko).toBe("떡볶이 세 개 주세요");
    expect(buildOrderPhrase(tteok, 3).roman).toBe("tteok-bokki se-gae ju-se-yo");
  });

  it("produces the English order line with the quantity", () => {
    expect(buildOrderPhrase(tteok, 3).en).toBe("Can I order 3 tteok-bokki please");
  });

  it("falls back to digits past ten", () => {
    expect(buildOrderPhrase(tteok, 12).ko).toBe("떡볶이 12 개 주세요");
  });

  it("clamps out-of-range quantities", () => {
    expect(buildOrderPhrase(tteok, 0).en).toBe("Can I order 1 tteok-bokki please");
  });
});
