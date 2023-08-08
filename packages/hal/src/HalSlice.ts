import HalObject, { HalObjectShape } from "./HalObject";
import { CurieRegistry } from "./curies";
import { LinkRelationShape } from "./rels/LinkRelation";
import Link from './Link';
import { ianaRelations } from "./rels";
import HalError from "./HalError";
import { LinkRelation } from "../build/rels";

export default class HalSlice<T> extends HalObject<{}> {

    public static from<T>(object: HalObject<any>): HalSlice<T> {
        return new HalSlice(object.data, object.links.curieRegistry);
    }

    public constructor(data: HalSliceShape<T>, curieRegistry?: CurieRegistry) {
        super(data, curieRegistry)
    }

    public get next(): Link | null {
        return this.links.findLink(ianaRelations.next);
    }

    public get previous(): Link | null {
        return this.links.findLink(ianaRelations.prev) ?? this.links.findLink(ianaRelations.previous);
    }

    public get first(): Link | null {
        return this.links.findLink(ianaRelations.first);
    }

    public findItems(rel: LinkRelation): ReadonlyArray<HalObject<T>> {
        return this.embedded.findEmbeddeds(rel) as ReadonlyArray<HalObject<T>>;
    }

    public get items(): ReadonlyArray<HalObject<T>> {
        const rels = this.embedded.rels;
        switch(rels.length) {
            case 0:
                return [];
            case 1:
                return this.findItems(rels[0]!);
            default:
                throw new HalError("Multiple embedded relations are present")
        }
    }
}

export type HalSliceShape<T> = HalObjectShape<{}> & {
    "_embedded"?: {
        [rel: LinkRelationShape]: HalObjectShape<T> | ReadonlyArray<HalObjectShape<T>>
    }
}
