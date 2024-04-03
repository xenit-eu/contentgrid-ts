import { HalError } from "@contentgrid/hal";
import { HalFormsTemplateError, HalFormsTemplate, HalFormsTemplatePropertyError, HalFormsProperty } from "..";
import { EncodedHalFormsRepresentation } from "./coders";

/**
 * Exception thrown when no encoder is available for a HAL-FORMS template
 */
export class HalFormsEncoderNotAvailableError extends HalFormsTemplateError {
    // @internal This exception should only be constructed by this package itself
    public constructor(
        template: HalFormsTemplate<any>
    ) {
        super(template.name, `no encoder available for template "${template.name}" (method="${template.request.method}"; contentType="${template.contentType}")`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HalFormsEncoderNotAvailableError.name;
    }
}

/**
 * Exception thrown when no decoder is available for a HAL-FORMS template
 */
export class HalFormsDecoderNotAvailableError extends HalError {
    // @internal This exception should only be constructed by this package itself
    public constructor(
        representation: EncodedHalFormsRepresentation<any>
    ) {
        super(`no decoder available for representation (contentType="${representation.contentType}")`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HalFormsDecoderNotAvailableError.name;
    }
}

/**
 * Exception thrown when the decoder can not decode a certain representation
 */
export class HalFormsDecoderRepresentationNotSupportedError extends HalError {
    // @internal This exception should only be constructed by this package itself
    public constructor(
        representation: EncodedHalFormsRepresentation<any>
    ) {
        super(`representation (contentType="${representation.contentType}"; body is ${safeType(representation.body)}) is not supported by decoder`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HalFormsDecoderRepresentationNotSupportedError.name;
    }
}

function safeType(actualValue: any) {
    if(actualValue === null) {
        return "null";
    } else if(actualValue === undefined) {
        return "undefined";
    } else if(Array.isArray(actualValue)) {
        return "array";
    }
    const typeOf = typeof actualValue;
    if(typeOf === "object") {
        if(Symbol.toStringTag in actualValue) {
            return actualValue[Symbol.toStringTag]();
        }
        return Object.getPrototypeOf(actualValue).constructor.name ?? typeOf;
    }
    return typeOf;
}

/**
 * Exception thrown when no codec is available for a HAL-FORMS template
 */
export class HalFormsCodecNotAvailableError extends HalFormsTemplateError {
    // @internal This exception should only be constructed by this package itself
    public constructor(
        template: HalFormsTemplate<any>
    ) {
        super(template.name, `no codec available for template "${template.name}" (method="${template.request.method}"; contentType="${template.contentType}")`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HalFormsCodecNotAvailableError.name;
    }
}

/**
 * Exception thrown when the codec does not support a certain type of property
 */
export class HalFormsCodecPropertyTypeNotSupportedError extends HalFormsTemplatePropertyError {
    // @internal This exception should only be constructed by this package itself
    public constructor(
        template: HalFormsTemplate<any>,
        property: HalFormsProperty
    ) {
        super(template, property, `type "${property.type}" is not supported by this codec`);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HalFormsCodecPropertyTypeNotSupportedError.name;
    }
}
