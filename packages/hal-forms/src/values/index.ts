export * from "./api";
export * from "./errors";

import { TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormValuesImpl } from "./impl";
import { HalFormsTemplate } from "../api";

export function createValues<RS extends TypedRequestSpec<any, any>>(template: HalFormsTemplate<RS>) {
    return new HalFormValuesImpl(template);
}
