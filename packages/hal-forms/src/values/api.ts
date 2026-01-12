import { TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsProperty } from "../api";
import { HalFormsPropertyType } from "../_shape";
import { HalFormValuesImpl } from "./impl";

/**
 * Value manager for a HAL-FORMS template
 *
 * The value manager can be used to keep track of user-supplied values entered into
 * a form created from a HAL-FORMS template.
 *
 * The value manager is an immutable object; update methods return a new value manager object instead of modifying it.
 */
export interface HalFormValues<RS extends TypedRequestSpec<any, any>> {
    /**
     * List of all HAL-FORMS properties and their respective value
     */
    readonly values: readonly AnyHalFormValue[];

    /**
     * Object mapping HAL-FORMS property names to their respective value
     */
    readonly valueMap: HalFormValuesMap;

    /**
     * Retrieve the value for a specific named HAL-FORMS property
     *
     * @param propertyName - The name of the HAL-FORMS property to retrieve a value for
     * @returns Object containing both the HAL-FORMS property and the value set for it
     */
    value(propertyName: string): AnyHalFormValue;

    /**
     * Set a HAL-FORMS property to a new value
     *
     * @param propertyName - The name of the HAL-FORMS property
     * @param value - The value to set the HAL-FORMS property to
     * @return New value manager with the specified property updated to its new value
     */
    withValue(propertyName: string, value: DefinedHalFormValue["value"]): HalFormValues<RS>;

    /**
     * Clears the value of a HAL-FORMS property
     *
     * Resets the value of a property to it's default value
     *
     * @param propertyName - The name of the HAL-FORMS property
     * @return New value manager with the specified property cleared
     */
    withoutValue(propertyName: string): HalFormValues<RS>;


    /**
     * Updates multiple HAL-FORMS properties to their new values
     *
     * @param values - Mapping of HAL-FORMS property names to their new values
     * @return New value manager with the specified properties updated to their new values
     */
    withValues(values: HalFormValuesMap): HalFormValues<RS>;
}

export namespace HalFormValues {
    export function isInstance(object: any): object is HalFormValues<any> {
        return object instanceof HalFormValuesImpl;
    }
}

/**
 * A value for a HAL-FORMS property of a certain type
 * @typeParam FieldType - The HAL-FORMS property type
 * @typeParam FieldValueType - The type of the value for the property
 */
interface TypedHalFormValue<FieldType extends HalFormsPropertyType, FieldValueType> {
    readonly property: HalFormsProperty & { type: FieldType };
    readonly value: FieldValueType | readonly FieldValueType[];
}

/**
 * Specific types of HAL-FORMS property types that map to a certain type
 */
type SpecificTypesHalFormValue = TypedHalFormValue<HalFormsPropertyType.file, File> |
    TypedHalFormValue<HalFormsPropertyType.checkbox, boolean> |
    TypedHalFormValue<HalFormsPropertyType.number | HalFormsPropertyType.range, number> |
    TypedHalFormValue<HalFormsPropertyType.datetime | HalFormsPropertyType.datetime_local | HalFormsPropertyType.date, Date>;

/**
 * All other HAL-FORMS property types map to a string
 */
type StringTypesHalFormValue = TypedHalFormValue<Exclude<HalFormsPropertyType, SpecificTypesHalFormValue["property"]["type"]>, string>;

/**
 * A HAL-FORMS property that has a value
 */
export type DefinedHalFormValue = SpecificTypesHalFormValue | StringTypesHalFormValue;

/**
 * A HAL-FORMS property that does not have any value
 */
export interface UndefinedHalFormValue {
    readonly property: HalFormsProperty;
    readonly value: undefined;
}

/**
 * A HAL-FORMS property that can either have a value or not have one
 */
export type AnyHalFormValue = DefinedHalFormValue | UndefinedHalFormValue;

/**
 * Object mapping HAL-FORMS property names to their respective value
 */
export type HalFormValuesMap = Readonly<Record<string, DefinedHalFormValue["value"]>>;
