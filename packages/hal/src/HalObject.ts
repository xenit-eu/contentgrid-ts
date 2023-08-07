import HalEmbedded, { HalEmbeddedShape } from "./HalEmbedded.js";
import Link from "./Link.js";
import Links, { LinksShape } from "./Links.js";
import { CurieRegistry } from "./curies/index.js";
import { ianaRelations } from "./rels/index.js";

export default class HalObject<T> {
    public readonly links: Links;
    public constructor(public readonly data: HalObjectShape<T>, curieRegistry?: CurieRegistry) {
        this.links = new Links(data["_links"] ?? {}, curieRegistry);
    };

    public get self(): Link {
        return this.links.requireSingleLink(ianaRelations.self)
    }

    public get embedded(): HalEmbedded {
        return new HalEmbedded(this.data, this.links.curieRegistry);
    }
}

export type HalObjectShape<T> = T & {
    "_links"?: LinksShape
} & HalEmbeddedShape
