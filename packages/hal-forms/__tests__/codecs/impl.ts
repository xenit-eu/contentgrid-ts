import { describe, expect, test } from "@jest/globals";
import buildTemplate from "../../src/builder";
import { default as codecs, Coders, HalFormsCodecNotAvailableError, HalFormsCodecPropertyTypeNotSupportedError, HalFormsCodecs } from "../../src/codecs";
import { EncodedHalFormsRepresentation, nestedJson, urlencodedQuerystring } from "../../src/codecs/coders";
import { Representation } from "@contentgrid/typed-fetch";

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
                .registerEncoder("example/json", Coders.json())
                .build();
            const c = empty.findCodecFor(form);
            expect(c).toBeNull();
        })

        test("throws when an unsupported property type is used", () => {
            const fileForm = form.addProperty("file", p => p.withType("file"));
            expect(() => codecs.findCodecFor(fileForm))
                .toThrowError(new HalFormsCodecPropertyTypeNotSupportedError(fileForm, fileForm.property("file")));
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

describe("Default codecs", () => {
    test("form method=POST, without contentType", () => {
        const form = buildTemplate("POST", "/");
        expect(codecs.findEncoderFor(form)).toEqual(nestedJson());
    })

    test("form method=POST, contentType=application/json", () => {
        const form = buildTemplate("POST", "/")
            .withContentType("application/json");
        expect(codecs.findEncoderFor(form)).toEqual(nestedJson());
    });

    test("form method=POST, contentType=text/plain", () => {
        const form = buildTemplate("POST", "/")
            .withContentType("text/plain");
        expect(codecs.findEncoderFor(form)).toBeNull();
    });

    test("form method=GET, without contentType", () => {
        const form = buildTemplate("GET", "/");
        expect(codecs.findEncoderFor(form)).toEqual(urlencodedQuerystring());
    })

    test("form method=GET, contentType=application/json", () => {
        // Note: the HAL-FORMS spec requires that all forms with methods GET, DELETE & HEAD encode properties in the query string
        // It does not matter which content type is set for the form
        const form = buildTemplate("GET", "/")
            .withContentType("application/json");
        expect(codecs.findEncoderFor(form)).toEqual(urlencodedQuerystring());
    })

    test("representation contentType=application/json", () => {
        const representation: EncodedHalFormsRepresentation = {
            contentType: "application/json",
            body: Representation.createUnsafe(null)
        }
        expect(codecs.findDecoderFor(representation)).toEqual(nestedJson());
    })
})
