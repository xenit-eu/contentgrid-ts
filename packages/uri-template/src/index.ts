import { default as createUriTemplate,  URITemplate } from "uri-templates"

type TemplateValues = Record<string, string|Record<string, string>>;

export default class UriTemplate {
    readonly #parsed: URITemplate;
    constructor(public readonly template: string) {
        this.#parsed = createUriTemplate(template);
    }

    public expand(values: TemplateValues | readonly string[]): string {
        if(Array.isArray(values)) {
            let i = 0;
            return this.#parsed.fill((_varName) => {
                return values[i++];
            });
        } else {
            return this.#parsed.fill(values as TemplateValues);
        }
    }

    public get variables(): readonly string[] {
        return this.#parsed.varNames;
    }

    public match(uri: string): TemplateValues | null {
        return this.#parsed.fromUri(uri) ?? null;
    }
}
