import { TypedRequest, TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsTemplate } from "../api";
import { AnyHalFormValue } from "../values";
import { HalFormsEncoder } from "./encoders";
import HalFormsCodecsImpl from "./impl";

/**
 * HAL-FORMS codec
 *
 * A codec encodes HAL-FORMS values into a {@link TypedRequest} for sending with {@link fetch}
 */
export interface HalFormsCodec<T, R> {
    /**
     * Encode HAL-FORMS values into a request
     * @param values - The HAL-FORMS values to encode
     * @returns A {@link TypedRequest} that can be sent with {@link fetch}
     */
    encode(values: readonly AnyHalFormValue[]): TypedRequest<T, R>
}

/**
 * Lookup for {@link HalFormsCodec}s
 *
 * @see {@link HalFormsCodecs.builder} to build an instance
 */
export interface HalFormsCodecs {
    /**
     * Look for a codec for a HAL-FORMS template
     *
     * @see {@link HalFormsCodecs#requireCodecFor} for the variant that throws an error when no codec is available
     *
     * @param template - The HAL-FORMS template to look up a codec for
     * @return A codec if one is available, or null if no codec is available
     */
    findCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> | null;

    /**
     * Require a codec for a HAL-FORMS template
     *
     * @see {@link HalFormsCodecs#requireCodecFor} for the variant that throws an error when no codec is available
     *
     * @param template - The HAL-FORMS template to look up a codec for
     *
     * @throws {@link ./errors#HalFormsCodecNotAvailableError} when no codec is available
     *
     * @return A codec
     */
    requireCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R>;
}

export namespace HalFormsCodecs {

    /**
     * @returns Create a builder for {@link HalFormsCodecs}
     */
    export function builder(): HalFormsCodecsBuilder {
        return new HalFormsCodecsImpl();
    }
}

/**
 * Builder for {@link HalFormsCodecs}
 */
export interface HalFormsCodecsBuilder {

    /**
     * Registers an encoder for a content type.
     *
     * All HAL-FORMS templates with a certain `contentType` will be encoded using this encoder.
     *
     * @param contentType - The content-type to register the encoder for
     * @param encoder - The encoder to use for the content-type
     */
    registerEncoder(contentType: string, encoder: HalFormsEncoder): this;

    /**
     * Registers all codecs from a {@link HalFormsCodecs}
     *
     * All available codecs will be used
     *
     * @param codecs - Codecs to register
     */
    registerCodecs(codecs: HalFormsCodecs): this;

    /**
     * Finish building and create the {@link HalFormsCodecs}
     */
    build(): HalFormsCodecs;
}
