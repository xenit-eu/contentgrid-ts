import HalObject, { HalObjectShape } from "./HalObject"
import LinkRelation, { LinkRelationShape } from "./rels/LinkRelation"
import Links, { LinksShape, findByRelation } from "./Links"
import { CurieRegistry } from "./curies";

export default class HalEmbedded {
    public constructor(private readonly data: HalEmbeddedShape, private readonly curieRegistry: CurieRegistry) {
    }

    public findEmbeddeds(relation: LinkRelation): ReadonlyArray<HalObject<unknown>> {
        if(this.data._embedded === undefined) {
            return [];
        }
        const value = findByRelation(this.data._embedded, relation, this.curieRegistry);
        if(value === undefined) {
            return [];
        }

        if(Array.isArray(value)) {
            return value.map(v => new HalObject(v, this.curieRegistry));
        } else {
            return [new HalObject(value, this.curieRegistry)];
        }
    }
}

export type HalEmbeddedShape = {
    "_embedded"?: {
        [rel: LinkRelationShape]: HalObjectShape<any> | ReadonlyArray<HalObjectShape<any>>
    },
    "_links"?: LinksShape
}
