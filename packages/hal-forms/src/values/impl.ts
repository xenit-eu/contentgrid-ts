import { TypedRequestSpec } from "@contentgrid/typed-fetch";
import { AnyHalFormValue, DefinedHalFormValue, HalFormValues } from "./api";
import { HalFormsTemplate } from "../api";
import { HalFormsPropertyType } from "../_shape";
import { HalFormValueTypeError } from "./errors";

type FormValueValue = DefinedHalFormValue["value"];

type ValueMapping = { [propertyName: string]: FormValueValue };

export class HalFormValuesImpl<RS extends TypedRequestSpec<any, any>> implements HalFormValues<RS> {
    private readonly valueMapping: ValueMapping

    public constructor(template: HalFormsTemplate<RS>);
    // @internal
    public constructor(template: HalFormsTemplate<RS>, valueMapping: ValueMapping);
    public constructor(
        private readonly template: HalFormsTemplate<RS>,
        valueMapping: ValueMapping | null = null
    ) {
        // Initialize form fields with the defaults from the form
        this.valueMapping = valueMapping ?? template.properties.reduce((valueMapping, property) => {
            if(property.value === undefined || property.value === null) {
                return valueMapping;
            } else {
                return this._appendValue(valueMapping, property.name, property.value);
            }
        }, {} as ValueMapping);
    }

    public get values(): readonly AnyHalFormValue[] {
        return this.template.properties.map(property => this.value(property.name));
    }

    public value(propertyName: string): AnyHalFormValue {
        const property = this.template.property(propertyName);
        const value = this.valueMapping[property.name];
        return {
            property: property,
            value: value === undefined ? property.value : value
        } as AnyHalFormValue;
    }

    public withValues(values: ValueMapping ): HalFormValues<RS> {
        return Object.entries(values).reduce(
            (values, newValue) => values.withValue(newValue[0], newValue[1]),
            this as HalFormValues<RS>
        );
    }

    public withValue(propertyName: string, value: FormValueValue): HalFormValues<RS> {
        return new HalFormValuesImpl(
            this.template,
            this._appendValue(this.valueMapping, propertyName, value)
        )
    }

    public withoutValue(propertyName: string): HalFormValues<RS> {
        const property = this.template.property(propertyName);
        const valueMappingCopy = { ...this.valueMapping };
        delete valueMappingCopy[property.name];
        return new HalFormValuesImpl(
            this.template,
            valueMappingCopy
        );
    }

    private _appendValue(valueMapping: ValueMapping, propertyName: string, value: FormValueValue): ValueMapping {
        const property = this.template.property(propertyName);
        value = coerceToValidType(property.type, value);
        if(Array.isArray(value)) {
            if(!property.multiValue) {
                // No options set on property, or maxItems set to 1
                // => this is not a field supporting arrays
                throw new HalFormValueTypeError(this.template, property, value);
            } else {
                // Options set on property; this field should support arrays
                // => validate that each entry in the array is the correct type
                value.forEach(v => {
                    if(!isValidTypeValue(property.type, v)) {
                        throw new HalFormValueTypeError(this.template, property, value);
                    }
                });
            }
        } else {
            if(property.multiValue) {
                throw new HalFormValueTypeError(this.template, property, value);
            }
            if (!isValidTypeValue(property.type, value)) {
                throw new HalFormValueTypeError(this.template, property, value);
            }
        }

        return {
            ...valueMapping,
            [property.name]: value
        }
    }

}

function coerceToValidType(type: HalFormsPropertyType | string, value: Extract<FormValueValue, any[]>): Extract<FormValueValue, any[]>;
function coerceToValidType(type: HalFormsPropertyType | string, value: Exclude<FormValueValue, any[]>): Exclude<FormValueValue, any[]>;
function coerceToValidType(type: HalFormsPropertyType | string, value: FormValueValue) {
    if(Array.isArray(value)) {
        return value.map(v => coerceToValidType(type, v));
    }
    switch(type) {
        case HalFormsPropertyType.datetime:
        case HalFormsPropertyType.datetime_local:
            if(typeof value === "string") {
                return new Date(value);
            }
    }
    return value;
}


function isValidTypeValue(type: HalFormsPropertyType | string, value: FormValueValue) {
    if(Array.isArray(value)) {
        return false;
    }
    switch (type) {
        case HalFormsPropertyType.file:
            return value instanceof File;
        case HalFormsPropertyType.checkbox:
            return typeof value === "boolean";
        case HalFormsPropertyType.number:
        case HalFormsPropertyType.range:
            return typeof value === "number" || typeof value === "bigint";
        case HalFormsPropertyType.datetime:
        case HalFormsPropertyType.datetime_local:
            return value instanceof Date;
        default:
            return typeof value === "string";
    }
}
