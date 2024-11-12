import buildTemplate, { HalFormsTemplateBuilder } from "../src/builder";

describe("HalFormsTemplateBuilder", () => {
    it("#fromTemplate", () => {
        const original = buildTemplate("GET", "/")
            .withContentType("application/json")
            .addProperty("xyz", p => p.withPrompt("Test"));

        const fromTemplate = HalFormsTemplateBuilder.fromTemplate(original);

        expect(fromTemplate.contentType).toEqual("application/json");
        expect(fromTemplate.properties).toHaveLength(1);
        expect(fromTemplate.properties[0]?.name).toEqual("xyz");
        expect(fromTemplate.properties[0]?.prompt).toEqual("Test");
    })
});
