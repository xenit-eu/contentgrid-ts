import { TypedRequest, TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsTemplate } from "..";
import { HalFormsCodec, HalFormsEncoderMatcher, HalFormsCodecs, HalFormsCodecsBuilder, HalFormsEncoderMatchers, HalFormsDecoderMatcher, HalFormsDecoderMatchers } from "./api";
import { EncodedHalFormsRepresentation, HalFormsDecoder, HalFormsEncoder } from "./coders/api";
import { HalFormsCodecNotAvailableError, HalFormsCodecPropertyTypeNotSupportedError, HalFormsDecoderNotAvailableError, HalFormsDecoderRepresentationNotSupportedError, HalFormsEncoderNotAvailableError } from "./errors";
import { HalFormValues, HalFormValuesMap, createValues } from "../values";
import { MultiMatcher } from "./matcher";

abstract class AbstractHalFormsCodecs implements HalFormsCodecs {
    abstract findEncoderFor(template: HalFormsTemplate<any>): HalFormsEncoder | null;
    abstract findDecoderFor(representation: EncodedHalFormsRepresentation<any>): HalFormsDecoder | null;

    public requireEncoderFor(template: HalFormsTemplate<any>): HalFormsEncoder {
        const encoder = this.findEncoderFor(template);
        if(!encoder) {
            throw new HalFormsEncoderNotAvailableError(template);
        }
        return encoder;
    }

    public requireDecoderFor(representation: EncodedHalFormsRepresentation<any>): HalFormsDecoder {
        const decoder = this.findDecoderFor(representation);
        if(!decoder) {
            throw new HalFormsDecoderNotAvailableError(representation);
        }
        return decoder;
    }

    public findCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> | null {
        const encoder = this.findEncoderFor(template);
        if(encoder == null) {
            return null;
        }
        return new HalFormsCodecImpl(template, encoder, this);
    }

    public requireCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> {
        const codec = this.findCodecFor(template);
        if(codec === null) {
            throw new HalFormsCodecNotAvailableError(template);
        }
        return codec;
    }
}


// @internal
export class HalFormsCodecImpl<T, R> implements HalFormsCodec<T, R> {
    public constructor(
        private readonly template: HalFormsTemplate<TypedRequestSpec<T, R>>,
        private readonly encoder: HalFormsEncoder,
        private readonly codecs: HalFormsCodecs
    ) {

    }

    public encode(values: HalFormValuesMap | HalFormValues<TypedRequest<T, R>>): TypedRequest<T, R> {
        if(!HalFormValues.isInstance(values)) {
            values = createValues(this.template)
                .withValues(values);
        }
        return this.encoder.encode(this.template, values.values);
    }

    public decode(value: EncodedHalFormsRepresentation<T>): HalFormValues<TypedRequestSpec<T, R>> {
        return this.codecs.requireDecoderFor(value).decode(this.template, value);
    }

}

// @internal
export default class HalFormsCodecsBuilderImpl extends AbstractHalFormsCodecs implements HalFormsCodecs, HalFormsCodecsBuilder {
    private readonly encoders = new MultiMatcher<HalFormsEncoderMatcher, HalFormsEncoder>();
    private readonly decoders = new MultiMatcher<HalFormsDecoderMatcher, HalFormsDecoder>();

    public registerEncoder(matcher: string | HalFormsEncoderMatcher, encoder: HalFormsEncoder): this {
        if(typeof matcher === "string") {
            matcher = HalFormsEncoderMatchers.all(
                HalFormsEncoderMatchers.contentType(matcher),
                HalFormsEncoderMatchers.encodedToRequestBody()
            );
        }
        this.encoders.registerPredicate(matcher, encoder);
        return this;
    }

    public registerDecoder(matcher: string | HalFormsDecoderMatcher, decoder: HalFormsDecoder): this {
        if(typeof matcher === "string") {
            matcher = HalFormsDecoderMatchers.contentType(matcher);
        }

        this.decoders.registerPredicate(matcher, decoder);
        return this;
    }

    public registerCoder(contentType: string, coder: HalFormsEncoder & HalFormsDecoder): this {
        return this.registerEncoder(contentType, coder)
            .registerDecoder(contentType, coder);
    }

    public registerCodecs(codecs: HalFormsCodecs): this {
        this.encoders.registerProvider(template => codecs.findEncoderFor(template));
        this.decoders.registerProvider(data => codecs.findDecoderFor(data));
        return this;
    }

    public build(): HalFormsCodecs {
        return this;
    }

    public override findEncoderFor(template: HalFormsTemplate<any>): HalFormsEncoder | null {
        const encoder = this.encoders.match(template);

        if(encoder) {
            template.properties.forEach(property => {
                if (!encoder.supportsProperty(property)) {
                    throw new HalFormsCodecPropertyTypeNotSupportedError(template, property);
                }
            })
        }

        return encoder;
    }

    public override findDecoderFor(representation: EncodedHalFormsRepresentation<any>): HalFormsDecoder | null {
        const decoder = this.decoders.match(representation, decoder => decoder.supportsRepresentation(representation));

        if(!decoder) {
            const decoderWithoutRepresentationMatch = this.decoders.match(representation);
            if(decoderWithoutRepresentationMatch && !decoderWithoutRepresentationMatch.supportsRepresentation(representation)) {
                throw new HalFormsDecoderRepresentationNotSupportedError(representation);
            }

        }

        return decoder;
    }

}
