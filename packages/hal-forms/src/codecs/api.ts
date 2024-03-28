import { TypedRequest, TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsTemplate } from "../api";
import { HalFormsEncoder } from "./encoders";
import HalFormsCodecsImpl from "./impl";
import { HalFormValues, HalFormValuesMap } from "../values/api";

/**
 * HAL-FORMS codec
 *
 * A codec encodes HAL-FORMS values into a {@link TypedRequest} for sending with {@link fetch}
 */
export interface HalFormsCodec<T, R> {
    /**
     * Encode a javascript object into a request
     * @param values - The HAL-FORMS values to encode
     * @returns A {@link TypedRequest} that can be sent with {@link fetch}
     */
    encode(values: HalFormValuesMap): TypedRequest<T, R>

    /**
     * Encode HAL-FORMS values into a request
     * @param values - The HAL-FORMS values to encode
     * @returns A {@link TypedRequest} that can be sent with {@link fetch}
     */
    encode(values: HalFormValues<TypedRequestSpec<T, R>>): TypedRequest<T, R>
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
     *
     * @throws {@link ./errors#HalFormsCodecPropertyTypeNotSupportedError} when the selected codec does not support a certain property
     *
     * @return A codec if one is available, or null if no codec is available
     */
    findCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> | null;

    /**
     * Require a codec for a HAL-FORMS template
     *
     * @see {@link HalFormsCodecs#findCodecFor} for the variant that throws an error when no codec is available
     *
     * @param template - The HAL-FORMS template to look up a codec for
     *
     * @throws {@link ./errors#HalFormsCodecNotAvailableError} when no codec is available
     * @throws {@link ./errors#HalFormsCodecPropertyTypeNotSupportedError} when the selected codec does not support a certain property
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
     * HAL-FORMS templates with a certain `contentType` will be encoded using this encoder, when the method allows sending a request body.
     *
     * @param contentType - The content-type to register the encoder for
     * @param encoder - The encoder to use for the content-type
     */
    registerEncoder(contentType: string, encoder: HalFormsEncoder): this;
    /**
     * Registers an encoder for a content type.
     *
     * All HAL-FORMS templates matching the matcher will be encoded using this encoder.
     * Matches are evaluated from first registered to last
     *
     * @param matcher - Predicate to check if the encoder is suitable for a HAL-FORMS template
     * @param encoder - The encoder to use for the HAL-FORMS template
     */
    registerEncoder(matcher: HalFormsCodecMatcher, encoder: HalFormsEncoder): this;

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

export type HalFormsCodecMatcher = (template: HalFormsTemplate<TypedRequestSpec<any, any>>) => boolean;

/**
 * Matchers for registering HAL-FORMS encoders in the {@link HalFormsCodecsBuilder}
 */
export namespace HalFormsCodecsMatchers {

    /**
     * Matches HAL-FORMS templates with a certain content-type
     * @param contentType - The contentType to match
     */
    export function contentType(contentType: string): HalFormsCodecMatcher {
        return (template) => template.contentType === contentType;
    }

    /**
     * Matches HAL-FORMS templates without any content-type set
     */
    export function unsetContentType(): HalFormsCodecMatcher {
        return (template) => template.contentType === undefined;
    }

    const noBodyMethods = ["GET", "HEAD", "OPTIONS", "DELETE"];

    /**
     * Matches HAL-FORMS templates where the data should be encoded to the request URL
     *
     * This matches the HTTP methods that do not accept any request body, like GET, HEAD, OPTIONS and DELETE
     */
    export function encodedToRequestUrl(): HalFormsCodecMatcher {
        return template => noBodyMethods.includes(template.request.method.toUpperCase());
    }

    /**
     * Matches HAL-FORMS templates where the data should be encoded in the request body
     */
    export const encodedToRequestBody = () => not(encodedToRequestUrl());

    /**
     * Matches only if all matchers match
     *
     * @param matchers - All matchers that should match
     */
    export function all(...matchers: readonly HalFormsCodecMatcher[]): HalFormsCodecMatcher {
        return (template) => matchers.every(predicate => predicate(template));
    }

    /**
     * Matches  if any matchers match
     *
     * @param matchers - Any matchers that should match
     */
    export function any(...matchers: readonly HalFormsCodecMatcher[]): HalFormsCodecMatcher {
        return (template) => matchers.some(predicate => predicate(template));
    }

    /**
     * Invers the matcher
     *
     * @param matcher - The matcher to invert
     */
    export function not(matcher: HalFormsCodecMatcher): HalFormsCodecMatcher {
        return (template) => !matcher(template)
    }
}
