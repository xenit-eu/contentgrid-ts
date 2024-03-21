import { describe, expect, test } from "@jest/globals";
import buildTemplate from "../src/builder";
import { default as codecs, Encoders, HalFormsCodecNotAvailableError, HalFormsCodecs } from "../src/codecs";
import { createValues } from "../src/values";

const form = buildTemplate("POST", "http://localhost/invoices")
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
    .addProperty("name", b => b.withValue("Jefke"));

describe("HalFormsCodecs", () => {

    describe("#findCodecFor()", () => {
        test("finds a codec", () => {
            const c = codecs.findCodecFor(form);
            expect(c).not.toBeNull();
        })

        test("does not find a codec", () => {
            const empty = HalFormsCodecs.builder()
                .registerEncoder("example/json", Encoders.json())
                .build();
            const c = empty.findCodecFor(form);
            expect(c).toBeNull();
        })
    });

    describe("#requireCodecFor()", () => {

        test("requires a codec", () => {
            const c = codecs.requireCodecFor(form);
            expect(c).not.toBeNull();
        })

        test("does not find a required codec", () => {
            const empty = HalFormsCodecs.builder().build();
            expect(() => empty.requireCodecFor(form))
                .toThrowError(new HalFormsCodecNotAvailableError(form));
        })

    })
})

describe("Encoders.json()", () => {
    const values = createValues(form);
    const codecs = HalFormsCodecs.builder()
        .registerEncoder("application/json", Encoders.json())
        .build();

    test("Encodes default values", () => {
        const encoded = codecs.requireCodecFor(form).encode(values.values);

        expect(encoded).toBeInstanceOf(Request);

        expect(encoded.json())
            .resolves
            .toEqual({
                "name": "Jefke"
            });
    })

    test("Encodes nested values as flat JSON", () => {

        const encoded = codecs.requireCodecFor(form).encode(
            values
                .withValue("total.net", 123)
                .withValue("total.vat", 456)
                .values
        );

        expect(encoded).toBeInstanceOf(Request);

        expect(encoded.json())
            .resolves
            .toEqual({
                "name": "Jefke",
                "total.net": 123,
                "total.vat": 456
            })
    });

})

describe("Encoders.nestedJson()", () => {
    const values = createValues(form);
    const codecs = HalFormsCodecs.builder()
        .registerEncoder("application/json", Encoders.nestedJson())
        .build();

    test("Encodes default values", () => {
        const encoded = codecs.requireCodecFor(form).encode(values.values);

        expect(encoded).toBeInstanceOf(Request);

        expect(encoded.json())
            .resolves
            .toEqual({
                "name": "Jefke"
            });
    })

    test("Encodes nested values as flat JSON", () => {

        const encoded = codecs.requireCodecFor(form).encode(
            values
                .withValue("total.net", 123)
                .withValue("total.vat", 456)
                .values
        );

        expect(encoded).toBeInstanceOf(Request);

        expect(encoded.json())
            .resolves
            .toEqual({
                "name": "Jefke",
                "total": {
                    "net": 123,
                    "vat": 456
                }
            })
    });

})