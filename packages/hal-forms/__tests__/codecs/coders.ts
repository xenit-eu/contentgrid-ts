import { describe, expect, test } from "@jest/globals";
import buildTemplate from "../../src/builder";
import { createValues } from "../../src/values";
import { Coders, HalFormsCodecs, HalFormsDecoderRepresentationNotSupportedError } from "../../src/codecs";
import { EncodedHalFormsRepresentation } from "../../src/codecs/coders";
import { Representation } from "@contentgrid/typed-fetch";

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
    .withValues(plainFilledValues.valueMap)
    .withValue("file", plainTextFile);

describe("Coders.json()", () => {
    const codecs = HalFormsCodecs.builder()
        .registerEncoder(() => true, Coders.json())
        .registerDecoder(() => true, Coders.json())
        .build();

    test("Encodes default values", () => {
        const encoded = codecs.requireCodecFor(plainForm)
        .encode(plainEmptyValues);

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
            .encode(plainFilledValues);

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
            .encode(fileFilledValues))
            .toThrowError();
    })

    test("Refuses to encode files, even when they are not filled in", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileEmptyValues))
            .toThrowError();
    })

    test("Encodes using a custom content type if set on the form", () => {
        const encoded = codecs.requireCodecFor(plainForm.withContentType("application/hal+json"))
            .encode(plainFilledValues)

        expect(encoded.headers.get("content-type")).toEqual("application/hal+json");
    })

    test("Decodes JSON string representation", () => {
        const representation: EncodedHalFormsRepresentation = {
            contentType: "application/json",
            body: Representation.json({
                "name": "Pierre",
                "created_at": "2024-03-22T08:12:29.000Z",
                "total.net": 123,
                "total.vat": 456,
                "senders": ["http://localhost/users/1", "http://localhost/users/2"],
                "active": true
            })
        }
        const decodedValues = codecs.requireCodecFor(plainForm).decode(representation);

        expect(decodedValues.value("name").value).toEqual("Pierre")
        expect(decodedValues.value("created_at").value).toEqual(new Date("2024-03-22T08:12:29.000Z"))
        expect(decodedValues.value("total.net").value).toEqual(123)
        expect(decodedValues.value("active").value).toEqual(true)
    })

    test("Decodes JSON object representation", () => {
        const representation: EncodedHalFormsRepresentation = {
            contentType: "application/json",
            body: {
                "name": "Pierre",
                "created_at": "2024-03-22T08:12:29.000Z",
                "total.net": 123,
                "total.vat": 456,
                "senders": ["http://localhost/users/1", "http://localhost/users/2"],
                "active": true
            }
        }
        const decodedValues = codecs.requireCodecFor(plainForm).decode(representation);

        expect(decodedValues.value("name").value).toEqual("Pierre")
        expect(decodedValues.value("created_at").value).toEqual(new Date("2024-03-22T08:12:29.000Z"))
        expect(decodedValues.value("total.net").value).toEqual(123)
        expect(decodedValues.value("active").value).toEqual(true)
    })

    test("Refuses to decode invalid JSON object representation", () => {
        const representation: EncodedHalFormsRepresentation = {
            contentType: "application/json",
            body: Representation.createUnsafe("{{{")
        };

        const decoder = codecs.requireCodecFor(plainForm);
        expect(() => decoder.decode(representation))
            .toThrowError(new HalFormsDecoderRepresentationNotSupportedError(representation))

    })

})

describe("Coders.nestedJson()", () => {
    const codecs = HalFormsCodecs.builder()
        .registerEncoder(() => true, Coders.nestedJson())
        .registerDecoder(() => true, Coders.nestedJson())
        .build();

    test("Encodes default values", () => {
        const encoded = codecs.requireCodecFor(plainForm)
        .encode(plainEmptyValues);

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
            .encode(plainFilledValues);

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

    test("Decodes JSON string representation", () => {
        const representation: EncodedHalFormsRepresentation = {
            contentType: "application/json",
            body: Representation.json({
                "name": "Pierre",
                "created_at": "2024-03-22T08:12:29.000Z",
                "total": {
                    "net": 123,
                    "vat": 456
                }
            })
        }
        const decodedValues = codecs.requireCodecFor(plainForm).decode(representation);

        expect(decodedValues.value("name").value).toEqual("Pierre")
        expect(decodedValues.value("created_at").value).toEqual(new Date("2024-03-22T08:12:29.000Z"))
        expect(decodedValues.value("total.net").value).toEqual(123)
        expect(decodedValues.value("active").value).toEqual(false) // this is the default value
    })

    test("Decodes JSON object representation", () => {
        const representation: EncodedHalFormsRepresentation = {
            contentType: "application/json",
            body: {
                "name": "Pierre",
                "created_at": "2024-03-22T08:12:29.000Z",
                "total": {
                    "net": 123,
                    "vat": 456
                }
            }
        }
        const decodedValues = codecs.requireCodecFor(plainForm).decode(representation);

        expect(decodedValues.value("name").value).toEqual("Pierre")
        expect(decodedValues.value("created_at").value).toEqual(new Date("2024-03-22T08:12:29.000Z"))
        expect(decodedValues.value("total.net").value).toEqual(123)
        expect(decodedValues.value("active").value).toEqual(false) // this is the default value
    })

    test("Refuses to encode files", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileFilledValues))
            .toThrowError();
    })
    test("Refuses to encode files, even when they are not filled in", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileEmptyValues))
            .toThrowError();
    })

})

describe("Coders.uriList()", () => {
    const codecs = HalFormsCodecs.builder()
        .registerEncoder(() => true, Coders.uriList())
        .build();

    test("Encodes URI value from a single single-value field", () => {
        const form = buildTemplate("POST", "http://localhost/test")
            .addProperty("senders", b => b.withType("url"))
        const values = createValues(form);
        const encoded = codecs.requireCodecFor(form).encode(
            values
                .withValue("senders", "http://localhost/123")
        );

        expect(encoded).toBeInstanceOf(Request);
        expect(encoded.headers.get("content-type")).toEqual("text/uri-list");

        expect(encoded.text())
            .resolves
            .toEqual("http://localhost/123\r\n");
    })

    test("Encodes URI values from a single multi-value field", () => {
        const form = buildTemplate("POST", "http://localhost/test")
            .withContentType("text/uri-list")
            .addProperty("senders", b => b.withType("url")
                .withOptions(b => b.withMinItems(0))
            )
        const values = createValues(form);
        const encoded = codecs.requireCodecFor(form).encode(
            values
                .withValue("senders", ["http://localhost/123", "http://localhost/456"])
        );

        expect(encoded.text())
            .resolves
            .toEqual("http://localhost/123\r\nhttp://localhost/456\r\n");
    })

    test("Encodes URI values from multiple fields", () => {
        const form = buildTemplate("POST", "http://localhost/test")
            .addProperty("senders", b => b.withType("url")
                .withOptions(b => b.withMinItems(0))
            )
            .addProperty("receivers", b => b.withType("url")
                .withOptions(b => b.withMinItems(0))
            )
        const values = createValues(form);
        const encoded = codecs.requireCodecFor(form).encode(
            values
                .withValue("senders", ["http://localhost/123", "http://localhost/456"])
                .withValue("receivers", ["http://localhost/recv/1", "http://localhost/recv/2"])
        );

        expect(encoded.text())
            .resolves
            .toEqual("http://localhost/123\r\nhttp://localhost/456\r\n"+
            "http://localhost/recv/1\r\nhttp://localhost/recv/2\r\n"
            );
    })

    test("Encodes URI values from multiple fields with only one filled in", () => {
        const form = buildTemplate("POST", "http://localhost/test")
            .addProperty("sender", b => b.withType("url"))
            .addProperty("receivers", b => b.withType("url")
                .withOptions(b => b.withMinItems(0))
            )
            .addProperty("cc", b => b.withType("url")
                .withOptions(b => b.withMinItems(0))
            )
        const values = createValues(form);
        const encoded = codecs.requireCodecFor(form).encode(
            values
                .withValue("receivers", ["http://localhost/recv/1", "http://localhost/recv/2"])
        );

        expect(encoded.text())
            .resolves
            .toEqual("http://localhost/recv/1\r\nhttp://localhost/recv/2\r\n");
    })

    test("Refuses to encode a non-url property", () => {
        const form = buildTemplate("POST", "http://localhost/test")
            .addProperty("sender", b => b.withType("text"))
            .addProperty("receivers", b => b.withType("url")
                .withOptions(b => b.withMinItems(0))
            )
            .addProperty("cc", b => b.withType("url")
                .withOptions(b => b.withMinItems(0))
            )
        const values = createValues(form);
        expect(() =>codecs.requireCodecFor(form).encode(
            values
                .withValue("receivers", ["http://localhost/recv/1", "http://localhost/recv/2"])
        )).toThrow();
    })
})

describe("Coders.multipartForm()", () => {
    const codecs = HalFormsCodecs.builder()
        .registerEncoder(() => true, Coders.multipartForm())
        .build();

    test("Encodes default values", () => {
        const encoded = codecs.requireCodecFor(plainForm)
            .encode(plainEmptyValues);

        expect(encoded).toBeInstanceOf(Request);
        expect(encoded.headers.get("content-type")).toMatch(/^multipart\/form-data;/)

        const expected = new FormData();
        expected.append("name", "Jefke");
        expected.append("active", "false");

        expect(encoded.formData())
            .resolves
            .toEqual(expected);
    })

    test("Encodes values", () => {
        const encoded = codecs.requireCodecFor(plainForm)
            .encode(plainFilledValues);

        const expected = new FormData();
        expected.append("created_at", "2024-03-22T08:12:29.000Z");
        expected.append("total.net", "123");
        expected.append("total.vat", "456");
        expected.append("senders", "http://localhost/users/1");
        expected.append("senders", "http://localhost/users/2");
        expected.append("name", "Pierre");
        expected.append("active", "true");
        expect(encoded.formData())
            .resolves
            .toEqual(expected)
    });

    test("Encodes file values", () => {
        const encoded = codecs.requireCodecFor(fileForm).encode(fileFilledValues);

        const expected = new FormData();
        expected.append("created_at", "2024-03-22T08:12:29.000Z");
        expected.append("total.net", "123");
        expected.append("total.vat", "456");
        expected.append("senders", "http://localhost/users/1");
        expected.append("senders", "http://localhost/users/2");
        expected.append("name", "Pierre");
        expected.append("active", "true");
        expected.append("file", plainTextFile);
        expect(encoded.formData())
            .resolves
            .toEqual(expected)
    })
})

describe("Coders.urlencodedForm()", () => {
    const codecs = HalFormsCodecs.builder()
        .registerEncoder(() => true, Coders.urlencodedForm())
        .build();
    test("Encodes default values", () => {
        const encoded = codecs.requireCodecFor(plainForm)
        .encode(plainEmptyValues);

        expect(encoded).toBeInstanceOf(Request);
        expect(encoded.headers.get("content-type")).toMatch(/^application\/x-www-form-urlencoded;/)

        expect(encoded.text())
            .resolves
            .toEqual("name=Jefke&active=false");
    })

    test("Encodes values", () => {
        const encoded = codecs.requireCodecFor(plainForm)
            .encode(plainFilledValues);

        expect(encoded.text())
            .resolves
            .toEqual("created_at=2024-03-22T08%3A12%3A29.000Z&total.net=123&total.vat=456&senders=http%3A%2F%2Flocalhost%2Fusers%2F1&senders=http%3A%2F%2Flocalhost%2Fusers%2F2&name=Pierre&active=true")
    });

    test("Refuses to encode files", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileFilledValues))
            .toThrowError();
    })

    test("Refuses to encode files, even when they are not filled in", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileEmptyValues))
            .toThrowError();
    })

})

describe("Coders.urlencodedQuerystring()", () => {
    const codecs = HalFormsCodecs.builder()
        .registerEncoder(() => true, Coders.urlencodedQuerystring())
        .build();


    test("Encodes values to query string", () => {
        const getTemplate = buildTemplate("GET", "http://localhost/invoices")
            .withContentType("application/x-www-form-urlencoded")
            .addProperty("abc", b => b);
        const value = createValues(getTemplate)
            .withValue("abc", "def ghi");
        const encoded = codecs.requireCodecFor(getTemplate)
            .encode(value);

        expect(encoded.url).toEqual("http://localhost/invoices?abc=def+ghi")
        expect(encoded.body).toBeNull();
    })

    test("Encodes values to query string; appending to existing query string", () => {
        const getTemplate = buildTemplate("GET", "http://localhost/invoices?a=d&z=%2F")
            .withContentType("application/x-www-form-urlencoded")
            .addProperty("abc", b => b);
        const value = createValues(getTemplate)
            .withValue("abc", "def ghi%");
        const encoded = codecs.requireCodecFor(getTemplate)
            .encode(value);

        expect(encoded.url).toEqual("http://localhost/invoices?a=d&z=%2F&abc=def+ghi%25")
        expect(encoded.body).toBeNull();
    })


    test("Refuses to encode files", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileFilledValues))
            .toThrowError();
    })

    test("Refuses to encode files, even when they are not filled in", () => {
        expect(() => codecs.requireCodecFor(fileForm)
            .encode(fileEmptyValues))
            .toThrowError();
    })

})
