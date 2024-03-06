import { SimpleLink } from "@contentgrid/hal";
import { TypedRequestSpec } from "@contentgrid/typed-fetch";

export interface HalFormsTemplate<RequestSpec extends TypedRequestSpec<any, any>> {
    readonly name: string;
    readonly title: string | undefined;
    readonly contentType: string;
    readonly request: RequestSpec;
    readonly properties: readonly HalFormsProperty[];
    property(propertyName: string): HalFormsProperty;
}

export interface HalFormsProperty<OptionType = unknown> {
    readonly name: string;
    readonly readOnly: boolean;
    readonly required: boolean;
    readonly type: string | undefined;
    readonly options: HalFormsPropertyInlineOptions<OptionType> | HalFormsPropertyRemoteOptions<OptionType>;
    readonly regex: RegExp;
    readonly minLength: number;
    readonly maxLength: number;
    readonly prompt: string | undefined;
}

interface HalFormsPropertyCommonOptions<T> {
    readonly selectedValues: readonly string[];
    readonly maxItems: number;
    readonly minItems: number;
    toOption(data: T): HalFormsPropertyOption;
    loadOptions(fetcher: (link: SimpleLink) => Promise<readonly T[]>): Promise<readonly HalFormsPropertyOption[]>
    isInline(): this is HalFormsPropertyInlineOptions<T>;
    isRemote(): this is HalFormsPropertyRemoteOptions<T>;
}

export interface HalFormsPropertyInlineOptions<T = unknown> extends HalFormsPropertyCommonOptions<T> {
    readonly inline: ReadonlyArray<T>;
}

export interface HalFormsPropertyRemoteOptions<T = unknown> extends HalFormsPropertyCommonOptions<T> {
    readonly link: SimpleLink;
}

export interface HalFormsPropertyOption {
    readonly prompt: string;
    readonly value: string;
}
