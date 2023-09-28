import { describe, test, expect, jest } from "@jest/globals";
import { resolveTemplate } from "../src";
import { HalObjectShape } from "@contentgrid/hal/shape";
import { HalFormsTemplateShape } from "../src/shape";

describe("resolveTemplate", () => {

    const object: HalObjectShape<{
        _templates: {
            ["create-form"]: HalFormsTemplateShape,
            other: HalFormsTemplateShape
        }
    }> = {
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
                        name: "abc",
                        type: "text",
                        options: {
                            inline: [
                                {
                                    XXX: "abc",
                                    v: "ABC"
                                },
                                {
                                    XXX: "def",
                                    v: "ABD"
                                }
                            ] as const,
                            promptField: "XXX",
                            valueField: "v"
                        }
                    },
                    {
                        name: "def",
                        type: "number",
                        options: {
                            link: {
                                href: "http://localhost/numbers?q=4"
                            }
                        }
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
        const propAbc = template!.property("abc");
        expect(template?.property("abc").readOnly).toBe(false);
        expect(template?.property("abc").type).toEqual("text");
        const abcOpts = propAbc.options;
        expect(abcOpts.isInline()).toBe(true);
        expect(abcOpts.loadOptions(() => { throw new Error("Not implemented") }))
            .resolves
            .toEqual([
                {
                    prompt: "abc",
                    value: "ABC"
                },
                {
                    prompt: "def",
                    value: "ABD"
                }
            ])

        if(abcOpts.isInline()) {
            expect(abcOpts.inline.length).toBe(2);
        }

        expect(template?.property("def").readOnly).toBe(false);
        expect(template?.property("def").type).toBe("number");
        const defOpts = template!.property("def").options;
        expect(defOpts.isRemote()).toBe(true);

        const mockLoad = jest.fn(() => Promise.resolve(["1", "2", "3"]));

        expect(defOpts.loadOptions(mockLoad))
            .resolves
            .toEqual([
                {
                    prompt: "1",
                    value: "1"
                },
                {
                    prompt: "2",
                    value: "2"
                },
                {
                    prompt: "3",
                    value: "3"
                }
            ]);

        if(abcOpts.isRemote()) {
            expect(mockLoad.mock.lastCall).toHaveBeenCalledWith(abcOpts.link);
            expect(abcOpts.link.href).toEqual("http://localhost/numbers?q=4");
        }

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
