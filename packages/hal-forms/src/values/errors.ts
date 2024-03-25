import { HalFormsProperty, HalFormsTemplate } from "../api";
import { HalFormsTemplatePropertyError } from "../errors";

/**
 * An exception thrown when the type supplied for a HAL-FORMS property value is incorrect
 */
export class HalFormValueTypeError extends HalFormsTemplatePropertyError {
    // @internal This exception should only be constructed by this package itself
    public constructor(
        template: HalFormsTemplate<any>,
        property: HalFormsProperty,
        actualValue: any
    ) {
        super(template, property, `expected type ${property.type}${property.multiValue ? ' list' : ''}, but got ${safeValue(actualValue)}`)
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HalFormValueTypeError.name;
    }
}

function safeValue(actualValue: any) {
    if(actualValue === null) {
        return "null";
    } else if(actualValue === undefined) {
        return "undefined";
    } else if(Array.isArray(actualValue)) {
        if(actualValue.length > 0) {
            const values = uniq(actualValue.map(safeValue))
            return "list of " + values.join(", ")
        } else {
            return "empty list";
        }
    }
    const typeOf = typeof actualValue;
    if(typeOf === "object") {
        return Object.getPrototypeOf(actualValue).constructor.name ?? typeOf;
    }
    return typeOf;
}

function uniq(values: string[]): string[] {
    return values.filter((val, idx, arr) => arr.indexOf(val) === idx);
}
