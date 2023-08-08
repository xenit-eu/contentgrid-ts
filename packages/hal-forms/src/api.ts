import { TypedRequest } from "@contentgrid/typed-request";

export interface HalFormsTemplate<Body, Target> {
    readonly request: TypedRequest<Body, Target>;
    readonly properties: readonly HalFormsProperty[];
    property(propertyName: string): HalFormsProperty;
}

export interface HalFormsProperty {
    readonly name: string;
    readonly readOnly: boolean;
    readonly required: boolean;
    readonly type: string | undefined;
    readonly options: ReadonlyArray<HalFormsPropertyOption>;
    readonly regex: RegExp;
    readonly minLength: number;
    readonly maxLength: number;
    readonly prompt: string | undefined;
}

export interface HalFormsPropertyOption {
    readonly prompt: string;
    readonly value: string;
}
