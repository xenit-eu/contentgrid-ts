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

    it("builds empty options", async () => {
        const template = buildTemplate("POST", "/")
            .addProperty("tags", p => p.withOptions(o => o.withMinItems(0)));

        const property = template.property("tags");
        const options = property.options!;

        expect(options.isEmpty()).toBe(true);
        expect(options.isInline()).toBe(false);
        expect(options.isRemote()).toBe(false);
        expect(property.multiValue).toBe(true);
        await expect(options.loadOptions(() => { throw new Error("Not implemented") }))
            .resolves
            .toEqual([]);
    })

    it("builds inline options that are not empty", () => {
        const template = buildTemplate("POST", "/")
            .addProperty("color", p => p.addOption("red"));

        expect(template.property("color").options!.isEmpty()).toBe(false);
    })
});
