import { HalFormsTemplateError, HalFormsTemplate } from "..";


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
