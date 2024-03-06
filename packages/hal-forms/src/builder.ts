import { HalFormsProperty, HalFormsPropertyInlineOptions, HalFormsPropertyOption, HalFormsPropertyRemoteOptions, HalFormsTemplate } from "./api";
import { MATCH_ANYTHING, MATCH_NOTHING } from "./_internal";
import { TypedRequestSpec } from "@contentgrid/typed-fetch";

export class HalFormsTemplateBuilder<Body, Response> implements HalFormsTemplate<TypedRequestSpec<Body, Response>> {

    private constructor(
        public readonly name: string,
        public readonly request: TypedRequestSpec<Body, Response>,
        public readonly contentType: string = "application/json",
        public readonly properties: HalFormsProperty[] = []
    ) {

    }

    public static from<B, R>(request: TypedRequestSpec<B, R>): HalFormsTemplateBuilder<B, R> {
        return new HalFormsTemplateBuilder(request.method + " "+request.url, request);
    }

    public get title() {
        return undefined;
    }

    public property(propertyName: string): HalFormsProperty {
        return this.properties
            .find(property => property.name === propertyName) ?? new HalFormsPropertyBuilder(
                propertyName,
                "text",
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
            "text",
            false,
            false,
            [],
            MATCH_ANYTHING,
            0,
            Number.MAX_SAFE_INTEGER,
            undefined
        );

        const builtProperty = factory(newPropertyBuilder);

        return new HalFormsTemplateBuilder(this.name, this.request, this.contentType, this.properties.concat([builtProperty]))
    }

    public withContentType(contentType: string):  HalFormsTemplateBuilder<Body, Response> {
        return new HalFormsTemplateBuilder(this.name, this.request, contentType, this.properties)
    }

}

export class HalFormsPropertyBuilder implements HalFormsProperty {
    // @internal
    public constructor(
        public readonly name: string,
        public readonly type: string,
        public readonly readOnly: boolean,
        public readonly required: boolean,
        private readonly _options: readonly HalFormsPropertyOption[],
        public readonly regex: RegExp,
        public readonly minLength: number,
        public readonly maxLength: number,
        public readonly prompt: string | undefined,
    ) {
    }

    public get options(): HalFormsPropertyInlineOptions<HalFormsPropertyOption> {
        return new HalFormsPropertyInlineOptionsImpl(this._options);
    }

    public withType(type: string): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, type, this.readOnly, this.required, this._options, this.regex, this.minLength, this.maxLength, this.prompt);
    }

    public withReadOnly(readOnly: boolean): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, readOnly, this.required, this._options, this.regex, this.minLength, this.maxLength, this.prompt);
    }

    public withRequired(required: boolean): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, required, this._options, this.regex, this.minLength, this.maxLength, this.prompt);
    }

    public withOptions(options: readonly HalFormsPropertyOption[]): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, options, this.regex, this.minLength, this.maxLength, this.prompt);
    }

    public addOption(option: HalFormsPropertyOption): HalFormsPropertyBuilder;
    public addOption(value: string, prompt?: string): HalFormsPropertyBuilder;

    public addOption(optionOrValue: HalFormsPropertyOption|string, prompt?: string): HalFormsPropertyBuilder {
        const option = typeof optionOrValue === "object" ? optionOrValue : { value: optionOrValue, prompt: prompt ?? optionOrValue };

        return this.withOptions(this._options.concat([option]))
    }

    public withRegex(regex: RegExp|null): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this._options, regex ?? MATCH_ANYTHING, this.minLength, this.maxLength, this.prompt);
    }

    public withLength(min: number, max: number) {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this._options, this.regex, min, max, this.prompt);
    }

    public withPrompt(prompt: string): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this._options, this.regex, this.minLength, this.maxLength, prompt);
    }
}

class HalFormsPropertyInlineOptionsImpl implements HalFormsPropertyInlineOptions<HalFormsPropertyOption> {
    public constructor(public readonly inline: readonly HalFormsPropertyOption[]) {

    }

    public get selectedValues(): readonly string[] {
        return[]
    }

    public get maxItems(): number {
        return Infinity;
    }

    public get minItems(): number {
        return 0;
    }

    public toOption(data: HalFormsPropertyOption): HalFormsPropertyOption {
        return data;
    }

    public loadOptions(): Promise<readonly HalFormsPropertyOption[]> {
        return Promise.resolve(this.inline);
    }

    public isInline(): this is HalFormsPropertyInlineOptions<HalFormsPropertyOption> {
        return true;
    }

    public isRemote(): this is HalFormsPropertyRemoteOptions<HalFormsPropertyOption> {
        return false;
    }

}

export default function buildTemplate<B, R>(method: string, url: string): HalFormsTemplateBuilder<B, R> {
    return HalFormsTemplateBuilder.from<B, R>({ method, url })
}
