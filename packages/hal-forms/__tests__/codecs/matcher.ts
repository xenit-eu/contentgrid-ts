import { describe, expect, test } from "@jest/globals";
import { MultiMatcher, Predicate, PredicateMatcher, ProviderMatcher } from "../../src/codecs/matcher"

describe("PredicateMatcher", () => {
    const matcher = new PredicateMatcher<Predicate<number>, string>(i => i < 5, "small");

    test("return value when only predicate matches", () => {
        expect(matcher.match(1)).toBe("small");
        expect(matcher.match(10)).toBeNull()
    })

    test("return value when it matches postfilter", () => {
        expect(matcher.match(1, (v) => v === "small")).toBe("small");
        expect(matcher.match(1, (v) => v === "large")).toBeNull();
    })
})

describe("ProviderMatcher", () => {
    const matcher = new ProviderMatcher<number, string>(i => isNaN(i) ? null : "" + i);

    test("return value derived from provider", () => {
        expect(matcher.match(5)).toBe("5");
        expect(matcher.match(NaN)).toBe(null);
    })

    test("return value when it matches postfilter", () => {
        expect(matcher.match(1, (v) => v === "1")).toBe("1");
        expect(matcher.match(1, (v) => v === "2")).toBeNull();
    })
})

describe("MultiMatcher", () => {
    const matcher = new MultiMatcher<Predicate<number>, string>();

    matcher.registerPredicate(i => i % 2 == 0, "fizz");
    matcher.registerPredicate(i => i % 5 == 0, "buzz");
    matcher.registerProvider(i => "" + i);

    test("return first match when predicate matches", () => {
        expect(matcher.match(0)).toBe("fizz");
        expect(matcher.match(1)).toBe("1");
        expect(matcher.match(4)).toBe("fizz");
        expect(matcher.match(5)).toBe("buzz");
    })

    test("return first match that matches postfilter", () => {
        expect(matcher.match(0, v => v !== "fizz")).toBe("buzz");
        expect(matcher.match(2, v => v !== "fizz")).toBe("2");
        expect(matcher.match(1, v => v !== "1")).toBeNull();
    })
})
