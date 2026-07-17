import { describe, expect, it } from "vitest";
import { extractHangul, levenshtein, matchMenu } from "./match";

describe("levenshtein", () => {
  it("computes edit distance", () => {
    expect(levenshtein("떡볶이", "떡볶이")).toBe(0);
    expect(levenshtein("떡뽁이", "떡볶이")).toBe(1);
    expect(levenshtein("라면", "우동")).toBe(2);
  });
});

describe("extractHangul", () => {
  it("strips prices and punctuation", () => {
    expect(extractHangul("치즈떡볶이 2,500원")).toBe("치즈떡볶이");
    expect(extractHangul("3,000")).toBe("");
  });
});

describe("matchMenu — OCR misread samples", () => {
  const cases: Array<[string, string]> = [
    ["떡볶이", "tteokbokki"], // exact
    ["떡뽁이", "tteokbokki"], // alias misread
    ["떡복이", "tteokbokki"], // alias misread
    ["떡볶기", "tteokbokki"], // edit distance 1
    ["치즈떡볶이2500", "cheese-tteokbokki"], // containment with price glued on
    ["오뎅", "eomuk"], // colloquial alias
    ["순데", "sundae"], // vowel misread
    ["김빱", "gimbap"], // tense consonant misread
    ["돈가스", "donkkaseu"], // spelling variant
    ["라볶이", "rabokki"], // must NOT collapse into tteokbokki
    ["잔치국수", "janchi-guksu"],
    ["상추튀김", "sangchu-twigim"],
  ];

  it.each(cases)("%s → %s", (input, expectedId) => {
    expect(matchMenu(input)?.id).toBe(expectedId);
  });

  it("prefers the longest containment match", () => {
    expect(matchMenu("치즈떡볶이")?.id).toBe("cheese-tteokbokki");
    expect(matchMenu("국물떡볶이")?.id).toBe("gukmul-tteokbokki");
  });

  it("rejects noise: prices, shop names, notices", () => {
    expect(matchMenu("3,000")).toBeNull();
    expect(matchMenu("맛나분식")).toBeNull();
    expect(matchMenu("포장됩니다")).toBeNull();
    expect(matchMenu("메뉴")).toBeNull();
  });

  it("requires exact match for words of 2 chars or fewer", () => {
    expect(matchMenu("순대")?.id).toBe("sundae");
    expect(matchMenu("라면")?.id).toBe("ramyeon");
    expect(matchMenu("라멸")).toBeNull(); // distance 1 but too short → no fuzzy
  });
});
