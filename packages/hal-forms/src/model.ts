import { HalFormsProperty, HalFormsPropertyInlineOptions, HalFormsPropertyOption, HalFormsPropertyRemoteOptions, HalFormsTemplate } from "./api";
import { MATCH_ANYTHING, MATCH_NOTHING } from "./_internal";
import { HalFormsPropertyOptionsShape, HalFormsPropertyShape, HalFormsPropertyValue, HalFormsTemplateShape, HalObjectWithTemplateShape, TemplateTypedRequest } from "./_shape";
import { TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalObjectShape } from "@contentgrid/hal/shape";
import { HalTemplateNotFoundError, HalFormsTemplateError, InvalidHalFormsOptionError } from "./errors";
import { HalError, HalObject, SimpleLink } from "@contentgrid/hal";

class HalFormsTemplateImpl<Body, Response> implements HalFormsTemplate<TypedRequestSpec<Body, Response>> {

    public constructor(private readonly templateName: string, private readonly entity: HalObjectShape<object>, private readonly model: HalFormsTemplateShape<Body, Response>) {

    }

    public get name(): string {
        return this.templateName;
    }

    public get contentType() {
        return this.model.contentType;
    }

    public get title() {
        return this.model.title ?? undefined;
    }

    public get request(): TypedRequestSpec<Body, Response> {
        if(this.model.target !== undefined) {
            return {
                method: this.model.method,
                url: this.model.target
            } as TypedRequestSpec<Body, Response>;
        }

        const hal = new HalObject(this.entity);
        try {
            const selfLink = hal.self.href;
            return {
                method: this.model.method,
                url: selfLink
            } as TypedRequestSpec<Body, Response>;
        } catch(error) {
            if(error instanceof HalError) {
                throw new HalFormsTemplateError(this.templateName, "Missing 'target' and '_links.self'");
            } else {
                throw new HalFormsTemplateError(this.templateName, "Missing 'target' and failed to resolve '_links.self'")
            }
        }

    }

    public property(propertyName: string): HalFormsProperty {
        var propertyModel = this.model.properties
            .find(prop => prop.name === propertyName);

        return new HalFormsPropertyImpl(this, propertyName, propertyModel);
    }

    public get properties(): readonly HalFormsProperty[] {
        return this.model.properties.map(prop => new HalFormsPropertyImpl(this, prop.name, prop));
    }

}

class HalFormsPropertyImpl<OptionType = unknown> implements HalFormsProperty<OptionType> {
    public constructor(private readonly _template: HalFormsTemplate<any>, public readonly name: string, private readonly model: HalFormsPropertyShape<OptionType> | undefined) {

    }

    get readOnly(): boolean {
        if(!this.model) {
            return true;
        }
        return this.model.readOnly ?? false;
    }

    get required(): boolean {
        if(!this.model) {
            return false;
        }
        return this.model.required ?? false;
    }

    get type(): string {
        return this.model?.type ?? "text";
    }

    get options(): HalFormsPropertyInlineOptions<OptionType> | HalFormsPropertyRemoteOptions<OptionType> | null {
        const options = this.model?.options;
        if(options?.inline) {
            return new HalFormsPropertyInlineOptionsImpl(this._template, this, options)
        }
        if(options?.link) {
            return new HalFormsPropertyRemoteOptionsImpl(this._template, this, options)
        }
        if(options) {
            return new HalFormsPropertyInlineOptionsImpl(this._template, this, options)
        } else {
            return null;
        }
    }

    get multiValue(): boolean {
        if(this.options === null) {
            return false;
        }
        return this.options.maxItems !== 1;
    }

    get regex(): RegExp {
        if(!this.model) {
            return MATCH_NOTHING;
        }
        if(!this.model.regex) {
            return MATCH_ANYTHING;
        }
        // See https://html.spec.whatwg.org/multipage/input.html#the-pattern-attribute
        return new RegExp('^(?:'+this.model.regex+')$', 'u');
    }

    get minLength(): number {
        if (!this.model || !this.model.minLength) {
            return 0;
        }
        return this.model.minLength;
    }

    get maxLength(): number {
        return this.model?.maxLength ?? Infinity;
    }

    get prompt(): string | undefined {
        return this.model?.prompt;
    }

    get value(): HalFormsPropertyValue | undefined {
        return this.model?.value;
    }
}

abstract class HalFormsPropertyCommonOptionsImpl<T>  {
    public constructor(private readonly _template: HalFormsTemplate<any>, private readonly _property: HalFormsProperty<any>, protected model: HalFormsPropertyOptionsShape<T> | undefined) {

    }

    public get selectedValues(): readonly string[] {
        return this.model?.selectedValues ?? [];
    }

    public get maxItems(): number {
        return this.model?.maxItems ?? Infinity;
    }

    public get minItems(): number {
        return this.model?.minItems ?? 0;
    }

    public toOption(data: T): HalFormsPropertyOption {
        if (data !== null && typeof data === "object") {
            const promptField = this.model?.promptField ?? "prompt";
            const valueField = this.model?.valueField ?? "value";

            if(!(promptField in data) || !data[promptField as keyof T]) {
                throw new InvalidHalFormsOptionError(this._template, this._property, `Field '${promptField}' missing in option data`);
            }
            if(!(valueField in data) || !data[valueField as keyof T]) {
                throw new InvalidHalFormsOptionError(this._template, this._property, `Field '${valueField}' missing in option data`);
            }

            return {
                prompt: data[promptField as keyof T]!.toString(),
                value: data[valueField as keyof T]!.toString()
            };
        } else if(data !== null && data !== undefined) {
            const value = data.toString();
            return { prompt: value, value };
        } else {
            throw new InvalidHalFormsOptionError(this._template, this._property, `Invalid datatype '${typeof data}'`);
        }
    }

}

class HalFormsPropertyInlineOptionsImpl<T = unknown> extends HalFormsPropertyCommonOptionsImpl<T> implements HalFormsPropertyInlineOptions<T> {
    public get inline(): readonly T[] {
        return this.model?.inline ?? [];
    }

    public loadOptions(): Promise<readonly HalFormsPropertyOption[]> {
        return Promise.resolve(this.inline.map(value => this.toOption(value)));
    }

    public isInline(): this is HalFormsPropertyInlineOptions<T> {
        return true;
    }

    public isRemote(): this is HalFormsPropertyRemoteOptions<T> {
        return false;
    }
}

class HalFormsPropertyRemoteOptionsImpl<T = unknown> extends HalFormsPropertyCommonOptionsImpl<T> implements HalFormsPropertyRemoteOptions<T> {
    public readonly link: SimpleLink;
    public constructor(template: HalFormsTemplate<any>, property: HalFormsProperty<any>, model: HalFormsPropertyOptionsShape<T>) {
        super(template, property, model);
        this.link = new SimpleLink(model.link!);
    }

    public async loadOptions(fetcher: (link: SimpleLink) => Promise<readonly T[]>): Promise<readonly HalFormsPropertyOption[]> {
        const data = await fetcher(this.link);

        return data.map(value => this.toOption(value));
    }

    public isInline(): this is HalFormsPropertyInlineOptions<T> {
        return false;
    }

    public isRemote(): this is HalFormsPropertyRemoteOptions<T> {
        return true;
    }

}

type ExtractTemplate<TemplateName extends string, Entity extends HalObjectWithTemplateShape<object, TemplateName, any, any>> = Exclude<Exclude<Entity["_templates"], undefined>[TemplateName], undefined>;

type ExtractTemplateRequest<TemplateName extends string, Entity extends HalObjectWithTemplateShape<object, TemplateName, any, any>> = TemplateTypedRequest<ExtractTemplate<TemplateName, Entity>>;

export function resolveTemplate<
    TemplateName extends string,
    Entity extends HalObjectWithTemplateShape<object, TemplateName, any, any>
    >(entity: Entity, name: TemplateName): HalFormsTemplate<ExtractTemplateRequest<TemplateName, Entity>> | null {
        const template = entity._templates?.[name];
        if(!template) {
            return null;
        }
        return new HalFormsTemplateImpl(name, entity, template) as any;
}

export function resolveTemplateRequired<
    TemplateName extends string,
    Entity extends HalObjectWithTemplateShape<object, TemplateName, any, any>
>(entity: Entity, name: TemplateName): HalFormsTemplate<ExtractTemplateRequest<TemplateName, Entity>> {
    const template = resolveTemplate(entity, name);
    if (template === null) {
        throw new HalTemplateNotFoundError(name);
    }
    return template;
}
