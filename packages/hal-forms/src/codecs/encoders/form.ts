import { TypedRequestSpec, TypedRequest, createRequest, Representation } from "@contentgrid/typed-fetch";
import { HalFormsEncoder } from "./api";
import { HalFormsProperty, HalFormsTemplate } from "../../api";
import { AnyHalFormValue, DefinedHalFormValue } from "../../values";
import { HalFormsPropertyType } from "../../_shape";

/**
 * Encodes HAL-FORMS as multipart form
 *
 * This encoder creates a multipart form, which can be used to upload files.
 *
 * This encoding format serializes to string or File: Dates, numbers and booleans will be converted to strings
 */
export function multipartForm(): HalFormsEncoder {
    return new FormDataEncoder();
}

/**
 * Encodes HAL-FORMS as urlencoded forms
 *
 * This encoding format serializes to string: Dates, numbers and booleans will be converted to strings
 * Files are not supported.
 */
export function urlencodedForm(): HalFormsEncoder {
    return new UrlencodedFormEncoder();
}

/**
 * Encodes HAL-FORMS as a urlencoded query string, sending data in the request body
 *
 * This encoding format serializes to string: Dates, numbers and booleans will be converted to strings
 * Files are not supported.
 */
export function urlencodedQuerystring(): HalFormsEncoder {
    return new UrlEncodedQueryStringEncoder();
}

type FormLike = FormData | URLSearchParams;

abstract class AbstractFormDataEncoder<F extends FormLike> implements HalFormsEncoder {

    public encode<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>, values: readonly AnyHalFormValue[]): TypedRequest<T, R> {
        const formData = this.createData();
        values.forEach(value => {
            this.toValues(value).forEach(v => {
                this.appendToData(formData, value.property, v);
            })
        })

        return this.createRequest(template.request, formData);

    }

    public abstract supportsProperty(property: HalFormsProperty<unknown>): boolean;

    protected abstract createData(): F;
    protected abstract appendToData(form: F, property: HalFormsProperty, value: string | Blob): void;

    protected createRequest<T, R>(spec: TypedRequestSpec<T, R>, form: F) {
        return createRequest(spec, {
            // content-type header is set automatically
            body: Representation.createUnsafe(form),
        })
    }

    private toValues(value: AnyHalFormValue): readonly (string|Blob)[] {
        const v = value.value;
        if(v == undefined) {
            return [];
        }
        if (Array.isArray(v)) {
            return v.map(v => this.toStringOrBlob(v));
        }
        return [this.toStringOrBlob(v as Exclude<typeof v, readonly any[]>)];
    }

    private toStringOrBlob(value: Exclude<DefinedHalFormValue["value"], readonly any[]>): string | Blob {
        if(value instanceof Blob) {
            return value;
        } else if(value instanceof Date) {
            return value.toISOString();
        } else {
            return "" + value;
        }
    }
}

class FormDataEncoder extends AbstractFormDataEncoder<FormData> {
    protected override createData(): FormData {
        return new FormData();
    }

    protected override appendToData(form: FormData, property: HalFormsProperty<unknown>, value: string | Blob): undefined {
        form.append(property.name, value);
    }

    public override supportsProperty(_property: HalFormsProperty<unknown>): boolean {
        return true;
    }

}

class UrlencodedFormEncoder extends AbstractFormDataEncoder<URLSearchParams> {

    protected override createData(): URLSearchParams {
        return new URLSearchParams();
    }

    protected override appendToData(form: URLSearchParams, property: HalFormsProperty<unknown>, value: string | Blob): undefined {
        if(value instanceof Blob) {
            throw new Error("Can not encode blob");
        }
        form.append(property.name, value);
    }

    public override supportsProperty(property: HalFormsProperty<unknown>): boolean {
        return property.type !== HalFormsPropertyType.file;
    }
}

class UrlEncodedQueryStringEncoder extends UrlencodedFormEncoder {
    protected override createRequest<T, R>(spec: TypedRequestSpec<T, R>, form: URLSearchParams): TypedRequest<T, R> {
        const url = new URL(spec.url);
        form.forEach((value, key) => url.searchParams.append(key, value));
        return createRequest({
            ...spec,
            url: url.toString(),
        }, {

        });
    }
}
