import { describe, test, expect } from "@jest/globals";
import { Curie, CurieRegistry } from "../src/curies";
import UriTemplate from "@contentgrid/uri-template";
import { PlainLinkRelation } from "../src/rels/LinkRelation";
import { CuriedLinkRelation } from "../src/curies/CuriedLinkRelation";
import Links from "../src/Links";

describe("curie", () => {
    test("is parsed from a CURIE string", () => {
        expect(Curie.parse("x:Test")).toEqual(new Curie("x", "Test"));
        expect(Curie.parse("xZY:Test")).toEqual(new Curie("xZY", "Test"));
    })

    test("is parsed from a safeCURIE string", () => {
        expect(Curie.parse("[x:Test]")).toEqual(new Curie("x", "Test"));
    })

    test("is parsed from a string containing multiple colons", () => {
        expect(Curie.parse("x:Test:zz")).toEqual(new Curie("x", "Test:zz"));
    })

    test("parses a local-part only", () => {
        expect(Curie.parse("self")).toEqual(null);
    })

    describe("safeCURIE", () => {
        test("is not parsed from a CURIE string", () => {
            expect(Curie.parseSafe("x:Test")).toEqual(null);
        })

        test("is parsed from a safeCURIE string", () => {
            expect(Curie.parse("[x:Test]")).toEqual(new Curie("x", "Test"));
        })
    })
})

describe("registry", () => {
    describe("created from a mapping", () => {
        const registry = CurieRegistry.fromMapping({
            xyz: new UriTemplate("http://example.invalid/rels/xyz/{rel}"),
            f: new UriTemplate("http://f.invalid/rels/{x}")
        });


        test("resolves CURIE to link relation", () => {
            var rel = registry.resolve(new Curie("xyz", "Test"));
            expect(rel.canonical).toEqual("http://example.invalid/rels/xyz/Test")
            expect(rel.value).toEqual("[xyz:Test]");
        })

        test("Compacts link relation to a CURIE", () => {
            expect(registry.compact(new PlainLinkRelation("http://f.invalid/rels/XYZ/def"))).toEqual(new Curie("f", "XYZ/def"));
            expect(registry.compact(new CuriedLinkRelation(new Curie("xyz", "abc"), new UriTemplate("http://f.invalid/rels/{x}")))).toEqual(new Curie("f", "abc"));
        })

        test("does not resolve unregistered CURIE to a link relation", () => {
            var rel = registry.resolve(new Curie("invalid", "xyz"));
            expect(rel.canonical).toEqual("invalid:xyz");
            expect(rel.value).toEqual("[invalid:xyz]");
        })

        test("does not compact an unknown link relation", () => {
            expect(registry.compact(new PlainLinkRelation("http://unknown.invalid/rels/abc"))).toEqual(null);
        })
    })

    test("Does not accept URI templates with multiple values", () => {
        expect(() => CurieRegistry.fromMapping({
            xyz: new UriTemplate("http://example.invalid/rels/{item}/{second}")
        })).toThrowErrorMatchingInlineSnapshot(`"Template for prefix 'xyz' does not contain exactly one variable."`);
    })

    describe("created from links", () => {
        test("when no curies are present", () => {
            const links = new Links({});

            expect(CurieRegistry.fromLinks(links)).toEqual(CurieRegistry.fromMapping({}));
        })

        test("when a single curie is present", () => {
            const links = new Links({
                curies: {
                    href: "http://example.invalid/{item}",
                    templated: true,
                    name: "e"
                }
            });

            expect(CurieRegistry.fromLinks(links)).toEqual(CurieRegistry.fromMapping({
                e: new UriTemplate("http://example.invalid/{item}")
            }))
        })

        test("when multiple curies are present", () => {
            const links = new Links({
                curies: [
                    {
                        href: "http://example.invalid/{item}",
                        templated: true,
                        name: "e"
                    },
                    {
                        href: "http://f.invalid/rels/{rel}",
                        templated: true,
                        name: "f"
                    }
                ]
            });

            expect(CurieRegistry.fromLinks(links)).toEqual(CurieRegistry.fromMapping({
                e: new UriTemplate("http://example.invalid/{item}"),
                f: new UriTemplate("http://f.invalid/rels/{rel}")
            }))
        })

        test("fails when a curie without name is present", () => {

            const links = new Links({
                curies: {
                    href: "http://example.invalid/{item}",
                    templated: true
                }
            }, CurieRegistry.fromMapping({}));

            expect(() => CurieRegistry.fromLinks(links)).toThrowErrorMatchingInlineSnapshot(`"Invalid curie <http://example.invalid/{item}>; rel="curies": missing 'name' parameter"`);
        })

        test('fails when multiple curies with the same name are present', () => {
            const links = new Links({
                curies: [
                    {
                        href: "http://example.invalid/{item}",
                        templated: true,
                        name: "e"
                    },
                    {
                        href: "http://f.invalid/rels/{rel}",
                        templated: true,
                        name: "e"
                    }
                ]
            }, CurieRegistry.fromMapping({}));

            expect(() => CurieRegistry.fromLinks(links)).toThrowErrorMatchingInlineSnapshot(`"Invalid curie <http://f.invalid/rels/{rel}>; rel="curies"; name="e": 'e is already registered"`);
        })

    })

})
