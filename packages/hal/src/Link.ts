import UriTemplate from "@contentgrid/uri-template";
import LinkRelation from "./rels/LinkRelation.js";

export default class Link {
    public constructor(public readonly rel: LinkRelation, private readonly data: LinkShape) {

    }

    public get href(): string {
        return this.data.href;
    }

    public get template(): UriTemplate {
        return new UriTemplate(this.data.href);
    }

    public get templated(): boolean {
        return this.data.templated ?? false;
    }

    public get name(): string | undefined {
        return this.data.name;
    }

    public get title(): string | undefined {
        return this.data.title;
    }

    public get type(): string | undefined {
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
