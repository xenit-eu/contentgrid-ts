import { SimpleLink } from "@contentgrid/hal";
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

    it("builds no options", async () => {
        const template = buildTemplate("POST", "/")
            .addProperty("tags", p => p.withOptions(o => o.withMinItems(0)));

        const property = template.property("tags");
        const options = property.options!;

        expect(options.isInline()).toBe(false);
        expect(options.isRemote()).toBe(false);
        expect(property.multiValue).toBe(true);
        await expect(options.loadOptions(() => { throw new Error("Not implemented") }))
            .resolves
            .toEqual([]);
    })

    it("builds remote options", async () => {
        const template = buildTemplate("POST", "/")
            .addProperty("sender", p => p.withOptions(o => o.withRemote(new SimpleLink({ href: "/senders" }))));

        const options = template.property("sender").options!;

        expect(options.isInline()).toBe(false);
        expect(options.isRemote()).toBe(true);

        const remoteOptions = [
            {"prompt": "John", "value": "john@example.test"},
            {"prompt": "Alice", "value": "alice@example.test"}
        ];

        await expect(options.loadOptions(() => Promise.resolve(remoteOptions)))
            .resolves
            .toEqual(remoteOptions);

        await expect((options.loadOptions as () => Promise<unknown>)())
            .rejects
            .toThrow("Remote options require a fetcher");
    })

    it("builds inline options", () => {
        const template = buildTemplate("POST", "/")
            .addProperty("color", p => p.addOption("red"));

        expect(template.property("color").options!.isInline()).toBe(true);
    })
});
