import { describe, test, expect } from "@jest/globals";
import buildTemplate from "../src/builder";
import { HalFormValueTypeError, createValues } from "../src/values";

class File extends Blob {

    public constructor(fileBits: BlobPart[], public name: string, private options?: FilePropertyBag) {
        super(fileBits, options);
    }

    get lastModified(): number {
        return this.options?.lastModified ?? 0;
    }

    get webkitRelativePath(): string {
        return this.name;
    }
}

global.File = File;

describe("values", () => {

    const form = buildTemplate("POST", "/invoices")
        .withContentType("application/json")
        .addProperty("created_at", b => b
            .withType("datetime")
            .withRequired(true)
        )
        .addProperty("total.net", b => b
            .withType("number")
        )
        .addProperty("total.vat", b => b
            .withType("number")
        )
        .addProperty("senders", b => b.withType("url")
            .withOptions(b => b.withMinItems(0))
        )
        .addProperty("name", b => b.withValue("Jefke"))
        .addProperty("picture", b => b.withType("file"))
        .addProperty("enabled", b => b.withType("checkbox"))

    const formValues = createValues(form)

    test("Form defaults", () => {
        expect(formValues.values).toHaveLength(7)
        expect(formValues.value("created_at").value).toBeUndefined();
        expect(formValues.value("total.net").value).toBeUndefined();
        expect(formValues.value("total.vat").value).toBeUndefined();
        expect(formValues.value("name").value).toEqual("Jefke");
        expect(formValues.value("enabled").value).toBeUndefined();
    })

    describe("#withValue()", () => {
        test("with valid values", () => {
            const withNewData = formValues.withValue("total.vat", 123);

            expect(withNewData.values).toHaveLength(7)
            expect(withNewData.value("created_at").value).toBeUndefined();
            expect(withNewData.value("total.net").value).toBeUndefined();
            expect(withNewData.value("total.vat").value).toEqual(123);
            expect(withNewData.value("name").value).toEqual("Jefke");
            expect(withNewData.value("file").value).toBeUndefined()
            expect(withNewData.value("enabled").value).toBeUndefined();
        })


        test("with a valid file", () => {
            const file = new File([], "my-file.txt", {
                type: "text/plain"
            });
            const withNewData = formValues.withValue("picture", file);

            expect(withNewData.value("picture").value).toEqual(file);
        })

        test("with an invalid value type", () => {

            expect(() => formValues.withValue("total.vat", null as any))
                .toThrowError(new HalFormValueTypeError(form, form.property("total.vat"), null))

            expect(() => formValues.withValue("total.vat", "123"))
                .toThrowError(new HalFormValueTypeError(form, form.property("total.vat"), "123"))

            expect(() => formValues.withValue("total.vat", false))
                .toThrowError(new HalFormValueTypeError(form, form.property("total.vat"), false))

            expect(() => formValues.withValue("created_at", false))
                .toThrowError(new HalFormValueTypeError(form, form.property("created_at"), false))

            const dateArray = [new Date(), new Date()];
            expect(() => formValues.withValue("created_at", dateArray))
                .toThrowError(new HalFormValueTypeError(form, form.property("created_at"), dateArray))

            expect(() => formValues.withValue("senders", "/sender/123"))
                .toThrowError(new HalFormValueTypeError(form, form.property("senders"), "/sender/123"))

            expect(() => formValues.withValue("senders", [["/abc"] as any]))
                .toThrowError(new HalFormValueTypeError(form, form.property("senders"), [["/abc"]]))

            expect(() => formValues.withValue("senders", dateArray))
                .toThrowError(new HalFormValueTypeError(form, form.property("senders"), dateArray))

            expect(() => formValues.withValue("picture", "abc"))
                .toThrowError(new HalFormValueTypeError(form, form.property("picture"), "abc"))

            expect(() => formValues.withValue("enabled", "xyz"))
                .toThrowError(new HalFormValueTypeError(form, form.property("enabled"), "xyz"))

        })

        test("with a stringy date value", () => {
            const date = "2024-03-07T18:16:12+01:00";
            const withNewData = formValues.withValue("created_at", date);
            expect(withNewData.value("created_at").value).toBeInstanceOf(Date);
        })

        test("with an array value", () => {
            const senders = [
                "/senders/1",
                "/senders/2"
            ];
            const withNewData = formValues.withValue("senders", senders);
            expect(withNewData.value("senders").value).toEqual(senders);
        })

        test("with a boolean value", () => {
            const withNewData = formValues.withValue("enabled", false);
            expect(withNewData.value("enabled").value).toEqual(false);
        })
    })

    test("#withoutValue()", () => {
        const withNewData = formValues.withValue("total.vat", 123)
            .withoutValue("total.vat");
        expect(withNewData.value("total.vat").value).toBeUndefined();
    })

    describe("#withValues()", () => {
        test("with correct values", () => {
            const withNewData = formValues.withValues({
                "created_at": new Date(),
                "total.net": 120,
                "name": "Jaak"
            });

            expect(withNewData.values).toHaveLength(7)
            expect(withNewData.value("created_at").value).toBeInstanceOf(Date);
            expect(withNewData.value("total.net").value).toEqual(120);
            expect(withNewData.value("total.vat").value).toBeUndefined();
            expect(withNewData.value("name").value).toEqual("Jaak");
        })

    })

})

describe("HalFormValueTypeError", () => {
    const form = buildTemplate("POST", "/")
        .withName("xyz")
        .addProperty("single", p => p)
        .addProperty("multi", p => p.withOptions(o => o))
        .addProperty("file", p => p.withType("file"))

    const single = form.property("single");
    const multi = form.property("multi");

    describe("Exception message", () => {
        test("for single-value field", () => {
            const prefix = "Template xyz: property single: expected type text, but got "
            expect(new HalFormValueTypeError(form, single, null)).toHaveProperty("message", prefix + "null")
            expect(new HalFormValueTypeError(form, single, undefined)).toHaveProperty("message", prefix + "undefined")
            expect(new HalFormValueTypeError(form, single, [])).toHaveProperty("message", prefix + "empty list")
            expect(new HalFormValueTypeError(form, single, [123])).toHaveProperty("message", prefix + "list of number")
            expect(new HalFormValueTypeError(form, single, [123, 456])).toHaveProperty("message", prefix + "list of number")
            expect(new HalFormValueTypeError(form, single, ["abc"])).toHaveProperty("message", prefix + "list of string")
            expect(new HalFormValueTypeError(form, single, [new Date()])).toHaveProperty("message", prefix + "list of Date")
            expect(new HalFormValueTypeError(form, single, [[null]])).toHaveProperty("message", prefix + "list of list of null")
            expect(new HalFormValueTypeError(form, single, [123, "string"])).toHaveProperty("message", prefix + "list of number, string")

            expect(new HalFormValueTypeError(form, form.property("file"), 123))
                .toHaveProperty("message", "Template xyz: property file: expected type file, but got number")
            expect(new HalFormValueTypeError(form, single, new File([], "filename.txt")))
                .toHaveProperty("message", "Template xyz: property single: expected type text, but got File")
        })

        test("for multi-value field", () => {
            expect(new HalFormValueTypeError(form, multi, null))
                .toHaveProperty("message", "Template xyz: property multi: expected type text list, but got null")
        })

    })

})
