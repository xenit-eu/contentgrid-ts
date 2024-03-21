import { TypedRequest, TypedRequestSpec } from "@contentgrid/typed-fetch";
import { HalFormsTemplate } from "..";
import { HalFormsCodec, HalFormsCodecs, HalFormsCodecsBuilder } from "./api";
import { HalFormsEncoder } from "./encoders/api";
import { AnyHalFormValue } from "../values/api";
import { HalFormsCodecNotAvailableError } from "./errors";

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
        private readonly contentType: string,
        private readonly encoder: HalFormsEncoder
    ) {
        super();
    }

    public findCodecFor<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>): HalFormsCodec<T, R> | null {
        if(template.contentType === this.contentType) {
            return new HalFormsCodecImpl(template, this.encoder);
        }
        return null;
    }
}

class HalFormsCodecImpl<T, R> implements HalFormsCodec<T, R> {
    public constructor(
        private readonly template: HalFormsTemplate<TypedRequestSpec<T, R>>,
        private readonly encoder: HalFormsEncoder
    ) {

    }

    public encode(values: readonly AnyHalFormValue[]): TypedRequest<T, R> {
        return this.encoder.encode(this.template, values);
    }

}

export default class HalFormsCodecsBuilderImpl extends AbstractHalFormsCodecs implements HalFormsCodecs, HalFormsCodecsBuilder {
    private readonly codecs: HalFormsCodecs[] = [];

    public registerEncoder(contentType: string, encoder: HalFormsEncoder): this {
        return this.registerCodecs(new SingleEncoderHalFormsCodecs(contentType, encoder));
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
