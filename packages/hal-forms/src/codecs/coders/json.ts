import { Representation, TypedRequest, TypedRequestSpec, createRequest } from "@contentgrid/typed-fetch";
import { HalFormsProperty, HalFormsTemplate } from "../../api";
import { EncodedHalFormsRepresentation, HalFormsDecoder, HalFormsEncoder } from "./api";
import { HalFormsPropertyType } from "../../_shape";
import { createValues, AnyHalFormValue, HalFormValues } from "../../values";
import { HalFormsDecoderRepresentationNotSupportedError } from "../errors";

/**
 * Encodes HAL-FORMS values as a JSON object
 *
 * The JSON object is created as a simple object mapping a HAL-FORMS property name to its value.
 * Nested objects are not supported.
 * Files are not supported.
 */
export function json(): HalFormsEncoder & HalFormsDecoder {
    return new JsonHalFormsCoder(null);
}

/**
 * Encodes HAL-FORMS values as a nested JSON object
 *
 * The JSON object is created as an object mapping a HAL-FORMS property name to their values.
 * Nested objects are supported; The separator character accesses nested JSON objects.
 * Files are not supported.
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
export function nestedJson(separatorCharacter: string = "."): HalFormsEncoder & HalFormsDecoder {
    if (separatorCharacter.length !== 1) {
        throw new Error(`Nested property separator must be null or a string of length 1; got "${separatorCharacter}"`)
    }
    return new JsonHalFormsCoder(separatorCharacter);
}

class JsonHalFormsCoder implements HalFormsEncoder, HalFormsDecoder {

    public constructor(private nestedObjectSeparator: string | null) {
    }

    public encode<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>, values: readonly AnyHalFormValue[]): TypedRequest<T, R> {
        const jsonObject: Partial<T> = {};

        values.forEach((value) => {
            this.appendToJsonObject(jsonObject, value.property.name, value.value, value.property)
        })

        return createRequest(template.request, {
            headers: {
                "Content-Type": template.contentType ?? "application/json"
            },
            body: Representation.json(jsonObject as T)
        });
    }

    public supportsProperty(property: HalFormsProperty<unknown>): boolean {
        return property.type !== HalFormsPropertyType.file;
    }

    public supportsRepresentation(data: EncodedHalFormsRepresentation<any>): boolean {
        try {
            return typeof tryDecodeJson(data) === "object";
        } catch(e) {
            return false;
        }
    }

    public decode<T, R>(template: HalFormsTemplate<TypedRequestSpec<T, R>>, data: EncodedHalFormsRepresentation<T>): HalFormValues<TypedRequestSpec<T, R>> {
        const decoded = tryDecodeJson(data);
        let values = createValues(template);

        for(const property of template.properties) {
            const val = this.safeReadProperty(decoded, property.name);
            if(val !== undefined && val !== null) {
                values = values.withValue(property.name, val);
            } else {
                values = values.withoutValue(property.name);
            }
        }

        return values;
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

    private safeReadProperty(data: Record<string, any>, propertyName: string): any {
        if(typeof data !== "object") {
            return undefined;
        }

        if (this.nestedObjectSeparator === null || !propertyName.includes(this.nestedObjectSeparator)) {
            return data[propertyName];
        }

        const [firstPart, nextParts] = propertyName.split(this.nestedObjectSeparator, 2);
        return this.safeReadProperty(data[firstPart as string] ?? {}, nextParts as string);
    }

}

function tryDecodeJson(repr: EncodedHalFormsRepresentation<any>): Record<string, any> {
    if(typeof repr.body === "object") {
        // This is an already decoded object
        return repr.body;
    } else if(typeof repr.body === "string") {
        return JSON.parse(repr.body);
    } else {
        throw new HalFormsDecoderRepresentationNotSupportedError(repr);
    }
}
