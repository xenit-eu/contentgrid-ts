import type { HalObjectShape } from "@contentgrid/hal/shape";
import type { RequestSpec } from "@contentgrid/typed-request";

declare const _requestType: unique symbol;

export interface HalFormsTemplateShape<BodyType = unknown, ResponseType = unknown> {
    readonly method: string;
    readonly target?: string;
    readonly properties: readonly HalFormsPropertyShape[];
    readonly [_requestType]?: RequestSpec<BodyType, ResponseType>;
}

// @internal
export type TemplateRequestSpec<T extends HalFormsTemplateShape<any, any>> = Exclude<T[typeof _requestType], undefined>;

export enum HalFormsPropertyType {
    hidden = "hidden",
    text = "text",
    url = "url",
    number = "number",
    checkbox = "checkbox",
    radio = "radio"
}

export interface HalFormsPropertyShape {
    readonly name: string;
    readonly type?: `${HalFormsPropertyType}` | `${HalFormsPropertyType}[]`;
    readonly required?: boolean;
    readonly readOnly?: boolean;
    readonly options?: HalFormsPropertyOptionsShape;
    readonly regex?: string;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly prompt?: string;
}

interface HalFormsPropertyOptionsShape {
    readonly inline?: string[]
}

export type HalObjectWithTemplateShape<T, Name extends string, BodyType, ResponseType> = HalObjectShape<T> &
{
    readonly _templates?: Readonly<Partial<Record<Name, HalFormsTemplateShape<BodyType, ResponseType>>>>;
}
