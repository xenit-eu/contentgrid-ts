import { describe, expect, test } from "@jest/globals";
import buildTemplate from "../src/builder";
import { createValues } from "../src/values";
import { Encoders, HalFormsCodecs } from "../src/codecs";

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

const plainForm = buildTemplate("POST", "http://localhost/invoices")
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
    .addProperty("active", b => b.withType("checkbox").withValue(false));

const plainEmptyValues = createValues(plainForm);

const createdAt = new Date("2024-03-22T09:12:29+01:00");

const plainFilledValues = plainEmptyValues
    .withValue("created_at", createdAt)
    .withValue("total.net", 123)
    .withValue("total.vat", 456)
    .withValue("senders", ["http://localhost/users/1", "http://localhost/users/2"])
    .withValue("name", "Pierre")
    .withValue("active", true);

const plainTextFile = new File([], "my-file.txt", {
    type: "text/plain"
});

const fileForm = plainForm
    .addProperty("file", b => b.withType("file"));

const fileEmptyValues = createValues(fileForm);
const fileFilledValues = fileEmptyValues
    .withValue("file", plainTextFile);

describe("Encoders.json()", () => {
    const codecs = HalFormsCodecs.builder()
        .registerEncoder(() => true, Encoders.json())
        .build();

    test("Encodes default values", () => {
        const encoded = codecs.requireCodecFor(plainForm)
        .encode(plainEmptyValues.values);

        expect(encoded).toBeInstanceOf(Request);

        expect(encoded.headers.get("content-type")).toEqual("application/json");

        expect(encoded.json())
            .resolves
            .toEqual({
                "name": "Jefke",
                "active": false
            });
    })

    test("Encodes nested values as flat JSON", () => {
        const encoded = codecs.requireCodecFor(plainForm)
            .encode(plainFilledValues.values);

        expect(encoded.headers.get("content-type")).toEqual("application/json");
        expect(encoded.json())
            .resolves
            .toEqual({
                "name": "Pierre",
                "created_at": "2024-03-22T08:12:29.000Z",
                "total.net": 123,
                "total.vat": 456,
                "senders": ["http://localhost/users/1", "http://localhost/users/2"],
                "active": true
            })
    });

    test("Refuses to encode files", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileFilledValues.values))
            .toThrowError();
    })

    test("Refuses to encode files, even when they are not filled in", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileEmptyValues.values))
            .toThrowError();
    })

})

describe("Encoders.nestedJson()", () => {
    const codecs = HalFormsCodecs.builder()
        .registerEncoder(() => true, Encoders.nestedJson())
        .build();

    test("Encodes default values", () => {
        const encoded = codecs.requireCodecFor(plainForm)
        .encode(plainEmptyValues.values);

        expect(encoded).toBeInstanceOf(Request);
        expect(encoded.headers.get("content-type")).toEqual("application/json");

        expect(encoded.json())
            .resolves
            .toEqual({
                "name": "Jefke",
                "active": false
            });
    })

    test("Encodes nested values as JSON", () => {
        const encoded = codecs.requireCodecFor(plainForm)
            .encode(plainFilledValues.values);

        expect(encoded.headers.get("content-type")).toEqual("application/json");

        expect(encoded.json())
            .resolves
            .toEqual({
                "name": "Pierre",
                "created_at": "2024-03-22T08:12:29.000Z",
                "total": {
                    "net": 123,
                    "vat": 456
                },
                "senders": ["http://localhost/users/1", "http://localhost/users/2"],
                "active": true
            })
    });

    test("Refuses to encode files", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileFilledValues.values))
            .toThrowError();
    })
    test("Refuses to encode files, even when they are not filled in", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileEmptyValues.values))
            .toThrowError();
    })

})
