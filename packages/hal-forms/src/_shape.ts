import type { HalObjectShape, LinkShape } from "@contentgrid/hal/shape";
import type { TypedRequestSpec } from "@contentgrid/typed-fetch";

declare const _requestType: unique symbol;

export interface HalFormsTemplateShape<BodyType = unknown, ResponseType = unknown> {
    readonly method: string;
    readonly target?: string;
    readonly contentType?: string;
    readonly title?: string;
    readonly properties: readonly HalFormsPropertyShape[];
    readonly [_requestType]?: TypedRequestSpec<BodyType, ResponseType>;
}

export type TemplateTypedRequest<T extends HalFormsTemplateShape<any, any>> = Exclude<T[typeof _requestType], undefined>;

export enum HalFormsPropertyType {
    hidden = "hidden",
    text = "text",
    url = "url",
    email = "email",
    date = "date",
    time = "time",
    datetime = "datetime",
    datetime_local = "datetime-local",
    number = "number",
    range = "range",
    checkbox = "checkbox",
    radio = "radio",
    file = "file",
}

export type HalFormsPropertyValue = string | number | boolean | null | readonly string[] | readonly number[] | readonly boolean[];

export interface HalFormsPropertyShape<OptionType = any> {
    readonly name: string;
    readonly type?: `${HalFormsPropertyType}`;
    readonly required?: boolean;
    readonly readOnly?: boolean;
    readonly options?: HalFormsPropertyOptionsShape<OptionType>;
    readonly regex?: string;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly prompt?: string;
    readonly value?: HalFormsPropertyValue;
}

export interface HalFormsPropertyOptionsShape<T = unknown> {
    readonly inline?: readonly T[]
    readonly link?: LinkShape;
    readonly selectedValues?: readonly string[];
    readonly promptField?: keyof T & string;
    readonly valueField?: keyof T & string;
    readonly maxItems?: number;
    readonly minItems?: number;
}

export type HalObjectWithTemplateShape<T, Name extends string, BodyType, ResponseType> = HalObjectShape<T> &
{
    readonly _templates?: Readonly<Partial<Record<Name, HalFormsTemplateShape<BodyType, ResponseType>>>>;
}
