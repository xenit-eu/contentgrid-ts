import HalEmbedded, { HalEmbeddedShape } from "./HalEmbedded";
import Link from "./Link";
import Links, { LinksShape } from "./Links";
import { CurieRegistry } from "./curies";
import { ianaRelations } from "./rels";

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
