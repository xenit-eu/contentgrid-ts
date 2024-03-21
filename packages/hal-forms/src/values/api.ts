import { TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsProperty } from "../api";
import { HalFormsPropertyType } from "../_shape";

export interface HalFormValues<RS extends TypedRequestSpec<any, any>> {
    readonly values: readonly HalFormValue[];

    value(propertyName: string): HalFormValue;
    withValues(values: { [propertyName: string]: HalFormValue["value"] }): HalFormValues<RS>;
    withValue(propertyName: string, value: HalFormValue["value"]): HalFormValues< RS>;
    withoutValue(propertyName: string): HalFormValues<RS>;
}


interface HalFormValueInternal<FieldType, FieldValueType> {
    readonly property: HalFormsProperty & { type: FieldType };
    readonly value: FieldValueType | readonly FieldValueType[] | null;
}

type SpecificHalFormValue = HalFormValueInternal<HalFormsPropertyType.file, File> |
    HalFormValueInternal<HalFormsPropertyType.checkbox, boolean> |
    HalFormValueInternal<HalFormsPropertyType.number | HalFormsPropertyType.range, number> |
    HalFormValueInternal<HalFormsPropertyType.datetime|HalFormsPropertyType.datetime_local, Date>;

export type HalFormValue = HalFormValueInternal<Exclude<HalFormsPropertyType, SpecificHalFormValue["property"]["type"]>, string>
    | SpecificHalFormValue;

export type HalFormValueUndefined = HalFormValueInternal<string, undefined>;
