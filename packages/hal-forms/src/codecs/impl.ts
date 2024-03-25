import { TypedRequest, TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsTemplate } from "..";
import { HalFormsCodec, HalFormsCodecMatcher, HalFormsCodecs, HalFormsCodecsBuilder, HalFormsCodecsMatchers } from "./api";
import { HalFormsEncoder } from "./encoders/api";
import { AnyHalFormValue } from "../values/api";
import { HalFormsCodecNotAvailableError, HalFormsCodecPropertyTypeNotSupportedError } from "./errors";

abstract class AbstractHalFormsCodecs implements HalFormsCodecs {
    abstract findCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> | null;

    public requireCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> {
        const codec = this.findCodecFor(template);
        if(codec === null) {
            throw new HalFormsCodecNotAvailableError(template);
        }
        return codec;
    }
}

class SingleEncoderHalFormsCodecs extends AbstractHalFormsCodecs {
    public constructor(
        private readonly matcher: HalFormsCodecMatcher,
        private readonly encoder: HalFormsEncoder
    ) {
        super();
    }

    public findCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> | null {
        if (!this.matcher(template)) {
            return null;
        }

        template.properties.forEach(property => {
            if(!this.encoder.supportsProperty(property)) {
                throw new HalFormsCodecPropertyTypeNotSupportedError(template, property);
            }
        });

        return new HalFormsCodecImpl(template, this.encoder);
    }
}

// @internal
export class HalFormsCodecImpl<T, R> implements HalFormsCodec<T, R> {
    public constructor(
        private readonly template: HalFormsTemplate<TypedRequestSpec<T, R>>,
        private readonly encoder: HalFormsEncoder
    ) {

    }

    public encode(values: readonly AnyHalFormValue[]): TypedRequest<T, R> {
        return this.encoder.encode(this.template, values);
    }

}

// @internal
export default class HalFormsCodecsBuilderImpl extends AbstractHalFormsCodecs implements HalFormsCodecs, HalFormsCodecsBuilder {
    private readonly codecs: HalFormsCodecs[] = [];

    public registerEncoder(matcher: string | HalFormsCodecMatcher, encoder: HalFormsEncoder): this {
        if(typeof matcher === "string") {
            matcher = HalFormsCodecsMatchers.all(
                HalFormsCodecsMatchers.contentType(matcher),
                HalFormsCodecsMatchers.encodedToRequestBody()
            );
        }
        return this.registerCodecs(new SingleEncoderHalFormsCodecs(matcher, encoder));
    }

    public registerCodecs(codecs: HalFormsCodecs): this {
        this.codecs.push(codecs);
        return this;
    }

    public build(): HalFormsCodecs {
        return this;
    }

    public findCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> |null{
        for(const codecs of this.codecs) {
            const codec = codecs.findCodecFor(template);
            if(codec) {
                return codec;
            }
        }
        return null;
    }
}
