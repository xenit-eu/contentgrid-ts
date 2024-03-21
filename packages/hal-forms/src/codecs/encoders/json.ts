import { Representation, TypedRequest, TypedRequestSpec, createRequest } from "@contentgrid/typed-fetch";
import { HalFormsProperty, HalFormsTemplate } from "../../api";
import { AnyHalFormValue } from "../../values/api";
import { HalFormsEncoder } from "./api";

/**
 * Encodes HAL-FORMS values as a JSON object
 *
 * The JSON object is created as a simple object mapping a HAL-FORMS property name to its value.
 * Nested objects are not supported.
 */
export function json(): HalFormsEncoder {
    return new JsonHalFormsEncoder(null);
}

/**
 * Encodes HAL-FORMS values as a nested JSON object
 *
 * The JSON object is created as an object mapping a HAL-FORMS property name to their values.
 * Nested objects are supported; The separator character accesses nested JSON objects.
 *
 * e.g. A HAL-FORM with properties `user.name`, `user.email` and `address` will be serialized as
 * ```
 * {
 *   "user": {
 *     "name": ...,
 *     "email": ...
 *   },
 *   "address": ...
 * }
 * ```
 *
 *
 * @param separatorCharacter - Separator character; must be exactly one character long
 */
export function nestedJson(separatorCharacter: string = "."): HalFormsEncoder {
    if (separatorCharacter.length !== 1) {
        throw new Error(`Nested property separator must be null or a string of length 1; got "${separatorCharacter}"`)
    }
    return new JsonHalFormsEncoder(separatorCharacter);
}

class JsonHalFormsEncoder implements HalFormsEncoder {

    public constructor(private nestedObjectSeparator: string | null) {
    }

    public encode<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>, values: readonly AnyHalFormValue[]): TypedRequest<T, R> {
        const jsonObject: Partial<T> = {};

        values.forEach((value) => {
            this.appendToJsonObject(jsonObject, value.property.name, value.value, value.property)
        })

        return createRequest(template.request, {
            body: Representation.json(jsonObject as T)
        });
    }

    private appendToJsonObject<T>(object: Partial<T>, key: string, value: AnyHalFormValue["value"], property: HalFormsProperty) {
        if(value === undefined) {
            // undefined never gets serialized anyways, don't write it to the object at all,
            // so we don't create empty nested objects when all values are unset
            return;
        }
        if(this.nestedObjectSeparator !== null) {
            const [firstPart, nextParts] = key.split(this.nestedObjectSeparator, 2);
            if(nextParts === undefined) {
                this.safeWriteProperty(object, firstPart as keyof T, value, property);
                return;
            }

            if(!(firstPart as keyof T in object)) {
                this.safeWriteProperty(object, firstPart as keyof T, {}, property);
            }
            this.appendToJsonObject(object[firstPart as keyof T] as any, nextParts, value, property);
        } else {
            this.safeWriteProperty(object, key as keyof T, value, property);
        }
    }

    private safeWriteProperty<T>(object: Partial<T>, key: keyof T, value: any, property: HalFormsProperty) {
        if(key in object) {
            throw new Error(`Can not write multiple values for property ${property.name}`);
        }
        object[key] = value;
    }

}
