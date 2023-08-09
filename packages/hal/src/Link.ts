import UriTemplate from "@contentgrid/uri-template";
import LinkRelation from "./rels/LinkRelation";

export default class Link {
    // @internal
    #deprecationWarned: boolean = false;

    // @internal
    public constructor(public readonly rel: LinkRelation, private readonly data: LinkShape) {

    }

    // @internal
    #warnDeprecation() {
        if(this.deprecation && !this.#deprecationWarned) {
            this.#deprecationWarned = true;
            console.warn(`Link ${this} is deprecated: ${this.deprecation}`);
        }
    }

    public get href(): string {
        this.#warnDeprecation();
        return this.data.href;
    }

    public get template(): UriTemplate {
        this.#warnDeprecation();
        return new UriTemplate(this.data.href);
    }

    public get templated(): boolean {
        this.#warnDeprecation();
        return this.data.templated ?? false;
    }

    public get name(): string | undefined {
        return this.data.name;
    }

    public get title(): string | undefined {
        this.#warnDeprecation();
        return this.data.title;
    }

    public get type(): string | undefined {
        this.#warnDeprecation();
        return this.data.type;
    }

    public get deprecation(): string | undefined {
        return this.data.deprecation;
    }

    public toString() {
        return `<${this.href}>; ${toLinkParams({
            rel: this.rel.value,
            name: this.name,
            title: this.title,
            type: this.type
        })}`
    }
}

export interface LinkShape {
    readonly href: string;
    readonly name?: string;
    readonly templated?: boolean;
    readonly title?: string;
    readonly type?: string;
    readonly deprecation?: string;
}

function toLinkParams(data: Record<string, string|undefined>): string {
    const ret: string[] = [];
    for(const name of Object.keys(data)) {
        const value = toLinkParam(name, data[name]);
        if(value) {
            ret.push(value);
        }
    }
    return ret.join("; ");
}

function toLinkParam(name: string, value: string | undefined): string | null {
    if(value) {
        return `${name}="${value}"`
    }
    return null;
}
