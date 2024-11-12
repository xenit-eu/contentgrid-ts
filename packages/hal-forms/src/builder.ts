import { HalFormsProperty, HalFormsPropertyInlineOptions, HalFormsPropertyOption, HalFormsPropertyRemoteOptions, HalFormsTemplate } from "./api";
import { MATCH_ANYTHING, MATCH_NOTHING } from "./_internal";
import { TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsPropertyType, HalFormsPropertyValue } from "./_shape";
import { SimpleLink } from "@contentgrid/hal";

export class HalFormsTemplateBuilder<Body, Response> implements HalFormsTemplate<TypedRequestSpec<Body, Response>> {

    private constructor(
        public readonly name: string,
        public readonly request: TypedRequestSpec<Body, Response>,
        public readonly contentType: string | undefined = undefined,
        public readonly properties: HalFormsProperty[] = []
    ) {

    }

    public static from<B, R>(request: TypedRequestSpec<B, R>): HalFormsTemplateBuilder<B, R> {
        return new HalFormsTemplateBuilder(request.method + " "+request.url, request);
    }

    public static fromTemplate<B, R>(template: HalFormsTemplate<TypedRequestSpec<B, R>>): HalFormsTemplateBuilder<B, R> {
        let builder = this.from(template.request)
            .withName(template.name)
            .withContentType(template.contentType);

        for (const prop of template.properties) {
            builder = builder.addProperty(prop.name, () => prop);
        }

        return builder;
    }

    public get title() {
        return undefined;
    }

    public withName(name: string): HalFormsTemplateBuilder<Body, Response> {
        return new HalFormsTemplateBuilder(name, this.request, this.contentType, this.properties);
    }

    public property(propertyName: string): HalFormsProperty {
        return this.properties
            .find(property => property.name === propertyName) ?? new HalFormsPropertyBuilder(
                propertyName,
                HalFormsPropertyType.text,
                true,
                false,
                null,
                MATCH_NOTHING,
                0,
                Number.MAX_SAFE_INTEGER,
                undefined,
                undefined
            );
    }

    public addProperty(propertyName: string, factory: (builder: HalFormsPropertyBuilder) => HalFormsProperty): HalFormsTemplateBuilder<Body, Response> {

        const newPropertyBuilder = new HalFormsPropertyBuilder(
            propertyName,
            HalFormsPropertyType.text,
            false,
            false,
            null,
            MATCH_ANYTHING,
            0,
            Number.MAX_SAFE_INTEGER,
            undefined,
            undefined
        );

        const builtProperty = factory(newPropertyBuilder);

        return new HalFormsTemplateBuilder(this.name, this.request, this.contentType, this.properties.concat([builtProperty]))
    }

    public withContentType(contentType: string | undefined): HalFormsTemplateBuilder<Body, Response> {
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
        private readonly _options: HalFormsPropertyOptionsBuilder | null,
        public readonly regex: RegExp,
        public readonly minLength: number,
        public readonly maxLength: number,
        public readonly prompt: string | undefined,
        public readonly value: HalFormsPropertyValue | undefined
    ) {
    }

    public get options(): HalFormsPropertyInlineOptions | HalFormsPropertyRemoteOptions | null {
        if(this._options === null) {
            return null;
        }
        return this._options.build();
    }

    public get multiValue(): boolean {
        if (this.options === null) {
            return false;
        }
        return this.options.maxItems !== 1;
    }


    public withType(type: string): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, type, this.readOnly, this.required, this._options, this.regex, this.minLength, this.maxLength, this.prompt, this.value);
    }

    public withReadOnly(readOnly: boolean): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, readOnly, this.required, this._options, this.regex, this.minLength, this.maxLength, this.prompt, this.value);
    }

    public withRequired(required: boolean): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, required, this._options, this.regex, this.minLength, this.maxLength, this.prompt, this.value);
    }

    public withOptions(options: readonly HalFormsPropertyOption[]): HalFormsPropertyBuilder;
    public withOptions(options: (builder: HalFormsPropertyOptionsBuilder) => HalFormsPropertyOptionsBuilder): HalFormsPropertyBuilder;

    public withOptions(options: readonly HalFormsPropertyOption[] | ((builder: HalFormsPropertyOptionsBuilder) => HalFormsPropertyOptionsBuilder)): HalFormsPropertyBuilder {
        if(Array.isArray(options)) {
            return this.withOptions(opts => opts.withInline(options));
        }
        if(typeof options === "function") {
            return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, options(this._options ?? new HalFormsPropertyOptionsImpl()), this.regex, this.minLength, this.maxLength, this.prompt, this.value);
        }
        throw new Error("Unknown type of options");
    }

    public addOption(option: HalFormsPropertyOption): HalFormsPropertyBuilder;
    public addOption(value: string, prompt?: string): HalFormsPropertyBuilder;

    public addOption(optionOrValue: HalFormsPropertyOption|string, prompt?: string): HalFormsPropertyBuilder {
        const option = typeof optionOrValue === "object" ? optionOrValue : { value: optionOrValue, prompt: prompt ?? optionOrValue };

        return this.withOptions(o => o.addInlineOption(option))
    }

    public withRegex(regex: RegExp|null): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this._options, regex ?? MATCH_ANYTHING, this.minLength, this.maxLength, this.prompt, this.value);
    }

    public withLength(min: number, max: number) {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this._options, this.regex, min, max, this.prompt, this.value);
    }

    public withPrompt(prompt: string): HalFormsPropertyBuilder {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this._options, this.regex, this.minLength, this.maxLength, prompt, this.value);
    }

    public withValue(value: HalFormsPropertyValue | undefined) {
        return new HalFormsPropertyBuilder(this.name, this.type, this.readOnly, this.required, this._options, this.regex, this.minLength, this.maxLength, this.prompt, value);
    }
}

export interface HalFormsPropertyOptionsBuilder {
    withInline(inline: readonly HalFormsPropertyOption[]): HalFormsPropertyOptionsBuilder;
    addInlineOption(option: HalFormsPropertyOption): HalFormsPropertyOptionsBuilder;
    withRemote(link: SimpleLink): HalFormsPropertyOptionsBuilder;
    withMaxItems(maxItems: number): HalFormsPropertyOptionsBuilder;
    withMinItems(minItems: number): HalFormsPropertyOptionsBuilder;
    build(): HalFormsPropertyInlineOptions | HalFormsPropertyRemoteOptions;
}

type Writeable<T> = {
    -readonly [P in keyof T]?: T[P];
}

class HalFormsPropertyOptionsImpl implements HalFormsPropertyInlineOptions<HalFormsPropertyOption>, HalFormsPropertyRemoteOptions<HalFormsPropertyOption>, HalFormsPropertyOptionsBuilder {


    public constructor(
        public readonly inline: readonly HalFormsPropertyOption[] = undefined!,
        public readonly link: SimpleLink = undefined!,
        public readonly maxItems: number = Infinity,
        public readonly minItems: number = 0,
    ) {
        // This is to ensure that the 'inline' or 'link' properties are really not available when they are unset,
        // without having to create two separate classes for them
        if(!link) {
            delete (this as Writeable<this>).link;
        }
        if(!inline) {
            delete (this as Writeable<this>).inline
        }
    }

    public withInline(inline: readonly HalFormsPropertyOption[]): HalFormsPropertyOptionsBuilder {
        return new HalFormsPropertyOptionsImpl(inline, undefined!, this.maxItems, this.minItems);
    }

    public addInlineOption(option: HalFormsPropertyOption): HalFormsPropertyOptionsBuilder {
        return this.withInline((this.inline ?? []).concat([option]));
    }

    public withRemote(link: SimpleLink): HalFormsPropertyOptionsBuilder {
        return new HalFormsPropertyOptionsImpl(undefined!, link, this.maxItems, this.minItems);
    }

    public withMaxItems(maxItems: number): HalFormsPropertyOptionsBuilder {
        return new HalFormsPropertyOptionsImpl(this.inline, this.link, maxItems, this.minItems);
    }

    public withMinItems(minItems: number): HalFormsPropertyOptionsBuilder {
        return new HalFormsPropertyOptionsImpl(this.inline, this.link, this.maxItems, minItems);
    }

    public build(): HalFormsPropertyInlineOptions<unknown> | HalFormsPropertyRemoteOptions<unknown> {
        return this;
    }

    public get selectedValues(): readonly string[] {
        return [];
    }

    public toOption(data: HalFormsPropertyOption): HalFormsPropertyOption {
        return data;
    }

    public async loadOptions(): Promise<readonly HalFormsPropertyOption[]>;
    public async loadOptions(fetcher: (link: SimpleLink) => Promise<readonly HalFormsPropertyOption[]>): Promise<readonly HalFormsPropertyOption[]>;
    public async loadOptions(fetcher?: (link: SimpleLink) => Promise<readonly HalFormsPropertyOption[]>): Promise<readonly HalFormsPropertyOption[]> {
        if (this.isRemote() && fetcher) {
            return await fetcher(this.link);
        }

        if (this.isInline()) {
            return this.inline;
        }

        throw new Error("Options are not inline or remote");
    }

    public isInline(): this is HalFormsPropertyInlineOptions<HalFormsPropertyOption> {
        return this.inline !== undefined;
    }

    public isRemote(): this is HalFormsPropertyRemoteOptions<HalFormsPropertyOption> {
        return this.link !== undefined;
    }

}


export default function buildTemplate<B, R>(method: string, url: string): HalFormsTemplateBuilder<B, R> {
    return HalFormsTemplateBuilder.from<B, R>({ method, url })
}
