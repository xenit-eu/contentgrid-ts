import { TypedRequestSpec, TypedRequest, createRequest, Representation } from "@contentgrid/typed-fetch";
import { HalFormsProperty, HalFormsTemplate } from "../../index";
import { AnyHalFormValue } from "../../values";
import { HalFormsEncoder } from "./api";
import { HalFormsPropertyType } from "../../_shape";

/**
 * Encodes HAL-FORMS as newline-separated URLs
 *
 * This encoder only supports HAL-FORMS properties of type 'url'; presence of other properties will result in an exception being thrown.
 *
 * Typically, a form would contain exactly one property.
 * This encoding format only serializes the values, not the property names.
 * If multiple properties of are present, they will be indistinguishable from each other
 */
export function uriList(): HalFormsEncoder {
    return new UriListEncoder();
}

class UriListEncoder implements HalFormsEncoder {
    public encode<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>, values: readonly AnyHalFormValue[]): TypedRequest<T, R> {
        const uriList = values
            .flatMap(val => this.toUrlValue(val))
            .filter(val => val !== undefined)
            .map(val => val+"\r\n") // Ensure that every line is newline-terminated
            .join("");

        return createRequest(template.request, {
            headers: {
                "Content-Type": template.contentType ?? "text/uri-list"
            },
            body: Representation.createUnsafe(uriList),
        })
    }

    public supportsProperty(property: HalFormsProperty<unknown>): boolean {
        return property.type === HalFormsPropertyType.url;
    }

    private toUrlValue(value: AnyHalFormValue): readonly (string | undefined)[] {
        if (Array.isArray(value.value)) {
            return value.value;
        } else {
            return [value.value as string | undefined];
        }
    }
}
