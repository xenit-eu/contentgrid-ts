import UriTemplate from "@contentgrid/uri-template";
import LinkRelation from "./rels/LinkRelation";

export class SimpleLink {
    // @internal
    #deprecationWarned: boolean = false;

    public constructor(private readonly data: LinkShape) {

    }

    public static to(href: string): SimpleLink {
        return new SimpleLink({ href });
    }

    public static templated(template: UriTemplate): SimpleLink {
        return new SimpleLink({
            href: template.template,
            templated: true
        })
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

    public withRel(rel: LinkRelation): Link {
        return new Link(rel, this.data);
    }

    public toString() {
        return `<${this.href}>; ${toLinkParams({
            name: this.name,
            title: this.title,
            type: this.type
        })}`
    }

}

export default class Link extends SimpleLink {
    // @internal
    public constructor(public readonly rel: LinkRelation, data: LinkShape) {
        super(data);
    }

    public override toString() {
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
