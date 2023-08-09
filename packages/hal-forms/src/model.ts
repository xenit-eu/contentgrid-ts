import { HalFormsProperty, HalFormsTemplate } from "./api";
import { MATCH_ANYTHING, MATCH_NOTHING } from "./_internal";
import { HalFormsPropertyShape, HalFormsTemplateShape, HalObjectWithTemplateShape, TemplateTypedRequest } from "./_shape";
import { TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalObjectShape } from "@contentgrid/hal/shape";
import { HalTemplateNotFoundError, HalFormsTemplateError } from "./errors";
import { HalError, HalObject } from "@contentgrid/hal";

class HalFormsTemplateImpl<Body, Response> implements HalFormsTemplate<TypedRequestSpec<Body, Response>> {

    public constructor(private readonly templateName: string, private readonly entity: HalObjectShape<object>, private readonly model: HalFormsTemplateShape<Body, Response>) {

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

        return new HalFormsPropertyImpl(propertyName, propertyModel);
    }

    public get properties(): readonly HalFormsProperty[] {
        return this.model.properties.map(prop => new HalFormsPropertyImpl(prop.name, prop));
    }

}

class HalFormsPropertyImpl implements HalFormsProperty {
    public constructor(public readonly name: string, private readonly model: HalFormsPropertyShape | undefined) {

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

    get type(): string | undefined {
        return this.model?.type;
    }

    get options(): ReadonlyArray<{ readonly prompt: string, readonly value: string }> {
        if(!this.model?.options?.inline) {
            return [];
        }
        if(Array.isArray(this.model.options.inline)) {
            return this.model.options.inline
                .map(opt => ({prompt: opt, value: opt}));
        }
        return []; // TODO: implement prompt/value when it becomes necessary
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
        return this.model?.maxLength ?? Number.MAX_SAFE_INTEGER;
    }

    get prompt(): string | undefined {
        return this.model?.prompt;
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
