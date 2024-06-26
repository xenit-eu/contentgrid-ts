import { Representation, TypedRequest, TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsProperty, HalFormsTemplate } from "../../api";
import { AnyHalFormValue, HalFormValues } from "../../values";

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

    /**
     * Checks if this encoder supports encoding a certain HAL-FORMS property
     *
     * @param property - HAL-FORMS property to check support for
     */
    supportsProperty(property: HalFormsProperty): boolean;
}

/**
 * HAL-FORMS template value decoder
 *
 * This interface is only for implementing custom decoders
 *
 * @see {@link ../api#HalFormsCodec} for decoding values
 */
export interface HalFormsDecoder {

    /**
     * Decode data into HAL-FORMS values
     *
     * @param template - HAL-FORMS template
     * @param data - Encoded data to decode
     * @return HAL-FORMS values decoded from the data
     */
    decode<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>, data: EncodedHalFormsRepresentation<T>): HalFormValues<TypedRequestSpec<T, R>>;

    /**
     * Checks if this decoder supports a certain representation format
     *
     * @param data - Encoded data
     */
    supportsRepresentation(data: EncodedHalFormsRepresentation<any>): boolean;
}

/**
 * Encoded data for decoding using {@link HalFormsDecoder}
 */
export interface EncodedHalFormsRepresentation<T = unknown> {
    /**
     * Content-Type of the encoded data
     */
    readonly contentType: string;
    /**
     * Encoded data
     */
    readonly body: Representation.RepresentationOf<T> | T
}
