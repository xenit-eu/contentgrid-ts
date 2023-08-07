import LinkRelation from "../rels/LinkRelation";
import Curie from "./Curie";
import Template from "@contentgrid/uri-template"

export class CuriedLinkRelation implements LinkRelation {
    public constructor(private readonly curie: Curie, private readonly template?: Template) {

    }

    public matches(value: string): boolean {
        return this.canonical.toLowerCase() === value.toLowerCase()
    }

    public get value(): string {
        return this.curie.toSafeString();
    }

    public get canonical(): string {
        if(!this.template) {
            return this.curie.toString();
        }
        return this.template.expand([this.curie.localPart])
    }
}
