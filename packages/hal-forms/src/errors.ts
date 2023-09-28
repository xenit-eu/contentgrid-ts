import { HalError } from "@contentgrid/hal";
import { HalFormsProperty, HalFormsTemplate } from "./api";

export class HalFormsTemplateError extends HalError {
    public constructor(readonly template: string, message: string) {
        super(`Template ${template}: ${message}`)
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HalFormsTemplateError.name;
    }
}

export class HalTemplateNotFoundError extends HalFormsTemplateError {
    public constructor(template: string) {
        super(template, "was not found");
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = HalTemplateNotFoundError.name;
    }
}

export class InvalidHalFormsOptionError extends HalFormsTemplateError {
    public constructor(template: HalFormsTemplate<any>, readonly property: HalFormsProperty, message: string) {
        super(template.name, `property ${property.name} has invalid options: ${message}`)
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = InvalidHalFormsOptionError.name;
    }
}
