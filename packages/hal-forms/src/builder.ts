import { HalFormsProperty, HalFormsPropertyOption, HalFormsTemplate } from "./api";
import { MATCH_ANYTHING, MATCH_NOTHING } from "./_internal";
import { TypedRequestSpec } from "@contentgrid/typed-fetch";

export class HalFormsTemplateBuilder<Body, Response> implements HalFormsTemplate<Body, Response> {

    private constructor(public readonly request: TypedRequestSpec<Body, Response>, public readonly properties: HalFormsProperty[] = []) {

    }

    public static from<B, R>(request: TypedRequestSpec<B, R>): HalFormsTemplateBuilder<B, R> {
        return new HalFormsTemplateBuilder(request);
    }

    public property(propertyName: string): HalFormsProperty {
        return this.properties
            .find(property => property.name === propertyName) ?? new HalFormsPropertyBuilder(
                propertyName,
                undefined,
                true,
                false,
                [],
                MATCH_NOTHING,
                0,
                Number.MAX_SAFE_INTEGER,
                undefined
            );
    }

    public addProperty(propertyName: string, factory: (builder: HalFormsPropertyBuilder) => HalFormsProperty): HalFormsTemplateBuilder<Body, Response> {

        const newPropertyBuilder = new HalFormsPropertyBuilder(
            propertyName,
            undefined,
            false,
            false,
            [],
            MATCH_ANYTHING,
            0,
            Number.MAX_SAFE_INTEGER,
            undefined
        );

        const builtProperty = factory(newPropertyBuilder);

        return new HalFormsTemplateBuilder(this.request, this.properties.concat([builtProperty]))
    }

}

export class HalFormsPropertyBuilder implements HalFormsProperty {
    public constructor(
        public readonly name: string,
        public readonly type: string | undefined,
        public readonly readOnly: boolean,
        public readonly required: boolean,
        public readonly options: readonly HalFormsPropertyOption[],
        public readonly regex: RegExp,
        public readonly minLength: number,
        public readonly maxLength: number,
        public readonly prompt: string | undefined,
    ) {
    }

    public withType(type: string): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, type, this.readOnly, this.required, this.options, this.regex, this.minLength, this.maxLength, this.prompt);
    }

    public withReadOnly(readOnly: boolean): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, readOnly, this.required, this.options, this.regex, this.minLength, this.maxLength, this.prompt);
    }

    public withRequired(required: boolean): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, required, this.options, this.regex, this.minLength, this.maxLength, this.prompt);
    }

    public withOptions(options: readonly HalFormsPropertyOption[]): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, options, this.regex, this.minLength, this.maxLength, this.prompt);
    }

    public addOption(option: HalFormsPropertyOption): HalFormsPropertyBuilder;
    public addOption(value: string, prompt?: string): HalFormsPropertyBuilder;

    public addOption(optionOrValue: HalFormsPropertyOption|string, prompt?: string): HalFormsPropertyBuilder {
        const option = typeof optionOrValue === "object" ? optionOrValue : { value: optionOrValue, prompt: prompt ?? optionOrValue };

        return this.withOptions(this.options.concat([option]))
    }

    public withRegex(regex: RegExp|null): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this.options, regex ?? MATCH_ANYTHING, this.minLength, this.maxLength, this.prompt);
    }

    public withLength(min: number, max: number) {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this.options, this.regex, min, max, this.prompt);
    }

    public withPrompt(prompt: string): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this.options, this.regex, this.minLength, this.maxLength, prompt);
    }

}

export default function buildTemplate<B, R>(method: string, url: string): HalFormsTemplateBuilder<B, R> {
    return HalFormsTemplateBuilder.from({ method, url } as TypedRequestSpec<B, R>)
}
