
import { describe, test, expect } from "@jest/globals";
import HalObject from "../src/HalObject";
import Links from "../src/Links";
import UriTemplate from "@contentgrid/uri-template";
import { createRelations } from "../src/rels";

const dataTemplate = new UriTemplate("http://example.com/rels/data/{rel}");
const dataRels = createRelations(dataTemplate, ["rel1", "rel2", "rel3"] as const);

const modelTemplate = new UriTemplate("http://example.com/rels/model/{rel}");
const modelRels = createRelations(modelTemplate, ["relations"] as const);

describe("HalObject", () => {
    describe("data with some links", () => {
        const object = new HalObject({
            field1: "abc",
            field2: {
                xyz: "def"
            },
            _links: {
                self: {
                    href: "http://example.com/items/4"
                }
            }
        });

        test("data is accessible", () => {
            expect(object.data.field1).toEqual("abc")
        })

        test("self-link is readable", () => {
            expect(object.self.href).toEqual("http://example.com/items/4");
        })

        test("embeddeds are empty", () => {
            const embeddeds = object.embedded.findEmbeddeds(dataRels.rel1);
            expect(embeddeds.length).toBe(0)
        })
    })

    describe("data without any links", () => {
        const object = new HalObject({
            field1: "abc",
            field2: {
                xyz: "def"
            }
        });

        test("data is accessible", () => {
            expect(object.data.field1).toEqual("abc")
        })

        test("self-link is not readable", () => {
            expect(() => object.self).toThrowErrorMatchingInlineSnapshot(`"No links for 'self'"`);
        })
    })

    describe("data with embedded object", () => {
        const object = new HalObject({
            field1: "abc",
            field2: {
                xyz: "def"
            },
            _embedded: {
                ["d:rel1"]: {
                    name: "Nested item 1",
                    _links: {
                        self: {
                            href: "http://example.com/items/5"
                        },
                        "d:rel1": {
                            href: "http://example.com/items/5/rel1"
                        }
                    }
                },
                ["d:rel2"]: [
                    {
                        name: "Nested item 1",
                        _links: {
                            self: {
                                href: "http://example.com/items/5"
                            }
                        }
                    },
                    {
                        name: "Nested item 2",
                        _links: {
                            self: {
                                href: "http://example.com/items/6"
                            }
                        }
                    }
                ]
            },
            _links: {
                curies: [
                    {
                        href: dataTemplate.template,
                        templated: true,
                        name: "d"
                    }
                ]
            }
        });

        test("data is accessible", () => {
            expect(object.data.field1).toEqual("abc")
        })

        test("embedded object is readable", () => {
            const embeddeds = object.embedded.findEmbeddeds(dataRels.rel1);
            expect(embeddeds.length).toEqual(1);
            expect(embeddeds[0]).toBeInstanceOf(HalObject);
            expect(embeddeds[0].self.href).toEqual("http://example.com/items/5")
        })

        test("multiple embedded objects are readable", () => {
            const embeddeds = object.embedded.findEmbeddeds(dataRels.rel2);
            expect(embeddeds.length).toEqual(2);
            expect(embeddeds[0]).toBeInstanceOf(HalObject);
            expect(embeddeds[0].self.href).toEqual("http://example.com/items/5")
            expect(embeddeds[1]).toBeInstanceOf(HalObject);
            expect(embeddeds[1].self.href).toEqual("http://example.com/items/6")
        })

        test("embedded object keeps curie context", () => {
            const embeddeds = object.embedded.findEmbeddeds(dataRels.rel1);

            expect(embeddeds[0].links.requireSingleLink(dataRels.rel1).href).toEqual("http://example.com/items/5/rel1");
        })

        test("non-existent embedded object", () => {
            const embeddeds = object.embedded.findEmbeddeds(dataRels.rel3);

            expect(embeddeds.length).toEqual(0);
        })

    })
})

describe("Links", () => {
    const links = new Links({
        self: {
            href: "http://example.com/items/4"
        },
        ["d:rel1"]: {
            href: "http://example.com/items/4/rel1",
            name: "rel1"
        },
        ["m:relations"]: [
            {
                href: "http://example.com/items/4/rel1",
                name: "rel1"
            },
            {
                href: "http://example.com/items/4/rel2",
                name: "rel2"
            }
        ],
        curies: [
            {
                href: dataTemplate.template,
                templated: true,
                name: "d"
            },
            {
                href: modelTemplate.template,
                templated: true,
                name: "m"
            }
        ]
    });
    describe("#findLink()", () => {
        test("with a single link", () => {
            const link = links.findLink(dataRels.rel1);
            expect(link).not.toBeNull();
            expect(link?.href).toEqual("http://example.com/items/4/rel1");
        })

        test("with a single link and name filter", () => {
            const link = links.findLink(dataRels.rel1, "rel1");
            expect(link).not.toBeNull();
            expect(link?.href).toEqual("http://example.com/items/4/rel1");
        })

        test("with a single link and non-matching name filter", () => {
            const link = links.findLink(dataRels.rel1, "rel2");
            expect(link).toBeNull();
        })

        test("with a non-existent link", () => {
            const link = links.findLink(dataRels.rel2);
            expect(link).toBeNull();
        })

        test("with a multi-value link", () => {
            const link = links.findLink(modelRels.relations);
            expect(link).not.toBeNull();
            expect(link?.href).toEqual("http://example.com/items/4/rel1");
        })

        test("with a multi-value link and name filter", () => {
            const link = links.findLink(modelRels.relations, "rel2");
            expect(link).not.toBeNull();
            expect(link?.href).toEqual("http://example.com/items/4/rel2");
        })

        test("with a multi-value link and non-matching name filter", () => {
            const link = links.findLink(modelRels.relations, "rel3");
            expect(link).toBeNull();
        })
    })

    describe("#findLinks()", () => {
        test("with a single link", () => {
            const link = links.findLinks(dataRels.rel1)
                .map(link => link.href);
            expect(link).toEqual(["http://example.com/items/4/rel1"]);
        })

        test("with a single link and name filter", () => {
            const link = links.findLinks(dataRels.rel1, "rel1")
                .map(link => link.href);
            expect(link).toEqual(["http://example.com/items/4/rel1"]);
        })

        test("with a single link and non-matching name filter", () => {
            const link = links.findLinks(dataRels.rel1, "rel2")
            expect(link).toEqual([]);
        })

        test("with a non-existent link", () => {
            const link = links.findLinks(dataRels.rel2)
            expect(link).toEqual([]);
        })

        test("with a multi-value link", () => {
            const link = links.findLinks(modelRels.relations)
                .map(link => link.href);
            expect(link).toEqual(["http://example.com/items/4/rel1", "http://example.com/items/4/rel2"]);
        })

        test("with a multi-value link and name filter", () => {
            const link = links.findLinks(modelRels.relations, "rel2")
                .map(link => link.href);
            expect(link).toEqual(["http://example.com/items/4/rel2"]);
        })

        test("with a multi-value link and non-matching name filter", () => {
            const link = links.findLinks(modelRels.relations, "rel3")
            expect(link).toEqual([]);
        })
    })

    describe("#requireSingleLink()", () => {
        test("with a single link", () => {
            const link = links.requireSingleLink(dataRels.rel1);
            expect(link.href).toEqual("http://example.com/items/4/rel1");
        })

        test("with a single link and name filter", () => {
            const link = links.requireSingleLink(dataRels.rel1, "rel1");
            expect(link.href).toEqual("http://example.com/items/4/rel1");
        })

        test("with a single link and non-matching name filter", () => {
            expect(() => links.requireSingleLink(dataRels.rel1, "rel2")).toThrowErrorMatchingInlineSnapshot(`"No links for 'http://example.com/rels/data/rel1'"`);
        })

        test("with a non-existent link", () => {
            expect(() => links.requireSingleLink(dataRels.rel2)).toThrowErrorMatchingInlineSnapshot(`"No links for 'http://example.com/rels/data/rel2'"`)
        })

        test("with a multi-value link", () => {
            expect(() => links.requireSingleLink(modelRels.relations)).toThrowErrorMatchingInlineSnapshot(`"Too many links for 'http://example.com/rels/model/relations"`)
        })

        test("with a multi-value link and name filter", () => {
            const link = links.requireSingleLink(modelRels.relations, "rel2");
            expect(link.href).toEqual("http://example.com/items/4/rel2");
        })

        test("with a multi-value link and non-matching name filter", () => {
            expect(() => links.requireSingleLink(modelRels.relations, "rel3")).toThrowErrorMatchingInlineSnapshot(`"No links for 'http://example.com/rels/model/relations'"`);
        })
    })

})

describe("HalEmbedded", () => {


})
