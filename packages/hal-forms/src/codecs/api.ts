import { TypedRequest, TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsTemplate } from "../api";
import { HalFormsEncoder, EncodedHalFormsRepresentation, HalFormsDecoder } from "./coders";
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

    /**
     * Decode representation into its HAL-FORMS values
     * @param value
     */
    decode(value: EncodedHalFormsRepresentation<T>): HalFormValues<TypedRequestSpec<T, R>>
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

    /**
     * Look for an encoder for a HAL-FORMS template
     * @param template - The HAL-FORMS template to look up an encoder for
     *
     * @throws {@link ./errors#HalFormsCodecPropertyTypeNotSupportedError} when the selected codec does not support a certain property
     * @return An encoder if one is available, or null if no encoder is available
     */
    findEncoderFor(template: HalFormsTemplate<any>): HalFormsEncoder | null;

    /**
     * Require an encoder for a HAL-FORMS template
     * @param template - The HAL-FORMS template to look up an encoder for
     *
     * @throws {@link ./errors#HalFormsEncoderNotAvailableError} when no encoder is available
     * @throws {@link ./errors#HalFormsCodecPropertyTypeNotSupportedError} when the selected codec does not support a certain property
     *
     * @return An encoder
     */
    requireEncoderFor(template: HalFormsTemplate<any>): HalFormsEncoder;

    /**
     * Look for a decoder for already encoded HAL-FORMS values
     *
     * @param representation - The representation to find a decoder for
     *
     * @throws {@link ./errors#HalFormsDecoderRepresentationNotSupportedError} when the selected decoder does not support a certain representation
     *
     * @return A decoder if one is available, or null if no decoder is available
     */
    findDecoderFor(representation: EncodedHalFormsRepresentation<any>): HalFormsDecoder | null;

    /**
     * Require a decoder for already encoded HAL-FORMS values
     *
     * @param representation - The representation to find a decoder for
     *
     * @throws {@link ./errors#HalFormsDecoderNotAvailableError} when no decoder is available
     * @throws {@link ./errors#HalFormsDecoderRepresentationNotSupportedError} when the selected decoder does not support a certain representation
     *
     * @return A decoder
     */
    requireDecoderFor(representation: EncodedHalFormsRepresentation<any>): HalFormsDecoder;
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
    registerEncoder(matcher: HalFormsEncoderMatcher, encoder: HalFormsEncoder): this;

    /**
     * Registers a decoder
     *
     * A decoder is able to decode an encoded representation to HAL-FORMS values
     * @param contentType - The content-type to register the decoder for
     * @param decoder - The decoder to register
     */
    registerDecoder(contentType: string, decoder: HalFormsDecoder): this;

    /**
     * Registers a decoder
     *
     * A decoder is able to decode an encoded representation to HAL-FORMS values
     * @param matcher - Predicate to check if the decoder is suitable for a representation
     * @param decoder - The decoder to register
     */
    registerDecoder(matcher: HalFormsDecoderMatcher, decoder: HalFormsDecoder): this;

    /**
     * Registers an encoder and decoder
     *
     * @param contentType - The content-type to register the encoder and decoder for
     * @param coder - The encoder and decoder to register
     */
    registerCoder(contentType: string, coder: HalFormsEncoder & HalFormsDecoder): this;


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

export type HalFormsEncoderMatcher = (template: HalFormsTemplate<TypedRequestSpec<any, any>>) => boolean;


/**
 * Matchers for registering HAL-FORMS encoders in the {@link HalFormsCodecsBuilder}
 */
export namespace HalFormsEncoderMatchers {

    /**
     * Matches HAL-FORMS templates with a certain content-type
     * @param contentType - The contentType to match
     */
    export function contentType(contentType: string): HalFormsEncoderMatcher {
        return (template) => template.contentType === contentType;
    }

    /**
     * Matches HAL-FORMS templates without any content-type set
     */
    export function unsetContentType(): HalFormsEncoderMatcher {
        return (template) => template.contentType === undefined;
    }

    const noBodyMethods = ["GET", "HEAD", "OPTIONS", "DELETE"];

    /**
     * Matches HAL-FORMS templates where the data should be encoded to the request URL
     *
     * This matches the HTTP methods that do not accept any request body, like GET, HEAD, OPTIONS and DELETE
     */
    export function encodedToRequestUrl(): HalFormsEncoderMatcher {
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
    export function all(...matchers: readonly HalFormsEncoderMatcher[]): HalFormsEncoderMatcher {
        return (template) => matchers.every(predicate => predicate(template));
    }

    /**
     * Matches  if any matchers match
     *
     * @param matchers - Any matchers that should match
     */
    export function any(...matchers: readonly HalFormsEncoderMatcher[]): HalFormsEncoderMatcher {
        return (template) => matchers.some(predicate => predicate(template));
    }

    /**
     * Invers the matcher
     *
     * @param matcher - The matcher to invert
     */
    export function not(matcher: HalFormsEncoderMatcher): HalFormsEncoderMatcher {
        return (template) => !matcher(template)
    }
}

export type HalFormsDecoderMatcher = (data: EncodedHalFormsRepresentation<any>) => boolean;

/**
 * Matchers for registering HAL-FORMS decoders in the {@link HalFormsCodecsBuilder}
 */
export namespace HalFormsDecoderMatchers {

    /**
     * Matches HAL-FORMS templates with a certain content-type
     * @param contentType - The contentType to match
     */
    export function contentType(contentType: string): HalFormsDecoderMatcher {
        return (data) => data.contentType === contentType;
    }

    /**
     * Matches HAL-FORMS templates without any content-type set
     */
    export function unsetContentType(): HalFormsDecoderMatcher {
        return (data) => data.contentType === undefined;
    }

    /**
     * Matches only if all matchers match
     *
     * @param matchers - All matchers that should match
     */
    export function all(...matchers: readonly HalFormsDecoderMatcher[]): HalFormsDecoderMatcher {
        return (template) => matchers.every(predicate => predicate(template));
    }

    /**
     * Matches  if any matchers match
     *
     * @param matchers - Any matchers that should match
     */
    export function any(...matchers: readonly HalFormsDecoderMatcher[]): HalFormsDecoderMatcher {
        return (template) => matchers.some(predicate => predicate(template));
    }

    /**
     * Invers the matcher
     *
     * @param matcher - The matcher to invert
     */
    export function not(matcher: HalFormsDecoderMatcher): HalFormsDecoderMatcher {
        return (template) => !matcher(template)
    }
}
