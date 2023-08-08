import { describe, test, expect } from "@jest/globals";
import { resolveTemplate } from "../src";

describe("resolveTemplate", () => {

    const object = {
        _links: {
            self: {
                href: "http://localhost/item/4"
            }
        },
        _templates: {
            ["create-form"]: {
                method: "GET",
                target: "http://localhost/create",
                properties: [
                    {
                        name: "abc"
                    },
                    {
                        name: "def",
                        type: "number"
                    },
                    {
                        name: "xyz",
                        readOnly: true
                    }
                ]
            },
            other: {
                method: "POST",
                properties: [
                    {
                        name: "ZZZ",
                        required: true
                    }
                ]
            }
        }
    } as const;

    test("template with target is resolved", () => {
        const template = resolveTemplate(object, "create-form");
        expect(template).not.toBeNull();
        expect(template?.request).toEqual({
            method: "GET",
            url: "http://localhost/create"
        })
        expect(template?.properties.length).toEqual(3);
        expect(template?.property("abc").readOnly).toBe(false);
        expect(template?.property("abc").type).toBeUndefined();
        expect(template?.property("def").readOnly).toBe(false);
        expect(template?.property("def").type).toBe("number");
        expect(template?.property("xyz").readOnly).toBe(true);
    })

    test("template without target is resolved", () => {
        const template = resolveTemplate(object, "other");
        expect(template).not.toBeNull();
        expect(template?.request).toEqual({
            method: "POST",
            url: "http://localhost/item/4"
        })
        expect(template?.properties.length).toEqual(1);
        expect(template?.property("ZZZ").required).toBe(true);
    })

    test("Non-existing template is not resolved", () => {
        const template = resolveTemplate(object as any, "non-existing");
        expect(template).toBeNull();

    })

})
