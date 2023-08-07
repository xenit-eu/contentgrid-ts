import { describe, test, expect } from "@jest/globals";
import { createRelations } from "../src/rels";
import { PlainLinkRelation } from "../src/rels/LinkRelation";
import UriTemplate from "@contentgrid/uri-template";

describe("createRelations", () => {
    test("for unprefixed relations", () => {
        const rels = createRelations(["test1", "test2"] as const);
        expect(Object.keys(rels)).toEqual(["test1", "test2"]);

        expect(rels.test1).toEqual(new PlainLinkRelation("test1"));
    })

    test("for relations with a template", () => {
        const rels = createRelations(new UriTemplate("http://example.com/rels/{x}"), ["test1", "test2"]);

        expect(Object.keys(rels)).toEqual(["test1", "test2"]);

        expect(rels.test1).toEqual(new PlainLinkRelation("http://example.com/rels/test1"));
    })
})
