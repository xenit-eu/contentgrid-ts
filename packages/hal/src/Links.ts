import Link, { LinkShape } from "./Link"
import LinkRelation, { LinkRelationShape } from "./rels/LinkRelation"
import { CurieRegistry } from "./curies"
import HalError from "./HalError";

export default class Links {
    // @internal
    public readonly curieRegistry: CurieRegistry;
    public constructor(private readonly links: LinksShape, curieRegistry?: CurieRegistry) {
        this.curieRegistry = curieRegistry ?? CurieRegistry.fromLinks(this);
    }

    public findLink(relation: LinkRelation, name: string | null = null): Link | null {
        return this.findLinks(relation, name)[0] ?? null;
    }

    public findLinks(relation: LinkRelation, name: string | null = null): Link[] {
        const links = findByRelation(this.links, relation, this.curieRegistry);
        if(!links) {
            return [];
        }
        return linksAsArray(relation, links)
            .filter(link => name !== null ? link.name === name : true);
    }

    public requireSingleLink(relation: LinkRelation, name: string | null = null): Link {
        const links = this.findLinks(relation, name);

        switch(links.length) {
            case 0:
                throw new HalError(`No links for '${relation.value}'`);
            case 1:
                return links[0];
            default:
                throw new HalError(`Too many links for '${relation.value}`)
        }
    }


}

export type LinksShape = {
    readonly [k: LinkRelationShape]: LinkShape | LinkShape[];
}

function linksAsArray(relation: LinkRelation, shape: LinkShape | LinkShape[]): Link[] {
    if(Array.isArray(shape)) {
        return shape.map(ls => new Link(relation, ls));
    } else {
        return [new Link(relation, shape)];
    }
}

export function findByRelation<T>(object: Partial<{ [k: LinkRelationShape]: T }>, relation: LinkRelation, curieRegistry?: CurieRegistry): T | undefined {
        let data = object[relation.canonical]
        if(data === undefined && curieRegistry) {
            const curie = curieRegistry.compact(relation);
            if(curie) {
                data = object[curie.toString()]
                if(data === undefined) {
                    data = object[curie.toSafeString()]
                }
            }
        }
        return data;
}
