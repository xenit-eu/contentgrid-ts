import { TypedRequest, TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsTemplate } from "../../api";
import { AnyHalFormValue } from "../../values";

/**
 * HAL-FORMS template value encoder
 *
 * This interface is only for implementing custom encoders.
 *
 * @see {@link ../api#HalFormsCodec} for encoding values
 */
export interface HalFormsEncoder {

    /**
     * Encode HAL-FORMS values into a request
     *
     * @param template - HAL-FORMS template
     * @param values - The HAL-FORMS values to encode
     */
    encode<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>, values: readonly AnyHalFormValue[]): TypedRequest<T, R>;
}
