export * from "./api";
export * from "./errors";

import { TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormValuesImpl } from "./impl";
import { HalFormsTemplate } from "../api";
import { HalFormValues } from "./api";

/**
 * Creates a value-manager object for HAL-FORMS values.
 *
 * The value-manager stores form field values for a certain HAL-FORMS template.
 *
 * @param template - HAL-FORMS template to create values for
 * @returns A new value-manager object
 */
export function createValues<RS extends TypedRequestSpec<any, any>>(template: HalFormsTemplate<RS>): HalFormValues<RS> {
    return new HalFormValuesImpl(template);
}
