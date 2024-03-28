import { HalFormsTemplateError, HalFormsTemplate, HalFormsTemplatePropertyError, HalFormsProperty } from "..";


/**
 * Exception thrown when no codec is available for a HAL-FORMS template
 */
export class HalFormsCodecNotAvailableError extends HalFormsTemplateError {
    // @internal This exception should only be constructed by this package itself
    public constructor(
        template: HalFormsTemplate<any>
    ) {
        super(template.name, `no encoder available for template "${template.name}" (method="${template.request.method}"; contentType="${template.contentType}")`);
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
